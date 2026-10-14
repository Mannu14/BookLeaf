const config = require('../config/config');
const logger = require('../utils/logger');
const { createGeminiProvider } = require('./providers/gemini');
const { createOpenAIProvider } = require('./providers/openai');

class LLMUnavailableError extends Error {}

function resolveProvider(aiConfig = config.ai) {
  const { provider, gemini, openai } = aiConfig;
  const wantsGemini = provider === 'gemini' || provider === 'auto';
  const wantsOpenAI = provider === 'openai' || provider === 'auto';

  if (wantsGemini && gemini.apiKey) return createGeminiProvider(gemini);
  if (wantsOpenAI && openai.apiKey) return createOpenAIProvider(openai);
  return null; // 'none', or no key configured: rule-based fallback only
}

const isRetryable = (err) => {
  const status = err?.status ?? err?.code;
  return status === 429 || (typeof status === 'number' && status >= 500);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Thin wrapper that gives every provider the same production behaviour:
 * hard timeout, one retry on 429/5xx, and a circuit breaker so a provider
 * outage costs us one slow request instead of one per ticket.
 */
class LLMClient {
  constructor({ provider = resolveProvider(), timeoutMs, breakerThreshold, breakerCooldownMs } = {}) {
    this.provider = provider;
    this.timeoutMs = timeoutMs ?? config.ai.timeoutMs;
    this.breakerThreshold = breakerThreshold ?? config.ai.breakerThreshold;
    this.breakerCooldownMs = breakerCooldownMs ?? config.ai.breakerCooldownMs;
    this.failures = 0;
    this.openUntil = 0;
  }

  get enabled() {
    return Boolean(this.provider);
  }

  get status() {
    return {
      provider: this.provider?.name || 'none',
      model: this.provider?.model || null,
      circuitOpen: Date.now() < this.openUntil,
    };
  }

  async generate(request) {
    if (!this.provider) throw new LLMUnavailableError('No AI provider configured');
    if (Date.now() < this.openUntil) throw new LLMUnavailableError('AI provider circuit open');

    const started = Date.now();
    let attempt = 0;

    while (true) {
      attempt += 1;
      try {
        const result = await this.callWithTimeout(request);
        this.failures = 0;
        return {
          ...result,
          provider: this.provider.name,
          model: this.provider.model,
          latencyMs: Date.now() - started,
        };
      } catch (err) {
        if (attempt === 1 && isRetryable(err)) {
          await sleep(400);
          continue;
        }
        this.recordFailure(err);
        throw err;
      }
    }
  }

  async callWithTimeout(request) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await Promise.race([
        this.provider.generate({ ...request, signal: controller.signal }),
        new Promise((_, reject) =>
          controller.signal.addEventListener('abort', () => reject(new Error(`AI request timed out after ${this.timeoutMs}ms`)))
        ),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  recordFailure(err) {
    this.failures += 1;
    logger.warn(`AI call failed (${this.provider.name}, ${this.failures} in a row): ${err.message}`);
    if (this.failures >= this.breakerThreshold) {
      this.openUntil = Date.now() + this.breakerCooldownMs;
      this.failures = 0;
      logger.warn(`AI circuit opened for ${this.breakerCooldownMs}ms`);
    }
  }
}

module.exports = { LLMClient, LLMUnavailableError, resolveProvider };
