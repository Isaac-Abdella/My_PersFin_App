import { Router, Request, Response } from "express";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all accounts for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await Account.find({ userId });
    return res.json(accounts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get single account
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const account = await Account.findOne({ _id: req.params.id, userId });
    
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }
    
    return res.json(account);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create new account
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { name, type, balance, currency } = req.body;

    if (!name || !type) {
      return res.status(400).json({ message: "Name and type are required" });
    }

    const account = await Account.create({
      userId,
      name,
      type,
      balance: balance || 0,
      currency: currency || "USD"
    });

    return res.status(201).json(account);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update account
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { name, type, balance, currency } = req.body;

    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, userId },
      { name, type, balance, currency },
      { new: true, runValidators: true }
    );

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.json(account);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete account
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const account = await Account.findOneAndDelete({ _id: req.params.id, userId });

    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    return res.json({ message: "Account deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Recalculate all credit card balances from transactions
router.post("/recalculate-credit-card-balances", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const creditCardAccounts = await Account.find({ userId, type: "credit-card" });

    const results = [];

    for (const account of creditCardAccounts) {
      // Get all transactions for this account
      const transactions = await Transaction.find({ userId, accountId: account._id });

      // Calculate balance as amount owed
      // Start from 0, debits (expenses) increase amount owed, credits (income/payments) decrease it
      let balance = 0;
      for (const tx of transactions) {
        if (tx.type === "expense") {
          balance += tx.amount;  // Purchases increase what you owe
        } else if (tx.type === "income") {
          balance -= tx.amount;  // Payments decrease what you owe
        }
      }

      // Ensure balance never goes negative
      balance = Math.max(0, balance);

      account.balance = balance;
      await account.save();

      results.push({
        accountId: account._id,
        accountName: account.name,
        transactionCount: transactions.length,
        newBalance: balance
      });

      console.log(`[RECALC] Credit card "${account.name}": ${transactions.length} transactions, new balance: $${balance}`);
    }

    return res.json({
      message: "Credit card balances recalculated",
      accountsUpdated: results.length,
      results
    });
  } catch (err) {
    console.error("Error recalculating credit card balances:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
