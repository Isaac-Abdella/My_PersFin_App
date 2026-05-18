"use strict";
/**
 * One-time setup route — seed demo users into production DB.
 * Protected by SETUP_SECRET env var.
 *
 * Usage (seed only new users):
 *   curl -X POST https://persfin-app.onrender.com/api/setup/seed-demo \
 *        -H "Content-Type: application/json" \
 *        -d '{"secret":"<SETUP_SECRET>"}'
 *
 * Usage (force clear then reseed all 10 — use after code changes to seed data):
 *   curl -X POST https://persfin-app.onrender.com/api/setup/seed-demo \
 *        -H "Content-Type: application/json" \
 *        -d '{"secret":"<SETUP_SECRET>","force":true}'
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const Account_1 = require("../models/Account");
const Transaction_1 = require("../models/Transaction");
const Budget_1 = require("../models/Budget");
const Bill_1 = require("../models/Bill");
const Goal_1 = require("../models/Goal");
const NetWorthSnapshot_1 = require("../models/NetWorthSnapshot");
const DemoSnapshot_1 = require("../models/DemoSnapshot");
const router = (0, express_1.Router)();
const DEMO_EMAIL = "user_test@demo.com";
const DEFAULT_PROFILE_INDEX = 4; // The Young Professional
// Legacy emails — cleared when force=true to clean up old multi-user seeding
const LEGACY_DEMO_EMAILS = Array.from({ length: 10 }, (_, i) => `user_test${i + 1}@demo.com`);
async function clearUser(email) {
    const user = await User_1.User.findOne({ email });
    if (!user)
        return;
    const uid = user._id;
    await Promise.all([
        Transaction_1.Transaction.deleteMany({ userId: uid }),
        Account_1.Account.deleteMany({ userId: uid }),
        Budget_1.Budget.deleteMany({ userId: uid }),
        Bill_1.Bill.deleteMany({ userId: uid }),
        Goal_1.Goal.deleteMany({ userId: uid }),
        NetWorthSnapshot_1.NetWorthSnapshot.deleteMany({ userId: uid }),
        DemoSnapshot_1.DemoSnapshot.deleteOne({ userId: uid }),
    ]);
    await User_1.User.deleteOne({ _id: uid });
    console.log(`  cleared ${email}`);
}
router.post("/seed-demo", async (req, res) => {
    const secret = process.env.SETUP_SECRET;
    if (!secret || req.body.secret !== secret) {
        return res.status(403).json({ error: "Invalid or missing secret" });
    }
    const force = req.body.force === true;
    try {
        const { seedDataForUser, PROFILES } = await Promise.resolve().then(() => __importStar(require("../scripts/seedDemoUsers")));
        // Re-create the partial-filter index (idempotent)
        try {
            await Transaction_1.Transaction.collection.dropIndex("userId_1_plaidTransactionId_1");
        }
        catch { /* index may not exist */ }
        await Transaction_1.Transaction.collection.createIndex({ userId: 1, plaidTransactionId: 1 }, { unique: true, partialFilterExpression: { plaidTransactionId: { $type: "string" } } });
        if (force) {
            console.log("Force flag — clearing demo account and any legacy accounts...");
            await clearUser(DEMO_EMAIL);
            for (const email of LEGACY_DEMO_EMAILS)
                await clearUser(email);
        }
        // Create the single demo user if not already present
        let user = await User_1.User.findOne({ email: DEMO_EMAIL });
        if (user) {
            return res.json({
                ok: true,
                message: `${DEMO_EMAIL} already exists. Pass force:true to wipe and recreate.`,
                email: DEMO_EMAIL,
                password: "Demo1234!",
            });
        }
        const passwordHash = await bcryptjs_1.default.hash("Demo1234!", 10);
        user = await User_1.User.create({
            email: DEMO_EMAIL,
            passwordHash,
            firstName: "Demo",
            lastName: "User",
            province: "ON",
            demoProfileIndex: DEFAULT_PROFILE_INDEX,
        });
        await seedDataForUser(user._id, PROFILES[DEFAULT_PROFILE_INDEX - 1]);
        return res.json({
            ok: true,
            message: `Created ${DEMO_EMAIL} with "The Young Professional" profile (3 years of history)`,
            email: DEMO_EMAIL,
            password: "Demo1234!",
        });
    }
    catch (err) {
        console.error("Seed error:", err);
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
