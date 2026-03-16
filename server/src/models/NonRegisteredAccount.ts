import mongoose, { Schema, Document } from "mongoose";

export interface INonRegisteredAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  balance: number;
  currency: string;
  investmentHoldings: Array<{
    symbol: string;
    quantity: number;
    adjustedCostBase: number;
    currentValue: number;
    purchaseDate: Date;
    unrealizedGain: number;
  }>;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  cumulativeCapitalGainsClaimed: number;
  cumulativeCapitalLossesUsed: number;
  carryForwardLosses: number;
  createdAt: Date;
  updatedAt: Date;
}

const nonRegisteredAccountSchema = new Schema<INonRegisteredAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    investmentHoldings: [
      {
        symbol: String,
        quantity: Number,
        adjustedCostBase: Number,
        currentValue: Number,
        purchaseDate: Date,
        unrealizedGain: Number,
      },
    ],
    totalCapitalGains: { type: Number, default: 0 },
    totalCapitalLosses: { type: Number, default: 0 },
    cumulativeCapitalGainsClaimed: { type: Number, default: 0 },
    cumulativeCapitalLossesUsed: { type: Number, default: 0 },
    carryForwardLosses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const NonRegisteredAccount = mongoose.model<INonRegisteredAccount>(
  "NonRegisteredAccount",
  nonRegisteredAccountSchema
);
