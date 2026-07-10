import { z } from 'zod';
import { financialYearSchema, reportQuerySchema } from './report.validator.js';

const numberQuerySchema = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    return Number(value);
  }, schema.optional());

// The month-wise chart spans the whole year, so it only takes a financial year.
export const expenseByMonthQuerySchema = z.object({
  financialYear: financialYearSchema.optional(),
});

// Top expense heads shares the FY + optional month filter, plus pagination.
export const topExpenseHeadsQuerySchema = reportQuerySchema.extend({
  page: numberQuerySchema(z.number().int().min(1)).default(1),
  limit: numberQuerySchema(z.number().int().min(1).max(100)).default(5),
});
