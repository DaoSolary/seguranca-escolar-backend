import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { getIO } from './alertaController';

export const criarMensagem = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { alertaId, conteudo, anexoUrl } = req.body;

    // Verificar se o alerta existe e se o usuário tem acesso
    const alerta = await prisma.alerta.findUnique({
      where: { id: parseInt(alertaId) },
    });

    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // Verificar permissões
    // ALUNO e PROFESSOR podem enviar mensagens em seus próprios alertas E alertas criados por ADMIN
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

    const mensagem = await prisma.mensagem.create({
      data: {
        alertaId: parseInt(alertaId),
        enviadoPorId: req.user.id,
        conteudo,
        anexoUrl,
      },
      include: {
        enviadoPor: {
          select: {
            id: true,
            nome: true,
            perfil: true,
          },
        },
      },
    });

    // Notificar via Socket.IO para todos na sala do alerta
    const io = getIO();
    if (io) {
      // Emitir para a sala específica do alerta
      io.to(`alerta:${alertaId}`).emit('nova-mensagem', mensagem);
      // Também emitir evento específico
      io.to(`alerta:${alertaId}`).emit(`alerta:${alertaId}:nova-mensagem`, mensagem);
    }

    res.status(201).json(mensagem);
  } catch (error) {
    console.error('Erro ao criar mensagem:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const listarMensagens = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { alertaId } = req.params;

    // Verificar acesso ao alerta
    const alerta = await prisma.alerta.findUnique({
      where: { id: parseInt(alertaId) },
    });

    if (!alerta) {
      return res.status(404).json({ message: 'Alerta não encontrado' });
    }

    // ALUNO e PROFESSOR podem ver mensagens de seus próprios alertas E alertas criados por ADMIN
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

    const mensagens = await prisma.mensagem.findMany({
      where: {
        alertaId: parseInt(alertaId),
      },
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
    });

    res.json({ mensagens });
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

