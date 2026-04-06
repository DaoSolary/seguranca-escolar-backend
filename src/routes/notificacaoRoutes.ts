import { Router } from 'express';
import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '../controllers/notificacaoController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listarNotificacoes);
router.put('/:id/lida', marcarComoLida);
router.put('/todas/lida', marcarTodasComoLidas);

export default router;

