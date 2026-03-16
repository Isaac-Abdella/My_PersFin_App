import mongoose, { Schema, Document } from "mongoose";

export interface ITaxAccount extends Document {
  userId: mongoose.Types.ObjectId;
  accountType: "rrsp" | "tfsa" | "non-registered";
  accountName: string;
  linkedAccountId?: mongoose.Types.ObjectId; // Link to Account.ts
  
  // RRSP specific
  rrspContributionLimit?: number; // Annual limit (18% of previous year income, max ~$31,560)
  rrspLifetimeRoom?: number; // Cumulative unused room
  rrspContributions?: number; // Total contributed in current year
  
  // TFSA specific
  tfsaAnnualLimit?: number; // Annual limit ($7,000 for 2024)
  tfsaLifetimeRoom?: number; // Cumulative unused room
  tfsaContributions?: number; // Total contributed in current year
  
  // Income tracking
  priorYearIncome?: number; // For RRSP calculation
  maritalStatus?: "single" | "married" | "divorced" | "widowed" | "common-law";
  
  // Investment tracking
  totalCost: number; // ACB (Adjusted Cost Base)
  currentValue: number;
  unrealizedGains: number; // currentValue - totalCost
  realizedGains: number; // Gains already triggered
  
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const taxAccountSchema = new Schema<ITaxAccount>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  accountType: { 
    type: String, 
    enum: ["rrsp", "tfsa", "non-registered"],
    required: true 
  },
  accountName: { type: String, required: true },
  linkedAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
  
  // RRSP fields
  rrspContributionLimit: { type: Number, default: 0 },
  rrspLifetimeRoom: { type: Number, default: 0 },
  rrspContributions: { type: Number, default: 0 },
  
  // TFSA fields
  tfsaAnnualLimit: { type: Number, default: 7000 },
  tfsaLifetimeRoom: { type: Number, default: 0 },
  tfsaContributions: { type: Number, default: 0 },
  
  // Income tracking
  priorYearIncome: { type: Number, default: 0 },
  maritalStatus: {
    type: String,
    enum: ["single", "married", "divorced", "widowed", "common-law"],
    default: "single"
  },
  
  // Investment tracking
  totalCost: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  unrealizedGains: { type: Number, default: 0 },
  realizedGains: { type: Number, default: 0 },
  
  currency: { type: String, default: "CAD" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const TaxAccount = mongoose.model<ITaxAccount>("TaxAccount", taxAccountSchema);
