"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduler = startScheduler;
const alertEngine_1 = require("./alertEngine");
const User_1 = require("../models/User");
const NetWorthSnapshot_1 = require("../models/NetWorthSnapshot");
const Account_1 = require("../models/Account");
const Budget_1 = require("../models/Budget");
const Transaction_1 = require("../models/Transaction");
const Notification_1 = __importDefault(require("../models/Notification"));
async function getAllUserIds() {
    const users = await User_1.User.find({}, "_id").lean();
    return users.map((u) => u._id);
}
async function takeMonthlyNetWorthSnapshot() {
    const userIds = await getAllUserIds();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    for (const userId of userIds) {
        const existing = await NetWorthSnapshot_1.NetWorthSnapshot.findOne({
            userId: userId.toString(),
            snapshotDate: { $gte: startOfMonth },
        });
        if (existing)
            continue;
        const accounts = await Account_1.Account.find({ userId }).lean();
        let totalAssets = 0;
        let totalLiabilities = 0;
        const liabilityTypes = ["credit-card", "mortgage", "line-of-credit", "student-loan", "auto-loan", "personal-loan"];
        for (const acct of accounts) {
            const balance = acct.balance ?? 0;
            const accountType = acct.type ?? "";
            if (liabilityTypes.includes(accountType)) {
                totalLiabilities += Math.abs(balance);
            }
            else {
                totalAssets += balance;
            }
        }
        await NetWorthSnapshot_1.NetWorthSnapshot.create({
            userId: userId.toString(),
            snapshotDate: now,
            totalAssets,
            totalLiabilities,
            netWorth: totalAssets - totalLiabilities,
        });
        await Notification_1.default.create({
            userId,
            category: "automation",
            title: "Monthly Net Worth Snapshot Taken",
            message: `Your net worth snapshot for ${now.toLocaleString("default", { month: "long", year: "numeric" })} has been recorded: $${(totalAssets - totalLiabilities).toLocaleString("en-CA", { minimumFractionDigits: 2 })}.`,
            severity: "info",
            relatedId: `snapshot-${now.getFullYear()}-${now.getMonth()}`,
        });
    }
}
async function rolloverMonthlyBudgets() {
    const userIds = await getAllUserIds();
    const now = new Date();
    for (const userId of userIds) {
        const budgets = await Budget_1.Budget.find({ userId, isActive: true, rolloverMode: { $ne: "none" } }).lean();
        for (const budget of budgets) {
            const b = budget;
            if (!b.rolloverMode || b.rolloverMode === "none")
                continue;
            const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            const result = await Transaction_1.Transaction.aggregate([
                {
                    $match: {
                        userId,
                        category: b.category,
                        date: { $gte: prevMonthStart, $lte: prevMonthEnd },
                        amount: { $lt: 0 },
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]);
            const spent = Math.abs(result[0]?.total ?? 0);
            const remaining = (b.amount ?? 0) - spent;
            if (remaining > 0 && (b.rolloverMode === "carry-unused" || b.rolloverMode === "carry-net")) {
                const alreadyNotified = await Notification_1.default.findOne({
                    userId,
                    category: "automation",
                    relatedId: `rollover-${budget._id}-${now.getFullYear()}-${now.getMonth()}`,
                });
                if (!alreadyNotified) {
                    await Notification_1.default.create({
                        userId,
                        category: "automation",
                        title: `Budget Rollover: ${b.category}`,
                        message: `$${remaining.toFixed(2)} unspent from your ${b.category} budget last month. This amount can be rolled over to this month's budget.`,
                        severity: "info",
                        relatedId: `rollover-${budget._id}-${now.getFullYear()}-${now.getMonth()}`,
                    });
                }
            }
        }
    }
}
async function runDailyAlerts() {
    const userIds = await getAllUserIds();
    await Promise.allSettled(userIds.map((id) => (0, alertEngine_1.runAlertEngine)(id)));
}
async function runFirstOfMonthJobs() {
    await Promise.allSettled([takeMonthlyNetWorthSnapshot(), rolloverMonthlyBudgets()]);
}
function startScheduler() {
    runDailyAlerts().catch(console.error);
    setInterval(() => runDailyAlerts().catch(console.error), 24 * 60 * 60 * 1000);
    const checkFirstOfMonth = () => {
        const now = new Date();
        if (now.getDate() === 1 && now.getHours() < 2) {
            runFirstOfMonthJobs().catch(console.error);
        }
    };
    setInterval(checkFirstOfMonth, 60 * 60 * 1000);
}
