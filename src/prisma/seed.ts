import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Criar instituição exemplo
  const instituicao = await prisma.instituicao.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Escola Secundária Exemplo',
      cnpj: '12345678000190',
      endereco: 'Rua Principal, 123',
      telefone: '+244 9XX XXX XXX',
      email: 'contato@escolaexemplo.ao',
    },
  });

  const senhaHash = await bcrypt.hash('123456', 10);

  // Criar usuários exemplo
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@seguranca.ao' },
    update: {},
    create: {
      email: 'admin@seguranca.ao',
      senha: senhaHash,
      nome: 'Administrador',
      perfil: 'ADMIN',
      instituicaoId: instituicao.id,
    },
  });

  const seguranca = await prisma.usuario.upsert({
    where: { email: 'seguranca@escola.ao' },
    update: {},
    create: {
      email: 'seguranca@escola.ao',
      senha: senhaHash,
      nome: 'João Segurança',
      telefone: '+244 9XX XXX XXX',
      perfil: 'SEGURANCA',
      instituicaoId: instituicao.id,
    },
  });

  const policia = await prisma.usuario.upsert({
    where: { email: 'policia@seguranca.ao' },
    update: {},
    create: {
      email: 'policia@seguranca.ao',
      senha: senhaHash,
      nome: 'Agente Policial',
      telefone: '+244 9XX XXX XXX',
      perfil: 'POLICIA',
    },
  });

  const professor = await prisma.usuario.upsert({
    where: { email: 'professor@escola.ao' },
    update: {},
    create: {
      email: 'professor@escola.ao',
      senha: senhaHash,
      nome: 'Maria Professora',
      telefone: '+244 9XX XXX XXX',
      perfil: 'PROFESSOR',
      instituicaoId: instituicao.id,
    },
  });

  const aluno = await prisma.usuario.upsert({
    where: { email: 'aluno@escola.ao' },
    update: {},
    create: {
      email: 'aluno@escola.ao',
      senha: senhaHash,
      nome: 'Pedro Aluno',
      telefone: '+244 9XX XXX XXX',
      perfil: 'ALUNO',
      instituicaoId: instituicao.id,
    },
  });

  console.log('✅ Seed concluído!');
  console.log('\n📝 Credenciais de acesso:');
  console.log('Admin: admin@seguranca.ao / 123456');
  console.log('Segurança: seguranca@escola.ao / 123456');
  console.log('Polícia: policia@seguranca.ao / 123456');
  console.log('Professor: professor@escola.ao / 123456');
  console.log('Aluno: aluno@escola.ao / 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

