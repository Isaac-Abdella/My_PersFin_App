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
exports.Investment = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const investmentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    taxAccountId: { type: mongoose_1.Schema.Types.ObjectId, ref: "TaxAccount", required: true },
    accountId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Account" },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    type: {
        type: String,
        enum: ["etf", "stock", "bond", "mutual-fund", "gic", "cash", "other"],
        default: "etf"
    },
    // Purchase info
    purchaseDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    // Current info
    currentPrice: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    unrealizedGain: { type: Number, default: 0 },
    unrealizedGainPercent: { type: Number, default: 0 },
    // Realized gains
    soldDate: Date,
    soldPrice: Number,
    realizedGain: { type: Number, default: 0 },
    taxable: { type: Boolean, default: false },
    // Dividend/interest
    dividendsReceived: { type: Number, default: 0 },
    interestReceived: { type: Number, default: 0 },
    // Tax optimization
    isEligibleForTaxLossHarvest: { type: Boolean, default: false },
    suggestedHarvestLoss: { type: Number, default: 0 },
    notes: String,
    currency: { type: String, default: "CAD" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
exports.Investment = mongoose_1.default.model("Investment", investmentSchema);
