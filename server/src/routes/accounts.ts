import { Router, Request, Response } from "express";
import { Account } from "../models/Account";
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

export default router;
