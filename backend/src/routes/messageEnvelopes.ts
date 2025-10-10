import { Router } from 'express';
import { MessageEnvelopeController } from '../controllers/messageEnvelopeController';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, (req, res) => MessageEnvelopeController.getMessageEnvelopes(req as AuthRequest, res));
router.post('/', authenticateToken, (req, res) => MessageEnvelopeController.createMessageEnvelope(req as AuthRequest, res));
router.put('/:id', authenticateToken, (req, res) => MessageEnvelopeController.updateMessageEnvelope(req as AuthRequest, res));
router.delete('/:id', authenticateToken, (req, res) => MessageEnvelopeController.deleteMessageEnvelope(req as AuthRequest, res));

export default router;
