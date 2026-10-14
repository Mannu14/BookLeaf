const http = require('http');
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const { connectDB, disconnectDB } = require('./src/config/db');
const { createApp } = require('./src/app');
const { initSocket } = require('./src/realtime/socket');
const { seedIfEmpty } = require('./src/seed/seed');
const { aiService } = require('./src/ai/aiService');

async function start() {
  await connectDB();
  if (config.autoSeed) await seedIfEmpty();

  const server = http.createServer(createApp());
  initSocket(server);

  server.listen(config.port, () => {
    const ai = aiService.status;
    logger.info(`API listening on http://localhost:${config.port}`);
    logger.info(`AI provider: ${ai.provider}${ai.model ? ` (${ai.model})` : ' - rule-based fallback only'}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
