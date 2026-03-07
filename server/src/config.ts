import dotenv from "dotenv";

dotenv.config();

export const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/persfin";
export const PORT = parseInt(process.env.PORT || "3000", 10);
export const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret-in-production";
