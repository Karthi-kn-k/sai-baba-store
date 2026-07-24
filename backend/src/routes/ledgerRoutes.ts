import { Router } from "express";
import {
  getCustomerLedger,
  getLedgerSummary,
  recordPaymentCredit,
  submitUpiPaymentRef,
  approvePayment,
  adjustLedgerEntry,
  submitLedgerUpiSettle,
  approveLedgerEntry,
  rejectLedgerEntry,
  getPendingVerifications,
  requestNotebook,
  approveNotebook,
  getNotebookRequests
} from "../controllers/ledgerController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Customer or admin reading a specific ledger sheet
router.get("/detail", requireAuth, getCustomerLedger);

// Customer submitting txn reference for an order
router.post("/upi-submit", requireAuth, submitUpiPaymentRef);

// Customer submitting txn reference for outstanding ledger balance
router.post("/upi-settle", requireAuth, submitLedgerUpiSettle);

// Customer requesting notebook creation
router.post("/request-notebook", requireAuth, requestNotebook);

// Admin-only operations
router.get("/summary", requireAuth, requireRole("ADMIN"), getLedgerSummary);
router.get("/pending-verifications", requireAuth, requireRole("ADMIN"), getPendingVerifications);
router.get("/notebook-requests", requireAuth, requireRole("ADMIN"), getNotebookRequests);
router.post("/record-credit", requireAuth, requireRole("ADMIN"), recordPaymentCredit);
router.post("/approve-payment", requireAuth, requireRole("ADMIN"), approvePayment);
router.post("/adjust-entry", requireAuth, requireRole("ADMIN"), adjustLedgerEntry);
router.post("/approve-entry", requireAuth, requireRole("ADMIN"), approveLedgerEntry);
router.post("/reject-entry", requireAuth, requireRole("ADMIN"), rejectLedgerEntry);
router.post("/approve-notebook", requireAuth, requireRole("ADMIN"), approveNotebook);

export default router;
