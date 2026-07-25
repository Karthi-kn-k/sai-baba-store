import { Router } from "express";
import { signup, login, logout, getMe, refreshToken, sendOtp, verifyOtpLogin, resetPasswordOtp, updateProfile } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many login/signup attempts. Please try again after 15 minutes." }
});

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/refresh", refreshToken);
router.post("/send-otp", authLimiter, sendOtp);
router.post("/verify-otp-login", authLimiter, verifyOtpLogin);
router.post("/reset-password-otp", authLimiter, resetPasswordOtp);
router.get("/me", requireAuth, getMe);
router.patch("/profile", requireAuth, updateProfile);

export default router;
