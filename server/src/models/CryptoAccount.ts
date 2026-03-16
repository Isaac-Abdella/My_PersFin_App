import mongoose, { Schema, Document } from "mongoose";

export interface ICryptoAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  exchange: string;
  currency: string;
  totalInvestedAmount: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: Date;
    currentPrice: number;
    adjustedCostBase: number;
    unrealizedGain: number;
  }>;
  transactions: Array<{
    date: Date;
    type: "buy" | "sell" | "transfer-in" | "transfer-out";
    symbol: string;
    quantity: number;
    price: number;
    amount: number;
    fee: number;
  }>;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  unrealizedGainsTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

const cryptoAccountSchema = new Schema<ICryptoAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    exchange: { type: String, required: true },
    currency: { type: String, default: "CAD" },
    totalInvestedAmount: { type: Number, default: 0 },
    holdings: [
      {
        symbol: String,
        quantity: Number,
        purchasePrice: Number,
        purchaseDate: Date,
        currentPrice: Number,
        adjustedCostBase: Number,
        unrealizedGain: Number,
      },
    ],
    transactions: [
      {
        date: Date,
        type: { type: String, enum: ["buy", "sell", "transfer-in", "transfer-out"] },
        symbol: String,
        quantity: Number,
        price: Number,
        amount: Number,
        fee: Number,
      },
    ],
    totalCapitalGains: { type: Number, default: 0 },
    totalCapitalLosses: { type: Number, default: 0 },
    unrealizedGainsTotal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const CryptoAccount = mongoose.model<ICryptoAccount>(
  "CryptoAccount",
  cryptoAccountSchema
);
