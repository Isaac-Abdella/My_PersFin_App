"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireLogin_1 = require("../middleware/requireLogin");
const RRSPAccount_1 = require("../models/RRSPAccount");
const TFSAAccount_1 = require("../models/TFSAAccount");
const FHSAAccount_1 = require("../models/FHSAAccount");
const RESPAccount_1 = require("../models/RESPAccount");
const RRIFAccount_1 = require("../models/RRIFAccount");
const LIFAccount_1 = require("../models/LIFAccount");
const LIRAAccount_1 = require("../models/LIRAAccount");
const RDSPAccount_1 = require("../models/RDSPAccount");
const NonRegisteredAccount_1 = require("../models/NonRegisteredAccount");
const CryptoAccount_1 = require("../models/CryptoAccount");
const CorporateAccount_1 = require("../models/CorporateAccount");
const accountRules_1 = require("../utils/accountRules");
const router = express_1.default.Router();
router.use(requireLogin_1.requireAuth);
// ============ RRSP Account Routes ============
router.post("/rrsp/create", async (req, res) => {
    try {
        const { accountName, isAccountOwner } = req.body;
        const userId = req.user.id;
        const account = new RRSPAccount_1.RRSPAccount({
            accountName,
            isAccountOwner: isAccountOwner ?? true,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/rrsp", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await RRSPAccount_1.RRSPAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/rrsp/:id", async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await RRSPAccount_1.RRSPAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/rrsp/:id/contribution", async (req, res) => {
    try {
        const { amount, year } = req.body;
        const userId = req.user.id;
        const account = await RRSPAccount_1.RRSPAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        const availableRoom = (0, accountRules_1.calculateRRSPContributionRoom)(100000, // Default assumed income
        account.currentYearUsed, "ON" // Default province
        );
        if (amount > availableRoom) {
            return res.status(400).json({ error: "Exceeds available contribution room" });
        }
        account.contributions.push({ year: year || new Date().getFullYear(), amount, date: new Date() });
        account.balance += amount;
        account.currentYearUsed += amount;
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ TFSA Account Routes ============
router.post("/tfsa/create", async (req, res) => {
    try {
        const { accountName } = req.body;
        const userId = req.user.id;
        const account = new TFSAAccount_1.TFSAAccount({
            userId,
            accountName,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/tfsa", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await TFSAAccount_1.TFSAAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ FHSA Account Routes ============
router.post("/fhsa/create", async (req, res) => {
    try {
        const { accountName } = req.body;
        const userId = req.user.id;
        const account = new FHSAAccount_1.FHSAAccount({
            userId,
            accountName,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/fhsa", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await FHSAAccount_1.FHSAAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ RESP Account Routes ============
router.post("/resp/create", async (req, res) => {
    try {
        const { accountName, beneficiaryName, beneficiaryBirthDate, beneficiarySIN } = req.body;
        const userId = req.user.id;
        const account = new RESPAccount_1.RESPAccount({
            userId,
            accountName,
            beneficiaryName,
            beneficiaryBirthDate,
            beneficiarySIN,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/resp", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await RESPAccount_1.RESPAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ RRIF Account Routes ============
router.post("/rrif/create", async (req, res) => {
    try {
        const { accountName, ownerAge } = req.body;
        if (ownerAge < 55) {
            return res.status(400).json({ error: "RRIF requires age 55 or older" });
        }
        const userId = req.user.id;
        const account = new RRIFAccount_1.RRIFAccount({
            userId,
            accountName,
            ownerAge,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/rrif", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await RRIFAccount_1.RRIFAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/rrif/:id/minimum-withdrawal", async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await RRIFAccount_1.RRIFAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        const minWithdrawal = (0, accountRules_1.calculateRRIFMinimumWithdrawal)(account.ownerAge, account.balance);
        res.json({ minimumWithdrawal: minWithdrawal, percentage: account.minimumWithdrawalPercentage });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ LIF Account Routes ============
router.post("/lif/create", async (req, res) => {
    try {
        const { accountName, ownerAge, provinceOfIssuance } = req.body;
        const userId = req.user.id;
        const account = new LIFAccount_1.LIFAccount({
            userId,
            accountName,
            ownerAge,
            provinceOfIssuance,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/lif", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await LIFAccount_1.LIFAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ LIRA Account Routes ============
router.post("/lira/create", async (req, res) => {
    try {
        const { accountName, provinceOfIssuance } = req.body;
        const userId = req.user.id;
        const account = new LIRAAccount_1.LIRAAccount({
            userId,
            accountName,
            provinceOfIssuance,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/lira", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await LIRAAccount_1.LIRAAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ RDSP Account Routes ============
router.post("/rdsp/create", async (req, res) => {
    try {
        const { accountName, beneficiaryName, beneficiaryBirthDate, beneficiarySIN, designatedResponsible, } = req.body;
        const userId = req.user.id;
        // Calculate beneficiary age
        const birthDate = new Date(beneficiaryBirthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        const account = new RDSPAccount_1.RDSPAccount({
            userId,
            accountName,
            beneficiaryName,
            beneficiaryBirthDate: new Date(beneficiaryBirthDate),
            beneficiarySIN,
            beneficiaryAge: age,
            designatedResponsible,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/rdsp", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await RDSPAccount_1.RDSPAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/rdsp/:id", async (req, res) => {
    try {
        const userId = req.user.id;
        const account = await RDSPAccount_1.RDSPAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/rdsp/:id/contribution", async (req, res) => {
    try {
        const { amount, type } = req.body;
        const userId = req.user.id;
        const account = await RDSPAccount_1.RDSPAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        // 2024 RDSP annual contribution limit: $2,500
        if (account.currentYearContributions + amount > 2500) {
            return res.status(400).json({
                error: "Exceeds annual contribution limit of $2,500",
                currentYear: account.currentYearContributions,
                remaining: 2500 - account.currentYearContributions,
            });
        }
        // Lifetime contribution limit: $200,000
        if (account.balance + amount > 200000) {
            return res.status(400).json({
                error: "Exceeds lifetime contribution limit of $200,000",
                current: account.balance,
                limit: 200000,
            });
        }
        account.contributions.push({
            year: new Date().getFullYear(),
            amount,
            date: new Date(),
            type: type || "personal",
        });
        account.currentYearContributions += amount;
        account.balance += amount;
        await account.save();
        res.json({
            message: "Contribution added successfully",
            account,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.post("/rdsp/:id/grant", async (req, res) => {
    try {
        const { amount, grantType } = req.body;
        const userId = req.user.id;
        const account = await RDSPAccount_1.RDSPAccount.findById(req.params.id);
        if (!account || account.userId.toString() !== userId) {
            return res.status(404).json({ error: "Account not found" });
        }
        // CCESG: up to $3,500/year (lifetime limit: $80,000)
        // CEBS: up to $1,500/year (lifetime limit: $90,000)
        const grantLimits = {
            ccesg: { annual: 3500, lifetime: 80000 },
            cebs: { annual: 1500, lifetime: 90000 },
        };
        const limits = grantLimits[grantType];
        if (!limits) {
            return res.status(400).json({ error: "Invalid grant type" });
        }
        if (amount > limits.annual) {
            return res.status(400).json({
                error: `Exceeds annual ${grantType.toUpperCase()} limit of $${limits.annual}`,
            });
        }
        const grantTracker = grantType === "ccesg" ? account.grantRoom : account.bondRoom;
        if (grantTracker - amount < 0) {
            return res.status(400).json({
                error: `Exceeds lifetime ${grantType.toUpperCase()} limit of $${limits.lifetime}`,
                remaining: grantTracker,
            });
        }
        account.grants.push({
            year: new Date().getFullYear(),
            amount,
            date: new Date(),
            grantType: grantType,
        });
        if (grantType === "ccesg") {
            account.grantRoom -= amount;
        }
        account.balance += amount;
        await account.save();
        res.json({
            message: `${grantType.toUpperCase()} grant added successfully`,
            account,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ Non-Registered Account Routes ============
router.post("/non-registered/create", async (req, res) => {
    try {
        const { accountName } = req.body;
        const userId = req.user.id;
        const account = new NonRegisteredAccount_1.NonRegisteredAccount({
            userId,
            accountName,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/non-registered", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await NonRegisteredAccount_1.NonRegisteredAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ Crypto Account Routes ============
router.post("/crypto/create", async (req, res) => {
    try {
        const { accountName, exchange } = req.body;
        const userId = req.user.id;
        const account = new CryptoAccount_1.CryptoAccount({
            userId,
            accountName,
            exchange,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/crypto", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await CryptoAccount_1.CryptoAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ Corporate Account Routes ============
router.post("/corporate/create", async (req, res) => {
    try {
        const { accountName, businessName, businessType, fiscalYearEnd } = req.body;
        const userId = req.user.id;
        const account = new CorporateAccount_1.CorporateAccount({
            userId,
            accountName,
            businessName,
            businessType,
            fiscalYearEnd,
        });
        await account.save();
        res.json(account);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get("/corporate", async (req, res) => {
    try {
        const userId = req.user.id;
        const accounts = await CorporateAccount_1.CorporateAccount.find({ userId });
        res.json(accounts);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ Universal Account Routes ============
router.get("/all", async (req, res) => {
    try {
        const userId = req.user.id;
        const [rrsp, tfsa, fhsa, resp, rrif, lif, lira, nonReg, crypto, corporate] = await Promise.all([
            RRSPAccount_1.RRSPAccount.find({ userId }),
            TFSAAccount_1.TFSAAccount.find({ userId }),
            FHSAAccount_1.FHSAAccount.find({ userId }),
            RESPAccount_1.RESPAccount.find({ userId }),
            RRIFAccount_1.RRIFAccount.find({ userId }),
            LIFAccount_1.LIFAccount.find({ userId }),
            LIRAAccount_1.LIRAAccount.find({ userId }),
            NonRegisteredAccount_1.NonRegisteredAccount.find({ userId }),
            CryptoAccount_1.CryptoAccount.find({ userId }),
            CorporateAccount_1.CorporateAccount.find({ userId }),
        ]);
        const allAccounts = [
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
            totalBalance: allAccounts.reduce((sum, a) => sum + (a.balance || 0), 0),
            accounts: allAccounts,
        };
        res.json(summary);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ Account Information Routes ============
router.get("/info/contribution-limits", (req, res) => {
    res.json(accountRules_1.CONTRIBUTION_LIMITS_2024);
});
router.get("/info/account-types", (req, res) => {
    const types = [
        { type: "RRSP", description: (0, accountRules_1.getAccountTypeDescription)("RRSP") },
        { type: "SPOUSAL_RRSP", description: (0, accountRules_1.getAccountTypeDescription)("SPOUSAL_RRSP") },
        { type: "TFSA", description: (0, accountRules_1.getAccountTypeDescription)("TFSA") },
        { type: "FHSA", description: (0, accountRules_1.getAccountTypeDescription)("FHSA") },
        { type: "RESP", description: (0, accountRules_1.getAccountTypeDescription)("RESP") },
        { type: "RRIF", description: (0, accountRules_1.getAccountTypeDescription)("RRIF") },
        { type: "LIF", description: (0, accountRules_1.getAccountTypeDescription)("LIF") },
        { type: "LIRA", description: (0, accountRules_1.getAccountTypeDescription)("LIRA") },
        { type: "RDSP", description: (0, accountRules_1.getAccountTypeDescription)("RDSP") },
        { type: "NON_REGISTERED", description: (0, accountRules_1.getAccountTypeDescription)("NON_REGISTERED") },
        { type: "CRYPTO", description: (0, accountRules_1.getAccountTypeDescription)("CRYPTO") },
        { type: "CORPORATE", description: (0, accountRules_1.getAccountTypeDescription)("CORPORATE") },
    ];
    res.json(types);
});
exports.default = router;
