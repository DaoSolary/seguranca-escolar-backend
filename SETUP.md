# Setup do Backend - Segurança Escolar

## Pré-requisitos

1. **PostgreSQL** instalado e rodando
2. **Node.js** 18+ instalado
3. **npm** ou **yarn** instalado

## Passo a Passo

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Configurar Banco de Dados

#### Opção A: PostgreSQL Local

1. Crie um banco de dados:
```bash
createdb seguranca_escolar
# ou via psql:
# psql -U postgres
# CREATE DATABASE seguranca_escolar;
```

2. Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

3. Configure a `DATABASE_URL` no arquivo `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/seguranca_escolar?schema=public"
```

#### Opção B: PostgreSQL em Docker

```bash
docker run --name postgres-seguranca -e POSTGRES_PASSWORD=senha123 -e POSTGRES_DB=seguranca_escolar -p 5432:5432 -d postgres:15
```

### 3. Rodar Migrations

```bash
npm run db:migrate
```

Isso criará todas as tabelas no banco de dados.

### 4. Popular Banco com Dados Iniciais (Opcional)

```bash
npm run db:seed
```

Isso criará:
- 1 instituição exemplo
- 5 usuários de teste (admin, segurança, polícia, professor, aluno)
- Senha padrão para todos: `123456`

### 5. Gerar Prisma Client

```bash
npm run db:generate
```

### 6. Iniciar Servidor

```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3001`

## Credenciais de Teste

Após rodar o seed:

- **Admin**: `admin@seguranca.ao` / `123456`
- **Segurança**: `seguranca@escola.ao` / `123456`
- **Polícia**: `policia@seguranca.ao` / `123456`
- **Professor**: `professor@escola.ao` / `123456`
- **Aluno**: `aluno@escola.ao` / `123456`

## Troubleshooting

### Erro: "Cannot find module '@prisma/client'"
```bash
npm run db:generate
```

### Erro: "Database connection failed"
- Verifique se o PostgreSQL está rodando
- Verifique se a `DATABASE_URL` no `.env` está correta
- Teste a conexão: `psql $DATABASE_URL`

### Erro: "relation does not exist"
```bash
npm run db:migrate
```

## Próximos Passos

1. Configure Firebase Storage para upload de arquivos (veja `.env.example`)
2. Configure variáveis de ambiente de produção
3. Configure SSL/TLS para produção



