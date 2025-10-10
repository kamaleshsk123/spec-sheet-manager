"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messageEnvelopeController_1 = require("../controllers/messageEnvelopeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticateToken, (req, res) => messageEnvelopeController_1.MessageEnvelopeController.getMessageEnvelopes(req, res));
router.post('/', auth_1.authenticateToken, (req, res) => messageEnvelopeController_1.MessageEnvelopeController.createMessageEnvelope(req, res));
router.put('/:id', auth_1.authenticateToken, (req, res) => messageEnvelopeController_1.MessageEnvelopeController.updateMessageEnvelope(req, res));
router.delete('/:id', auth_1.authenticateToken, (req, res) => messageEnvelopeController_1.MessageEnvelopeController.deleteMessageEnvelope(req, res));
exports.default = router;
//# sourceMappingURL=messageEnvelopes.js.map