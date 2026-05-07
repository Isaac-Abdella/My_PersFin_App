"use strict";
/**
 * Removes all 10 demo users and every document tied to them.
 * Run: npm run clear:demo
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
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const User_1 = require("../models/User");
const Account_1 = require("../models/Account");
const Transaction_1 = require("../models/Transaction");
const Budget_1 = require("../models/Budget");
const Bill_1 = require("../models/Bill");
const Goal_1 = require("../models/Goal");
const NetWorthSnapshot_1 = require("../models/NetWorthSnapshot");
const DEMO_EMAILS = Array.from({ length: 10 }, (_, i) => `user_test${i + 1}@demo.com`);
async function main() {
    await mongoose_1.default.connect(process.env.MONGO_URI || "mongodb://localhost:27017/persfin");
    console.log("Connected\n");
    for (const email of DEMO_EMAILS) {
        const user = await User_1.User.findOne({ email });
        if (!user) {
            console.log(`  ⏭  ${email} not found`);
            continue;
        }
        const uid = user._id;
        const [txns, accts, budgets, bills, goals, snapshots] = await Promise.all([
            Transaction_1.Transaction.deleteMany({ userId: uid }),
            Account_1.Account.deleteMany({ userId: uid }),
            Budget_1.Budget.deleteMany({ userId: uid }),
            Bill_1.Bill.deleteMany({ userId: uid }),
            Goal_1.Goal.deleteMany({ userId: uid }),
            NetWorthSnapshot_1.NetWorthSnapshot.deleteMany({ userId: uid }),
        ]);
        await User_1.User.deleteOne({ _id: uid });
        console.log(`  ✓  ${email} removed — ${txns.deletedCount} txns, ${accts.deletedCount} accounts, ${budgets.deletedCount} budgets, ${bills.deletedCount} bills, ${goals.deletedCount} goals, ${snapshots.deletedCount} snapshots`);
    }
    console.log("\nAll demo data cleared.");
}
main().catch(console.error).finally(() => mongoose_1.default.disconnect());
