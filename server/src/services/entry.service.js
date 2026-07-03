import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Company, Entry, ExpenseHead } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getFinancialYear, getFinancialYearAndMonth } from '../utils/financialYear.js';
import { lookupOne, toObjectId } from '../utils/mongoAggregation.js';

// Load an entry or fail with a consistent API error.
const loadEntry = async ({ id }) => {
  const entry = await Entry.findById(id);
  if (!entry) throw ApiError.notFound('Entry not found');
  return entry;
};

// Ensure entries are always linked to an active company.
const assertActiveCompany = async ({ companyId }) => {
  const exists = await Company.exists({ _id: companyId, isActive: true });
  if (!exists) throw ApiError.badRequest('Active company is required');
};

// Ensure payment entries are always linked to an active expense head.
const assertActiveExpenseHead = async ({ expenseHeadId }) => {
  const exists = await ExpenseHead.exists({ _id: expenseHeadId, isActive: true });
  if (!exists) throw ApiError.badRequest('Active expense head is required');
};

// Create either a receipt or payment entry after validating its references.
const createEntry = async ({ type, date, company, expenseHead, amount, description, userId }) => {
  const referenceChecks = [assertActiveCompany({ companyId: company })];

  if (type === ENTRY_TYPES.PAYMENT) {
    referenceChecks.push(assertActiveExpenseHead({ expenseHeadId: expenseHead }));
  }
  await Promise.all(referenceChecks);

  const period = getFinancialYearAndMonth(date);
  await Entry.create({
    type,
    date,
    company,
    expenseHead: type === ENTRY_TYPES.PAYMENT ? expenseHead : null,
    amount,
    description,
    ...period,
    createdBy: userId,
  });
};

// Insert a receipt entry.
export const createReceipt = ({ date, company, amount, description, userId }) =>
  createEntry({
    type: ENTRY_TYPES.RECEIPT,
    date,
    company,
    amount,
    description,
    userId,
  });

// Insert a payment entry.
export const createPayment = ({ date, company, expenseHead, amount, description, userId }) =>
  createEntry({
    type: ENTRY_TYPES.PAYMENT,
    date,
    company,
    expenseHead,
    amount,
    description,
    userId,
  });

// Build MongoDB filters for the entries table and balance summary.
const buildListFilter = ({ filters }) => {
  const financialYear = filters.financialYear || getFinancialYear();
  const filter = {
    financialYear,
    isExcluded: filters.isExcluded ?? false,
  };

  if (filters.type) filter.type = filters.type;
  if (filters.month) filter.month = filters.month;
  if (filters.company) filter.company = toObjectId(filters.company);
  if (filters.expenseHead) filter.expenseHead = toObjectId(filters.expenseHead);
  if (filters.search) filter.$text = { $search: filters.search };

  if (filters.fromDate || filters.toDate) {
    filter.date = {};
    if (filters.fromDate) filter.date.$gte = filters.fromDate;
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      filter.date.$lte = toDate;
    }
  }

  return filter;
};

// Fetch paginated entries and total count in one DB round trip.
const aggregateEntries = async ({ filter, skip, limit }) => {
  const [result = {}] = await Entry.aggregate([
    { $match: filter },
    {
      $facet: {
        entries: [
          { $sort: { date: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          ...lookupOne({
            from: 'companies',
            localField: 'company',
            as: 'company',
            project: { name: 1, code: 1 },
          }),
          ...lookupOne({
            from: 'expenseheads',
            localField: 'expenseHead',
            as: 'expenseHead',
            project: { name: 1 },
          }),
          {
            $project: {
              type: 1,
              date: 1,
              financialYear: 1,
              month: 1,
              company: 1,
              expenseHead: 1,
              amount: 1,
              description: 1,
              isExcluded: 1,
            },
          },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ]);

  return {
    entries: result.entries || [],
    total: result.total?.[0]?.count || 0,
  };
};

// List entries with pagination.
export const listEntries = async ({ filters = {} }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const filter = buildListFilter({ filters });
  const skip = (page - 1) * limit;

  const entryResult = await aggregateEntries({ filter, skip, limit });

  return {
    entries: entryResult.entries,
    pagination: {
      page,
      pages: Math.ceil(entryResult.total / limit) || 1,
      total: entryResult.total,
      limit,
    },
  };
};

// Update entry fields and keep payment/receipt reference rules consistent.
export const updateEntry = async ({ id, updates, userId }) => {
  const entry = await loadEntry({ id });
  const nextType = updates.type || entry.type;
  const nextCompany = updates.company || entry.company;
  const nextExpenseHead =
    nextType === ENTRY_TYPES.PAYMENT ? (updates.expenseHead ?? entry.expenseHead) : null;

  const referenceChecks = [];

  if (updates.company !== undefined) {
    referenceChecks.push(assertActiveCompany({ companyId: nextCompany }));
  }

  if (
    nextType === ENTRY_TYPES.PAYMENT &&
    (updates.type !== undefined || updates.expenseHead !== undefined)
  ) {
    if (!nextExpenseHead) throw ApiError.badRequest('Expense head is required for payments');
    referenceChecks.push(assertActiveExpenseHead({ expenseHeadId: nextExpenseHead }));
  }
  await Promise.all(referenceChecks);

  if (updates.date !== undefined) {
    entry.date = updates.date;
    Object.assign(entry, getFinancialYearAndMonth(updates.date));
  }
  if (updates.type !== undefined) entry.type = nextType;
  if (updates.company !== undefined) entry.company = updates.company;
  if (updates.amount !== undefined) entry.amount = updates.amount;
  if (updates.description !== undefined) entry.description = updates.description;
  entry.expenseHead = nextExpenseHead;
  entry.updatedBy = userId;

  await entry.save();
};

// Move an entry to the excluded/recycle-bin list.
export const excludeEntry = async ({ id, userId }) => {
  const { matchedCount } = await Entry.updateOne(
    { _id: id },
    {
      $set: {
        isExcluded: true,
        excludedAt: new Date(),
        excludedBy: userId,
      },
    },
  );

  if (!matchedCount) throw ApiError.notFound('Entry not found');
};

// Restore an excluded entry back to normal cashbook calculations.
export const restoreEntry = async ({ id }) => {
  const { matchedCount } = await Entry.updateOne(
    { _id: id, isExcluded: true },
    {
      $set: {
        isExcluded: false,
        excludedAt: null,
        excludedBy: null,
      },
    },
  );
  if (matchedCount) return;

  const exists = await Entry.exists({ _id: id });
  if (exists) {
    throw ApiError.badRequest('Only excluded entries can be restored');
  }
  throw ApiError.notFound('Entry not found');
};

// Permanently delete an entry only after it has been moved to excluded entries.
export const deleteEntry = async ({ id }) => {
  const entry = await Entry.findOneAndDelete({ _id: id, isExcluded: true }).lean();
  if (entry) return entry;

  const exists = await Entry.exists({ _id: id });
  if (exists) {
    throw ApiError.badRequest('Only excluded entries can be permanently deleted');
  }
  throw ApiError.notFound('Entry not found');
};
