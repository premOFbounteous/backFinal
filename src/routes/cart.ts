import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';
import { Cart, CartItem, Product } from '../models/types';

const router = Router();

function serializeCart(cart: Cart) {
  return {
    _id: String(cart._id),
    user_id: cart.user_id,
    items: (cart.items ?? []).map((it) => ({
      product_id: it.product_id,
      quantity: it.quantity,
    })),
  };
}

// POST /cart/add
router.post(
  '/add',
  authMiddleware,
  async (req: Request<{}, {}, { product_id?: number; quantity?: number }>, res: Response) => {
    try {
      const user_id: string = (req as any).user.user_id;
      const { product_id, quantity } = req.body || {};

      if (!Number.isFinite(Number(product_id)) || !Number.isFinite(Number(quantity))) {
        res.status(422).json({ detail: 'product_id and quantity must be numbers' });
        return;
      }

      const db = getDb();
      const colProducts = db.collection<Product>('ecommerce');
      const product = await colProducts.findOne({ id: Number(product_id) });

      if (!product) {
        res.status(404).json({ detail: 'Product not found' });
        return;
      }
      if ((product.stock ?? 0) < Number(quantity)) {
        res.status(400).json({ detail: `Only ${product.stock ?? 0} items left in stock` });
        return;
      }

      const carts = db.collection<Cart>('carts');
      const cart = await carts.findOne({ user_id });

      if (!cart) {
        await carts.insertOne({
          user_id,
          items: [{ product_id: Number(product_id), quantity: Number(quantity) }],
        });
      } else {
        let updated = false;
        const items = Array.isArray(cart.items) ? cart.items : [];
        for (const i of items) {
          if (i.product_id === Number(product_id)) {
            const proposed = (i.quantity ?? 0) + Number(quantity);
            if ((product.stock ?? 0) < proposed) {
              res.status(400).json({ detail: `Only ${product.stock ?? 0} items left in stock` });
              return;
            }
            i.quantity = proposed;
            updated = true;
          }
        }
        if (!updated) {
          items.push({ product_id: Number(product_id), quantity: Number(quantity) });
        }
        await carts.updateOne({ user_id }, { $set: { items } });
      }

      res.json({ message: 'Item added to cart' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

// GET /cart
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id: string = (req as any).user.user_id;
    const db = getDb();
    const carts = db.collection<Cart>('carts');

    const cart = await carts.findOne({ user_id: String(user_id) });
    if (!cart) {
      res.json({ items: [] });
      return;
    }
    res.json(serializeCart(cart));
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
});

// POST /cart/checkout
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user_id: string = (req as any).user.user_id;
    const db = getDb();
    const carts = db.collection<Cart>('carts');
    const products = db.collection<Product>('ecommerce');
    const orders = db.collection('orders');

    const cart = await carts.findOne({ user_id });
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      res.status(400).json({ detail: 'Cart is empty' });
      return;
    }

    const order_items: any[] = [];
    let total = 0;

    for (const c of cart.items) {
      const product = await products.findOne({ id: c.product_id });
      if (!product) {
        res.status(404).json({ detail: `Product ${c.product_id} not found` });
        return;
      }
      if ((product.stock ?? 0) < (c.quantity ?? 0)) {
        res.status(400).json({ detail: `Only ${product.stock ?? 0} left for ${product.title}` });
        return;
      }
      // Deduct stock
      await products.updateOne({ id: c.product_id }, { $inc: { stock: -Number(c.quantity ?? 0) } });
      order_items.push({
        product_id: product.id,
        title: product.title,
        price: product.price,
        quantity: c.quantity,
      });
      total += Number(product.price) * Number(c.quantity);
    }

    const orderDoc = {
      user_id,
      items: order_items,
      total,
      status: 'pending' as 'pending' | 'paid' | 'failed',
    };

    await orders.insertOne(orderDoc);

    // Empty cart
    await carts.updateOne({ user_id }, { $set: { items: [] } });

    res.json({ message: 'Order placed successfully', total, items: order_items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: 'Internal Server Error' });
  }
});

export default router;
