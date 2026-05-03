const express = require("express");
const { query, body } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");
const Doctor = require("../modal/Doctor");
const Appointment = require("../modal/Appointment");
const Review = require("../modal/Review");
const mongoose = require("mongoose");

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

      const [doctors, total] = await Promise.all([
        Doctor.find(filter)
          .select("-password -googleId")
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Doctor.countDocuments(filter),
      ]);


      const doctorIds = doctors.map((d) => d._id);
      const ratingAgg = await Review.aggregate([
        { $match: { doctorId: { $in: doctorIds } } },
        {
          $group: {
            _id: "$doctorId",
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const ratingMap = {};
      ratingAgg.forEach((r) => {
        ratingMap[r._id.toString()] = {
          avgRating: Math.round(r.avgRating * 10) / 10,
          totalReviews: r.totalReviews,
        };
      });

      const items = doctors.map((d) => ({
        ...d,
        avgRating: ratingMap[d._id.toString()]?.avgRating ?? null,
        totalReviews: ratingMap[d._id.toString()]?.totalReviews ?? 0,
      }));

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


router.get("/me", authenticate, requireRole("doctor"), async (req, res) => {
  const doc = await Doctor.findById(req.user._id).select("-password -googleId");
  res.ok(doc, "Profile fetched");
});


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
      updated.isVerified = true; 
      const doc = await Doctor.findByIdAndUpdate(req.user._id, updated, {
        new: true,
      }).select("-password -googleId");
      res.ok(doc, "Profile updated");
    } catch (error) {
      res.serverError("updated failed", [error.message]);
    }
  }
);


router.get(
  "/dashboard",
  authenticate,
  requireRole("doctor"),
  async (req, res) => {
    try {
      const Review = require("../modal/Review");
      const doctorId = req.auth.id;
      const now = new Date();


      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0, 0, 0, 0
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23, 59, 59, 999
      );

      const doctor = await Doctor.findById(doctorId)
        .select("-password -googleId")
        .lean();

      if (!doctor) {
        return res.notFound("Doctor not found");
      }


      const todayAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 });


      const upcomingAppointments = await Appointment.find({
        doctorId,
        slotStartIso: { $gt: endOfDay },
        status: { $ne: "Cancelled" },
      })
        .populate("patientId", "name profileImage age email phone")
        .populate("doctorId", "name fees profileImage specialization")
        .sort({ slotStartIso: 1 })
        .limit(5);

      const uniquePatientIds = await Appointment.distinct("patientId", { doctorId });
      const totalPatients = uniquePatientIds.length;

      const totalAppointmentCount = await Appointment.countDocuments({ doctorId, status: { $ne: "Cancelled" } });
      const completedAppointmentCount = await Appointment.countDocuments({ doctorId, status: "Completed" });

      const completedAppointments = await Appointment.find({ doctorId, status: "Completed" });
      const totalRevenue = completedAppointments.reduce(
        (sum, apt) => sum + (apt.consultationFees || doctor.fees || 0),
        0
      );


      const ratingAgg = await Review.aggregate([
        { $match: { doctorId: new (require("mongoose").Types.ObjectId)(doctorId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const averageRating =
        ratingAgg.length > 0
          ? Math.round(ratingAgg[0].averageRating * 10) / 10
          : 0;
      const totalReviews = ratingAgg.length > 0 ? ratingAgg[0].totalReviews : 0;


      const recentReviews = await Review.find({ doctorId })
        .populate("patientId", "name profileImage email")
        .populate("appointmentId", "_id slotStartIso consultationType")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();


      const completionRate =
        totalAppointmentCount > 0
          ? Math.round((completedAppointmentCount / totalAppointmentCount) * 100)
          : 0;

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
          completedAppointments: completedAppointmentCount,
          averageRating,
          totalReviews,
        },
        todayAppointments,
        upcomingAppointments,
        recentReviews,
        performance: {
          patientSatisfaction: averageRating,
          totalReviews,
          completionRate: `${completionRate}%`,
          responseTime: "< 2min",
        },
      };

      res.ok(dashboardData, "Dashboard data retrieved");
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
