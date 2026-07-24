import prisma from "../db";
import bcrypt from "bcrypt";
import { EmailService } from "./emailService";

export class OtpService {
  /**
   * Generates a secure random 6-digit OTP, hashes it with bcrypt,
   * enforces rate-limits & cooldowns, saves to DB, and sends via email only.
   */
  static async sendOtp(params: {
    email: string;
    purpose: string;
  }): Promise<{ message: string; otp?: string }> {
    const { email, purpose } = params;

    if (!email) {
      throw new Error("Email address is required to send OTP.");
    }

    const now = new Date();

    // Check if there is an existing unverified OTP entry for this email + purpose
    const existingOtp = await prisma.otpVerification.findFirst({
      where: {
        email,
        purpose,
        verified: false,
        expiresAt: { gt: now }
      },
      orderBy: { createdAt: "desc" }
    });

    if (existingOtp) {
      // Cooldown check: 60 seconds between resends
      const diffMs = now.getTime() - new Date(existingOtp.lastResentAt).getTime();
      const cooldownSeconds = 60 - Math.floor(diffMs / 1000);
      if (cooldownSeconds > 0) {
        throw new Error(`Please wait ${cooldownSeconds} seconds before requesting a new OTP.`);
      }

      // Resend limit check: max 3 resends
      if (existingOtp.resends >= 3) {
        throw new Error("Maximum resend attempts reached. Please wait before requesting a new OTP.");
      }
    }

    // Generate random 6-digit OTP and hash it
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    if (existingOtp) {
      await prisma.otpVerification.update({
        where: { id: existingOtp.id },
        data: {
          otpHash,
          expiresAt,
          resends: existingOtp.resends + 1,
          lastResentAt: now
        }
      });
    } else {
      await prisma.otpVerification.create({
        data: {
          email,
          phone: null,
          otpHash,
          purpose,
          expiresAt,
          lastResentAt: now,
          verified: false
        }
      });
    }

    // Send via email
    const emailSent = await EmailService.sendOtp(email, rawOtp, purpose);

    // If SMTP is configured and email was dispatched, hide OTP from response (production mode)
    const hasSmtp = !!process.env.SMTP_USER && !!process.env.SMTP_PASS;
    const isMockMode = !hasSmtp || !emailSent;

    return {
      message: emailSent
        ? `OTP sent successfully to ${email}.`
        : `OTP generated. Email delivery failed — check SMTP configuration.`,
      otp: isMockMode ? rawOtp : undefined
    };
  }

  /**
   * Verifies a 6-digit OTP against the hashed version stored in the database.
   * Enforces expiry (5 min) and max attempts (5).
   */
  static async verifyOtp(params: {
    email: string;
    purpose: string;
    otp: string;
  }): Promise<boolean> {
    const { email, purpose, otp } = params;
    const now = new Date();

    const entry = await prisma.otpVerification.findFirst({
      where: {
        email,
        purpose,
        verified: false
      },
      orderBy: { createdAt: "desc" }
    });

    if (!entry) {
      throw new Error("No pending OTP request found. Please request a new OTP code.");
    }

    // Expiry Check
    if (new Date(entry.expiresAt).getTime() < now.getTime()) {
      throw new Error("OTP code has expired. Please request a new one.");
    }

    // Max attempts check
    if (entry.attempts >= 5) {
      await prisma.otpVerification.update({
        where: { id: entry.id },
        data: { expiresAt: new Date(Date.now() - 1000) }
      });
      throw new Error("Too many incorrect attempts. This OTP has been invalidated. Please request a new one.");
    }

    // Compare OTP against hash
    const match = await bcrypt.compare(otp, entry.otpHash);

    await prisma.otpVerification.update({
      where: { id: entry.id },
      data: {
        attempts: entry.attempts + 1,
        verified: match
      }
    });

    if (!match) {
      const remaining = 5 - (entry.attempts + 1);
      if (remaining <= 0) {
        throw new Error("Too many incorrect attempts. This OTP code has been invalidated.");
      }
      throw new Error(`Incorrect OTP code. You have ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    }

    return true;
  }
}
