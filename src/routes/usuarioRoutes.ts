import { Router } from 'express';
import { listarUsuarios, obterUsuario, atualizarUsuario, excluirUsuario } from '../controllers/usuarioController';
import { authenticateToken, requireAnyRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);
router.use(requireAnyRole('SEGURANCA', 'POLICIA', 'ADMIN'));

router.get('/', listarUsuarios);
router.get('/:id', obterUsuario);

// Apenas ADMIN pode atualizar/excluir
router.put('/:id', requireAnyRole('ADMIN'), atualizarUsuario);
router.delete('/:id', requireAnyRole('ADMIN'), excluirUsuario);

export default router;

