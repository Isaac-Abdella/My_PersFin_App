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
exports.RESP = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const beneficiarySchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    birthYear: { type: Number, required: true },
    sin: String,
});
const contributionSchema = new mongoose_1.Schema({
    year: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    beneficiaryName: { type: String, required: true },
    cesgReceived: { type: Number, required: true, default: 0, min: 0 },
    date: { type: Date, required: true },
    note: String,
}, { _id: true });
const respSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    planType: { type: String, enum: ["individual", "family"], required: true },
    institution: { type: String, required: true },
    accountName: { type: String, required: true },
    beneficiaries: [beneficiarySchema],
    currentBalance: { type: Number, required: true, default: 0, min: 0 },
    contributions: [contributionSchema],
    notes: String,
}, { timestamps: true });
exports.RESP = mongoose_1.default.model("RESP", respSchema);
