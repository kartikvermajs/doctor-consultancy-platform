const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require("../config/cloudinary");
const OpenAI = require("openai");
const pdfParse = require("pdf-parse");

let genAI = null;
let openRouterClient = null;

const getGenAI = () => {
  if (genAI) return genAI;
  const key = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  genAI = new GoogleGenerativeAI(key);
  return genAI;
};

const getOpenRouterClient = () => {
  if (openRouterClient) return openRouterClient;
  if (!process.env.OPEN_ROUTER) throw new Error("OPEN_ROUTER key not set");
  openRouterClient = new OpenAI({
    apiKey: process.env.OPEN_ROUTER,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Doctor Consultancy Platform",
    },
  });
  return openRouterClient;
};

const OPENROUTER_VISION_MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

const SUMMARY_PROMPT = `You are a friendly medical document assistant helping a patient understand their medical records.

Look at ALL the documents/text provided (PDFs and images) and extract any visible text, medical terms, diagnoses, medications, dosages, instructions, or test results.

Then write a clear, plain-English summary that:
- Uses simple, everyday language (avoid jargon)
- Is structured with short bullet points
- Covers: what documents were found, key medical information, any medications or dosages, instructions for the patient, and any important dates or values
- Ends with a friendly reminder to ask their doctor if anything is unclear

Keep it concise and easy to read. Do NOT use markdown headers, just use bullet points.`.trim();

const extractCloudinaryPublicId = (url) => {
  try {
    const match = url.match(/\/(?:image|raw|video)\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

const fetchUrlAsBase64 = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } finally {
    clearTimeout(timer);
  }
};

const fetchUrlWithSignedFallback = async (url, mimeType) => {
  try {
    return await fetchUrlAsBase64(url);
  } catch (firstErr) {
    console.warn(`[summarizer] Direct fetch failed: ${firstErr.message}. Trying signed URL…`);
    const publicId = extractCloudinaryPublicId(url);
    if (!publicId) throw firstErr;
    const resourceType = mimeType === "application/pdf" ? "raw" : "image";
    const signedUrl = cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      sign_url: true,
      type: "upload",
    });
    return await fetchUrlAsBase64(signedUrl);
  }
};

const getMimeType = (url, mimetype) => {
  if (mimetype && mimetype !== "") return mimetype;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf") || lower.includes("/raw/upload/")) return "application/pdf";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".gif")) return "image/gif";
  return "image/jpeg";
};

const isRateLimited = (err) => {
  const status = err?.status ?? err?.response?.status;
  return status === 429 || String(err?.message ?? "").includes("429");
};

const summarizeWithGemini = async (documents) => {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const parts = [{ text: SUMMARY_PROMPT }];
  let skipped = 0;

  for (const doc of documents) {
    const mimeType = getMimeType(doc.url, doc.mimetype);
    try {
      const buffer = await fetchUrlWithSignedFallback(doc.url, mimeType);
      parts.push({
        inlineData: {
          data: buffer.toString("base64"),
          mimeType,
        },
      });
    } catch (err) {
      console.warn(`[summarizer] Skipped ${doc.key}: ${err.message}`);
      skipped++;
    }
  }

  if (parts.length === 1) {
    return { text: null, skipped, allSkipped: true };
  }

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const text = result.response.text()?.trim();
  if (!text) throw new Error("Gemini returned empty summary");
  return { text, skipped, allSkipped: false };
};

const summarizeWithOpenRouter = async (documents) => {
  const client = getOpenRouterClient();

  const textParts = [];
  let skipped = 0;
  const imageUrls = [];

  for (const doc of documents) {
    const mimeType = getMimeType(doc.url, doc.mimetype);

    if (mimeType === "application/pdf") {
      try {
        const buffer = await fetchUrlWithSignedFallback(doc.url, mimeType);
        const parsed = await pdfParse(buffer);
        const extractedText = parsed.text?.trim();
        if (extractedText && extractedText.length > 30) {
          textParts.push(`[PDF Document: ${doc.key}]\n${extractedText.slice(0, 8000)}`);
          console.log(`[summarizer] OpenRouter: PDF text extracted (${extractedText.length} chars)`);
        } else {
          console.warn(`[summarizer] OpenRouter: PDF ${doc.key} yielded no readable text`);
          skipped++;
        }
      } catch (err) {
        console.warn(`[summarizer] OpenRouter: PDF fetch/parse failed for ${doc.key}: ${err.message}`);
        skipped++;
      }
    } else {
      imageUrls.push({ url: doc.url, key: doc.key, mimeType });
    }
  }

  const userContent = [];

  if (textParts.length > 0) {
    userContent.push({
      type: "text",
      text: SUMMARY_PROMPT + "\n\nEXTRACTED DOCUMENT TEXT:\n\n" + textParts.join("\n\n---\n\n"),
    });
  } else {
    userContent.push({ type: "text", text: SUMMARY_PROMPT });
  }

  for (const img of imageUrls) {
    userContent.push({
      type: "image_url",
      image_url: { url: img.url },
    });
  }

  if (userContent.length === 1 && textParts.length === 0) {
    return { text: null, skipped: documents.length, allSkipped: true };
  }

  let lastErr;
  for (const modelId of OPENROUTER_VISION_MODELS) {
    try {
      console.log(`[summarizer] OpenRouter → ${modelId}`);
      const res = await client.chat.completions.create({
        model: modelId,
        messages: [{ role: "user", content: userContent }],
      });
      const text = res.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response");
      console.log(`[summarizer] ✓ OpenRouter ${modelId}`);
      return { text, skipped, allSkipped: false };
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? "";
      console.warn(`[summarizer] OpenRouter ${modelId} failed (${status || err.message})`);
      if (status === 404 || status === 400) continue;
      if (isRateLimited(err)) continue;
      break;
    }
  }

  throw lastErr || new Error("All OpenRouter models failed");
};

const buildFinalText = ({ text, skipped }) => {
  if (!text) return null;
  if (skipped > 0) {
    return `${text}\n\n⚠️ Note: ${skipped} document${skipped > 1 ? "s were" : " was"} unreadable and skipped.`;
  }
  return text;
};

const summarizeDocuments = async (documents) => {
  if (!documents || documents.length === 0) {
    return "No documents are attached to this appointment yet.";
  }

  try {
    console.log("[summarizer] Trying Gemini native SDK…");
    const result = await summarizeWithGemini(documents);
    if (result.allSkipped) {
      console.warn("[summarizer] Gemini: all docs skipped, trying OpenRouter…");
    } else {
      return buildFinalText(result);
    }
  } catch (geminiErr) {
    if (isRateLimited(geminiErr)) {
      console.warn(`[summarizer] Gemini rate-limited. Falling back to OpenRouter…`);
    } else {
      console.warn(`[summarizer] Gemini failed (${geminiErr.message}). Falling back to OpenRouter…`);
    }
  }

  try {
    console.log("[summarizer] Trying OpenRouter fallback…");
    const result = await summarizeWithOpenRouter(documents);
    if (result.allSkipped) {
      return "Sorry, we could not read any of the attached documents. They may be protected or in an unreadable format. Please ask your doctor to re-upload them.";
    }
    return buildFinalText(result);
  } catch (openRouterErr) {
    console.error(`[summarizer] OpenRouter also failed: ${openRouterErr.message}`);
    if (isRateLimited(openRouterErr)) {
      return "The AI summarizer is temporarily busy. Please try again in a minute.";
    }
    return "Sorry, we were unable to generate a summary right now. Please try again later.";
  }
};

module.exports = { summarizeDocuments };
