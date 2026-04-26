import mongoose, { Schema, Document } from "mongoose";

export interface IRDSPAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountName: string;
  balance: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryBirthDate: Date;
  beneficiarySIN: string;
  beneficiaryAge: number;
  designatedResponsible?: string; // DRP - Designated Responsible Person
  contributions: Array<{
    year: number;
    amount: number;
    date: Date;
    type: "grant" | "bond" | "personal"; // Types of RDSP contributions
  }>;
  withdrawals: Array<{
    year: number;
    amount: number;
    date: Date;
    type: "regular" | "lifelong";
  }>;
  grants: Array<{
    year: number;
    amount: number;
    date: Date;
    grantType: "ccesg" | "cesg"; // ccesg (Canada Disability Savings Grant), cesg (Grant component)
  }>;
  bonds: Array<{
    year: number;
    amount: number;
    date: Date;
    bondType: "cdbs" | "cebs"; // cdbs (Canada Disability Savings Bond), cebs (Enhanced Bond)
  }>;
  lifetimeContributionLimit: number;
  annualContributionLimit: number;
  currentYearContributions: number;
  grantRoom: number;
  bondRoom: number;
  investmentHoldings: Array<{
    symbol: string;
    quantity: number;
    adjustedCostBase: number;
    currentValue: number;
  }>;
  projectedLifetimeAccumulation: number; // Estimate of account value at age 65
  repaymentObligation?: {
    amount: number;
    reason: string;
    dueDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const rdspAccountSchema = new Schema<IRDSPAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    beneficiaryName: { type: String, required: true },
    beneficiaryBirthDate: { type: Date, required: true },
    beneficiarySIN: { type: String, required: true },
    beneficiaryAge: { type: Number, default: 0 },
    designatedResponsible: String,
    contributions: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        type: {
          type: String,
          enum: ["grant", "bond", "personal"],
          default: "personal",
        },
      },
    ],
    withdrawals: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        type: { type: String, enum: ["regular", "lifelong"], default: "regular" },
      },
    ],
    grants: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        grantType: { type: String, enum: ["ccesg", "cesg"], default: "ccesg" },
      },
    ],
    bonds: [
      {
        year: Number,
        amount: Number,
        date: { type: Date, default: Date.now },
        bondType: { type: String, enum: ["cdbs", "cebs"], default: "cdbs" },
      },
    ],
    lifetimeContributionLimit: { type: Number, default: 200000 },
    annualContributionLimit: { type: Number, default: 2500 },
    currentYearContributions: { type: Number, default: 0 },
    grantRoom: { type: Number, default: 80000 }, // Cumulative grant limit
    bondRoom: { type: Number, default: 90000 }, // Cumulative bond limit
    investmentHoldings: [
      {
        symbol: String,
        quantity: Number,
        adjustedCostBase: Number,
        currentValue: Number,
      },
    ],
    projectedLifetimeAccumulation: { type: Number, default: 0 },
    repaymentObligation: {
      amount: Number,
      reason: String,
      dueDate: Date,
    },
  },
  { timestamps: true }
);

export const RDSPAccount = mongoose.model<IRDSPAccount>(
  "RDSPAccount",
  rdspAccountSchema
);
