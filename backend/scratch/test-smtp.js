const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

async function testSmtp() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);

  console.log("Testing SMTP with:", { host, port, user });

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: user.trim(),
      pass: pass.trim()
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log("✅ SMTP Connection Successful! Credentials are valid.");

    const info = await transporter.sendMail({
      from: `"Sai Baba Store" <${user}>`,
      to: user,
      subject: "Test Email from Sai Baba Store SMTP",
      text: "Your SMTP configuration is working perfectly!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 450px; margin: auto;">
          <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 8px; margin-top: 0;">Sai Baba Store</h2>
          <p style="font-size: 14px; color: #334155;">Hello,</p>
          <p style="font-size: 14px; color: #334155;">Your SMTP configuration for automated Email OTPs is <strong>working perfectly!</strong></p>
        </div>
      `
    });

    console.log("✅ Test Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ SMTP Test Error:", err);
  }
}

testSmtp();
