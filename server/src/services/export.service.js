import { buildBrandedWorkbook } from '../utils/excel.js';
import { buildBrandedPdf } from '../utils/pdf.js';
import { ApiError } from '../utils/ApiError.js';
import { Company } from '../models/index.js';
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

// "2026-27" -> "26-27", used in the title so the full year isn't repeated separately.
const shortFinancialYear = (financialYear) => financialYear.slice(2);
const buildTitle = (financialYear) => `Cash Book — FY ${shortFinancialYear(financialYear)}`;

// Active-filter context lines printed under the title/report-name (FY is already in the
// title, so it isn't repeated here).
const buildMeta = ({ month, extra = [] }) => {
  const lines = [];
  if (month) lines.push(`Month: ${monthName(month)}`);
  lines.push(...extra);
  return lines;
};

// Company code + GST shown top-left of the branded header. These exports require a single
// company to be selected, so the lookup always has a real id to resolve.
const getCompanyHeaderInfo = async (companyId) => {
  const company = await Company.findById(companyId).select('code taxId').lean();
  if (!company) throw ApiError.notFound('Company not found');
  return { code: company.code, taxId: company.taxId };
};

// Shared report shape (columns/rows/totals/meta) consumed by both the Excel and PDF renderers,
// so the data-fetching and shaping logic is written once per report.
const buildEntriesReportConfig = async ({ filters }) => {
  const { financialYear } = filters;
  const [entries, companyInfo] = await Promise.all([
    getEntriesForExport({ filters }),
    getCompanyHeaderInfo(filters.company),
  ]);

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

  return {
    config: {
      sheetName: 'Entries',
      title: buildTitle(financialYear),
      subtitle: filters.isExcluded ? 'Excluded Entries' : 'Entries',
      meta: buildMeta({ month: filters.month, extra }),
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
      companyInfo,
    },
    filename: `cashbook-entries-${financialYear}`,
  };
};

export const buildEntriesWorkbook = async ({ filters }) => {
  const { config, filename } = await buildEntriesReportConfig({ filters });
  return { workbook: buildBrandedWorkbook(config), filename: `${filename}.xlsx` };
};

export const buildEntriesPdf = async ({ filters }) => {
  const { config, filename } = await buildEntriesReportConfig({ filters });
  return { buffer: await buildBrandedPdf(config), filename: `${filename}.pdf` };
};

const buildMonthwiseReportConfig = async ({ financialYear, company }) => {
  const [{ months, summary }, companyInfo] = await Promise.all([
    getMonthwiseReport({ financialYear, company }),
    getCompanyHeaderInfo(company),
  ]);

  const rows = months.map((row) => ({
    month: monthName(row.month),
    openingBalance: row.openingBalance,
    receipts: row.receipts,
    payments: row.payments,
    netMovement: row.netMovement,
    closingBalance: row.closingBalance,
  }));

  return {
    config: {
      sheetName: 'Monthwise',
      title: buildTitle(financialYear),
      subtitle: 'Monthwise Report',
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
        openingBalance: summary.openingBalance,
        receipts: summary.totalReceipts,
        payments: summary.totalPayments,
        netMovement: summary.netMovement,
        closingBalance: summary.closingBalance,
      },
      companyInfo,
    },
    filename: `monthwise-report-${financialYear}`,
  };
};

export const buildMonthwiseWorkbook = async ({ financialYear, company }) => {
  const { config, filename } = await buildMonthwiseReportConfig({ financialYear, company });
  return { workbook: buildBrandedWorkbook(config), filename: `${filename}.xlsx` };
};

export const buildMonthwisePdf = async ({ financialYear, company }) => {
  const { config, filename } = await buildMonthwiseReportConfig({ financialYear, company });
  return { buffer: await buildBrandedPdf(config), filename: `${filename}.pdf` };
};

// Shared config builder for the two payment-breakdown reports (expense head / company); they
// differ only by their first column, so the caller supplies the labelled items + that column.
const buildBreakdownReportConfig = ({
  financialYear,
  month,
  items,
  totalPayments,
  firstColumn,
  sheetName,
  reportName,
  filenamePrefix,
  companyInfo,
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

  return {
    config: {
      sheetName,
      title: buildTitle(financialYear),
      subtitle: reportName,
      meta: buildMeta({ month }),
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
      companyInfo,
    },
    filename: `${filenamePrefix}-${financialYear}`,
  };
};

const buildExpenseHeadReportConfig = async ({ financialYear, month, company }) => {
  const [{ summary, expenseHeads }, companyInfo] = await Promise.all([
    getExpenseHeadReport({ financialYear, month, company }),
    getCompanyHeaderInfo(company),
  ]);

  return buildBreakdownReportConfig({
    financialYear,
    month,
    totalPayments: summary.totalPayments,
    items: expenseHeads.map((item) => ({ ...item, label: item.expenseHead?.name || '-' })),
    firstColumn: { header: 'Expense Head', width: 30 },
    sheetName: 'Expense Heads',
    reportName: 'Expense Head Report',
    filenamePrefix: 'expense-head-report',
    companyInfo,
  });
};

export const buildExpenseHeadWorkbook = async ({ financialYear, month, company }) => {
  const { config, filename } = await buildExpenseHeadReportConfig({
    financialYear,
    month,
    company,
  });
  return { workbook: buildBrandedWorkbook(config), filename: `${filename}.xlsx` };
};

export const buildExpenseHeadPdf = async ({ financialYear, month, company }) => {
  const { config, filename } = await buildExpenseHeadReportConfig({
    financialYear,
    month,
    company,
  });
  return { buffer: await buildBrandedPdf(config), filename: `${filename}.pdf` };
};

const buildCompanyReportConfig = async ({ financialYear, month }) => {
  const { summary, companies } = await getCompanyReport({ financialYear, month });

  return buildBreakdownReportConfig({
    financialYear,
    month,
    totalPayments: summary.totalPayments,
    items: companies.map((item) => ({ ...item, label: companyLabel(item.company) })),
    firstColumn: { header: 'Company', width: 30 },
    sheetName: 'Companies',
    reportName: 'Company Report',
    filenamePrefix: 'company-report',
  });
};

export const buildCompanyWorkbook = async ({ financialYear, month }) => {
  const { config, filename } = await buildCompanyReportConfig({ financialYear, month });
  return { workbook: buildBrandedWorkbook(config), filename: `${filename}.xlsx` };
};

export const buildCompanyPdf = async ({ financialYear, month }) => {
  const { config, filename } = await buildCompanyReportConfig({ financialYear, month });
  return { buffer: await buildBrandedPdf(config), filename: `${filename}.pdf` };
};
