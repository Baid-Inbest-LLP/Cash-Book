import { z } from 'zod';
import { ENTRY_TYPE_VALUES } from '../constants/entryTypes.js';

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, 'Valid MongoDB ObjectId is required');

const normalizeDateInput = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? new Date(trimmed) : undefined;
};

// Entries record something that has already happened, so future dates are rejected.
const isNotFuture = (date) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date <= endOfToday;
};

const dateSchema = z.preprocess(
  normalizeDateInput,
  z
    .date({
      required_error: 'Date is required',
      invalid_type_error: 'Valid date is required',
    })
    .refine(isNotFuture, 'Date cannot be in the future'),
);

const optionalDateQuerySchema = z.preprocess(normalizeDateInput, z.date().optional());

const amountSchema = z.coerce.number().positive('Amount must be greater than 0');

const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'Description must be at most 500 characters')
  .optional();

const createDescriptionSchema = descriptionSchema.default('');

const financialYearSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}$/, 'Financial year must be in YYYY-YY format');

const entryTypeSchema = z.enum(ENTRY_TYPE_VALUES);

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

const baseEntryBodySchema = z.object({
  date: dateSchema,
  company: objectIdSchema,
  amount: amountSchema,
  description: createDescriptionSchema,
});

export const entryIdParamSchema = z.object({
  id: objectIdSchema,
});

// Bulk actions (exclude/restore/permanent-delete) operate on a set of selected entries.
export const entryIdsBodySchema = z.object({
  ids: z
    .array(objectIdSchema)
    .min(1, 'Select at least one entry')
    .max(200, 'At most 200 entries can be selected at once'),
});

export const listEntriesQuerySchema = z
  .object({
    page: numberQuerySchema(z.number().int().min(1)).default(1),
    limit: numberQuerySchema(z.number().int().min(1).max(100)).default(50),
    type: entryTypeSchema.optional(),
    financialYear: financialYearSchema.optional(),
    month: numberQuerySchema(z.number().int().min(1).max(12)),
    company: objectIdSchema.optional(),
    expenseHead: objectIdSchema.optional(),
    isExcluded: booleanQuerySchema,
    fromDate: optionalDateQuerySchema,
    toDate: optionalDateQuerySchema,
    search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
  })
  .refine(
    (data) => !data.fromDate || !data.toDate || data.fromDate <= data.toDate,
    'fromDate cannot be after toDate',
  );

export const createReceiptSchema = baseEntryBodySchema;

export const createPaymentSchema = baseEntryBodySchema.extend({
  expenseHead: objectIdSchema,
});

export const updateEntrySchema = z
  .object({
    type: entryTypeSchema.optional(),
    date: dateSchema.optional(),
    company: objectIdSchema.optional(),
    expenseHead: objectIdSchema.nullish(),
    amount: amountSchema.optional(),
    description: descriptionSchema,
  })
  .refine((data) => Object.keys(data).length > 0, 'At least one field is required');
