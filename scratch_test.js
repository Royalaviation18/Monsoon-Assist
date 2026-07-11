const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key found in backend/.env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    console.log("Listing available models for your API key...");
    // Let's test calling generateContent with gemini-1.5-flash-latest
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent("Say hello!");
    console.log("SUCCESS with 'gemini-1.5-flash-latest':", result.response.text());
  } catch (err) {
    console.error("FAILED with 'gemini-1.5-flash-latest':", err.message);
    
    // Let's try gemini-1.5-pro-latest
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
      const result = await model.generateContent("Say hello!");
      console.log("SUCCESS with 'gemini-1.5-pro-latest':", result.response.text());
    } catch (errPro) {
      console.error("FAILED with 'gemini-1.5-pro-latest':", errPro.message);
    }
  }
}

run();
