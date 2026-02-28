const express = require("express");
const Appointment = require("../modal/Appointment");
const { authenticate, requireRole } = require("../middleware/auth");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");

const router = express.Router();

//Doctor's appointment
router.get(
  "/doctor",
  authenticate,
  requireRole("doctor"),
  [
    query("status").optional().isArray().withMessage("Status can be an array"),
    query("status.*")
      .optional()
      .isString()
      .withMessage("Each status must be an string"),
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

      const appointment = await Appointment.find(filter)
        .populate("patientId", "name email phone dob age profileImage")
        .populate(
          "doctorId",
          "name fees phone specialization profileImage hospitalInfo",
        )
        .sort({ slotStartIso: 1, slotEndIso: 1 });

      res.ok(appointment, "Appointment fetched successfully");
    } catch (error) {
      console.error("Doctor appointment fetch error", error);
      (res, serverError("Failed to fetch appointment", [error.message]));
    }
  },
);

//patient appointmnet
router.get(
  "/patient",
  authenticate,
  requireRole("patient"),
  [
    query("status").optional().isArray().withMessage("Status can be an array"),
    query("status.*")
      .optional()
      .isString()
      .withMessage("Each status must be an string"),
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
      const appointment = await Appointment.find(filter)
        .populate(
          "doctorId",
          "name fees phone specialization hospitalInfo profileImage",
        )
        .populate("patientId", "name email profileImage")
        .sort({ slotStartIso: 1, slotEndIso: 1 });

      res.ok(appointment, "Appointment fetched successfully");
    } catch (error) {
      console.error("Patient appointment fetch error", error);
      (res, serverError("Failed to fetch appointment", [error.message]));
    }
  },
);

//Get booked slot for doctor on specific date
router.get("/booked-slots/:doctorId/:date", async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const startDay = new Date(date);
    startDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointment = await Appointment.find({
      doctorId,
      slotStartIso: { $gte: startDay, $lte: endOfDay },
      status: { $ne: "Cancelled" },
    }).select("slotStartIso");

    const bookedSlot = bookedAppointment.map((apt) => apt.slotStartIso);

    res.ok(bookedSlot, "Booked slot retrieved");
  } catch (error) {
    (res, serverError("Failed to fetch booked slot", [error.message]));
  }
});

router.post("/book", authenticate, requireRole("patient"), [
  body("doctorId").isMongoId().withMessage("valid doctor ID is required"),
  body("slotStartIso").isISO8601().withMessage("valid start time is required"),
  body("slotEndIso").isISO8601().withMessage("valid end time is required"),
  body("consultationType")
    .isIn(["Video Consultation", "Voice Call"])
    .withMessage("valid consultation type required"),
  body("symptoms")
    .isString()
    .trim()
    .withMessage("symptoms decsription is required (min 10 char)"),
  body("consultationFees")
    .isNumeric()
    .withMessage("consultationFees is required"),
  body("platformFees").isNumeric().withMessage("platformFees is required"),
  body("totalAmount").isNumeric().withMessage("totalAmount is required"),
  validate,
  
  async (req, res) => {
    try {
      const {
        doctorId,
        slotStartIso,
        slotEndIso,
        date,
        consultationType,
        symptoms,
        consultationFees,
        platformFees,
        totalAmount,
      } = req.body;

      const confictingAppointment = await Appointment.findOne({
        doctorId,
        status: { $in: ["Scheduled", "In Progress"] },
        $or: [
          {
            slotStartIso: { $lt: new Date(slotEndIso) },
            slotEndIso: { $gt: new Date(slotStartIso) },
          },
        ],
      });

      if (confictingAppointment) {
        return res.forbidden("This time slot is alredy booked");
      }

      //Generate unique roomId
      const zegoRoomId = `room_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

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
        consultationFees,
        platformFees,
        totalAmount,
        paymentStatus: "Pending",
        payoutStatus: "Pending",
      });

      await appointment.save();

      await appointment.populate(
        "doctorId",
        "name fees phone specialization hospitalInfo profileImage",
      );
      await appointment.populate("patientId", "name email");

      res.created(appointment, "Appointment booked successfully");
    } catch (error) {
      console.error("Book appointment error", error);
      (res, serverError("Failed to book appointment", [error.message]));
    }
  },
]);

//Join
router.get("/join/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name ")
      .populate("doctorId", "name");

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    appointment.status = "In Progress";
    await appointment.save();

    res.ok(
      { roomId: appointment.zegoRoomId, appointment },
      "Consultation joined successfully",
    );
  } catch (error) {
    console.error("Join consultation error", error);
    (res, serverError("Failed to Join consultation", [error.message]));
  }
});

//End
router.put(
  "/end/:id",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { prescriptionText, notes } = req.body;

      const appointment = await Appointment.findById(req.params.id);

      if (!appointment) return res.notFound("Appointment not found");

      if (appointment.doctorId.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }

      appointment.status = "Completed";
      appointment.prescriptionText = prescriptionText || "";
      appointment.notes = notes || "";

      await appointment.save();

      res.ok(appointment, "Consultation completed");
    } catch (error) {
      res.serverError("Failed to complete consultation", [error.message]);
    }
  },
);

//update appointment status by doctor
router.put(
  "/status/:id",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { status } = req.body;
      const appointment = await Appointment.findById(req.params.id).populate(
        "patientId doctorId",
      );

      if (!appointment) {
        return res.notFound("Appointment not found");
      }

      if (appointment.doctorId._id.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }

      appointment.status = status;
      appointment.updatedAt = new Date();
      await appointment.save();

      res.ok(appointment, "Appointment status updated successfully");
    } catch (error) {
      console.error("updated Appointment status error", error);
      (res,
        serverError("Failed to updated Appointment status", [error.message]));
    }
  },
);

//Get single appointment by id

router.get("/:id", authenticate, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patientId", "name email phone dob age profileImage")
      .populate(
        "doctorId",
        "name fees phone specialization hospitalInfo profileImage",
      );

    if (!appointment) {
      return res.notFound("Appointment not found");
    }

    //check if user has access to this appointment
    const userRole = req.auth.type;
    if (
      userRole === "doctor" &&
      appointment.doctorId._id.toString() !== req.auth.id
    ) {
      return res.forbidden("Access denied");
    }

    if (
      userRole === "patient" &&
      appointment.patientId._id.toString() !== req.auth.id
    ) {
      return res.forbidden("Access denied");
    }

    res.ok({ appointment }, "Appointment fetched successfully");
  } catch (error) {
    console.error("Get appointment error", error);
    (res, serverError("Failed to Get appointment", [error.message]));
  }
});

router.post(
  "/:id/documents",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { files } = req.body;

      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.notFound("Appointment not found");

      if (appointment.doctorId.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }

      appointment.documents.push(
        ...files.map((f) => ({
          url: f.url,
          key: f.key,
          type: f.type || "other",
        })),
      );

      await appointment.save();
      res.ok(appointment, "Documents added");
    } catch (err) {
      res.serverError("Failed to add documents", [err.message]);
    }
  },
);

router.delete(
  "/:id/documents/:key",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const { id, key } = req.params;

      const appointment = await Appointment.findById(id);
      if (!appointment) return res.notFound("Appointment not found");

      appointment.documents = appointment.documents.filter(
        (doc) => doc.key !== key,
      );

      await appointment.save();
      res.ok(appointment, "Document deleted");
    } catch (err) {
      res.serverError("Failed to delete document", [err.message]);
    }
  },
);

module.exports = router;
