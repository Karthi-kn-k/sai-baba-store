import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../api";
import { 
  Mail, Lock, User, Phone, LogIn, UserPlus, 
  Key, ArrowLeft, ShieldCheck, Eye, EyeOff 
} from "lucide-react";

export const Login: React.FC = () => {
  const { login, loginWithTokens } = useAuth();
  const { showToast } = useToast();
  
  // Modes: PASSWORD_LOGIN | OTP_LOGIN | RECOVERY | SIGNUP
  const [authMode, setAuthMode] = useState<"PASSWORD_LOGIN" | "OTP_LOGIN" | "RECOVERY" | "SIGNUP">("PASSWORD_LOGIN");
  const [loading, setLoading] = useState(false);
  
  // Shared fields
  const [identifier, setIdentifier] = useState(""); // Email for logins and recovery
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Signup fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Validation Error States
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");

  // Validation Handlers
  const handleNameChange = (val: string) => {
    setName(val);
    if (!val.trim()) setNameError("Full Name is required.");
    else setNameError("");
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val.trim()) setEmailError("Email address is required.");
    else if (!emailRegex.test(val.trim())) setEmailError("Enter a valid email address.");
    else setEmailError("");
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!val.trim()) setPhoneError("Mobile number is required.");
    else if (!phoneRegex.test(val.trim())) setPhoneError("Enter a valid 10-digit Indian mobile number (6-9).");
    else setPhoneError("");
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!val) setPasswordError("Password is required.");
    else if (authMode === "SIGNUP" && !strongPasswordRegex.test(val)) {
      setPasswordError("Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character (@$!%*?&#).");
    } else {
      setPasswordError("");
    }
  };

  const handleNewPasswordChange = (val: string) => {
    setNewPassword(val);
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!val) setNewPasswordError("New password is required.");
    else if (!strongPasswordRegex.test(val)) {
      setNewPasswordError("Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.");
    } else {
      setNewPasswordError("");
    }
  };

  const [resendTimer, setResendTimer] = useState(0);

  const startResendCountdown = () => {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtpCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      showToast("Please enter your registered email address.", "warning");
      return;
    }

    setLoading(true);
    try {
      const type = authMode === "RECOVERY" ? "RECOVERY" : "LOGIN";
      const res: any = await authApi.sendOtp({ identifier: identifier.trim(), type });
      setOtpSent(true);
      startResendCountdown();

      if (res?.otp) {
        showToast(`[Demo Mode] OTP for ${identifier.trim()}: ${res.otp}`, "success");
      } else {
        showToast(res?.message || `Verification code sent to ${identifier.trim()}`, "success");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to send OTP code.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "PASSWORD_LOGIN") {
      if (!identifier.trim() || !password) {
        showToast("Email/Phone and password are required.", "warning");
        return;
      }

      setLoading(true);
      try {
        await login({ email: identifier.trim(), password });
        showToast("Signed in successfully!", "success");
      } catch (err: any) {
        showToast(err.message || "Invalid credentials.", "error");
      } finally {
        setLoading(false);
      }
    } 
    
    else if (authMode === "SIGNUP") {
      if (nameError || emailError || phoneError || passwordError || !name || !email || !phone || !password) {
        showToast("Please resolve all validation errors before proceeding.", "warning");
        return;
      }

      setLoading(true);
      try {
        await authApi.signup({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: "CUSTOMER"
        });
        showToast("Account created successfully! Auto logging in...", "success");
        await login({ email: email.trim(), password });
      } catch (err: any) {
        showToast(err.message || "Signup failed.", "error");
      } finally {
        setLoading(false);
      }
    } 
    
    else if (authMode === "OTP_LOGIN") {
      if (!identifier.trim() || !otpCode.trim()) {
        showToast("Email and OTP code are required.", "warning");
        return;
      }

      setLoading(true);
      try {
        const data = await authApi.verifyOtpLogin({
          identifier: identifier.trim(),
          otp: otpCode.trim()
        });
        showToast("OTP Verified! Signing in...", "success");
        loginWithTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user
        });
      } catch (err: any) {
        showToast(err.message || "OTP verification failed.", "error");
      } finally {
        setLoading(false);
      }
    } 
    
    else if (authMode === "RECOVERY") {
      if (!identifier.trim() || !otpCode.trim() || !newPassword) {
        showToast("Email, OTP, and new password are required.", "warning");
        return;
      }

      setLoading(true);
      try {
        await authApi.resetPasswordOtp({
          identifier: identifier.trim(),
          otp: otpCode.trim(),
          newPassword
        });
        showToast("Password reset successfully! Please sign in.", "success");
        toggleAuthMode("PASSWORD_LOGIN");
      } catch (err: any) {
        showToast(err.message || "Failed to reset password.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = (mode: typeof authMode) => {
    setAuthMode(mode);
    setOtpSent(false);
    setOtpCode("");
    setShowPassword(false);
    setShowNewPassword(false);
    setNameError(""); setEmailError(""); setPhoneError("");
    setPasswordError(""); setNewPasswordError("");
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #fffbf5 0%, #fef3e2 50%, #fde8c8 100%)",
      }}
    >
      <div className="absolute top-0 left-0 w-80 h-80 rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #f97316, transparent)" }}></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #7f1d1d, transparent)" }}></div>

      <div
        className="max-w-md w-full rounded-2xl shadow-2xl overflow-hidden z-10"
        style={{ background: "white", border: "1.5px solid rgba(249,115,22,0.2)" }}
      >
        <div
          className="text-white p-6 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7c2d12 100%)" }}
        >
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-8xl opacity-10 pointer-events-none select-none"
            style={{ fontFamily: "'Tiro Devanagari Hindi', serif", color: "#fde68a" }}
          >ॐ</span>
          <div
            className="inline-flex p-3 rounded-2xl mb-3"
            style={{ background: "rgba(253,230,138,0.15)", border: "1.5px solid rgba(253,230,138,0.3)" }}
          >
            <span style={{ fontFamily: "'Tiro Devanagari Hindi', serif", color: "#fde68a", fontSize: "28px", lineHeight: 1 }}>ॐ</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight m-0" style={{ color: "#fde68a" }}>Sai Baba Store</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(253,230,138,0.65)" }}>Grocery running ledgers &amp; secure accounts</p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex p-1 rounded-xl mb-5" style={{ background: "rgba(249,115,22,0.08)" }}>
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
              style={authMode !== "SIGNUP"
                ? { background: "white", color: "#7f1d1d", boxShadow: "0 2px 8px rgba(249,115,22,0.15)" }
                : { background: "transparent", color: "#a16207" }
              }
              onClick={() => toggleAuthMode("PASSWORD_LOGIN")}
            >
              Sign In
            </button>
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer"
              style={authMode === "SIGNUP"
                ? { background: "white", color: "#7f1d1d", boxShadow: "0 2px 8px rgba(249,115,22,0.15)" }
                : { background: "transparent", color: "#a16207" }
              }
              onClick={() => toggleAuthMode("SIGNUP")}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ── SIGNUP FORM ── */}
            {authMode === "SIGNUP" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                        nameError
                          ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                      }`}
                      placeholder="e.g. Ramesh Kumar"
                      required
                    />
                  </div>
                  {nameError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{nameError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                        emailError
                          ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                      }`}
                      placeholder="ramesh@gmail.com"
                      required
                    />
                  </div>
                  {emailError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{emailError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Indian Mobile Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                        phoneError
                          ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                      }`}
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  {phoneError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{phoneError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                        passwordError
                          ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{passwordError}</p>}
                </div>
              </>
            )}

            {/* ── PASSWORD LOGIN FORM ── */}
            {authMode === "PASSWORD_LOGIN" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Email Address or Mobile Number</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white"
                      placeholder="e.g. name@email.com or 9876543210"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Password</label>
                    <button
                      type="button"
                      onClick={() => showToast("Please contact the Store Admin in-person or via phone to reset your account password.", "info")}
                      className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline font-semibold bg-transparent border-0 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => toggleAuthMode("OTP_LOGIN")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Sign In with Email OTP instead
                  </button>
                </div>
              </>
            )}

            {/* ── OTP LOGIN FORM ── */}
            {authMode === "OTP_LOGIN" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Registered Email Address</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white"
                        placeholder="name@email.com"
                        disabled={otpSent}
                        required
                      />
                    </div>
                    {!otpSent && (
                      <button
                        type="button"
                        onClick={(e) => handleSendOtpCode(e)}
                        disabled={loading}
                        className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-650 disabled:bg-slate-400 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all shrink-0"
                      >
                        {loading ? "Sending..." : "Send OTP"}
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-4 animate-slide-in">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Verification OTP</label>
                        <button
                          type="button"
                          onClick={() => handleSendOtpCode()}
                          disabled={resendTimer > 0 || loading}
                          className="text-[10px] text-orange-600 dark:text-orange-400 font-bold hover:underline bg-transparent border-0 cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                        >
                          {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : "Resend OTP"}
                        </button>
                      </div>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white font-bold tracking-wider"
                          placeholder="Enter 6-digit OTP"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => toggleAuthMode("PASSWORD_LOGIN")}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-bold bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Password Sign In
                  </button>
                </div>
              </>
            )}

            {/* ── RECOVERY / FORGOT PASSWORD FORM ── */}
            {authMode === "RECOVERY" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Registered Email Address</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                      <input
                        type="email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white"
                        placeholder="name@email.com"
                        disabled={otpSent}
                        required
                      />
                    </div>
                    {!otpSent && (
                      <button
                        type="button"
                        onClick={(e) => handleSendOtpCode(e)}
                        disabled={loading}
                        className="bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-650 disabled:bg-slate-400 text-white font-semibold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all shrink-0"
                      >
                        {loading ? "Sending..." : "Send OTP"}
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="space-y-4 animate-slide-in">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Recovery OTP</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-emerald-500 dark:text-white font-bold tracking-wider"
                          placeholder="Enter 6-digit verification code"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">New Strong Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => handleNewPasswordChange(e.target.value)}
                          className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                            newPasswordError
                              ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                              : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                          }`}
                          placeholder="Create a new strong password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          title={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newPasswordError && <p className="text-[10px] text-rose-500 font-semibold mt-1 leading-relaxed">{newPasswordError}</p>}
                    </div>
                  </div>
                )}

                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={() => toggleAuthMode("PASSWORD_LOGIN")}
                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 font-bold bg-transparent border-0 cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Password Sign In
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #f97316, #ea580c)", boxShadow: "0 4px 16px rgba(249,115,22,0.35)" }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : authMode === "SIGNUP" ? (
                <><UserPlus className="w-4 h-4" /><span>Create Customer Account</span></>
              ) : authMode === "RECOVERY" ? (
                <><ShieldCheck className="w-4 h-4" /><span>Reset Password</span></>
              ) : (
                <><LogIn className="w-4 h-4" /><span>Sign In to Store</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
