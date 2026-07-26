import nodemailer from "nodemailer";

export class EmailService {
  private static getTransporter() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
      console.warn("[EmailService WARNING] SMTP credentials are not configured in process.env.");
      return null;
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user.trim(),
        pass: pass.trim()
      }
    });
  }

  static async sendOtp(toEmail: string, otp: string, purpose: string): Promise<boolean> {
    const transporter = this.getTransporter();
    
    // Log fallback preview regardless for ease of dev testing
    console.log(`[EmailService Debug] Sending OTP email to ${toEmail} with code ${otp} for ${purpose}`);

    if (!transporter) {
      return false;
    }

    try {
      const mailOptions = {
        from: `"Sai Baba Store" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `verification otp from sai baba store`,
        text: `Your 6-digit verification code is: ${otp}. It will expire in 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 450px; margin: auto; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <h2 style="color: #0f172a; margin-top: 0; padding-bottom: 8px; border-bottom: 2px solid #10b981;">Sai Baba Store</h2>
            <p style="color: #475569; font-size: 14px; margin-top: 15px;">Hello,</p>
            <p style="color: #475569; font-size: 14px;">Your verification OTP code for <strong>${purpose}</strong> is:</p>
            <div style="background-color: #f1f5f9; padding: 15px 0; text-align: center; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
              <span style="font-size: 32px; font-weight: bold; color: #10b981; letter-spacing: 5px;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 12px;">This OTP verification code is valid for exactly 5 minutes.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] OTP email successfully sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error(`[EmailService ERROR] Failed to send email to ${toEmail}:`, error);
      return false;
    }
  }
}
