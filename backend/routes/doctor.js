const express = require("express");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");
const Doctor = require("../modal/Doctor");
const Appointment = require("../modal/Appointment");

const router = express.Router();

router.get(
  "/list",
  [
    query("search").optional().isString(),
    query("specialization").optional().isString(),
    query("city").optional().isString(),
    query("category").optional().isString(),
    query("minFees").optional().isInt({ min: 0 }),
    query("maxFees").optional().isInt({ min: 0 }),
    query("sortBy")
      .optional()
      .isIn(["fees", "experience", "name", "createdAt"]),
    query("sortOrder").optional().isIn(["asc", "desc"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        search,
        specialization,
        city,
        category,
        minFees,
        maxFees,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const filter = { isVerified: true };
      if (specialization)
        filter.specialization = {
          $regex: `^${specialization}$`,
          $options: "i",
        };
      if (city) filter["hospitalInfo.city"] = { $regex: city, $options: "i" };
      if (category) {
        filter.category = category;
      }

      if (minFees || maxFees) {
        filter.fees = {};
        if (minFees) filter.fees.$gte = Number(minFees);
        if (maxFees) filter.fees.$lte = Number(maxFees);
      }

      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: "i" } },
          { specialization: { $regex: search, $options: "i" } },
          { "hospitalInfo.name": { $regex: search, $options: "i" } },
        ];
      }

      const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        Doctor.find(filter)
          .select("-password -googleId")
          .sort(sort)
          .skip(skip)
          .limit(Number(limit)),
        Doctor.countDocuments(filter),
      ]);

      res.ok(items, "Doctors fetched", {
        page: Number(page),
        limit: Number(limit),
        total,
      });
    } catch (error) {
      console.error("Doctor fetched failed", error);
      res.serverError("Doctor fetched failed", [error.message]);
    }
  }
);

//Get the profile of doctor
router.get("/me", authenticate, requireRole("doctor"), async (req, res) => {
  const doc = await Doctor.findById(req.user._id).select("-password -googleId");
  res.ok(doc, "Profile fetched");
});

//update doctor profile
router.put(
  "/onboarding/update",
  authenticate,
  requireRole("doctor"),
  [
    body("name").optional().notEmpty(),
    body("specialization").optional().notEmpty(),
    body("qualification").optional().notEmpty(),
    body("category").optional().notEmpty(),
    body("experience").optional().isInt({ min: 0 }),
    body("about").optional().isString(),
    body("fees").optional().isInt({ min: 0 }),
    body("hospitalInfo").optional().isObject(),
    body("availabilityRange.startDate").optional().isISO8601(),
    body("availabilityRange.endDate").optional().isISO8601(),
    body("availabilityRange.excludedWeekdays").optional().isArray(),
    body("dailyTimeRanges").isArray({ min: 1 }),
    body("dailyTimeRanges.*.start").isString(),
    body("dailyTimeRanges.*.end").isString(),
    body("slotDurationMinutes").optional().isInt({ min: 5, max: 180 }),
  ],
  validate,
  async (req, res) => {
    try {
      const updated = { ...req.body };
      delete updated.password;
      updated.isVerified = true; //Mark profile as verified on update
      const doc = await Doctor.findByIdAndUpdate(req.user._id, updated, {
        new: true,
      }).select("-password -googleId");
      res.ok(doc, "Profile updated");
    } catch (error) {
      res.serverError("updated failed", [error.message]);
    }
  }
);

//doctor dashboard
router.get(
  "/dashboard",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const doctorId = req.auth.id;
      const now = new Date();

      //Proper date range calculation
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
        0
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      const doctor = await Doctor.findById(doctorId)
        .select("-password -googleId")
        .lean();

      if (!doctor) {
        return res.notFound("Doctor not found");
      }

      //Today's appointment with full population
      const todayAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 });

      //upcoming appointment with full population
      const upcomingAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gt: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 })
        .limit(5);

      const uniquePatientIds = await Appointment.distinct("patientId", {
        doctorId,
      });
      const totalPatients = uniquePatientIds.length;

      const completedAppointmentCount = await Appointment.countDocuments({
        doctorId,
        status: "Completed",
      });

      const totalAppointment = await Appointment.find({
        doctorId,
        status: "Completed",
      });

      const totalRevenue = totalAppointment.reduce(
        (sum, apt) => sum + (apt.fees || doctor.fees || 0),
        0
      );

      const dashboardData = {
        user: {
          name: doctor.name,
          fees: doctor.fees,
          profileImage: doctor.profileImage,
          specialization: doctor.specialization,
          hospitalInfo: doctor.hospitalInfo,
        },
        stats: {
          totalPatients,
          todayAppointments: todayAppointments.length,
          totalRevenue,
          completedAppointments:completedAppointmentCount,
          averageRating: 4.8,
        },
        todayAppointments,
        upcomingAppointments,
        performance: {
          pateintSatisfaction: 4.8,
          completionRate: 98,
          responseTime: "< 2min",
        },
      };

      res.ok(dashboardData,'Dashboard data retrived')
    } catch (error) {
      console.error("Dashboard error", error);
      res.serverError("failed to fetch doctor dashboard", [error.message]);
    }
  }
);

router.get("/:doctorId", validate, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const doctor = await Doctor.findById(doctorId)
      .select("-password -googleId")
      .lean();

    if (!doctor) {
      return res.notFound("Doctor not found");
    }
    res.ok(doctor, "doctor details fetched successfully");
  } catch (error) {
    res.serverError("Fetching doctor failed", [error.message]);
  }
});

module.exports = router;
