const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API key found in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function run() {
  try {
    console.log("Probing with 'gemini-1.5-flash-latest'...");
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const result = await model.generateContent("Say hello!");
    console.log("SUCCESS with 'gemini-1.5-flash-latest':", result.response.text());
    process.exit(0);
  } catch (err) {
    console.error("FAILED with 'gemini-1.5-flash-latest':", err.message);
    
    try {
      console.log("Probing with 'gemini-1.5-flash'...");
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent("Say hello!");
      console.log("SUCCESS with 'gemini-1.5-flash':", result.response.text());
      process.exit(0);
    } catch (err2) {
      console.error("FAILED with 'gemini-1.5-flash':", err2.message);
      
      try {
        console.log("Probing with 'gemini-1.5-pro-latest'...");
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
        const result = await model.generateContent("Say hello!");
        console.log("SUCCESS with 'gemini-1.5-pro-latest':", result.response.text());
        process.exit(0);
      } catch (errPro) {
        console.error("FAILED with 'gemini-1.5-pro-latest':", errPro.message);
        
        try {
          console.log("Probing with 'gemini-pro'...");
          const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
          const result = await model.generateContent("Say hello!");
          console.log("SUCCESS with 'gemini-pro':", result.response.text());
          process.exit(0);
        } catch (errOldPro) {
          console.error("FAILED with 'gemini-pro':", errOldPro.message);
        }
      }
    }
  }
}

run();
