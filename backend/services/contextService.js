const Appointment = require("../modal/Appointment");
const Patient = require("../modal/Patient");

const fetchPatientAppointments = async (patientId, limit = 10) => {
  return Appointment.find(
    { patientId },
    {
      slotStartIso: 1,
      status: 1,
      symptoms: 1,
      prescriptionText: 1,
      notes: 1,
      consultationType: 1,
      documentSummary: 1,
      doctorId: 1,
    }
  )
    .populate("doctorId", "name specialization")
    .sort({ slotStartIso: -1 })
    .limit(limit)
    .lean();
};

const fetchPatientProfile = async (patientId) => {
  return Patient.findById(patientId, {
    name: 1,
    age: 1,
    gender: 1,
    bloodGroup: 1,
    medicalHistory: 1,
  }).lean();
};

const formatAppointment = (appointment, index) => {
  const date = appointment.slotStartIso
    ? new Date(appointment.slotStartIso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Unknown date";

  const doctorName = appointment.doctorId?.name || "Unknown doctor";
  const specialization = appointment.doctorId?.specialization || "General Practice";
  const status = appointment.status || "Unknown";
  const symptoms = appointment.symptoms?.trim() || "Not specified";
  const prescription = appointment.prescriptionText?.trim() || "None provided";
  const notes = appointment.notes?.trim() || "No notes";

  const lines = [
    `Record ${index} — ${date} (${status})`,
    `  Doctor: Dr. ${doctorName} (${specialization})`,
    `  Symptoms reported: ${symptoms}`,
    `  Prescription: ${prescription}`,
    `  Doctor's notes: ${notes}`,
  ];

  if (appointment.documentSummary?.trim()) {
    lines.push(`  AI Document Summary: ${appointment.documentSummary.trim()}`);
  }

  return lines.join("\n");
};

const formatPatientProfile = (profile) => {
  if (!profile) return "Patient profile: Not available";

  const lines = [`Patient name: ${profile.name || "Unknown"}`];
  if (profile.age) lines.push(`  Age: ${profile.age}`);
  if (profile.gender) lines.push(`  Gender: ${profile.gender}`);
  if (profile.bloodGroup) lines.push(`  Blood Group: ${profile.bloodGroup}`);

  const mh = profile.medicalHistory;
  if (mh) {
    if (mh.allergies?.trim()) lines.push(`  Known Allergies: ${mh.allergies}`);
    if (mh.currentMedications?.trim())
      lines.push(`  Current Medications: ${mh.currentMedications}`);
    if (mh.chronicConditions?.trim())
      lines.push(`  Chronic Conditions: ${mh.chronicConditions}`);
  }

  return lines.join("\n");
};

const buildPatientContext = async (patientId) => {
  const [profile, appointments] = await Promise.all([
    fetchPatientProfile(patientId),
    fetchPatientAppointments(patientId, 10),
  ]);

  const sections = [];

  sections.push("=== PATIENT PROFILE ===");
  sections.push(formatPatientProfile(profile));

  sections.push("\n=== RECENT MEDICAL RECORDS (last 10 appointments) ===");

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
  fetchPatientProfile,
  fetchPatientAppointments,
  formatPatientProfile,
  formatAppointment,
};
