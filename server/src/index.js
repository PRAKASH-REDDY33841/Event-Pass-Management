require('dotenv').config();
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { seedDatabase } = require('./db/seed');
const { startNotificationWorker } = require('./services/notificationService');
const eventsRouter = require('./routes/events');
const ticketsRouter = require('./routes/tickets');
const scanRouter = require('./routes/scan');
const statsRouter = require('./routes/stats');
const outboxRouter = require('./routes/outbox');
const authRouter = require('./routes/auth');
const paymentsRouter = require('./routes/payments');
const chatbotRouter = require('./routes/chatbot');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io with permissive CORS for local development
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${req.method}] ${req.path}`);
  }
  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/scan', scanRouter);
app.use('/api/stats', statsRouter);
app.use('/api/outbox', outboxRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/chatbot', chatbotRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'EventPass Security Engine',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files in production if client/dist exists
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // In Express 5, use fallback middleware for SPA client-side routing
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  socket.on('join:event', (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`[Socket.io] Client ${socket.id} joined room event_${eventId}`);
  });

  socket.on('leave:event', (eventId) => {
    socket.leave(`event_${eventId}`);
    console.log(`[Socket.io] Client ${socket.id} left room event_${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

// Automatically seed sample data if database is fresh
try {
  seedDatabase(false);
  startNotificationWorker();
} catch (seedErr) {
  console.error('[Seed] Error checking or seeding database:', seedErr);
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 EventPass Server running at http://localhost:${PORT}`);
  console.log(`📡 Socket.io ready for real-time live attendance sync`);
  console.log(`🔒 Cryptographic ticket verification active (JWT)`);
  console.log(`====================================================`);
});
