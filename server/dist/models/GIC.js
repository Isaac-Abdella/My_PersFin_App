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
exports.GIC = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const gicSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    issuer: { type: String, required: true },
    accountType: {
        type: String,
        enum: ["TFSA", "RRSP", "FHSA", "RRIF", "non-registered", "RDSP"],
        required: true,
    },
    principal: { type: Number, required: true },
    interestRate: { type: Number, required: true },
    term: { type: Number, required: true },
    purchaseDate: { type: Date, required: true },
    maturityDate: { type: Date, required: true },
    maturityValue: { type: Number, required: true },
    isCompound: { type: Boolean, default: false },
    compoundFrequency: {
        type: String,
        enum: ["annually", "semi-annually", "quarterly", "monthly"],
        default: "annually",
    },
    isCashedOut: { type: Boolean, default: false },
    cashOutDate: Date,
    notes: String,
}, { timestamps: true });
exports.GIC = mongoose_1.default.model("GIC", gicSchema);
