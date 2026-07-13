import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { sendWorkbook } from '../utils/excel.js';
import { getFinancialYear } from '../utils/financialYear.js';
import * as entryService from '../services/entry.service.js';
import { buildEntriesWorkbook } from '../services/export.service.js';

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

// GET /entries/export/excel - download the filtered entries as a branded Excel file.
export const exportEntriesExcel = asyncHandler(async (req, res) => {
  const query = req.validated?.query || {};
  const financialYear = query.financialYear || getFinancialYear();
  const { workbook, filename } = await buildEntriesWorkbook({
    filters: { ...query, financialYear },
  });
  await sendWorkbook(res, workbook, filename);
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

// Pluralise the entry count for user-facing messages.
const entryLabel = (count) => `${count} entr${count === 1 ? 'y' : 'ies'}`;

// PATCH /entries/exclude - move the selected entries to excluded entries.
export const excludeEntries = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { count } = await entryService.excludeEntries({ ids, userId: req.user._id });
  ApiResponse.success(res, null, `${entryLabel(count)} moved to excluded entries`);
});

// PATCH /entries/restore - restore the selected excluded entries back to the cash book.
export const restoreEntries = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { count } = await entryService.restoreEntries({ ids });
  ApiResponse.success(res, null, `${entryLabel(count)} restored`);
});

// DELETE /entries/permanent - permanently remove the selected already-excluded entries.
export const deleteEntries = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { count } = await entryService.deleteEntries({ ids });
  ApiResponse.success(res, null, `${entryLabel(count)} deleted permanently`);
});
