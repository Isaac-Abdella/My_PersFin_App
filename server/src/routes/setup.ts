/**
 * One-time setup route — seed demo users into production DB.
 * Protected by SETUP_SECRET env var.
 *
 * Usage (seed only new users):
 *   curl -X POST https://persfin-app.onrender.com/api/setup/seed-demo \
 *        -H "Content-Type: application/json" \
 *        -d '{"secret":"<SETUP_SECRET>"}'
 *
 * Usage (force clear then reseed all 10 — use after code changes to seed data):
 *   curl -X POST https://persfin-app.onrender.com/api/setup/seed-demo \
 *        -H "Content-Type: application/json" \
 *        -d '{"secret":"<SETUP_SECRET>","force":true}'
 */

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Account } from "../models/Account";
import { Transaction } from "../models/Transaction";
import { Budget } from "../models/Budget";
import { Bill } from "../models/Bill";
import { Goal } from "../models/Goal";
import { NetWorthSnapshot } from "../models/NetWorthSnapshot";
import { DemoSnapshot } from "../models/DemoSnapshot";

const router = Router();

const DEMO_EMAILS = Array.from({ length: 10 }, (_, i) => `user_test${i + 1}@demo.com`);

router.post("/seed-demo", async (req: Request, res: Response) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret || req.body.secret !== secret) {
    return res.status(403).json({ error: "Invalid or missing secret" });
  }

  const force: boolean = req.body.force === true;

  try {
    const { seedProfile, PROFILES } = await import("../scripts/seedDemoUsers");

    // Re-create the partial-filter index (idempotent)
    try {
      await Transaction.collection.dropIndex("userId_1_plaidTransactionId_1");
    } catch { /* index may not exist */ }
    await Transaction.collection.createIndex(
      { userId: 1, plaidTransactionId: 1 },
      { unique: true, partialFilterExpression: { plaidTransactionId: { $type: "string" } } }
    );

    // If force=true, wipe all 10 demo users and their data first
    if (force) {
      console.log("Force flag set — clearing existing demo users...");
      for (const email of DEMO_EMAILS) {
        const user = await User.findOne({ email });
        if (!user) continue;
        const uid = user._id as any;
        await Promise.all([
          Transaction.deleteMany({ userId: uid }),
          Account.deleteMany({ userId: uid }),
          Budget.deleteMany({ userId: uid }),
          Bill.deleteMany({ userId: uid }),
          Goal.deleteMany({ userId: uid }),
          NetWorthSnapshot.deleteMany({ userId: uid }),
          DemoSnapshot.deleteOne({ userId: uid }),
        ]);
        await User.deleteOne({ _id: uid });
        console.log(`  cleared ${email}`);
      }
    }

    const passwordHash = await bcrypt.hash("Demo1234!", 10);
    const results: string[] = [];

    for (const profile of PROFILES) {
      await seedProfile(profile, passwordHash);
      results.push(profile.email);
    }

    return res.json({
      ok: true,
      message: `${force ? "Force-reseeded" : "Seeded"} ${results.length} demo users (3 years of history)`,
      emails: results,
      password: "Demo1234!",
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
