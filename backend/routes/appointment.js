const express = require("express");
const Appointment = require("../modal/Appointment");
const { authenticate, requireRole } = require("../middleware/auth");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");

const router = express.Router();

router.get(
  "/doctor",
  authenticate,
  requireRole("doctor"),
  [
    query("status").optional().isArray(),
    query("status.*").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { status } = req.query;
      const filter = { doctorId: req.auth.id };
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        filter.status = { $in: statusArray };
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await Appointment.updateMany(
        { doctorId: req.auth.id, status: "In Progress", slotEndIso: { $lt: oneHourAgo } },
        { $set: { status: "Completed", doctorEnded: true } }
      );

      const appointments = await Appointment.find(filter)
        .populate("patientId", "name email phone dob age profileImage")
        .populate("doctorId", "name fees phone specialization profileImage hospitalInfo")
        .sort({ slotStartIso: 1, slotEndIso: 1 });

      res.ok(appointments, "Appointments fetched successfully");
    } catch (error) {
      console.error("Doctor appointment fetch error", error);
      res.serverError("Failed to fetch appointments", [error.message]);
    }
  },
);

router.get(
  "/patient",
  authenticate,
  requireRole("patient"),
  [
    query("status").optional().isArray(),
    query("status.*").optional().isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const { status } = req.query;
      const filter = { patientId: req.auth.id };
      if (status) {
        const statusArray = Array.isArray(status) ? status : [status];
        filter.status = { $in: statusArray };
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await Appointment.updateMany(
        { patientId: req.auth.id, status: "In Progress", slotEndIso: { $lt: oneHourAgo } },
        { $set: { status: "Completed", doctorEnded: true } }
      );

      const appointments = await Appointment.find(filter)
        .populate("doctorId", "name fees phone specialization hospitalInfo profileImage")
        .populate("patientId", "name email profileImage")
        .sort({ slotStartIso: 1, slotEndIso: 1 });

      res.ok(appointments, "Appointments fetched successfully");
    } catch (error) {
      console.error("Patient appointment fetch error", error);
      res.serverError("Failed to fetch appointments", [error.message]);
    }
  },
);

router.get("/booked-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const startDay = new Date(date);
    startDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctorId,
      slotStartIso: { $gte: startDay, $lte: endOfDay },
      status: { $ne: "Cancelled" },
    }).select("slotStartIso");

    res.ok(bookedAppointments.map((a) => a.slotStartIso), "Booked slots retrieved");
  } catch (error) {
    res.serverError("Failed to fetch booked slots", [error.message]);
  }
});

router.post(
  "/book",
  authenticate,
  requireRole("patient"),
  [
    body("doctorId").isMongoId(),
    body("slotStartIso").isISO8601(),
    body("slotEndIso").isISO8601(),
    body("consultationType").isIn(["Video Consultation", "Voice Call"]),
    body("symptoms").isString().trim(),
    body("consultationFees").isNumeric(),
    body("platformFees").isNumeric(),
    body("totalAmount").isNumeric(),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        doctorId, slotStartIso, slotEndIso, date,
        consultationType, symptoms, consultationFees,
        platformFees, totalAmount,
      } = req.body;

      const conflicting = await Appointment.findOne({
        doctorId,
        status: { $in: ["Scheduled", "In Progress"] },
        $or: [{ slotStartIso: { $lt: new Date(slotEndIso) }, slotEndIso: { $gt: new Date(slotStartIso) } }],
      });

      if (conflicting) return res.forbidden("This time slot is already booked");

      const zegoRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const appointment = new Appointment({
        doctorId,
        patientId: req.auth.id,
        date: new Date(date),
        slotStartIso: new Date(slotStartIso),
        slotEndIso: new Date(slotEndIso),
        consultationType,
        symptoms,
        zegoRoomId,
        status: "Scheduled",
        doctorEnded: false,
        consultationFees,
        platformFees,
        totalAmount,
        paymentStatus: "Pending",
      });

      await appointment.save();
      await appointment.populate("doctorId", "name fees phone specialization hospitalInfo profileImage");
      await appointment.populate("patientId", "name email");

      res.created(appointment, "Appointment booked successfully");
    } catch (error) {
      console.error("Book appointment error", error);
      res.serverError("Failed to book appointment", [error.message]);
    }
  },
);

router.get("/join/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name")
      .populate("doctorId", "name");

    if (!appointment) return res.notFound("Appointment not found");

    if (appointment.doctorEnded && req.auth.type === "patient") {
      return res.status(403).json({
        success: false,
        code: "SESSION_ENDED_BY_DOCTOR",
        message: "The doctor has ended this session. You cannot rejoin.",
      });
    }

    appointment.status = "In Progress";
    await appointment.save();

    res.ok(
      { roomId: appointment.zegoRoomId, appointment },
      "Consultation joined successfully",
    );
  } catch (error) {
    console.error("Join consultation error", error);
    res.serverError("Failed to join consultation", [error.message]);
  }
});

router.put("/end/:id", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const { prescriptionText, notes } = req.body;

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.notFound("Appointment not found");

    if (appointment.doctorId.toString() !== req.auth.id)
      return res.forbidden("Access denied");

    appointment.status = "Completed";
    appointment.doctorEnded = true;
    appointment.prescriptionText = prescriptionText || "";
    appointment.notes = notes || "";

    await appointment.save();

    res.ok(appointment, "Consultation completed");
  } catch (error) {
    res.serverError("Failed to complete consultation", [error.message]);
  }
});

router.put("/status/:id", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const { status } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate("patientId doctorId");

    if (!appointment) return res.notFound("Appointment not found");
    if (appointment.doctorId._id.toString() !== req.auth.id)
      return res.forbidden("Access denied");

    appointment.status = status;
    await appointment.save();

    res.ok(appointment, "Appointment status updated successfully");
  } catch (error) {
    console.error("Update appointment status error", error);
    res.serverError("Failed to update appointment status", [error.message]);
  }
});

router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email phone dob age profileImage")
      .populate("doctorId", "name fees phone specialization hospitalInfo profileImage");

    if (!appointment) return res.notFound("Appointment not found");

    const userRole = req.auth.type;
    if (userRole === "doctor" && appointment.doctorId._id.toString() !== req.auth.id)
      return res.forbidden("Access denied");
    if (userRole === "patient" && appointment.patientId._id.toString() !== req.auth.id)
      return res.forbidden("Access denied");

    res.ok({ appointment }, "Appointment fetched successfully");
  } catch (error) {
    console.error("Get appointment error", error);
    res.serverError("Failed to get appointment", [error.message]);
  }
});

router.post("/:id/documents", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const { files } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.notFound("Appointment not found");
    if (appointment.doctorId.toString() !== req.auth.id)
      return res.forbidden("Access denied");

    appointment.documents.push(
      ...files.map((f) => ({ url: f.url, key: f.key, type: f.type || "other" }))
    );

    await appointment.save();
    res.ok(appointment, "Documents added");
  } catch (err) {
    res.serverError("Failed to add documents", [err.message]);
  }
});

router.delete("/:id/documents/:key", authenticate, requireRole("doctor"), async (req, res) => {
  try {
    const { id, key } = req.params;
    const appointment = await Appointment.findById(id);
    if (!appointment) return res.notFound("Appointment not found");

    appointment.documents = appointment.documents.filter((doc) => doc.key !== key);
    await appointment.save();
    res.ok(appointment, "Document deleted");
  } catch (err) {
    res.serverError("Failed to delete document", [err.message]);
  }
});

module.exports = router;
