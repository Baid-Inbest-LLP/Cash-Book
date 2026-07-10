import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { getFinancialYear } from '../utils/financialYear.js';
import * as dashboardService from '../services/dashboard.service.js';

// GET /dashboard/expense-by-company - payment totals grouped by company, for charting.
export const expenseByCompany = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await dashboardService.getExpenseByCompany({ financialYear, month });
  ApiResponse.success(res, { financialYear, month: month ?? null, data });
});

// GET /dashboard/expense-by-expense-head - payment totals grouped by expense head, for charting.
export const expenseByExpenseHead = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await dashboardService.getExpenseByExpenseHead({ financialYear, month });
  ApiResponse.success(res, { financialYear, month: month ?? null, data });
});

// GET /dashboard/expense-by-month - payment totals grouped by month, for charting.
export const expenseByMonth = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const data = await dashboardService.getExpenseByMonth({ financialYear });
  ApiResponse.success(res, { financialYear, data });
});

// GET /dashboard/top-expense-heads - top expense heads by payment amount, paginated.
export const topExpenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, page, limit } = req.validated?.query || {};
  const financialYear = requestedFinancialYear || getFinancialYear();
  const { data, pagination } = await dashboardService.getTopExpenseHeads({
    financialYear,
    month,
    page,
    limit,
  });
  ApiResponse.success(res, { financialYear, month: month ?? null, data, pagination });
});
