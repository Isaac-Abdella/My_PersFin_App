"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Notification_1 = __importDefault(require("../models/Notification"));
const alertEngine_1 = require("../jobs/alertEngine");
const router = (0, express_1.Router)();
function requireAuth(req, res, next) {
    if (!req.isAuthenticated())
        return res.status(401).json({ message: "Unauthorized" });
    next();
}
function userId(req) {
    return req.user._id;
}
// GET /api/notifications — list non-dismissed notifications
router.get("/", requireAuth, async (req, res) => {
    const { category, unread } = req.query;
    const filter = { userId: userId(req), isDismissed: false };
    if (category)
        filter.category = category;
    if (unread === "true")
        filter.isRead = false;
    const notifications = await Notification_1.default.find(filter).sort({ createdAt: -1 }).limit(100);
    const unreadCount = await Notification_1.default.countDocuments({ userId: userId(req), isDismissed: false, isRead: false });
    res.json({ notifications, unreadCount });
});
// PUT /api/notifications/:id/read
router.put("/:id/read", requireAuth, async (req, res) => {
    await Notification_1.default.findOneAndUpdate({ _id: req.params.id, userId: userId(req) }, { isRead: true });
    res.json({ ok: true });
});
// PUT /api/notifications/read-all
router.put("/read-all", requireAuth, async (req, res) => {
    await Notification_1.default.updateMany({ userId: userId(req), isDismissed: false }, { isRead: true });
    res.json({ ok: true });
});
// DELETE /api/notifications/:id — dismiss
router.delete("/:id", requireAuth, async (req, res) => {
    await Notification_1.default.findOneAndUpdate({ _id: req.params.id, userId: userId(req) }, { isDismissed: true });
    res.json({ ok: true });
});
// DELETE /api/notifications — dismiss all
router.delete("/", requireAuth, async (req, res) => {
    await Notification_1.default.updateMany({ userId: userId(req) }, { isDismissed: true });
    res.json({ ok: true });
});
// POST /api/notifications/refresh — manually trigger alert engine
router.post("/refresh", requireAuth, async (req, res) => {
    await (0, alertEngine_1.runAlertEngine)(userId(req));
    const unreadCount = await Notification_1.default.countDocuments({
        userId: userId(req),
        isDismissed: false,
        isRead: false,
    });
    res.json({ ok: true, unreadCount });
});
exports.default = router;
