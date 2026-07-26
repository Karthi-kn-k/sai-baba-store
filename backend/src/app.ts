import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/authRoutes";
import productRouter from "./routes/productRoutes";
import orderRouter from "./routes/orderRoutes";
import ledgerRouter from "./routes/ledgerRoutes";

const app = express();

// Middlewares
app.use(cors({
  origin: "*", // Adjust for specific frontends in production
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20000, // Limit each IP to 20,000 requests per window to support active dashboard polling
  message: { message: "Too many requests from this IP, please try again later." }
});
app.use(globalLimiter);


// Health check
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

import { requireAuth, requireRole } from "./middleware/auth";
import { adminNotifications } from "./utils/notifications";

import prisma from "./db";

// Serve dynamic merchant configs & store status from global DB
app.get("/api/config", async (req: Request, res: Response) => {
  try {
    let settings = await prisma.storeSettings.findUnique({ where: { id: "global_settings" } });
    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          id: "global_settings",
          isShopOpen: true,
          upiVpa: process.env.UPI_MERCHANT_VPA || "karthikn221005@oksbi",
          upiName: process.env.UPI_MERCHANT_NAME || "karthi keyan",
          adminPhone: "9123456789"
        }
      });
    }
    res.status(200).json(settings);
  } catch (error: any) {
    res.status(200).json({
      isShopOpen: true,
      upiVpa: process.env.UPI_MERCHANT_VPA || "karthikn221005@oksbi",
      upiName: process.env.UPI_MERCHANT_NAME || "karthi keyan",
      adminPhone: "9123456789"
    });
  }
});

// Admin update store settings globally
app.post("/api/config", requireAuth, requireRole("ADMIN"), async (req: Request, res: Response) => {
  try {
    const { isShopOpen, upiVpa, upiName, adminPhone } = req.body;
    const updateData: any = {};
    if (typeof isShopOpen === "boolean") updateData.isShopOpen = isShopOpen;
    if (upiVpa) updateData.upiVpa = upiVpa.trim();
    if (upiName) updateData.upiName = upiName.trim();
    if (adminPhone) updateData.adminPhone = adminPhone.trim();

    const settings = await prisma.storeSettings.upsert({
      where: { id: "global_settings" },
      update: updateData,
      create: {
        id: "global_settings",
        isShopOpen: typeof isShopOpen === "boolean" ? isShopOpen : true,
        upiVpa: upiVpa ? upiVpa.trim() : "karthikn221005@oksbi",
        upiName: upiName ? upiName.trim() : "karthi keyan",
        adminPhone: adminPhone ? adminPhone.trim() : "9123456789"
      }
    });

    res.status(200).json({ message: "Store settings updated globally across all devices.", settings });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to update settings." });
  }
});

// Get admin in-app notifications
app.get("/api/admin/notifications", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
  res.status(200).json({ notifications: adminNotifications });
});

// Clear admin notifications
app.post("/api/admin/notifications/clear", requireAuth, requireRole("ADMIN"), (req: Request, res: Response) => {
  adminNotifications.length = 0;
  res.status(200).json({ message: "Notifications cleared." });
});

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/ledger", ledgerRouter);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error Handler]", err);
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  res.status(status).json({ message });
});

export default app;
