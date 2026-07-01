import mongoose from 'mongoose';

// One document per financial year — the April starting balance of the cash book.
const openingBalanceSchema = new mongoose.Schema(
  {
    financialYear: { type: String, required: true, unique: true, trim: true },
    openingBalance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

export const OpeningBalance = mongoose.model('OpeningBalance', openingBalanceSchema);
