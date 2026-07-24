import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    phone: string;
    role: "CUSTOMER" | "ADMIN";
    name: string;
    hasAccountNotebook: boolean;
    notebookRequestStatus: string;
  };
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Authentication token missing or invalid." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "default_jwt_secret";

    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      role: "CUSTOMER" | "ADMIN";
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { 
        id: true, 
        email: true, 
        phone: true, 
        role: true, 
        name: true,
        hasAccountNotebook: true,
        notebookRequestStatus: true
      }
    });

    if (!user) {
      res.status(401).json({ message: "User account no longer exists." });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({ message: "Token has expired." });
    } else {
      res.status(401).json({ message: "Authentication failed. Invalid token." });
    }
  }
};

export const requireRole = (role: "CUSTOMER" | "ADMIN") => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ message: `Access denied. Role '${role}' required.` });
      return;
    }

    next();
  };
};
