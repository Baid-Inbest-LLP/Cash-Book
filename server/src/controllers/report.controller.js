import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendWorkbook } from '../utils/excel.js';
import { sendPdf } from '../utils/pdf.js';
import { getFinancialYear } from '../utils/financialYear.js';
import * as reportService from '../services/report.service.js';
import {
  buildCompanyPdf,
  buildCompanyWorkbook,
  buildExpenseHeadPdf,
  buildExpenseHeadWorkbook,
  buildMonthwisePdf,
  buildMonthwiseWorkbook,
} from '../services/export.service.js';

// GET /reports/monthwise - 12-month running ledger for a financial year.
export const monthwise = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getMonthwiseReport({ financialYear, company });
  ApiResponse.success(res, data);
});

// GET /reports/monthwise/export/excel - download the monthwise report as an Excel file.
export const exportMonthwiseExcel = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildMonthwiseWorkbook({ financialYear, company });
  await sendWorkbook(res, workbook, filename);
});

// GET /reports/monthwise/export/pdf - download the monthwise report as a PDF file.
export const exportMonthwisePdf = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { buffer, filename } = await buildMonthwisePdf({ financialYear, company });
  sendPdf(res, buffer, filename);
});

// GET /reports/expense-heads - payment totals grouped by expense head with share %.
export const expenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getExpenseHeadReport({ financialYear, month, company });
  ApiResponse.success(res, data);
});

// GET /reports/expense-heads/export/excel - download the expense-head report as an Excel file.
export const exportExpenseHeadsExcel = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildExpenseHeadWorkbook({ financialYear, month, company });
  await sendWorkbook(res, workbook, filename);
});

// GET /reports/expense-heads/export/pdf - download the expense-head report as a PDF file.
export const exportExpenseHeadsPdf = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { buffer, filename } = await buildExpenseHeadPdf({ financialYear, month, company });
  sendPdf(res, buffer, filename);
});

// GET /reports/companies - payment totals grouped by company with share %.
export const companies = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getCompanyReport({ financialYear, month });
  ApiResponse.success(res, data);
});

// GET /reports/companies/export/excel - download the company report as an Excel file.
export const exportCompaniesExcel = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildCompanyWorkbook({ financialYear, month });
  await sendWorkbook(res, workbook, filename);
});

// GET /reports/companies/export/pdf - download the company report as a PDF file.
export const exportCompaniesPdf = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { buffer, filename } = await buildCompanyPdf({ financialYear, month });
  sendPdf(res, buffer, filename);
});
