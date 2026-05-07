"use strict";
/**
 * Demo management routes.
 * POST /api/demo/reset  — clears and re-seeds data for the current demo user.
 * POST /api/demo/clear  — wipes all data for the current demo user (leaves account blank).
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
const requireLogin_1 = require("../middleware/requireLogin");
const User_1 = require("../models/User");
const Account_1 = require("../models/Account");
const Transaction_1 = require("../models/Transaction");
const Budget_1 = require("../models/Budget");
const Bill_1 = require("../models/Bill");
const Goal_1 = require("../models/Goal");
const NetWorthSnapshot_1 = require("../models/NetWorthSnapshot");
const router = (0, express_1.Router)();
router.use(requireLogin_1.requireAuth);
const DEMO_DOMAIN = "@demo.com";
function isDemoUser(email) {
    return email.endsWith(DEMO_DOMAIN) && /^user_test\d+@demo\.com$/.test(email);
}
async function clearUserData(userId) {
    const userIdStr = userId.toString();
    await Promise.all([
        Transaction_1.Transaction.deleteMany({ userId: userIdStr }),
        Account_1.Account.deleteMany({ userId: userIdStr }),
        Budget_1.Budget.deleteMany({ userId: userIdStr }),
        Bill_1.Bill.deleteMany({ userId: userIdStr }),
        Goal_1.Goal.deleteMany({ userId: userIdStr }),
        NetWorthSnapshot_1.NetWorthSnapshot.deleteMany({ userId: userIdStr }),
    ]);
}
// POST /api/demo/clear — wipe everything (leave account blank for manual entry)
router.post("/clear", async (req, res) => {
    const email = req.user.email;
    if (!isDemoUser(email)) {
        return res.status(403).json({ message: "Only demo accounts can use this endpoint." });
    }
    const userId = req.user.id;
    await clearUserData(userId);
    return res.json({ message: "All data cleared. You can now add your own data or reset from a profile." });
});
// POST /api/demo/reset — clear and re-seed from original profile data
router.post("/reset", async (req, res) => {
    const email = req.user.email;
    if (!isDemoUser(email)) {
        return res.status(403).json({ message: "Only demo accounts can use this endpoint." });
    }
    const userId = req.user.id;
    try {
        await clearUserData(userId);
        // Dynamically import the seeder so we don't pull all that data in at startup
        const { seedProfile } = await Promise.resolve().then(() => __importStar(require("../scripts/seedDemoUsers")));
        const { PROFILES } = await Promise.resolve().then(() => __importStar(require("../scripts/seedDemoUsers")));
        // Find which profile index this user maps to
        const match = PROFILES.find((p) => p.email === email);
        if (!match)
            return res.status(404).json({ message: "Profile not found." });
        const passwordHash = await bcryptjs_1.default.hash("Demo1234!", 10);
        // Temporarily remove user so seedProfile can recreate their data,
        // then restore the existing user record.
        await seedProfile(match, passwordHash);
        // seedProfile creates a new user — merge their data onto existing user
        const seedUser = await User_1.User.findOne({ email, _id: { $ne: userId } });
        if (seedUser) {
            // Move all seeded documents from the new userId to the original
            const newUid = seedUser._id;
            const newUidStr = newUid.toString();
            const userIdStr = userId.toString();
            await Promise.all([
                Account_1.Account.updateMany({ userId: newUidStr }, { userId: userIdStr }),
                Transaction_1.Transaction.updateMany({ userId: newUidStr }, { userId: userIdStr }),
                Budget_1.Budget.updateMany({ userId: newUidStr }, { userId: userIdStr }),
                Bill_1.Bill.updateMany({ userId: newUidStr }, { userId: userIdStr }),
                Goal_1.Goal.updateMany({ userId: newUidStr }, { userId: userIdStr }),
                NetWorthSnapshot_1.NetWorthSnapshot.updateMany({ userId: newUidStr }, { userId: userIdStr }),
            ]);
            await User_1.User.deleteOne({ _id: newUid });
        }
        return res.json({ message: "Data reset successfully. Reload the app to see your fresh profile." });
    }
    catch (err) {
        console.error("Demo reset error:", err);
        return res.status(500).json({ message: err.message || "Reset failed." });
    }
});
exports.default = router;
