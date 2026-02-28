const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    key: { type: String, required: true },
    type: {
      type: String,
      enum: ["lab-report", "prescription", "other"],
      default: "other",
    },
    uploadedBy: {
      type: String,
      enum: ["doctor"],
      default: "doctor",
    },
  },
  { _id: false },
);

const appointmentSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },

    date: { type: Date, required: true },
    slotStartIso: { type: Date, required: true },
    slotEndIso: { type: Date, required: true },

    consultationType: {
      type: String,
      enum: ["Video Consultation", "Voice Call"],
      default: "Video Consultation",
    },

    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled",
    },

    symptoms: { type: String, default: "" },
    zegoRoomId: { type: String },

    // 🧠 Doctor content
    prescriptionText: { type: String, default: "" },
    notes: { type: String, default: "" },

    // 📎 Uploaded documents (images / PDFs)
    documents: [documentSchema],

    // 💰 Payment
    consultationFees: { type: Number, required: true },
    platformFees: { type: Number, required: true },
    totalAmount: { type: Number, required: true },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Refunded"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

appointmentSchema.index(
  { doctorId: 1, date: 1, slotStartIso: 1 },
  { unique: true },
);

module.exports = mongoose.model("Appointment", appointmentSchema);
