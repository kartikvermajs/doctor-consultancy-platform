const mongoose = require('mongoose');
require('dotenv').config();
const { generateEmbedding } = require('./services/aiService');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./modal/Appointment');
  const appointments = await Appointment.find({ status: "Completed" });

  console.log(`Found ${appointments.length} completed appointments.`);

  for (const appointment of appointments) {
    if (appointment.embedding && appointment.embedding.length > 0) continue;

    const combinedText = `
Symptoms: ${appointment.symptoms || "None"}
Diagnosis/Notes: ${appointment.notes || "None"}
Prescription: ${appointment.prescriptionText || "None"}
    `.trim();

    console.log(`Generating embedding for appointment ${appointment._id}...`);
    try {
      const embedding = await generateEmbedding(combinedText);
      if (embedding && embedding.length > 0) {
        appointment.embedding = embedding;
        await appointment.save();
        console.log(`Saved embedding for ${appointment._id}`);
      }
    } catch (err) {
      console.error(`Failed to generate embedding for ${appointment._id}:`, err.message);
    }
  }

  console.log('Backfill complete.');
  process.exit(0);
}).catch(console.error);
