const OpenAI = require('openai');

let openaiInstance = null;

function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiInstance;
}

module.exports = { getOpenAI };
