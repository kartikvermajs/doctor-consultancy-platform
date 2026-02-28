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

//helmet is a security middleware for Express
//It helps protect your app by settings various HTTP headers
app.use(helmet());

//morgan is an HTTP request logger middleware
app.use(morgan("dev"));
app.use(
  cors({
    origin:
      (process.env.ALLOWED_ORIGINS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) || "*",
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//used response
app.use(response);

//Initialize passport
app.use(passportLib.initialize());

//Mongodb connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/doctor", require("./routes/doctor"));
app.use("/api/patient", require("./routes/patient"));
app.use("/api/appointment", require("./routes/appointment"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/appointments", require("./routes/appointmentDocuments"));

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
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
