import mongoose from 'mongoose';
import { getFinancialYear } from '../config/index.js';
import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Company, Entry, ExpenseHead, OpeningBalance } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

// Escape user search text before using it in a MongoDB regex filter.
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Convert validated ObjectId strings for aggregation-safe MongoDB filters.
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const ENTRY_POPULATE = [
  { path: 'company', select: 'name code' },
  { path: 'expenseHead', select: 'name' },
  { path: 'createdBy', select: 'name' },
];

// Build a one-to-one lookup stage pair for lightweight referenced fields.
const lookupOne = ({ from, localField, as, project }) => [
  {
    $lookup: {
      from,
      localField,
      foreignField: '_id',
      as,
      pipeline: [{ $project: project }],
    },
  },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
];

// Derive financial year and calendar month from the entry date before saving.
const getEntryPeriod = (date) => {
  const entryDate = new Date(date);
  return {
    financialYear: getFinancialYear(entryDate),
    month: entryDate.getMonth() + 1,
  };
};

// Attach lightweight reference details to a saved entry document.
const populateEntryDoc = async ({ entry }) => {
  await entry.populate(ENTRY_POPULATE);
  return entry.toObject();
};

// Attach lightweight reference details to an entry query result.
const populateEntryQuery = (query) => query.populate(ENTRY_POPULATE);

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

  const period = getEntryPeriod(date);
  const entry = await Entry.create({
    type,
    date,
    company,
    expenseHead: type === ENTRY_TYPES.PAYMENT ? expenseHead : null,
    amount,
    description,
    ...period,
    createdBy: userId,
  });

  return populateEntryDoc({ entry });
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
  if (filters.search) filter.description = { $regex: escapeRegExp(filters.search), $options: 'i' };

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

// Shape aggregation totals into the balance summary expected by the entries page.
const buildSummary = ({ financialYear, openingBalance = 0, totals = [] }) => {
  const summary = {
    financialYear,
    openingBalance,
    totalReceipts: 0,
    totalPayments: 0,
    receiptCount: 0,
    paymentCount: 0,
  };

  for (const item of totals) {
    if (item._id === ENTRY_TYPES.RECEIPT) {
      summary.totalReceipts = item.amount;
      summary.receiptCount = item.count;
    } else if (item._id === ENTRY_TYPES.PAYMENT) {
      summary.totalPayments = item.amount;
      summary.paymentCount = item.count;
    }
  }

  summary.netMovement = summary.totalReceipts - summary.totalPayments;
  summary.closingBalance = summary.openingBalance + summary.netMovement;
  return summary;
};

// Fetch paginated entries, total count, and receipt/payment totals in one DB round trip.
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
          ...lookupOne({
            from: 'users',
            localField: 'createdBy',
            as: 'createdBy',
            project: { name: 1 },
          }),
        ],
        total: [{ $count: 'count' }],
        totals: [
          {
            $group: {
              _id: '$type',
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ],
      },
    },
  ]);

  return {
    entries: result.entries || [],
    total: result.total?.[0]?.count || 0,
    totals: result.totals || [],
  };
};

// List entries with pagination and matching balance summary.
export const listEntries = async ({ filters = {} }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const filter = buildListFilter({ filters });
  const skip = (page - 1) * limit;

  const [entryResult, openingBalanceDoc] = await Promise.all([
    aggregateEntries({ filter, skip, limit }),
    OpeningBalance.findOne({ financialYear: filter.financialYear }).select('openingBalance').lean(),
  ]);
  const summary = buildSummary({
    financialYear: filter.financialYear,
    openingBalance: openingBalanceDoc?.openingBalance || 0,
    totals: entryResult.totals,
  });

  return {
    entries: entryResult.entries,
    summary,
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
    Object.assign(entry, getEntryPeriod(updates.date));
  }
  if (updates.type !== undefined) entry.type = nextType;
  if (updates.company !== undefined) entry.company = updates.company;
  if (updates.amount !== undefined) entry.amount = updates.amount;
  if (updates.description !== undefined) entry.description = updates.description;
  entry.expenseHead = nextExpenseHead;
  entry.updatedBy = userId;

  await entry.save();
  return populateEntryDoc({ entry });
};

// Move an entry to the excluded/recycle-bin list.
export const excludeEntry = async ({ id, userId }) => {
  const entry = await populateEntryQuery(
    Entry.findByIdAndUpdate(
      id,
      {
        $set: {
          isExcluded: true,
          excludedAt: new Date(),
          excludedBy: userId,
        },
      },
      { new: true, runValidators: true },
    ),
  ).lean();

  if (!entry) throw ApiError.notFound('Entry not found');
  return entry;
};

// Restore an excluded entry back to normal cashbook calculations.
export const restoreEntry = async ({ id }) => {
  const entry = await populateEntryQuery(
    Entry.findByIdAndUpdate(
      id,
      {
        $set: {
          isExcluded: false,
          excludedAt: null,
          excludedBy: null,
        },
      },
      { new: true, runValidators: true },
    ),
  ).lean();

  if (!entry) throw ApiError.notFound('Entry not found');
  return entry;
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
