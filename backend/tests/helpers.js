// Shared test setup: in-memory MongoDB seeded with the real sample dataset,
// and an AI layer pinned to a fake provider so tests never hit the network.
process.env.NODE_ENV = 'test';
process.env.AI_PROVIDER = 'none';

const mongoose = require('mongoose');
const request = require('supertest');
const { startInMemory } = require('../src/config/db');
const { createApp } = require('../src/app');
const { seedDatabase, DEMO_PASSWORDS } = require('../src/seed/seed');
const { aiService } = require('../src/ai/aiService');
const { LLMClient } = require('../src/ai/llmClient');

async function setup({ withTickets = false } = {}) {
  const uri = await startInMemory();
  await mongoose.connect(uri);
  await seedDatabase({ withTickets });
  return request(createApp());
}

async function teardown() {
  const { disconnectDB } = require('../src/config/db');
  await disconnectDB();
}

async function login(api, email, password = DEMO_PASSWORDS.author) {
  const res = await api.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

const loginAdmin = (api) => login(api, 'admin@bookleaf.pub', DEMO_PASSWORDS.admin);

// Swap the provider behind the shared aiService for the duration of a test.
function useFakeProvider(generate, opts = {}) {
  const original = aiService.client;
  aiService.client = new LLMClient({
    provider: { name: 'fake', model: 'fake-1', generate },
    timeoutMs: opts.timeoutMs ?? 500,
    breakerThreshold: opts.breakerThreshold ?? 3,
    breakerCooldownMs: opts.breakerCooldownMs ?? 60000,
  });
  return () => {
    aiService.client = original;
  };
}

module.exports = { setup, teardown, login, loginAdmin, useFakeProvider, DEMO_PASSWORDS };
