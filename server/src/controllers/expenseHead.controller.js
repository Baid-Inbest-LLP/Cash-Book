import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as expenseHeadService from '../services/expenseHead.service.js';

// GET /expense-heads — list heads (active only unless ?activeOnly=false).
export const listExpenseHeads = asyncHandler(async (req, res) => {
  const items = await expenseHeadService.listExpenseHeads({
    activeOnly: req.query.activeOnly !== 'false',
  });
  ApiResponse.success(res, items);
});

// POST /expense-heads — create a new head.
export const createExpenseHead = asyncHandler(async (req, res) => {
  const { name, isActive } = req.body;
  await expenseHeadService.createExpenseHead({ name, isActive });
  ApiResponse.created(res, null, 'Expense head created');
});

// PUT /expense-heads/:id — update a head's name and/or active state.
export const updateExpenseHead = asyncHandler(async (req, res) => {
  const { name, isActive } = req.body;
  await expenseHeadService.updateExpenseHead(req.params.id, { name, isActive });
  ApiResponse.success(res, null, 'Expense head updated');
});

// DELETE /expense-heads/:id — remove a head (blocked if referenced by entries).
export const deleteExpenseHead = asyncHandler(async (req, res) => {
  await expenseHeadService.deleteExpenseHead(req.params.id);
  ApiResponse.success(res, null, 'Expense head deleted');
});
