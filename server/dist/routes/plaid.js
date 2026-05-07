"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const plaid_1 = require("plaid");
const plaidClient_1 = require("../lib/plaidClient");
const BankConnection_1 = require("../models/BankConnection");
const Transaction_1 = require("../models/Transaction");
const Account_1 = require("../models/Account");
const router = (0, express_1.Router)();
function requireAuth(req, res, next) {
    if (!req.isAuthenticated())
        return res.status(401).json({ message: "Unauthorized" });
    next();
}
function uid(req) {
    return req.user._id;
}
// Map Plaid category to app category
function mapCategory(plaidCategories) {
    if (!plaidCategories || plaidCategories.length === 0)
        return "Other";
    const primary = plaidCategories[0]?.toLowerCase() ?? "";
    const detail = plaidCategories[1]?.toLowerCase() ?? "";
    if (primary.includes("food") || detail.includes("restaurant") || detail.includes("coffee"))
        return "Food & Dining";
    if (primary.includes("travel") || detail.includes("airlines") || detail.includes("hotels"))
        return "Travel";
    if (primary.includes("shops") || primary.includes("retail"))
        return "Shopping";
    if (primary.includes("recreation") || detail.includes("gym") || detail.includes("entertainment"))
        return "Entertainment";
    if (primary.includes("healthcare") || primary.includes("medical"))
        return "Health";
    if (primary.includes("transportation") || detail.includes("gas") || detail.includes("parking"))
        return "Transportation";
    if (primary.includes("transfer") || primary.includes("payment"))
        return "Transfer";
    if (primary.includes("service") || detail.includes("subscription"))
        return "Subscriptions";
    if (primary.includes("income") || detail.includes("payroll") || detail.includes("deposit"))
        return "Income";
    if (primary.includes("bank") || primary.includes("interest"))
        return "Banking";
    if (primary.includes("tax"))
        return "Taxes";
    if (primary.includes("utilities"))
        return "Utilities";
    if (primary.includes("rent") || detail.includes("mortgage"))
        return "Housing";
    return plaidCategories[plaidCategories.length - 1] ?? "Other";
}
// ── POST /api/plaid/create-link-token ─────────────────────────────────────────
// Step 1: Frontend calls this to get a link_token to initialize Plaid Link
router.post("/create-link-token", requireAuth, async (req, res) => {
    try {
        const userId = uid(req).toString();
        const response = await plaidClient_1.plaidClient.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: "PersFin — Personal Finance App",
            products: [plaid_1.Products.Transactions],
            country_codes: [plaid_1.CountryCode.Ca, plaid_1.CountryCode.Us],
            language: "en",
            // Plaid sandbox supports Canadian institution simulation
        });
        res.json({ link_token: response.data.link_token });
    }
    catch (err) {
        console.error("Plaid create-link-token error:", err?.response?.data ?? err.message);
        res.status(500).json({ message: "Failed to create Plaid link token", detail: err?.response?.data });
    }
});
// ── POST /api/plaid/exchange-token ────────────────────────────────────────────
// Step 2: Frontend sends public_token after user connects their bank
router.post("/exchange-token", requireAuth, async (req, res) => {
    const { publicToken, institutionId, institutionName } = req.body;
    if (!publicToken)
        return res.status(400).json({ message: "publicToken required" });
    try {
        // Exchange public token for permanent access token
        const exchangeRes = await plaidClient_1.plaidClient.itemPublicTokenExchange({ public_token: publicToken });
        const { access_token, item_id } = exchangeRes.data;
        // Check if this Item is already connected for this user
        const existing = await BankConnection_1.BankConnection.findOne({ plaidItemId: item_id, userId: uid(req) });
        if (existing) {
            return res.json({ message: "Bank already connected", connectionId: existing._id });
        }
        // Fetch accounts for this Item
        const accountsRes = await plaidClient_1.plaidClient.accountsGet({ access_token });
        const plaidAccounts = accountsRes.data.accounts.map((a) => ({
            plaidAccountId: a.account_id,
            name: a.name,
            officialName: a.official_name ?? undefined,
            type: a.type,
            subtype: a.subtype ?? "unknown",
            mask: a.mask ?? undefined,
            currentBalance: a.balances.current ?? undefined,
            availableBalance: a.balances.available ?? undefined,
        }));
        const conn = await BankConnection_1.BankConnection.create({
            userId: uid(req),
            institutionId: institutionId ?? item_id,
            institutionName: institutionName ?? "Connected Bank",
            plaidAccessToken: access_token,
            plaidItemId: item_id,
            accounts: plaidAccounts,
            status: "active",
        });
        // Do an initial transaction sync right away (last 30 days)
        await syncTransactionsForConnection(conn, 30);
        res.status(201).json({
            message: "Bank connected successfully",
            connectionId: conn._id,
            accounts: plaidAccounts.length,
            institution: institutionName,
        });
    }
    catch (err) {
        console.error("Plaid exchange-token error:", err?.response?.data ?? err.message);
        res.status(500).json({ message: "Failed to connect bank", detail: err?.response?.data });
    }
});
// ── GET /api/plaid/connections ────────────────────────────────────────────────
router.get("/connections", requireAuth, async (req, res) => {
    const connections = await BankConnection_1.BankConnection.find({ userId: uid(req) }).sort({ createdAt: -1 });
    // Never expose access tokens to frontend
    const safe = connections.map((c) => ({
        _id: c._id,
        institutionName: c.institutionName,
        institutionId: c.institutionId,
        accounts: c.accounts,
        status: c.status,
        errorCode: c.errorCode,
        lastSyncedAt: c.lastSyncedAt,
        transactionsSynced: c.transactionsSynced,
        createdAt: c.createdAt,
    }));
    res.json(safe);
});
// ── POST /api/plaid/sync/:connectionId ───────────────────────────────────────
// Sync transactions for a specific bank connection
router.post("/sync/:connectionId", requireAuth, async (req, res) => {
    const conn = await BankConnection_1.BankConnection.findOne({ _id: req.params.connectionId, userId: uid(req) });
    if (!conn)
        return res.status(404).json({ message: "Connection not found" });
    const daysBack = parseInt(req.body.daysBack) || 90;
    try {
        const count = await syncTransactionsForConnection(conn, daysBack);
        res.json({ ok: true, imported: count, lastSyncedAt: conn.lastSyncedAt });
    }
    catch (err) {
        console.error("Plaid sync error:", err?.response?.data ?? err.message);
        res.status(500).json({ message: "Sync failed", detail: err?.response?.data });
    }
});
// ── POST /api/plaid/sync-all ─────────────────────────────────────────────────
router.post("/sync-all", requireAuth, async (req, res) => {
    const connections = await BankConnection_1.BankConnection.find({ userId: uid(req), status: "active" });
    let totalImported = 0;
    const results = [];
    for (const conn of connections) {
        try {
            const count = await syncTransactionsForConnection(conn, 30);
            totalImported += count;
            results.push({ institution: conn.institutionName, imported: count });
        }
        catch (err) {
            results.push({ institution: conn.institutionName, error: err.message });
        }
    }
    res.json({ ok: true, totalImported, results });
});
// ── DELETE /api/plaid/connections/:connectionId ───────────────────────────────
router.delete("/connections/:connectionId", requireAuth, async (req, res) => {
    const conn = await BankConnection_1.BankConnection.findOne({ _id: req.params.connectionId, userId: uid(req) });
    if (!conn)
        return res.status(404).json({ message: "Connection not found" });
    try {
        // Remove the Item from Plaid (revokes access token)
        await plaidClient_1.plaidClient.itemRemove({ access_token: conn.plaidAccessToken });
    }
    catch {
        // Continue even if Plaid call fails (token may already be invalid)
    }
    await BankConnection_1.BankConnection.deleteOne({ _id: conn._id });
    res.json({ ok: true });
});
// ── GET /api/plaid/status ─────────────────────────────────────────────────────
// Let frontend know if Plaid is configured (credentials present)
router.get("/status", requireAuth, (_req, res) => {
    const { PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV } = process.env;
    const configured = !!(PLAID_CLIENT_ID && PLAID_SECRET &&
        PLAID_CLIENT_ID !== "your_plaid_client_id_here" &&
        PLAID_SECRET !== "your_plaid_sandbox_secret_here");
    res.json({ configured, env: PLAID_ENV ?? "sandbox" });
});
// ── Core sync logic ───────────────────────────────────────────────────────────
async function syncTransactionsForConnection(conn, daysBack) {
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
    // Use the Transactions Sync API (cursor-based, handles adds/updates/removes)
    let cursor = conn.plaidCursor ?? undefined;
    let hasMore = true;
    const added = [];
    const removed = [];
    while (hasMore) {
        const response = await plaidClient_1.plaidClient.transactionsSync({
            access_token: conn.plaidAccessToken,
            cursor,
            count: 500,
            options: { include_personal_finance_category: false },
        });
        const { data } = response;
        added.push(...data.added, ...data.modified);
        data.removed.forEach((r) => removed.push(r.transaction_id));
        hasMore = data.has_more;
        cursor = data.next_cursor;
    }
    // Save cursor for next incremental sync
    conn.plaidCursor = cursor;
    // Build account → app Account map (try to find matching accounts by name/type)
    const appAccounts = await Account_1.Account.find({ userId: conn.userId }).lean();
    const accountMap = new Map();
    for (const pa of conn.accounts) {
        // Try to match by name similarity or just use the first account of correct type
        const matched = appAccounts.find((a) => {
            const an = a.name.toLowerCase();
            const pn = pa.name.toLowerCase();
            return an.includes(pn) || pn.includes(an);
        }) ?? appAccounts[0];
        if (matched)
            accountMap.set(pa.plaidAccountId, matched._id);
    }
    // Import added/modified transactions (upsert by plaidTransactionId)
    let importCount = 0;
    for (const pt of added) {
        // Filter to the requested date range
        if (pt.date < startDate || pt.date > endDate)
            continue;
        if (pt.pending)
            continue; // Skip pending transactions
        const accountId = accountMap.get(pt.account_id) ??
            appAccounts[0]?._id;
        if (!accountId)
            continue;
        // Plaid: positive amount = money OUT (debit); negative = money IN (credit)
        // App: negative amount = expense; positive = income
        const amount = -(pt.amount);
        const type = amount < 0 ? "expense" : "income";
        const cat = mapCategory(pt.category ?? null);
        try {
            await Transaction_1.Transaction.findOneAndUpdate({ userId: conn.userId, plaidTransactionId: pt.transaction_id }, {
                $setOnInsert: {
                    userId: conn.userId,
                    accountId,
                    type,
                    amount,
                    category: cat,
                    description: pt.merchant_name ?? pt.name,
                    date: new Date(pt.date),
                    plaidTransactionId: pt.transaction_id,
                    plaidAccountId: pt.account_id,
                    source: "plaid",
                },
            }, { upsert: true, new: false });
            importCount++;
        }
        catch {
            // Duplicate key — already exists, skip
        }
    }
    // Remove transactions that Plaid flagged as removed
    if (removed.length > 0) {
        await Transaction_1.Transaction.deleteMany({
            userId: conn.userId,
            plaidTransactionId: { $in: removed },
        });
    }
    conn.lastSyncedAt = new Date();
    conn.transactionsSynced += importCount;
    conn.status = "active";
    await conn.save();
    return importCount;
}
exports.default = router;
