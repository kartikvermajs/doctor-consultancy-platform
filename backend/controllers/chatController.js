const { buildPatientContext } = require("../services/contextService");
const { generateReply } = require("../services/aiService");

const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.badRequest("message is required and must be a non-empty string");
    }

    const patientId = req.auth.id;
    const patientName = req.user?.name?.trim() || "there";

    const context = await buildPatientContext(patientId);
    const reply = await generateReply(context, message.trim(), patientName);

    return res.ok({ reply }, "Chat response generated");
  } catch (error) {
    console.error("[chatController] Error:", error);
    return res.serverError("Failed to process chat message", [error.message]);
  }
};

module.exports = { handleChatMessage };
