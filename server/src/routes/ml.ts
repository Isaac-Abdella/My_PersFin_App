import { Router, Request, Response } from "express";
import { Transaction } from "../models/Transaction";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();
router.use(requireAuth);

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function proxyML(endpoint: string, body: object): Promise<any> {
  const res = await fetch(`${ML_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ML service error (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function buildMonthlySpending(userId: string, months: number) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const txns = await Transaction.find({ userId, type: "expense", date: { $gte: since } });

  const map = new Map<string, number>();
  for (const t of txns) {
    const month = t.date.toISOString().slice(0, 7);
    const cat = t.category || "Uncategorized";
    const key = `${month}|${cat}`;
    map.set(key, (map.get(key) ?? 0) + t.amount);
  }

  return Array.from(map.entries()).map(([k, amount]) => {
    const [month, category] = k.split("|");
    return { month, category, amount: Math.round(amount * 100) / 100 };
  });
}

router.post("/forecast", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const monthly = await buildMonthlySpending(userId, 12);
    const result = await proxyML("/forecast", {
      monthly_spending: monthly,
      forecast_months: Number(req.body.months) || 3,
    });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.post("/anomalies", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const txns = await Transaction.find({ userId, date: { $gte: since } });

    const transactions = txns.map(t => ({
      id: t._id.toString(),
      amount: Math.abs(t.amount),
      category: t.category || "Uncategorized",
      date: t.date.toISOString().slice(0, 10),
      description: t.description || "",
    }));

    const result = await proxyML("/anomalies", { transactions });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

router.post("/suggest-budgets", async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any).id;
    const monthly = await buildMonthlySpending(userId, 6);
    const result = await proxyML("/suggest-budgets", { monthly_spending: monthly });
    res.json(result);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

export default router;
