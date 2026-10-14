const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./src/config/config');
const { connectDB } = require('./src/config/db');
const { initSocket } = require('./src/services/socketService');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const bookRoutes = require('./src/routes/bookRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security Headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// Rate limit for auth login endpoint (anti-brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);

// Middleware
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173', '*'],
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BookLeaf API Server',
    timestamp: new Date().toISOString(),
    aiProvider: config.aiProvider,
    geminiConfigured: Boolean(config.geminiApiKey),
    openaiConfigured: Boolean(config.openaiApiKey),
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.url} does not exist.`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Connect DB and Start Server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(config.port, () => {
      console.log(`🚀 BookLeaf Backend Server running on http://localhost:${config.port}`);
      console.log(`🤖 AI Provider: ${config.aiProvider} (Gemini: ${Boolean(config.geminiApiKey)}, OpenAI: ${Boolean(config.openaiApiKey)})`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, server };

