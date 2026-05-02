const mongoose = require('mongoose');
require('dotenv').config();
const { aiFilterPrescriptions } = require('./services/aiService');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./modal/Appointment');
  const appointments = await Appointment.find({ status: "Completed" }).lean();
  
  console.log(`Testing AI filter with ${appointments.length} appointments...`);
  try {
    const ids = await aiFilterPrescriptions("give me headache related results", appointments);
    console.log("AI Returned IDs:", ids);
  } catch (err) {
    console.error("AI Error:", err.message);
  }
  process.exit(0);
}).catch(console.error);
