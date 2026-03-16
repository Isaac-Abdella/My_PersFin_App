import express from "express";
import cors from "cors";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import mongoose from "mongoose";
import { MONGO_URI, PORT, SESSION_SECRET } from "./config";
import "./passport"; // configure local strategy, serialize/deserialize

import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import accountTypesRoutes from "./routes/accountTypes";
import transactionRoutes from "./routes/transactions";
import budgetRoutes from "./routes/budgets";
import debtRoutes from "./routes/debts";
import debtStrategyRoutes from "./routes/debtStrategies";
import investmentRecommendationsRoutes from "./routes/investmentRecommendations";
import financialPlansRoutes from "./routes/financialPlans";
import importRoutes from "./routes/import";
import analyticsRoutes from "./routes/analytics";
import categoriesRoutes from "./routes/categories";
import taxRoutes from "./routes/tax";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '50mb' }));

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({ mongoUrl: MONGO_URI }),
    cookie: {
      secure: false,       // set true + trust proxy in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/account-types", accountTypesRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/debts", debtRoutes);
app.use("/api/debt-strategies", debtStrategyRoutes);
app.use("/api/investment-recommendations", investmentRecommendationsRoutes);
app.use("/api/financial-plans", financialPlansRoutes);
app.use("/api/import", importRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/tax-accounts", taxRoutes);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({ message: err.message });
});

mongoose.connect(MONGO_URI).then(() => {
  console.log("Mongo connected");
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
});


