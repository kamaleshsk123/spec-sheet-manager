import { Router } from 'express';
import { SpecController } from '../controllers/specController';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { validate, createSpecSchema, updateSpecSchema } from '../middleware/validation';

const router = Router();

// Public routes (with optional auth for filtering)
router.get('/', optionalAuth, SpecController.getSpecs);
router.get('/:id', SpecController.getSpec);
router.get('/:id/versions', SpecController.getSpecVersions);
router.post('/:id/download', SpecController.incrementDownloadCount);

// Protected routes
router.post('/', authenticateToken, validate(createSpecSchema), SpecController.createSpec);
router.put('/:id', authenticateToken, validate(updateSpecSchema), SpecController.updateSpec);
router.delete('/:id', authenticateToken, SpecController.deleteSpec);
router.get('/dashboard/stats', authenticateToken, SpecController.getDashboardStats);
router.post('/:id/publish-to-github', authenticateToken, SpecController.publishToGithub);

export default router;