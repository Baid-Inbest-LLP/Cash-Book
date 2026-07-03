import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Entry, OpeningBalance } from '../models/index.js';
import { getPreviousFinancialYear } from '../utils/financialYear.js';
import { lookupOne, toObjectId } from '../utils/mongoAggregation.js';
import { buildMonthlyLedger, buildReportMatch, percentage } from '../utils/reportUtils.js';

// Net cash movement (receipts - payments) for a financial year, excluded entries removed.
const aggregateNetMovement = async (financialYear) => {
  const [totals] = await Entry.aggregate([
    { $match: { financialYear, isExcluded: false } },
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

/*
 * Opening balance for a financial year: use the stored record when present,
 * otherwise seed one from the previous year's closing balance
 * (its opening + net movement).
 */
const resolveFYOpeningBalance = async (financialYear) => {
  const existing = await OpeningBalance.findOne({ financialYear }).select('openingBalance').lean();
  if (existing) return existing.openingBalance;

  const previousFy = getPreviousFinancialYear(financialYear);
  const [previousOpening, previousNetMovement] = await Promise.all([
    OpeningBalance.findOne({ financialYear: previousFy }).select('openingBalance').lean(),
    aggregateNetMovement(previousFy),
  ]);
  const fyOpeningBalance = (previousOpening?.openingBalance || 0) + previousNetMovement;

  try {
    await OpeningBalance.create({ financialYear, openingBalance: fyOpeningBalance });
  } catch (err) {
    // A concurrent request may have created it first; fall back to the stored value.
    if (err?.code !== 11000) throw err;
    const doc = await OpeningBalance.findOne({ financialYear }).select('openingBalance').lean();
    return doc?.openingBalance ?? fyOpeningBalance;
  }
  return fyOpeningBalance;
};

// Sum receipts/payments per month for a financial year.
const aggregateMonthlyTotals = ({ financialYear }) =>
  Entry.aggregate([
    { $match: { financialYear, isExcluded: false } },
    {
      $group: {
        _id: { month: '$month', type: '$type' },
        amount: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

// Group payments by a reference field (company/expenseHead) with names + share %.
const paymentBreakdown = async ({ financialYear, month, company, groupField, lookupConfig }) => {
  const match = { ...buildReportMatch({ financialYear, month }), type: ENTRY_TYPES.PAYMENT };
  if (company) match.company = toObjectId(company);

  const rows = await Entry.aggregate([
    { $match: match },
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
  ]);

  const total = rows.reduce((sum, row) => sum + row.paymentAmount, 0);
  const items = rows.map((row) => ({ ...row, percentage: percentage(row.paymentAmount, total) }));
  return { total, items };
};

// Month-wise 12-month ledger with a running closing balance and year totals.
export const getMonthwiseReport = async ({ financialYear }) => {
  const [fyOpeningBalance, monthlyTotals] = await Promise.all([
    resolveFYOpeningBalance(financialYear),
    aggregateMonthlyTotals({ financialYear }),
  ]);

  const { months, summary } = buildMonthlyLedger({
    financialYear,
    fyOpeningBalance,
    monthlyTotals,
  });

  return { financialYear, months, summary };
};

// Head-of-expense report: payment totals per expense head with share %.
export const getExpenseHeadReport = async ({ financialYear, month, company }) => {
  const { total, items } = await paymentBreakdown({
    financialYear,
    month,
    company,
    groupField: 'expenseHead',
    lookupConfig: { from: 'expenseheads', as: 'expenseHead', project: { name: 1 } },
  });

  return {
    financialYear,
    month: month ?? null,
    company: company ?? null,
    totalPayments: total,
    expenseHeads: items,
  };
};

// Companies report: payment totals per company with share %.
export const getCompanyReport = async ({ financialYear, month }) => {
  const { total, items } = await paymentBreakdown({
    financialYear,
    month,
    groupField: 'company',
    lookupConfig: { from: 'companies', as: 'company', project: { name: 1, code: 1 } },
  });

  return { financialYear, month: month ?? null, totalPayments: total, companies: items };
};
