import mongoose from 'mongoose';

const expenseHeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Case-insensitive uniqueness enforced at the DB level (strength: 2 ignores case
// and diacritics), so writes need no separate duplicate-check query.
expenseHeadSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 }, name: 'expensehead_name_ci' },
);

export const ExpenseHead = mongoose.model('ExpenseHead', expenseHeadSchema);
