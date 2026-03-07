import { Router, Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { Account } from "../models/Account";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all transactions for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { accountId, startDate, endDate } = req.query;

    const filter: any = { userId };
    if (accountId) filter.accountId = accountId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    return res.json(transactions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get single transaction
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const transaction = await Transaction.findOne({ _id: req.params.id, userId });
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    return res.json(transaction);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create new transaction
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { accountId, type, amount, category, description, date } = req.body;

    if (!accountId || !type || amount === undefined) {
      return res.status(400).json({ message: "Account ID, type, and amount are required" });
    }

    // Verify account belongs to user
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    const transaction = await Transaction.create({
      userId,
      accountId,
      type,
      amount,
      category,
      description,
      date: date ? new Date(date) : new Date()
    });

    // Update account balance
    if (type === "income") {
      account.balance += amount;
    } else if (type === "expense") {
      account.balance -= amount;
    }
    await account.save();

    return res.status(201).json(transaction);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update transaction
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { type, amount, category, description, date } = req.body;

    const oldTransaction = await Transaction.findOne({ _id: req.params.id, userId });
    if (!oldTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Revert old transaction from account balance
    const account = await Account.findById(oldTransaction.accountId);
    if (account) {
      if (oldTransaction.type === "income") {
        account.balance -= oldTransaction.amount;
      } else if (oldTransaction.type === "expense") {
        account.balance += oldTransaction.amount;
      }

      // Apply new transaction to account balance
      if (type === "income") {
        account.balance += amount;
      } else if (type === "expense") {
        account.balance -= amount;
      }
      await account.save();
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId },
      { type, amount, category, description, date },
      { new: true, runValidators: true }
    );

    return res.json(transaction);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete transaction
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const transaction = await Transaction.findOne({ _id: req.params.id, userId });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // Revert transaction from account balance
    const account = await Account.findById(transaction.accountId);
    if (account) {
      if (transaction.type === "income") {
        account.balance -= transaction.amount;
      } else if (transaction.type === "expense") {
        account.balance += transaction.amount;
      }
      await account.save();
    }

    await Transaction.findByIdAndDelete(req.params.id);

    return res.json({ message: "Transaction deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
