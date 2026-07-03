import { z } from 'zod';

const financialYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Financial year must be in YYYY-YY format');

const monthQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  return Number(value);
}, z.number().int().min(1, 'Month must be 1-12').max(12, 'Month must be 1-12').optional());

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Valid MongoDB ObjectId is required');

// Dashboard and the head/company breakdowns share the same FY + optional month filter.
export const reportQuerySchema = z.object({
  financialYear: financialYearSchema.optional(),
  month: monthQuerySchema,
});

// Expense-head report also supports narrowing to a single company.
export const expenseHeadReportQuerySchema = reportQuerySchema.extend({
  company: objectIdSchema.optional(),
});

// The 12-month ledger spans the whole year, so it only takes a financial year.
export const monthwiseQuerySchema = z.object({
  financialYear: financialYearSchema.optional(),
});
