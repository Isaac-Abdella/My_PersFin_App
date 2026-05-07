"use strict";
/**
 * Canadian RDSP (Registered Disability Savings Plan) Calculator & Utilities
 * 2024 Rules and Limits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RDSP_LIMITS_2024 = void 0;
exports.calculateCCESGAvailable = calculateCCESGAvailable;
exports.calculateCDBSAvailable = calculateCDBSAvailable;
exports.projectRDSPGrowth = projectRDSPGrowth;
exports.calculateLifetimeAccumulation = calculateLifetimeAccumulation;
exports.calculateMaxLDAP = calculateMaxLDAP;
exports.analyzeContributionStrategy = analyzeContributionStrategy;
/**
 * 2024 RDSP Limits and Rules
 */
exports.RDSP_LIMITS_2024 = {
    annualContributionLimit: 2500,
    lifetimeContributionLimit: 200000,
    ccesgAnnualLimit: 3500, // Canada Disability Savings Grant
    ccesgLifetimeLimit: 80000,
    cegsAnnualLimit: 1500, // Grants
    cegsLifetimeLimit: 90000,
    cdbsAnnualLimit: 1500, // Canada Disability Savings Bond
    cdbsLifetimeLimit: 90000,
    matchingRate: 3.5, // $3.50 CCESG for every $1 contributed (max)
};
/**
 * Calculate available CCESG (Canada Disability Savings Grant) for the year
 * Matches contributions up to $2,500 at a ratio up to 3.5:1
 * Maximum annual CCESG: $3,500
 */
function calculateCCESGAvailable(annualContribution, lifetimeGrantsReceived) {
    const ccsgLimit = exports.RDSP_LIMITS_2024.ccesgLifetimeLimit;
    const remainingLifetime = Math.max(0, ccsgLimit - lifetimeGrantsReceived);
    // Match up to $2,500 at 3.5:1 ratio = $8,750 max annual
    // But capped at $3,500/year
    const baseMatch = Math.min(annualContribution * 3.5, exports.RDSP_LIMITS_2024.ccesgAnnualLimit);
    // Reduce if lifetime limit would be exceeded
    const grantAmount = Math.min(baseMatch, remainingLifetime);
    const matchRatio = annualContribution > 0 ? grantAmount / annualContribution : 0;
    return {
        maxMatch: baseMatch,
        grantAmount: Math.round(grantAmount),
        matchRatio,
    };
}
/**
 * Calculate available CDBS (Canada Disability Savings Bond)
 * $1,500/year for low/modest income individuals
 * Lifetime limit: $90,000
 */
function calculateCDBSAvailable(familyNetIncome, lifetimeBondsReceived, yearsSinceLastBond = 0) {
    const cdbsLimit = exports.RDSP_LIMITS_2024.cdbsLifetimeLimit;
    const remainingLifetime = Math.max(0, cdbsLimit - lifetimeBondsReceived);
    // For 2024: CDBS available if family net income <= $70,000
    // Reduced CDBS if income $70,000-$90,000
    const thresholdLow = 70000;
    const thresholdHigh = 90000;
    let bondsPayable = 0;
    let reason = "Income exceeds CDBS eligibility threshold";
    if (familyNetIncome <= thresholdLow) {
        bondsPayable = Math.min(1500, remainingLifetime);
        reason = "Full $1,500 CDBS available";
    }
    else if (familyNetIncome <= thresholdHigh) {
        // Reduced based on income
        const reduction = ((familyNetIncome - thresholdLow) / (thresholdHigh - thresholdLow)) * 1500;
        bondsPayable = Math.min(Math.round(1500 - reduction), remainingLifetime);
        reason = "Reduced CDBS based on income";
    }
    // Can carry forward unused bonds for up to 6 years
    const carryForwardBonds = yearsSinceLastBond < 6 ? bondsPayable : 0;
    return {
        bondsPayable: Math.round(bondsPayable),
        carryForwardBonds: Math.round(carryForwardBonds),
        reason,
    };
}
/**
 * Project RDSP growth over time with grants and bonds
 */
function projectRDSPGrowth(initialBalance, annualContribution, annualGrants, annualBonds, annualReturnRate, years) {
    const projections = [];
    let balance = initialBalance;
    let cumulativeGrants = 0;
    let cumulativeBonds = 0;
    for (let year = 1; year <= years; year++) {
        // Annual returns on existing balance
        const investmentGrowth = balance * annualReturnRate;
        // Add contributions
        balance += annualContribution;
        // Add grants (capped at lifetime limit)
        let yearGrants = 0;
        if (cumulativeGrants < exports.RDSP_LIMITS_2024.ccesgLifetimeLimit) {
            yearGrants = Math.min(annualGrants, exports.RDSP_LIMITS_2024.ccesgLifetimeLimit - cumulativeGrants);
            cumulativeGrants += yearGrants;
            balance += yearGrants;
        }
        // Add bonds (capped at lifetime limit)
        let yearBonds = 0;
        if (cumulativeBonds < exports.RDSP_LIMITS_2024.cdbsLifetimeLimit) {
            yearBonds = Math.min(annualBonds, exports.RDSP_LIMITS_2024.cdbsLifetimeLimit - cumulativeBonds);
            cumulativeBonds += yearBonds;
            balance += yearBonds;
        }
        // Apply investment returns
        balance += investmentGrowth;
        projections.push({
            year,
            age: 0, // Will be set by caller if needed
            contributions: annualContribution,
            grants: yearGrants,
            bonds: yearBonds,
            investmentGrowth: Math.round(investmentGrowth),
            balance: Math.round(balance),
        });
    }
    return projections;
}
/**
 * Calculate lifetime RDSP accumulation estimate
 * Assumes consistent annual contributions and grant/bond receipts
 */
function calculateLifetimeAccumulation(currentAge, targetWithdrawalAge, currentBalance, annualContribution, maxAnnualGrants, maxAnnualBonds, averageReturnRate) {
    const yearsToWithdraw = Math.max(1, targetWithdrawalAge - currentAge);
    // Calculate using compound growth formula with annual additions
    let balance = currentBalance;
    let totalContributions = 0;
    let totalGrantsAndBonds = 0;
    let totalInvestmentGrowth = 0;
    for (let year = 0; year < yearsToWithdraw; year++) {
        // Investment returns
        const yearReturn = balance * averageReturnRate;
        totalInvestmentGrowth += yearReturn;
        balance += yearReturn;
        // Annual contribution
        balance += annualContribution;
        totalContributions += annualContribution;
        // Grants and bonds
        const yearSupport = maxAnnualGrants + maxAnnualBonds;
        balance += yearSupport;
        totalGrantsAndBonds += yearSupport;
    }
    return {
        projectedBalance: Math.round(balance),
        yearsToTarget: yearsToWithdraw,
        totalContributions: Math.round(totalContributions),
        totalGovernmentSupport: Math.round(totalGrantsAndBonds),
        investmentGrowth: Math.round(totalInvestmentGrowth),
    };
}
/**
 * Calculate RDSP withdrawal strategy for income
 * Lifetime Disability Assistance Payment (LDAP) = max withdrawal per year
 */
function calculateMaxLDAP(accountBalance, age, lifeExpectancy = 90) {
    const yearsRemaining = Math.max(1, lifeExpectancy - age);
    // 4% rule for sustainable withdrawals
    const maxAnnualWithdrawal = Math.round((accountBalance * 0.04) / yearsRemaining);
    return {
        maxAnnualWithdrawal: Math.max(0, maxAnnualWithdrawal),
        monthlyWithdrawal: Math.round(maxAnnualWithdrawal / 12),
        yearsOfPayments: yearsRemaining,
    };
}
/**
 * Analyze RDSP contribution strategy
 */
function analyzeContributionStrategy(targetBalance, yearsToTarget, currentBalance, expectedAnnualGrants, expectedAnnualBonds, averageReturnRate) {
    const governmentSupport = expectedAnnualGrants + expectedAnnualBonds;
    // Using future value formula: FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
    const ratePerYear = averageReturnRate;
    const futureValueOfCurrent = currentBalance * Math.pow(1 + ratePerYear, yearsToTarget);
    const futureValueOfGovSupport = governmentSupport *
        (Math.pow(1 + ratePerYear, yearsToTarget) - 1) / ratePerYear;
    const requiredFromContributions = targetBalance - futureValueOfCurrent - futureValueOfGovSupport;
    const requiredAnnualContribution = Math.max(0, requiredFromContributions /
        (Math.pow(1 + ratePerYear, yearsToTarget) - 1) / ratePerYear);
    const recommendations = [];
    if (requiredAnnualContribution <= 0) {
        recommendations.push("✅ Government grants and bonds alone may reach your goal!");
    }
    else if (requiredAnnualContribution <= 2500) {
        recommendations.push(`💡 Contribute $${Math.round(requiredAnnualContribution)}/year to reach target`);
    }
    else {
        recommendations.push(`⚠️ Would need $${Math.round(requiredAnnualContribution)}/year (max allowed: $2,500)`);
        recommendations.push("Consider extending timeline or adjusting goal");
    }
    return {
        requiredAnnualContribution: Math.round(requiredAnnualContribution),
        withGovernmentSupport: Math.round(governmentSupport),
        projectedBalance: Math.round(futureValueOfCurrent +
            futureValueOfGovSupport +
            (requiredAnnualContribution > 0
                ? (requiredAnnualContribution *
                    (Math.pow(1 + ratePerYear, yearsToTarget) - 1)) / ratePerYear
                : 0)),
        recommendation: recommendations.join("\n"),
    };
}
