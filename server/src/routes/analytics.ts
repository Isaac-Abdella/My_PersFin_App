import { Router, Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import { Account } from "../models/Account";
import { Debt } from "../models/Debt";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get spending by category
router.get("/spending-by-category", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { startDate, endDate } = req.query;

    const filter: any = { userId, type: "expense" };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate as string);
      if (endDate) filter.date.$lte = new Date(endDate as string);
    } else {
      // Default to current month
      const now = new Date();
      filter.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      };
    }

    const transactions = await Transaction.find(filter);

    // Group by category
    const byCategory: { [key: string]: number } = {};
    transactions.forEach(t => {
      const cat = t.category || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + t.amount;
    });

    // Convert to array and sort by amount
    const categories = Object.entries(byCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    const totalSpending = categories.reduce((sum, c) => sum + c.amount, 0);

    return res.json({ categories, totalSpending });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get spending trends over time
router.get("/spending-trends", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { months = 6 } = req.query;

    const monthsCount = parseInt(months as string);
    const trends = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [expenses, income] = await Promise.all([
        Transaction.find({
          userId,
          type: "expense",
          date: { $gte: startOfMonth, $lte: endOfMonth }
        }),
        Transaction.find({
          userId,
          type: "income",
          date: { $gte: startOfMonth, $lte: endOfMonth }
        })
      ]);

      const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
      const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);

      trends.push({
        month: startOfMonth.toISOString().substring(0, 7), // YYYY-MM format
        income: totalIncome,
        expenses: totalExpenses,
        netSavings: totalIncome - totalExpenses
      });
    }

    return res.json(trends);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get budget vs actual spending
router.get("/budget-comparison", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const now = new Date();

    // Get current budgets
    const budgets = await Budget.find({
      userId,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: now } }
      ]
    });

    const comparison = [];

    for (const budget of budgets) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const transactions = await Transaction.find({
        userId,
        category: budget.category,
        type: "expense",
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget.amount - spent;
      const percentUsed = (spent / budget.amount) * 100;

      comparison.push({
        category: budget.category,
        budgeted: budget.amount,
        spent,
        remaining,
        percentUsed: Math.round(percentUsed),
        isOverBudget: spent > budget.amount
      });
    }

    // Sort by percent used (highest first)
    comparison.sort((a, b) => b.percentUsed - a.percentUsed);

    return res.json(comparison);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get financial overview/dashboard
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [accounts, debts, monthlyExpenses, monthlyIncome] = await Promise.all([
      Account.find({ userId }),
      Debt.find({ userId }),
      Transaction.find({
        userId,
        type: "expense",
        date: { $gte: startOfMonth, $lte: endOfMonth }
      }),
      Transaction.find({
        userId,
        type: "income",
        date: { $gte: startOfMonth, $lte: endOfMonth }
      })
    ]);

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = debts.reduce((sum, d) => sum + d.currentBalance, 0);
    const netWorth = totalBalance - totalDebt;

    const totalMonthlyExpenses = monthlyExpenses.reduce((sum, t) => sum + t.amount, 0);
    const totalMonthlyIncome = monthlyIncome.reduce((sum, t) => sum + t.amount, 0);
    const monthlySavings = totalMonthlyIncome - totalMonthlyExpenses;
    const savingsRate = totalMonthlyIncome > 0 
      ? ((monthlySavings / totalMonthlyIncome) * 100).toFixed(1) 
      : "0";

    return res.json({
      totalBalance,
      totalDebt,
      netWorth,
      monthlyIncome: totalMonthlyIncome,
      monthlyExpenses: totalMonthlyExpenses,
      monthlySavings,
      savingsRate: parseFloat(savingsRate),
      accountsCount: accounts.length,
      debtsCount: debts.length
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get excess spending alerts
router.get("/excess-spending", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get budgets
    const budgets = await Budget.find({
      userId,
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: now } }
      ]
    });

    const alerts = [];

    for (const budget of budgets) {
      const transactions = await Transaction.find({
        userId,
        category: budget.category,
        type: "expense",
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const spent = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      if (spent > budget.amount) {
        alerts.push({
          category: budget.category,
          budgeted: budget.amount,
          spent,
          excess: spent - budget.amount,
          percentOver: Math.round(((spent - budget.amount) / budget.amount) * 100),
          severity: spent > budget.amount * 1.5 ? "high" : "medium"
        });
      } else if (spent > budget.amount * 0.8) {
        // Warning if over 80% of budget
        alerts.push({
          category: budget.category,
          budgeted: budget.amount,
          spent,
          remaining: budget.amount - spent,
          percentUsed: Math.round((spent / budget.amount) * 100),
          severity: "low",
          warning: "Approaching budget limit"
        });
      }
    }

    return res.json(alerts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get category suggestions based on transaction description
router.post("/categorize-suggestion", async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    
    if (!description) {
      return res.status(400).json({ message: "Description is required" });
    }

    const { categorizeTransaction } = await import("../utils/categorization");
    const suggestedCategory = categorizeTransaction(description);

    return res.json({ suggestedCategory });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
