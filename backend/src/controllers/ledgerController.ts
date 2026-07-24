import { Response } from "express";
import prisma from "../db";
import { AuthenticatedRequest } from "../middleware/auth";
import { LedgerEntryType, PaymentStatus } from "@prisma/client";
import { addNotification } from "../utils/notifications";

// Get personal ledger history & balance (Customer) or specific customer history (Admin)
export const getCustomerLedger = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    let customerId = user.id;

    // Admin can query ledger for any customer ID
    if (user.role === "ADMIN" && req.query.customerId) {
      customerId = String(req.query.customerId);
    }

    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true }
    });

    if (!customer) {
      res.status(404).json({ message: "Customer not found." });
      return;
    }

    // Retrieve all ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: { id: true, totalAmount: true, paymentMethod: true, status: true }
        }
      }
    });

    // Calculate balances: sum(DEBIT) - sum(CREDIT) where status is APPROVED
    const debits = entries
      .filter((e) => e.type === LedgerEntryType.DEBIT && e.status === "APPROVED")
      .reduce((sum, e) => sum + e.amount, 0);

    const credits = entries
      .filter((e) => e.type === LedgerEntryType.CREDIT && e.status === "APPROVED")
      .reduce((sum, e) => sum + e.amount, 0);

    const balance = debits - credits;

    res.status(200).json({
      customer,
      balance,
      debits,
      credits,
      entries
    });
  } catch (error: any) {
    console.error("Get Ledger Error:", error);
    res.status(500).json({ message: "Failed to fetch ledger details." });
  }
};

// Admin: Get overall running balances for all customers
export const getLedgerSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Fetch all customers
    const customers = await prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        phone: true, 
        createdAt: true,
        hasAccountNotebook: true,
        notebookRequestStatus: true
      }
    });

    // For each customer, gather ledger balances
    const summary = await Promise.all(
      customers.map(async (c) => {
        const entries = await prisma.ledgerEntry.findMany({
          where: { customerId: c.id },
          select: { type: true, amount: true, status: true }
        });

        const debits = entries
          .filter((e) => e.type === LedgerEntryType.DEBIT && e.status === "APPROVED")
          .reduce((sum, e) => sum + e.amount, 0);

        const credits = entries
          .filter((e) => e.type === LedgerEntryType.CREDIT && e.status === "APPROVED")
          .reduce((sum, e) => sum + e.amount, 0);

        const pendingCredits = entries
          .filter((e) => e.type === LedgerEntryType.CREDIT && e.status === "PENDING")
          .reduce((sum, e) => sum + e.amount, 0);

        const balance = debits - credits;

        return {
          ...c,
          balance,
          debits,
          credits,
          hasPendingCredit: pendingCredits > 0,
          pendingCredits
        };
      })
    );

    res.status(200).json({ summary });
  } catch (error: any) {
    console.error("Get Ledger Summary Error:", error);
    res.status(500).json({ message: "Failed to fetch ledger summary." });
  }
};

// Admin: Record manual credit payment (e.g. Cash in-store, manual UPI settlement)
export const recordPaymentCredit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId, amount, note } = req.body;
    const admin = req.user;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!customerId || amount === undefined || amount <= 0) {
      res.status(400).json({ message: "Customer ID and a positive amount are required." });
      return;
    }

    const customerExists = await prisma.user.findUnique({ where: { id: customerId } });
    if (!customerExists) {
      res.status(404).json({ message: "Customer not found." });
      return;
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        customerId,
        type: LedgerEntryType.CREDIT,
        amount: parseFloat(amount),
        note: note || "Manual credit payment received",
        createdBy: admin.id
      }
    });

    res.status(201).json({
      message: "Credit payment recorded successfully.",
      entry
    });
  } catch (error: any) {
    console.error("Record Credit Error:", error);
    res.status(500).json({ message: "Failed to record payment." });
  }
};

// Customer: Submit UPI Txn Reference for verification
export const submitUpiPaymentRef = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { orderId, upiTxnRef, amount } = req.body;
    const customer = req.user;

    if (!customer) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!orderId || !upiTxnRef) {
      res.status(400).json({ message: "Order ID and UPI Transaction Reference are required." });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true }
    });

    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    if (order.customerId !== customer.id) {
      res.status(403).json({ message: "Access denied. Order does not belong to you." });
      return;
    }

    // Check if there is an existing payment record
    const existingPayment = order.payments[0];

    let payment;
    if (existingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          upiTxnRef,
          status: PaymentStatus.PENDING, // Saved as PENDING for admin review!
          amount: amount ? parseFloat(amount) : order.totalAmount
        }
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          method: "UPI",
          status: PaymentStatus.PENDING, // Saved as PENDING for admin review!
          upiTxnRef,
          amount: amount ? parseFloat(amount) : order.totalAmount
        }
      });
    }

    // Add real-time notification alert for Admin to verify transfer on GPay
    addNotification(`Customer "${customer.name}" requested verification for Order #${order.id.slice(0, 8)} (₹${payment.amount.toFixed(2)}) via UPI. Check GPay for UTR: ${upiTxnRef} before marking Paid.`);

    res.status(200).json({
      message: "Payment verification requested. It will mark as PAID once verified by the store owner.",
      payment
    });
  } catch (error: any) {
    console.error("Submit UPI Error:", error);
    res.status(500).json({ message: "Failed to submit UPI payment reference." });
  }
};

// Admin: Approve a pending payment, turning it into a Ledger CREDIT
export const approvePayment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { paymentId } = req.body;
    const admin = req.user;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!paymentId) {
      res.status(400).json({ message: "Payment ID is required." });
      return;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true }
    });

    if (!payment) {
      res.status(404).json({ message: "Payment record not found." });
      return;
    }

    if (payment.status === PaymentStatus.PAID) {
      res.status(400).json({ message: "Payment is already marked as PAID." });
      return;
    }

    // Wrap status change and credit creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PAID }
      });

      let creditEntry = null;

      // Only create a CREDIT ledger entry if the original order was deferred to the ledger (DEBT)
      if (payment.order.paymentMethod === "DEBT") {
        creditEntry = await tx.ledgerEntry.create({
          data: {
            customerId: payment.order.customerId,
            type: LedgerEntryType.CREDIT,
            amount: payment.amount,
            refOrderId: payment.orderId,
            note: `Verified UPI Payment for Order #${payment.orderId.slice(0, 8)}`,
            createdBy: admin.id
          }
        });
      }

      return { updatedPayment, creditEntry };
    });

    res.status(200).json({
      message: "Payment successfully approved and recorded in customer ledger.",
      payment: result.updatedPayment,
      ledgerEntry: result.creditEntry
    });
  } catch (error: any) {
    console.error("Approve Payment Error:", error);
    res.status(500).json({ message: "Failed to approve payment." });
  }
};

// Admin: Adjust ledger entries with audit trail
export const adjustLedgerEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entryId, amount, type, note, reason } = req.body;
    const admin = req.user;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!entryId || amount === undefined || amount < 0 || !reason) {
      res.status(400).json({ message: "Entry ID, new amount, and adjustment reason are required." });
      return;
    }

    const oldEntry = await prisma.ledgerEntry.findUnique({
      where: { id: entryId }
    });

    if (!oldEntry) {
      res.status(404).json({ message: "Ledger entry not found." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create Audit Log of old vs new values
      const auditLog = await tx.auditLog.create({
        data: {
          ledgerEntryId: entryId,
          action: "ADJUST",
          oldValue: JSON.stringify({ amount: oldEntry.amount, type: oldEntry.type, note: oldEntry.note }),
          newValue: JSON.stringify({ amount: parseFloat(amount), type: type || oldEntry.type, note: note || oldEntry.note }),
          reason,
          createdById: admin.id
        }
      });

      // Update Ledger Entry
      const updatedEntry = await tx.ledgerEntry.update({
        where: { id: entryId },
        data: {
          amount: parseFloat(amount),
          type: type || oldEntry.type,
          note: note !== undefined ? note : oldEntry.note
        }
      });

      return { updatedEntry, auditLog };
    });

    res.status(200).json({
      message: "Ledger entry adjusted successfully.",
      entry: result.updatedEntry,
      auditLog: result.auditLog
    });
  } catch (error: any) {
    console.error("Adjust Ledger Entry Error:", error);
    res.status(500).json({ message: "Failed to adjust ledger entry." });
  }
};

// Customer: Submit UPI reference to settle running ledger balance
export const submitLedgerUpiSettle = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { amount, upiTxnRef } = req.body;
    const customer = req.user;

    if (!customer) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!amount || amount <= 0 || !upiTxnRef) {
      res.status(400).json({ message: "Settle amount and UPI Transaction Reference (UTR) are required." });
      return;
    }

    // Check if reference already exists to prevent duplicates
    const existingRef = await prisma.ledgerEntry.findFirst({
      where: { upiTxnRef }
    });

    if (existingRef) {
      res.status(400).json({ message: "This Transaction Reference (UTR) has already been submitted." });
      return;
    }

    const entry = await prisma.ledgerEntry.create({
      data: {
        customerId: customer.id,
        type: LedgerEntryType.CREDIT,
        amount: parseFloat(amount),
        status: "PENDING", // Saved as PENDING for admin review!
        upiTxnRef,
        note: `Pending UPI Settlement (UTR: ${upiTxnRef})`,
        createdBy: customer.id
      }
    });

    // Add real-time notification alert for Admin to verify transfer on GPay
    addNotification(`Customer "${customer.name}" requested verification of Account Book settlement (₹${entry.amount.toFixed(2)}). Check GPay for UTR: ${upiTxnRef} before approving.`);

    res.status(201).json({
      message: "Account balance payment logged! It will clear once approved by the shop owner.",
      entry
    });
  } catch (error: any) {
    console.error("Submit Ledger UPI Error:", error);
    res.status(500).json({ message: "Failed to submit ledger payment." });
  }
};

// Admin: Approve a pending ledger entry credit
export const approveLedgerEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entryId } = req.body;
    const admin = req.user;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!entryId) {
      res.status(400).json({ message: "Ledger Entry ID is required." });
      return;
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      res.status(404).json({ message: "Ledger entry not found." });
      return;
    }

    if (entry.status !== "PENDING") {
      res.status(400).json({ message: "This entry has already been processed." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Approve entry
      const updatedEntry = await tx.ledgerEntry.update({
        where: { id: entryId },
        data: { 
          status: "APPROVED",
          note: `Verified UPI Settlement (UTR: ${entry.upiTxnRef})`
        }
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          ledgerEntryId: entryId,
          action: "APPROVE",
          oldValue: JSON.stringify({ status: entry.status }),
          newValue: JSON.stringify({ status: "APPROVED" }),
          reason: "Approved customer UPI settlement reference",
          createdById: admin.id
        }
      });

      return updatedEntry;
    });

    res.status(200).json({
      message: "Ledger entry successfully approved and credited.",
      entry: result
    });
  } catch (error: any) {
    console.error("Approve Ledger Entry Error:", error);
    res.status(500).json({ message: "Failed to approve ledger entry." });
  }
};

// Admin: Reject a pending ledger entry credit
export const rejectLedgerEntry = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entryId, reason } = req.body;
    const admin = req.user;

    if (!admin) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!entryId || !reason) {
      res.status(400).json({ message: "Entry ID and rejection reason are required." });
      return;
    }

    const entry = await prisma.ledgerEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      res.status(404).json({ message: "Ledger entry not found." });
      return;
    }

    if (entry.status !== "PENDING") {
      res.status(400).json({ message: "This entry has already been processed." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedEntry = await tx.ledgerEntry.update({
        where: { id: entryId },
        data: { 
          status: "REJECTED",
          note: `Rejected UPI Settlement: ${reason} (UTR: ${entry.upiTxnRef})`
        }
      });

      await tx.auditLog.create({
        data: {
          ledgerEntryId: entryId,
          action: "REJECT",
          oldValue: JSON.stringify({ status: entry.status }),
          newValue: JSON.stringify({ status: "REJECTED" }),
          reason,
          createdById: admin.id
        }
      });

      return updatedEntry;
    });

    res.status(200).json({
      message: "Ledger entry rejected successfully.",
      entry: result
    });
  } catch (error: any) {
    console.error("Reject Ledger Entry Error:", error);
    res.status(500).json({ message: "Failed to reject ledger entry." });
  }
};

// Admin: Get all pending UPI order payments and pending ledger settlements
export const getPendingVerifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    // Fetch pending order payments using UPI
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: "PENDING",
        method: "UPI"
      },
      include: {
        order: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            items: {
              include: {
                product: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Fetch pending ledger settlements (CREDIT type in PENDING status)
    const pendingLedgerCredits = await prisma.ledgerEntry.findMany({
      where: {
        status: "PENDING",
        type: "CREDIT"
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({
      pendingPayments,
      pendingLedgerCredits
    });
  } catch (error: any) {
    console.error("Get Pending Verifications Error:", error);
    res.status(500).json({ message: "Failed to load pending verifications." });
  }
};

// Customer: Request a new Account Notebook
export const requestNotebook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const customer = req.user;
    if (!customer) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: customer.id },
      data: { notebookRequestStatus: "PENDING" }
    });

    addNotification(`Customer "${customer.name}" requested creation of a new Account Notebook.`);

    res.status(200).json({
      message: "Account Notebook request submitted to admin.",
      user: updatedUser
    });
  } catch (error: any) {
    console.error("Request Notebook Error:", error);
    res.status(500).json({ message: "Failed to submit notebook request." });
  }
};

// Admin: Approve request and activate Account Notebook with 1000rs deposit
export const approveNotebook = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { customerId } = req.body;
    const admin = req.user;

    if (!admin || admin.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    if (!customerId) {
      res.status(400).json({ message: "Customer ID is required." });
      return;
    }

    const targetCustomer = await prisma.user.findUnique({
      where: { id: customerId }
    });

    if (!targetCustomer) {
      res.status(404).json({ message: "Customer not found." });
      return;
    }

    if (targetCustomer.hasAccountNotebook && targetCustomer.notebookRequestStatus === "APPROVED") {
      res.status(400).json({ message: "Account Notebook is already active for this customer." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Enable notebook flag
      const updatedCustomer = await tx.user.update({
        where: { id: customerId },
        data: {
          hasAccountNotebook: true,
          notebookRequestStatus: "APPROVED"
        }
      });

      // 2. Create the initial ₹1000 credit deposit
      const entry = await tx.ledgerEntry.create({
        data: {
          customerId,
          type: LedgerEntryType.CREDIT,
          amount: 1000.0,
          status: "APPROVED",
          note: "Initial deposit for Account Notebook activation",
          createdBy: admin.id
        }
      });

      return { updatedCustomer, entry };
    });

    addNotification(`Account Notebook successfully activated for "${targetCustomer.name}" with initial ₹1000.00 credit.`);

    res.status(200).json({
      message: "Account Notebook created successfully with initial ₹1000.00 credit.",
      customer: result.updatedCustomer,
      entry: result.entry
    });
  } catch (error: any) {
    console.error("Approve Notebook Error:", error);
    res.status(500).json({ message: "Failed to activate Account Notebook." });
  }
};

// Admin: Get all pending notebook creation requests
export const getNotebookRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admin = req.user;
    if (!admin || admin.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    const requests = await prisma.user.findMany({
      where: { notebookRequestStatus: "PENDING" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true }
    });

    res.status(200).json({ requests });
  } catch (error: any) {
    console.error("Get Notebook Requests Error:", error);
    res.status(500).json({ message: "Failed to fetch notebook creation requests." });
  }
};

