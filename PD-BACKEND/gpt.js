// Import the GPT4All model loader
const { loadModel } = require("gpt4all");

// Store the loaded model in memory so we only load it once
let model = null;

// Loads the GPT4All Falcon model if not already loaded
async function loadFalconModel() {
  if (!model) {
    model = await loadModel("gpt4all-falcon-newbpe-q4_0.gguf", {
      verbose: true,
    });
  }
  return model;
}

// Generate a podcast script for a given topic using the AI model
async function generateScript(topic) {
  await loadFalconModel();

  // Prompt the AI to write a podcast script (third person, no roleplay, no preamble)
  const prompt = `
Write a friendly podcast script about: "${topic}".
- Do not pretend to be the person or use first-person narration.
- Write in third person about the topic.
- Use natural, spoken English with contractions.
- Don't include bullet points, titles, markdown, or a closing summary.
- Keep it under 1000 words.
- No guest dialogue or host names.
- If you do not know real facts about the topic, say so or keep the script general. Do not make up details.
- Do not include any introductory phrases like 'Sure, here’s...' or 'I’m your host'. Do not use placeholders like [name]. Start directly with the content.

Start the script now:
`;

  // Generate the script using the model
  const response = await model.generate(prompt, {
    max_tokens: 1024,
    temperature: 0.7,
  });

  // Clean up the script text
  const script = response.text.trim();

  // Warn if the script might be cut off (token limit reached)
  if (script.length > 50 && !/[.!?]$/.test(script)) {
    console.warn("⚠️ Warning: script may have been cut off due to token limits.");
  }

  return script;
}

// Generate a podcast title and 3 bullet points for a topic
async function generateTitleAndBullets(topic) {
  await loadFalconModel();

  // Prompt the AI for a title and 3 bullet points (no preamble, no roleplay)
  const prompt = `
You are a podcast editor.

Generate a short, catchy podcast title and 3 factual, third-person bullet points about the topic: "${topic}".

Rules:
- Title must be the first line (do NOT write "Title here")
- Bullet points must start with "- "
- Each bullet must be a key fact, idea, or takeaway
- Do not use first person or roleplay
- Avoid vague repetition or filler
- Do not include any introductory phrases or explanations. Only output the title and bullet points in the specified format.
- If you do not know real facts about the topic, say so or keep the bullet points general. Do not make up details.

Format:
Your title  
- Bullet 1  
- Bullet 2  
- Bullet 3
`;

  // Generate the title and bullet points
  const response = await model.generate(prompt, {
    max_tokens: 300,
    temperature: 0.6,
  });

  // Clean up the response and split into lines
  const text = response.text.trim();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Get the title (skip placeholder if present)
  const title = lines[0].toLowerCase().includes("title here")
    ? lines[1] || "Untitled Podcast"
    : lines[0] || "Untitled Podcast";

  // Extract up to 3 bullet points
  const bulletPoints = lines
    .slice(1)
    .filter(line => /^(-|Bullet\s*\d+:)/i.test(line))
    .map(line => line.replace(/^(-|Bullet\s*\d+:)\s*/, "").trim())
    .slice(0, 3);

  // Fill in missing bullet points if needed
  while (bulletPoints.length < 3) {
    bulletPoints.push("⚠️ Missing bullet point. Please regenerate.");
  }

  return { title, bulletPoints };
}

// Main function: generate script, title, and bullet points for a topic
async function generateScriptFromGPT4All(topic) {
  // Get the script
  const script = await generateScript(topic);
  // Get the title and bullet points
  const { title, bulletPoints } = await generateTitleAndBullets(topic);

  // Return all podcast data
  return {
    title,
    bulletPoints,
    script,
    rawResponse: script,
  };
}

// Export the main generator and model loader for use in other files
module.exports = { generateScriptFromGPT4All, loadFalconModel };
