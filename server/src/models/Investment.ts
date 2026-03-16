import mongoose, { Schema, Document } from "mongoose";

export interface IInvestment extends Document {
  userId: mongoose.Types.ObjectId;
  taxAccountId: mongoose.Types.ObjectId; // Reference to TaxAccount
  accountId?: mongoose.Types.ObjectId; // Reference to Account
  
  symbol: string; // Ticker symbol (e.g., VGRO.TO, VFV.TO)
  name: string; // Display name
  type: "etf" | "stock" | "bond" | "mutual-fund" | "gic" | "cash" | "other";
  
  // Purchase info
  purchaseDate: Date;
  purchasePrice: number; // Price per unit
  quantity: number;
  totalCost: number; // purchasePrice * quantity (Adjusted Cost Base)
  
  // Current info
  currentPrice: number; // Market price per unit
  currentValue: number; // currentPrice * quantity
  unrealizedGain: number; // currentValue - totalCost
  unrealizedGainPercent: number; // (unrealizedGain / totalCost) * 100
  
  // Realized gains (if sold)
  soldDate?: Date;
  soldPrice?: number;
  realizedGain?: number;
  taxable?: boolean; // False in TFSA/RRSP, True in non-registered
  
  // Dividend/interest tracking
  dividendsReceived: number;
  interestReceived: number;
  
  // Tax optimization
  isEligibleForTaxLossHarvest?: boolean; // Unrealized loss in non-registered account
  suggestedHarvestLoss?: number;
  
  notes?: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  taxAccountId: { type: Schema.Types.ObjectId, ref: "TaxAccount", required: true },
  accountId: { type: Schema.Types.ObjectId, ref: "Account" },
  
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["etf", "stock", "bond", "mutual-fund", "gic", "cash", "other"],
    default: "etf"
  },
  
  // Purchase info
  purchaseDate: { type: Date, required: true },
  purchasePrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  totalCost: { type: Number, required: true },
  
  // Current info
  currentPrice: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  unrealizedGain: { type: Number, default: 0 },
  unrealizedGainPercent: { type: Number, default: 0 },
  
  // Realized gains
  soldDate: Date,
  soldPrice: Number,
  realizedGain: { type: Number, default: 0 },
  taxable: { type: Boolean, default: false },
  
  // Dividend/interest
  dividendsReceived: { type: Number, default: 0 },
  interestReceived: { type: Number, default: 0 },
  
  // Tax optimization
  isEligibleForTaxLossHarvest: { type: Boolean, default: false },
  suggestedHarvestLoss: { type: Number, default: 0 },
  
  notes: String,
  currency: { type: String, default: "CAD" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Investment = mongoose.model<IInvestment>("Investment", investmentSchema);
