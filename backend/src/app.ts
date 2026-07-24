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

// Serve dynamic merchant configs
app.get("/api/config", (req: Request, res: Response) => {
  res.status(200).json({
    upiVpa: process.env.UPI_MERCHANT_VPA || "karthikn221005@oksbi",
    upiName: process.env.UPI_MERCHANT_NAME || "karthi keyan"
  });
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
