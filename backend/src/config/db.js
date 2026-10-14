const mongoose = require('mongoose');
const config = require('./config');

let memoryServer = null;

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', false);
    
    // Attempt standard connection to specified URI
    console.log(`Connecting to MongoDB at: ${config.mongoUri}...`);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(' MongoDB Connected Successfully to', config.mongoUri);
  } catch (primaryErr) {
    console.warn('⚠️ Could not connect to primary MongoDB URI:', primaryErr.message);
    console.log('🔄 Attempting fallback: Starting in-memory MongoDB server...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'bookleaf',
        },
      });
      const memoryUri = memoryServer.getUri();
      console.log(` In-memory MongoDB started at: ${memoryUri}`);
      
      await mongoose.connect(memoryUri);
      console.log(' MongoDB Connected Successfully (In-Memory Fallback)');
    } catch (fallbackErr) {
      console.error('❌ Failed to start in-memory MongoDB fallback:', fallbackErr.message);
      throw primaryErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log('MongoDB disconnected.');
  } catch (err) {
    console.error('Error during MongoDB disconnect:', err);
  }
};

module.exports = { connectDB, disconnectDB };
