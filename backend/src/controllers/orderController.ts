import { Response } from "express";
import prisma from "../db";
import { AuthenticatedRequest } from "../middleware/auth";
import { OrderStatus, PaymentMethod, PaymentStatus, LedgerEntryType } from "@prisma/client";

export const placeOrder = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { items, paymentMethod } = req.body; // items: Array<{ productId: string, quantity: number }>
    const customer = req.user;

    if (!customer) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Cart cannot be empty." });
      return;
    }

    if (!paymentMethod || !["UPI", "PICKUP", "DEBT"].includes(paymentMethod)) {
      res.status(400).json({ message: "Invalid payment method chosen." });
      return;
    }

    // Wrap in a transaction to guarantee consistency
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsToCreate = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new Error(`Product not found for ID: ${item.productId}`);
        }

        if (!product.isActive) {
          throw new Error(`Product ${product.name} is no longer active.`);
        }

        if (product.stockQty < item.quantity) {
          throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stockQty}, Requested: ${item.quantity}`);
        }

        // Decrement stock
        await tx.product.update({
          where: { id: product.id },
          data: { stockQty: product.stockQty - item.quantity }
        });

        totalAmount += product.price * item.quantity;

        orderItemsToCreate.push({
          productId: product.id,
          quantity: item.quantity,
          unitPrice: product.price
        });
      }

      // Create Order
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          status: OrderStatus.PLACED,
          totalAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          items: {
            create: orderItemsToCreate
          }
        },
        include: {
          items: {
            include: { product: true }
          }
        }
      });

      // Create Payment
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: paymentMethod as PaymentMethod,
          status: PaymentStatus.PENDING,
          amount: totalAmount
        }
      });

      // Only register a debit in the ledger if the customer chose to add to their debt note (Khata)
      if (paymentMethod === "DEBT") {
        await tx.ledgerEntry.create({
          data: {
            customerId: customer.id,
            type: LedgerEntryType.DEBIT,
            amount: totalAmount,
            refOrderId: order.id,
            note: `Deferred payment for Order #${order.id.slice(0, 8)}`,
            createdBy: customer.id
          }
        });
      }

      return order;
    });

    res.status(201).json({
      message: "Order placed successfully.",
      order: result
    });
  } catch (error: any) {
    console.error("Place Order Error:", error);
    res.status(400).json({ message: error.message || "Failed to place order." });
  }
};

export const getOrders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    let orders;
    if (user.role === "ADMIN") {
      orders = await prisma.order.findMany({
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          items: { include: { product: true } },
          payments: true
        },
        orderBy: { createdAt: "desc" }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { customerId: user.id },
        include: {
          items: { include: { product: true } },
          payments: true
        },
        orderBy: { createdAt: "desc" }
      });
    }

    res.status(200).json({ orders });
  } catch (error: any) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};

export const getOrderById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { product: true } },
        payments: true
      }
    });

    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    // Customers can only see their own orders
    if (user.role !== "ADMIN" && order.customerId !== user.id) {
      res.status(403).json({ message: "Access denied." });
      return;
    }

    res.status(200).json({ order });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch order details." });
  }
};

export const updateOrderStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body; // PLACED | CONFIRMED | PACKED | FULFILLED | CANCELLED
    const user = req.user;

    if (!user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!status || !["PLACED", "CONFIRMED", "PACKED", "FULFILLED", "CANCELLED"].includes(status)) {
      res.status(400).json({ message: "Invalid status value." });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, payments: true }
    });

    if (!order) {
      res.status(404).json({ message: "Order not found." });
      return;
    }

    // Verification check: Customers can only transition from PLACED -> CANCELLED. Admins can do anything.
    if (user.role !== "ADMIN") {
      if (order.customerId !== user.id) {
        res.status(403).json({ message: "Access denied." });
        return;
      }
      if (status !== "CANCELLED" || (order.status !== "PLACED" && order.status !== "CONFIRMED")) {
        res.status(400).json({ message: "Customers can only cancel orders that are currently in the 'PLACED' or 'CONFIRMED' status." });
        return;
      }
    }

    // Wrap status change in a transaction (especially for cancellations to restore stock + reverse ledger)
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update Order Status
      const updated = await tx.order.update({
        where: { id },
        data: { status: status as OrderStatus },
        include: { payments: true }
      });

      // 2. If status was changed to CANCELLED, restore product stock quantities
      if (status === "CANCELLED" && order.status !== "CANCELLED") {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQty: {
                increment: item.quantity
              }
            }
          });
        }

        // If the order payment status was pending and payment method was DEBT, create a ledger CREDIT to cancel the DEBIT
        if (order.paymentMethod === "DEBT") {
          // Check if there is an active debit ledger entry for this order
          const debtEntry = await tx.ledgerEntry.findFirst({
            where: {
              refOrderId: order.id,
              type: LedgerEntryType.DEBIT
            }
          });

          if (debtEntry) {
            await tx.ledgerEntry.create({
              data: {
                customerId: order.customerId,
                type: LedgerEntryType.CREDIT,
                amount: order.totalAmount,
                refOrderId: order.id,
                note: `Reversal credit for Cancelled Order #${order.id.slice(0, 8)}`,
                createdBy: user.id
              }
            });
          }
        }

        // Update payment status to FAILED if cancelled
        await tx.payment.updateMany({
          where: { orderId: order.id },
          data: { status: PaymentStatus.FAILED }
        });
      }

      // If FULFILLED and paymentMethod is PICKUP or UPI, and payment is not verified yet,
      // the admin will manually set payment status to PAID separately. Fulfilling doesn't force payment to paid,
      // but let's allow admin to update order/payment details.
      return updated;
    });

    res.status(200).json({
      message: `Order status updated to ${status}.`,
      order: updatedOrder
    });
  } catch (error: any) {
    console.error("Update Order Status Error:", error);
    res.status(500).json({ message: "Failed to update order status." });
  }
};
