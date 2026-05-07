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
exports.RDSPAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const rdspAccountSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    beneficiaryName: { type: String, required: true },
    beneficiaryBirthDate: { type: Date, required: true },
    beneficiarySIN: { type: String, required: true },
    beneficiaryAge: { type: Number, default: 0 },
    designatedResponsible: String,
    contributions: [
        {
            year: Number,
            amount: Number,
            date: { type: Date, default: Date.now },
            type: {
                type: String,
                enum: ["grant", "bond", "personal"],
                default: "personal",
            },
        },
    ],
    withdrawals: [
        {
            year: Number,
            amount: Number,
            date: { type: Date, default: Date.now },
            type: { type: String, enum: ["regular", "lifelong"], default: "regular" },
        },
    ],
    grants: [
        {
            year: Number,
            amount: Number,
            date: { type: Date, default: Date.now },
            grantType: { type: String, enum: ["ccesg", "cesg"], default: "ccesg" },
        },
    ],
    bonds: [
        {
            year: Number,
            amount: Number,
            date: { type: Date, default: Date.now },
            bondType: { type: String, enum: ["cdbs", "cebs"], default: "cdbs" },
        },
    ],
    lifetimeContributionLimit: { type: Number, default: 200000 },
    annualContributionLimit: { type: Number, default: 2500 },
    currentYearContributions: { type: Number, default: 0 },
    grantRoom: { type: Number, default: 80000 }, // Cumulative grant limit
    bondRoom: { type: Number, default: 90000 }, // Cumulative bond limit
    investmentHoldings: [
        {
            symbol: String,
            quantity: Number,
            adjustedCostBase: Number,
            currentValue: Number,
        },
    ],
    projectedLifetimeAccumulation: { type: Number, default: 0 },
    repaymentObligation: {
        amount: Number,
        reason: String,
        dueDate: Date,
    },
}, { timestamps: true });
exports.RDSPAccount = mongoose_1.default.model("RDSPAccount", rdspAccountSchema);
