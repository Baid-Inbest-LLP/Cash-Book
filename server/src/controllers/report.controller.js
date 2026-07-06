import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendWorkbook } from '../utils/excel.js';
import { getFinancialYear } from '../utils/financialYear.js';
import * as reportService from '../services/report.service.js';
import {
  buildCompanyWorkbook,
  buildExpenseHeadWorkbook,
  buildMonthwiseWorkbook,
} from '../services/export.service.js';

// GET /reports/monthwise - 12-month running ledger for a financial year.
export const monthwise = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getMonthwiseReport({ financialYear });
  ApiResponse.success(res, data);
});

// GET /reports/monthwise/export - download the monthwise report as an Excel file.
export const exportMonthwise = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildMonthwiseWorkbook({ financialYear });
  await sendWorkbook(res, workbook, filename);
});

// GET /reports/expense-heads - payment totals grouped by expense head with share %.
export const expenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getExpenseHeadReport({ financialYear, month, company });
  ApiResponse.success(res, data);
});

// GET /reports/expense-heads/export - download the expense-head report as an Excel file.
export const exportExpenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildExpenseHeadWorkbook({ financialYear, month, company });
  await sendWorkbook(res, workbook, filename);
});

// GET /reports/companies - payment totals grouped by company with share %.
export const companies = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getCompanyReport({ financialYear, month });
  ApiResponse.success(res, data);
});

// GET /reports/companies/export - download the company report as an Excel file.
export const exportCompanies = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { workbook, filename } = await buildCompanyWorkbook({ financialYear, month });
  await sendWorkbook(res, workbook, filename);
});
