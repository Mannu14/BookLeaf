const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf',
  jwtSecret: process.env.JWT_SECRET || 'bookleaf_default_secret_key_jwt_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aiProvider: process.env.AI_PROVIDER || 'auto', // 'gemini', 'openai', 'fallback', or 'auto'
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};
