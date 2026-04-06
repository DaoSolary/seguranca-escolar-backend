import { Router } from 'express';
import { body } from 'express-validator';
import { criarMensagem, listarMensagens } from '../controllers/mensagemController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  [
    body('alertaId').isInt().withMessage('ID do alerta é obrigatório'),
    body('conteudo').notEmpty().withMessage('Conteúdo da mensagem é obrigatório'),
  ],
  criarMensagem
);

router.get('/alerta/:alertaId', listarMensagens);

export default router;

