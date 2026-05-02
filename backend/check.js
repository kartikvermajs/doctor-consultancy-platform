const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Appointment = require('./modal/Appointment');
  const total = await Appointment.countDocuments();
  const withEmb = await Appointment.countDocuments({ embedding: { $exists: true, $not: { $size: 0 } } });
  console.log('Total Appointments:', total);
  console.log('With Embeddings:', withEmb);
  process.exit(0);
}).catch(console.error);
