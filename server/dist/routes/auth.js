"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const passport_1 = __importDefault(require("passport"));
const User_1 = require("../models/User");
const router = (0, express_1.Router)();
router.post("/register", async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email and password required" });
        const existing = await User_1.User.findOne({ email });
        if (existing)
            return res.status(400).json({ message: "Email already used" });
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await User_1.User.create({ email, passwordHash });
        req.login(user, err => {
            if (err)
                return next(err);
            res.json({ user: { id: user.id, email: user.email } });
        });
    }
    catch (err) {
        next(err);
    }
});
router.post("/login", (req, res, next) => {
    passport_1.default.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Login error:", err);
            return next(err);
        }
        if (!user) {
            console.log("Login failed:", info);
            return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        req.login(user, (err) => {
            if (err) {
                console.error("Session creation error:", err);
                return next(err);
            }
            console.log("Login successful, user:", user);
            res.json({ user: { id: user.id || user._id, email: user.email } });
        });
    })(req, res, next);
});
router.post("/logout", (req, res, next) => {
    req.logout(err => {
        if (err)
            return next(err);
        res.json({ ok: true });
    });
});
router.get("/me", (req, res) => {
    console.log("GET /me - req.user:", req.user);
    if (!req.user) {
        console.log("No user, returning 401");
        return res.status(401).json({ user: null });
    }
    const user = req.user;
    console.log("User found:", user);
    res.json({ user: { id: user.id || user._id, email: user.email } });
});
exports.default = router;
