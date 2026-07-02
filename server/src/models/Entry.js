import mongoose from 'mongoose';
import { ENTRY_TYPES, ENTRY_TYPE_VALUES } from '../constants/entryTypes.js';

const entrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ENTRY_TYPE_VALUES, required: true },
    date: { type: Date, required: true },

    // Period tags, derived from `date` at write time for fast filtering/aggregation.
    financialYear: { type: String, required: true, trim: true }, // e.g. "2025-26"
    month: { type: Number, required: true, min: 1, max: 12 }, // calendar month 1-12

    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },

    // Expense head applies to payments (expenses); receipts (income) have none.
    expenseHead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseHead',
      required() {
        return this.type === ENTRY_TYPES.PAYMENT;
      },
    },

    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },

    // Excluded entries are the recycle bin and are ignored by balance calculations.
    isExcluded: { type: Boolean, default: false },
    excludedAt: { type: Date, default: null },
    excludedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

// Single-field indexes called out in the architecture.
entrySchema.index({ date: 1 });
entrySchema.index({ financialYear: 1 });
entrySchema.index({ isExcluded: 1 });
entrySchema.index({ company: 1 });

// Compound index for the hot path: visible entries within a financial year
// (Balance Engine, dashboard, and month-wise reports).
entrySchema.index({ financialYear: 1, isExcluded: 1, date: 1 });

export const Entry = mongoose.model('Entry', entrySchema);
