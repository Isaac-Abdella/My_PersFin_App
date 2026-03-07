import { Router, Request, Response } from "express";
import { Budget } from "../models/Budget";
import { Transaction } from "../models/Transaction";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all budgets for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const budgets = await Budget.find({ userId }).sort({ startDate: -1 });
    return res.json(budgets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get single budget
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const budget = await Budget.findOne({ _id: req.params.id, userId });
    
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }
    
    return res.json(budget);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get budget with spending
router.get("/:id/spending", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const budget = await Budget.findOne({ _id: req.params.id, userId });
    
    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    // Calculate spending for this budget's category and period
    const endDate = budget.endDate || new Date();
    const transactions = await Transaction.find({
      userId,
      category: budget.category,
      type: "expense",
      date: { $gte: budget.startDate, $lte: endDate }
    });

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const remaining = budget.amount - totalSpent;
    const percentUsed = (totalSpent / budget.amount) * 100;

    return res.json({
      budget,
      totalSpent,
      remaining,
      percentUsed: Math.round(percentUsed * 100) / 100
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Create new budget
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { category, amount, period, startDate, endDate } = req.body;

    if (!category || amount === undefined || !startDate) {
      return res.status(400).json({ message: "Category, amount, and start date are required" });
    }

    const budget = await Budget.create({
      userId,
      category,
      amount,
      period: period || "monthly",
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined
    });

    return res.status(201).json(budget);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update budget
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { category, amount, period, startDate, endDate } = req.body;

    const updateData: any = { category, amount, period };
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);

    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    return res.json(budget);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete budget
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId });

    if (!budget) {
      return res.status(404).json({ message: "Budget not found" });
    }

    return res.json({ message: "Budget deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
