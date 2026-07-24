import { Router } from "express";
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from "../controllers/productController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Retrieve products is accessible to authenticated users
router.get("/", requireAuth, getProducts);
router.get("/:id", requireAuth, getProductById);

// Admin-only management endpoints
router.post("/", requireAuth, requireRole("ADMIN"), createProduct);
router.put("/:id", requireAuth, requireRole("ADMIN"), updateProduct);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteProduct);

export default router;
