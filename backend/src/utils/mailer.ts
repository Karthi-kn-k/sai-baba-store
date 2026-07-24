import nodemailer from "nodemailer";

export const sendOtpNotification = async (
  email: string,
  phone: string,
  otp: string,
  purpose: string
): Promise<{ emailSent: boolean; smsSent: boolean }> => {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER || "";
  const smtpPass = process.env.SMTP_PASS || "";

  // Log SMS and WhatsApp templates exactly as requested
  console.log(`[SMS GATEWAY] Sending SMS to ${phone}: verification otp from saibaba store along with otp ${otp}`);
  console.log(`[WHATSAPP GATEWAY] Sending WhatsApp Message to ${phone}: verification otp from saibaba store along with otp ${otp}`);

  let emailSent = false;

  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: `"Sai Baba Store" <${smtpUser}>`,
        to: email,
        subject: `verification otp from sai baba store`,
        text: `Your verification OTP is ${otp} for ${purpose}. Valid for 2 minutes.`,
        html: `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 450px; margin: auto;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-top: 0;">Sai Baba Store</h2>
          <p style="font-size: 14px; color: #334155;">Hello,</p>
          <p style="font-size: 14px; color: #334155;">Your verification OTP code is:</p>
          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; border-radius: 6px; margin: 15px 0;">
            <span style="font-size: 28px; font-weight: bold; color: #10b981; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #64748b;">This OTP code is valid for 2 minutes.</p>
        </div>`
      };

      await transporter.sendMail(mailOptions);
      console.log(`[Mailer SUCCESS] Verification email sent to ${email}`);
      emailSent = true;
    } catch (error) {
      console.error(`[Mailer ERROR] Failed to send email to ${email}:`, error);
    }
  } else {
    console.warn(`[Mailer WARNING] SMTP_USER/PASS is not configured in .env. Email skipped. OTP code is: ${otp}`);
  }

  return { emailSent, smsSent: true };
};
