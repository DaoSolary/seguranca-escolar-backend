import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
// Import será feito de forma diferente para evitar dependência circular
let ioInstance: any;
export const setIO = (io: any) => { ioInstance = io; };
export const getIO = () => ioInstance;
import admin from 'firebase-admin';
import { uploadToFirebase, uploadMultipleFiles } from '../services/uploadService';

// Inicializar Firebase Admin se ainda não estiver inicializado
if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export const criarAlerta = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const {
      tipo,
      titulo,
      descricao,
      latitude,
      longitude,
      endereco,
      prioridade,
    } = req.body;

    const files = req.files as Express.Multer.File[] | undefined;

    if (!tipo || !titulo || !descricao) {
      return res.status(400).json({
        message: 'Tipo, título e descrição são obrigatórios',
      });
    }

    // 🔥 PRIORIDADE AUTOMÁTICA
    let prioridadeFinal = prioridade || 'MEDIA';

    if (
      tipo === 'VIOLENCIA' ||
      tipo === 'INCENDIO' ||
      tipo === 'INTRUSAO'
    ) {
      prioridadeFinal = 'ALTA';
    }

    if (
      tipo === 'EMERGENCIA_MEDICA' &&
      descricao.toLowerCase().includes('urgente')
    ) {
      prioridadeFinal = 'CRITICA';
    }

    // 🟢 1. CRIAR ALERTA PRIMEIRO
    const alerta = await prisma.alerta.create({
      data: {
        tipo,
        titulo,
        descricao,
        latitude: latitude ? parseFloat(latitude.toString()) : null,
        longitude: longitude ? parseFloat(longitude.toString()) : null,
        endereco,
        prioridade: prioridadeFinal,
        instituicaoId: req.user.instituicaoId || 1,
        enviadoPorId: req.user.id,
      },
      include: {
        enviadoPor: true,
        instituicao: true,
        //evidencias: true,
      },
    });

    // 🟡 2. UPLOAD AUTOMÁTICO DE EVIDÊNCIAS (SE EXISTIREM)
    if (files && files.length > 0) {
      try {
        const uploads = await uploadMultipleFiles(files, 'evidencias');

        const evidencias = await Promise.all(
          uploads.map((upload) =>
            prisma.evidencia.create({
              data: {
                alertaId: alerta.id,
                tipo: upload.tipo.startsWith('image/') ? 'foto' : 'video',
                url: upload.url,
                nomeArquivo: upload.nomeArquivo,
                tamanho: upload.tamanho,
              },
            })
          )
        );

        // atualizar alerta com evidências
        (alerta as any).evidencias = evidencias;
      } catch (uploadError) {
        console.error('Erro no upload de evidências:', uploadError);
      }
    }

    // 📡 SOCKET
    const io = getIO();
    if (io) {
      io.emit('novo-alerta', alerta);
    }

    // 🔔 NOTIFICAÇÕES PUSH (mantido igual)
    const perfisParaNotificar =
      req.user?.perfil === 'ADMIN'
        ? ['ADMIN', 'SEGURANCA', 'POLICIA', 'PROFESSOR', 'ALUNO'] as const
        : ['SEGURANCA', 'POLICIA', 'ADMIN'] as const;

    const usuariosNotificar = await prisma.usuario.findMany({
      where: {
        OR: perfisParaNotificar.map((perfil) => ({ perfil })),
        fcmToken: { not: null },
        ativo: true,
        id: { not: req.user.id },
      },
      select: {
        fcmToken: true,
        perfil: true,
      },
    });

    const mensagem = {
      notification: {
        title: `🚨 Alerta: ${titulo}`,
        body: descricao.substring(0, 100),
      },
      data: {
        tipo: 'alerta',
        alertaId: alerta.id.toString(),
        prioridade: prioridadeFinal,
      },
    };

    if (admin.apps.length > 0) {
      for (const usuario of usuariosNotificar) {
        if (usuario.fcmToken) {
          try {
            await admin.messaging().send({
              ...mensagem,
              token: usuario.fcmToken,
            });
          } catch (error) {
            console.error('Erro push:', error);
          }
        }
      }
    }

    // 🧾 NOTIFICAÇÕES BD (igual)
    const usuariosParaNotificar = await prisma.usuario.findMany({
      where: {
        OR: perfisParaNotificar.map((perfil) => ({ perfil })),
        ativo: true,
        id: { not: req.user.id },
      },
      select: { id: true },
    });

    if (usuariosParaNotificar.length > 0) {
      await prisma.notificacao.createMany({
        data: usuariosParaNotificar.map((u) => ({
          usuarioId: u.id,
          alertaId: alerta.id,
          titulo: `Novo Alerta: ${titulo}`,
          mensagem: descricao.substring(0, 200),
          tipo: 'alerta',
        })),
      });
    }

    return res.status(201).json(alerta);
  } catch (error) {
    console.error('Erro ao criar alerta:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const listarAlertas = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { status, tipo, instituicaoId, page = '1', limit = '20' } = req.query;

    const where: any = {};

    // Filtros baseados no perfil
    // ALUNO e PROFESSOR veem seus próprios alertas E alertas criados por ADMIN
    if (req.user.perfil === 'ALUNO' || req.user.perfil === 'PROFESSOR') {
      // Buscar IDs de usuários ADMIN primeiro
      const admins = await prisma.usuario.findMany({
        where: { perfil: 'ADMIN' },
        select: { id: true }
      });
      const adminIds = admins.map(a => a.id);
      
      where.OR = [
        { enviadoPorId: req.user.id },
        // Incluir alertas criados por ADMIN
        { enviadoPorId: { in: adminIds } }
      ];
    } else if (req.user.perfil === 'SEGURANCA') {
      where.OR = [
        { atribuidoParaId: req.user.id },
        { atribuidoParaId: null, status: 'PENDENTE' },
      ];
      if (req.user.instituicaoId) {
        where.instituicaoId = req.user.instituicaoId;
      }
    }
    // POLICIA e ADMIN veem tudo

    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (instituicaoId) where.instituicaoId = parseInt(instituicaoId as string);

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [alertas, total] = await Promise.all([
      prisma.alerta.findMany({
        where,
        include: {
          enviadoPor: {
            select: {
              id: true,
              nome: true,
              telefone: true,
              perfil: true,
            },
          },
          atribuidoPara: {
            select: {
              id: true,
              nome: true,
            },
          },
          instituicao: {
            select: {
              id: true,
              nome: true,
            },
          },
          evidencias: true,
          _count: {
            select: {
              mensagens: true,
            },
          },
        },
        orderBy: [
          { prioridade: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.alerta.count({ where }),
    ]);

    res.json({
      alertas,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Erro ao listar alertas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterAlerta = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;

    const alerta = await prisma.alerta.findUnique({
      where: { id: parseInt(id) },
      include: {
        enviadoPor: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            email: true,
            perfil: true,
          },
        },
        atribuidoPara: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },
        instituicao: {
          select: {
            id: true,
            nome: true,
            endereco: true,
            telefone: true,
          },
        },
        evidencias: true,
        mensagens: {
          include: {
            enviadoPor: {
              select: {
                id: true,
                nome: true,
                perfil: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Verificar permissões
    // ALUNO e PROFESSOR podem ver seus próprios alertas E alertas criados por ADMIN
    if (req.user.perfil === 'ALUNO' || req.user.perfil === 'PROFESSOR') {
      if (alerta.enviadoPorId !== req.user.id) {
        // Verificar se foi criado por ADMIN
        const enviadoPor = await prisma.usuario.findUnique({
          where: { id: alerta.enviadoPorId },
          select: { perfil: true }
        });
        
        if (enviadoPor?.perfil !== 'ADMIN') {
          return res.status(403).json({ message: 'Acesso negado' });
        }
      }
    }

    res.json(alerta);
  } catch (error) {
    console.error('Erro ao obter alerta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const atualizarAlerta = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;
    const { status, atribuidoParaId, prioridade } = req.body;

    // Verificar permissões
    const alerta = await prisma.alerta.findUnique({
      where: { id: parseInt(id) },
    });

    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Apenas SEGURANCA, POLICIA ou ADMIN podem atualizar
    if (!['SEGURANCA', 'POLICIA', 'ADMIN'].includes(req.user.perfil)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const data: any = {};
    if (status) data.status = status;
    if (atribuidoParaId) data.atribuidoParaId = parseInt(atribuidoParaId);
    if (prioridade) data.prioridade = prioridade;
    
    if (status === 'RESOLVIDO') {
      data.resolvidoEm = new Date();
    }

    const alertaAtualizado = await prisma.alerta.update({
      where: { id: parseInt(id) },
      data,
      include: {
        enviadoPor: {
          select: {
            id: true,
            nome: true,
          },
        },
        atribuidoPara: {
          select: {
            id: true,
            nome: true,
          },
        },
        instituicao: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    // Notificar via Socket.IO
    const io = getIO();
    if (io) {
      // Notificar todos sobre a atualização
      io.emit('alerta-atualizado', alertaAtualizado);
      
      // Notificar especificamente o remetente do alerta
      if (alerta.enviadoPorId && alerta.enviadoPorId !== req.user.id) {
        io.emit(`usuario:${alerta.enviadoPorId}:notificacao`, {
          tipo: 'alerta-atualizado',
          alerta: alertaAtualizado,
          mensagem: status === 'EM_ANDAMENTO' 
            ? `Seu alerta "${alerta.titulo}" está sendo atendido por ${req.user.nome}`
            : status === 'RESOLVIDO'
            ? `Seu alerta "${alerta.titulo}" foi resolvido!`
            : `Seu alerta "${alerta.titulo}" foi atualizado`,
        });
      }
    }

    res.json(alertaAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar alerta:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const getEstatisticas = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const where: any = {};

    // ALUNO e PROFESSOR veem seus próprios alertas E alertas criados por ADMIN
    if (req.user.perfil === 'ALUNO' || req.user.perfil === 'PROFESSOR') {
      // Buscar IDs de usuários ADMIN primeiro
      const admins = await prisma.usuario.findMany({
        where: { perfil: 'ADMIN' },
        select: { id: true }
      });
      const adminIds = admins.map(a => a.id);
      
      where.OR = [
        { enviadoPorId: req.user.id },
        // Incluir alertas criados por ADMIN
        { enviadoPorId: { in: adminIds } }
      ];
    } else if (req.user.perfil === 'SEGURANCA' && req.user.instituicaoId) {
      where.instituicaoId = req.user.instituicaoId;
    }

    // ADMIN não deve ver seus próprios alertas como pendentes
    // Excluir alertas criados pelo próprio ADMIN das estatísticas
    if (req.user.perfil === 'ADMIN') {
      where.enviadoPorId = { not: req.user.id };
    }

    const [
      total,
      pendentes,
      emAndamento,
      resolvidos,
      porTipo,
      porPrioridade,
    ] = await Promise.all([
      prisma.alerta.count({ where }),
      prisma.alerta.count({ where: { ...where, status: 'PENDENTE' } }),
      prisma.alerta.count({ where: { ...where, status: 'EM_ANDAMENTO' } }),
      prisma.alerta.count({ where: { ...where, status: 'RESOLVIDO' } }),
      prisma.alerta.groupBy({
        by: ['tipo'],
        where,
        _count: true,
      }),
      prisma.alerta.groupBy({
        by: ['prioridade'],
        where,
        _count: true,
      }),
    ]);

    res.json({
      total,
      pendentes,
      emAndamento,
      resolvidos,
      porTipo: porTipo.reduce((acc, item) => {
        acc[item.tipo] = item._count;
        return acc;
      }, {} as Record<string, number>),
      porPrioridade: porPrioridade.reduce((acc, item) => {
        acc[item.prioridade] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const uploadEvidencias = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // Verificar se o alerta existe e o usuário tem permissão
    const alerta = await prisma.alerta.findUnique({
      where: { id: parseInt(id) },
    });

    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Verificar permissão
    if (
      req.user.perfil !== 'ADMIN' &&
      req.user.perfil !== 'SEGURANCA' &&
      req.user.perfil !== 'POLICIA' &&
      alerta.enviadoPorId !== req.user.id
    ) {
      return res.status(403).json({ message: 'Sem permissão para adicionar evidências a este alerta' });
    }

    // Fazer upload dos arquivos
    const uploads = await uploadMultipleFiles(files, 'evidencias');

    // Salvar evidências no banco
    const evidencias = await Promise.all(
      uploads.map((upload) =>
        prisma.evidencia.create({
          data: {
            alertaId: alerta.id,
            tipo: upload.tipo.startsWith('image/') ? 'foto' : 'video',
            url: upload.url,
            nomeArquivo: upload.nomeArquivo,
            tamanho: upload.tamanho,
          },
        })
      )
    );

    // Notificar via WebSocket
    const io = getIO();
    if (io) {
      io.to(`alerta:${alerta.id}`).emit('evidencia-adicionada', {
        alertaId: alerta.id,
        evidencias,
      });
    }

    res.json({
      message: 'Evidências enviadas com sucesso',
      evidencias,
    });
  } catch (error) {
    console.error('Erro ao fazer upload de evidências:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

