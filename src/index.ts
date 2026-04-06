import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIO } from './controllers/alertaController';
import path from 'path';

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

// 🌍 CORS dinâmico (IMPORTANTE para produção)
const allowedOrigins: (string | RegExp)[] = [];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

allowedOrigins.push('http://localhost:5173');

// 🔌 Socket.IO configurado para produção
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Porta dinâmica obrigatória no Render
const PORT = process.env.PORT || 3000;

// 🛡️ Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// 📁 Uploads (⚠️ temporário no Render)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 🔌 WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  socket.on('join-alerta', (alertaId: number) => {
    socket.join(`alerta:${alertaId}`);
    console.log(`📥 ${socket.id} entrou em alerta:${alertaId}`);
  });

  socket.on('leave-alerta', (alertaId: number) => {
    socket.leave(`alerta:${alertaId}`);
    console.log(`📤 ${socket.id} saiu de alerta:${alertaId}`);
  });

  socket.on('alerta-digitando', (data: { alertaId: number; userId: number; nome: string }) => {
    socket.to(`alerta:${data.alertaId}`).emit(`alerta:${data.alertaId}:digitando`, {
      userId: data.userId,
      nome: data.nome,
    });
  });

  socket.on('alerta-parou-digitar', (data: { alertaId: number; userId: number }) => {
    socket.to(`alerta:${data.alertaId}`).emit(`alerta:${data.alertaId}:parou-digitar`, {
      userId: data.userId,
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// Disponibilizar IO globalmente
app.set('io', io);
setIO(io);

// 📌 Rotas
app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/instituicoes', instituicaoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/mensagens', mensagemRoutes);
app.use('/api/notificacoes', notificacaoRoutes);

// ❤️ Health check (Render usa isso implicitamente)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 🧪 Teste
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend está funcionando!',
    timestamp: new Date().toISOString(),
  });
});

// 🚀 Start server
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

export { io };