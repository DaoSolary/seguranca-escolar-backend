-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ALUNO', 'PROFESSOR', 'SEGURANCA', 'POLICIA', 'ADMIN');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('VIOLENCIA', 'ASSEDIO', 'EMERGENCIA_MEDICA', 'INCENDIO', 'INTRUSAO', 'DROGA', 'OUTROS');

-- CreateEnum
CREATE TYPE "StatusAlerta" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'RESOLVIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PrioridadeAlerta" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "perfil" "PerfilUsuario" NOT NULL,
    "instituicaoId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instituicoes" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT,
    "email" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instituicoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusAlerta" NOT NULL DEFAULT 'PENDENTE',
    "prioridade" "PrioridadeAlerta" NOT NULL DEFAULT 'MEDIA',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "endereco" TEXT,
    "instituicaoId" INTEGER NOT NULL,
    "enviadoPorId" INTEGER NOT NULL,
    "atribuidoParaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvidoEm" TIMESTAMP(3),

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencias" (
    "id" SERIAL NOT NULL,
    "alertaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "tamanho" INTEGER,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagens" (
    "id" SERIAL NOT NULL,
    "alertaId" INTEGER NOT NULL,
    "enviadoPorId" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "anexoUrl" TEXT,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "alertaId" INTEGER,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lidaEm" TIMESTAMP(3),

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "instituicoes_cnpj_key" ON "instituicoes"("cnpj");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "instituicoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_atribuidoParaId_fkey" FOREIGN KEY ("atribuidoParaId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencias" ADD CONSTRAINT "evidencias_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagens" ADD CONSTRAINT "mensagens_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_alertaId_fkey" FOREIGN KEY ("alertaId") REFERENCES "alertas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
