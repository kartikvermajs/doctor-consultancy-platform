const express = require("express");
const Appointment = require("../modal/Appointment");
const upload = require("../middleware/cloudinaryUpload");
const cloudinary = require("../config/cloudinary");
const auth = require("../middleware/auth");

const router = express.Router();




router.post(
  "/:appointmentId/documents",
  auth.authenticate,


  (req, res, next) => {
    console.log("▶ [UPLOAD] Multer upload started");

    let responded = false;


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
        mimetype: file.mimetype || "",
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




router.post(
  "/:appointmentId/documents/register",
  auth.authenticate,
  async (req, res) => {
    try {
      if (req.auth.type !== "doctor") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { appointmentId } = req.params;
      const { url, key, name, mimetype } = req.body;

      if (!url || !key) {
        return res.status(400).json({ message: "url and key are required" });
      }

      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      const doc = {
        url,
        key,
        mimetype: mimetype || "application/pdf",
        type: "other",
        uploadedBy: "doctor",
      };

      appointment.documents.push(doc);
      await appointment.save();

      console.log("✅ [REGISTER] UploadThing doc saved:", key);
      return res.json(doc);
    } catch (error) {
      console.error("🔥 [REGISTER] Error:", error);
      return res.status(500).json({ message: "Failed to register document" });
    }
  }
);




router.delete(
  "/:appointmentId/documents/:key",
  auth.authenticate,
  async (req, res) => {
    try {
      if (req.auth.type !== "doctor") {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { appointmentId, key } = req.params;


      const appointment = await Appointment.findById(appointmentId);
      const doc = appointment?.documents?.find((d) => d.key === key);

      console.log("🗑 [DELETE] Deleting document:", key);


      if (doc && !doc.url?.includes("uploadthing.com") && !doc.url?.includes("ufs.sh")) {
        try {
          await cloudinary.uploader.destroy(key, { invalidate: true });
        } catch (cdnErr) {
          console.warn("⚠️ [DELETE] Cloudinary destroy failed (non-fatal):", cdnErr.message);
        }
      }

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
