import express from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import mongoose from "mongoose";
import { MONGO_URI, PORT, SESSION_SECRET } from "./config";
import "./passport"; // configure local strategy, serialize/deserialize

import authRoutes from "./routes/auth";
import accountRoutes from "./routes/accounts";
import transactionRoutes from "./routes/transactions";
import budgetRoutes from "./routes/budgets";
import debtRoutes from "./routes/debts";
import importRoutes from "./routes/import";
import analyticsRoutes from "./routes/analytics";

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,       // set true + trust proxy in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/accounts", accountRoutes);
app.use("/transactions", transactionRoutes);
app.use("/budgets", budgetRoutes);
app.use("/debts", debtRoutes);
app.use("/import", importRoutes);
app.use("/analytics", analyticsRoutes);

mongoose.connect(MONGO_URI).then(() => {
  console.log("Mongo connected");
  app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
});
