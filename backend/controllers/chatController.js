/**
 * chatController.js
 * -----------------
 * RESPONSIBILITY: HTTP request/response only.
 *
 * - Validate input
 * - Delegate to services (no business logic here)
 * - Return a clean JSON response
 *
 * Rules enforced here:
 *   ✗ No DB queries
 *   ✗ No string formatting / context building
 *   ✗ No AI calls directly
 */

const { buildPatientContext } = require("../services/contextService");
const { generateReply } = require("../services/aiService");

/**
 * POST /api/chat
 *
 * Expected body:
 *   { message: string }
 *
 * Authenticated via JWT middleware — patient identity comes from req.auth.id
 *
 * Response:
 *   { reply: string }
 */
const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;

    // ── 1. Input validation ───────────────────────────────────────────────
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.badRequest("message is required and must be a non-empty string");
    }

    const patientId = req.auth.id;
    const patientName = req.user?.name || "there";

    // ── 2. Build patient context (DB fetch + formatting) ─────────────────
    const context = await buildPatientContext(patientId);

    // ── 3. Call AI service (stub for now) ────────────────────────────────
    const reply = await generateReply(context, message.trim(), patientName);

    // ── 4. Return response ────────────────────────────────────────────────
    return res.ok({ reply }, "Chat response generated");
  } catch (error) {
    console.error("[chatController] Error handling chat message:", error);
    return res.serverError("Failed to process chat message", [error.message]);
  }
};

module.exports = {
  handleChatMessage,
};
