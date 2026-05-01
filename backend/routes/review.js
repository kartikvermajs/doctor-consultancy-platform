const express = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const { authenticate, requireRole } = require("../middleware/auth");
const Review = require("../modal/Review");
const Appointment = require("../modal/Appointment");

const router = express.Router();

router.post(
  "/",
  authenticate,
  requireRole("patient"),
  [
    body("appointmentId").isMongoId().withMessage("Valid appointment ID required"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment")
      .optional()
      .isString()
      .isLength({ max: 1000 })
      .withMessage("Comment cannot exceed 1000 characters"),
  ],
  validate,
  async (req, res) => {
    try {
      const { appointmentId, rating, comment } = req.body;
      const patientId = req.auth.id;

      
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.notFound("Appointment not found");
      }

      
      if (appointment.status !== "Completed") {
        return res.status(400).json({
          success: false,
          message: "Reviews can only be submitted for completed appointments",
        });
      }

      
      if (appointment.patientId.toString() !== patientId) {
        return res.forbidden(
          "You are not authorised to review this appointment"
        );
      }

      
      const existing = await Review.findOne({ appointmentId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this appointment",
          alreadyReviewed: true,
          review: existing,
        });
      }

      
      const review = await Review.create({
        appointmentId,
        doctorId: appointment.doctorId,
        patientId,
        rating,
        comment: comment?.trim() || "",
      });

      const populated = await review.populate(
        "patientId",
        "name profileImage"
      );

      return res.status(201).json({
        success: true,
        message: "Review submitted successfully",
        data: populated,
        alreadyReviewed: false,
      });
    } catch (error) {
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this appointment",
          alreadyReviewed: true,
        });
      }
      console.error("Review submit error:", error);
      res.serverError("Failed to submit review", [error.message]);
    }
  }
);

router.get(
  "/appointment/:appointmentId",
  authenticate,
  [param("appointmentId").isMongoId()],
  validate,
  async (req, res) => {
    try {
      const review = await Review.findOne({
        appointmentId: req.params.appointmentId,
      }).populate("patientId", "name profileImage");

      return res.ok(
        { reviewed: !!review, review: review || null },
        "Review status fetched"
      );
    } catch (error) {
      res.serverError("Failed to check review", [error.message]);
    }
  }
);

router.get(
  "/doctor/:doctorId",
  [param("doctorId").isMongoId()],
  validate,
  async (req, res) => {
    try {
      const reviews = await Review.find({ doctorId: req.params.doctorId })
        .populate("patientId", "name profileImage")
        .populate("appointmentId", "_id slotStartIso")
        .sort({ createdAt: -1 })
        .limit(50);

      return res.ok(reviews, "Reviews fetched");
    } catch (error) {
      res.serverError("Failed to fetch reviews", [error.message]);
    }
  }
);

module.exports = router;
