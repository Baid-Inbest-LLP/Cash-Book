import { ExpenseHead, Entry } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const DUPLICATE_MESSAGE = 'An expense head with this name already exists';

// Translate a MongoDB duplicate-key (E11000) into a clean domain conflict.
const rethrowDuplicate = (err) => {
  if (err?.code === 11000) throw ApiError.conflict(DUPLICATE_MESSAGE);
  throw err;
};

// List heads sorted by name (case-insensitively); active only unless activeOnly is false.
export const listExpenseHeads = ({ activeOnly = true } = {}) => {
  const filter = activeOnly ? { isActive: true } : {};
  return ExpenseHead.find(filter).sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean();
};

// Insert a head; the collation index rejects case-insensitive duplicate names (409).
export const createExpenseHead = async ({ name, isActive }) => {
  try {
    // Uniqueness is enforced by the collation index — no pre-check query needed.
    return await ExpenseHead.create({ name, isActive: isActive ?? true });
  } catch (err) {
    return rethrowDuplicate(err);
  }
};

// Apply name/isActive changes; 404 if the head is missing, 409 on a duplicate name.
export const updateExpenseHead = async (id, { name, isActive }) => {
  const set = {};
  if (name !== undefined) set.name = name;
  if (isActive !== undefined) set.isActive = isActive;

  try {
    const item = await ExpenseHead.findByIdAndUpdate(
      id,
      { $set: set },
      { new: true, runValidators: true },
    );
    if (!item) throw ApiError.notFound('Expense head not found');
    return item;
  } catch (err) {
    return rethrowDuplicate(err);
  }
};

// Hard-delete a head; blocked with 409 if any entry references it, 404 if missing.
export const deleteExpenseHead = async (id) => {
  // Referential guard: a head referenced by any entry cannot be hard-deleted
  // without orphaning those payments. This cross-collection check is inherent.
  const inUse = await Entry.exists({ expenseHead: id });
  if (inUse) {
    throw ApiError.conflict(
      'This expense head is used by existing entries. Deactivate it instead of deleting.',
    );
  }

  const deleted = await ExpenseHead.findByIdAndDelete(id);
  if (!deleted) throw ApiError.notFound('Expense head not found');
  return deleted;
};
