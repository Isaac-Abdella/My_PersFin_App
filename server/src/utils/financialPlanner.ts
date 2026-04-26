/**
 * Canadian Financial Planning Calculator & Retirement Planner
 * Phase 4: Financial Planning
 * Retirement projections, emergency fund calculator, net worth tracking, income projections
 */

export interface RetirementProjection {
  retirementAge: number;
  projectedNetWorth: number;
  annualRetirementIncome: number;
  CPPMonthly: number;
  OASMonthly: number;
  EmployerPensionMonthly: number;
  PortfolioWithdrawalMonthly: number;
  yearsOfRetirement: number;
  successProbability: number;
  sustainableWithdrawalRate: number;
}

export interface AnnualProjection {
  year: number;
  age: number;
  income: number;
  savings: number;
  netWorth: number;
  investmentGrowth: number;
  debtRemaining: number;
}

export interface EmergencyFundAnalysis {
  monthlyExpenses: number;
  targetAmount: number;
  currentAmount: number;
  monthsCovered: number;
  status: "underfunded" | "adequate" | "well-funded";
  monthlySavingsNeeded: number;
  monthsToTarget: number;
}

/**
 * Calculate CPP (Canada Pension Plan) estimated monthly payment
 * Based on average earnings and contribution history
 */
export function calculateCPP(
  averageEarnings: number,
  yearsContributed: number = 35,
  startingAge: number = 65
): {
  monthlyAt60: number;
  monthlyAt65: number;
  monthlyAt70: number;
} {
  // CPP maximum in 2024: ~$16,319 annually ($1,360/month)
  // Roughly 25% of average earnings (capped)
  const maxMonthly = 1360;
  const baseMonthly = (averageEarnings / 12) * 0.25;
  const cappedMonthly = Math.min(baseMonthly, maxMonthly);

  // Adjustment factors for early/late claiming
  const reductionFactor60 = 0.64; // 36% reduction
  const standardFactor65 = 1.0; // No adjustment
  const increaseFactor70 = 1.42; // 42% increase

  return {
    monthlyAt60: Math.round(cappedMonthly * reductionFactor60),
    monthlyAt65: Math.round(cappedMonthly * standardFactor65),
    monthlyAt70: Math.round(cappedMonthly * increaseFactor70),
  };
}

/**
 * Calculate OAS (Old Age Security) estimated monthly payment
 * Starts at age 65, ~$692/month (varies by province and income)
 */
export function calculateOAS(
  income: number,
  age: number = 65
): number {
  // OAS base amount ~$692/month in 2024
  const oasBase = 692;

  // GIS (Guaranteed Income Supplement) for lower income
  // Reduced for higher incomes (clawback starts at ~$81K)
  if (income < 30000 && age >= 65) {
    return oasBase + 300; // Simplified GIS estimate
  }

  // Standard OAS
  if (income < 81000 && age >= 65) {
    return oasBase;
  }

  // Clawback for higher incomes
  const clawbackRate = 0.15; // 15% of income over threshold
  const clawback = Math.max(0, (income - 81000) * clawbackRate);

  return Math.max(0, oasBase - clawback);
}

/**
 * Project retirement income from combined sources
 */
export function calculateRetirementIncome(
  averageEarnings: number,
  cpStartAge: number,
  oasStartAge: number = 65,
  portfolioAmount: number = 0
): {
  cpp: number;
  oas: number;
  portfolio: number;
  total: number;
} {
  const cppPayment = calculateCPP(averageEarnings, 35, cpStartAge);
  const cppMonthly = cpStartAge === 60 ? cppPayment.monthlyAt60 : 
                      cpStartAge === 65 ? cppPayment.monthlyAt65 : 
                      cppPayment.monthlyAt70;

  const oasMonthly = calculateOAS(averageEarnings, oasStartAge);
  
  // Safe withdrawal rate from portfolio: 4% annual
  const portfolioMonthly = (portfolioAmount * 0.04) / 12;

  const total = cppMonthly + oasMonthly + portfolioMonthly;

  return {
    cpp: cppMonthly,
    oas: oasMonthly,
    portfolio: portfolioMonthly,
    total,
  };
}

/**
 * Calculate emergency fund target and status
 */
export function analyzeEmergencyFund(
  monthlyExpenses: number,
  currentSavings: number,
  targetMonths: number = 6
): EmergencyFundAnalysis {
  const targetAmount = monthlyExpenses * targetMonths;
  const monthsCovered = currentSavings / monthlyExpenses;
  
  let status: "underfunded" | "adequate" | "well-funded";
  if (monthsCovered < 3) {
    status = "underfunded";
  } else if (monthsCovered < 6) {
    status = "adequate";
  } else {
    status = "well-funded";
  }

  // Calculate savings needed
  const shortfall = Math.max(0, targetAmount - currentSavings);
  const monthlySavingsNeeded = shortfall > 0 ? shortfall / 12 : 0;
  const monthsToTarget = shortfall > 0 ? Math.ceil(shortfall / monthlySavingsNeeded) : 0;

  return {
    monthlyExpenses,
    targetAmount,
    currentAmount: currentSavings,
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    status,
    monthlySavingsNeeded,
    monthsToTarget,
  };
}

/**
 * Project financial trajectory over time until retirement
 */
export function projectFinancialTrajectory(
  currentAge: number,
  retirementAge: number,
  currentIncome: number,
  annualIncomeGrowth: number,
  currentSavings: number,
  monthlyContribution: number,
  investmentReturnRate: number,
  currentDebt: number,
  annualDebtPayment: number
): AnnualProjection[] {
  const projections: AnnualProjection[] = [];
  let savings = currentSavings;
  let income = currentIncome;
  let debt = currentDebt;

  for (let year = 0; year <= retirementAge - currentAge; year++) {
    const age = currentAge + year;
    
    // Income grows annually
    const annualContribution = monthlyContribution * 12;
    
    // Investment returns
    const investmentGrowth = savings * investmentReturnRate;
    
    // Debt payments
    debt = Math.max(0, debt - annualDebtPayment);
    
    // Update savings
    savings = savings + annualContribution + investmentGrowth;
    income = income * (1 + annualIncomeGrowth);

    // Net worth = savings - debt
    const netWorth = savings - debt;

    projections.push({
      year,
      age,
      income: Math.round(income),
      savings: Math.round(savings),
      netWorth: Math.round(netWorth),
      investmentGrowth: Math.round(investmentGrowth),
      debtRemaining: Math.round(debt),
    });
  }

  return projections;
}

/**
 * Calculate retirement readiness
 */
export function analyzeRetirementReadiness(
  projectedNetWorth: number,
  desiredAnnualIncome: number,
  cpMonthly: number,
  oasMonthly: number,
  employerPensionMonthly: number = 0,
  yearsOfRetirement: number = 30
): RetirementProjection {
  // Required portfolio value for sustainable withdrawals
  const cppAnnual = cpMonthly * 12;
  const oasAnnual = oasMonthly * 12;
  const employerPensionAnnual = employerPensionMonthly * 12;
  const guaranteedIncomeAnnual = cppAnnual + oasAnnual + employerPensionAnnual;
  const portfolioIncomeNeeded = Math.max(0, desiredAnnualIncome - guaranteedIncomeAnnual);

  // 4% safe withdrawal rule
  const requiredPortfolio = portfolioIncomeNeeded / 0.04;

  // Success probability (simple: comparing to requirement)
  const successProbability = Math.min(100, Math.round((projectedNetWorth / requiredPortfolio) * 100));

  // Sustainable withdrawal rate from actual portfolio
  const sustainableWithdrawalRate = Math.min(0.05, projectedNetWorth ? portfolioIncomeNeeded / projectedNetWorth : 0);

  // Calculate actual retirement income
  const portfolioWithdrawal = projectedNetWorth * 0.04; // Safe 4% rule
  const totalRetirementIncome = guaranteedIncomeAnnual + portfolioWithdrawal;

  return {
    retirementAge: 65, // Placeholder
    projectedNetWorth: Math.round(projectedNetWorth),
    annualRetirementIncome: Math.round(totalRetirementIncome),
    CPPMonthly: cpMonthly,
    OASMonthly: oasMonthly,
    EmployerPensionMonthly: Math.round(employerPensionMonthly),
    PortfolioWithdrawalMonthly: Math.round(portfolioWithdrawal / 12),
    yearsOfRetirement,
    successProbability,
    sustainableWithdrawalRate,
  };
}

/**
 * Calculate net worth tracking over time
 */
export function calculateNetWorth(
  assets: {
    taxAccount: number;
    investments: number;
    savings: number;
    otherAssets: number;
  },
  liabilities: {
    mortage: number;
    unsecuredDebt: number;
    otherLiabilities: number;
  }
): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatio: number;
} {
  const totalAssets = assets.taxAccount + assets.investments + assets.savings + assets.otherAssets;
  const totalLiabilities = liabilities.mortage + liabilities.unsecuredDebt + liabilities.otherLiabilities;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? totalLiabilities / totalAssets : 0;

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    debtToAssetRatio,
  };
}

/**
 * Generate comprehensive financial plan
 */
export function generateFinancialPlan(
  currentAge: number,
  retirementAge: number,
  currentIncome: number,
  currentNetWorth: number,
  monthlyContribution: number,
  desiredRetirementIncome: number,
  monthlyExpenses: number,
  employerPensionMonthly: number = 0
): {
  retirementProjection: RetirementProjection;
  emergencyFund: EmergencyFundAnalysis;
  trajectory: AnnualProjection[];
  recommendations: string[];
} {
  const yearsToRetirement = retirementAge - currentAge;

  // Project to retirement
  const trajectory = projectFinancialTrajectory(
    currentAge,
    retirementAge,
    currentIncome,
    0.02, // 2% annual income growth
    currentNetWorth,
    monthlyContribution,
    0.065, // 6.5% investment returns (moderate)
    0, // current debt
    0 // debt payments
  );

  const retirementNetWorth = trajectory[trajectory.length - 1].netWorth;
  const cpp = calculateCPP(currentIncome, 35, 65);
  const oas = calculateOAS(currentIncome, 65);

  const retirementProjection = analyzeRetirementReadiness(
    retirementNetWorth,
    desiredRetirementIncome,
    cpp.monthlyAt65,
    oas,
    employerPensionMonthly
  );

  const emergencyFund = analyzeEmergencyFund(monthlyExpenses, currentNetWorth);

  // Generate recommendations
  const recommendations: string[] = [];

  if (retirementProjection.successProbability < 50) {
    recommendations.push(
      `⚠️ Retirement plan at risk! Success probability only ${retirementProjection.successProbability}%. Consider: (1) increasing savings, (2) working longer, or (3) reducing retirement income target.`
    );
  } else if (retirementProjection.successProbability >= 75) {
    recommendations.push(`✅ Strong retirement plan! ${retirementProjection.successProbability}% probability of success.`);
  }

  if (emergencyFund.status === "underfunded") {
    recommendations.push(
      `⚠️ Emergency fund is underfunded. Target: $${Math.round(emergencyFund.targetAmount).toLocaleString()} (${emergencyFund.targetAmount / emergencyFund.monthlyExpenses} months of expenses).`
    );
  } else if (emergencyFund.status === "well-funded") {
    recommendations.push(`✅ Strong emergency fund! You have ${emergencyFund.monthsCovered} months of expenses saved.`);
  }

  if (employerPensionMonthly > 0) {
    recommendations.push(`✅ Great! Your Government of BC Pension ($${Math.round(employerPensionMonthly).toLocaleString()}/month) provides strong retirement income security.`);
  }

  recommendations.push(`💡 Consider focusing on TFSA first ($7,000/year tax-free) before regular investments.`);
  recommendations.push(`📊 Expected retirement income: $${Math.round(retirementProjection.annualRetirementIncome).toLocaleString()}/year.`);
  recommendations.push(`🎯 Track net worth annually to stay on course toward your retirement goal.`);

  return {
    retirementProjection,
    emergencyFund,
    trajectory,
    recommendations,
  };
}
