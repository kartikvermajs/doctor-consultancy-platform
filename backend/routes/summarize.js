const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Appointment = require("../modal/Appointment");
const { summarizeDocuments } = require("../services/documentSummarizer");

router.post("/:appointmentId/summarize", auth.authenticate, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const force = req.query.force === "true";

    if (req.auth.type !== "patient") {
      return res.status(403).json({ message: "Only patients can request document summaries." });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    if (appointment.patientId.toString() !== req.auth.id.toString()) {
      return res.status(403).json({ message: "Forbidden." });
    }

    if (!force && appointment.documentSummary && appointment.documentSummary.trim().length > 0) {
      return res.json({ summary: appointment.documentSummary, cached: true });
    }

    const summary = await summarizeDocuments(appointment.documents);

    appointment.documentSummary = summary;
    await appointment.save();

    return res.json({ summary, cached: false });
  } catch (error) {
    console.error("[/summarize] Error:", error);
    return res.status(500).json({
      message: "Failed to generate summary. Please try again.",
      error: error.message,
    });
  }
});

module.exports = router;
