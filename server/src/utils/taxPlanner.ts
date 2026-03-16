import { ITaxAccount } from "../models/TaxAccount";
import { IInvestment } from "../models/Investment";

/**
 * Canadian Tax Planning Utilities for Personal Finance
 */

// 2024 Canadian tax limits
export const TAX_LIMITS = {
  RRSP_ANNUAL_MAX: 31560,
  RRSP_PERCENTAGE: 0.18, // 18% of prior year income
  TFSA_ANNUAL_LIMIT: 7000,
  CAPITAL_GAINS_INCLUSION_RATE: 0.5, // 50% of gains are taxable
  DIVIDEND_TAX_CREDIT: 0.38, // Approximate for Canadian dividends
};

/**
 * Calculate RRSP contribution room
 * Formula: (18% of prior year income) + unused room from previous years - overcontributions
 */
export function calculateRRSPRoom(
  priorYearIncome: number,
  currentYearContributions: number,
  lifetimeUnusedRoom: number
): number {
  const annualRoom = Math.min(
    priorYearIncome * TAX_LIMITS.RRSP_PERCENTAGE,
    TAX_LIMITS.RRSP_ANNUAL_MAX
  );
  
  const totalAvailableRoom = lifetimeUnusedRoom + annualRoom;
  const remainingRoom = Math.max(0, totalAvailableRoom - currentYearContributions);
  
  return remainingRoom;
}

/**
 * Calculate TFSA contribution room
 * Each Canadian gets $7,000/year (adjusted annually for inflation)
 * Room carries forward indefinitely
 */
export function calculateTFSARoom(
  lifetimeUnusedRoom: number,
  currentYearContributions: number,
  currentYearWithdrawals: number = 0
): number {
  // In TFSA, withdrawals add back to room next year
  const totalAvailableRoom = lifetimeUnusedRoom + currentYearWithdrawals;
  const remainingRoom = Math.max(0, totalAvailableRoom - currentYearContributions);
  
  return remainingRoom;
}

/**
 * Identify tax-loss harvesting opportunities
 * Look for unrealized losses in non-registered accounts
 */
export function identifyTaxLossHarvestingOpportunities(
  investments: IInvestment[],
  accountType: string
): IInvestment[] {
  if (accountType !== "non-registered") {
    return []; // Only applicable to non-registered accounts
  }
  
  return investments.filter(
    (inv) => inv.unrealizedGain < -50 && !inv.soldDate // Loss > $50
  );
}

/**
 * Calculate tax implications of RRSP contribution
 * Shows tax savings based on marginal tax rate
 */
export interface RRSPContributionTaxSavings {
  contribution: number;
  marginalTaxRate: number; // 20%, 30%, 40%, 50%+
  taxSavings: number;
  netContribution: number; // After tax savings
  futureWithdrawalTax: number; // Estimated tax on withdrawal
}

export function calculateRRSPTaxSavings(
  contributionAmount: number,
  marginalTaxRate: number,
  futureWithdrawalTaxRate: number = marginalTaxRate
): RRSPContributionTaxSavings {
  const taxSavings = contributionAmount * (marginalTaxRate / 100);
  const netContribution = contributionAmount - taxSavings;
  const futureWithdrawalTax = contributionAmount * (futureWithdrawalTaxRate / 100);
  
  return {
    contribution: contributionAmount,
    marginalTaxRate,
    taxSavings,
    netContribution,
    futureWithdrawalTax,
  };
}

/**
 * Get marginal tax rate by province and income (2024 estimates)
 */
export function getMarginalTaxRate(
  income: number,
  province: string = "ON"
): number {
  // Simplified 2024 Canadian marginal tax rates
  const federalBrackets = [
    { limit: 55867, rate: 15 },
    { limit: 111733, rate: 20.5 },
    { limit: 173205, rate: 26 },
    { limit: 246752, rate: 29 },
    { limit: Infinity, rate: 33 },
  ];
  
  const provincialRates: { [key: string]: number[] } = {
    ON: [5.05, 9.15, 11.16, 12.16, 13.16], // Ontario
    BC: [5.06, 7.7, 10.5, 12.29, 14.29],   // BC
    AB: [10, 12, 13, 14, 15],              // Alberta (no provincial sales tax)
    MB: [10.8, 12.75, 17.4, 20.06, 23.06], // Manitoba
    QC: [15, 20, 24, 25.75, 27.575],       // Quebec
  };
  
  const federal = federalBrackets.find((b) => income <= b.limit)?.rate || 33;
  const provincial = (provincialRates[province] || provincialRates["ON"])[
    federalBrackets.findIndex((b) => income <= b.limit)
  ] || 13.16;
  
  return federal + provincial;
}

/**
 * Calculate capital gains tax on investment
 */
export interface CapitalGainsTax {
  unrealizedGain: number;
  inclusionRate: number;
  taxableGain: number;
  taxOwed: number; // At marginal rate
}

export function calculateCapitalGainsTax(
  unrealizedGain: number,
  marginalTaxRate: number
): CapitalGainsTax {
  const taxableGain = unrealizedGain * TAX_LIMITS.CAPITAL_GAINS_INCLUSION_RATE;
  const taxOwed = taxableGain * (marginalTaxRate / 100);
  
  return {
    unrealizedGain,
    inclusionRate: TAX_LIMITS.CAPITAL_GAINS_INCLUSION_RATE,
    taxableGain,
    taxOwed,
  };
}

/**
 * Recommend dividend account optimization
 * Dividends have better tax treatment in non-registered accounts
 */
export interface DividendOptimization {
  accountType: string;
  suitability: string;
  taxEfficiency: number; // 0-100%
  recommendation: string;
}

export function optimizeDividendAccounts(
  taxAccountType: string
): DividendOptimization {
  const scenarios: { [key: string]: DividendOptimization } = {
    tfsa: {
      accountType: "TFSA",
      suitability: "Excellent for any investments",
      taxEfficiency: 100,
      recommendation:
        "Hold highest-growth investments here. All gains and dividends are tax-free.",
    },
    rrsp: {
      accountType: "RRSP",
      suitability: "Good for bonds and GICs",
      taxEfficiency: 90,
      recommendation:
        "Best for interest-bearing investments. Dividends don't benefit from dividend tax credit.",
    },
    "non-registered": {
      accountType: "Non-Registered",
      suitability: "Best for dividend stocks",
      taxEfficiency: 75,
      recommendation:
        "Hold Canadian dividend stocks here. Dividend tax credit saves 30-40% vs interest income.",
    },
  };
  
  return scenarios[taxAccountType] || scenarios["non-registered"];
}

/**
 * Spousal RRSP recommendation
 * Helps with income splitting for retired couples
 */
export interface SpousalRRSPRecommendation {
  highEarnerIncome: number;
  lowEarnerIncome: number;
  recommendedSpousalContribution: number;
  taxSavingsHighEarner: number;
  futureIncomeSplitting: string;
}

export function recommendSpousalRRSP(
  highEarnerIncome: number,
  lowEarnerIncome: number,
  highEarnerMarginalRate: number,
  lowEarnerMarginalRate: number
): SpousalRRSPRecommendation {
  const incomeGap = highEarnerIncome - lowEarnerIncome;
  const recommendedContribution = Math.min(
    incomeGap * 0.25, // Contribute 25% of gap
    (highEarnerIncome * 0.18)
  );
  
  const taxSavings = recommendedContribution * (highEarnerMarginalRate / 100);
  
  return {
    highEarnerIncome,
    lowEarnerIncome,
    recommendedSpousalContribution: recommendedContribution,
    taxSavingsHighEarner: taxSavings,
    futureIncomeSplitting:
      `When retired, spouse withdraws from spousal RRSP at potentially lower rate (${lowEarnerMarginalRate}%), ` +
      `saving ${(recommendedContribution * (highEarnerMarginalRate - lowEarnerMarginalRate)) / 100} in taxes`,
  };
}

/**
 * Calculate optimal withdrawal sequence to minimize taxes
 * Withdrawal order: Non-reg -> TFSA -> RRSP (in retirement)
 */
export interface OptimalWithdrawalSequence {
  amount: number;
  withdrawalOrder: string[];
  reasoning: string;
  estimatedTax: number;
}

export function calculateOptimalWithdrawalSequence(
  neededAmount: number,
  nonRegisteredBalance: number,
  tfsaBalance: number,
  rrspBalance: number,
  marginalTaxRate: number
): OptimalWithdrawalSequence {
  let remaining = neededAmount;
  const withdrawalOrder: string[] = [];
  let estimatedTax = 0;
  
  // 1. Withdraw from non-registered first (only capital gains taxed)
  if (remaining > 0 && nonRegisteredBalance > 0) {
    const nonRegAmount = Math.min(remaining, nonRegisteredBalance);
    withdrawalOrder.push(
      `Non-Registered: $${nonRegAmount.toFixed(2)} (minimal tax)`
    );
    remaining -= nonRegAmount;
  }
  
  // 2. Withdraw from TFSA (no tax)
  if (remaining > 0 && tfsaBalance > 0) {
    const tfsaAmount = Math.min(remaining, tfsaBalance);
    withdrawalOrder.push(`TFSA: $${tfsaAmount.toFixed(2)} (no tax)`);
    remaining -= tfsaAmount;
  }
  
  // 3. Withdraw from RRSP (fully taxed)
  if (remaining > 0 && rrspBalance > 0) {
    const rrspAmount = Math.min(remaining, rrspBalance);
    estimatedTax = rrspAmount * (marginalTaxRate / 100);
    withdrawalOrder.push(
      `RRSP: $${rrspAmount.toFixed(2)} (estimated tax: $${estimatedTax.toFixed(2)})`
    );
    remaining -= rrspAmount;
  }
  
  return {
    amount: neededAmount,
    withdrawalOrder,
    reasoning:
      "Withdraw from non-registered first (lowest tax), then TFSA (no tax), then RRSP (fully taxed)",
    estimatedTax,
  };
}
