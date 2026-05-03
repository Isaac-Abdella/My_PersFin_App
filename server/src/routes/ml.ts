import { Router, Request, Response as ExpressResponse } from "express";
import { Transaction } from "../models/Transaction";
import { requireAuth } from "../middleware/requireLogin";

const router = Router();
router.use(requireAuth);

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function proxyML(endpoint: string, body: object): Promise<any> {
  let raw: globalThis.Response;
  try {
    raw = await fetch(`${ML_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Network-level failure — uvicorn is not reachable
    const err = new Error("Cannot reach the Python ML service — make sure uvicorn is running on port 8000");
    (err as any).isNetworkError = true;
    throw err;
  }
  if (!raw.ok) {
    const text = await raw.text();
    throw new Error(`ML analysis error (${raw.status}): ${text.slice(0, 300)}`);
  }
  return raw.json();
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

router.post("/forecast", async (req: Request, res: ExpressResponse) => {
  try {
    const userId = (req.user as any).id;
    const monthly = await buildMonthlySpending(userId, 12);
    if (monthly.length === 0) {
      return res.json({ forecasts: {}, months_forecast: 0, message: "Not enough transaction history for a forecast yet." });
    }
    const result = await proxyML("/forecast", {
      monthly_spending: monthly,
      forecast_months: Number(req.body.months) || 3,
    });
    res.json(result);
  } catch (err: any) {
    const status = (err as any).isNetworkError ? 502 : 422;
    res.status(status).json({ message: err.message });
  }
});

router.post("/anomalies", async (req: Request, res: ExpressResponse) => {
  try {
    const userId = (req.user as any).id;
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const txns = await Transaction.find({ userId, date: { $gte: since } });

    if (txns.length === 0) {
      return res.json({ anomalies: [], totalScanned: 0, anomalyCount: 0, message: "No transactions in the past 3 months to scan." });
    }

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
    const status = (err as any).isNetworkError ? 502 : 422;
    res.status(status).json({ message: err.message });
  }
});

router.post("/suggest-budgets", async (req: Request, res: ExpressResponse) => {
  try {
    const userId = (req.user as any).id;
    const monthly = await buildMonthlySpending(userId, 6);
    if (monthly.length === 0) {
      return res.json({ suggestions: [], monthsAnalyzed: 0, message: "Not enough transaction history for budget suggestions yet." });
    }
    const result = await proxyML("/suggest-budgets", { monthly_spending: monthly });
    res.json(result);
  } catch (err: any) {
    const status = (err as any).isNetworkError ? 502 : 422;
    res.status(status).json({ message: err.message });
  }
});

export default router;
