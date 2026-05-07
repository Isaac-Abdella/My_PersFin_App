"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const FinancialPlan_1 = require("../models/FinancialPlan");
const requireLogin_1 = require("../middleware/requireLogin");
const financialPlanner = __importStar(require("../utils/financialPlanner"));
const router = (0, express_1.Router)();
// Require authentication for all routes
router.use(requireLogin_1.requireLogin);
/**
 * POST /financial-plans
 * Create a comprehensive financial plan
 */
router.post("/", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { name, currentAge, retirementAge = 65, expectedLifespan = 95, currentIncome, currentSavings, monthlyContribution, monthlyExpenses, desiredRetirementIncome, employerPensionMonthly = 0, } = req.body;
        if (currentAge == null ||
            currentIncome == null ||
            currentSavings == null ||
            monthlyContribution == null ||
            monthlyExpenses == null ||
            desiredRetirementIncome == null) {
            return res.status(400).json({ message: "Missing required parameters" });
        }
        // Generate financial plan
        const plan = financialPlanner.generateFinancialPlan(currentAge, retirementAge, currentIncome, currentSavings, monthlyContribution, desiredRetirementIncome, monthlyExpenses, employerPensionMonthly);
        // Save to database
        const financialPlan = await FinancialPlan_1.FinancialPlan.create({
            userId,
            name,
            currentAge,
            retirementAge,
            expectedLifespan,
            currentIncome,
            currentSavings,
            monthlyContribution,
            expectedReturnRate: 0.065,
            inflationRate: 0.025,
            retirementIncome: desiredRetirementIncome,
            emergencyFundMonths: 6,
            currentDebt: 0,
            projections: plan.trajectory,
            retirementProjection: plan.retirementProjection,
            emergencyFundTarget: plan.emergencyFund.targetAmount,
            emergencyFundStatus: plan.emergencyFund.status,
            recommendations: plan.recommendations,
        });
        res.status(201).json({
            financialPlan,
            analysis: {
                retirementProjection: plan.retirementProjection,
                emergencyFund: plan.emergencyFund,
                trajectory: plan.trajectory.slice(0, 10), // First 10 years
                recommendations: plan.recommendations,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /financial-plans
 * Get all financial plans for user
 */
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const plans = await FinancialPlan_1.FinancialPlan.find({ userId }).sort({ createdAt: -1 });
        res.json({ plans });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /financial-plans/:id
 * Get specific plan
 */
router.get("/:id", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const plan = await FinancialPlan_1.FinancialPlan.findOne({ _id: id, userId });
        if (!plan) {
            return res.status(404).json({ message: "Plan not found" });
        }
        res.json({ plan });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /financial-plans/retirement-analysis
 * Analyze retirement readiness
 */
router.post("/retirement-analysis", async (req, res, next) => {
    try {
        const { projectedNetWorth, desiredAnnualIncome, averageEarnings, cpStartAge = 65, oasStartAge = 65, } = req.body;
        if (projectedNetWorth == null || desiredAnnualIncome == null) {
            return res.status(400).json({ message: "Missing parameters" });
        }
        // Calculate retirement income sources
        const cpp = financialPlanner.calculateCPP(averageEarnings || 50000, 35, cpStartAge);
        const cppMonthly = cpStartAge === 60 ? cpp.monthlyAt60 :
            cpStartAge === 65 ? cpp.monthlyAt65 :
                cpp.monthlyAt70;
        const oasMonthly = financialPlanner.calculateOAS(averageEarnings || 50000, oasStartAge);
        // Analyze retirement readiness
        const analysis = financialPlanner.analyzeRetirementReadiness(projectedNetWorth, desiredAnnualIncome, cppMonthly, oasMonthly);
        res.json({
            retirementIncomeSources: {
                cpp: {
                    age60: cpp.monthlyAt60,
                    age65: cpp.monthlyAt65,
                    age70: cpp.monthlyAt70,
                    selected: cppMonthly,
                },
                oas: {
                    baseAmount: oasMonthly,
                    startAge: oasStartAge,
                },
                portfolio: {
                    withdrawalPercentage: 0.04,
                    annualWithdrawal: projectedNetWorth * 0.04,
                    monthlyWithdrawal: Math.round((projectedNetWorth * 0.04) / 12),
                },
            },
            analysis,
            recommendations: [
                `Your projected retirement income will be $${Math.round(analysis.annualRetirementIncome).toLocaleString()}/year.`,
                `This includes: CPP $${Math.round(cppMonthly * 12).toLocaleString()}/year + OAS $${Math.round(oasMonthly * 12).toLocaleString()}/year + Portfolio $${Math.round((analysis.PortfolioWithdrawalMonthly * 12)).toLocaleString()}/year.`,
                analysis.successProbability >= 75
                    ? `✅ Success probability: ${analysis.successProbability}%`
                    : `⚠️ Success probability: ${analysis.successProbability}%. Consider increasing savings.`,
            ],
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /financial-plans/emergency-fund
 * Analyze emergency fund
 */
router.post("/emergency-fund", async (req, res, next) => {
    try {
        const { monthlyExpenses, currentSavings, targetMonths = 6 } = req.body;
        if (monthlyExpenses == null || currentSavings == null) {
            return res.status(400).json({ message: "Missing parameters" });
        }
        const analysis = financialPlanner.analyzeEmergencyFund(monthlyExpenses, currentSavings, targetMonths);
        res.json({
            analysis,
            recommendations: [
                `Target emergency fund: $${Math.round(analysis.targetAmount).toLocaleString()} (${targetMonths} months of expenses).`,
                `Current amount: $${Math.round(analysis.currentAmount).toLocaleString()}.`,
                analysis.status === "underfunded"
                    ? `You need to save $${Math.round(analysis.monthlySavingsNeeded).toLocaleString()}/month to reach your goal in ${analysis.monthsToTarget} months.`
                    : analysis.status === "adequate"
                        ? `Good! You have ${analysis.monthsCovered} months of expenses saved. Consider building to 6 months.`
                        : `Excellent! You have ${analysis.monthsCovered} months of expenses saved.`,
            ],
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /financial-plans/net-worth
 * Calculate and track net worth
 */
router.post("/net-worth", async (req, res, next) => {
    try {
        const { assets, liabilities } = req.body;
        if (!assets || !liabilities) {
            return res.status(400).json({ message: "Missing assets or liabilities" });
        }
        const nw = financialPlanner.calculateNetWorth(assets, liabilities);
        res.json({
            netWorth: nw,
            analysis: {
                healthStatus: nw.debtToAssetRatio < 0.3
                    ? "Excellent"
                    : nw.debtToAssetRatio < 0.5
                        ? "Good"
                        : nw.debtToAssetRatio < 0.7
                            ? "Fair"
                            : "At Risk",
                debtToAssetRatio: Math.round(nw.debtToAssetRatio * 100),
                recommendation: nw.debtToAssetRatio < 0.3
                    ? "Strong financial health. Focus on growing assets."
                    : nw.debtToAssetRatio < 0.5
                        ? "Good position. Balance debt reduction with investments."
                        : "Consider accelerating debt repayment.",
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /financial-plans/income-projection
 * Project income growth over time
 */
router.post("/income-projection", async (req, res, next) => {
    try {
        const { currentIncome, yearsToProject = 30, annualIncomeGrowth = 0.02, currentAge = 35, } = req.body;
        if (!currentIncome) {
            return res.status(400).json({ message: "currentIncome required" });
        }
        const projections = [];
        let income = currentIncome;
        for (let year = 0; year <= yearsToProject; year++) {
            projections.push({
                year,
                age: currentAge + year,
                income: Math.round(income),
                cumulative: Math.round(income * (year + 1)),
            });
            income = income * (1 + annualIncomeGrowth);
        }
        res.json({
            projections,
            summary: {
                startingIncome: currentIncome,
                endingIncome: Math.round(income),
                totalLifetimeEarnings: Math.round(projections.reduce((sum, p) => sum + p.income, 0)),
                averageAnnualIncome: Math.round(projections.reduce((sum, p) => sum + p.income, 0) / projections.length),
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
