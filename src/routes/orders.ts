import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';
import { OrderDoc } from '../models/types';

const router = Router();

// GET /orders
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id: string = (req as any).user.user_id;
    const db = getDb();
    const ordersCol = db.collection<OrderDoc>('orders');

    // Find all orders for the user and sort them by creation date in descending order (newest first)
    const orders = await ordersCol.find({ user_id }).sort({ createdAt: -1 }).toArray();

    // The 'orders' array now contains all the necessary data, including thumbnail and createdAt
    res.json({ count: orders.length, orders });

  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
});

export default router;