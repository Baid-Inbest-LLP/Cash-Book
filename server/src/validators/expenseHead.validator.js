import { z } from 'zod';

export const createExpenseHeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Expense head name is required')
    .max(100, 'Name must be at most 100 characters'),
  isActive: z.boolean().optional(),
});

export const updateExpenseHeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  isActive: z.boolean().optional(),
});
