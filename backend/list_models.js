const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();
const key = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(key);

async function list() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await response.json();
  const embedModels = data.models.filter(m => m.supportedGenerationMethods.includes('embedContent'));
  console.log(embedModels.map(m => m.name));
}
list();
