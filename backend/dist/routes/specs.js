"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const specController_1 = require("../controllers/specController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
// Public routes (with optional auth for filtering)
router.get('/', auth_1.optionalAuth, specController_1.SpecController.getSpecs);
router.get('/:id', specController_1.SpecController.getSpec);
router.get('/:id/versions', specController_1.SpecController.getSpecVersions);
router.post('/:id/download', specController_1.SpecController.incrementDownloadCount);
// Protected routes
router.post('/', auth_1.authenticateToken, (0, validation_1.validate)(validation_1.createSpecSchema), specController_1.SpecController.createSpec);
router.put('/:id', auth_1.authenticateToken, (0, validation_1.validate)(validation_1.updateSpecSchema), specController_1.SpecController.updateSpec);
router.delete('/:id', auth_1.authenticateToken, specController_1.SpecController.deleteSpec);
router.get('/dashboard/stats', auth_1.authenticateToken, specController_1.SpecController.getDashboardStats);
exports.default = router;
//# sourceMappingURL=specs.js.map