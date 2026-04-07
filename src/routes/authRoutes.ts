import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { login, logout, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 🔐 LOGIN
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),

    body('senha')
      .notEmpty()
      .withMessage('Senha é obrigatória')
      .isLength({ min: 4 })
      .withMessage('Senha deve ter pelo menos 4 caracteres'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erro de validação',
        errors: errors.array(),
      });
    }

    return login(req, res, next);
  }
);

// 🚪 LOGOUT
router.post('/logout', authenticateToken, logout);

// 👤 PERFIL
router.get('/profile', authenticateToken, getProfile);

export default router;