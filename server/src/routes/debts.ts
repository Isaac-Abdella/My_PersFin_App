import { Router, Request, Response } from "express";
import { Debt } from "../models/Debt";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all debts for the logged-in user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const debts = await Debt.find({ userId }).sort({ interestRate: -1 });
    return res.json(debts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get single debt
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const debt = await Debt.findOne({ _id: req.params.id, userId });
    
    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }
    
    return res.json(debt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Calculate debt payoff strategies
router.get("/payoff/strategies", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { monthlyPayment } = req.query;

    if (!monthlyPayment) {
      return res.status(400).json({ message: "Monthly payment amount is required" });
    }

    const payment = parseFloat(monthlyPayment as string);
    const debts = await Debt.find({ userId });

    if (debts.length === 0) {
      return res.json({ avalanche: [], snowball: [] });
    }

    // Avalanche Method: Pay highest interest rate first
    const avalanche = calculatePayoffStrategy(debts, payment, "avalanche");

    // Snowball Method: Pay lowest balance first
    const snowball = calculatePayoffStrategy(debts, payment, "snowball");

    return res.json({
      avalanche,
      snowball,
      totalDebts: debts.reduce((sum, d) => sum + d.currentBalance, 0),
      totalMinimumPayment: debts.reduce((sum, d) => sum + d.minimumPayment, 0)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Helper function to calculate payoff strategy
function calculatePayoffStrategy(
  debts: any[],
  monthlyPayment: number,
  method: "avalanche" | "snowball"
) {
  const debtsCopy = debts.map(d => ({
    id: d._id,
    name: d.name,
    balance: d.currentBalance,
    interestRate: d.interestRate,
    minimumPayment: d.minimumPayment
  }));

  // Sort based on strategy
  if (method === "avalanche") {
    // Highest interest rate first
    debtsCopy.sort((a, b) => b.interestRate - a.interestRate);
  } else {
    // Lowest balance first
    debtsCopy.sort((a, b) => a.balance - b.balance);
  }

  const totalMinimumPayment = debtsCopy.reduce((sum, d) => sum + d.minimumPayment, 0);
  if (monthlyPayment < totalMinimumPayment) {
    return {
      error: "Monthly payment is less than total minimum payments",
      minimumRequired: totalMinimumPayment
    };
  }

  const extraPayment = monthlyPayment - totalMinimumPayment;
  let month = 0;
  let totalInterestPaid = 0;
  const payoffSchedule = [];

  while (debtsCopy.some(d => d.balance > 0) && month < 600) { // Max 50 years
    month++;
    let extraRemaining = extraPayment;

    for (const debt of debtsCopy) {
      if (debt.balance <= 0) continue;

      // Calculate monthly interest
      const monthlyInterestRate = debt.interestRate / 100 / 12;
      const interestCharge = debt.balance * monthlyInterestRate;
      totalInterestPaid += interestCharge;

      // Add interest to balance
      debt.balance += interestCharge;

      // Make minimum payment
      let payment = Math.min(debt.minimumPayment, debt.balance);
      debt.balance -= payment;

      // If this is the focus debt, add extra payment
      if (debt.balance > 0 && extraRemaining > 0) {
        const extraForThisDebt = Math.min(extraRemaining, debt.balance);
        debt.balance -= extraForThisDebt;
        extraRemaining -= extraForThisDebt;
        payment += extraForThisDebt;
      }

      if (debt.balance <= 0) {
        payoffSchedule.push({
          debtId: debt.id,
          debtName: debt.name,
          payoffMonth: month
        });
      }
    }
  }

  return {
    method,
    totalMonths: month,
    totalYears: (month / 12).toFixed(1),
    totalInterestPaid: Math.round(totalInterestPaid),
    payoffSchedule,
    monthlyPayment
  };
}

// Create new debt
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { name, type, principal, currentBalance, interestRate, minimumPayment, dueDate, accountNumber, lender } = req.body;

    if (!name || !type || principal === undefined || currentBalance === undefined || 
        interestRate === undefined || minimumPayment === undefined) {
      return res.status(400).json({ 
        message: "Name, type, principal, current balance, interest rate, and minimum payment are required" 
      });
    }

    const debt = await Debt.create({
      userId,
      name,
      type,
      principal,
      currentBalance,
      interestRate,
      minimumPayment,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      accountNumber,
      lender
    });

    return res.status(201).json(debt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Update debt
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { name, type, principal, currentBalance, interestRate, minimumPayment, dueDate, accountNumber, lender } = req.body;

    const updateData: any = { 
      name, 
      type, 
      principal, 
      currentBalance, 
      interestRate, 
      minimumPayment,
      accountNumber,
      lender
    };
    
    if (dueDate) updateData.dueDate = new Date(dueDate);

    const debt = await Debt.findOneAndUpdate(
      { _id: req.params.id, userId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }

    return res.json(debt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Make a payment on a debt
router.post("/:id/payment", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid payment amount is required" });
    }

    const debt = await Debt.findOne({ _id: req.params.id, userId });
    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }

    debt.currentBalance = Math.max(0, debt.currentBalance - amount);
    await debt.save();

    return res.json(debt);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete debt
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const debt = await Debt.findOneAndDelete({ _id: req.params.id, userId });

    if (!debt) {
      return res.status(404).json({ message: "Debt not found" });
    }

    return res.json({ message: "Debt deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
