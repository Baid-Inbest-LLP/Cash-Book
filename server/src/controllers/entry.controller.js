import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as entryService from '../services/entry.service.js';

// GET /entries - list entries with filters, pagination, and balance summary.
export const listEntries = asyncHandler(async (req, res) => {
  const {
    page,
    limit,
    type,
    financialYear,
    month,
    company,
    expenseHead,
    isExcluded,
    fromDate,
    toDate,
    search,
  } = req.validated?.query || {};

  const result = await entryService.listEntries({
    filters: {
      page,
      limit,
      type,
      financialYear,
      month,
      company,
      expenseHead,
      isExcluded,
      fromDate,
      toDate,
      search,
    },
  });

  ApiResponse.success(res, result);
});

// POST /entries/receipt - create a receipt entry.
export const createReceipt = asyncHandler(async (req, res) => {
  const { date, company, amount, description } = req.body;

  await entryService.createReceipt({
    date,
    company,
    amount,
    description,
    userId: req.user._id,
  });

  ApiResponse.created(res, null, 'Receipt entry created');
});

// POST /entries/payment - create a payment entry with an expense head.
export const createPayment = asyncHandler(async (req, res) => {
  const { date, company, expenseHead, amount, description } = req.body;

  await entryService.createPayment({
    date,
    company,
    expenseHead,
    amount,
    description,
    userId: req.user._id,
  });

  ApiResponse.created(res, null, 'Payment entry created');
});

// PUT /entries/:id - update an existing entry and refresh derived period tags when date changes.
export const updateEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, date, company, expenseHead, amount, description } = req.body;

  await entryService.updateEntry({
    id,
    updates: {
      type,
      date,
      company,
      expenseHead,
      amount,
      description,
    },
    userId: req.user._id,
  });

  ApiResponse.success(res, null, 'Entry updated');
});

// DELETE /entries/:id - move an entry to excluded entries.
export const excludeEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await entryService.excludeEntry({ id, userId: req.user._id });
  ApiResponse.success(res, null, 'Entry moved to excluded entries');
});

// PATCH /entries/:id/restore - restore an excluded entry back to the cash book.
export const restoreEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await entryService.restoreEntry({ id });
  ApiResponse.success(res, null, 'Entry restored');
});

// DELETE /entries/:id/permanent - permanently remove an already excluded entry.
export const deleteEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await entryService.deleteEntry({ id });
  ApiResponse.success(res, null, 'Entry deleted permanently');
});
