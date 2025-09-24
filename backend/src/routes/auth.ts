import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { validate, createUserSchema, loginSchema } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', validate(createUserSchema), AuthController.register);
router.post('/login', validate(loginSchema), AuthController.login);

// GitHub OAuth
router.get('/github', AuthController.githubAuth);
router.get('/github/callback', AuthController.githubCallback);

// Protected routes
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;