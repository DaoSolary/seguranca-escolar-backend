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
    // Permitir requests sem origin (ex: Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('❌ CORS bloqueado para:', origin);
    return callback(new Error('Not allowed by CORS'));
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
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
app.use('/api/auth', authRoutes);
app.use('/api/alertas', alertaRoutes);
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