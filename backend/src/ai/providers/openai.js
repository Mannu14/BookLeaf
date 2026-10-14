const OpenAI = require('openai');

function createOpenAIProvider({ apiKey, model }) {
  // Retries are handled by our own client so behaviour is identical across providers.
  const client = new OpenAI({ apiKey, maxRetries: 0 });

  return {
    name: 'openai',
    model,
    async generate({ system, user, json, temperature, maxOutputTokens, signal }) {
      const res = await client.chat.completions.create(
        {
          model,
          temperature,
          max_tokens: maxOutputTokens,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          ...(json && { response_format: { type: 'json_object' } }),
        },
        { signal }
      );

      return {
        text: res.choices?.[0]?.message?.content || '',
        usage: {
          input: res.usage?.prompt_tokens ?? null,
          output: res.usage?.completion_tokens ?? null,
        },
      };
    },
  };
}

module.exports = { createOpenAIProvider };
