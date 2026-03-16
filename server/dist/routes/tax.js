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
const TaxAccount_1 = require("../models/TaxAccount");
const Investment_1 = require("../models/Investment");
const requireLogin_1 = require("../middleware/requireLogin");
const taxPlanner = __importStar(require("../utils/taxPlanner"));
const router = (0, express_1.Router)();
// Require authentication for all routes
router.use(requireLogin_1.requireLogin);
/**
 * GET /tax-accounts
 * Get all tax accounts for the user
 */
router.get("/", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const taxAccounts = await TaxAccount_1.TaxAccount.find({ userId }).populate("linkedAccountId");
        res.json({ taxAccounts });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /tax-accounts
 * Create a new tax account (RRSP, TFSA, or Non-Registered)
 */
router.post("/", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { accountType, accountName, linkedAccountId, priorYearIncome, maritalStatus } = req.body;
        if (!accountType || !accountName) {
            return res.status(400).json({ message: "accountType and accountName required" });
        }
        // Initialize contribution room based on account type
        let rrspLifetimeRoom = 0;
        let tfsaLifetimeRoom = 0;
        if (accountType === "rrsp" && priorYearIncome) {
            rrspLifetimeRoom = Math.min(priorYearIncome * 0.18, taxPlanner.TAX_LIMITS.RRSP_ANNUAL_MAX);
        }
        if (accountType === "tfsa") {
            // Canadian gets $7,000 per year (simplified - should track actual limit by year)
            tfsaLifetimeRoom = taxPlanner.TAX_LIMITS.TFSA_ANNUAL_LIMIT;
        }
        const taxAccount = await TaxAccount_1.TaxAccount.create({
            userId,
            accountType,
            accountName,
            linkedAccountId,
            priorYearIncome,
            maritalStatus,
            rrspLifetimeRoom,
            tfsaLifetimeRoom,
            currency: "CAD",
        });
        res.status(201).json({ taxAccount });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/:id
 * Get detailed tax account with investments
 */
router.get("/:id", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId }).populate("linkedAccountId");
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const investments = await Investment_1.Investment.find({ taxAccountId: id });
        res.json({ taxAccount, investments });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/:id/rrsp-room
 * Calculate remaining RRSP contribution room
 */
router.get("/:id/rrsp-room", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const remainingRoom = taxPlanner.calculateRRSPRoom(taxAccount.priorYearIncome || 0, taxAccount.rrspContributions || 0, taxAccount.rrspLifetimeRoom || 0);
        res.json({
            rrspLifetimeRoom: taxAccount.rrspLifetimeRoom,
            rrspContributions: taxAccount.rrspContributions,
            remainingRoom,
            recommendation: remainingRoom > 0
                ? `You can contribute up to $${remainingRoom.toFixed(2)} to your RRSP this year`
                : "You have no remaining RRSP contribution room",
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/:id/tfsa-room
 * Calculate remaining TFSA contribution room
 */
router.get("/:id/tfsa-room", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const remainingRoom = taxPlanner.calculateTFSARoom(taxAccount.tfsaLifetimeRoom || 0, taxAccount.tfsaContributions || 0);
        res.json({
            tfsaLifetimeRoom: taxAccount.tfsaLifetimeRoom,
            tfsaContributions: taxAccount.tfsaContributions,
            remainingRoom,
            recommendation: remainingRoom > 0
                ? `You can contribute up to $${remainingRoom.toFixed(2)} to your TFSA this year`
                : "You have no remaining TFSA contribution room",
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/:id/tax-loss-harvesting
 * Identify tax-loss harvesting opportunities
 */
router.get("/:id/tax-loss-harvesting", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const investments = await Investment_1.Investment.find({ taxAccountId: id, soldDate: null });
        const opportunities = taxPlanner.identifyTaxLossHarvestingOpportunities(investments, taxAccount.accountType);
        const totalHarvestableLoss = opportunities.reduce((sum, inv) => sum + Math.abs(inv.unrealizedGain), 0);
        res.json({
            opportunities,
            totalHarvestableLoss,
            recommendation: opportunities.length > 0
                ? `Selling these positions would realize $${totalHarvestableLoss.toFixed(2)} in losses to offset gains`
                : "No tax-loss harvesting opportunities found",
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /tax-accounts/:id/rrsp-tax-savings
 * Calculate tax savings from RRSP contribution
 */
router.post("/:id/rrsp-tax-savings", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { contributionAmount, marginalTaxRate } = req.body;
        if (!contributionAmount) {
            return res.status(400).json({ message: "contributionAmount required" });
        }
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const taxSavings = taxPlanner.calculateRRSPTaxSavings(contributionAmount, marginalTaxRate || 30);
        res.json(taxSavings);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /tax-accounts/:id/capital-gains-tax
 * Calculate capital gains tax on unrealized gains
 */
router.post("/:id/capital-gains-tax", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const { unrealizedGain, marginalTaxRate } = req.body;
        if (unrealizedGain === undefined) {
            return res.status(400).json({ message: "unrealizedGain required" });
        }
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        // Only taxable in non-registered accounts
        if (taxAccount.accountType !== "non-registered") {
            return res.json({
                accountType: taxAccount.accountType,
                message: "No capital gains tax in TFSA or RRSP accounts",
                taxOwed: 0,
            });
        }
        const taxInfo = taxPlanner.calculateCapitalGainsTax(unrealizedGain, marginalTaxRate || 30);
        res.json(taxInfo);
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/:id/dividend-optimization
 * Get dividend account optimization recommendations
 */
router.get("/:id/dividend-optimization", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;
        const taxAccount = await TaxAccount_1.TaxAccount.findOne({ _id: id, userId });
        if (!taxAccount) {
            return res.status(404).json({ message: "Tax account not found" });
        }
        const optimization = taxPlanner.optimizeDividendAccounts(taxAccount.accountType);
        res.json(optimization);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /tax-accounts/spousal-rrsp-recommendation
 * Get spousal RRSP recommendation for income splitting
 */
router.post("/spousal-rrsp/recommendation", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { highEarnerIncome, lowEarnerIncome, highEarnerMarginalRate, lowEarnerMarginalRate } = req.body;
        if (!highEarnerIncome || !lowEarnerIncome) {
            return res
                .status(400)
                .json({ message: "highEarnerIncome and lowEarnerIncome required" });
        }
        const recommendation = taxPlanner.recommendSpousalRRSP(highEarnerIncome, lowEarnerIncome, highEarnerMarginalRate || 40, lowEarnerMarginalRate || 20);
        res.json(recommendation);
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /tax-accounts/:id/optimal-withdrawal-sequence
 * Calculate optimal withdrawal sequence to minimize taxes
 */
router.post("/:id/optimal-withdrawal-sequence", async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { neededAmount, nonRegisteredBalance, tfsaBalance, rrspBalance, marginalTaxRate } = req.body;
        if (!neededAmount) {
            return res.status(400).json({ message: "neededAmount required" });
        }
        const sequence = taxPlanner.calculateOptimalWithdrawalSequence(neededAmount, nonRegisteredBalance || 0, tfsaBalance || 0, rrspBalance || 0, marginalTaxRate || 30);
        res.json(sequence);
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /tax-accounts/marginal-tax-rate?income=50000&province=ON
 * Get estimated marginal tax rate
 */
router.get("/marginal-rate/calculator", async (req, res, next) => {
    try {
        const { income = 50000, province = "ON" } = req.query;
        const rate = taxPlanner.getMarginalTaxRate(Number(income), String(province));
        res.json({
            income: Number(income),
            province,
            marginalTaxRate: rate,
            federalRate: rate * 0.45, // Approximate
            provincialRate: rate * 0.55, // Approximate
        });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
