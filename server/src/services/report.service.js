import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { Entry, OpeningBalance } from '../models/index.js';
import { getPreviousFinancialYear } from '../utils/financialYear.js';
import { lookupOne, toObjectId } from '../utils/mongoAggregation.js';
import { buildMonthlyLedger, buildReportMatch, percentage } from '../utils/reportUtils.js';

// Net cash movement (receipts - payments) for a financial year, excluded entries removed.
const aggregateNetMovement = async (financialYear) => {
  const [totals] = await Entry.aggregate([
    { $match: buildReportMatch({ financialYear }) },
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

/*
 * Sum receipts/payments per month for a financial year, optionally narrowed to a
 * company. Receipts are never tied to a company, so the filter only excludes
 * payment entries for other companies — receipts pass through untouched.
 */
const aggregateMonthlyTotals = ({ financialYear, company }) => {
  const companyObjectId = company ? toObjectId(company) : null;
  const match = {
    ...buildReportMatch({ financialYear }),
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

/*
 * Payment breakdown by a reference field (company/expenseHead) plus the period's
 * opening/closing balance summary, in one aggregation. Both derive from the same
 * matched entries, so a $facet computes them in a single DB round trip instead of two.
 * Receipts are never tied to a company (they're intentionally optional on that field),
 * so the company filter only narrows payments; receipts always reflect the full
 * financialYear/month scope regardless of it.
 */
const getReportBreakdown = async ({ financialYear, month, company, groupField, lookupConfig }) => {
  const baseMatch = buildReportMatch({ financialYear, month });
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
    resolveFYOpeningBalance(financialYear),
  ]);

  const { breakdown, totals } = facetResult;
  const { totalReceipts = 0, receiptCount = 0, totalPayments = 0, paymentCount = 0 } = totals[0] || {};
  const netMovement = totalReceipts - totalPayments;

  const items = breakdown.map((row) => ({ ...row, percentage: percentage(row.paymentAmount, totalPayments) }));

  const summary = {
    fyOpeningBalance,
    totalReceipts,
    totalPayments,
    receiptCount,
    paymentCount,
    netMovement,
    fyClosingBalance: fyOpeningBalance + netMovement,
  };

  return { items, summary };
};

// Month-wise 12-month ledger with a running closing balance and year totals.
export const getMonthwiseReport = async ({ financialYear, company }) => {
  const [fyOpeningBalance, monthlyTotals] = await Promise.all([
    resolveFYOpeningBalance(financialYear),
    aggregateMonthlyTotals({ financialYear, company }),
  ]);

  const { months, summary } = buildMonthlyLedger({
    financialYear,
    fyOpeningBalance,
    monthlyTotals,
  });

  return { financialYear, company: company ?? null, months, summary };
};

// Head-of-expense report: payment totals per expense head with share %.
export const getExpenseHeadReport = async ({ financialYear, month, company }) => {
  const { items, summary } = await getReportBreakdown({
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
    expenseHeads: items,
    summary,
  };
};

// Companies report: payment totals per company with share %.
export const getCompanyReport = async ({ financialYear, month }) => {
  const { items, summary } = await getReportBreakdown({
    financialYear,
    month,
    groupField: 'company',
    lookupConfig: { from: 'companies', as: 'company', project: { name: 1, code: 1 } },
  });

  return { financialYear, month: month ?? null, companies: items, summary };
};
