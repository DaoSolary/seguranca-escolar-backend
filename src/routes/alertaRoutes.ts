import { Router } from 'express';
import upload from '../middleware/upload';
import { body, query } from 'express-validator';
import path from 'path';
import {
  criarAlerta,
  listarAlertas,
  obterAlerta,
  atualizarAlerta,
  getEstatisticas,
  uploadEvidencias,
} from '../controllers/alertaController';
import { authenticateToken, requireAnyRole } from '../middleware/auth';



const router = Router();

router.use(authenticateToken);

router.post('/', upload.array('evidencias', 10), criarAlerta);

// Rota para upload de evidências
router.post(
  '/:id/evidencias',
  authenticateToken, // Garantir autenticação
  upload.array('arquivos', 10), // Até 10 arquivos
  uploadEvidencias
);

router.get(
  '/',
  [
    query('status').optional().isIn(['PENDENTE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO']),
    query('tipo').optional().isIn(['VIOLENCIA', 'ASSEDIO', 'EMERGENCIA_MEDICA', 'INCENDIO', 'INTRUSAO', 'DROGA', 'OUTROS']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  listarAlertas
);

router.get('/estatisticas', getEstatisticas);

router.get('/:id', obterAlerta);

router.put(
  '/:id',
  requireAnyRole('SEGURANCA', 'POLICIA', 'ADMIN'),
  [
    body('status').optional().isIn(['PENDENTE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO']),
    body('prioridade').optional().isIn(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA']),
  ],
  atualizarAlerta
);

export default router;

