import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getFinancialYear } from '../utils/financialYear.js';
import * as reportService from '../services/report.service.js';

// GET /reports/monthwise - 12-month running ledger for a financial year.
export const monthwise = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getMonthwiseReport({ financialYear });
  ApiResponse.success(res, data);
});

// GET /reports/expense-heads - payment totals grouped by expense head with share %.
export const expenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, company } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getExpenseHeadReport({ financialYear, month, company });
  ApiResponse.success(res, data);
});

// GET /reports/companies - payment totals grouped by company with share %.
export const companies = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await reportService.getCompanyReport({ financialYear, month });
  ApiResponse.success(res, data);
});
