// backend/routes/bookings.js
import express from "express";
import Booking from "../models/booking.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* =========================
   ✅ FIXED MAIL TRANSPORTER FOR PRODUCTION
========================= */

// Create transporter with better configuration
let transporter = null;

const createTransporter = () => {
  // Check if email credentials exist
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials not configured. Email notifications disabled.");
    return null;
  }

  // For Gmail (most common)
  if (process.env.EMAIL_USER.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Production settings
      pool: true, // Use pooled connections
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000, // 1 second
      rateLimit: 5, // 5 messages per second
    });
  }
  
  // For other SMTP services
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });
};

// Initialize transporter
try {
  transporter = createTransporter();
  
  if (transporter) {
    // Verify connection (don't block startup)
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ Email Service Error:", error.message);
        console.error("   Please check your email credentials");
        if (process.env.NODE_ENV === 'production') {
          console.error("   For Gmail, use an App Password: https://myaccount.google.com/apppasswords");
        }
        transporter = null;
      } else {
        console.log("✅ Email Service Ready - Notifications enabled");
      }
    });
  }
} catch (err) {
  console.error("❌ Failed to initialize email service:", err.message);
  transporter = null;
}

/* =========================
   📩 SEND EMAIL FUNCTION (UPDATED)
========================= */
const sendEmails = async (booking) => {
  // Skip if email service not configured
  if (!transporter) {
    console.log("⚠️ Email service not available - skipping notification");
    return;
  }

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("⚠️ Email not configured");
      return;
    }

    const formattedDate = new Date(booking.date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    // Generate booking URL for tracking
    const frontendUrl = process.env.FRONTEND_URL || 'https://yourdomain.com';
    const bookingUrl = `${frontendUrl}/booking/${booking.bookingId}`;

    // 📧 BETTER HTML EMAIL TEMPLATE
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation - TransXs</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .details { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #4b5563; }
          .value { color: #1f2937; }
          .total { font-size: 20px; font-weight: bold; color: #10b981; margin-top: 10px; text-align: right; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 500; }
          .button:hover { background: #5a67d8; }
          .booking-id { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Booking Confirmed!</h1>
            <p>Thank you for choosing TransXs</p>
          </div>
          <div class="content">
            <h2>Hello ${booking.name},</h2>
            <p>Your adventure has been successfully booked! Here are your details:</p>
            
            <div class="details">
              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span class="value"><span class="booking-id">${booking.bookingId}</span></span>
              </div>
              <div class="detail-row">
                <span class="label">Destination:</span>
                <span class="value">${booking.city}</span>
              </div>
              <div class="detail-row">
                <span class="label">Travel Date:</span>
                <span class="value">${formattedDate}</span>
              </div>
              <div class="detail-row">
                <span class="label">Travelers:</span>
                <span class="value">${booking.travelers} ${booking.travelers === 1 ? 'person' : 'people'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Duration:</span>
                <span class="value">${booking.duration} ${booking.duration === 1 ? 'day' : 'days'}</span>
              </div>
              ${booking.vehicle ? `<div class="detail-row">
                <span class="label">Vehicle:</span>
                <span class="value">${booking.vehicle.toUpperCase()}</span>
              </div>` : ''}
              ${booking.guide && booking.guide !== 'none' ? `<div class="detail-row">
                <span class="label">Tour Guide:</span>
                <span class="value">${booking.guide.toUpperCase()} Guide</span>
              </div>` : ''}
              ${booking.accommodation ? `<div class="detail-row">
                <span class="label">Accommodation:</span>
                <span class="value">${booking.accommodation.toUpperCase()}</span>
              </div>` : ''}
              <div class="total">
                Total Amount: ₹${booking.estimatedCost.toLocaleString()}
              </div>
            </div>
            
            ${booking.specialRequests ? `
            <div class="details">
              <strong>📝 Special Requests:</strong>
              <p style="margin-top: 10px; color: #4b5563;">${booking.specialRequests}</p>
            </div>
            ` : ''}
            
            <p>We'll contact you within 24 hours with more details about your trip.</p>
            
            <div style="text-align: center;">
              <a href="${bookingUrl}" class="button">View Booking Details</a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Need help? Contact us at <a href="mailto:support@transxs.com" style="color: #667eea;">support@transxs.com</a>
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} TransXs. All rights reserved.</p>
            <p>This is a system generated email, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // 📧 Plain text version for email clients that don't support HTML
    const textVersion = `
Booking Confirmed! - ${booking.bookingId}

Hello ${booking.name},

Your adventure has been successfully booked!

Details:
--------
Booking ID: ${booking.bookingId}
Destination: ${booking.city}
Travel Date: ${formattedDate}
Travelers: ${booking.travelers}
Duration: ${booking.duration} days
Total Amount: ₹${booking.estimatedCost.toLocaleString()}

${booking.vehicle ? `Vehicle: ${booking.vehicle.toUpperCase()}` : ''}
${booking.guide && booking.guide !== 'none' ? `Tour Guide: ${booking.guide.toUpperCase()} Guide` : ''}
${booking.accommodation ? `Accommodation: ${booking.accommodation.toUpperCase()}` : ''}

${booking.specialRequests ? `Special Requests: ${booking.specialRequests}` : ''}

We'll contact you within 24 hours with more details.

View your booking: ${bookingUrl}

Need help? Contact us at support@transxs.com

© ${new Date().getFullYear()} TransXs. All rights reserved.
    `;

    // 📩 SEND EMAIL TO CUSTOMER
    const mailOptions = {
      from: `"TransXs Travels" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `🎉 Booking Confirmed! - ${booking.bookingId}`,
      html: emailHtml,
      text: textVersion,
      // Add headers to improve deliverability
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    // Send email with promise for better error handling
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${booking.email} - Message ID: ${info.messageId}`);

    // 📩 SEND EMAIL TO ADMIN (if configured)
    if (process.env.ADMIN_EMAIL) {
      const adminMailOptions = {
        from: `"TransXs Booking" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `📅 New Booking: ${booking.bookingId} - ${booking.city}`,
        html: `
          <h2>🆕 New Booking Received</h2>
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Customer:</strong> ${booking.name}</p>
          <p><strong>Email:</strong> ${booking.email}</p>
          <p><strong>Phone:</strong> ${booking.phone}</p>
          <p><strong>Destination:</strong> ${booking.city}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Travelers:</strong> ${booking.travelers}</p>
          <p><strong>Duration:</strong> ${booking.duration} days</p>
          <p><strong>Total:</strong> ₹${booking.estimatedCost.toLocaleString()}</p>
          <hr>
          <p><strong>Vehicle:</strong> ${booking.vehicle || 'Not selected'}</p>
          <p><strong>Guide:</strong> ${booking.guide !== 'none' ? booking.guide : 'No guide'}</p>
          <p><strong>Accommodation:</strong> ${booking.accommodation || 'Not selected'}</p>
          ${booking.specialRequests ? `<p><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
          <hr>
          <p><a href="${process.env.ADMIN_URL || '#'}/bookings/${booking._id}">View in Admin Panel</a></p>
        `,
      };
      
      await transporter.sendMail(adminMailOptions);
      console.log(`✅ Admin notification sent`);
    }

  } catch (err) {
    console.error("❌ Email error:", err.message);
    // Don't throw - email failure shouldn't break the booking
  }
};

/* =========================
   🚀 CREATE BOOKING (UPDATED)
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ✅ SAVE TO DB
    const booking = new Booking(req.body);
    const saved = await booking.save();

    // 🔥 SEND EMAIL (DON'T AWAIT - SEND IN BACKGROUND)
    sendEmails(saved).catch(err =>
      console.error("Background email error:", err.message)
    );

    // ✅ RESPONSE (FAST)
    res.status(201).json({
      success: true,
      bookingId: saved.bookingId,
      message: "Booking created successfully! Check your email for confirmation.",
      data: saved,
    });

  } catch (err) {
    console.error("❌ Booking Error:", err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A booking with these details already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' 
        ? "Internal server error. Please try again later."
        : err.message,
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

/* =========================
   🔍 GET SINGLE BOOKING
========================= */
router.get("/:id", async (req, res) => {
  try {
    const booking = await Booking.findOne({ 
      $or: [{ bookingId: req.params.id }, { _id: req.params.id }]
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;
