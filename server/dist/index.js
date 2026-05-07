"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const passport_1 = __importDefault(require("passport"));
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = require("./config");
require("./passport"); // configure local strategy, serialize/deserialize
const auth_1 = __importDefault(require("./routes/auth"));
const accounts_1 = __importDefault(require("./routes/accounts"));
const accountTypes_1 = __importDefault(require("./routes/accountTypes"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const debts_1 = __importDefault(require("./routes/debts"));
const debtStrategies_1 = __importDefault(require("./routes/debtStrategies"));
const investmentRecommendations_1 = __importDefault(require("./routes/investmentRecommendations"));
const financialPlans_1 = __importDefault(require("./routes/financialPlans"));
const import_1 = __importDefault(require("./routes/import"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const categories_1 = __importDefault(require("./routes/categories"));
const tax_1 = __importDefault(require("./routes/tax"));
const goals_1 = __importDefault(require("./routes/goals"));
const netWorth_1 = __importDefault(require("./routes/netWorth"));
const bills_1 = __importDefault(require("./routes/bills"));
const properties_1 = __importDefault(require("./routes/properties"));
const gic_1 = __importDefault(require("./routes/gic"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const insurance_1 = __importDefault(require("./routes/insurance"));
const income_1 = __importDefault(require("./routes/income"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const reports_1 = __importDefault(require("./routes/reports"));
const recurring_1 = __importDefault(require("./routes/recurring"));
const plaid_1 = __importDefault(require("./routes/plaid"));
const ml_1 = __importDefault(require("./routes/ml"));
const demo_1 = __importDefault(require("./routes/demo"));
const scheduler_1 = require("./jobs/scheduler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
}));
// Request logging middleware
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
app.use(express_1.default.json({ limit: '50mb' }));
const SESSION_TTL_SEC = 7 * 24 * 60 * 60; // 7 days, matches cookie maxAge
const store = new connect_mongo_1.default({
    mongoUrl: config_1.MONGO_URI,
    ttl: SESSION_TTL_SEC,
    touchAfter: 24 * 3600 // only update the TTL once per day unless data changes
});
store.on("error", (err) => {
    console.error("Session store error:", err);
});
app.use((0, express_session_1.default)({
    secret: config_1.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        secure: false, // set true + trust proxy in production with HTTPS
        httpOnly: true,
        sameSite: 'lax',
        maxAge: SESSION_TTL_SEC * 1000
    }
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/api/auth", auth_1.default);
app.use("/api/accounts", accounts_1.default);
app.use("/api/account-types", accountTypes_1.default);
app.use("/api/transactions", transactions_1.default);
app.use("/api/budgets", budgets_1.default);
app.use("/api/debts", debts_1.default);
app.use("/api/debt-strategies", debtStrategies_1.default);
app.use("/api/investment-recommendations", investmentRecommendations_1.default);
app.use("/api/financial-plans", financialPlans_1.default);
app.use("/api/import", import_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/categories", categories_1.default);
app.use("/api/tax-accounts", tax_1.default);
app.use("/api/goals", goals_1.default);
app.use("/api/net-worth", netWorth_1.default);
app.use("/api/bills", bills_1.default);
app.use("/api/properties", properties_1.default);
app.use("/api/gic", gic_1.default);
app.use("/api/portfolio", portfolio_1.default);
app.use("/api/insurance", insurance_1.default);
app.use("/api/income", income_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/reports", reports_1.default);
app.use("/api/recurring", recurring_1.default);
app.use("/api/plaid", plaid_1.default);
app.use("/api/ml", ml_1.default);
app.use("/api/demo", demo_1.default);
// Error handler
app.use((err, _req, res, _next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({ message: err.message });
});
mongoose_1.default.connect(config_1.MONGO_URI).then(() => {
    console.log("Mongo connected");
    app.listen(config_1.PORT, () => console.log(`API on http://localhost:${config_1.PORT}`));
    (0, scheduler_1.startScheduler)();
});
