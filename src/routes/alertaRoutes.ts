import { Router } from 'express';
import { upload } from '../middleware/upload'; // ✅ CORRETO (named import)
import { body, query } from 'express-validator';

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

// 🔐 Middleware global
router.use(authenticateToken);

// ✅ CRIAR ALERTA COM EVIDÊNCIAS
// 👉 ENTRE router.use(authenticateToken); E router.get(...)
router.post(
  '/',
  upload.array('files', 10), // 🔥 PADRÃO DEFINIDO AQUI
  criarAlerta
);

// ✅ UPLOAD DE EVIDÊNCIAS EM ALERTA EXISTENTE
router.post(
  '/:id/evidencias',
  upload.array('files', 10), // 🔥 MESMO NOME
  uploadEvidencias
);

// 📋 LISTAR ALERTAS
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

// 📊 ESTATÍSTICAS
router.get('/estatisticas', getEstatisticas);

// 🔍 DETALHE
router.get('/:id', obterAlerta);

// ✏️ ATUALIZAR
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