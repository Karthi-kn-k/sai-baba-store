import { Router } from "express";
import { placeOrder, getOrders, getOrderById, updateOrderStatus } from "../controllers/orderController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/", requireAuth, placeOrder);
router.get("/", requireAuth, getOrders);
router.get("/:id", requireAuth, getOrderById);
router.patch("/:id/status", requireAuth, updateOrderStatus);

export default router;
