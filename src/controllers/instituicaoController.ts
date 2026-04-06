import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const criarInstituicao = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Apenas ADMIN pode criar instituições
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem criar instituições' });
    }

    const { nome, cnpj, endereco, telefone, email } = req.body;

    if (!nome) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const instituicao = await prisma.instituicao.create({
      data: {
        nome,
        cnpj: cnpj || null,
        endereco: endereco || null,
        telefone: telefone || null,
        email: email || null,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        endereco: true,
        telefone: true,
        email: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
    });

    res.status(201).json(instituicao);
  } catch (error) {
    console.error('Erro ao criar instituição:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const listarInstituicoes = async (req: AuthRequest, res: Response) => {
  try {
    const instituicoes = await prisma.instituicao.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        endereco: true,
        telefone: true,
        email: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
      orderBy: {
        nome: 'asc',
      },
    });

    res.json({ instituicoes });
  } catch (error) {
    console.error('Erro ao listar instituições:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const obterInstituicao = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const instituicao = await prisma.instituicao.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        nome: true,
        cnpj: true,
        endereco: true,
        telefone: true,
        email: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
    });

    if (!instituicao) {
      return res.status(404).json({ message: 'Instituição não encontrada' });
    }

    res.json(instituicao);
  } catch (error) {
    console.error('Erro ao obter instituição:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const atualizarInstituicao = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;
    const { nome, endereco, telefone, email, cnpj } = req.body;

    // Apenas ADMIN pode atualizar instituições
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem atualizar instituições' });
    }

    const instituicao = await prisma.instituicao.update({
      where: { id: parseInt(id) },
      data: {
        nome,
        endereco,
        telefone,
        email,
        cnpj,
      },
      select: {
        id: true,
        nome: true,
        endereco: true,
        telefone: true,
        email: true,
        cnpj: true,
        _count: {
          select: {
            usuarios: true,
          },
        },
      },
    });

    res.json(instituicao);
  } catch (error) {
    console.error('Erro ao atualizar instituição:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

export const excluirInstituicao = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const { id } = req.params;

    // Apenas ADMIN pode excluir instituições
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem excluir instituições' });
    }

    // Verificar se há usuários associados
    const usuariosCount = await prisma.usuario.count({
      where: { instituicaoId: parseInt(id) },
    });

    if (usuariosCount > 0) {
      return res.status(400).json({ 
        message: `Não é possível excluir instituição com ${usuariosCount} usuário(s) associado(s)` 
      });
    }

    await prisma.instituicao.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Instituição excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir instituição:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};
