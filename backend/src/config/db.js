const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

let memoryServer = null;

async function startInMemory() {
  // Required lazily so production installs never pay for it unless used.
  const { MongoMemoryServer } = require('mongodb-memory-server');
  memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'bookleaf' } });
  return memoryServer.getUri();
}

async function connectDB({ uri = config.mongoUri, allowInMemory = config.allowInMemoryDb } = {}) {
  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
    logger.info(`MongoDB connected (${redact(uri)})`);
    return { inMemory: false };
  } catch (err) {
    if (!allowInMemory) throw err;

    logger.warn(`MongoDB at ${redact(uri)} unreachable (${err.message}). Starting in-memory instance.`);
    const memoryUri = await startInMemory();
    await mongoose.connect(memoryUri);
    logger.info('MongoDB connected (in-memory). Data resets on restart.');
    return { inMemory: true };
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

// Hide credentials when logging connection strings.
function redact(uri) {
  return uri.replace(/\/\/([^@]+)@/, '//***@');
}

module.exports = { connectDB, disconnectDB, startInMemory };
