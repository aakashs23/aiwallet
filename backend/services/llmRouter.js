const { callGemini } = require("./gemini");
const { callOpenRouter } = require("./openRouter");

exports.callLLM = async (prompt) => {

  // 🥇 PRIMARY — Gemini
  try {
    console.log("🧠 Using Gemini...");
    return await callGemini(prompt);

  } catch (err) {
    console.log("⚠️ Gemini failed → switching to OpenRouter");
  }

  // 🥈 FALLBACK — OpenRouter
  try {
    console.log("🧠 Using OpenRouter...");
    return await callOpenRouter(prompt);

  } catch (err) {
    console.log("⚠️ OpenRouter also failed");
    throw new Error("All LLMs failed");
  }
};