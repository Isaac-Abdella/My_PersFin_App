import { Router } from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import { User } from "../models/User";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already used" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash });

    req.login(user, err => {
      if (err) return next(err);
      res.json({ user: { id: user.id, email: user.email } });
    });
  } catch (err) {
    next(err);
  }
});

router.post("/login",
  passport.authenticate("local"),
  (req, res) => {
    const user = req.user as any;
    res.json({ user: { id: user.id, email: user.email } });
  }
);

router.post("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  const user = req.user as any;
  res.json({ user: { id: user.id, email: user.email } });
});

export default router;
