import { Router } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
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

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens e vídeos são permitidos'));
    }
  },
});

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  [
    body('tipo').isIn(['VIOLENCIA', 'ASSEDIO', 'EMERGENCIA_MEDICA', 'INCENDIO', 'INTRUSAO', 'DROGA', 'OUTROS']),
    body('titulo').notEmpty().withMessage('Título é obrigatório'),
    body('descricao').notEmpty().withMessage('Descrição é obrigatória'),
  ],
  criarAlerta
);

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

