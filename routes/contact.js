import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* ✅ CREATE TRANSPORTER (FIXED FOR CLOUD) */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // ✅ use SSL (better for Railway)
  secure: true, // ✅ MUST be true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/* ✅ VERIFY SMTP (SAFE) */
(async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP READY");
  } catch (err) {
    console.error("❌ SMTP ERROR:", err.message);
  }
})();

/* 🚀 CONTACT ROUTE */
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  // ✅ VALIDATION
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "Please fill in all fields",
    });
  }

  try {
    // 🔥 SEND EMAIL
    await transporter.sendMail({
      from: `"TransXs Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO,
      replyTo: email, // ✅ IMPORTANT (so you can reply to user)
      subject: `📩 New Contact from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });

  } catch (error) {
    console.error("❌ FULL EMAIL ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Email failed. Check server logs.",
    });
  }
});

export default router;
