const { GoogleGenAI } = require('@google/genai');

function createGeminiProvider({ apiKey, model }) {
  const client = new GoogleGenAI({ apiKey });

  return {
    name: 'gemini',
    model,
    async generate({ system, user, json, temperature, maxOutputTokens, signal }) {
      const res = await client.models.generateContent({
        model,
        contents: user,
        config: {
          systemInstruction: system,
          temperature,
          maxOutputTokens,
          responseMimeType: json ? 'application/json' : 'text/plain',
          // Thinking tokens are billed as output and add latency; triage and
          // short drafts do not need them.
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: signal,
        },
      });

      return {
        text: res.text || '',
        usage: {
          input: res.usageMetadata?.promptTokenCount ?? null,
          output: res.usageMetadata?.candidatesTokenCount ?? null,
        },
      };
    },
  };
}

module.exports = { createGeminiProvider };
