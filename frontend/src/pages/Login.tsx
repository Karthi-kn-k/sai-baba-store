import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../api";
import { encryptPassword } from "../utils/crypto";
import { 
  Mail, Lock, User, Phone, LogIn, UserPlus, 
  Eye, EyeOff 
} from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  
  // Modes: PASSWORD_LOGIN | SIGNUP
  const [authMode, setAuthMode] = useState<"PASSWORD_LOGIN" | "SIGNUP">("PASSWORD_LOGIN");
  const [loading, setLoading] = useState(false);
  
  // Shared fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Validation Error States
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [identifierError, setIdentifierError] = useState("");

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setIdentifierError("");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;

    if (trimmed.includes("@")) {
      if (!emailRegex.test(trimmed)) {
        setIdentifierError("Enter a valid email address (e.g. user@gmail.com).");
      } else {
        setIdentifierError("");
      }
    } else if (/^\d+$/.test(trimmed)) {
      if (!phoneRegex.test(trimmed)) {
        setIdentifierError("Enter a valid 10-digit Indian mobile number (6-9).");
      } else {
        setIdentifierError("");
      }
    } else {
      setIdentifierError("Enter a valid email address or 10-digit Indian mobile number.");
    }
  };

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
    const numericOnly = val.replace(/\D/g, "").slice(0, 10);
    setPhone(numericOnly);
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!numericOnly) setPhoneError("Mobile number is required.");
    else if (!phoneRegex.test(numericOnly)) setPhoneError("Enter a valid 10-digit Indian mobile number (6-9).");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === "PASSWORD_LOGIN") {
      if (!identifier.trim() || !password) {
        showToast("Email/Phone and password are required.", "warning");
        return;
      }

      setLoading(true);
      try {
        const encryptedPassword = encryptPassword(password);
        await login({ email: identifier.trim(), password: encryptedPassword });
        showToast("Signed in successfully!", "success");
      } catch (err: any) {
        showToast(err.message || "Invalid credentials.", "error");
      } finally {
        setLoading(false);
      }
    } 
    
    else if (authMode === "SIGNUP") {
      if (nameError || emailError || phoneError || passwordError || !name || !email || !phone || !password) {
        showToast("Please fill in all registration fields correctly.", "warning");
        return;
      }

      setLoading(true);
      try {
        const encryptedPassword = encryptPassword(password);
        await authApi.signup({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password: encryptedPassword,
          role: "CUSTOMER"
        });
        showToast("Account created successfully! Signing in...", "success");
        await login({ email: email.trim(), password: encryptedPassword });
      } catch (err: any) {
        showToast(err.message || "Signup failed.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAuthMode = (mode: typeof authMode) => {
    setAuthMode(mode);
    setShowPassword(false);
    setNameError(""); setEmailError(""); setPhoneError("");
    setPasswordError(""); setIdentifierError("");
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
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      className={`w-full bg-white dark:bg-slate-800 border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 dark:text-white ${
                        identifierError
                          ? "border-rose-300 dark:border-rose-900/50 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-900 dark:focus:ring-emerald-500"
                      }`}
                      placeholder="e.g. name@email.com or 9876543210"
                      required
                    />
                  </div>
                  {identifierError && <p className="text-[10px] text-rose-500 font-semibold mt-1">{identifierError}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Password</label>
                    <button
                      type="button"
                      onClick={() => showToast("Please contact store admin to reset your password.", "info")}
                      className="text-[10px] text-orange-600 dark:text-orange-400 font-bold hover:underline bg-transparent border-0 cursor-pointer"
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
