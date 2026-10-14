const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/config');
const { aiService } = require('./ai/aiService');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind Render/Railway proxies; needed for rate limiting by IP
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  if (!config.isTest) app.use(morgan(config.isProduction ? 'combined' : 'dev'));

  app.get('/api/health', (req, res) => {
    res.json({ success: true, data: { status: 'ok', ai: aiService.status, time: new Date().toISOString() } });
  });

  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/books', require('./routes/bookRoutes'));
  app.use('/api/tickets', require('./routes/ticketRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));
  app.use('/api', notFoundHandler);

  // Single-service deployment: serve the built frontend when it exists.
  const dist = path.join(__dirname, '../../frontend/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
