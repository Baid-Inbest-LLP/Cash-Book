import { getCompanyReport, getExpenseHeadReport, getMonthwiseReport } from './report.service.js';
import { percentage } from '../utils/reportUtils.js';

// Company-wise payment totals for a financial year (+ optional month), chart-ready.
export const getExpenseByCompany = async ({ financialYear, month, user, location }) => {
  const { companies } = await getCompanyReport({ financialYear, month, user, location });
  return companies.map((row) => ({
    company: row.company?.name || '-',
    code: row.company?.code || null,
    amount: row.paymentAmount,
    percentage: row.percentage,
  }));
};

// Expense-head-wise payment totals for a financial year (+ optional month), chart-ready.
export const getExpenseByExpenseHead = async ({ financialYear, month, user, location }) => {
  const { expenseHeads } = await getExpenseHeadReport({ financialYear, month, user, location });
  return expenseHeads.map((row) => ({
    expenseHead: row.expenseHead?.name || '-',
    amount: row.paymentAmount,
    percentage: row.percentage,
  }));
};

// Month-wise payment totals for a financial year, chart-ready.
export const getExpenseByMonth = async ({ financialYear, user, location }) => {
  const { months } = await getMonthwiseReport({ financialYear, user, location });
  const total = months.reduce((sum, row) => sum + row.payments, 0);
  return months.map((row) => ({
    month: row.month,
    amount: row.payments,
    percentage: percentage(row.payments, total),
  }));
};

// FY-level opening/closing balance and receipt/payment totals, for the dashboard's top stat cards.
export const getDashboardStats = async ({ financialYear, user, location }) => {
  const { summary } = await getMonthwiseReport({ financialYear, user, location });
  return {
    openingBalance: summary.openingBalance,
    totalReceipts: summary.totalReceipts,
    totalPayments: summary.totalPayments,
    netMovement: summary.netMovement,
    closingBalance: summary.closingBalance,
  };
};

// Top expense heads by payment amount for a financial year (+ optional month), paginated.
export const getTopExpenseHeads = async ({ financialYear, month, page = 1, limit = 5, user, location }) => {
  const { expenseHeads } = await getExpenseHeadReport({ financialYear, month, user, location });
  const all = expenseHeads.map((row) => ({
    expenseHead: row.expenseHead?.name || '-',
    amount: row.paymentAmount,
  }));
  const total = all.length;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const start = (page - 1) * limit;

  return { data: all.slice(start, start + limit), pagination: { page, pages, total, limit } };
};
