const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';

const bool = (value, fallback) => {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const list = (value) =>
  String(value || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && isProduction) {
  // Refuse to boot with a guessable signing key in production.
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

const config = {
  env,
  isProduction,
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5000,

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bookleaf',
  // When the primary MongoDB is unreachable, boot an in-memory instance so the
  // app is still demoable. Disable this in real production deployments.
  allowInMemoryDb: bool(process.env.ALLOW_IN_MEMORY_DB, !isProduction),
  // Seed the sample dataset automatically when the database is empty.
  autoSeed: bool(process.env.AUTO_SEED, true),

  jwtSecret: jwtSecret || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigins: list(process.env.CLIENT_URL || 'http://localhost:5173,http://127.0.0.1:5173'),

  // Exposes the public demo account list used by the login screen's quick switcher.
  demoMode: bool(process.env.DEMO_MODE, true),

  ai: {
    // 'auto' picks the first provider with an API key (gemini, then openai).
    provider: (process.env.AI_PROVIDER || 'auto').toLowerCase(),
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 12000,
    // After this many consecutive provider failures we stop calling the API for
    // `cooldownMs` and go straight to the rule-based fallback.
    breakerThreshold: Number(process.env.AI_BREAKER_THRESHOLD) || 3,
    breakerCooldownMs: Number(process.env.AI_BREAKER_COOLDOWN_MS) || 60000,
  },
};

module.exports = config;
