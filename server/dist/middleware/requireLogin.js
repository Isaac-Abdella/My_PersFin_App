"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
exports.requireLogin = requireLogin;
function requireLogin(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
}
// Export as requireAuth as well for convenience
exports.requireAuth = requireLogin;
