import { ExpenseHead, Entry } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

const DUPLICATE_MESSAGE = 'An expense head with this name already exists';

// Translate a MongoDB duplicate-key (E11000) into a clean domain conflict.
const rethrowDuplicate = (err) => {
  if (err?.code === 11000) throw ApiError.conflict(DUPLICATE_MESSAGE);
  throw err;
};

// List heads sorted by name (case-insensitively); active only unless activeOnly is false,
// optionally narrowed by a case-insensitive name search, and paginated.
export const listExpenseHeads = async ({
  activeOnly = true,
  search,
  page = 1,
  limit = 50,
} = {}) => {
  const filter = activeOnly ? { isActive: true } : {};
  if (search) filter.name = { $regex: search, $options: 'i' };

  const total = await ExpenseHead.countDocuments(filter);
  const items = await ExpenseHead.find(filter)
    .select('name isActive')
    .sort({ name: 1 })
    .collation({ locale: 'en', strength: 2 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { items, total };
};

// Insert a head; the collation index rejects case-insensitive duplicate names (409).
export const createExpenseHead = async ({ name, isActive }) => {
  try {
    // Uniqueness is enforced by the collation index — no pre-check query needed.
    await ExpenseHead.create({ name, isActive: isActive ?? true });
  } catch (err) {
    rethrowDuplicate(err);
  }
};

// Apply name/isActive changes; 404 if the head is missing, 409 on a duplicate name.
export const updateExpenseHead = async (id, { name, isActive }) => {
  const set = {};
  if (name !== undefined) set.name = name;
  if (isActive !== undefined) set.isActive = isActive;

  try {
    const { matchedCount } = await ExpenseHead.updateOne(
      { _id: id },
      { $set: set },
      { runValidators: true },
    );
    if (!matchedCount) throw ApiError.notFound('Expense head not found');
  } catch (err) {
    rethrowDuplicate(err);
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
