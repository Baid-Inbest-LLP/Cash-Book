import { z } from 'zod';

const capitalizeFirst = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const booleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === '') return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean().optional());

const numberQuerySchema = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === '') return undefined;
    return Number(value);
  }, schema.optional());

export const listExpenseHeadsQuerySchema = z.object({
  activeOnly: booleanQuerySchema.default(true),
  search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
  page: numberQuerySchema(z.number().int().min(1)).default(1),
  limit: numberQuerySchema(z.number().int().min(1).max(100)).default(50),
});

export const createExpenseHeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Expense head name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform(capitalizeFirst),
  isActive: z.boolean().optional(),
});

export const updateExpenseHeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be at most 100 characters')
    .transform(capitalizeFirst)
    .optional(),
  isActive: z.boolean().optional(),
});
