const { buildPatientContext, buildDoctorContext } = require("../services/contextService");
const { generateReplyStream } = require("../services/aiService");

const handleChatMessage = async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "message is required and must be a non-empty string" });
  }

  const userId = req.auth.id;
  const userRole = req.auth.type;
  const userName = req.user?.name?.trim() || "there";

  // Set SSE / chunked transfer headers BEFORE building context
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering if present
  res.flushHeaders();

  try {
    let context = "";
    if (userRole === "doctor") {
      context = await buildDoctorContext(userId);
    } else {
      context = await buildPatientContext(userId);
    }

    // Pass history for multi-turn conversational context (exclude the current message — it's passed separately)
    const historyWithoutCurrent = Array.isArray(history) ? history.slice(0, -1) : [];

    await generateReplyStream(context, message.trim(), userName, res, historyWithoutCurrent);
  } catch (error) {
    console.error("[chatController] Error:", error);
    res.write("I'm having trouble connecting to the AI service right now. Please try again in a moment.");
    res.end();
  }
};

module.exports = { handleChatMessage };
