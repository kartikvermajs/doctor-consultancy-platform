/**
 * contextService.js
 * -----------------
 * RESPONSIBILITY: Fetch raw patient records from MongoDB and convert
 * them into a clean, structured text string ready for an AI model.
 *
 * No AI logic lives here. No route/HTTP logic lives here.
 */

const Appointment = require("../modal/Appointment");
const Patient = require("../modal/Patient");

// ─── DATA ACCESS ──────────────────────────────────────────────────────────────

/**
 * Fetch the last N completed/scheduled appointments for a patient.
 * Only pulls fields relevant to medical context (no payment details).
 *
 * @param {string} patientId  - MongoDB ObjectId of the patient
 * @param {number} [limit=5]  - Max number of records to retrieve
 * @returns {Promise<Array>}
 */
const fetchPatientAppointments = async (patientId, limit = 5) => {
  return Appointment.find(
    { patientId },
    {
      slotStartIso: 1,
      status: 1,
      symptoms: 1,
      prescriptionText: 1,
      notes: 1,
      consultationType: 1,
      doctorId: 1,
    }
  )
    .populate("doctorId", "name specialization")
    .sort({ slotStartIso: -1 }) // most-recent first
    .limit(limit)
    .lean();
};

/**
 * Fetch basic profile info for a patient (age, gender, medical history).
 *
 * @param {string} patientId
 * @returns {Promise<Object|null>}
 */
const fetchPatientProfile = async (patientId) => {
  return Patient.findById(patientId, {
    name: 1,
    age: 1,
    gender: 1,
    bloodGroup: 1,
    medicalHistory: 1,
  }).lean();
};

// ─── CONTEXT BUILDER ──────────────────────────────────────────────────────────

/**
 * Format a single appointment record into a readable text block.
 *
 * @param {Object} appointment
 * @param {number} index  - 1-based display index
 * @returns {string}
 */
const formatAppointment = (appointment, index) => {
  const date = appointment.slotStartIso
    ? new Date(appointment.slotStartIso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown date";

  const doctorName = appointment.doctorId?.name || "Unknown doctor";
  const specialization =
    appointment.doctorId?.specialization || "General Practice";
  const status = appointment.status || "Unknown";
  const symptoms = appointment.symptoms?.trim() || "Not specified";
  const prescription = appointment.prescriptionText?.trim() || "None provided";
  const notes = appointment.notes?.trim() || "No notes";

  return [
    `Record ${index} — ${date} (${status})`,
    `  Doctor: ${doctorName} (${specialization})`,
    `  Symptoms: ${symptoms}`,
    `  Prescription: ${prescription}`,
    `  Notes: ${notes}`,
  ].join("\n");
};

/**
 * Format patient profile into a readable header block.
 *
 * @param {Object} profile
 * @returns {string}
 */
const formatPatientProfile = (profile) => {
  if (!profile) return "Patient profile: Not available";

  const lines = [`Patient: ${profile.name || "Unknown"}`];
  if (profile.age) lines.push(`  Age: ${profile.age}`);
  if (profile.gender) lines.push(`  Gender: ${profile.gender}`);
  if (profile.bloodGroup) lines.push(`  Blood Group: ${profile.bloodGroup}`);

  const mh = profile.medicalHistory;
  if (mh) {
    if (mh.allergies?.trim()) lines.push(`  Allergies: ${mh.allergies}`);
    if (mh.currentMedications?.trim())
      lines.push(`  Current Medications: ${mh.currentMedications}`);
    if (mh.chronicConditions?.trim())
      lines.push(`  Chronic Conditions: ${mh.chronicConditions}`);
  }

  return lines.join("\n");
};

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

/**
 * Build a complete, structured context string for a given patient.
 *
 * Orchestrates:
 *   1. Fetch patient profile
 *   2. Fetch recent appointment records
 *   3. Format everything into a single readable context block
 *
 * @param {string} patientId
 * @returns {Promise<string>} - Structured context ready to pass to AI
 */
const buildPatientContext = async (patientId) => {
  const [profile, appointments] = await Promise.all([
    fetchPatientProfile(patientId),
    fetchPatientAppointments(patientId, 5),
  ]);

  const sections = [];

  // ── Section 1: Patient profile ──────────────────────────────────────────
  sections.push("=== PATIENT PROFILE ===");
  sections.push(formatPatientProfile(profile));

  // ── Section 2: Medical history (appointment records) ────────────────────
  sections.push("\n=== RECENT MEDICAL RECORDS ===");

  if (appointments.length === 0) {
    sections.push("No past appointment records found.");
  } else {
    appointments.forEach((appt, i) => {
      sections.push(formatAppointment(appt, i + 1));
    });
  }

  return sections.join("\n");
};

module.exports = {
  buildPatientContext,
  // Exported individually for unit-testing:
  fetchPatientProfile,
  fetchPatientAppointments,
  formatPatientProfile,
  formatAppointment,
};
