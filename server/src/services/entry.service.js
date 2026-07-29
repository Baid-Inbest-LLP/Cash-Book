import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Company, Entry, ExpenseHead, LocationCity } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getFinancialYear, getFinancialYearAndMonth } from '../utils/financialYear.js';
import { lookupOne, toObjectId } from '../utils/mongoAggregation.js';
import { resolveLocationScope } from '../utils/reportUtils.js';
import { escapeRegex } from '../utils/searchUtils.js';

// Load an entry or fail with a consistent API error.
const loadEntry = async ({ id }) => {
  const entry = await Entry.findById(id);
  if (!entry) throw ApiError.notFound('Entry not found');
  return entry;
};

// Ensure referenced companies exist when supplied, and for all payments.
const assertActiveCompany = async ({ companyId }) => {
  const exists = await Company.exists({ _id: companyId, isActive: true });
  if (!exists) throw ApiError.badRequest('Active company is required');
};

// Ensure payment entries are always linked to an active expense head.
const assertActiveExpenseHead = async ({ expenseHeadId }) => {
  const exists = await ExpenseHead.exists({ _id: expenseHeadId, isActive: true });
  if (!exists) throw ApiError.badRequest('Active expense head is required');
};

const assertActiveLocation = async ({ locationId }) => {
  const exists = await LocationCity.exists({ _id: locationId, isActive: true });
  if (!exists) throw ApiError.badRequest('A valid location is required');
};

// Accountants are always pinned to their own location; superadmin must pick one explicitly.
const resolveEntryLocation = ({ location, user }) => {
  if (user.role === 'accountant') return user.locationCity;
  if (!location) throw ApiError.badRequest('Location is required');
  return location;
};

// Create either a receipt or payment entry after validating its references.
const createEntry = async ({
  type,
  date,
  company,
  expenseHead,
  amount,
  description,
  location,
  user,
}) => {
  const resolvedLocation = resolveEntryLocation({ location, user });
  const referenceChecks = [assertActiveLocation({ locationId: resolvedLocation })];

  if (type === ENTRY_TYPES.PAYMENT) {
    if (!company) throw ApiError.badRequest('Active company is required');
    referenceChecks.push(assertActiveCompany({ companyId: company }));
    referenceChecks.push(assertActiveExpenseHead({ expenseHeadId: expenseHead }));
  } else if (company) {
    referenceChecks.push(assertActiveCompany({ companyId: company }));
  }
  await Promise.all(referenceChecks);

  const period = getFinancialYearAndMonth(date);
  await Entry.create({
    type,
    date,
    company: company ?? null,
    expenseHead: type === ENTRY_TYPES.PAYMENT ? expenseHead : null,
    amount,
    description,
    location: resolvedLocation,
    ...period,
    createdBy: user._id,
  });
};

// Insert a receipt entry.
export const createReceipt = ({ date, company, amount, description, location, user }) =>
  createEntry({
    type: ENTRY_TYPES.RECEIPT,
    date,
    company,
    amount,
    description,
    location,
    user,
  });

// Insert a payment entry.
export const createPayment = ({ date, company, expenseHead, amount, description, location, user }) =>
  createEntry({
    type: ENTRY_TYPES.PAYMENT,
    date,
    company,
    expenseHead,
    amount,
    description,
    location,
    user,
  });

// Build MongoDB filters for the entries table and balance summary. Accountants are always
// scoped to their own location; superadmin sees everything unless they pick one explicitly.
const buildListFilter = ({ filters, user }) => {
  const financialYear = filters.financialYear || getFinancialYear();
  const filter = {
    financialYear,
    isExcluded: filters.isExcluded ?? false,
  };

  if (filters.type) filter.type = filters.type;
  if (filters.month) filter.month = filters.month;
  if (filters.company) filter.company = toObjectId(filters.company);
  if (filters.expenseHead) filter.expenseHead = toObjectId(filters.expenseHead);
  if (filters.search) filter.description = { $regex: escapeRegex(filters.search), $options: 'i' };

  const scopedLocation = resolveLocationScope({ user, location: filters.location });
  if (scopedLocation) filter.location = toObjectId(scopedLocation);

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
          ...lookupOne({
            from: 'locationcities',
            localField: 'location',
            as: 'location',
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
              location: 1,
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

// Fetch every entry matching the filters (no pagination) for an Excel export,
// ordered chronologically so the file reads like a ledger.
export const getEntriesForExport = ({ filters = {}, user }) => {
  const filter = buildListFilter({ filters, user });
  return Entry.aggregate([
    { $match: filter },
    { $sort: { date: 1, createdAt: 1 } },
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
      $project: { type: 1, date: 1, company: 1, expenseHead: 1, amount: 1, description: 1 },
    },
  ]);
};

// List entries with pagination.
export const listEntries = async ({ filters = {}, user }) => {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const filter = buildListFilter({ filters, user });
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

// Update entry fields and keep payment/receipt reference rules consistent. Entry type is
// immutable after creation — the client never offers it and the validator strips it.
export const updateEntry = async ({ id, updates, user }) => {
  const entry = await loadEntry({ id });
  const nextCompany = updates.company === undefined ? entry.company : updates.company;
  const nextExpenseHead =
    entry.type === ENTRY_TYPES.PAYMENT ? (updates.expenseHead ?? entry.expenseHead) : null;

  if (updates.location !== undefined && user.role !== 'accountant') {
    await assertActiveLocation({ locationId: updates.location });
  }

  const referenceChecks = [];

  if (entry.type === ENTRY_TYPES.PAYMENT) {
    if (!nextCompany) throw ApiError.badRequest('Active company is required');
    referenceChecks.push(assertActiveCompany({ companyId: nextCompany }));
  } else if (updates.company !== undefined && nextCompany) {
    referenceChecks.push(assertActiveCompany({ companyId: nextCompany }));
  }

  if (entry.type === ENTRY_TYPES.PAYMENT && updates.expenseHead !== undefined) {
    if (!nextExpenseHead) throw ApiError.badRequest('Expense head is required for payments');
    referenceChecks.push(assertActiveExpenseHead({ expenseHeadId: nextExpenseHead }));
  }
  await Promise.all(referenceChecks);

  if (updates.date !== undefined) {
    entry.date = updates.date;
    Object.assign(entry, getFinancialYearAndMonth(updates.date));
  }
  if (updates.company !== undefined) entry.company = updates.company;
  if (updates.amount !== undefined) entry.amount = updates.amount;
  if (updates.description !== undefined) entry.description = updates.description;
  if (updates.location !== undefined && user.role !== 'accountant') entry.location = updates.location;
  entry.expenseHead = nextExpenseHead;
  entry.updatedBy = user._id;

  await entry.save();
};

// Accountants may only ever act on their own location's entries; superadmin is unrestricted
// for bulk actions (no location filter param here — these operate on ids the caller chose).
const scopeIdsFilter = ({ ids, user }) => {
  const filter = { _id: { $in: ids } };
  if (user.role === 'accountant') filter.location = toObjectId(user.locationCity);
  return filter;
};

// Move the selected entries to the excluded/recycle-bin list. Already-excluded ids, and ids
// outside the caller's location, are silently skipped; returns how many were newly excluded.
export const excludeEntries = async ({ ids, user }) => {
  const { modifiedCount } = await Entry.updateMany(
    { ...scopeIdsFilter({ ids, user }), isExcluded: false },
    {
      $set: {
        isExcluded: true,
        excludedAt: new Date(),
        excludedBy: user._id,
      },
    },
  );

  return { count: modifiedCount };
};

// Restore the selected excluded entries back to normal cashbook calculations.
export const restoreEntries = async ({ ids, user }) => {
  const { modifiedCount } = await Entry.updateMany(
    { ...scopeIdsFilter({ ids, user }), isExcluded: true },
    {
      $set: {
        isExcluded: false,
        excludedAt: null,
        excludedBy: null,
      },
    },
  );

  return { count: modifiedCount };
};

// Permanently delete the selected entries — only those already moved to excluded entries.
export const deleteEntries = async ({ ids, user }) => {
  const { deletedCount } = await Entry.deleteMany({
    ...scopeIdsFilter({ ids, user }),
    isExcluded: true,
  });
  return { count: deletedCount };
};
