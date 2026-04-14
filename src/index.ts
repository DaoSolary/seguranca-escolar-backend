import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIO } from './controllers/alertaController';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/authRoutes';
import alertaRoutes from './routes/alertaRoutes';
import instituicaoRoutes from './routes/instituicaoRoutes';
import usuarioRoutes from './routes/usuarioRoutes';
import mensagemRoutes from './routes/mensagemRoutes';
import notificacaoRoutes from './routes/notificacaoRoutes';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Correção para o caminho de uploads
const uploadPath = path.resolve(process.cwd(), 'uploads'); // Usa __dirname para garantir caminho correto
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('📁 Pasta uploads criada automaticamente');
}
console.log('UPLOAD DIR EXISTS:', fs.existsSync(uploadPath));
console.log('UPLOAD DIR:', uploadPath);
console.log('UPLOAD DIR EXISTS:', fs.existsSync(uploadPath)); // Confirma se a pasta existe no ambiente de produção

// 🌍 Lista de origens permitidas
const allowedOrigins: string[] = [];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// Desenvolvimento local
allowedOrigins.push('http://localhost:5173');

// 🔐 Função CORS dinâmica (resolve problema de cookies)
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log('🌍 Origin recebida:', origin);

    // Permitir requests sem origin (Postman, mobile, etc.)
    if (!origin) return callback(null, true);

    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'https://alerta-publico.vercel.app',
    ];

    if (allowed.includes(origin)) {
      return callback(new Error('Not allowed by CORS'));
    }

    console.warn('❌ CORS bloqueado para:', origin);
    return callback(null, false); // ⚠️ NÃO lançar erro
  },
  credentials: true,
};

// 🛡️ Segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // 🔥 importante para preflight

app.use(express.json());
app.use(cookieParser());

// 📁 Uploads (⚠️ temporário no Render)
// Usar o caminho corrigido
app.use('/uploads', express.static(uploadPath));

// 🔌 Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: true, // 👈 ACEITA QUALQUER ORIGIN (DEV + MOBILE)
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('join-alerta', (alertaId: number) => {
    socket.join(`alerta:${alertaId}`);
  });

  socket.on('leave-alerta', (alertaId: number) => {
    socket.leave(`alerta:${alertaId}`);
  });

  socket.on('alerta-digitando', (data) => {
    socket.to(`alerta:${data.alertaId}`).emit(`alerta:${data.alertaId}:digitando`, data);
  });

  socket.on('alerta-parou-digitar', (data) => {
    socket.to(`alerta:${data.alertaId}`).emit(`alerta:${data.alertaId}:parou-digitar`, data);
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Disponibilizar IO globalmente
app.set('io', io);
setIO(io);

// 📌 Rotas
app.use('/auth', authRoutes);
app.use('/alertas', alertaRoutes);
app.use('/instituicoes', instituicaoRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/mensagens', mensagemRoutes);
app.use('/notificacoes', notificacaoRoutes);

// ❤️ Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🚀 Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

export { io };