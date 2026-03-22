import express from "express";
import Booking from "../models/booking.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* =========================
   ✅ FIXED MAIL TRANSPORTER
========================= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // ✅ FIXED (was 587)
  secure: true, // ✅ REQUIRED for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* =========================
   ✅ VERIFY SMTP (SAFE)
========================= */
(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP READY");
  } catch (err) {
    console.error("❌ SMTP ERROR:", err.message);
  }
})();

/* =========================
   📩 SEND EMAIL FUNCTION
========================= */
const sendEmails = async (booking) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("⚠️ Email not configured");
      return;
    }

    const formattedDate = new Date(booking.date).toLocaleDateString();

    // 📩 USER EMAIL
    await transporter.sendMail({
      from: `"TransXs Booking" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `Booking Confirmed - ${booking.bookingId}`,
      html: `
        <h2>Booking Confirmation</h2>
        <p>Hello ${booking.name},</p>
        <p>Your booking has been received successfully.</p>

        <h3>Details:</h3>
        <ul>
          <li><b>ID:</b> ${booking.bookingId}</li>
          <li><b>City:</b> ${booking.city}</li>
          <li><b>Date:</b> ${formattedDate}</li>
          <li><b>Travelers:</b> ${booking.travelers}</li>
          <li><b>Duration:</b> ${booking.duration} days</li>
          <li><b>Cost:</b> ₹${booking.estimatedCost}</li>
        </ul>

        <p>We will contact you within 24 hours.</p>
      `,
    });

    // 📩 ADMIN EMAIL
    if (process.env.EMAIL_TO) {
      await transporter.sendMail({
        from: `"TransXs Booking" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO,
        subject: `New Booking - ${booking.bookingId}`,
        html: `
          <h2>New Booking Received</h2>

          <p><b>Name:</b> ${booking.name}</p>
          <p><b>Email:</b> ${booking.email}</p>
          <p><b>Phone:</b> ${booking.phone}</p>
          <p><b>City:</b> ${booking.city}</p>
          <p><b>Date:</b> ${formattedDate}</p>
          <p><b>Travelers:</b> ${booking.travelers}</p>
          <p><b>Duration:</b> ${booking.duration}</p>
          <p><b>Cost:</b> ₹${booking.estimatedCost}</p>
        `,
      });
    }

    console.log("✅ Emails sent");
  } catch (err) {
    console.error("❌ Email error:", err.message);
  }
};

/* =========================
   🚀 CREATE BOOKING
========================= */
router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      city,
      date,
      travelers,
      duration,
      estimatedCost,
    } = req.body;

    // ✅ VALIDATION
    if (!name || !email || !phone || !city || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ✅ SAVE TO DB
    const booking = new Booking(req.body);
    const saved = await booking.save();

    // 🔥 SEND EMAIL (NON-BLOCKING)
    sendEmails(saved).catch(err =>
      console.error("Email async error:", err.message)
    );

    // ✅ RESPONSE
    res.status(201).json({
      success: true,
      bookingId: saved.bookingId,
      data: saved,
    });

  } catch (err) {
    console.error("❌ Booking Error:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* =========================
   📊 GET ALL BOOKINGS
========================= */
router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
