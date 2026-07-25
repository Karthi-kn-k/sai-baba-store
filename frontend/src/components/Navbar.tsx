import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useShop } from "../context/ShopContext";
import { useToast } from "../context/ToastContext";
import { authApi } from "../api";
import { LogOut, ShoppingCart, Power, User, X, Mail, Phone, ShieldCheck, Camera, Trash2, UserPlus, Eye, EyeOff, CreditCard } from "lucide-react";

interface NavbarProps {
  onCartToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onCartToggle }) => {
  const { user, logout, updateUser } = useAuth();
  const { cartCount } = useCart();
  const { isShopOpen, toggleShopOpen } = useShop();
  const { showToast } = useToast();
  const [profileOpen, setProfileOpen] = useState(false);

  // Store UPI ID Management state
  const [upiVpaInput, setUpiVpaInput] = useState(() => {
    return localStorage.getItem("saibaba_merchant_vpa") || "karthikn221005@oksbi";
  });

  const handleSaveUpiVpa = async () => {
    if (!upiVpaInput.trim()) {
      showToast("UPI ID cannot be empty.", "warning");
      return;
    }
    const token = localStorage.getItem("accessToken");
    try {
      await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ upiVpa: upiVpaInput.trim() })
      });
      localStorage.setItem("saibaba_merchant_vpa", upiVpaInput.trim());
      showToast(`Store UPI ID updated globally to ${upiVpaInput.trim()}`, "success");
    } catch (e: any) {
      showToast(e.message || "Failed to update UPI ID on cloud server.", "error");
    }
  };

  // Add Admin form state inside Profile Modal
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [addingAdmin, setAddingAdmin] = useState(false);

  if (!user) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updateUser({ avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    updateUser({ avatarUrl: null });
  };

  const handleCreateAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminPhone.trim() || !adminPassword) {
      showToast("All fields are required to create a new Admin.", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail.trim())) {
      showToast("Please enter a valid email address.", "warning");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(adminPhone.trim())) {
      showToast("Phone number must be a valid 10-digit Indian mobile number.", "warning");
      return;
    }

    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!strongPasswordRegex.test(adminPassword)) {
      showToast("Password must be 8+ chars with uppercase, lowercase, digit, and symbol.", "warning");
      return;
    }

    setAddingAdmin(true);
    try {
      await authApi.signup({
        name: adminName.trim(),
        email: adminEmail.trim(),
        phone: adminPhone.trim(),
        password: adminPassword,
        role: "ADMIN"
      });
      showToast(`Successfully registered new Admin (${adminName.trim()})!`, "success");
      setAdminName("");
      setAdminEmail("");
      setAdminPhone("");
      setAdminPassword("");
      setShowAddAdmin(false);
    } catch (err: any) {
      showToast(err.message || "Failed to create new Admin.", "error");
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <>
      <nav
        className="sticky top-0 z-30"
        style={{
          background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #7c2d12 100%)",
          boxShadow: "0 4px 20px rgba(127,29,29,0.35)",
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center gap-2">

            {/* ── Logo ── */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Om symbol circle */}
              <div
                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold border-2"
                style={{
                  background: "rgba(253,230,138,0.15)",
                  borderColor: "rgba(253,230,138,0.4)",
                  color: "#fde68a",
                  fontFamily: "'Tiro Devanagari Hindi', serif",
                }}
              >
                ॐ
              </div>
              <div className="min-w-0">
                <span
                  className="font-bold tracking-tight text-sm sm:text-base block leading-none truncate"
                  style={{ color: "#fde68a" }}
                >
                  Sai Baba Store
                </span>
                <span
                  className="text-[9px] sm:text-[10px] font-semibold tracking-widest uppercase block mt-0.5 flex items-center gap-1"
                  style={{ color: "rgba(253,230,138,0.65)" }}
                >
                  Grocery &amp; Ledger
                  {!isShopOpen && (
                    <span className="text-[8px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase">
                      CLOSED
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* ── Right side actions ── */}
            <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">

              {/* Admin Toggle Shop Status Button */}
              {user.role === "ADMIN" && (
                <button
                  onClick={toggleShopOpen}
                  className="flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-md"
                  style={
                    isShopOpen
                      ? {
                          background: "linear-gradient(135deg, #dc2626, #991b1b)",
                          color: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }
                      : {
                          background: "linear-gradient(135deg, #16a34a, #15803d)",
                          color: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.2)",
                        }
                  }
                  title={isShopOpen ? "Click to Close Shop" : "Click to Open Shop"}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isShopOpen ? "Close Shop" : "Open Shop"}</span>
                </button>
              )}

              {/* User Name + Avatar with click for profile details modal */}
              <button
                onClick={() => setProfileOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl transition-all cursor-pointer hover:bg-white/10"
                style={{ background: "rgba(253,230,138,0.12)", border: "1px solid rgba(253,230,138,0.2)" }}
                title="Click to view Profile Details"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-amber-200"
                  style={{ background: "#f97316", color: "white" }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-bold truncate max-w-[120px]" style={{ color: "#fde68a" }}>
                  {user.name}
                </span>
              </button>

              {/* Cart Icon — customers only */}
              {user.role === "CUSTOMER" && onCartToggle && (
                <button
                  onClick={onCartToggle}
                  className="relative p-2 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: "rgba(253,230,138,0.12)",
                    color: "#fde68a",
                  }}
                  title="View Cart"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white rounded-full px-1"
                      style={{ background: "#f97316" }}
                    >
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Logout */}
              <button
                onClick={logout}
                className="flex items-center gap-1 text-xs font-semibold px-2 sm:px-3 py-2 rounded-xl transition-all cursor-pointer"
                style={{
                  background: "rgba(127,29,29,0.4)",
                  color: "rgba(254,202,202,0.9)",
                  border: "1px solid rgba(254,202,202,0.2)",
                }}
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Profile Details Modal Overlay */}
      {profileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProfileOpen(false)} />
          <div
            className="relative w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-scale-up z-10 space-y-5"
            style={{ background: "#fffbf5", border: "2px solid rgba(249,115,22,0.25)" }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "rgba(249,115,22,0.15)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#7f1d1d", color: "#fde68a" }}>
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base" style={{ color: "#7f1d1d" }}>
                  {user.role === "ADMIN" ? "Admin Profile" : "Customer Profile"}
                </h3>
              </div>
              <button
                onClick={() => setProfileOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-black transition-colors cursor-pointer"
                style={{ background: "#e2e8f0" }}
                title="Close"
              >
                <X className="w-5 h-5" style={{ color: "#000000" }} />
              </button>
            </div>

            {/* Profile Avatar Section with Upload / Change / Remove */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold border-4 shadow-md"
                  style={{ background: "#f97316", borderColor: "#7f1d1d", color: "white" }}
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110"
                  style={{ background: "#7f1d1d", color: "#fde68a" }}
                  title="Upload / Change Profile Picture"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <label
                  htmlFor="avatar-upload"
                  className="text-xs font-bold underline cursor-pointer text-orange-600 hover:text-orange-700"
                >
                  {user.avatarUrl ? "Change Photo" : "Upload Photo"}
                </label>
                {user.avatarUrl && (
                  <>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={handleRemoveAvatar}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs flex items-center gap-3">
                <User className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Full Name</p>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs flex items-center gap-3">
                <Mail className="w-4 h-4 text-orange-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs flex items-center gap-3">
                <Phone className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Mobile Number</p>
                  <p className="text-xs font-semibold text-slate-900">{user.phone}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-xs flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Role &amp; Account</p>
                  <p className="text-xs font-semibold text-slate-900">{user.role} · Active</p>
                </div>
              </div>

              {/* Admin Only: Store UPI VPA Management Field */}
              {user.role === "ADMIN" && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-orange-600" />
                      Store UPI ID (VPA)
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upiVpaInput}
                      onChange={(e) => setUpiVpaInput(e.target.value)}
                      placeholder="e.g. your_name@oksbi"
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveUpiVpa}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shrink-0"
                      style={{ background: "#7f1d1d" }}
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">Payments & QR codes will direct money to this UPI ID.</p>
                </div>
              )}
            </div>

            {/* Admin Only: Option to Add Another Admin Account */}
            {user.role === "ADMIN" && (
              <div className="pt-2 border-t border-amber-200/60">
                {!showAddAdmin ? (
                  <button
                    type="button"
                    onClick={() => setShowAddAdmin(true)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    style={{ background: "#7f1d1d", color: "#fde68a" }}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Admin Account</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateAdminSubmit} className="space-y-3 bg-orange-50/60 p-3.5 rounded-2xl border border-orange-200 animate-slide-in">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-xs text-amber-900 flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5 text-orange-600" />
                        Create Co-Admin Account
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddAdmin(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Admin Full Name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        required
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        placeholder="Admin Email Address"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <input
                        type="tel"
                        placeholder="Indian Mobile Number (10 digits)"
                        value={adminPhone}
                        onChange={(e) => setAdminPhone(e.target.value)}
                        required
                        className="w-full bg-white border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="relative">
                      <input
                        type={showAdminPassword ? "text" : "password"}
                        placeholder="Set Admin Password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                        className="w-full bg-white border border-amber-200 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPassword(prev => !prev)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        title={showAdminPassword ? "Hide password" : "Show password"}
                      >
                        {showAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={addingAdmin}
                      className="w-full text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
                    >
                      {addingAdmin ? "Creating..." : "Confirm & Create Admin"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <button
              onClick={() => setProfileOpen(false)}
              className="btn-primary w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </>
  );
};
