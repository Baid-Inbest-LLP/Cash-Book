import { buildBrandedWorkbook } from '../utils/excel.js';
import { getEntriesForExport } from './entry.service.js';
import { getCompanyReport, getExpenseHeadReport, getMonthwiseReport } from './report.service.js';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const monthName = (month) => (month ? MONTH_NAMES[month - 1] : null);
const capitalise = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const companyLabel = (company) => {
  if (!company) return '-';
  return company.code ? `${company.code} - ${company.name}` : company.name;
};

const formatToday = () =>
  new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// Context lines printed under the title so an exported file is self-describing.
const buildMeta = ({ financialYear, month, extra = [] }) => {
  const lines = [`Financial Year: ${financialYear}`];
  if (month) lines.push(`Month: ${monthName(month)}`);
  lines.push(...extra);
  lines.push(`Generated on: ${formatToday()}`);
  return lines;
};

export const buildEntriesWorkbook = async ({ filters }) => {
  const { financialYear } = filters;
  const entries = await getEntriesForExport({ filters });

  let totalReceipts = 0;
  let totalPayments = 0;
  const rows = entries.map((entry) => {
    const isReceipt = entry.type === 'receipt';
    if (isReceipt) totalReceipts += entry.amount;
    else totalPayments += entry.amount;
    return {
      date: new Date(entry.date),
      type: capitalise(entry.type),
      company: companyLabel(entry.company),
      expenseHead: entry.expenseHead?.name || '-',
      description: entry.description || '',
      receipt: isReceipt ? entry.amount : null,
      payment: isReceipt ? null : entry.amount,
    };
  });

  const extra = [];
  if (filters.type) extra.push(`Type: ${capitalise(filters.type)}`);
  if (filters.search) extra.push(`Search: "${filters.search}"`);

  const workbook = buildBrandedWorkbook({
    sheetName: 'Entries',
    title: 'Cash Book — Entries',
    subtitle: `${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`,
    meta: buildMeta({ financialYear, month: filters.month, extra }),
    columns: [
      { header: 'Date', key: 'date', width: 14, type: 'date' },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Company', key: 'company', width: 26 },
      { header: 'Expense Head', key: 'expenseHead', width: 22 },
      { header: 'Description', key: 'description', width: 38 },
      { header: 'Receipt (₹)', key: 'receipt', width: 16, type: 'currency' },
      { header: 'Payment (₹)', key: 'payment', width: 16, type: 'currency' },
    ],
    rows,
    totals: { receipt: totalReceipts, payment: totalPayments },
  });

  return { workbook, filename: `cashbook-entries-${financialYear}.xlsx` };
};

export const buildMonthwiseWorkbook = async ({ financialYear }) => {
  const { months, summary } = await getMonthwiseReport({ financialYear });

  const rows = months.map((row) => ({
    month: monthName(row.month),
    openingBalance: row.openingBalance,
    receipts: row.receipts,
    payments: row.payments,
    netMovement: row.netMovement,
    closingBalance: row.closingBalance,
  }));

  const workbook = buildBrandedWorkbook({
    sheetName: 'Monthwise',
    title: 'Cash Book — Monthwise Report',
    meta: buildMeta({ financialYear }),
    columns: [
      { header: 'Month', key: 'month', width: 14 },
      { header: 'Opening (₹)', key: 'openingBalance', width: 16, type: 'currency' },
      { header: 'Receipts (₹)', key: 'receipts', width: 16, type: 'currency' },
      { header: 'Payments (₹)', key: 'payments', width: 16, type: 'currency' },
      { header: 'Net Movement (₹)', key: 'netMovement', width: 18, type: 'currency' },
      { header: 'Closing (₹)', key: 'closingBalance', width: 16, type: 'currency' },
    ],
    rows,
    totals: {
      openingBalance: summary.fyOpeningBalance,
      receipts: summary.totalReceipts,
      payments: summary.totalPayments,
      netMovement: summary.netMovement,
      closingBalance: summary.fyClosingBalance,
    },
  });

  return { workbook, filename: `monthwise-report-${financialYear}.xlsx` };
};

// Shared builder for the two payment-breakdown reports (expense head / company); they differ
// only by their first column, so the caller supplies the labelled items + that column.
const buildBreakdownWorkbook = ({
  financialYear,
  month,
  items,
  totalPayments,
  firstColumn,
  sheetName,
  title,
  filenamePrefix,
}) => {
  let totalCount = 0;
  const rows = items.map((item) => {
    totalCount += item.paymentCount;
    return {
      label: item.label,
      paymentAmount: item.paymentAmount,
      paymentCount: item.paymentCount,
      percentage: item.percentage,
    };
  });

  const workbook = buildBrandedWorkbook({
    sheetName,
    title,
    meta: buildMeta({ financialYear, month }),
    columns: [
      { header: firstColumn.header, key: 'label', width: firstColumn.width },
      { header: 'Payment Amount (₹)', key: 'paymentAmount', width: 20, type: 'currency' },
      { header: 'Count', key: 'paymentCount', width: 12, type: 'number' },
      { header: 'Share', key: 'percentage', width: 12, type: 'percent' },
    ],
    rows,
    totals: {
      paymentAmount: totalPayments,
      paymentCount: totalCount,
      percentage: totalPayments > 0 ? 100 : 0,
    },
  });

  return { workbook, filename: `${filenamePrefix}-${financialYear}.xlsx` };
};

export const buildExpenseHeadWorkbook = async ({ financialYear, month, company }) => {
  const { totalPayments, expenseHeads } = await getExpenseHeadReport({
    financialYear,
    month,
    company,
  });

  return buildBreakdownWorkbook({
    financialYear,
    month,
    totalPayments,
    items: expenseHeads.map((item) => ({ ...item, label: item.expenseHead?.name || '-' })),
    firstColumn: { header: 'Expense Head', width: 30 },
    sheetName: 'Expense Heads',
    title: 'Cash Book — Expense Head Report',
    filenamePrefix: 'expense-head-report',
  });
};

export const buildCompanyWorkbook = async ({ financialYear, month }) => {
  const { totalPayments, companies } = await getCompanyReport({ financialYear, month });

  return buildBreakdownWorkbook({
    financialYear,
    month,
    totalPayments,
    items: companies.map((item) => ({ ...item, label: companyLabel(item.company) })),
    firstColumn: { header: 'Company', width: 30 },
    sheetName: 'Companies',
    title: 'Cash Book — Company Report',
    filenamePrefix: 'company-report',
  });
};
