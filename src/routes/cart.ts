import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';
import { Cart, CartItem, OrderDoc, OrderItem, Product } from '../models/types';
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



// POST /cart/checkout
router.post('/checkout', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user_id: string = (req as any).user.user_id;
        const carts = db.collection<Cart>('carts');;
        const products = db.collection<Product>('ecommerce');

        const cart = await carts.findOne({ user_id });
        if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
            return res.status(400).json({ detail: 'Cart is empty' });
        }

        const order_items: OrderItem[] = [];
        let total = 0;
        const stripe_line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

        // Validate cart and build order details
        for (const item of cart.items) {
            const product = await products.findOne({ id: item.product_id });
            if (!product) {
                return res.status(404).json({ detail: `Product ${item.product_id} not found` });
            }
            if ((product.stock ?? 0) < (item.quantity ?? 0)) {
                return res.status(400).json({ detail: `Not enough stock for ${product.title}. Only ${product.stock} left.` });
            }

            const itemPrice = Number(product.price);
            const itemQuantity = Number(item.quantity);
            total += itemPrice * itemQuantity;

            order_items.push({
                product_id: product.id,
                title: product.title,
                price: itemPrice,
                quantity: itemQuantity,
            });

            // Add item to the array for the Stripe session
            stripe_line_items.push({
                price_data: {
                    currency: 'usd', // IMPORTANT: Change currency if needed
                    product_data: {
                        name: product.title || 'Product',
                    },
                    unit_amount: Math.round(itemPrice * 100), // Price in cents
                },
                quantity: itemQuantity,
            });
        }

        // Create a pending order in our database
        const orders = db.collection<OrderDoc>('orders');
        const orderDoc: OrderDoc = {
            user_id,
            items: order_items,
            total,
            status: 'pending',
        };
        const result = await orders.insertOne(orderDoc);
        const orderId = result.insertedId;

        // Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: stripe_line_items,
            mode: 'payment',
            success_url: 'https://dashboard.stripe.com/login?redirect=%2Fdevelopers',
            cancel_url: 'https://www.youtube.com/watch?v=NgjERPTaC4Y&list=RDVMEXKJbsUmE&index=10',
            metadata: {
                orderId: String(orderId),
            },
        });

        if (!session.url) {
            return res.status(500).json({ detail: 'Could not create Stripe session' });
        }

        // Return the Stripe session URL to the frontend for redirection
        res.json({ url: session.url });

    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

export default router;
