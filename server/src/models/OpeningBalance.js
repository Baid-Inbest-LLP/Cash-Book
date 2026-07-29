import mongoose from 'mongoose';

// One document per financial year per location — the April starting balance of that location's cash book.
const openingBalanceSchema = new mongoose.Schema(
  {
    financialYear: { type: String, required: true, trim: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'LocationCity', required: true },
    openingBalance: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

openingBalanceSchema.index({ financialYear: 1, location: 1 }, { unique: true });

export const OpeningBalance = mongoose.model('OpeningBalance', openingBalanceSchema);
