import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    nome: string;
    perfil: string;
    instituicaoId?: number | null;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
      id: number;
      email: string;
    };

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        nome: true,
        perfil: true,
        instituicaoId: true,
        ativo: true,
      },
    });

    if (!user || !user.ativo) {
      return res.status(401).json({ message: 'Usuário não encontrado ou inativo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil,
      instituicaoId: user.instituicaoId,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireAnyRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!roles.includes(req.user.perfil)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    next();
  };
};

