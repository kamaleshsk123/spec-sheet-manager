"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messageTypeController_1 = require("../controllers/messageTypeController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
router.get('/specs/:specId/messagetypes', auth_1.authenticateToken, messageTypeController_1.MessageTypeController.getMessageTypes);
router.post('/specs/:specId/messagetypes', auth_1.authenticateToken, (0, validation_1.validate)(validation_1.createMessageTypeSchema), messageTypeController_1.MessageTypeController.createMessageType);
router.put('/messagetypes/:id', auth_1.authenticateToken, (0, validation_1.validate)(validation_1.updateMessageTypeSchema), messageTypeController_1.MessageTypeController.updateMessageType);
router.delete('/messagetypes/:id', auth_1.authenticateToken, messageTypeController_1.MessageTypeController.deleteMessageType);
exports.default = router;
//# sourceMappingURL=messagetypes.js.map