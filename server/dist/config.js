"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_SECRET = exports.PORT = exports.MONGO_URI = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/persfin";
exports.PORT = parseInt(process.env.PORT || "3000", 10);
exports.SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-in-production";
