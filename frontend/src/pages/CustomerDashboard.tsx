import React, { useState, useEffect, useMemo } from "react";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { useShop } from "../context/ShopContext";
import { productApi, orderApi, ledgerApi } from "../api";
import { QRCodeSVG } from "qrcode.react";
import {
  Search, ShoppingCart, Trash2, Plus, Minus, CreditCard,
  ShoppingBag, X, IndianRupee, AlertCircle,
  BookOpen, Package, History as LedgerIcon, Clock
} from "lucide-react";

/* ── Device detection hook ── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

/* ── Sai Baba devotional colour tokens ── */
const SAI = {
  saffron:    "#f97316",
  saffronDp:  "#ea580c",
  gold:       "#d97706",
  goldLight:  "#fef3c7",
  maroon:     "#7f1d1d",
  maroonMid:  "#991b1b",
  cream:      "#fffbf5",
  creamDk:    "#fef3e2",
  text:       "#1c0a00",
  textMuted:  "#a16207",
};

export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { showToast } = useToast();
  const { isShopOpen } = useShop();
  const isMobile = useIsMobile();

  // Page layout
  const [activeTab, setActiveTab] = useState<"catalog" | "orders">(() => isShopOpen ? "catalog" : "orders");
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!isShopOpen) {
      setActiveTab("orders");
    }
  }, [isShopOpen]);

  // Per-product qty picker
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});
  const getProductQty = (id: string) => productQtys[id] ?? 1;
  const setProductQty = (id: string, qty: number, stockQty: number) =>
    setProductQtys(prev => ({ ...prev, [id]: Math.max(1, Math.min(qty, stockQty)) }));

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  // Checkout
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<any>(null);
  const [upiTxnRef, setUpiTxnRef] = useState("");
  const [submittingTxnRef, setSubmittingTxnRef] = useState(false);

  // Ledger settlement
  const [ledgerPayModalOpen, setLedgerPayModalOpen] = useState(false);
  const [ledgerPayAmount, setLedgerPayAmount] = useState("");
  const [ledgerUpiTxnRef, setLedgerUpiTxnRef] = useState("");
  const [submittingLedgerUpi, setSubmittingLedgerUpi] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  const [upiConfig, setUpiConfig] = useState<{ upiVpa: string; upiName: string }>(() => {
    const localVpa = localStorage.getItem("saibaba_merchant_vpa");
    return {
      upiVpa: localVpa || "karthikn221005@oksbi",
      upiName: "karthi keyan",
    };
  });

  /* ── Data loading ── */
  const loadData = async () => {
    setLoading(true);
    try {
      const prodData = await productApi.list({ activeOnly: true });
      setProducts(prodData.products);
      const ordData = await orderApi.list();
      setOrders(ordData.orders);
      const ledData = await ledgerApi.getLedger();
      setLedger(ledData);
      const config = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/config`).then(r => r.json()).catch(() => ({}));
      const localVpa = localStorage.getItem("saibaba_merchant_vpa");
      if (localVpa) {
        setUpiConfig({ upiVpa: localVpa, upiName: config.upiName || "karthi keyan" });
      } else if (config.upiVpa && config.upiName) {
        setUpiConfig({ upiVpa: config.upiVpa, upiName: config.upiName });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const fn = () => setCartOpen(prev => !prev);
    window.addEventListener("toggle-cart-drawer", fn);
    return () => window.removeEventListener("toggle-cart-drawer", fn);
  }, []);

  const RESTRICTED_TERMS = ["tobacco", "cigarette", "cigerette", "cigar", "beedi", "bidi", "gutkha", "gutka", "paan", "drug", "smoke", "liquor", "alcohol"];

  const isRestricted = (text: string) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return RESTRICTED_TERMS.some(term => lower.includes(term));
  };

  /* ── Derived ── */
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        p.category.split(",").forEach((c: string) => set.add(c.trim()));
      }
    });
    const list = Array.from(set).filter(Boolean);
    return list.sort((a, b) => {
      const aRest = isRestricted(a);
      const bRest = isRestricted(b);
      if (aRest && !bRest) return 1;
      if (!aRest && bRest) return -1;
      return a.localeCompare(b);
    });
  }, [products]);
  
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const ms = p.name.toLowerCase().includes(search.toLowerCase());
      const pCats = p.category ? p.category.split(",").map((c: string) => c.trim()) : [];
      const mc = category ? pCats.includes(category) : true;
      return ms && mc;
    });

    if (search.trim() !== "" && result.length === 0) {
      const fallback = products.filter(p => {
        const cat = p.category.toLowerCase();
        return cat.includes("chocolate") || cat.includes("sweet");
      });
      result = fallback.length > 0 ? fallback : products;
    }

    // Force non-restricted products (Biscuits, Dairy, Grains) to top, and Cigarette/Tobacco to bottom
    return [...result].sort((a, b) => {
      const aRest = isRestricted(a.name) || isRestricted(a.category);
      const bRest = isRestricted(b.name) || isRestricted(b.category);
      if (aRest && !bRest) return 1;
      if (!aRest && bRest) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [products, search, category]);

  const monthsList = useMemo(() => {
    if (!ledger?.entries) return [];
    return Array.from(new Set(
      ledger.entries.map((e: any) => new Date(e.createdAt).toLocaleString("en-IN", { month: "long" }))
    )) as string[];
  }, [ledger?.entries]);

  const filteredLedgerEntries = useMemo(() => {
    if (!ledger?.entries) return [];
    if (!selectedMonth) return ledger.entries;
    return ledger.entries.filter((e: any) =>
      new Date(e.createdAt).toLocaleString("en-IN", { month: "long" }).toLowerCase() === selectedMonth.toLowerCase()
    );
  }, [ledger?.entries, selectedMonth]);

  const monthlySpendingTotal = useMemo(() =>
    filteredLedgerEntries
      .filter((e: any) => e.type === "DEBIT" && e.status === "APPROVED")
      .reduce((s: number, e: any) => s + e.amount, 0),
    [filteredLedgerEntries]);

  /* ── UPI deep links ── */
  const buildUpiLink = (vpa: string, name: string, amount: string, note: string) =>
    `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

  const upiDeepLink = useMemo(() => {
    if (!pendingPaymentOrder) return "";
    return buildUpiLink(
      upiConfig.upiVpa, upiConfig.upiName,
      pendingPaymentOrder.totalAmount.toFixed(2),
      `Order ${pendingPaymentOrder.id.slice(0, 8)}`
    );
  }, [pendingPaymentOrder, upiConfig]);

  const ledgerUpiLink = useMemo(() => {
    if (!ledgerPayAmount) return "";
    return buildUpiLink(
      upiConfig.upiVpa, upiConfig.upiName,
      parseFloat(ledgerPayAmount).toFixed(2),
      "Settle Khata"
    );
  }, [ledgerPayAmount, upiConfig]);

  /* ── Handlers ── */
  const [requestingNotebookLoading, setRequestingNotebookLoading] = useState(false);
  const handleRequestNotebook = async () => {
    setRequestingNotebookLoading(true);
    try {
      await ledgerApi.requestNotebook();
      showToast("Notebook activation request submitted!", "success");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      showToast(err.message || "Failed to request notebook.", "error");
    } finally {
      setRequestingNotebookLoading(false);
    }
  };

  const handleLedgerSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ledgerUpiTxnRef.trim()) { showToast("Enter the UTR number.", "warning"); return; }
    if (!ledgerPayAmount || parseFloat(ledgerPayAmount) <= 0) { showToast("Enter a valid amount.", "warning"); return; }
    setSubmittingLedgerUpi(true);
    try {
      await ledgerApi.submitLedgerUpiSettle({ amount: parseFloat(ledgerPayAmount), upiTxnRef: ledgerUpiTxnRef });
      showToast("UPI reference submitted for ledger credit!", "success");
      setLedgerPayModalOpen(false);
      setLedgerUpiTxnRef("");
      const ledData = await ledgerApi.getLedger();
      setLedger(ledData);
    } catch (err: any) {
      showToast(err.message || "Failed to submit ledger payment.", "error");
    } finally {
      setSubmittingLedgerUpi(false);
    }
  };

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiTxnRef.trim()) { showToast("Enter the UTR number.", "warning"); return; }
    setSubmittingTxnRef(true);
    try {
      await ledgerApi.submitUpiRef({ orderId: pendingPaymentOrder.id, upiTxnRef });
      showToast("UPI reference submitted! Admin will confirm shortly.", "success");
      setPendingPaymentOrder(null);
      setUpiTxnRef("");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to submit transaction reference.", "error");
    } finally {
      setSubmittingTxnRef(false);
    }
  };

  const handleCheckout = async (method: "UPI" | "PICKUP" | "DEBT") => {
    if (cart.length === 0) return;
    setCheckoutSubmitting(true);
    try {
      const res = await orderApi.place({
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity })),
        paymentMethod: method,
      });
      showToast(res.message || "Order placed successfully!", "success");
      clearCart();
      setCartOpen(false);
      const ordData = await orderApi.list();
      setOrders(ordData.orders);
      const ledData = await ledgerApi.getLedger();
      setLedger(ledData);
      if (method === "UPI") setPendingPaymentOrder(res.order);
    } catch (err: any) {
      showToast(err.message || "Checkout failed.", "error");
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Cancel this order? Inventory will be restored.")) return;
    try {
      await orderApi.updateStatus(orderId, "CANCELLED");
      showToast("Order cancelled.", "success");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel order.", "error");
    }
  };

  /* ── Status badge helper ── */
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PLACED:    "background:#fef3c7;color:#92400e;border:1px solid #fde68a",
      CONFIRMED: "background:#fef3c7;color:#d97706;border:1px solid #fcd34d",
      PACKED:    "background:#fde68a;color:#92400e;border:1px solid #f59e0b",
      FULFILLED: "background:#d1fae5;color:#065f46;border:1px solid #6ee7b7",
      CANCELLED: "background:#fee2e2;color:#991b1b;border:1px solid #fca5a5",
    };
    return map[status] || "background:#f3f4f6;color:#374151";
  };

  /* ─────────────────────── RENDER ──────────────────────── */
  return (
    <div style={{ color: SAI.text, minHeight: "100dvh", paddingBottom: isMobile ? "80px" : "0" }}>

      {/* ── STORE CLOSED BANNER NOTICE (ordering disabled) ── */}
      {!isShopOpen && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
          <div
            className="p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-slide-in"
            style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "white", border: "1px solid rgba(253,230,138,0.3)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl shrink-0" style={{ background: "rgba(253,230,138,0.15)", color: "#fde68a" }}>
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm" style={{ color: "#fde68a" }}>
                  Store Currently Closed for New Orders
                </h4>
                <p className="text-xs mt-0.5" style={{ color: "rgba(254,243,199,0.8)" }}>
                  You can still view your <strong>Account Note</strong> ledger and past orders below. New order placement will reopen soon.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shrink-0" style={{ background: "rgba(253,230,138,0.2)", color: "#fde68a" }}>
              CLOSED
            </span>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════╗
          ║   DEVOTIONAL BALANCE / ACCOUNT CARD  ║
          ╚══════════════════════════════════════╝ */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2">

        {/* Balance + cart row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-4">

          {/* Account Balance Card */}
          {user?.hasAccountNotebook ? (
            <div
              className="sai-banner sm:col-span-2 rounded-2xl p-4 sm:p-6 relative overflow-hidden"
              style={{ minHeight: "120px" }}
            >
              <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "rgba(253,230,138,0.7)" }}>
                Account Note Balance
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold mt-1" style={{ color: "#fde68a" }}>
                ₹{ledger?.balance !== undefined ? ledger.balance.toFixed(2) : "0.00"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className="text-[10px] font-bold px-3 py-1 rounded-full border"
                  style={
                    (ledger?.balance || 0) > 0
                      ? { background: "rgba(251,191,36,0.2)", color: "#fde68a", borderColor: "rgba(253,230,138,0.35)" }
                      : { background: "rgba(52,211,153,0.15)", color: "#6ee7b7", borderColor: "rgba(52,211,153,0.3)" }
                  }
                >
                  {(ledger?.balance || 0) > 0 ? "⚠ Payment Outstanding" : "✓ Account Clear"}
                </span>
                <button
                  onClick={() => setLedgerModalOpen(true)}
                  className="text-[11px] font-bold underline cursor-pointer"
                  style={{ color: "#fde68a", background: "none", border: "none" }}
                >
                  View Account Note
                </button>
                {(ledger?.balance || 0) > 0 && (
                  <button
                    onClick={() => { setLedgerPayAmount(ledger.balance.toString()); setLedgerPayModalOpen(true); }}
                    className="btn-gold text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Pay Off Balance
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="sai-banner sm:col-span-2 rounded-2xl p-4 sm:p-6 relative overflow-hidden"
              style={{ minHeight: "120px" }}
            >
              <p className="text-[10px] uppercase font-bold tracking-widest mb-1" style={{ color: "rgba(253,230,138,0.7)" }}>
                Account Note
              </p>
              <p className="font-bold text-base" style={{ color: "#fef3c7" }}>Activate your Account Note</p>
              <p className="text-xs mt-1 mb-3" style={{ color: "rgba(254,243,199,0.65)" }}>
                Buy groceries on credit, track statements, pay later.
              </p>
              {(!user?.notebookRequestStatus || user?.notebookRequestStatus === "NONE") ? (
                <button
                  onClick={handleRequestNotebook}
                  disabled={requestingNotebookLoading}
                  className="btn-gold text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  {requestingNotebookLoading ? "Requesting..." : "Activate Account Note (₹1,000 Deposit)"}
                </button>
              ) : user?.notebookRequestStatus === "PENDING" ? (
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "rgba(253,230,138,0.2)", color: "#fde68a", border: "1px solid rgba(253,230,138,0.3)" }}>
                  Pending Verification — Please pay ₹1,000 deposit to owner
                </span>
              ) : (
                <span className="text-xs" style={{ color: "rgba(254,243,199,0.7)" }}>Processing…</span>
              )}
            </div>
          )}

          {/* Cart Summary Card */}
          <div className="rounded-2xl p-4 sm:p-5 flex flex-col justify-between" style={{ background: "white", border: "2px solid rgba(249,115,22,0.2)", boxShadow: "0 2px 12px rgba(249,115,22,0.08)" }}>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: SAI.textMuted }}>Shopping Cart</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: SAI.maroon }}>
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </p>
              <p className="text-xs font-bold mt-0.5" style={{ color: SAI.saffron }}>
                ₹{cartTotal.toFixed(2)} total
              </p>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="btn-primary w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              View Cart
            </button>
          </div>
        </div>

        {/* ── DESKTOP TAB BAR (hidden on mobile — bottom nav used instead) ── */}
        <div className="hidden sm:flex border-b mb-5" style={{ borderColor: "rgba(249,115,22,0.15)" }}>
          {(["catalog", "orders"] as const).map(tab => {
            const isDisabled = !isShopOpen && tab === "catalog";
            return (
              <button
                key={tab}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
                  isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{
                  borderColor: activeTab === tab ? SAI.saffron : "transparent",
                  color: activeTab === tab ? SAI.saffron : SAI.textMuted,
                }}
                title={isDisabled ? "Store is closed for ordering" : ""}
              >
                {tab === "catalog" ? <ShoppingBag className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                {tab === "catalog" ? "Browse Groceries (Closed)" : "My Orders"}
              </button>
            );
          })}
          {user?.hasAccountNotebook && (
            <button
              onClick={() => setLedgerModalOpen(true)}
              className="py-3 px-6 font-bold text-sm border-b-2 border-transparent transition-all flex items-center gap-2 cursor-pointer"
              style={{ color: SAI.textMuted }}
            >
              <BookOpen className="w-4 h-4" />
              Account Note
            </button>
          )}
        </div>

        {/* ── LOADING ── */}
        {loading && products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div
              className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
              style={{ borderColor: SAI.saffron, borderTopColor: "transparent" }}
            />
            <p className="mt-4 text-sm font-semibold" style={{ color: SAI.textMuted }}>
              🙏 Loading Sai Baba Store…
            </p>
          </div>
        ) : (
          <>
            {/* ══════════════════════════════════════════════
                TAB 1 — PRODUCT CATALOG
            ══════════════════════════════════════════════ */}
            {activeTab === "catalog" && (
              <div className="space-y-4">

                {/* Search + Category */}
                <div
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 rounded-2xl"
                  style={{ background: "white", border: "1px solid rgba(249,115,22,0.15)", boxShadow: "0 2px 8px rgba(249,115,22,0.05)" }}
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: SAI.saffron }} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="saffron-input w-full text-sm"
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="Search groceries…"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider shrink-0" style={{ color: SAI.textMuted }}>
                      Category:
                    </span>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="saffron-input flex-1 sm:w-48 text-sm font-semibold cursor-pointer"
                      style={{ color: SAI.text }}
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product Grid */}
                {filteredProducts.length === 0 ? (
                  <div
                    className="text-center py-20 rounded-2xl"
                    style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}
                  >
                    <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(249,115,22,0.3)" }} />
                    <p className="font-semibold" style={{ color: SAI.textMuted }}>No products found</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(161,98,7,0.6)" }}>Try changing search or category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
                    {filteredProducts.map(p => (
                      <div key={p.id} className="product-card flex flex-col hover-lift animate-fade-in">

                        {/* Product Image */}
                        <div className="relative aspect-square w-full overflow-hidden" style={{ background: SAI.cream }}>
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-10 h-10" style={{ color: "rgba(249,115,22,0.25)" }} />
                            </div>
                          )}
                          {p.stockQty === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(255,251,245,0.85)" }}>
                              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: SAI.maroon, color: "white" }}>
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Detail */}
                        <div className="p-3 flex-1 flex flex-col justify-between" style={{ background: "white" }}>
                          <div>
                            <div className="flex flex-wrap gap-1 mb-0.5">
                              {p.category.split(",").map((c: string, idx: number) => (
                                <span key={idx} className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-md" style={{ background: "#fffbf5", color: SAI.saffron, border: "1px solid rgba(249,115,22,0.2)" }}>
                                  {c.trim()}
                                </span>
                              ))}
                            </div>
                            <h3 className="font-bold text-xs sm:text-sm mt-0.5 leading-snug line-clamp-2" style={{ color: SAI.maroon }}>
                              {p.name}
                            </h3>
                          </div>

                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-base font-extrabold" style={{ color: SAI.text }}>₹{p.price.toFixed(2)}</p>
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: p.stockQty < 10 ? "#b91c1c" : "#15803d" }}
                              >
                                {p.stockQty} left
                              </span>
                            </div>

                            {p.stockQty > 0 && (
                              <React.Fragment>
                                {/* Qty picker */}
                                <div className="flex items-center gap-1.5 mb-2">
                                  <span className="text-[9px] font-bold uppercase" style={{ color: SAI.textMuted }}>Qty:</span>
                                  <div
                                    className="flex items-center rounded-lg overflow-hidden"
                                    style={{ border: "1.5px solid rgba(249,115,22,0.25)" }}
                                  >
                                    <button
                                      onClick={() => setProductQty(p.id, getProductQty(p.id) - 1, p.stockQty)}
                                      className="px-2 py-1 cursor-pointer transition-colors"
                                      style={{ color: SAI.maroon, background: SAI.cream }}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <input
                                      type="number"
                                      min={1}
                                      max={p.stockQty}
                                      value={getProductQty(p.id)}
                                      onChange={e => setProductQty(p.id, parseInt(e.target.value) || 1, p.stockQty)}
                                      className="w-8 text-center text-sm font-bold focus:outline-none border-none"
                                      style={{ background: "white", color: SAI.text }}
                                    />
                                    <button
                                      onClick={() => setProductQty(p.id, getProductQty(p.id) + 1, p.stockQty)}
                                      className="px-2 py-1 cursor-pointer transition-colors"
                                      style={{ color: SAI.maroon, background: SAI.cream }}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {/* Add to cart */}
                                <button
                                  onClick={() => { addToCart(p, getProductQty(p.id)); setProductQty(p.id, 1, p.stockQty); }}
                                  className="btn-primary w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  Add to Cart
                                </button>
                              </React.Fragment>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════
                TAB 2 — ORDERS LIST
            ══════════════════════════════════════════════ */}
            {activeTab === "orders" && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(249,115,22,0.15)", boxShadow: "0 2px 12px rgba(249,115,22,0.06)" }}>
                <div className="p-4 sm:p-6" style={{ borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
                  <h2 className="text-base sm:text-lg font-bold" style={{ color: SAI.maroon }}>My Purchase History</h2>
                  <p className="text-xs mt-0.5" style={{ color: SAI.textMuted }}>Track and review all your orders</p>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-20">
                    <Package className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(249,115,22,0.2)" }} />
                    <p className="font-semibold" style={{ color: SAI.textMuted }}>No orders yet.</p>
                  </div>
                ) : (
                  /* Mobile: card list | Desktop: table */
                  isMobile ? (
                    <div className="divide-y" style={{ borderColor: "rgba(249,115,22,0.08)" }}>
                      {orders.map(o => (
                        <div key={o.id} className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-bold" style={{ color: SAI.maroon }}>#{o.id.slice(0, 8)}</span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ cssText: statusBadge(o.status) } as any}
                            >
                              {o.status === "PACKED" ? "READY FOR PICKUP" : o.status}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: SAI.textMuted }}>
                              {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                            <span className="font-bold" style={{ color: SAI.saffron }}>{o.paymentMethod}</span>
                          </div>
                          <p className="text-lg font-extrabold" style={{ color: SAI.maroon }}>₹{o.totalAmount.toFixed(2)}</p>
                          <div className="flex gap-2 mt-2">
                            {o.paymentMethod === "UPI" && o.payments?.[0]?.status === "PENDING" && o.status !== "CANCELLED" && (
                              <button
                                onClick={() => setPendingPaymentOrder(o)}
                                className="btn-primary text-xs px-3 py-1.5 rounded-lg flex-1 cursor-pointer font-bold"
                              >
                                Pay UPI
                              </button>
                            )}
                            {(o.status === "PLACED" || o.status === "CONFIRMED") && (
                              <button
                                onClick={() => handleCancelOrder(o.id)}
                                className="text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer flex-1"
                                style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase tracking-wider" style={{ background: SAI.cream, borderBottom: "1px solid rgba(249,115,22,0.1)", color: SAI.textMuted }}>
                            <th className="py-3 px-5">Order ID</th>
                            <th className="py-3 px-5">Placed At</th>
                            <th className="py-3 px-5">Payment</th>
                            <th className="py-3 px-5">Total</th>
                            <th className="py-3 px-5">Status</th>
                            <th className="py-3 px-5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(o => (
                            <tr key={o.id} className="text-sm transition-colors hover:bg-orange-50/40" style={{ borderBottom: "1px solid rgba(249,115,22,0.06)" }}>
                              <td className="py-4 px-5 font-mono text-xs font-bold" style={{ color: SAI.maroon }}>#{o.id.slice(0, 8)}</td>
                              <td className="py-4 px-5 text-xs" style={{ color: SAI.textMuted }}>
                                {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-4 px-5 text-xs font-semibold" style={{ color: SAI.saffronDp }}>{o.paymentMethod}</td>
                              <td className="py-4 px-5 font-extrabold" style={{ color: SAI.text }}>₹{o.totalAmount.toFixed(2)}</td>
                              <td className="py-4 px-5">
                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ cssText: statusBadge(o.status) } as any}>
                                  {o.status === "PACKED" ? "READY FOR PICKUP" : o.status}
                                </span>
                              </td>
                              <td className="py-4 px-5 text-right space-x-2">
                                {o.paymentMethod === "UPI" && o.payments?.[0]?.status === "PENDING" && o.status !== "CANCELLED" && (
                                  <button onClick={() => setPendingPaymentOrder(o)} className="btn-primary text-xs px-3 py-1.5 rounded-lg cursor-pointer font-bold">Pay UPI</button>
                                )}
                                {(o.status === "PLACED" || o.status === "CONFIRMED") && (
                                  <button
                                    onClick={() => handleCancelOrder(o.id)}
                                    className="text-xs px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                                    style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
                                  >
                                    Cancel Order
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ╔══════════════════════════════════════╗
          ║   MOBILE BOTTOM NAV                  ║
          ╚══════════════════════════════════════╝ */}
      <div className="mobile-bottom-nav sm:hidden">
        <button
          disabled={!isShopOpen}
          className={activeTab === "catalog" ? "active" : ""}
          onClick={() => isShopOpen && setActiveTab("catalog")}
          style={{ opacity: !isShopOpen ? 0.4 : 1 }}
        >
          <ShoppingBag className="w-5 h-5" />
          {isShopOpen ? "Shop" : "Closed"}
        </button>
        <button className={activeTab === "orders" ? "active" : ""} onClick={() => setActiveTab("orders")}>
          <Package className="w-5 h-5" />
          Orders
        </button>
        {isShopOpen && (
          <button onClick={() => setCartOpen(true)} style={{ position: "relative" }}>
            <ShoppingCart className="w-5 h-5" />
            {cart.reduce((s, i) => s + i.quantity, 0) > 0 && (
              <span
                className="absolute top-1 right-4 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold text-white rounded-full px-1"
                style={{ background: SAI.saffron }}
              >
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
            Cart
          </button>
        )}
        {user?.hasAccountNotebook && (
          <button onClick={() => setLedgerModalOpen(true)}>
            <BookOpen className="w-5 h-5" />
            Account Note
          </button>
        )}
      </div>

      {/* ╔══════════════════════════════════════╗
          ║   CART DRAWER                        ║
          ╚══════════════════════════════════════╝ */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <div
              className="w-screen max-w-sm sm:max-w-md flex flex-col shadow-2xl"
              style={{ background: "white" }}
            >
              {/* Header */}
              <div
                className="p-4 sm:p-5 flex items-center justify-between shrink-0"
                style={{ borderBottom: "2px solid rgba(249,115,22,0.12)", background: SAI.cream }}
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" style={{ color: SAI.saffron }} />
                  <h2 className="text-base font-bold" style={{ color: SAI.maroon }}>Your Basket</h2>
                </div>
                <button onClick={() => setCartOpen(false)} className="cursor-pointer p-1" style={{ color: SAI.textMuted }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4" style={{ color: "rgba(249,115,22,0.15)" }} />
                    <p className="font-semibold" style={{ color: SAI.textMuted }}>Your basket is empty</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(161,98,7,0.5)" }}>Browse products and add them here!</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={item.id}
                      className="flex gap-3 p-3 rounded-xl relative"
                      style={{ background: SAI.cream, border: "1px solid rgba(249,115,22,0.12)" }}
                    >
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden shrink-0"
                        style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}
                      >
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5" style={{ color: "rgba(249,115,22,0.3)" }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-sm font-bold truncate" style={{ color: SAI.maroon }}>{item.name}</p>
                        <p className="text-sm font-extrabold mt-0.5" style={{ color: SAI.saffronDp }}>₹{item.price.toFixed(2)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 rounded cursor-pointer"
                            style={{ background: "white", border: "1px solid rgba(249,115,22,0.2)", color: SAI.maroon }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-6 text-center" style={{ color: SAI.text }}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 rounded cursor-pointer"
                            style={{ background: "white", border: "1px solid rgba(249,115,22,0.2)", color: SAI.maroon }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="absolute right-3 top-3 cursor-pointer"
                        style={{ color: "rgba(161,98,7,0.4)" }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Checkout Footer */}
              {cart.length > 0 && (
                <div className="shrink-0 p-4 space-y-3" style={{ borderTop: "2px solid rgba(249,115,22,0.1)", background: SAI.cream }}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm" style={{ color: SAI.textMuted }}>Basket Total</span>
                    <span className="text-2xl font-extrabold" style={{ color: SAI.maroon }}>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: SAI.textMuted }}>
                    Choose Payment:
                  </p>
                  <div className={`grid gap-2 ${user?.hasAccountNotebook ? "grid-cols-3" : "grid-cols-2"}`}>
                    <button
                      onClick={() => handleCheckout("UPI")}
                      disabled={checkoutSubmitting}
                      className="btn-primary p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <CreditCard className="w-5 h-5" />
                      Pay UPI
                    </button>
                    <button
                      onClick={() => handleCheckout("PICKUP")}
                      disabled={checkoutSubmitting}
                      className="btn-maroon p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      Pay at Pickup
                    </button>
                    {user?.hasAccountNotebook && (
                      <button
                        onClick={() => handleCheckout("DEBT")}
                        disabled={checkoutSubmitting}
                        className="btn-gold p-3 rounded-xl flex flex-col items-center gap-1.5 text-xs font-bold cursor-pointer"
                      >
                        <IndianRupee className="w-5 h-5" />
                        Add to Khata
                      </button>
                    )}
                  </div>
                  {checkoutSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-xs" style={{ color: SAI.textMuted }}>
                      <span className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin inline-block" />
                      Placing order…
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════╗
          ║   UPI PAYMENT MODAL                  ║
          ║   Mobile → Deep link button          ║
          ║   Desktop → QR code                  ║
          ╚══════════════════════════════════════╝ */}
      {pendingPaymentOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPendingPaymentOrder(null)} />
          <div
            className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col items-center text-center animate-slide-up sm:animate-scale-up"
            style={{ background: "white", padding: "24px 20px", zIndex: 10, maxHeight: "95dvh", overflowY: "auto" }}
          >
            {/* Handle bar for mobile */}
            <div className="w-10 h-1 rounded-full mb-5 sm:hidden" style={{ background: "rgba(249,115,22,0.2)" }} />

            <button onClick={() => setPendingPaymentOrder(null)} className="absolute right-4 top-4 cursor-pointer" style={{ color: "rgba(161,98,7,0.5)" }}>
              <X className="w-5 h-5" />
            </button>

            {/* Om decoration */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fde68a", fontFamily: "'Tiro Devanagari Hindi', serif" }}
            >
              ॐ
            </div>

            <h3 className="text-base font-bold mb-1" style={{ color: SAI.maroon }}>
              {isMobile ? "Pay via UPI App" : "Scan & Pay via UPI"}
            </h3>

            <div
              className="text-xs font-bold px-4 py-1.5 rounded-full mb-4"
              style={{ background: SAI.goldLight, color: SAI.gold, border: `1px solid ${SAI.gold}` }}
            >
              Order #{pendingPaymentOrder.id.slice(0, 8)} · ₹{pendingPaymentOrder.totalAmount.toFixed(2)}
            </div>

            {/* QR Code section (Visible on Mobile & Desktop) */}
            <div className="p-4 rounded-2xl mb-3 flex flex-col items-center" style={{ background: "#fffbf5", border: "2px solid rgba(249,115,22,0.2)" }}>
              <QRCodeSVG
                value={upiDeepLink}
                size={180}
                level="M"
                fgColor={SAI.maroon}
                bgColor="#fffbf5"
              />
              <p className="text-[11px] font-semibold mt-2.5 text-center" style={{ color: SAI.textMuted }}>
                Scan with Google Pay, PhonePe, Paytm or FamPay
              </p>
            </div>

            {/* Mobile Actions: Copy UPI ID instruction note */}
            {isMobile && (
              <div className="w-full space-y-2 mb-4">
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <p className="text-xs font-bold text-orange-900 mb-1">💡 Payment Note:</p>
                  <p className="text-[11px] text-orange-800 leading-snug">
                    Copy the Store UPI ID below, open your UPI App (GPay / PhonePe / Paytm / FamPay), paste &amp; send ₹{pendingPaymentOrder.totalAmount.toFixed(2)}.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(upiConfig.upiVpa);
                    showToast(`UPI ID copied: ${upiConfig.upiVpa}`, "info");
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  style={{ background: "#7f1d1d", borderColor: "#7f1d1d", color: "#fde68a" }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Copy Store UPI ID: <strong>{upiConfig.upiVpa}</strong></span>
                </button>
              </div>
            )}

            {/* UTR Reference form */}
            <form onSubmit={handleUpiSubmit} className="w-full space-y-3 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: SAI.textMuted }}>
                UPI Transaction Reference (UTR)
              </label>
              <input
                type="text"
                required
                value={upiTxnRef}
                onChange={e => setUpiTxnRef(e.target.value)}
                className="saffron-input w-full text-center font-mono text-sm font-semibold"
                placeholder="Enter 12-digit UTR / Txn ID"
              />
              <button
                type="submit"
                disabled={submittingTxnRef}
                className="btn-maroon w-full py-3 rounded-xl text-sm font-bold cursor-pointer"
              >
                {submittingTxnRef ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Confirm Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════╗
          ║   LEDGER SETTLEMENT MODAL            ║
          ╚══════════════════════════════════════╝ */}
      {ledgerPayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setLedgerPayModalOpen(false)} />
          <div
            className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col items-center text-center animate-slide-up sm:animate-scale-up"
            style={{ background: "white", padding: "24px 20px", zIndex: 10, maxHeight: "95dvh", overflowY: "auto" }}
          >
            <div className="w-10 h-1 rounded-full mb-5 sm:hidden" style={{ background: "rgba(249,115,22,0.2)" }} />
            <button onClick={() => setLedgerPayModalOpen(false)} className="absolute right-4 top-4 cursor-pointer" style={{ color: "rgba(161,98,7,0.5)" }}>
              <X className="w-5 h-5" />
            </button>

            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-4"
              style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fde68a", fontFamily: "'Tiro Devanagari Hindi', serif" }}
            >
              ₹
            </div>

            <h3 className="text-base font-bold mb-1" style={{ color: SAI.maroon }}>Pay Khata Balance</h3>
            <div
              className="text-xs font-bold px-4 py-1.5 rounded-full mb-4"
              style={{ background: SAI.goldLight, color: SAI.gold, border: `1px solid ${SAI.gold}` }}
            >
              Settling: ₹{parseFloat(ledgerPayAmount).toFixed(2)}
            </div>

            {/* QR Code section (Visible on Mobile & Desktop) */}
            <div className="p-4 rounded-2xl mb-3 flex flex-col items-center" style={{ background: "#fffbf5", border: "2px solid rgba(249,115,22,0.2)" }}>
              <QRCodeSVG value={ledgerUpiLink} size={180} level="M" fgColor={SAI.maroon} bgColor="#fffbf5" />
              <p className="text-[11px] font-semibold mt-2.5 text-center" style={{ color: SAI.textMuted }}>
                Scan with Google Pay, PhonePe, Paytm or FamPay
              </p>
            </div>

            {/* Mobile Actions: Copy UPI ID instruction note */}
            {isMobile && (
              <div className="w-full space-y-2 mb-4">
                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-center">
                  <p className="text-xs font-bold text-orange-900 mb-1">💡 Payment Note:</p>
                  <p className="text-[11px] text-orange-800 leading-snug">
                    Copy the Store UPI ID below, open your UPI App (GPay / PhonePe / Paytm / FamPay), paste &amp; send ₹{parseFloat(ledgerPayAmount || "0").toFixed(2)}.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(upiConfig.upiVpa);
                    showToast(`UPI ID copied: ${upiConfig.upiVpa}`, "info");
                  }}
                  className="w-full py-3 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  style={{ background: "#7f1d1d", borderColor: "#7f1d1d", color: "#fde68a" }}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Copy Store UPI ID: <strong>{upiConfig.upiVpa}</strong></span>
                </button>
              </div>
            )}

            <form onSubmit={handleLedgerSettleSubmit} className="w-full space-y-3 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: SAI.textMuted }}>Amount (INR)</label>
              <input
                type="number" step="0.01" required
                value={ledgerPayAmount}
                onChange={e => setLedgerPayAmount(e.target.value)}
                className="saffron-input w-full text-center font-bold text-sm"
              />
              <label className="block text-[10px] font-bold uppercase tracking-widest" style={{ color: SAI.textMuted }}>UPI Transaction Reference (UTR)</label>
              <input
                type="text" required
                value={ledgerUpiTxnRef}
                onChange={e => setLedgerUpiTxnRef(e.target.value)}
                className="saffron-input w-full text-center font-mono text-sm font-semibold"
                placeholder="Enter 12-digit UTR / Txn ID"
              />
              <button
                type="submit"
                disabled={submittingLedgerUpi}
                className="btn-maroon w-full py-3 rounded-xl text-sm font-bold cursor-pointer"
              >
                {submittingLedgerUpi ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : "Submit Settlement"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ╔══════════════════════════════════════╗
          ║   LEDGER NOTEBOOK MODAL              ║
          ╚══════════════════════════════════════╝ */}
      {ledgerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-scale-up flex flex-col"
            style={{ background: "white", maxHeight: "90dvh" }}
          >
            {/* Header */}
            <div
              className="p-4 sm:p-6 shrink-0 flex items-center justify-between"
              style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b, #7c2d12)", color: "white" }}
            >
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2" style={{ color: "#fde68a" }}>
                  <BookOpen className="w-5 h-5" />
                  Account Note — Digital Ledger
                </h3>
                <p className="text-xs mt-1" style={{ color: "rgba(253,230,138,0.65)" }}>Full history of purchases and payments</p>
              </div>
              <button
                onClick={() => setLedgerModalOpen(false)}
                className="cursor-pointer p-2 rounded-full hover:bg-amber-200 transition-colors"
                style={{ background: "#fef3c7", color: "#000000" }}
                title="Close"
              >
                <X className="w-5 h-5 text-black" style={{ color: "#000000" }} />
              </button>
            </div>

            {/* Stats + Filter */}
            <div className="shrink-0 p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ background: SAI.cream, borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: SAI.textMuted }}>Filter Month:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="saffron-input text-xs py-1.5 px-3 font-bold cursor-pointer"
                >
                  <option value="">All Months</option>
                  {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex gap-4 sm:gap-6 flex-wrap">
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SAI.textMuted }}>Total Purchases</p>
                  <p className="font-extrabold text-sm" style={{ color: SAI.maroon }}>
                    ₹{(ledger?.entries?.filter((e: any) => e.type === "DEBIT" && e.status === "APPROVED").reduce((s: number, e: any) => s + e.amount, 0) || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-right" style={{ borderLeft: "1px solid rgba(249,115,22,0.15)", paddingLeft: "16px" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SAI.saffron }}>Total Paid</p>
                  <p className="font-extrabold text-sm" style={{ color: SAI.saffronDp }}>
                    ₹{(ledger?.entries?.filter((e: any) => e.type === "CREDIT" && e.status === "APPROVED").reduce((s: number, e: any) => s + e.amount, 0) || 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-right" style={{ borderLeft: "1px solid rgba(249,115,22,0.15)", paddingLeft: "16px" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: SAI.gold }}>Outstanding</p>
                  <p className="font-extrabold text-sm" style={{ color: SAI.gold }}>₹{(ledger?.balance || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Table / Cards */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5" style={{ background: "#fffbf5" }}>
              {filteredLedgerEntries.length === 0 ? (
                <div className="text-center py-16">
                  <LedgerIcon className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(249,115,22,0.2)" }} />
                  <p className="font-medium" style={{ color: SAI.textMuted }}>No records for this period.</p>
                </div>
              ) : isMobile ? (
                /* Mobile: card layout */
                <div className="space-y-2">
                  {filteredLedgerEntries.map((e: any) => (
                    <div key={e.id} className="p-3 rounded-xl" style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: SAI.maroon }}>{e.note || "General entry"}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: SAI.textMuted }}>
                            {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-extrabold" style={{ color: e.type === "DEBIT" ? SAI.maroon : SAI.saffronDp }}>
                            {e.type === "DEBIT" ? "-" : "+"}₹{e.amount.toFixed(2)}
                          </p>
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={e.type === "DEBIT"
                              ? { background: "#fef3c7", color: "#92400e" }
                              : { background: "#d1fae5", color: "#065f46" }
                            }
                          >
                            {e.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop: table */
                <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(249,115,22,0.12)" }}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider" style={{ background: SAI.cream, borderBottom: "1px solid rgba(249,115,22,0.1)", color: SAI.textMuted }}>
                        <th className="py-3 px-5">Date</th>
                        <th className="py-3 px-5">Note</th>
                        <th className="py-3 px-5">Type</th>
                        <th className="py-3 px-5 text-right">Owed (Debit)</th>
                        <th className="py-3 px-5 text-right">Paid (Credit)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLedgerEntries.map((e: any) => (
                        <tr key={e.id} className="text-sm" style={{ borderBottom: "1px solid rgba(249,115,22,0.06)" }}>
                          <td className="py-3 px-5 text-xs" style={{ color: SAI.textMuted }}>
                            {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="py-3 px-5">
                            <p className="font-semibold text-xs" style={{ color: SAI.maroon }}>{e.note || "General entry"}</p>
                            {e.status !== "APPROVED" && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block" style={{ background: "#fef3c7", color: "#92400e" }}>
                                {e.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-5">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={e.type === "DEBIT"
                                ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" }
                                : { background: "#d1fae5", color: "#065f46", border: "1px solid #6ee7b7" }
                              }
                            >
                              {e.type}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-sm" style={{ color: SAI.maroon }}>
                            {e.type === "DEBIT" ? `₹${e.amount.toFixed(2)}` : "—"}
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-sm" style={{ color: SAI.saffronDp }}>
                            {e.type === "CREDIT" ? `₹${e.amount.toFixed(2)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer total */}
            {selectedMonth && (
              <div
                className="shrink-0 p-4 px-6 flex items-center justify-between"
                style={{ borderTop: "1px solid rgba(249,115,22,0.1)", background: SAI.cream }}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: SAI.maroon }}>Total Purchased in {selectedMonth}</p>
                  <p className="text-[10px]" style={{ color: SAI.textMuted }}>Sum of approved debits this month</p>
                </div>
                <span className="text-lg font-extrabold" style={{ color: SAI.maroon }}>₹{monthlySpendingTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
