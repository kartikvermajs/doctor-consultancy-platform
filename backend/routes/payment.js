






































const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const Appointment = require("../modal/Appointment");

const router = express.Router();

const razorPay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});



router.post(
  "/create-order",
  authenticate,
  requireRole("patient"),
  [body("appointmentId").isMongoId()],
  validate,
  async (req, res) => {
    try {
      const { appointmentId } = req.body;

      const appointment = await Appointment.findById(appointmentId)
        .populate("doctorId", "name specialization")
        .populate("patientId", "name email phone");

      if (!appointment) {
        return res.notFound("Appointment not found");
      }

      if (appointment.patientId._id.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }

      if (appointment.paymentStatus === "Paid") {
        return res.badRequest("Payment already completed");
      }

      const order = await razorPay.orders.create({
        amount: appointment.totalAmount * 100, 
        currency: "INR",
        receipt: `appointment_${appointmentId}`,
        notes: {
          appointmentId,
          doctorName: appointment.doctorId.name,
          patientName: appointment.patientId.name,
        },
      });

      res.ok(
        {
          orderId: order.id,
          amount: order.amount, 
          currency: "INR",
          key: process.env.RAZORPAY_KEY_ID,
        },
        "Order created",
      );
    } catch (err) {
      res.serverError("Failed to create order", [err.message]);
    }
  },
);



router.post(
  "/verify-payment",
  authenticate,
  requireRole("patient"),
  [
    body("appointmentId").isMongoId(),
    body("razorpay_order_id").isString(),
    body("razorpay_payment_id").isString(),
    body("razorpay_signature").isString(),
  ],
  validate,
  async (req, res) => {
    try {
      const {
        appointmentId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      const appointment = await Appointment.findById(appointmentId)
        .populate("doctorId", "name specialization")
        .populate("patientId", "name email phone");

      if (!appointment) {
        return res.notFound("Appointment not found");
      }

      if (appointment.patientId._id.toString() !== req.auth.id) {
        return res.forbidden("Access denied");
      }

      const signBody = `${razorpay_order_id}|${razorpay_payment_id}`;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(signBody)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.badRequest("Payment verification failed");
      }

      appointment.paymentStatus = "Paid";
      appointment.paymentMethod = "RazorPay";
      appointment.razorpayPaymentId = razorpay_payment_id;
      appointment.razorpayOrderId = razorpay_order_id;
      appointment.razorpaySignature = razorpay_signature;
      appointment.paymentDate = new Date();

      await appointment.save();

      res.ok(appointment, "Payment verified successfully");
    } catch (err) {
      res.serverError("Verification failed", [err.message]);
    }
  },
);

module.exports = router;
