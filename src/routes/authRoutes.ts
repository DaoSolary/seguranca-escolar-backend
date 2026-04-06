import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('senha').notEmpty().withMessage('Senha é obrigatória'),
  ],
  login
);

router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

export default router;

