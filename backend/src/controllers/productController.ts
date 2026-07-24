import { Request, Response } from "express";
import prisma from "../db";
import { AuthenticatedRequest } from "../middleware/auth";

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, activeOnly } = req.query;

    const whereClause: any = {};

    // Customers should only see active products. Admins can see inactive ones too if specified.
    if (activeOnly === "true" || !req.headers.authorization) {
      whereClause.isActive = true;
    }

    if (search) {
      whereClause.name = {
        contains: String(search)
      };
    }

    if (category) {
      whereClause.category = String(category);
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { name: "asc" }
    });

    res.status(200).json({ products });
  } catch (error: any) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Failed to fetch products." });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    res.status(200).json({ product });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch product details." });
  }
};

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, price, stockQty, category, imageUrl, isActive } = req.body;

    if (!name || price === undefined || stockQty === undefined || !category) {
      res.status(400).json({ message: "Name, price, stock quantity, and category are required." });
      return;
    }

    if (price < 0 || stockQty < 0) {
      res.status(400).json({ message: "Price and stock quantity cannot be negative." });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price: parseFloat(price),
        stockQty: parseInt(stockQty),
        category,
        imageUrl,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({ message: "Product created successfully.", product });
  } catch (error: any) {
    console.error("Create Product Error:", error);
    res.status(500).json({ message: "Failed to create product." });
  }
};

export const updateProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, price, stockQty, category, imageUrl, isActive } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      res.status(404).json({ message: "Product not found." });
      return;
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingProduct.name,
        price: price !== undefined ? parseFloat(price) : existingProduct.price,
        stockQty: stockQty !== undefined ? parseInt(stockQty) : existingProduct.stockQty,
        category: category !== undefined ? category : existingProduct.category,
        imageUrl: imageUrl !== undefined ? imageUrl : existingProduct.imageUrl,
        isActive: isActive !== undefined ? Boolean(isActive) : existingProduct.isActive
      }
    });

    res.status(200).json({ message: "Product updated successfully.", product });
  } catch (error: any) {
    console.error("Update Product Error:", error);
    res.status(500).json({ message: "Failed to update product." });
  }
};

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if product is reference in order items (to prevent database foreign key crashes)
    const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });

    if (orderItemCount > 0) {
      // If product has been ordered, perform a soft delete instead by setting isActive = false
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
      res.status(200).json({
        message: "Product cannot be permanently deleted since it has orders. It was set to Inactive instead.",
        product
      });
      return;
    }

    await prisma.product.delete({ where: { id } });
    res.status(200).json({ message: "Product deleted successfully." });
  } catch (error: any) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ message: "Failed to delete product." });
  }
};
