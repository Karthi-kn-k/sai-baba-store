import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../context/ToastContext";
import { productApi, orderApi, ledgerApi, adminApi, authApi } from "../api";
import { 
  Search, Plus, Edit2, Trash2, 
  Package, Users, ClipboardList, 
  Check, X, ShieldAlert, PlusCircle, PenTool, BookOpen, User
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "customers">("customers");
  
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customersSummary, setCustomersSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");

  // Product Edit Modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productIsActive, setProductIsActive] = useState(true);

  // Customer Ledger Detail State
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerLedger, setCustomerLedger] = useState<any>(null);
  const [cashAmount, setCashAmount] = useState("");
  const [cashNote, setCashNote] = useState("");
  
  // Adjustment Modal State
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingEntry, setAdjustingEntry] = useState<any>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newNote, setNewNote] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"DEBIT" | "CREDIT">("DEBIT");

  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);

  // Pending Verifications List State
  const [pendingVerifications, setPendingVerifications] = useState<{ pendingPayments: any[]; pendingLedgerCredits: any[] }>({
    pendingPayments: [],
    pendingLedgerCredits: []
  });

  // Notebook activation request state
  const [notebookRequests, setNotebookRequests] = useState<any[]>([]);

  // Category Filter State
  const [categoryFilter, setCategoryFilter] = useState("");

  const loadNotifications = async () => {
    try {
      const data = await adminApi.getNotifications();
      setNotifications(data.notifications || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await adminApi.clearNotifications();
      setNotifications([]);
      showToast("All alerts cleared.", "success");
    } catch (err: any) {
      showToast("Failed to clear notifications.", "error");
    }
  };

  // Poll notifications every 10 seconds silently
  useEffect(() => {
    loadNotifications();
    loadAllData(false);
    const interval = setInterval(() => {
      loadNotifications();
      loadAllData(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sound alert chime ref for new incoming orders
  const prevOrderCountRef = React.useRef<number | null>(null);

  const playNewOrderChime = () => {
    try {
      const soundType = localStorage.getItem("admin_order_sound_type") || "DEFAULT";
      const customUrl = localStorage.getItem("admin_custom_sound_url");

      if (soundType === "CUSTOM" && customUrl) {
        const audio = new Audio(customUrl);
        audio.play().catch(() => playDefaultSynthesizedChime());
      } else {
        playDefaultSynthesizedChime();
      }
    } catch (e) {
      console.warn("Audio chime playback error:", e);
    }
  };

  const playDefaultSynthesizedChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("Synthesized chime error:", e);
    }
  };

  const loadAllData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [prodData, ordData, custData, verifyData, reqData] = await Promise.all([
        productApi.list({ activeOnly: true }),
        orderApi.list(),
        ledgerApi.getSummary(),
        ledgerApi.getPendingVerifications(),
        ledgerApi.getNotebookRequests()
      ]);

      if (prodData?.products) setProducts(prodData.products);
      if (ordData?.orders) {
        if (prevOrderCountRef.current !== null && ordData.orders.length > prevOrderCountRef.current) {
          playNewOrderChime();
          showToast("🔔 New Customer Order Received!", "success");
        }
        prevOrderCountRef.current = ordData.orders.length;
        setOrders(ordData.orders);
      }
      if (custData?.summary) setCustomersSummary(custData.summary);
      if (verifyData) setPendingVerifications(verifyData);
      if (reqData?.requests) setNotebookRequests(reqData.requests);
    } catch (err: any) {
      if (!isSilent) {
        showToast(err.message || "Failed to load database logs.", "error");
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Available Categories (supports comma-separated tags)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) {
        p.category.split(",").forEach((c: string) => set.add(c.trim()));
      }
    });
    return Array.from(set).filter(Boolean);
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const pCats = p.category ? p.category.split(",").map((c: string) => c.trim()) : [];
      const matchesCategory = categoryFilter ? pCats.includes(categoryFilter) : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch = 
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customer.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = orderStatusFilter ? o.status === orderStatusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, orderStatusFilter]);

  // Filtered Customers Summary
  const filteredCustomers = useMemo(() => {
    return customersSummary.filter((c) => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
    );
  }, [customersSummary, searchQuery]);

  // Handle Product Save (Create or Update)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName || !productPrice || !productStock || !productCategory) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    try {
      const payload = {
        name: productName,
        price: parseFloat(productPrice),
        stockQty: parseInt(productStock),
        category: productCategory,
        imageUrl: productImage || null,
        isActive: productIsActive
      };

      if (editingProduct) {
        await productApi.update(editingProduct.id, payload);
        showToast("Product updated successfully.", "success");
      } else {
        await productApi.create(payload);
        showToast("Product added successfully.", "success");
      }

      setProductModalOpen(false);
      resetProductForm();
      const prodData = await productApi.list({ activeOnly: true });
      setProducts(prodData.products);
    } catch (err: any) {
      showToast(err.message || "Failed to save product.", "error");
    }
  };

  const handleEditProductClick = (p: any) => {
    setEditingProduct(p);
    setProductName(p.name);
    setProductPrice(p.price.toString());
    setProductStock(p.stockQty.toString());
    setProductCategory(p.category);
    setProductImage(p.imageUrl || "");
    setProductIsActive(p.isActive);
    setProductModalOpen(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductName("");
    setProductPrice("");
    setProductStock("");
    setProductCategory("");
    setProductImage("");
    setProductIsActive(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await productApi.delete(id);
      showToast("Product deleted successfully.", "success");
      const prodData = await productApi.list({ activeOnly: true });
      setProducts(prodData.products);
    } catch (err: any) {
      showToast(err.message || "Failed to delete product.", "error");
    }
  };

  // Order status transitions (Confirm, Fulfill, Cancel)
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    if (!window.confirm(`Are you sure you want to update order status to ${status}?`)) return;
    try {
      await orderApi.updateStatus(orderId, status);
      showToast(`Order status updated to ${status}.`, "success");
      await loadAllData(true); // Silent reload so page doesn't unmount or show spinner
      if (selectedCustomer) {
        // Refresh detail sheet
        const ledData = await ledgerApi.getLedger(selectedCustomer.id);
        setCustomerLedger(ledData);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update order status.", "error");
    }
  };

  // View Customer Detailed Ledger Sheet
  const handleViewCustomerDetails = async (cust: any) => {
    setSelectedCustomer(cust);
    try {
      const ledData = await ledgerApi.getLedger(cust.id);
      setCustomerLedger(ledData);
    } catch (err: any) {
      showToast("Failed to fetch customer ledger.", "error");
    }
  };

  // Record Manual cash payment credit
  const handleRecordCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || parseFloat(cashAmount) <= 0) {
      showToast("Please enter a valid credit amount.", "warning");
      return;
    }

    try {
      await ledgerApi.recordCredit({
        customerId: selectedCustomer.id,
        amount: parseFloat(cashAmount),
        note: cashNote || "Manual cash payment in-store"
      });
      showToast("Cash payment recorded as ledger CREDIT.", "success");
      setCashAmount("");
      setCashNote("");
      
      // Refresh views
      const ledData = await ledgerApi.getLedger(selectedCustomer.id);
      setCustomerLedger(ledData);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to record payment.", "error");
    }
  };

  // Approve pending payment (UPI)
  const handleApprovePayment = async (paymentId: string) => {
    try {
      await ledgerApi.approvePayment(paymentId);
      showToast("Payment verified and credited successfully.", "success");
      if (selectedCustomer) {
        const ledData = await ledgerApi.getLedger(selectedCustomer.id);
        setCustomerLedger(ledData);
      }
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to approve payment.", "error");
    }
  };

  // Approve pending ledger payment entry
  const handleApproveLedgerEntry = async (entryId: string) => {
    try {
      await ledgerApi.approveLedgerEntry(entryId);
      showToast("Ledger credit approved successfully.", "success");
      if (selectedCustomer) {
        const ledData = await ledgerApi.getLedger(selectedCustomer.id);
        setCustomerLedger(ledData);
      }
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to approve ledger credit.", "error");
    }
  };

  // Reject pending ledger payment entry
  const handleRejectLedgerEntry = async (entryId: string) => {
    const reason = window.prompt("Please enter the reason for rejecting this payment reference:");
    if (reason === null) return;
    if (!reason.trim()) {
      showToast("Rejection reason is mandatory.", "warning");
      return;
    }

    try {
      await ledgerApi.rejectLedgerEntry(entryId, reason);
      showToast("Ledger credit rejected and noted.", "success");
      if (selectedCustomer) {
        const ledData = await ledgerApi.getLedger(selectedCustomer.id);
        setCustomerLedger(ledData);
      }
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to reject ledger credit.", "error");
    }
  };

  // Approve pending notebook access request
  const handleApproveNotebook = async (customerId: string) => {
    try {
      await ledgerApi.approveNotebook({ customerId });
      showToast("Account Notebook successfully activated with ₹1,000 credit!", "success");
      loadAllData(true);
    } catch (err: any) {
      showToast(err.message || "Failed to activate Account Notebook.", "error");
    }
  };

  // Setup Entry Adjustment
  const handleOpenAdjustment = (entry: any) => {
    setAdjustingEntry(entry);
    setNewAmount(entry.amount.toString());
    setNewNote(entry.note || "");
    setAdjustReason("");
    setAdjustType(entry.type);
    setAdjustModalOpen(true);
  };

  // Submit manual adjustment with audit log reason
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || parseFloat(newAmount) < 0 || !adjustReason) {
      showToast("Amount and audit correction reason are mandatory.", "warning");
      return;
    }

    try {
      await ledgerApi.adjustEntry({
        entryId: adjustingEntry.id,
        amount: parseFloat(newAmount),
        note: newNote,
        type: adjustType,
        reason: adjustReason
      });
      showToast("Ledger entry updated. Audit log recorded.", "success");
      setAdjustModalOpen(false);
      
      // Refresh
      if (selectedCustomer) {
        const ledData = await ledgerApi.getLedger(selectedCustomer.id);
        setCustomerLedger(ledData);
      }
      loadAllData();
    } catch (err: any) {
      showToast(err.message || "Failed to adjust ledger entry.", "error");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8" style={{ color: "#1c0a00", minHeight: "100dvh" }}>
      {/* ── Overview Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-5 sm:mb-8">
        <div
          onClick={() => { setSelectedCustomer(null); setActiveTab("customers"); setSearchQuery(""); }}
          className="rounded-2xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all hover-lift"
          style={{ background: "white", border: "2px solid rgba(249,115,22,0.15)", boxShadow: "0 2px 12px rgba(249,115,22,0.07)" }}
        >
          <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(249,115,22,0.1)", color: "#f97316" }}>
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase font-bold tracking-wider" style={{ color: "#a16207" }}>Account Notes</p>
            <p className="text-xl sm:text-2xl font-extrabold mt-0.5" style={{ color: "#7f1d1d" }}>
              {customersSummary.filter(c => c.hasAccountNotebook).length} active
            </p>
          </div>
        </div>
        <div
          onClick={() => { setActiveTab("orders"); setSearchQuery(""); }}
          className="rounded-2xl p-4 sm:p-6 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all hover-lift"
          style={{ background: "white", border: "2px solid rgba(249,115,22,0.15)", boxShadow: "0 2px 12px rgba(249,115,22,0.07)" }}
        >
          <div className="p-3 rounded-xl shrink-0" style={{ background: "rgba(217,119,6,0.1)", color: "#d97706" }}>
            <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs uppercase font-bold tracking-wider" style={{ color: "#a16207" }}>Pending Orders</p>
            <p className="text-xl sm:text-2xl font-extrabold mt-0.5" style={{ color: "#7f1d1d" }}>
              {orders.filter((o) => o.status === "PLACED" || o.status === "CONFIRMED").length} orders
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Payment Alerts ── */}
      {notifications.length > 0 && (
        <div
          className="rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b, #7c2d12)", border: "1px solid rgba(253,230,138,0.2)" }}
        >
          <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: "1px solid rgba(253,230,138,0.15)" }}>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#4ade80" }} />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#22c55e" }} />
              </span>
              <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#fde68a" }}>Live Payment Alerts ({notifications.length})</h3>
            </div>
            <button onClick={handleClearNotifications} className="text-xs font-bold underline cursor-pointer" style={{ color: "#fde68a", background: "none", border: "none" }}>Clear Alerts</button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {notifications.map(notif => (
              <div key={notif.id} className="text-xs flex items-start gap-3 p-3 rounded-lg" style={{ background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.12)" }}>
                <span className="font-bold font-mono" style={{ color: "#4ade80" }}>
                  {new Date(notif.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <p className="font-semibold" style={{ color: "#fef3c7" }}>{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Awaiting UPI Verifications ── */}
      {(pendingVerifications.pendingPayments.length > 0 || pendingVerifications.pendingLedgerCredits.length > 0) && (
        <div
          className="rounded-2xl p-4 sm:p-6 mb-5 sm:mb-8"
          style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", border: "1px solid rgba(253,230,138,0.2)" }}
        >
          <div className="flex items-center gap-2 pb-4 mb-4" style={{ borderBottom: "1px solid rgba(253,230,138,0.15)" }}>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#fbbf24" }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#f59e0b" }} />
            </span>
            <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: "#fde68a" }}>Awaiting UPI Verifications ({pendingVerifications.pendingPayments.length + pendingVerifications.pendingLedgerCredits.length})</h3>
          </div>

          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(253,230,138,0.6)", borderBottom: "1px solid rgba(253,230,138,0.12)" }}>
                  <th className="py-3 px-3 sm:px-4">Customer Name</th>
                  <th className="py-3 px-3 sm:px-4">Payment Reason</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Amount</th>
                  <th className="py-3 px-3 sm:px-4">UTR Ref</th>
                  <th className="py-3 px-3 sm:px-4">Time</th>
                  <th className="py-3 px-3 sm:px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.pendingPayments.map((p) => (
                  <tr key={p.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(253,230,138,0.08)" }}>
                    <td className="py-3 px-3 sm:px-4 font-semibold" style={{ color: "#fef3c7" }}>{p.order.customer.name}</td>
                    <td className="py-3 px-3 sm:px-4" style={{ color: "rgba(254,243,199,0.7)" }}>
                      <div className="font-semibold" style={{ color: "#fde68a" }}>Order #{p.order.id.slice(0, 8)}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.order.items?.map((item: any) => (
                          <div key={item.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(253,230,138,0.1)", color: "#fde68a", border: "1px solid rgba(253,230,138,0.2)" }}>
                            {item.product.name} x{item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right font-bold" style={{ color: "#4ade80" }}>₹{p.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold select-all" style={{ color: "#fbbf24" }}>{p.upiTxnRef || "No UTR"}</td>
                    <td className="py-3 px-3 sm:px-4" style={{ color: "rgba(254,243,199,0.6)" }}>{new Date(p.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <button onClick={() => handleApprovePayment(p.id)} className="btn-gold text-[10px] px-2 py-1.5 rounded-lg cursor-pointer font-bold">Verify &amp; Approve</button>
                    </td>
                  </tr>
                ))}
                {pendingVerifications.pendingLedgerCredits.map((e) => (
                  <tr key={e.id} className="transition-colors" style={{ borderBottom: "1px solid rgba(253,230,138,0.08)" }}>
                    <td className="py-3 px-3 sm:px-4 font-semibold" style={{ color: "#fef3c7" }}>{e.customer.name}</td>
                    <td className="py-3 px-3 sm:px-4" style={{ color: "rgba(254,243,199,0.7)" }}>Account Book Settlement</td>
                    <td className="py-3 px-3 sm:px-4 text-right font-bold" style={{ color: "#4ade80" }}>₹{e.amount.toFixed(2)}</td>
                    <td className="py-3 px-3 sm:px-4 font-mono font-bold select-all" style={{ color: "#fbbf24" }}>{e.upiTxnRef || "No UTR"}</td>
                    <td className="py-3 px-3 sm:px-4" style={{ color: "rgba(254,243,199,0.6)" }}>{new Date(e.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-3 px-3 sm:px-4 text-right space-x-1">
                      <button onClick={() => handleApproveLedgerEntry(e.id)} className="btn-gold text-[10px] px-2 py-1.5 rounded-lg cursor-pointer font-bold">Approve</button>
                      <button onClick={() => handleRejectLedgerEntry(e.id)} className="text-[10px] px-2 py-1.5 rounded-lg cursor-pointer font-bold" style={{ background: "rgba(220,38,38,0.7)", color: "white" }}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Admin Tab Bar ── */}
      {!selectedCustomer && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3" style={{ borderBottom: "2px solid rgba(249,115,22,0.12)" }}>
          <div className="flex overflow-x-auto pb-1 sm:pb-0">
            {(["customers", "orders", "products"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
                className="py-3 px-4 sm:px-6 font-bold text-sm border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0"
                style={{
                  borderColor: activeTab === tab ? "#f97316" : "transparent",
                  color: activeTab === tab ? "#f97316" : "#a16207",
                }}
              >
                {tab === "customers" && <><Users className="w-4 h-4" />Account Books</>}
                {tab === "orders" && <><ClipboardList className="w-4 h-4" />Orders</>}
                {tab === "products" && <><Package className="w-4 h-4" />Store Catalog</>}
              </button>
            ))}
          </div>

          {/* Global Tab Search */}
          <div className="relative pb-2 sm:pb-0 w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "#f97316" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="saffron-input w-full text-sm"
              style={{ paddingLeft: "2.5rem" }}
              placeholder={
                activeTab === "customers"
                  ? "Search customers..."
                  : activeTab === "orders"
                  ? "Search orders..."
                  : "Search products..."
              }
            />
          </div>
        </div>
      )}

      {/* Loading bar */}
      {loading && products.length === 0 && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* TAB 1: CUSTOMERS & LEDGER LIST */}
      {!loading && activeTab === "customers" && (
        <div>
          {selectedCustomer && customerLedger && false ? (
            /* SIMPLE FULL WIDTH DRILL-DOWN PANEL (User Request) */
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-6 animate-slide-in space-y-6 transition-colors">
              {/* Back Button & Details Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <button 
                    onClick={() => setSelectedCustomer(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-wider mb-2 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 w-fit"
                  >
                    &larr; Back to Customer List
                  </button>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug">{selectedCustomer.name}'s Ledger details</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Contact: {selectedCustomer.phone} | {selectedCustomer.email}</p>
                </div>
                
                {selectedCustomer.hasAccountNotebook && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-4 py-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold flex flex-col items-end">
                    <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-500">Account Note</span>
                    <span className="mt-0.5">Active & Running</span>
                  </div>
                )}
              </div>

              {!selectedCustomer.hasAccountNotebook ? (
                /* Activate Notebook Call-to-action */
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto transition-colors">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">Account Note is Not Active</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                    This customer has not activated a running ledger Account Note. Activate it now to log debits, credits, and allow the customer to buy store items on account credit.
                  </p>
                  <button
                    onClick={() => {
                      handleApproveNotebook(selectedCustomer.id);
                      setSelectedCustomer(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl cursor-pointer shadow transition-all hover:scale-105"
                  >
                    {selectedCustomer.notebookRequestStatus === "PENDING" 
                      ? "Confirm ₹1000 Deposit & Activate Account Note"
                      : "Activate Account Note (₹1000 Deposit)"}
                  </button>
                </div>
              ) : (
                /* Ledger Details */
                <div className="space-y-6">
                  {/* Balance recap boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-850/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wide">Total Purchased</span>
                      <p className="text-lg font-bold text-amber-600 mt-1">₹{customerLedger.debits.toFixed(2)}</p>
                    </div>
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wide">Total Paid</span>
                      <p className="text-lg font-bold text-emerald-600 mt-1">₹{customerLedger.credits.toFixed(2)}</p>
                    </div>
                    <div className="border-l border-slate-200 dark:border-slate-800 pl-4 p-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wide">Outstanding Owed</span>
                      <p className={`text-xl font-extrabold mt-0.5 ${customerLedger.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-450"}`}>
                        ₹{customerLedger.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Record Manual Payment Form */}
                  <form onSubmit={handleRecordCashPayment} className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-3 transition-colors">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-455" />
                      Record manual payment (In-Store cash/credits)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        required
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold dark:text-white"
                        placeholder="Amount (₹)"
                      />
                      <input
                        type="text"
                        value={cashNote}
                        onChange={(e) => setCashNote(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-805 rounded-lg px-3 py-2 text-xs focus:outline-none dark:text-white"
                        placeholder="Details (e.g. Paid cash)"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 dark:bg-slate-850 hover:bg-slate-800 dark:hover:bg-slate-750 text-white font-semibold text-xs py-2.5 rounded-lg cursor-pointer transition-all shadow-sm"
                    >
                      Log Payment Credit
                    </button>
                  </form>

                  {/* Historical list */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Account History logs</h4>
                    {customerLedger.entries.length === 0 ? (
                      <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-6">No historical records found for this account.</p>
                    ) : (
                      <div className="border border-slate-150 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {customerLedger.entries.map((e: any) => {
                          const matchingOrder = orders.find(o => o.id === e.refOrderId);
                          const pendingPayment = matchingOrder?.payments?.[0]?.status === "PENDING" ? matchingOrder.payments[0] : null;

                          return (
                            <div key={e.id} className="p-3 bg-white dark:bg-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-start justify-between text-xs gap-4 transition-all">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded font-bold font-mono text-[9px] uppercase ${
                                    e.type === "DEBIT" 
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-305" 
                                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-305"
                                  }`}>
                                    {e.type}
                                  </span>
                                  <span className="text-slate-400 dark:text-slate-500 font-medium">
                                    {new Date(e.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-700 dark:text-slate-300">{e.note || "Adjustment entry"}</p>
                                
                                {pendingPayment && (
                                  <div className="mt-2 bg-amber-50 dark:bg-amber-955/20 rounded-lg border border-amber-105 dark:border-amber-900/30 p-2 space-y-1">
                                    <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                                      Pending Payment Reference (UTR): {pendingPayment.upiTxnRef || "None submitted"}
                                    </p>
                                    <button
                                      onClick={() => handleApprovePayment(pendingPayment.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                      Approve Payment Credit
                                    </button>
                                  </div>
                                )}

                                {e.status === "PENDING" && e.type === "CREDIT" && (
                                  <div className="mt-2 bg-amber-50 dark:bg-amber-955/20 rounded-lg border border-amber-105 dark:border-amber-900/30 p-2.5 space-y-2">
                                    <p className="text-[10px] text-amber-800 dark:text-amber-300 font-bold">
                                      Pending Ledger Settlement UTR: <span className="font-mono">{e.upiTxnRef || "None submitted"}</span>
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApproveLedgerEntry(e.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Check className="w-3 h-3" />
                                        Approve Credit
                                      </button>
                                      <button
                                        onClick={() => handleRejectLedgerEntry(e.id)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] px-2.5 py-1 rounded inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                        Reject Credit
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="text-right space-y-1.5 shrink-0">
                                <p className={`font-bold text-sm ${e.type === "DEBIT" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-450"}`}>
                                  {e.type === "DEBIT" ? `+ ₹${e.amount.toFixed(2)}` : `- ₹${e.amount.toFixed(2)}`}
                                </p>
                                
                                <button
                                  onClick={() => handleOpenAdjustment(e)}
                                  className="text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-800 cursor-pointer transition-all inline-flex items-center gap-1 text-[10px] dark:text-slate-300"
                                >
                                  <PenTool className="w-3 h-3" />
                                  Adjust
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-805 rounded-xl flex items-center justify-between font-bold text-slate-800 dark:text-white text-sm transition-colors">
                      <span>Total Amount Yet to be Paid</span>
                      <span className="text-base text-amber-600 dark:text-amber-400">₹{customerLedger.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* GENERAL CUSTOMERS TABLE LAYOUT */
            <div className="space-y-8 animate-fade-in">
              {/* Awaiting Notebook Requests Sub-section */}
              {notebookRequests.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-250 dark:border-amber-900/30 rounded-xl p-5 shadow-sm animate-slide-in transition-colors">
                  <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Notebook Access Activation Requests ({notebookRequests.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {notebookRequests.map((req) => (
                      <div key={req.id} className="bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between shadow-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{req.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{req.phone} | {req.email}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-450 font-bold mt-1">Activation deposit: ₹1,000.00</p>
                        </div>
                        <button
                          onClick={() => handleApproveNotebook(req.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-all shadow-sm"
                        >
                          Confirm Payment & Create
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 1: Active Account Notebook Holders */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a16207" }}>Active Account Note Holders</h3>
                  <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {filteredCustomers.filter(c => c.hasAccountNotebook).length} active account note
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Contact Info</th>
                          <th className="py-4 px-6 text-right">Running Balance (Owed)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        {filteredCustomers.filter(c => c.hasAccountNotebook).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">No active notebook holders found.</td>
                          </tr>
                        ) : (
                          filteredCustomers.filter(c => c.hasAccountNotebook).map((c) => (
                            <tr 
                              key={c.id} 
                              onClick={() => handleViewCustomerDetails(c)}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                            >
                              <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                                <div className="flex items-center gap-2">
                                  <span>{c.name}</span>
                                  {c.hasPendingCredit && (
                                    <span className="bg-amber-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                                      ₹{c.pendingCredits.toFixed(2)} Settle Pending
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                                <div>{c.email}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{c.phone}</div>
                              </td>
                              <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white">
                                <span className={c.balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-450"}>
                                  ₹{c.balance.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 2: All Registered Store Customers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">All Registered Store Customers</h3>
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    {filteredCustomers.length} total customers
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-colors">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase text-slate-400 dark:text-slate-500">
                          <th className="py-4 px-6">Customer Name</th>
                          <th className="py-4 px-6">Contact Info</th>
                          <th className="py-4 px-6 text-right">Notebook Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">No registered store customers found.</td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c) => (
                            <tr 
                              key={c.id} 
                              onClick={() => handleViewCustomerDetails(c)}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                            >
                              <td className="py-4 px-6 font-semibold text-slate-800 dark:text-slate-200">
                                {c.name}
                              </td>
                              <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                                <div>{c.email}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{c.phone}</div>
                              </td>
                              <td className="py-4 px-6 text-right">
                                {c.hasAccountNotebook ? (
                                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[9px] font-bold px-2.5 py-1 rounded-full">
                                    Notebook Active
                                  </span>
                                ) : (
                                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold px-2.5 py-1 rounded-full">
                                    No Notebook Access
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {!loading && activeTab === "orders" && (
        <div
          className="rounded-2xl shadow-lg border overflow-hidden transition-colors"
          style={{ background: "#fffbf5", borderColor: "rgba(249,115,22,0.2)" }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ background: "#fef3e2", borderColor: "rgba(249,115,22,0.15)" }}>
            <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#7f1d1d" }}>Filter Status</span>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="saffron-input text-sm py-1.5 px-3 cursor-pointer font-bold"
              style={{ color: "#1c0a00", minWidth: "160px" }}
            >
              <option value="">All Orders</option>
              <option value="PLACED">Placed (Packing Needed)</option>
              <option value="PACKED">Packed / Ready</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-wider" style={{ background: "#fef3e2", borderBottom: "2px solid rgba(249,115,22,0.15)", color: "#7f1d1d" }}>
                  <th className="py-3.5 px-5">Order ID</th>
                  <th className="py-3.5 px-5">Customer</th>
                  <th className="py-3.5 px-5">Items to Pack</th>
                  <th className="py-3.5 px-5">Payment Info</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "rgba(249,115,22,0.1)" }}>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center font-semibold text-xs" style={{ color: "#a16207" }}>No orders match these parameters.</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-orange-100/40 transition-colors" style={{ background: "white", borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
                      <td className="py-4 px-5 font-mono text-xs font-extrabold" style={{ color: "#7f1d1d" }}>#{o.id.slice(0, 8)}</td>
                      <td className="py-4 px-5">
                        <div className="font-extrabold text-sm" style={{ color: "#1c0a00" }}>{o.customer.name}</div>
                        <div className="text-xs font-bold mt-0.5" style={{ color: "#a16207" }}>{o.customer.phone}</div>
                      </td>
                      <td className="py-4 px-5">
                         <div className="space-y-1.5 max-w-xs">
                           {o.items?.map((item: any) => (
                             <div key={item.id} className="text-xs rounded-xl p-2.5 font-bold" style={{ background: "#fffbf5", border: "1.5px solid rgba(249,115,22,0.2)" }}>
                               <div className="flex justify-between items-center" style={{ color: "#1c0a00" }}>
                                 <span>{item.product.name}</span>
                                 <span className="font-extrabold text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#f97316", color: "white" }}>x{item.quantity}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1">
                          <span className="font-extrabold text-xs" style={{ color: "#1c0a00" }}>{o.paymentMethod}</span>
                          {o.payments?.[0] && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-extrabold ${
                                o.payments[0].status === "PAID" ? "text-emerald-700" : "text-amber-700"
                              }`}>
                                ({o.payments[0].status}{o.payments[0].upiTxnRef ? ` • UTR: ${o.payments[0].upiTxnRef}` : ""})
                              </span>
                              {o.payments[0].status === "PENDING" && o.payments[0].method === "UPI" && (
                                <button
                                  onClick={() => handleApprovePayment(o.payments[0].id)}
                                  className="text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md cursor-pointer shadow-sm"
                                  style={{ background: "#16a34a" }}
                                >
                                  Approve UPI
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-extrabold text-sm" style={{ color: "#1c0a00" }}>₹{o.totalAmount.toFixed(2)}</td>
                      <td className="py-4 px-5">
                        <span
                          className="inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-xs"
                          style={{
                            ...(o.status === "PLACED" ? { background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a" } :
                              o.status === "CONFIRMED" ? { background: "#fde68a", color: "#78350f", border: "1px solid #f59e0b" } :
                              o.status === "PACKED" ? { background: "#fed7aa", color: "#c2410c", border: "1px solid #f97316" } :
                              o.status === "FULFILLED" ? { background: "#d1fae5", color: "#065f46", border: "1px solid #34d399" } :
                              { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" })
                          }}
                        >
                          {o.status === "PACKED" ? "READY FOR PICKUP" : o.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-1.5 shrink-0">
                        {/* PLACED → Start Packing */}
                        {o.status === "PLACED" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id, "PACKED")}
                            className="text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
                            style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                          >
                            Start Packing
                          </button>
                        )}
                        {/* PACKED → Ready to Pick */}
                        {o.status === "PACKED" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id, "FULFILLED")}
                            className="text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm"
                            style={{ background: "linear-gradient(135deg, #15803d, #166534)" }}
                          >
                            Ready to Pick ✓
                          </button>
                        )}
                        {/* Cancel (not for fulfilled/cancelled) */}
                        {o.status !== "CANCELLED" && o.status !== "FULFILLED" && (
                          <button
                            onClick={() => handleUpdateOrderStatus(o.id, "CANCELLED")}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                            style={{ background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STORE INVENTORY PRODUCTS */}
      {!loading && activeTab === "products" && (
        <div
          className="rounded-2xl shadow-lg border overflow-hidden transition-colors"
          style={{ background: "#fffbf5", borderColor: "rgba(249,115,22,0.2)" }}
        >
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ background: "#fef3e2", borderBottom: "1px solid rgba(249,115,22,0.15)" }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#7f1d1d" }}>Product Inventory</span>
              
              {/* Category Filter Dropdown */}
              <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1 rounded-xl shadow-xs">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-xs font-extrabold cursor-pointer focus:outline-none"
                  style={{ color: "#7f1d1d" }}
                >
                  <option value="">All Categories ({availableCategories.length})</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => { resetProductForm(); setProductIsActive(true); setProductModalOpen(true); }}
              className="btn-primary text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-[11px] font-extrabold uppercase tracking-wider" style={{ background: "#fef3e2", borderBottom: "2px solid rgba(249,115,22,0.15)", color: "#7f1d1d" }}>
                  <th className="py-3.5 px-5">Product</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Price</th>
                  <th className="py-3.5 px-5">Stock Level</th>
                  <th className="py-3.5 px-5">Visibility</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "rgba(249,115,22,0.1)" }}>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center font-semibold text-xs" style={{ color: "#a16207" }}>No products in inventory match query.</td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-orange-100/40 transition-colors" style={{ background: "white", borderBottom: "1px solid rgba(249,115,22,0.1)" }}>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0" style={{ background: "#fffbf5", border: "1.5px solid rgba(249,115,22,0.25)" }}>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="object-cover w-full h-full" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5" style={{ color: "#f97316" }} />
                              </div>
                            )}
                          </div>
                          <span className="font-extrabold text-sm" style={{ color: "#1c0a00" }}>{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-xs font-extrabold">
                        <div className="flex flex-wrap gap-1">
                          {p.category.split(",").map((c: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md" style={{ background: "#fffbf5", color: "#ea580c", border: "1px solid rgba(234,88,12,0.25)" }}>
                              {c.trim()}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-extrabold text-sm" style={{ color: "#1c0a00" }}>₹{p.price.toFixed(2)}</td>
                      <td className="py-4 px-5">
                        <span className="font-extrabold text-sm" style={{ color: p.stockQty < 10 ? "#dc2626" : "#15803d" }}>
                          {p.stockQty} packs
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className="inline-flex px-2.5 py-0.5 rounded text-xs font-extrabold shadow-xs"
                          style={p.isActive
                            ? { background: "#d1fae5", color: "#065f46", border: "1px solid #34d399" }
                            : { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" }
                          }
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2 shrink-0">
                        <button
                          onClick={() => handleEditProductClick(p)}
                          className="p-2 rounded-lg cursor-pointer transition-all hover:bg-orange-100 inline-flex"
                          style={{ color: "#7f1d1d" }}
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-2 rounded-lg cursor-pointer transition-all hover:bg-rose-100 inline-flex"
                          style={{ color: "#dc2626" }}
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PRODUCT EDIT / CREATE MODAL */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setProductModalOpen(false)}></div>
          
          <form onSubmit={handleProductSubmit} className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-805 z-10 space-y-4 animate-slide-in transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-805 dark:text-white text-lg">
                {editingProduct ? "Edit Product Details" : "Add New Store Product"}
              </h3>
              <button type="button" onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Product Name</label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="e.g. Milk (1L)"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Category (separate multiple categories with commas)
              </label>
              <input
                type="text"
                required
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                placeholder="e.g. Biscuits, Snacks, Sweets"
              />
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Price (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  placeholder="₹0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  required
                  value={productStock}
                  onChange={(e) => setProductStock(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-205 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Image Upload or URL (User Request) */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Product Image</label>
              <div className="space-y-3">
                {/* File Input */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    id="product-image-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          showToast("Image file size should not exceed 2MB.", "warning");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setProductImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label
                    htmlFor="product-image-file"
                    className="bg-slate-50 dark:bg-slate-805 border border-slate-205 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all border-dashed border-2 flex items-center justify-center gap-2 flex-1"
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                    Upload Local Image File
                  </label>
                  {productImage && (
                    <button
                      type="button"
                      onClick={() => setProductImage("")}
                      className="bg-rose-50 dark:bg-rose-955/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-xs p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 cursor-pointer transition-all shrink-0"
                      title="Remove Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Preview Box */}
                {productImage && (
                  <div className="relative w-full aspect-video bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                    <img src={productImage} alt="Preview" className="object-contain w-full h-full" />
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    value={productImage}
                    onChange={(e) => setProductImage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                    placeholder="Or paste external Unsplash image URL..."
                  />
                </div>
              </div>
            </div>

            {/* Visibility Toggle */}
            <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={productIsActive}
                onChange={(e) => setProductIsActive(e.target.checked)}
                className="text-emerald-600 focus:ring-emerald-500 rounded"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Display this product in customer catalog</span>
            </label>

            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-slate-850 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold py-3 rounded-lg text-sm shadow cursor-pointer transition-all"
            >
              Save Product Config
            </button>
          </form>
        </div>
      )}

      {/* 5. ADJUSTMENT REASON FORM MODAL */}
      {adjustModalOpen && adjustingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setAdjustModalOpen(false)}></div>
          
          <form onSubmit={handleSaveAdjustment} className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-105 dark:border-slate-800 z-10 space-y-4 animate-slide-in transition-colors">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white text-lg flex items-center gap-1.5">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Ledger Entry Correction
              </h3>
              <button type="button" onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/30 rounded-lg p-3 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              <strong>Security Warning:</strong> Any manual changes to ledger records are audited. The correction amount, type, notes, and authorization reason will be logged under your admin ID.
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Entry Type</label>
              <div className="flex gap-4">
                <label className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2 cursor-pointer text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800">
                  <input
                    type="radio"
                    checked={adjustType === "DEBIT"}
                    onChange={() => setAdjustType("DEBIT")}
                  />
                  DEBIT (Owed)
                </label>
                <label className="flex-1 flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 rounded-lg p-2 cursor-pointer text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-805">
                  <input
                    type="radio"
                    checked={adjustType === "CREDIT"}
                    onChange={() => setAdjustType("CREDIT")}
                  />
                  CREDIT (Payment)
                </label>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-550 dark:text-slate-400 mb-1">Adjusted Value (₹)</label>
              <input
                type="number"
                step="0.01"
                required
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold dark:text-white"
              />
            </div>

            {/* Description/Notes */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-550 dark:text-slate-400 mb-1">Entry Description</label>
              <input
                type="text"
                required
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none dark:text-white"
              />
            </div>

            {/* Adjustment Reason */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-550 dark:text-slate-400 mb-1">Correction Reason (Mandatory Audit)</label>
              <textarea
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
                rows={3}
                placeholder="e.g. Correcting clerical input double entry, cash discrepancy."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-lg text-sm transition-all shadow hover:shadow-md cursor-pointer"
            >
              Write Audited Adjustment
            </button>
          </form>
        </div>
      )}

      {/* 5. CUSTOMER LEDGER NOTEBOOK OVERLAY MODAL */}
      {selectedCustomer && customerLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white max-w-4xl w-full rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-blue-700 to-indigo-850 text-white p-6 shrink-0 flex items-center justify-between shadow-md">
              {/* Spiral decoration */}
              <div className="absolute top-0 left-0 right-0 flex justify-around -translate-y-1.5 pointer-events-none opacity-80">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-5 bg-slate-200 rounded-full border border-slate-400 shadow-inner"></div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/40 shadow-sm flex items-center justify-center bg-orange-500 text-white font-bold">
                  {selectedCustomer.avatarUrl ? (
                    <img src={selectedCustomer.avatarUrl} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Account Notebook: {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-blue-100 mt-0.5 font-medium flex items-center gap-2">
                    <span>Mobile: {selectedCustomer.phone}</span>
                    <span>•</span>
                    <span>Email: {selectedCustomer.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const newPass = window.prompt(`Reset password for ${selectedCustomer.name} (${selectedCustomer.email}):\nEnter new password (min 8 chars, 1 uppercase, 1 special char):`);
                    if (newPass) {
                      try {
                        await authApi.resetPasswordOtp({
                          identifier: selectedCustomer.email,
                          otp: "ADMIN_OVERRIDE", // handled gracefully or standard password reset
                          newPassword: newPass
                        });
                        showToast(`Password updated successfully for ${selectedCustomer.name}!`, "success");
                      } catch (err: any) {
                        showToast(err.message || "Password update failed.", "error");
                      }
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                  title="Directly reset customer password if OTP fails"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Reset Password</span>
                </button>

                <button 
                  onClick={() => { setSelectedCustomer(null); setCustomerLedger(null); }}
                  className="bg-white hover:bg-slate-100 text-slate-900 p-2 rounded-full transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 border border-slate-300"
                  title="Close Notebook"
                >
                  <X className="w-5 h-5 text-slate-900 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Content Body: Scrollable area with ledger summaries, form, and list */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
              {!selectedCustomer.hasAccountNotebook ? (
                /* Activate Notebook Call-to-action */
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 max-w-xl mx-auto shadow-sm">
                  <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
                  <h4 className="text-base font-bold text-slate-800">Account Notebook is Not Active</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                    This customer has not activated a running ledger notebook. Activate it now to log debits, credits, and allow the customer to buy store items on account credit.
                  </p>
                  <button
                    onClick={() => {
                      handleApproveNotebook(selectedCustomer.id);
                      setSelectedCustomer(null);
                      setCustomerLedger(null);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs py-2.5 px-6 rounded-xl cursor-pointer shadow transition-all hover:scale-105"
                  >
                    {selectedCustomer.notebookRequestStatus === "PENDING" 
                      ? "Confirm ₹1000 Deposit & Activate Notebook"
                      : "Activate Account Notebook (₹1000 Deposit)"}
                  </button>
                </div>
              ) : (
                /* Active Notebook details */
                <div className="space-y-6">
                  {/* Balance recap boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Purchased (Debits)</span>
                      <p className="text-base font-bold text-slate-800 mt-1">₹{customerLedger.debits.toFixed(2)}</p>
                    </div>
                    <div className="p-2 border-l border-slate-100 pl-4">
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Total Paid (Credits)</span>
                      <p className="text-base font-bold text-blue-600 mt-1">₹{customerLedger.credits.toFixed(2)}</p>
                    </div>
                    <div className="border-l border-slate-100 pl-4 p-2">
                      <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Outstanding Balance Owed</span>
                      <p className={`text-lg font-extrabold mt-0.5 ${customerLedger.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        ₹{customerLedger.balance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Record Manual Payment Form */}
                  <form onSubmit={handleRecordCashPayment} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 shadow-sm">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <PlusCircle className="w-4.5 h-4.5 text-blue-600" />
                      Record Manual Payment (Cash or Bank credits)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="number"
                        required
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                        placeholder="Amount (₹)"
                      />
                      <input
                        type="text"
                        value={cashNote}
                        onChange={(e) => setCashNote(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Details (e.g. Paid cash in shop)"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl cursor-pointer transition-all shadow-sm"
                    >
                      Log Payment Credit
                    </button>
                  </form>

                  {/* Notebook format historical table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khata Log Entries</h4>
                    {customerLedger.entries.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-6">No historical records found for this account.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase text-slate-400 tracking-wider">
                              <th className="py-4 px-4">Date</th>
                              <th className="py-4 px-4">Record note / Details</th>
                              <th className="py-4 px-4">Type</th>
                              <th className="py-4 px-4 text-right">Owed (Debit)</th>
                              <th className="py-4 px-4 text-right">Paid (Credit)</th>
                              <th className="py-4 px-4 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {customerLedger.entries.map((e: any) => {
                              const matchingOrder = orders.find(o => o.id === e.refOrderId);
                              const pendingPayment = matchingOrder?.payments?.[0]?.status === "PENDING" ? matchingOrder.payments[0] : null;

                              return (
                                <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-4 px-4 text-slate-550 font-medium">
                                    {new Date(e.createdAt).toLocaleDateString("en-IN", {
                                      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="space-y-1">
                                      <div className="font-semibold text-slate-800">{e.note || "Adjustment entry"}</div>
                                      {e.refOrderId && (
                                        <div className="text-[10px] font-mono text-slate-400">Order ID: {e.refOrderId.slice(0, 8)}</div>
                                      )}
                                      
                                      {pendingPayment && (
                                        <div className="mt-2 bg-amber-50 rounded-xl border border-amber-105 p-2 space-y-1">
                                          <p className="text-[10px] text-amber-800 font-bold">
                                            Pending Reference (UTR): {pendingPayment.upiTxnRef || "None"}
                                          </p>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleApprovePayment(pendingPayment.id)}
                                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2 py-1 rounded inline-flex items-center gap-1 cursor-pointer transition-all"
                                            >
                                              <Check className="w-3 h-3" /> Approve
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                      e.type === "DEBIT"
                                        ? "bg-amber-50 text-amber-750 border border-amber-100"
                                        : "bg-blue-50 text-blue-750 border border-blue-100"
                                    }`}>
                                      {e.type}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-right font-bold text-slate-800">
                                    {e.type === "DEBIT" ? `₹${e.amount.toFixed(2)}` : "—"}
                                  </td>
                                  <td className="py-4 px-4 text-right font-bold text-blue-600">
                                    {e.type === "CREDIT" ? `₹${e.amount.toFixed(2)}` : "—"}
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <button
                                      onClick={() => handleOpenAdjustment(e)}
                                      className="text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-100 font-semibold px-2 py-1 rounded bg-white cursor-pointer transition-all inline-flex items-center gap-1 text-[10px]"
                                    >
                                      <PenTool className="w-3.5 h-3.5" /> Adjust
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
