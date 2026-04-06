import { Router } from 'express';
import { criarInstituicao, listarInstituicoes, obterInstituicao, atualizarInstituicao, excluirInstituicao } from '../controllers/instituicaoController';
import { authenticateToken, requireAnyRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', listarInstituicoes);
router.get('/:id', obterInstituicao);

// Apenas ADMIN pode criar/atualizar/excluir
router.post('/', requireAnyRole('ADMIN'), criarInstituicao);
router.put('/:id', requireAnyRole('ADMIN'), atualizarInstituicao);
router.delete('/:id', requireAnyRole('ADMIN'), excluirInstituicao);

export default router;

