import { Router } from 'express';
import { MessageTypeController } from '../controllers/messageTypeController';
import { authenticateToken } from '../middleware/auth';
import { validate, createMessageTypeSchema, updateMessageTypeSchema } from '../middleware/validation';

const router = Router();

router.get('/specs/:specId/messagetypes', authenticateToken, MessageTypeController.getMessageTypes);
router.post('/specs/:specId/messagetypes', authenticateToken, validate(createMessageTypeSchema), MessageTypeController.createMessageType);
router.put('/messagetypes/:id', authenticateToken, validate(updateMessageTypeSchema), MessageTypeController.updateMessageType);
router.delete('/messagetypes/:id', authenticateToken, MessageTypeController.deleteMessageType);

export default router;
