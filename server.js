import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import bookingRoute from "./routes/booking.js";
import contactRoute from "./routes/contact.js";
import placesRoute from "./routes/places.js";

import connection from "./models/connectionDb.js";

dotenv.config();

const app = express();

/* =======================
   🔐 CORS FIX (IMPORTANT)
======================= */
app.use(cors({
  origin: "*", // ✅ allow all (fixes Vercel issue)
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

/* =======================
   🔧 MIDDLEWARE
======================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

/* =======================
   🗄️ DATABASE CONNECTION
======================= */
connection()
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

/* =======================
   📦 ROUTES
======================= */
app.use("/api/bookings", bookingRoute);
app.use("/api/contact", contactRoute);
app.use("/api/places", placesRoute);

/* =======================
   ❤️ HEALTH CHECK
======================= */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "API is running",
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || "development"
  });
});

/* =======================
   🧪 TEST ROUTE
======================= */
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working 🚀",
    time: new Date().toISOString()
  });
});

/* =======================
   ❌ 404 HANDLER
======================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

/* =======================
   ⚠️ ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* =======================
   🚀 START SERVER
======================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
