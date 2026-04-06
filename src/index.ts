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
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para desenvolvimento
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Permite IPs locais (192.168.x.x)
    /^http:\/\/10\.0\.2\.\d+:\d+$/, // Permite emulador Android (10.0.2.2)
    /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // Permite outros IPs locais (10.x.x.x)
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(cookieParser());

// Servir arquivos estáticos de uploads (quando usando armazenamento local)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Socket.IO para notificações em tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('join-alerta', (alertaId: number) => {
    socket.join(`alerta:${alertaId}`);
    console.log(`Cliente ${socket.id} entrou na sala alerta:${alertaId}`);
  });

  socket.on('leave-alerta', (alertaId: number) => {
    socket.leave(`alerta:${alertaId}`);
    console.log(`Cliente ${socket.id} saiu da sala alerta:${alertaId}`);
  });

  // Indicador de digitação - escutar eventos genéricos
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
    console.log('Cliente desconectado:', socket.id);
  });
});

// Exportar io para uso em outros arquivos
app.set('io', io);
setIO(io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertaRoutes);
app.use('/api/instituicoes', instituicaoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/mensagens', mensagemRoutes);
app.use('/api/notificacoes', notificacaoRoutes);

// Health check - SEM autenticação
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota de teste para debug
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend está funcionando!',
    timestamp: new Date().toISOString(),
    headers: req.headers,
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 WebSocket ativo para notificações em tempo real`);
  console.log(`🌐 Acessível em: http://192.168.65.176:${PORT}`);
  console.log(`🌐 Ou via IP local: http://localhost:${PORT}`);
});

export { io };

