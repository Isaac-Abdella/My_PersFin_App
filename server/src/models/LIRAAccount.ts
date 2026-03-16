import mongoose, { Schema, Document } from "mongoose";

export interface ILIRAAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  balance: number;
  currency: string;
  lockedAmount: number;
  unlockedAmount: number;
  provinceOfIssuance: string;
  sourceOfFunds: string; // e.g., "Pension Plan Termination", "Locked-in Annuity"
  withdrawals: Array<{
    year: number;
    amount: number;
    date: Date;
    type: "unlocked" | "hardship";
  }>;
  investmentHoldings: Array<{
    symbol: string;
    quantity: number;
    purchasePrice: number;
    currentValue: number;
    locked: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const liraAccountSchema = new Schema<ILIRAAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    lockedAmount: { type: Number, default: 0 },
    unlockedAmount: { type: Number, default: 0 },
    provinceOfIssuance: { type: String, required: true },
    sourceOfFunds: { type: String, default: "Pension Plan Termination" },
    withdrawals: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["unlocked", "hardship"] },
      },
    ],
    investmentHoldings: [
      {
        symbol: String,
        quantity: Number,
        purchasePrice: Number,
        currentValue: Number,
        locked: Boolean,
      },
    ],
  },
  { timestamps: true }
);

export const LIRAAccount = mongoose.model<ILIRAAccount>(
  "LIRAAccount",
  liraAccountSchema
);
