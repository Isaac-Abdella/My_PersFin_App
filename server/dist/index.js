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
const transactions_1 = __importDefault(require("./routes/transactions"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const debts_1 = __importDefault(require("./routes/debts"));
const import_1 = __importDefault(require("./routes/import"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const categories_1 = __importDefault(require("./routes/categories"));
const tax_1 = __importDefault(require("./routes/tax"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
}));
// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
app.use(express_1.default.json({ limit: '50mb' }));
app.use((0, express_session_1.default)({
    secret: config_1.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new connect_mongo_1.default({ mongoUrl: config_1.MONGO_URI }),
    cookie: {
        secure: false, // set true + trust proxy in production with HTTPS
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use("/api/auth", auth_1.default);
app.use("/api/accounts", accounts_1.default);
app.use("/api/transactions", transactions_1.default);
app.use("/api/budgets", budgets_1.default);
app.use("/api/debts", debts_1.default);
app.use("/api/import", import_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/categories", categories_1.default);
app.use("/api/tax-accounts", tax_1.default);
// Error handler
app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({ message: err.message });
});
mongoose_1.default.connect(config_1.MONGO_URI).then(() => {
    console.log("Mongo connected");
    app.listen(config_1.PORT, () => console.log(`API on http://localhost:${config_1.PORT}`));
});
