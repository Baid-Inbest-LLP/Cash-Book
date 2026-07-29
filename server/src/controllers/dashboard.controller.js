import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { resolveFinancialYear } from '../utils/financialYear.js';
import * as dashboardService from '../services/dashboard.service.js';

// GET /dashboard/expense-by-company - payment totals grouped by company, for charting.
export const expenseByCompany = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, location } = req.validated?.query || {};
  const financialYear = resolveFinancialYear(requestedFinancialYear);
  const data = await dashboardService.getExpenseByCompany({
    financialYear,
    month,
    user: req.user,
    location,
  });
  ApiResponse.success(res, { financialYear, month: month ?? null, data });
});

// GET /dashboard/expense-by-expense-head - payment totals grouped by expense head, for charting.
export const expenseByExpenseHead = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, location } = req.validated?.query || {};
  const financialYear = resolveFinancialYear(requestedFinancialYear);
  const data = await dashboardService.getExpenseByExpenseHead({
    financialYear,
    month,
    user: req.user,
    location,
  });
  ApiResponse.success(res, { financialYear, month: month ?? null, data });
});

// GET /dashboard/expense-by-month - payment totals grouped by month, for charting.
export const expenseByMonth = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, location } = req.validated?.query || {};
  const financialYear = resolveFinancialYear(requestedFinancialYear);
  const data = await dashboardService.getExpenseByMonth({ financialYear, user: req.user, location });
  ApiResponse.success(res, { financialYear, data });
});

// GET /dashboard/stats - FY opening/closing balance and receipt/payment totals.
export const stats = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, location } = req.validated?.query || {};
  const financialYear = resolveFinancialYear(requestedFinancialYear);
  const data = await dashboardService.getDashboardStats({ financialYear, user: req.user, location });
  ApiResponse.success(res, { financialYear, data });
});

// GET /dashboard/top-expense-heads - top expense heads by payment amount, paginated.
export const topExpenseHeads = asyncHandler(async (req, res) => {
  const { financialYear: requestedFinancialYear, month, page, limit, location } =
    req.validated?.query || {};
  const financialYear = resolveFinancialYear(requestedFinancialYear);
  const { data, pagination } = await dashboardService.getTopExpenseHeads({
    financialYear,
    month,
    page,
    limit,
    user: req.user,
    location,
  });
  ApiResponse.success(res, { financialYear, month: month ?? null, data, pagination });
});
