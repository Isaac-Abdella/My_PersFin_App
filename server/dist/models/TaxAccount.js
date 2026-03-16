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
exports.TaxAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const taxAccountSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    accountType: {
        type: String,
        enum: ["rrsp", "tfsa", "non-registered"],
        required: true
    },
    accountName: { type: String, required: true },
    linkedAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Account" },
    // RRSP fields
    rrspContributionLimit: { type: Number, default: 0 },
    rrspLifetimeRoom: { type: Number, default: 0 },
    rrspContributions: { type: Number, default: 0 },
    // TFSA fields
    tfsaAnnualLimit: { type: Number, default: 7000 },
    tfsaLifetimeRoom: { type: Number, default: 0 },
    tfsaContributions: { type: Number, default: 0 },
    // Income tracking
    priorYearIncome: { type: Number, default: 0 },
    maritalStatus: {
        type: String,
        enum: ["single", "married", "divorced", "widowed", "common-law"],
        default: "single"
    },
    // Investment tracking
    totalCost: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    unrealizedGains: { type: Number, default: 0 },
    realizedGains: { type: Number, default: 0 },
    currency: { type: String, default: "CAD" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
exports.TaxAccount = mongoose_1.default.model("TaxAccount", taxAccountSchema);
