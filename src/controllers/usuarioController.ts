import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';

export const listarUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const { perfil, instituicaoId } = req.query;

    const where: any = {};

    if (perfil) where.perfil = perfil;
    if (instituicaoId) where.instituicaoId = parseInt(instituicaoId as string);

    // SEGURANCA só vê usuários da sua instituição
    if (req.user?.perfil === 'SEGURANCA' && req.user.instituicaoId) {
      where.instituicaoId = req.user.instituicaoId;
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        instituicao: {
          select: {
            id: true,
            nome: true,
          },
        },
        ativo: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    res.json({ usuarios });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        instituicao: {
          select: {
            id: true,
            nome: true,
            endereco: true,
          },
        },
        ativo: true,
      },
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao obter usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const atualizarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;
    const { nome, email, telefone, perfil, instituicaoId, ativo, senha } = req.body;

    // Apenas ADMIN pode atualizar usuários
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem atualizar usuários' });
    }

    const data: any = {};
    if (nome) data.nome = nome;
    if (email) data.email = email;
    if (telefone !== undefined) data.telefone = telefone;
    if (perfil) data.perfil = perfil;
    if (instituicaoId !== undefined) data.instituicaoId = instituicaoId ? parseInt(instituicaoId) : null;
    if (ativo !== undefined) data.ativo = ativo;
    if (senha) {
      data.senha = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        instituicao: {
          select: {
            id: true,
            nome: true,
          },
        },
        ativo: true,
      },
    });

    res.json(usuario);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const excluirUsuario = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;

    // Apenas ADMIN pode excluir usuários
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem excluir usuários' });
    }

    // Não permitir excluir a si mesmo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: 'Não é possível excluir seu próprio usuário' });
    }

    await prisma.usuario.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
