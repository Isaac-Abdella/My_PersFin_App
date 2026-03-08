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
    console.log("GET /transactions - userId:", userId, "req.user:", req.user);
    
    if (!userId) {
      console.error("No userId found in request");
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { accountId, startDate, endDate } = req.query;

    const filter: any = { userId };
    if (accountId) filter.accountId = accountId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    }

    console.log("Query filter:", filter);
    const transactions = await Transaction.find(filter).sort({ date: -1 });
    console.log("Found transactions count:", transactions.length);
    return res.json(transactions);
  } catch (err: any) {
    console.error("Error getting transactions:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error", error: err.message });
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
    const { accountId, type, amount, category, description, date } = req.body;

    const oldTransaction = await Transaction.findOne({ _id: req.params.id, userId });
    if (!oldTransaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    // If accountId is changing, verify new account belongs to user
    if (accountId && accountId !== oldTransaction.accountId.toString()) {
      const newAccount = await Account.findOne({ _id: accountId, userId });
      if (!newAccount) {
        return res.status(404).json({ message: "New account not found" });
      }
    }

    // Revert old transaction from old account balance
    const oldAccount = await Account.findById(oldTransaction.accountId);
    if (oldAccount) {
      if (oldTransaction.type === "income") {
        oldAccount.balance -= oldTransaction.amount;
      } else if (oldTransaction.type === "expense") {
        oldAccount.balance += oldTransaction.amount;
      }
      await oldAccount.save();
    }

    // Apply new transaction to new (or same) account
    const newAccountId = accountId || oldTransaction.accountId;
    const newAccount = await Account.findById(newAccountId);
    if (newAccount) {
      if (type === "income") {
        newAccount.balance += amount;
      } else if (type === "expense") {
        newAccount.balance -= amount;
      }
      await newAccount.save();
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId },
      { accountId: newAccountId, type, amount, category, description, date },
      { new: true, runValidators: true }
    );

    return res.json(transaction);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete single transaction (must be BEFORE / route for proper matching)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const transactionId = req.params.id;
    console.log("Delete single transaction - id:", transactionId, "userId:", userId);
    
    const transaction = await Transaction.findOne({ _id: transactionId, userId });

    if (!transaction) {
      console.log("Transaction not found");
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log("Found transaction:", transaction._id, "type:", transaction.type, "amount:", transaction.amount);

    // Revert transaction from account balance
    const account = await Account.findById(transaction.accountId);
    if (account) {
      console.log("Updating account:", account._id, "current balance:", account.balance);
      if (transaction.type === "income") {
        account.balance -= transaction.amount;
      } else if (transaction.type === "expense") {
        account.balance += transaction.amount;
      }
      console.log("New account balance:", account.balance);
      await account.save();
    }

    await Transaction.findByIdAndDelete(transactionId);
    console.log("Transaction deleted successfully");

    return res.json({ message: "Transaction deleted" });
  } catch (err: any) {
    console.error("Error deleting transaction:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete selected transactions for the user (must be AFTER /:id route)
router.delete("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { ids } = req.body;
    
    // If no IDs provided, delete all for user
    const transactionIds = ids && Array.isArray(ids) && ids.length > 0 ? ids : undefined;
    
    const query = { userId, ...(transactionIds && { _id: { $in: transactionIds } }) };
    console.log("Delete transactions - userId:", userId, "ids:", transactionIds ? transactionIds.length : "all");
    
    // Get transactions to revert balances
    const transactions = await Transaction.find(query);
    console.log("Found transactions count:", transactions.length);
    
    // Revert all transactions from account balances
    const accountBalanceUpdates: {[key: string]: number} = {};
    
    for (const transaction of transactions) {
      const accountId = transaction.accountId.toString();
      if (!accountBalanceUpdates[accountId]) {
        accountBalanceUpdates[accountId] = 0;
      }
      
      if (transaction.type === "income") {
        accountBalanceUpdates[accountId] -= transaction.amount;
      } else if (transaction.type === "expense") {
        accountBalanceUpdates[accountId] += transaction.amount;
      }
    }
    
    console.log("Account balance updates:", accountBalanceUpdates);
    
    // Update all affected accounts
    for (const accountId in accountBalanceUpdates) {
      const account = await Account.findById(accountId);
      if (account) {
        console.log("Updating account:", accountId, "balance change:", accountBalanceUpdates[accountId]);
        account.balance += accountBalanceUpdates[accountId];
        await account.save();
      }
    }
    
    // Delete transactions
    const deleteResult = await Transaction.deleteMany(query);
    console.log("Delete result:", deleteResult);
    
    return res.json({ message: `${deleteResult.deletedCount} transaction(s) deleted`, deletedCount: deleteResult.deletedCount });
  } catch (err: any) {
    console.error("Error deleting transactions:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete single transaction (must be after / route)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const transactionId = req.params.id;
    console.log("Delete single transaction - id:", transactionId, "userId:", userId);
    
    const transaction = await Transaction.findOne({ _id: transactionId, userId });

    if (!transaction) {
      console.log("Transaction not found");
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log("Found transaction:", transaction._id, "type:", transaction.type, "amount:", transaction.amount);

    // Revert transaction from account balance
    const account = await Account.findById(transaction.accountId);
    if (account) {
      console.log("Updating account:", account._id, "current balance:", account.balance);
      if (transaction.type === "income") {
        account.balance -= transaction.amount;
      } else if (transaction.type === "expense") {
        account.balance += transaction.amount;
      }
      console.log("New account balance:", account.balance);
      await account.save();
    }

    await Transaction.findByIdAndDelete(transactionId);
    console.log("Transaction deleted successfully");

    return res.json({ message: "Transaction deleted" });
  } catch (err: any) {
    console.error("Error deleting transaction:", err);
    console.error("Error stack:", err.stack);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
