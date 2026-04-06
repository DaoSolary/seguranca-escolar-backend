@echo off
echo 🚀 Configurando banco de dados...

REM Verificar se .env existe
if not exist .env (
    echo 📝 Criando arquivo .env...
    copy .env.example .env
    echo ⚠️  IMPORTANTE: Configure a DATABASE_URL no arquivo .env antes de continuar!
    pause
    exit /b 1
)

REM Gerar Prisma Client
echo 📦 Gerando Prisma Client...
call npm run db:generate

REM Rodar migrations
echo 🗄️  Rodando migrations...
call npm run db:migrate

REM Popular banco com dados iniciais
echo 🌱 Populando banco com dados iniciais...
call npm run db:seed

echo ✅ Banco de dados configurado com sucesso!
echo.
echo 📝 Credenciais de teste:
echo    Admin: admin@seguranca.ao / 123456
echo    Segurança: seguranca@escola.ao / 123456
echo    Polícia: policia@seguranca.ao / 123456
echo    Professor: professor@escola.ao / 123456
echo    Aluno: aluno@escola.ao / 123456
pause



