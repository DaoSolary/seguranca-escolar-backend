#!/bin/bash

echo "🚀 Configurando banco de dados..."

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Configure a DATABASE_URL no arquivo .env antes de continuar!"
    exit 1
fi

# Gerar Prisma Client
echo "📦 Gerando Prisma Client..."
npm run db:generate

# Rodar migrations
echo "🗄️  Rodando migrations..."
npm run db:migrate

# Popular banco com dados iniciais
echo "🌱 Populando banco com dados iniciais..."
npm run db:seed

echo "✅ Banco de dados configurado com sucesso!"
echo ""
echo "📝 Credenciais de teste:"
echo "   Admin: admin@seguranca.ao / 123456"
echo "   Segurança: seguranca@escola.ao / 123456"
echo "   Polícia: policia@seguranca.ao / 123456"
echo "   Professor: professor@escola.ao / 123456"
echo "   Aluno: aluno@escola.ao / 123456"



