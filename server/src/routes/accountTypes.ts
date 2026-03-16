import express from "express";
import { requireAuth } from "../middleware/requireLogin";
import { RRSPAccount } from "../models/RRSPAccount";
import { TFSAAccount } from "../models/TFSAAccount";
import { FHSAAccount } from "../models/FHSAAccount";
import { RESPAccount } from "../models/RESPAccount";
import { RRIFAccount } from "../models/RRIFAccount";
import { LIFAccount } from "../models/LIFAccount";
import { LIRAAccount } from "../models/LIRAAccount";
import { NonRegisteredAccount } from "../models/NonRegisteredAccount";
import { CryptoAccount } from "../models/CryptoAccount";
import { CorporateAccount } from "../models/CorporateAccount";
import {
  calculateRRSPContributionRoom,
  calculateTFSAContributionRoom,
  calculateRRIFMinimumWithdrawal,
  getAccountTypeDescription,
  CONTRIBUTION_LIMITS_2024,
} from "../utils/accountRules";

const router = express.Router();
router.use(requireAuth);

// ============ RRSP Account Routes ============
router.post("/rrsp/create", async (req, res) => {
  try {
    const { accountName, isAccountOwner } = req.body;
    const userId = (req.user as any).id;
    const account = new RRSPAccount({
      accountName,
      isAccountOwner: isAccountOwner ?? true,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/rrsp", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await RRSPAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/rrsp/:id", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const account = await RRSPAccount.findById(req.params.id);
    if (!account || account.userId.toString() !== userId) {
      return res.status(404).json({ error: "Account not found" });
    }
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rrsp/:id/contribution", async (req, res) => {
  try {
    const { amount, year } = req.body;
    const userId = (req.user as any).id;
    const account = await RRSPAccount.findById(req.params.id);
    if (!account || account.userId.toString() !== userId) {
      return res.status(404).json({ error: "Account not found" });
    }
    
    const availableRoom = calculateRRSPContributionRoom(
      100000, // Default assumed income
      account.currentYearUsed,
      "ON" // Default province
    );
    
    if (amount > availableRoom) {
      return res.status(400).json({ error: "Exceeds available contribution room" });
    }

    account.contributions.push({ year: year || new Date().getFullYear(), amount, date: new Date() });
    account.balance += amount;
    account.currentYearUsed += amount;
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ TFSA Account Routes ============
router.post("/tfsa/create", async (req, res) => {
  try {
    const { accountName } = req.body;
    const userId = (req.user as any).id;
    const account = new TFSAAccount({
      userId,
      accountName,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/tfsa", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await TFSAAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ FHSA Account Routes ============
router.post("/fhsa/create", async (req, res) => {
  try {
    const { accountName } = req.body;
    const userId = (req.user as any).id;
    const account = new FHSAAccount({
      userId,
      accountName,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/fhsa", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await FHSAAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ RESP Account Routes ============
router.post("/resp/create", async (req, res) => {
  try {
    const { accountName, beneficiaryName, beneficiaryBirthDate, beneficiarySIN } = req.body;
    const userId = (req.user as any).id;
    const account = new RESPAccount({
      userId,
      accountName,
      beneficiaryName,
      beneficiaryBirthDate,
      beneficiarySIN,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/resp", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await RESPAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ RRIF Account Routes ============
router.post("/rrif/create", async (req, res) => {
  try {
    const { accountName, ownerAge } = req.body;
    if (ownerAge < 55) {
      return res.status(400).json({ error: "RRIF requires age 55 or older" });
    }
    const userId = (req.user as any).id;
    const account = new RRIFAccount({
      userId,
      accountName,
      ownerAge,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/rrif", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await RRIFAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/rrif/:id/minimum-withdrawal", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const account = await RRIFAccount.findById(req.params.id);
    if (!account || account.userId.toString() !== userId) {
      return res.status(404).json({ error: "Account not found" });
    }
    
    const minWithdrawal = calculateRRIFMinimumWithdrawal(account.ownerAge, account.balance);
    res.json({ minimumWithdrawal: minWithdrawal, percentage: account.minimumWithdrawalPercentage });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ LIF Account Routes ============
router.post("/lif/create", async (req, res) => {
  try {
    const { accountName, ownerAge, provinceOfIssuance } = req.body;
    const userId = (req.user as any).id;
    const account = new LIFAccount({
      userId,
      accountName,
      ownerAge,
      provinceOfIssuance,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/lif", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await LIFAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ LIRA Account Routes ============
router.post("/lira/create", async (req, res) => {
  try {
    const { accountName, provinceOfIssuance } = req.body;
    const userId = (req.user as any).id;
    const account = new LIRAAccount({
      userId,
      accountName,
      provinceOfIssuance,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/lira", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await LIRAAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ Non-Registered Account Routes ============
router.post("/non-registered/create", async (req, res) => {
  try {
    const { accountName } = req.body;
    const userId = (req.user as any).id;
    const account = new NonRegisteredAccount({
      userId,
      accountName,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/non-registered", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await NonRegisteredAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ Crypto Account Routes ============
router.post("/crypto/create", async (req, res) => {
  try {
    const { accountName, exchange } = req.body;
    const userId = (req.user as any).id;
    const account = new CryptoAccount({
      userId,
      accountName,
      exchange,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/crypto", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await CryptoAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ Corporate Account Routes ============
router.post("/corporate/create", async (req, res) => {
  try {
    const { accountName, businessName, businessType, fiscalYearEnd } = req.body;
    const userId = (req.user as any).id;
    const account = new CorporateAccount({
      userId,
      accountName,
      businessName,
      businessType,
      fiscalYearEnd,
    });
    await account.save();
    res.json(account);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/corporate", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const accounts = await CorporateAccount.find({ userId });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ Universal Account Routes ============
router.get("/all", async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const [rrsp, tfsa, fhsa, resp, rrif, lif, lira, nonReg, crypto, corporate] = 
      await Promise.all([
        RRSPAccount.find({ userId }),
        TFSAAccount.find({ userId }),
        FHSAAccount.find({ userId }),
        RESPAccount.find({ userId }),
        RRIFAccount.find({ userId }),
        LIFAccount.find({ userId }),
        LIRAAccount.find({ userId }),
        NonRegisteredAccount.find({ userId }),
        CryptoAccount.find({ userId }),
        CorporateAccount.find({ userId }),
      ]);

    const allAccounts: Array<Record<string, unknown>> = [
      ...rrsp.map(a => ({ ...a.toObject(), type: "RRSP", balance: a.balance })),
      ...tfsa.map(a => ({ ...a.toObject(), type: "TFSA", balance: a.balance })),
      ...fhsa.map(a => ({ ...a.toObject(), type: "FHSA", balance: a.balance })),
      ...resp.map(a => ({ ...a.toObject(), type: "RESP", balance: a.balance })),
      ...rrif.map(a => ({ ...a.toObject(), type: "RRIF", balance: a.balance })),
      ...lif.map(a => ({ ...a.toObject(), type: "LIF", balance: a.balance })),
      ...lira.map(a => ({ ...a.toObject(), type: "LIRA", balance: a.balance })),
      ...nonReg.map(a => ({ ...a.toObject(), type: "NON_REGISTERED", balance: a.balance })),
      ...crypto.map(a => ({ ...a.toObject(), type: "CRYPTO", balance: a.totalInvestedAmount })),
      ...corporate.map(a => ({ ...a.toObject(), type: "CORPORATE", balance: a.balance })),
    ];

    const summary = {
      totalAccounts: allAccounts.length,
      byType: {
        RRSP: rrsp.length,
        TFSA: tfsa.length,
        FHSA: fhsa.length,
        RESP: resp.length,
        RRIF: rrif.length,
        LIF: lif.length,
        LIRA: lira.length,
        NON_REGISTERED: nonReg.length,
        CRYPTO: crypto.length,
        CORPORATE: corporate.length,
      },
      totalBalance: allAccounts.reduce((sum, a) => sum + ((a.balance as number) || 0), 0),
      accounts: allAccounts,
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ============ Account Information Routes ============
router.get("/info/contribution-limits", (req, res) => {
  res.json(CONTRIBUTION_LIMITS_2024);
});

router.get("/info/account-types", (req, res) => {
  const types = [
    { type: "RRSP", description: getAccountTypeDescription("RRSP") },
    { type: "SPOUSAL_RRSP", description: getAccountTypeDescription("SPOUSAL_RRSP") },
    { type: "TFSA", description: getAccountTypeDescription("TFSA") },
    { type: "FHSA", description: getAccountTypeDescription("FHSA") },
    { type: "RESP", description: getAccountTypeDescription("RESP") },
    { type: "RRIF", description: getAccountTypeDescription("RRIF") },
    { type: "LIF", description: getAccountTypeDescription("LIF") },
    { type: "LIRA", description: getAccountTypeDescription("LIRA") },
    { type: "NON_REGISTERED", description: getAccountTypeDescription("NON_REGISTERED") },
    { type: "CRYPTO", description: getAccountTypeDescription("CRYPTO") },
    { type: "CORPORATE", description: getAccountTypeDescription("CORPORATE") },
  ];
  res.json(types);
});

export default router;
