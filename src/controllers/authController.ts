import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

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

    // Atualizar FCM token se fornecido
    if (fcmToken) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { fcmToken },
      });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    res.json({
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
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

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

    res.json({
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      telefone: usuario.telefone,
      perfil: usuario.perfil,
      instituicaoId: usuario.instituicaoId,
      instituicao: usuario.instituicao,
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

