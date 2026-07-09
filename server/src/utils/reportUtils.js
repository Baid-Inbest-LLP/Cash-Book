import { ENTRY_TYPES } from '../constants/entryTypes.js';
import { FY_MONTH_ORDER, getFinancialYear } from './financialYear.js';

// How many months of a financial year have started as of today.
const monthsElapsedInFy = (financialYear) => {
  const now = new Date();
  const currentFy = getFinancialYear(now);
  if (financialYear < currentFy) return 12;
  if (financialYear > currentFy) return 0;
  return FY_MONTH_ORDER.indexOf(now.getMonth() + 1) + 1;
};

// Percentage of a part against a total, rounded to 2 decimals (0 when total is 0).
export const percentage = (amount, total) =>
  total > 0 ? Math.round((amount / total) * 10000) / 100 : 0;

// Base filter for report queries: one financial year, with optional month.
export const buildReportMatch = ({ financialYear, month }) => {
  const match = { financialYear, isExcluded: false };
  if (month) match.month = month;
  return match;
};

// Turn per-month totals into a running ledger with opening and closing balances.
export const buildMonthlyLedger = ({ financialYear, fyOpeningBalance, monthlyTotals }) => {
  const byMonth = new Map(
    FY_MONTH_ORDER.map((month) => [
      month,
      { receipts: 0, payments: 0, receiptCount: 0, paymentCount: 0 },
    ]),
  );

  for (const row of monthlyTotals) {
    const bucket = byMonth.get(row._id.month);
    if (!bucket) continue;
    if (row._id.type === ENTRY_TYPES.RECEIPT) {
      bucket.receipts = row.amount;
      bucket.receiptCount = row.count;
    } else if (row._id.type === ENTRY_TYPES.PAYMENT) {
      bucket.payments = row.amount;
      bucket.paymentCount = row.count;
    }
  }

  let opening = fyOpeningBalance;
  const months = [];
  const totals = {
    totalReceipts: 0,
    totalPayments: 0,
    receiptCount: 0,
    paymentCount: 0,
  };

  for (const month of FY_MONTH_ORDER.slice(0, monthsElapsedInFy(financialYear))) {
    const { receipts, payments, receiptCount, paymentCount } = byMonth.get(month);
    const netMovement = receipts - payments;
    const closingBalance = opening + netMovement;
    const row = {
      month,
      openingBalance: opening,
      receipts,
      payments,
      receiptCount,
      paymentCount,
      netMovement,
      closingBalance,
    };
    totals.totalReceipts += receipts;
    totals.totalPayments += payments;
    totals.receiptCount += receiptCount;
    totals.paymentCount += paymentCount;
    opening = closingBalance;
    months.push(row);
  }

  const netMovement = totals.totalReceipts - totals.totalPayments;
  const summary = {
    openingBalance: fyOpeningBalance,
    ...totals,
    netMovement,
    closingBalance: fyOpeningBalance + netMovement,
  };

  return { months, summary };
};
