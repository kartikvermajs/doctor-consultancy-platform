const { buildPatientContext, buildDoctorContext } = require("../services/contextService");
const { generateReply } = require("../services/aiService");

const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.badRequest("message is required and must be a non-empty string");
    }

    const userId = req.auth.id;
    const userRole = req.auth.type;
    const userName = req.user?.name?.trim() || "there";

    let context = "";
    if (userRole === "doctor") {
      context = await buildDoctorContext(userId);
    } else {
      context = await buildPatientContext(userId);
    }
    
    const reply = await generateReply(context, message.trim(), userName);

    return res.ok({ reply }, "Chat response generated");
  } catch (error) {
    console.error("[chatController] Error:", error);
    return res.serverError("Failed to process chat message", [error.message]);
  }
};

module.exports = { handleChatMessage };
