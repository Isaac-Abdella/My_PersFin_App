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
exports.CryptoAccount = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const cryptoAccountSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    accountName: { type: String, required: true },
    exchange: { type: String, required: true },
    currency: { type: String, default: "CAD" },
    totalInvestedAmount: { type: Number, default: 0 },
    holdings: [
        {
            symbol: String,
            quantity: Number,
            purchasePrice: Number,
            purchaseDate: Date,
            currentPrice: Number,
            adjustedCostBase: Number,
            unrealizedGain: Number,
        },
    ],
    transactions: [
        {
            date: Date,
            type: { type: String, enum: ["buy", "sell", "transfer-in", "transfer-out"] },
            symbol: String,
            quantity: Number,
            price: Number,
            amount: Number,
            fee: Number,
        },
    ],
    totalCapitalGains: { type: Number, default: 0 },
    totalCapitalLosses: { type: Number, default: 0 },
    unrealizedGainsTotal: { type: Number, default: 0 },
}, { timestamps: true });
exports.CryptoAccount = mongoose_1.default.model("CryptoAccount", cryptoAccountSchema);
