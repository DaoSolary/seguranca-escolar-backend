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