// backend/routes/contact.js
import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

/* ✅ PRODUCTION-READY TRANSPORTER */
let transporter = null;

const createTransporter = () => {
  // Check if email credentials exist
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("⚠️ Email credentials not configured");
    return null;
  }

  // For Gmail with App Password
  if (process.env.EMAIL_USER.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      family: 4, // Important for Railway
      pool: true, // Use pooled connections
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });
  }
  
  // For other SMTP services
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4,
    pool: true,
  });
};

// Initialize transporter
try {
  transporter = createTransporter();
  
  if (transporter) {
    // Verify connection (non-blocking)
    transporter.verify((error, success) => {
      if (error) {
        console.error("❌ SMTP ERROR:", error.message);
        if (process.env.NODE_ENV === 'production') {
          console.error("   For Gmail, use an App Password: https://myaccount.google.com/apppasswords");
        }
        transporter = null;
      } else {
        console.log("✅ SMTP READY - Contact form is active");
      }
    });
  }
} catch (err) {
  console.error("❌ Failed to initialize email service:", err.message);
  transporter = null;
}

/* 🚀 CONTACT ROUTE (PRODUCTION READY) */
router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

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

  // Check if email service is available
  if (!transporter) {
    console.error("❌ Email service not available");
    return res.status(503).json({
      success: false,
      message: "Email service temporarily unavailable. Please try again later.",
    });
  }

  try {
    // Get admin email from environment
    const adminEmail = process.env.EMAIL_TO || process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    
    if (!adminEmail) {
      throw new Error("No recipient email configured");
    }

    // Create HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Message - TransXs</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .content { background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .field { margin-bottom: 20px; }
          .label { font-weight: 600; color: #4b5563; margin-bottom: 5px; }
          .value { background: #f8f9fa; padding: 10px; border-radius: 6px; color: #1f2937; }
          .message-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-top: 5px; white-space: pre-wrap; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 20px; }
          .badge { display: inline-block; background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📩 New Contact Message</h1>
            <p>From TransXs Website Contact Form</p>
          </div>
          <div class="content">
            <div class="field">
              <div class="label">👤 Name:</div>
              <div class="value">${escapeHtml(name)}</div>
            </div>
            
            <div class="field">
              <div class="label">📧 Email:</div>
              <div class="value">${escapeHtml(email)}</div>
            </div>
            
            <div class="field">
              <div class="label">💬 Message:</div>
              <div class="message-box">${escapeHtml(message).replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="field">
              <div class="label">📅 Received:</div>
              <div class="value">${new Date().toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' })}</div>
            </div>
            
            <div class="field">
              <div class="label">🌐 IP Address:</div>
              <div class="value">${req.ip || req.connection.remoteAddress || 'Not available'}</div>
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} TransXs. All rights reserved.</p>
            <p>This is an automated message from your website contact form.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version
    const textVersion = `
📩 NEW CONTACT MESSAGE

Name: ${name}
Email: ${email}
Time: ${new Date().toLocaleString()}

Message:
${message}

---
This message was sent from the TransXs website contact form.
    `;

    // Send email to admin
    const info = await transporter.sendMail({
      from: `"TransXs Contact" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      replyTo: email,
      subject: `📩 New Contact from ${name} - TransXs`,
      html: emailHtml,
      text: textVersion,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    });

    console.log(`✅ Contact email sent - Message ID: ${info.messageId}`);

    // Optional: Send auto-reply to user
    if (process.env.SEND_AUTO_REPLY === 'true') {
      try {
        await transporter.sendMail({
          from: `"TransXs Team" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Thank you for contacting TransXs",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <title>Thank You - TransXs</title>
            </head>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Thank You for Contacting TransXs! 🙏</h2>
              <p>Dear ${name},</p>
              <p>We have received your message and will get back to you within 24 hours.</p>
              <p>Here's a copy of your message:</p>
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                "${message}"
              </div>
              <p>In the meantime, feel free to:</p>
              <ul>
                <li>📚 Explore our <a href="${process.env.FRONTEND_URL || 'https://transxs.com'}/travels">travel packages</a></li>
                <li>📍 Discover <a href="${process.env.FRONTEND_URL || 'https://transxs.com'}/find">tourist destinations</a></li>
                <li>📖 Read our <a href="${process.env.FRONTEND_URL || 'https://transxs.com'}/history">travel blog</a></li>
              </ul>
              <p>Best regards,<br>
              <strong>TransXs Team</strong><br>
              <a href="mailto:support@transxs.com">support@transxs.com</a></p>
            </body>
            </html>
          `,
        });
        console.log(`✅ Auto-reply sent to ${email}`);
      } catch (autoReplyErr) {
        console.error("❌ Auto-reply failed:", autoReplyErr.message);
        // Don't fail the main request if auto-reply fails
      }
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully! We'll get back to you soon.",
    });

  } catch (error) {
    console.error("❌ Email Error:", error);
    
    // Send more specific error messages
    let errorMessage = "Failed to send message. Please try again later.";
    
    if (error.code === 'EAUTH') {
      errorMessage = "Email service authentication failed. Our team has been notified.";
      console.error("   Please check EMAIL_USER and EMAIL_PASS in .env file");
      console.error("   For Gmail, use an App Password: https://myaccount.google.com/apppasswords");
    } else if (error.code === 'ECONNECTION') {
      errorMessage = "Unable to connect to email service. Please try again later.";
    } else if (error.message.includes('Invalid login')) {
      errorMessage = "Email service configuration error. Our team has been notified.";
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
});

// Helper function to escape HTML (prevent XSS)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/* ✅ HEALTH CHECK ENDPOINT */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    emailConfigured: !!transporter,
    timestamp: new Date().toISOString(),
  });
});

export default router;
