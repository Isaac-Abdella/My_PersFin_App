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

const DEMO_EMAIL = "user_test@demo.com";
const DEFAULT_PROFILE_INDEX = 4; // The Young Professional

// Legacy emails — cleared when force=true to clean up old multi-user seeding
const LEGACY_DEMO_EMAILS = Array.from({ length: 10 }, (_, i) => `user_test${i + 1}@demo.com`);

async function clearUser(email: string) {
  const user = await User.findOne({ email });
  if (!user) return;
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

router.post("/seed-demo", async (req: Request, res: Response) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret || req.body.secret !== secret) {
    return res.status(403).json({ error: "Invalid or missing secret" });
  }

  const force: boolean = req.body.force === true;

  try {
    const { seedDataForUser, PROFILES } = await import("../scripts/seedDemoUsers");

    // Re-create the partial-filter index (idempotent)
    try {
      await Transaction.collection.dropIndex("userId_1_plaidTransactionId_1");
    } catch { /* index may not exist */ }
    await Transaction.collection.createIndex(
      { userId: 1, plaidTransactionId: 1 },
      { unique: true, partialFilterExpression: { plaidTransactionId: { $type: "string" } } }
    );

    if (force) {
      console.log("Force flag — clearing demo account and any legacy accounts...");
      await clearUser(DEMO_EMAIL);
      for (const email of LEGACY_DEMO_EMAILS) await clearUser(email);
    }

    // Create the single demo user if not already present
    let user = await User.findOne({ email: DEMO_EMAIL });
    if (user) {
      return res.json({
        ok: true,
        message: `${DEMO_EMAIL} already exists. Pass force:true to wipe and recreate.`,
        email: DEMO_EMAIL,
        password: "Demo1234!",
      });
    }

    const passwordHash = await bcrypt.hash("Demo1234!", 10);
    user = await User.create({
      email: DEMO_EMAIL,
      passwordHash,
      firstName: "Demo",
      lastName: "User",
      province: "ON",
      demoProfileIndex: DEFAULT_PROFILE_INDEX,
    });
    await seedDataForUser((user as any)._id, (PROFILES as any[])[DEFAULT_PROFILE_INDEX - 1]);

    return res.json({
      ok: true,
      message: `Created ${DEMO_EMAIL} with "The Young Professional" profile (3 years of history)`,
      email: DEMO_EMAIL,
      password: "Demo1234!",
    });
  } catch (err: any) {
    console.error("Seed error:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
