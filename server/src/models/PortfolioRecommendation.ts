import mongoose, { Document, Schema } from "mongoose";

export interface IPortfolioRecommendation extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  riskProfile: "conservative" | "moderate" | "aggressive";
  timeHorizon: number; // years
  investmentGoal: string;
  currentNetWorth: number;
  goalAmount: number;
  goalYear: number;
  recommendedAllocation: {
    equities: number; // percentage
    fixedIncome: number;
    alternatives: number;
    cash: number;
  };
  etfRecommendations: {
    symbol: string;
    name: string;
    allocation: number; // percentage
    fee: number; // MER
    type: string;
    description: string;
  }[];
  projectedReturns: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  monthlyInvestmentNeeded: number;
  successProbability: number; // 0-100
  assumptions: {
    inflationRate: number;
    returnAssumptions: {
      equities: number;
      fixedIncome: number;
      alternatives: number;
      cash: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const portfolioRecommendationSchema = new Schema<IPortfolioRecommendation>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  name: String,
  riskProfile: {
    type: String,
    enum: ["conservative", "moderate", "aggressive"],
    required: true,
  },
  timeHorizon: { type: Number, required: true },
  investmentGoal: String,
  currentNetWorth: { type: Number, required: true },
  goalAmount: { type: Number, required: true },
  goalYear: { type: Number, required: true },
  recommendedAllocation: {
    equities: Number,
    fixedIncome: Number,
    alternatives: Number,
    cash: Number,
  },
  etfRecommendations: [
    {
      symbol: String,
      name: String,
      allocation: Number,
      fee: Number,
      type: String,
      description: String,
    },
  ],
  projectedReturns: {
    conservative: Number,
    moderate: Number,
    aggressive: Number,
  },
  monthlyInvestmentNeeded: Number,
  successProbability: Number,
  assumptions: {
    inflationRate: Number,
    returnAssumptions: {
      equities: Number,
      fixedIncome: Number,
      alternatives: Number,
      cash: Number,
    },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const PortfolioRecommendation = mongoose.model(
  "PortfolioRecommendation",
  portfolioRecommendationSchema
);
