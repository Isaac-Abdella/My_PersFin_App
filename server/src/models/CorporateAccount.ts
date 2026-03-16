import mongoose, { Schema, Document } from "mongoose";

export interface ICorporateAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  businessName: string;
  businessType: "sole-proprietor" | "partnership" | "corporation" | "llc";
  fiscalYearEnd: string; // MM-DD format
  businessNumber: string;
  balance: number;
  currency: string;
  capitalContributions: Array<{
    date: Date;
    amount: number;
    description: string;
  }>;
  deductibleExpenses: Array<{
    date: Date;
    category: string;
    amount: number;
    description: string;
  }>;
  businessIncome: Array<{
    date: Date;
    amount: number;
    description: string;
  }>;
  profitAndLoss: {
    currentYear: number;
    previousYear: number;
    twoYearsAgo: number;
  };
  cumulativeDeductionLimit: number;
  investmentHoldings: Array<{
    symbol: string;
    quantity: number;
    purchasePrice: number;
    currentValue: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const corporateAccountSchema = new Schema<ICorporateAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    businessName: { type: String, required: true },
    businessType: {
      type: String,
      enum: ["sole-proprietor", "partnership", "corporation", "llc"],
      required: true,
    },
    fiscalYearEnd: { type: String, required: true },
    businessNumber: { type: String },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    capitalContributions: [
      {
        date: Date,
        amount: Number,
        description: String,
      },
    ],
    deductibleExpenses: [
      {
        date: Date,
        category: String,
        amount: Number,
        description: String,
      },
    ],
    businessIncome: [
      {
        date: Date,
        amount: Number,
        description: String,
      },
    ],
    profitAndLoss: {
      currentYear: { type: Number, default: 0 },
      previousYear: { type: Number, default: 0 },
      twoYearsAgo: { type: Number, default: 0 },
    },
    cumulativeDeductionLimit: { type: Number, default: 0 },
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

export const CorporateAccount = mongoose.model<ICorporateAccount>(
  "CorporateAccount",
  corporateAccountSchema
);
