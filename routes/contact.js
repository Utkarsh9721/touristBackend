// backend/routes/contact.js
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* ✅ TRANSPORTER (RAILWAY SAFE) */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // 🔥 IMPORTANT for Railway
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

/* ✅ VERIFY SMTP */
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP ERROR:", error.message);
  } else {
    console.log("✅ SMTP READY - Contact form is active");
  }
});

/* 🚀 CONTACT ROUTE WITH BETTER LOGGING */
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  console.log("📧 Contact request received:", { name, email, messageLength: message?.length });

  // ✅ VALIDATION
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all fields",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address",
    });
  }

  try {
    const adminEmail = process.env.EMAIL_TO || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    if (!adminEmail) {
      throw new Error("No recipient email configured");
    }

    console.log("📧 Sending email to:", adminEmail);
    console.log("📧 From:", name, email);

    // Simple HTML template
    const emailHtml = `
      <h2>📩 New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
      <h3>Message:</h3>
      <p style="background: #f5f5f5; padding: 15px; border-radius: 5px;">${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Sent from TransXs website contact form</small></p>
    `;

    const info = await transporter.sendMail({
      from: `"TransXs Contact" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      replyTo: email,
      subject: `📩 New Contact from ${name}`,
      html: emailHtml,
      text: `New Contact Message\n\nName: ${name}\nEmail: ${email}\nMessage:\n${message}`,
    });

    console.log("✅ Email sent successfully! Message ID:", info.messageId);

    res.status(200).json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
    });

  } catch (error) {
    console.error("❌ Email Error Details:");
    console.error("  Code:", error.code);
    console.error("  Message:", error.message);
    console.error("  Command:", error.command);
    console.error("  Response:", error.response);
    console.error("  ResponseCode:", error.responseCode);
    
    // Try to send a test email to debug
    if (error.code === 'EAUTH') {
      console.error("  🔐 Authentication failed - Check your Gmail App Password");
      console.error("  Generate a new App Password: https://myaccount.google.com/apppasswords");
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to send message. Please try again later.",
    });
  }
});

/* ✅ HEALTH CHECK ENDPOINT */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    emailConfigured: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
