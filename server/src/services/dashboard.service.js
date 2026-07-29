import { getCompanyReport, getExpenseHeadReport, getMonthwiseReport } from './report.service.js';
import { LocationCity } from '../models/index.js';
import { percentage, resolveLocationScope } from '../utils/reportUtils.js';

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

const toStatsSummary = (summary) => ({
  openingBalance: summary.openingBalance,
  totalReceipts: summary.totalReceipts,
  totalPayments: summary.totalPayments,
  netMovement: summary.netMovement,
  closingBalance: summary.closingBalance,
});

// FY-level opening/closing balance and receipt/payment totals, for the dashboard's top stat
// cards. Accountants (always scoped to their own location) and a superadmin who has picked one
// location both get a single summary; an unscoped superadmin gets one row per active location.
export const getDashboardStats = async ({ financialYear, user, location }) => {
  const scopedLocation = resolveLocationScope({ user, location });

  if (scopedLocation) {
    const { summary } = await getMonthwiseReport({ financialYear, user, location });
    return toStatsSummary(summary);
  }

  const locations = await LocationCity.find({ isActive: true })
    .select('name')
    .sort({ createdAt: 1 })
    .lean();
  return Promise.all(
    locations.map(async (city) => {
      const { summary } = await getMonthwiseReport({ financialYear, user, location: city._id });
      return { location: { _id: city._id, name: city.name }, ...toStatsSummary(summary) };
    }),
  );
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
