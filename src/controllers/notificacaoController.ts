import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const listarNotificacoes = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { naoLidas } = req.query;

    const where: any = {
      usuarioId: req.user.id,
    };

    if (naoLidas === 'true') {
      where.lida = false;
    }

    const notificacoes = await prisma.notificacao.findMany({
      where,
      include: {
        alerta: {
          select: {
            id: true,
            titulo: true,
            tipo: true,
            prioridade: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    res.json({ notificacoes });
  } catch (error) {
    console.error('Erro ao listar notificações:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const marcarComoLida = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;

    const notificacao = await prisma.notificacao.update({
      where: {
        id: parseInt(id),
        usuarioId: req.user.id, // Garantir que só pode marcar suas próprias notificações
      },
      data: {
        lida: true,
        lidaEm: new Date(),
      },
    });

    res.json(notificacao);
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const marcarTodasComoLidas = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    await prisma.notificacao.updateMany({
      where: {
        usuarioId: req.user.id,
        lida: false,
      },
      data: {
        lida: true,
        lidaEm: new Date(),
      },
    });

    res.json({ message: 'Todas as notificações foram marcadas como lidas' });
  } catch (error) {
    console.error('Erro ao marcar todas as notificações como lidas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

