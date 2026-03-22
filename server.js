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
   🔐 CORS CONFIGURATION
======================= */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow Postman / curl (no origin)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("❌ Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
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
    process.exit(1); // Stop server if DB fails
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
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

/* =======================
   ⚠️ ERROR HANDLER
======================= */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err.message);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

/* =======================
   🚀 START SERVER
======================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
});