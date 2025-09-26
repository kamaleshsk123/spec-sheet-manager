"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', (0, validation_1.validate)(validation_1.createUserSchema), authController_1.AuthController.register);
router.post('/login', (0, validation_1.validate)(validation_1.loginSchema), authController_1.AuthController.login);
// GitHub OAuth
router.get('/github', authController_1.AuthController.githubAuth);
router.get('/github/callback', authController_1.AuthController.githubCallback);
// Protected routes
router.get('/profile', auth_1.authenticateToken, authController_1.AuthController.getProfile);
exports.default = router;
//# sourceMappingURL=auth.js.map