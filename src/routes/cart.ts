import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';
import { Cart, CartItem, OrderDoc, OrderItem, Product, UserDoc } from '../models/types';
import Stripe from 'stripe';
import { Db, ObjectId,MongoClient, Collection } from 'mongodb';
import express from "express";
// Initialize Stripe with your secret key
const MONGO_URI = process.env.MONGO_URI || '';
const DB_NAME = process.env.DB_NAME || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
});
let db:Db;
const client = new MongoClient(MONGO_URI, { ignoreUndefined: true });
   client.connect();
  db = client.db(DB_NAME);
 
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
 
 
export async function stripeWebhookHandler(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'] as string;
 
    if (!sig) {
        return res.status(400).send(`Webhook Error: Missing stripe-signature`);
    }
 
    let event: Stripe.Event;
 
    try {
        // Use req.body directly as it's the raw buffer from express.raw()
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
 
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
 
        if (!orderId) {
            console.error(`Webhook Error: Missing orderId in session metadata for session ${session.id}`);
            return res.status(400).send('Webhook Error: Missing orderId in metadata.');
        }
 
        const db = getDb();
        const dbSession = db.client.startSession();
        try {
            await dbSession.withTransaction(async () => {
                const orders = db.collection<OrderDoc>('orders');
                const order = await orders.findOne({ _id: new ObjectId(orderId), status: 'pending' }, { session: dbSession });
 
                if (!order) {
                    console.warn(`Webhook: Order ${orderId} not found or already processed.`);
                    return;
                }
 
                await orders.updateOne(
                    { _id: order._id },
                    { $set: { status: 'paid', stripe_session_id: session.id } },
                    { session: dbSession }
                );
 
                for (const item of order.items) {
                    await db.collection<Product>('ecommerce').updateOne(
                        { id: item.product_id },
                        { $inc: { stock: -item.quantity } },
                        { session: dbSession }
                    );
                }
 
                await db.collection<Cart>('carts').updateOne(
                    { user_id: order.user_id },
                    { $set: { items: [] } },
                    { session: dbSession }
                );
            });
            console.log(`[Webhook] Successfully processed order ${orderId}`);
        } catch (error) {
            console.error(`[Webhook] Transaction failed for order ${orderId}:`, error);
        } finally {
            await dbSession.endSession();
        }
    }
    res.status(200).send();
}
 
 
// POST /cart/checkout
router.post('/checkout', authMiddleware, async (req: Request<{}, {}, { addressId?: string }>, res: Response) => {
    try {
        const user_id: string = (req as any).user.user_id;
        const { addressId } = req.body;

        // --- 1. VALIDATE INCOMING REQUEST ---
        if (!addressId) {
            return res.status(422).json({ detail: 'An addressId is required to place an order' });
        }

        const db = getDb();

        // --- 2. FIND THE USER AND THE SELECTED ADDRESS ---
        const usersCol = db.collection<UserDoc>('users');
        const user = await usersCol.findOne({ user_id });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }

        // Find the specific address from the user's address array
        const selectedAddress = user.addresses.find(
            (addr) => addr._id.toString() === addressId
        );

        if (!selectedAddress) {
            return res.status(404).json({ detail: 'The selected address was not found in your profile. Please choose a valid address.' });
        }

        // --- 3. PROCESS THE CART (Your existing logic) ---
        const carts = db.collection<Cart>('carts');
        const productsCol = db.collection<Product>('ecommerce');
        const cart = await carts.findOne({ user_id });

        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ detail: 'Cart is empty' });
        }

        const order_items: OrderItem[] = [];
        let total = 0;
        const stripe_line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

        for (const item of cart.items) {
            const product = await productsCol.findOne({ id: item.product_id });
            if (!product) { return res.status(404).json({ detail: `Product ${item.product_id} not found` }); }
            if ((product.stock ?? 0) < item.quantity) { return res.status(400).json({ detail: `Not enough stock for ${product.title}` }); }

            const itemPrice = Number(product.price);
            const itemQuantity = Number(item.quantity);
            total += itemPrice * itemQuantity;

            order_items.push({
                product_id: product.id,
                title: product.title,
                price: itemPrice,
                quantity: itemQuantity,
                thumbnail: product.thumbnail,
            });

            stripe_line_items.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: product.title || 'Product',
                        images: product.thumbnail ? [product.thumbnail] : [],
                    },
                    unit_amount: Math.round(itemPrice * 100),
                },
                quantity: itemQuantity,
            });
        }

        // --- 4. CREATE THE ORDER WITH THE SHIPPING ADDRESS ---
        const orders = db.collection<OrderDoc>('orders');
        const orderDoc: Omit<OrderDoc, '_id'> = {
            user_id,
            items: order_items,
            total,
            status: 'pending',
            createdAt: new Date(),
            shippingAddress: selectedAddress // <-- The selected address is now saved with the order
        };
        const result = await orders.insertOne(orderDoc);
        const orderId = result.insertedId;

        // --- 5. CREATE STRIPE SESSION (Your existing logic) ---
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: stripe_line_items,
            mode: 'payment',
            success_url: 'https://brocode140.netlify.app/#/success',
            cancel_url: 'https://brocode140.netlify.app/#/cancel',
            customer_email: user.email, // Pre-fill the user's email
            metadata: {
                orderId: String(orderId),
            },
        });

        if (!session.url) {
            return res.status(500).json({ detail: 'Could not create Stripe session' });
        }

        res.json({ url: session.url });

    } catch (err: any) {
        console.error(err);
        // Add more specific error handling for invalid ObjectId
        if (err.name === 'BSONTypeError') {
            return res.status(400).json({ detail: 'Invalid addressId format' });
        }
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});
 
 
// POST /cart/update_quantity
router.post(
  '/update_quantity',
  authMiddleware,
  async (req: Request<{}, {}, { product_id?: number; quantity?: number }>, res: Response) => {
    try {
      const user_id: string = (req as any).user.user_id;
      const { product_id, quantity } = req.body || {};
 
      if (!Number.isFinite(Number(product_id)) || !Number.isFinite(Number(quantity)) || Number(quantity) < 1) {
        res.status(422).json({ detail: 'product_id and quantity must be numbers, and quantity must be at least 1' });
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
      const result = await carts.updateOne(
        { user_id, "items.product_id": Number(product_id) },
        { $set: { "items.$.quantity": Number(quantity) } }
      );
 
      if (result.matchedCount === 0) {
        return res.status(404).json({ detail: 'Item not found in cart' });
      }
 
      res.json({ message: 'Cart quantity updated' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);
 
// POST /cart/remove
router.post(
  '/remove',
  authMiddleware,
  async (req: Request<{}, {}, { product_id?: number }>, res: Response) => {
    try {
      const user_id: string = (req as any).user.user_id;
      const { product_id } = req.body || {};
 
      if (!Number.isFinite(Number(product_id))) {
        res.status(422).json({ detail: 'product_id must be a number' });
        return;
      }
 
      const db = getDb();
      const carts = db.collection<Cart>('carts');
      await carts.updateOne(
        { user_id },
        { $pull: { items: { product_id: Number(product_id) } } }
      );
 
      res.json({ message: 'Item removed from cart' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);
 
export default router;
 