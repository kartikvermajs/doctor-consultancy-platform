const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require("../config/cloudinary");

let genAI = null;

const getGenAI = () => {
  if (genAI) return genAI;
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
};

const SUMMARY_PROMPT = `
You are a friendly medical document assistant helping a patient understand their medical records.

Look at ALL the documents provided (PDFs and images) and extract any visible text, medical terms, diagnoses, medications, dosages, instructions, or test results.

Then write a clear, plain-English summary that:
- Uses simple, everyday language (avoid jargon)
- Is structured with short bullet points
- Covers: what documents were found, key medical information, any medications or dosages, instructions for the patient, and any important dates or values
- Ends with a friendly reminder to ask their doctor if anything is unclear

Keep it concise and easy to read. Do NOT use markdown headers, just use bullet points.
`.trim();

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
    return Buffer.from(buffer).toString("base64");
  } finally {
    clearTimeout(timer);
  }
};

const buildSignedCloudinaryUrl = (publicId, resourceType = "raw") => {
  try {
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      secure: true,
      sign_url: true,
      type: "upload",
    });
  } catch {
    return null;
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

const summarizeDocuments = async (documents) => {
  if (!documents || documents.length === 0) {
    return "No documents are attached to this appointment yet.";
  }

  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

  const parts = [{ text: SUMMARY_PROMPT }];
  let skipped = 0;

  for (const doc of documents) {
    const mimeType = getMimeType(doc.url, doc.mimetype);

    let base64Data = null;

    try {
      base64Data = await fetchUrlAsBase64(doc.url);
    } catch (firstErr) {
      console.warn(`[summarizer] Direct fetch failed for ${doc.key}: ${firstErr.message}. Trying signed URL…`);

      const publicId = extractCloudinaryPublicId(doc.url);
      if (publicId) {
        const resourceType = mimeType === "application/pdf" ? "raw" : "image";
        const signedUrl = buildSignedCloudinaryUrl(publicId, resourceType);
        if (signedUrl) {
          try {
            base64Data = await fetchUrlAsBase64(signedUrl);
          } catch (secondErr) {
            console.warn(`[summarizer] Signed URL also failed for ${doc.key}: ${secondErr.message}. Skipping.`);
          }
        }
      }
    }

    if (!base64Data) {
      skipped++;
      continue;
    }

    parts.push({
      inlineData: {
        data: base64Data,
        mimeType,
      },
    });
  }

  if (parts.length === 1) {
    return skipped > 0
      ? "Sorry, we could not read any of the attached documents. They may be protected or inaccessible. Please ask your doctor to share the documents again, or contact support."
      : "No readable content was found in the attached documents.";
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });

  const text = result.response.text();

  if (!text || !text.trim()) {
    throw new Error("Gemini returned an empty summary");
  }

  let finalText = text.trim();
  if (skipped > 0) {
    finalText += `\n\n⚠️ Note: ${skipped} document${skipped > 1 ? "s were" : " was"} unreadable and skipped.`;
  }

  return finalText;
};

module.exports = { summarizeDocuments };
