const logger = require('../utils/logger');
const { LLMClient } = require('./llmClient');
const { buildTriagePrompt, buildDraftPrompt } = require('./prompts');
const { parseTriage, cleanDraft } = require('./parse');
const { selectSections } = require('./knowledgeBase');
const fallback = require('./fallback');
const { PRIORITY_RANK } = require('../constants');

// Policy floors from the knowledge base that the model is not allowed to go
// below, e.g. "ISBN errors are treated as high priority".
const PRIORITY_FLOOR = { 'ISBN & Metadata Issues': 'High', 'Printing & Quality': 'Medium' };

function applyPriorityFloor(category, priority) {
  const floor = PRIORITY_FLOOR[category.value];
  if (floor && PRIORITY_RANK[priority.value] > PRIORITY_RANK[floor]) {
    return { ...priority, value: floor, reasoning: `${priority.reasoning} Raised to ${floor} per BookLeaf policy.`.trim() };
  }
  return priority;
}

const fallbackMeta = (err) => ({ source: 'fallback', model: 'rules-v1', error: err ? err.message.slice(0, 200) : undefined });

const llmMeta = (res) => ({
  source: res.provider,
  model: res.model,
  latency_ms: res.latencyMs,
  input_tokens: res.usage.input,
  output_tokens: res.usage.output,
});

class AIService {
  constructor(client = new LLMClient()) {
    this.client = client;
  }

  get status() {
    return this.client.status;
  }

  /**
   * Category + priority in a single model call. Never throws: any failure
   * produces a rule-based result so ticket creation is never blocked by AI.
   */
  async triage({ subject, description, book }) {
    let result;
    let meta;
    try {
      const { system, user } = buildTriagePrompt({ subject, description, book });
      const res = await this.client.generate({ system, user, json: true, temperature: 0, maxOutputTokens: 300 });
      result = parseTriage(res.text);
      meta = llmMeta(res);
    } catch (err) {
      if (this.client.enabled) logger.warn(`Triage fell back to rules: ${err.message}`);
      result = fallback.triage({ subject, description, book });
      meta = fallbackMeta(this.client.enabled ? err : null);
    }

    return {
      category: result.category,
      priority: applyPriorityFloor(result.category, result.priority),
      meta,
    };
  }

  /**
   * Draft a reply for an admin to review. Never throws; falls back to a
   * fact-grounded template when the model is unavailable.
   */
  async draftReply({ ticket, author, book, messages = [] }) {
    const { system, user, sections } = buildDraftPrompt({ ticket, author, book, messages });
    try {
      const res = await this.client.generate({ system, user, json: false, temperature: 0.4, maxOutputTokens: 700 });
      return { text: cleanDraft(res.text), kb_sections: sections, meta: llmMeta(res) };
    } catch (err) {
      if (this.client.enabled) logger.warn(`Draft fell back to template: ${err.message}`);
      return {
        text: fallback.draft({ ticket, author, book }),
        kb_sections: selectSections(ticket.category, `${ticket.subject} ${ticket.description}`),
        meta: fallbackMeta(this.client.enabled ? err : null),
      };
    }
  }
}

// Shared instance for the app; tests construct their own with a fake provider.
const aiService = new AIService();

module.exports = { AIService, aiService, applyPriorityFloor };
