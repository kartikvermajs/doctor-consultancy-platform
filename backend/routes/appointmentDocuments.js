const express = require("express");
const Appointment = require("../modal/Appointment");
const upload = require("../middleware/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/auth");

const router = express.Router();

/* =========================================================
   UPLOAD DOCUMENTS (HARDENED)
   ========================================================= */

router.post(
  "/:appointmentId/documents",
  auth.authenticate,

  /* ---------- Multer wrapper with logging + error handling ---------- */
  (req, res, next) => {
    console.log("▶ [UPLOAD] Multer upload started");

    let responded = false;

    // Safety timeout (30 seconds)
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.error("⏱ [UPLOAD] Timeout exceeded");
        return res.status(504).json({
          message: "Upload timed out. Please try again.",
        });
      }
    }, 60_000);

    upload.array("documents")(req, res, (err) => {
      clearTimeout(timeout);

      if (responded) return;

      if (err) {
        responded = true;
        console.error("❌ [UPLOAD] Multer/Cloudinary error:", err);
        return res.status(400).json({
          message: "File upload failed",
          error: err.message,
        });
      }

      console.log("✔ [UPLOAD] Multer upload finished");
      next();
    });
  },

  /* ---------- Business logic ---------- */
  async (req, res) => {
    try {
      console.log("▶ [UPLOAD] Handler started");

      if (req.auth.type !== "doctor") {
        console.warn("⛔ [UPLOAD] Forbidden: non-doctor");
        return res.status(403).json({ message: "Forbidden" });
      }

      const { appointmentId } = req.params;

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        console.warn("❓ [UPLOAD] Appointment not found:", appointmentId);
        return res.status(404).json({ message: "Appointment not found" });
      }

      if (!req.files || req.files.length === 0) {
        console.warn("📭 [UPLOAD] No files received");
        return res.status(400).json({ message: "No files uploaded" });
      }

      console.log("📦 [UPLOAD] Files received:", req.files.length);

      const docs = req.files.map((file) => ({
        url: file.path,
        key: file.filename,
        type: "other",
        uploadedBy: "doctor",
      }));

      appointment.documents.push(...docs);
      await appointment.save();

      console.log("✅ [UPLOAD] Documents saved to appointment");

      return res.json(docs);
    } catch (error) {
      console.error("🔥 [UPLOAD] Handler error:", error);
      return res.status(500).json({
        message: "Server error during upload",
      });
    }
  },
);

/* =========================================================
   DELETE DOCUMENT (HARDENED)
   ========================================================= */

router.delete(
  "/:appointmentId/documents/:key",
  auth.authenticate,
  async (req, res) => {
    try {
      if (req.auth.type !== "doctor") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { appointmentId, key } = req.params;

      console.log("🗑 [DELETE] Deleting document:", key);

      await cloudinary.uploader.destroy(key, {
        invalidate: true,
      });

      await Appointment.updateOne(
        { _id: appointmentId },
        { $pull: { documents: { key } } },
      );

      console.log("✅ [DELETE] Document deleted");

      return res.json({ success: true });
    } catch (error) {
      console.error("🔥 [DELETE] Error:", error);
      return res.status(500).json({
        message: "Failed to delete document",
      });
    }
  },
);

module.exports = router;
