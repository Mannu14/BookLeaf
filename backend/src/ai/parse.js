const { CATEGORIES, PRIORITIES } = require('../constants');

// Models occasionally wrap JSON in code fences or add a preamble even in JSON
// mode. Pull out the first object and parse that.
function extractJson(text) {
  if (!text) throw new Error('Empty model response');
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

const matchEnum = (value, options) => {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return options.find((o) => o.toLowerCase() === v) || options.find((o) => o.toLowerCase().startsWith(v.split(' ')[0])) || null;
};

const clampConfidence = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  return Math.min(1, Math.max(0, num > 1 ? num / 100 : num));
};

// Validate the triage payload against our enums. Anything we cannot map is
// rejected so the caller falls back, rather than storing a bogus category.
function parseTriage(text) {
  const raw = extractJson(text);
  const category = matchEnum(raw.category, CATEGORIES);
  const priority = matchEnum(raw.priority, PRIORITIES);
  if (!category) throw new Error(`Model returned unknown category: ${raw.category}`);
  if (!priority) throw new Error(`Model returned unknown priority: ${raw.priority}`);

  return {
    category: {
      value: category,
      confidence: clampConfidence(raw.category_confidence),
      reasoning: String(raw.category_reasoning || '').slice(0, 300),
    },
    priority: {
      value: priority,
      confidence: clampConfidence(raw.priority_confidence),
      reasoning: String(raw.priority_reasoning || '').slice(0, 300),
    },
  };
}

// Light clean-up of a free-text draft: strip markdown emphasis and stray fences.
function cleanDraft(text) {
  const draft = String(text || '')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#+\s*/gm, '')
    .trim();
  if (draft.length < 40) throw new Error('Model draft too short');
  return draft;
}

module.exports = { extractJson, parseTriage, cleanDraft };
