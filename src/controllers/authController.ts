import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

// 🔐 LOGIN
export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, senha, fcmToken } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: {
        instituicao: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // 🔔 Atualizar FCM token
    if (fcmToken) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { fcmToken },
      });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET não definido');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      user: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        perfil: usuario.perfil,
        instituicaoId: usuario.instituicaoId,
        instituicao: usuario.instituicao,
      },
      token,
    });
  } catch (error) {
    console.error('❌ Erro no login:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// 🚪 LOGOUT
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    return res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// 👤 PROFILE
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      include: {
        instituicao: {
          select: {
            id: true,
            nome: true,
            endereco: true,
          },
        },
      },
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.json({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      instituicaoId: usuario.instituicaoId,
      instituicao: usuario.instituicao,
    });
  } catch (error) {
    console.error('❌ Erro ao buscar perfil:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};