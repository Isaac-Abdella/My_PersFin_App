"use strict";
/**
 * Canadian Financial Planning Calculator & Retirement Planner
 * Phase 4: Financial Planning
 * Retirement projections, emergency fund calculator, net worth tracking, income projections
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCPP = calculateCPP;
exports.calculateOAS = calculateOAS;
exports.calculateRetirementIncome = calculateRetirementIncome;
exports.analyzeEmergencyFund = analyzeEmergencyFund;
exports.projectFinancialTrajectory = projectFinancialTrajectory;
exports.analyzeRetirementReadiness = analyzeRetirementReadiness;
exports.calculateNetWorth = calculateNetWorth;
exports.generateFinancialPlan = generateFinancialPlan;
/**
 * Calculate CPP (Canada Pension Plan) estimated monthly payment
 * Based on average earnings and contribution history
 */
function calculateCPP(averageEarnings, yearsContributed = 35, startingAge = 65) {
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
function calculateOAS(income, age = 65) {
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
function calculateRetirementIncome(averageEarnings, cpStartAge, oasStartAge = 65, portfolioAmount = 0) {
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
function analyzeEmergencyFund(monthlyExpenses, currentSavings, targetMonths = 6) {
    const targetAmount = monthlyExpenses * targetMonths;
    const monthsCovered = currentSavings / monthlyExpenses;
    let status;
    if (monthsCovered < 3) {
        status = "underfunded";
    }
    else if (monthsCovered < 6) {
        status = "adequate";
    }
    else {
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
function projectFinancialTrajectory(currentAge, retirementAge, currentIncome, annualIncomeGrowth, currentSavings, monthlyContribution, investmentReturnRate, currentDebt, annualDebtPayment) {
    const projections = [];
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
function analyzeRetirementReadiness(projectedNetWorth, desiredAnnualIncome, cpMonthly, oasMonthly, employerPensionMonthly = 0, yearsOfRetirement = 30) {
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
function calculateNetWorth(assets, liabilities) {
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
function generateFinancialPlan(currentAge, retirementAge, currentIncome, currentNetWorth, monthlyContribution, desiredRetirementIncome, monthlyExpenses, employerPensionMonthly = 0) {
    const yearsToRetirement = retirementAge - currentAge;
    // Project to retirement
    const trajectory = projectFinancialTrajectory(currentAge, retirementAge, currentIncome, 0.02, // 2% annual income growth
    currentNetWorth, monthlyContribution, 0.065, // 6.5% investment returns (moderate)
    0, // current debt
    0 // debt payments
    );
    const retirementNetWorth = trajectory[trajectory.length - 1].netWorth;
    const cpp = calculateCPP(currentIncome, 35, 65);
    const oas = calculateOAS(currentIncome, 65);
    const retirementProjection = analyzeRetirementReadiness(retirementNetWorth, desiredRetirementIncome, cpp.monthlyAt65, oas, employerPensionMonthly);
    const emergencyFund = analyzeEmergencyFund(monthlyExpenses, currentNetWorth);
    // Generate recommendations
    const recommendations = [];
    if (retirementProjection.successProbability < 50) {
        recommendations.push(`⚠️ Retirement plan at risk! Success probability only ${retirementProjection.successProbability}%. Consider: (1) increasing savings, (2) working longer, or (3) reducing retirement income target.`);
    }
    else if (retirementProjection.successProbability >= 75) {
        recommendations.push(`✅ Strong retirement plan! ${retirementProjection.successProbability}% probability of success.`);
    }
    if (emergencyFund.status === "underfunded") {
        recommendations.push(`⚠️ Emergency fund is underfunded. Target: $${Math.round(emergencyFund.targetAmount).toLocaleString()} (${emergencyFund.targetAmount / emergencyFund.monthlyExpenses} months of expenses).`);
    }
    else if (emergencyFund.status === "well-funded") {
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
