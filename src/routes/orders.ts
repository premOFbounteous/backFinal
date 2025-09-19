import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /orders
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id: string = (req as any).user.user_id;
    const db = getDb();
    const ordersCol = db.collection('orders');

    const cursor = ordersCol.find({ user_id });
    const orders = await cursor
      .map((o: any) => ({ ...o, _id: String(o._id) }))
      .toArray();

    res.json({ count: orders.length, orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
});

export default router;
