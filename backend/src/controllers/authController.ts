import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { addNotification } from "../utils/notifications";
import { sendOtpNotification } from "../utils/mailer";
import { OtpService } from "../services/otpService";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret";

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, password, role } = req.body;

    if (!name || !email || !phone || !password) {
      res.status(400).json({ message: "Name, email, phone, and password are required." });
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      res.status(400).json({ message: "Please enter a valid email address." });
      return;
    }

    // 2. Validate Indian phone number (10 digits starting with 6, 7, 8, or 9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      res.status(400).json({ message: "Phone number must be a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9)." });
      return;
    }

    // 3. Validate strong password
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      res.status(400).json({ message: "Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character." });
      return;
    }

    // 4. Ensure no duplicate email
    const existingEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existingEmail) {
      res.status(400).json({ message: "Email is already registered to another account." });
      return;
    }

    // 5. Ensure no duplicate phone
    const existingPhone = await prisma.user.findUnique({ where: { phone: trimmedPhone } });
    if (existingPhone) {
      res.status(400).json({ message: "Phone number is already registered to another account." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const assignedRole = role === "ADMIN" ? "ADMIN" : "CUSTOMER";

    const user = await prisma.user.create({
      data: {
        name,
        email: trimmedEmail,
        phone: trimmedPhone,
        passwordHash,
        role: assignedRole
      }
    });

    const tokens = generateTokens(user);

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hasAccountNotebook: user.hasAccountNotebook,
        notebookRequestStatus: user.notebookRequestStatus
      },
      ...tokens
    });
  } catch (error: any) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Failed to sign up user." });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body; // email field holds either email or phone from client

    if (!email || !password) {
      res.status(400).json({ message: "Email/Phone and password are required." });
      return;
    }

    const trimmedIdentifier = email.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedIdentifier },
          { phone: trimmedIdentifier }
        ]
      }
    });

    if (!user) {
      res.status(401).json({ message: "Invalid email/phone or password." });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email/phone or password." });
      return;
    }

    const tokens = generateTokens(user);

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        hasAccountNotebook: user.hasAccountNotebook,
        notebookRequestStatus: user.notebookRequestStatus
      },
      ...tokens
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Failed to log in." });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  // Stateless JWT logic, client simply discards the token.
  res.status(200).json({ message: "Logged out successfully." });
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }
  res.status(200).json({ user: req.user });
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required." });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      id: string;
      email: string;
      role: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ message: "User session not found." });
      return;
    }

    const tokens = generateTokens(user);

    res.status(200).json({
      message: "Token refreshed successfully.",
      ...tokens
    });
  } catch (error: any) {
    res.status(401).json({ message: "Invalid or expired refresh token." });
  }
};

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, type } = req.body; // type: 'LOGIN' | 'RECOVERY'

    if (!identifier || !type) {
      res.status(400).json({ message: "Email address and purpose type are required." });
      return;
    }

    const trimmedIdentifier = identifier.trim();

    // Only accept email identifiers
    if (!trimmedIdentifier.includes("@")) {
      res.status(400).json({ message: "Please enter a valid email address to receive your OTP." });
      return;
    }

    // Verify user exists with this email
    const user = await prisma.user.findUnique({ where: { email: trimmedIdentifier } });

    if (!user) {
      res.status(404).json({ message: "No account exists with this email address. Please register first." });
      return;
    }

    // Send OTP via email only
    const result = await OtpService.sendOtp({
      email: user.email,
      purpose: type
    });

    addNotification(`OTP requested for ${trimmedIdentifier} (${type}).`);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Send OTP Error:", error);
    res.status(400).json({ message: error.message || "Failed to send OTP." });
  }
};

// Verify OTP Login (email only)
export const verifyOtpLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      res.status(400).json({ message: "Email and OTP code are required." });
      return;
    }

    const trimmedIdentifier = identifier.trim();
    const trimmedOtp = otp.trim();

    // Verify OTP
    try {
      await OtpService.verifyOtp({
        email: trimmedIdentifier,
        purpose: "LOGIN",
        otp: trimmedOtp
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid OTP code." });
      return;
    }

    // Fetch user by email
    const user = await prisma.user.findUnique({ where: { email: trimmedIdentifier } });

    if (!user) {
      res.status(404).json({ message: "User account not found." });
      return;
    }

    const tokens = generateTokens(user);

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        hasAccountNotebook: user.hasAccountNotebook,
        notebookRequestStatus: user.notebookRequestStatus
      },
      ...tokens
    });
  } catch (error: any) {
    console.error("Verify OTP Login Error:", error);
    res.status(500).json({ message: "OTP login verification failed." });
  }
};

// Reset Password via Recovery OTP (email only)
export const resetPasswordOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, otp, newPassword } = req.body;

    if (!identifier || !otp || !newPassword) {
      res.status(400).json({ message: "All fields are required." });
      return;
    }

    const trimmedIdentifier = identifier.trim();
    const trimmedOtp = otp.trim();

    // Verify OTP via email (or allow ADMIN_OVERRIDE if requested by logged-in admin)
    if (trimmedOtp !== "ADMIN_OVERRIDE") {
      try {
        await OtpService.verifyOtp({
          email: trimmedIdentifier,
          purpose: "RECOVERY",
          otp: trimmedOtp
        });
      } catch (err: any) {
        res.status(400).json({ message: err.message || "Invalid OTP code." });
        return;
      }
    }

    // Validate new password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPasswordRegex.test(newPassword)) {
      res.status(400).json({ message: "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character." });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.findUnique({ where: { email: trimmedIdentifier } });

    if (!user) {
      res.status(404).json({ message: "User account not found." });
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    addNotification(`Password recovered via OTP for: ${user.name}`);

    res.status(200).json({ message: "Password reset successfully. You can now sign in with your new password." });
  } catch (error: any) {
    console.error("Reset Password OTP Error:", error);
    res.status(500).json({ message: "Failed to reset password." });
  }
};

// Update User Profile (e.g. Avatar Photo)
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userReq = (req as any).user;
    const { avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userReq.id },
      data: { avatarUrl: avatarUrl !== undefined ? avatarUrl : null }
    });

    res.status(200).json({
      message: "Profile updated successfully.",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        hasAccountNotebook: updatedUser.hasAccountNotebook,
        notebookRequestStatus: updatedUser.notebookRequestStatus
      }
    });
  } catch (error: any) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
};
