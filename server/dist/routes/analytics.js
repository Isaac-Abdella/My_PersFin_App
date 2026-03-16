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
const Transaction_1 = require("../models/Transaction");
const Budget_1 = require("../models/Budget");
const Account_1 = require("../models/Account");
const Debt_1 = require("../models/Debt");
const requireLogin_1 = require("../middleware/requireLogin");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(requireLogin_1.requireAuth);
// Get spending by category
router.get("/spending-by-category", async (req, res) => {
    try {
        const userId = req.user.id;
        const { startDate, endDate } = req.query;
        const filter = { userId, type: "expense" };
        if (startDate || endDate) {
            filter.date = {};
            if (startDate)
                filter.date.$gte = new Date(startDate);
            if (endDate)
                filter.date.$lte = new Date(endDate);
        }
        else {
            // Default to current month
            const now = new Date();
            filter.date = {
                $gte: new Date(now.getFullYear(), now.getMonth(), 1),
                $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
            };
        }
        const transactions = await Transaction_1.Transaction.find(filter);
        // Group by category
        const byCategory = {};
        transactions.forEach(t => {
            const cat = t.category || "Uncategorized";
            byCategory[cat] = (byCategory[cat] || 0) + t.amount;
        });
        // Convert to array and sort by amount
        const categories = Object.entries(byCategory)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);
        const totalSpending = categories.reduce((sum, c) => sum + c.amount, 0);
        return res.json({ categories, totalSpending });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// Get spending trends over time
router.get("/spending-trends", async (req, res) => {
    try {
        const userId = req.user.id;
        const { months = 6 } = req.query;
        const monthsCount = parseInt(months);
        const trends = [];
        for (let i = monthsCount - 1; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const [expenses, income] = await Promise.all([
                Transaction_1.Transaction.find({
                    userId,
                    type: "expense",
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                }),
                Transaction_1.Transaction.find({
                    userId,
                    type: "income",
                    date: { $gte: startOfMonth, $lte: endOfMonth }
                })
            ]);
            const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
            const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
            trends.push({
                month: startOfMonth.toISOString().substring(0, 7), // YYYY-MM format
                income: totalIncome,
                expenses: totalExpenses,
                netSavings: totalIncome - totalExpenses
            });
        }
        return res.json(trends);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// Get budget vs actual spending
router.get("/budget-comparison", async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        // Get current budgets
        const budgets = await Budget_1.Budget.find({
            userId,
            startDate: { $lte: now },
            $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: now } }
            ]
        });
        const comparison = [];
        for (const budget of budgets) {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const transactions = await Transaction_1.Transaction.find({
                userId,
                category: budget.category,
                type: "expense",
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
            const remaining = budget.amount - spent;
            const percentUsed = (spent / budget.amount) * 100;
            comparison.push({
                category: budget.category,
                budgeted: budget.amount,
                spent,
                remaining,
                percentUsed: Math.round(percentUsed),
                isOverBudget: spent > budget.amount
            });
        }
        // Sort by percent used (highest first)
        comparison.sort((a, b) => b.percentUsed - a.percentUsed);
        return res.json(comparison);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// Get financial overview/dashboard
router.get("/overview", async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const [accounts, debts, monthlyExpenses, monthlyIncome] = await Promise.all([
            Account_1.Account.find({ userId }),
            Debt_1.Debt.find({ userId }),
            Transaction_1.Transaction.find({
                userId,
                type: "expense",
                date: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            Transaction_1.Transaction.find({
                userId,
                type: "income",
                date: { $gte: startOfMonth, $lte: endOfMonth }
            })
        ]);
        const totalBalance = accounts.reduce((sum, a) => {
            // For credit cards, the balance is amount OWED (liability), not an asset
            if (a.type === "credit-card") {
                return sum; // Don't add credit card balance to assets
            }
            return sum + a.balance;
        }, 0);
        // Calculate total credit card debt (amount owed)
        const totalCreditCardDebt = accounts
            .filter(a => a.type === "credit-card")
            .reduce((sum, a) => sum + a.balance, 0);
        const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0) + totalCreditCardDebt;
        const netWorth = totalBalance - totalDebt;
        const totalMonthlyExpenses = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);
        const totalMonthlyIncome = monthlyIncome.reduce((sum, t) => sum + t.amount, 0);
        const monthlySavings = totalMonthlyIncome - totalMonthlyExpenses;
        const savingsRate = totalMonthlyIncome > 0
            ? ((monthlySavings / totalMonthlyIncome) * 100).toFixed(1)
            : "0";
        return res.json({
            totalBalance,
            totalDebt,
            netWorth,
            monthlyIncome: totalMonthlyIncome,
            monthlyExpenses: totalMonthlyExpenses,
            monthlySavings,
            savingsRate: parseFloat(savingsRate),
            accountsCount: accounts.length,
            debtsCount: debts.length
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// Get excess spending alerts
router.get("/excess-spending", async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        // Get budgets
        const budgets = await Budget_1.Budget.find({
            userId,
            startDate: { $lte: now },
            $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: now } }
            ]
        });
        const alerts = [];
        for (const budget of budgets) {
            const transactions = await Transaction_1.Transaction.find({
                userId,
                category: budget.category,
                type: "expense",
                date: { $gte: startOfMonth, $lte: endOfMonth }
            });
            const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
            if (spent > budget.amount) {
                alerts.push({
                    category: budget.category,
                    budgeted: budget.amount,
                    spent,
                    excess: spent - budget.amount,
                    percentOver: Math.round(((spent - budget.amount) / budget.amount) * 100),
                    severity: "high"
                });
            }
            else if (spent > budget.amount * 0.8) {
                // Warning if over 80% of budget
                alerts.push({
                    category: budget.category,
                    budgeted: budget.amount,
                    spent,
                    remaining: budget.amount - spent,
                    percentUsed: Math.round((spent / budget.amount) * 100),
                    severity: "low",
                    warning: "Approaching budget limit"
                });
            }
        }
        return res.json(alerts);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
// Get category suggestions based on transaction description
router.post("/categorize-suggestion", async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) {
            return res.status(400).json({ message: "Description is required" });
        }
        const { categorizeTransaction } = await Promise.resolve().then(() => __importStar(require("../utils/categorization")));
        const suggestedCategory = categorizeTransaction(description);
        return res.json({ suggestedCategory });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.default = router;
