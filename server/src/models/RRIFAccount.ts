import mongoose, { Schema, Document } from "mongoose";

export interface IRRIFAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  balance: number;
  currency: string;
  ownerAge: number;
  startDate: Date;
  minimumWithdrawalPercentage: number;
  minimumWithdrawalAmount: number;
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

const rrifAccountSchema = new Schema<IRRIFAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    ownerAge: { type: Number, required: true },
    startDate: { type: Date, default: Date.now },
    minimumWithdrawalPercentage: { type: Number, default: 0 },
    minimumWithdrawalAmount: { type: Number, default: 0 },
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

export const RRIFAccount = mongoose.model<IRRIFAccount>(
  "RRIFAccount",
  rrifAccountSchema
);
