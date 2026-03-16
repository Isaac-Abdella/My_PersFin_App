import mongoose, { Schema, Document } from "mongoose";

export interface ILIFAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  balance: number;
  currency: string;
  ownerAge: number;
  provinceOfIssuance: string;
  startDate: Date;
  minimumWithdrawalPercentage: number;
  minimumWithdrawalAmount: number;
  maximumWithdrawalAmount: number;
  lockedPortionAmount: number;
  withdrawals: Array<{
    year: number;
    amount: number;
    date: Date;
    mandatory: boolean;
  }>;
  investmentHoldings: Array<{
    symbol: string;
    quantity: number;
    purchasePrice: number;
    currentValue: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const lifAccountSchema = new Schema<ILIFAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    ownerAge: { type: Number, required: true },
    provinceOfIssuance: { type: String, required: true },
    startDate: { type: Date, default: Date.now },
    minimumWithdrawalPercentage: { type: Number, default: 0 },
    minimumWithdrawalAmount: { type: Number, default: 0 },
    maximumWithdrawalAmount: { type: Number, default: 0 },
    lockedPortionAmount: { type: Number, default: 0 },
    withdrawals: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        mandatory: Boolean,
      },
    ],
    investmentHoldings: [
      {
        symbol: String,
        quantity: Number,
        purchasePrice: Number,
        currentValue: Number,
      },
    ],
  },
  { timestamps: true }
);

export const LIFAccount = mongoose.model<ILIFAccount>(
  "LIFAccount",
  lifAccountSchema
);
