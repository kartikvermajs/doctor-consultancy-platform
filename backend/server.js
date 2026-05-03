const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
require("./config/passport");
const cloudinary = require("./config/cloudinary");
const passportLib = require("passport");

const response = require("./middleware/response");

const app = express();


app.use(helmet());


app.use(morgan("dev"));
const allowedOriginsStr = process.env.ALLOWED_ORIGINS || "";
const allowedOrigins = allowedOriginsStr.split(",").map(s => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(response);


app.use(passportLib.initialize());


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/appointment", require("./routes/appointment"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/appointments", require("./routes/appointmentDocuments"));
app.use("/api/appointments", require("./routes/summarize"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/review", require("./routes/review"));

app.get("/health", (req, res) =>
  res.ok({ time: new Date().toISOString() }, "OK"),
);

app.get("/api/cloudinary-health", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({ ok: true, result });
  } catch (err) {
    console.error("Cloudinary ping failed:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, "0.0.0.0", () => console.log(`Server listening on ${PORT}`));
