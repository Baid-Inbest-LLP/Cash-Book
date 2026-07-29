import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Entry, LocationCity, OpeningBalance } from '../models/index.js';
import { FY_MONTH_ORDER, getPreviousFinancialYear } from '../utils/financialYear.js';
import { lookupOne, toObjectId } from '../utils/mongoAggregation.js';
import { buildMonthlyLedger, buildReportMatch, percentage, resolveLocationScope } from '../utils/reportUtils.js';

// Net cash movement (receipts - payments) for a FY, optionally narrowed to `months`. `location`
// null means "every location" (unscoped superadmin) — summed together, same as no filter.
const aggregateNetMovement = async (financialYear, location, months) => {
  const match = { financialYear, isExcluded: false };
  if (location) match.location = toObjectId(location);
  if (months) match.month = { $in: months };

  const [totals] = await Entry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        receipts: {
          $sum: { $cond: [{ $eq: ['$type', ENTRY_TYPES.RECEIPT] }, '$amount', 0] },
        },
        payments: {
          $sum: { $cond: [{ $eq: ['$type', ENTRY_TYPES.PAYMENT] }, '$amount', 0] },
        },
      },
    },
  ]);
  return (totals?.receipts || 0) - (totals?.payments || 0);
};

// FY opening balance for a single location: the stored record, or seeded from the
// previous FY's closing balance for that same location.
const resolveLocationOpeningBalance = async (financialYear, location) => {
  const existing = await OpeningBalance.findOne({ financialYear, location })
    .select('openingBalance')
    .lean();
  if (existing) return existing.openingBalance;

  const previousFy = getPreviousFinancialYear(financialYear);
  const [previousOpening, previousNetMovement] = await Promise.all([
    OpeningBalance.findOne({ financialYear: previousFy, location }).select('openingBalance').lean(),
    aggregateNetMovement(previousFy, location),
  ]);
  const fyOpeningBalance = (previousOpening?.openingBalance || 0) + previousNetMovement;

  try {
    await OpeningBalance.create({ financialYear, location, openingBalance: fyOpeningBalance });
  } catch (err) {
    // A concurrent request may have created it first; fall back to the stored value.
    if (err?.code !== 11000) throw err;
    const doc = await OpeningBalance.findOne({ financialYear, location })
      .select('openingBalance')
      .lean();
    return doc?.openingBalance ?? fyOpeningBalance;
  }
  return fyOpeningBalance;
};

// FY opening balance for the requested scope: one location's balance, or the sum of every
// active location's balance when a superadmin hasn't narrowed to one.
const resolveFYOpeningBalance = async (financialYear, location) => {
  if (location) return resolveLocationOpeningBalance(financialYear, location);

  const locations = await LocationCity.find({ isActive: true }).select('_id').lean();
  const balances = await Promise.all(
    locations.map((loc) => resolveLocationOpeningBalance(financialYear, loc._id)),
  );
  return balances.reduce((sum, balance) => sum + balance, 0);
};

// Sum receipts/payments per month; `company` narrows payments only, receipts pass through untouched.
const aggregateMonthlyTotals = ({ financialYear, company, user, location }) => {
  const companyObjectId = company ? toObjectId(company) : null;
  const match = {
    ...buildReportMatch({ financialYear, user, location }),
    ...(companyObjectId && { $or: [{ type: ENTRY_TYPES.RECEIPT }, { company: companyObjectId }] }),
  };

  return Entry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { month: '$month', type: '$type' },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
};

// FY opening balance, or rolled forward to the selected month if one is given.
const resolvePeriodOpeningBalance = async ({ financialYear, month, fyOpeningBalance, scopedLocation }) => {
  if (!month) return fyOpeningBalance;

  const priorMonths = FY_MONTH_ORDER.slice(0, FY_MONTH_ORDER.indexOf(month));
  if (priorMonths.length === 0) return fyOpeningBalance;

  const priorNetMovement = await aggregateNetMovement(financialYear, scopedLocation, priorMonths);
  return fyOpeningBalance + priorNetMovement;
};

// Payment breakdown by company/expenseHead plus the period summary, in one $facet aggregation.
const getReportBreakdown = async ({ financialYear, month, company, groupField, lookupConfig, user, location }) => {
  const baseMatch = buildReportMatch({ financialYear, month, user, location });
  const scopedLocation = resolveLocationScope({ user, location });
  const companyObjectId = company ? toObjectId(company) : null;
  const isMatchingPayment = companyObjectId
    ? { $and: [{ $eq: ['$type', ENTRY_TYPES.PAYMENT] }, { $eq: ['$company', companyObjectId] }] }
    : { $eq: ['$type', ENTRY_TYPES.PAYMENT] };

  const [[facetResult], fyOpeningBalance] = await Promise.all([
    Entry.aggregate([
      { $match: baseMatch },
      {
        $facet: {
          breakdown: [
            { $match: { type: ENTRY_TYPES.PAYMENT, ...(companyObjectId && { company: companyObjectId }) } },
            {
              $group: {
                _id: `$${groupField}`,
                paymentAmount: { $sum: '$amount' },
                paymentCount: { $sum: 1 },
              },
            },
            { $sort: { paymentAmount: -1 } },
            ...lookupOne({ ...lookupConfig, localField: '_id' }),
            {
              $project: {
                _id: 0,
                [lookupConfig.as]: `$${lookupConfig.as}`,
                paymentAmount: 1,
                paymentCount: 1,
              },
            },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalReceipts: {
                  $sum: { $cond: [{ $eq: ['$type', ENTRY_TYPES.RECEIPT] }, '$amount', 0] },
                },
                receiptCount: {
                  $sum: { $cond: [{ $eq: ['$type', ENTRY_TYPES.RECEIPT] }, 1, 0] },
                },
                totalPayments: { $sum: { $cond: [isMatchingPayment, '$amount', 0] } },
                paymentCount: { $sum: { $cond: [isMatchingPayment, 1, 0] } },
              },
            },
          ],
        },
      },
    ]),
    resolveFYOpeningBalance(financialYear, scopedLocation),
  ]);

  const { breakdown, totals } = facetResult;
  const { totalReceipts = 0, receiptCount = 0, totalPayments = 0, paymentCount = 0 } = totals[0] || {};
  const netMovement = totalReceipts - totalPayments;

  const items = breakdown.map((row) => ({ ...row, percentage: percentage(row.paymentAmount, totalPayments) }));

  const periodOpeningBalance = await resolvePeriodOpeningBalance({
    financialYear,
    month,
    fyOpeningBalance,
    scopedLocation,
  });

  const summary = {
    openingBalance: periodOpeningBalance,
    totalReceipts,
    totalPayments,
    receiptCount,
    paymentCount,
    netMovement,
    closingBalance: periodOpeningBalance + netMovement,
  };

  return { items, summary };
};

// Month-wise 12-month ledger with a running closing balance and year totals.
export const getMonthwiseReport = async ({ financialYear, company, user, location }) => {
  const scopedLocation = resolveLocationScope({ user, location });
  const [fyOpeningBalance, monthlyTotals] = await Promise.all([
    resolveFYOpeningBalance(financialYear, scopedLocation),
    aggregateMonthlyTotals({ financialYear, company, user, location }),
  ]);

  const { months, summary } = buildMonthlyLedger({
    financialYear,
    fyOpeningBalance,
    monthlyTotals,
  });

  return { financialYear, company: company ?? null, months, summary };
};

// Head-of-expense report: payment totals per expense head with share %.
export const getExpenseHeadReport = async ({ financialYear, month, company, user, location }) => {
  const { items, summary } = await getReportBreakdown({
    financialYear,
    month,
    company,
    user,
    location,
    groupField: 'expenseHead',
    lookupConfig: { from: 'expenseheads', as: 'expenseHead', project: { name: 1 } },
  });

  return {
    financialYear,
    month: month ?? null,
    company: company ?? null,
    expenseHeads: items,
    summary,
  };
};

// Companies report: payment totals per company with share %.
export const getCompanyReport = async ({ financialYear, month, user, location }) => {
  const { items, summary } = await getReportBreakdown({
    financialYear,
    month,
    user,
    location,
    groupField: 'company',
    lookupConfig: { from: 'companies', as: 'company', project: { name: 1, code: 1 } },
  });

  return { financialYear, month: month ?? null, companies: items, summary };
};
