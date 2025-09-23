import express, { Request, Response } from "express"; // Added Request, Response types
import cors from "cors";
import { PORT } from "./config/env";
// Removed initMongo import as we will define it here for clarity
import productRouter from "./routes/products";
import userRouter from "./routes/users"
import cartRouter from "./routes/cart";
import ordersRouter from './routes/orders';
import categoryRouter from "./routes/category"
import wishListRouter from "./routes/wishlist"
import { Cart, OrderDoc, Product } from './models/types';
import Stripe from 'stripe';
import { Db, ObjectId, MongoClient } from 'mongodb';

// ---- Config ----
const MONGO_URI = process.env.MONGO_URI || '';
const DB_NAME = process.env.DB_NAME || '';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});

// ---- Database Variables ----
// These will be initialized once the connection is successful
let db: Db;
let mongoClient: MongoClient;

// ---- Security Warning ----
// This disables SSL/TLS certificate validation. It's a security risk.
// It's better to configure your environment properly than to use this.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
app.use(cors({ origin: "*", credentials: true }));


// ---- STRIPE WEBHOOK ENDPOINT ----
// This route must come BEFORE app.use(express.json())
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    // Check if the database is connected before proceeding
    if (!mongoClient || !db) {
      console.error("[Webhook] Database not connected. Aborting.");
      return res.status(500).send("Webhook Error: Database not available.");
    }

    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
        return res.status(400).send(`Webhook Error: Missing stripe-signature`);
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
            console.error(`Webhook Error: Missing orderId in session metadata for session ${session.id}`);
            return res.status(400).send('Webhook Error: Missing orderId in metadata.');
        }

        const dbSession = mongoClient.startSession();
        try {
            await dbSession.withTransaction(async () => {
                const order = await db.collection<OrderDoc>('orders').findOne({ _id: new ObjectId(orderId), status: 'pending' }, { session: dbSession });

                if (!order) {
                    console.warn(`Webhook: Order ${orderId} not found or already processed.`);
                    return;
                }

                // 1. Update order status to 'paid'
                await db.collection<OrderDoc>('orders').updateOne(
                    { _id: order._id },
                    { $set: { status: 'paid', stripe_session_id: session.id } },
                    { session: dbSession }
                );

                // 2. Deduct stock for each item in the order
                for (const item of order.items) {
                    await db.collection<Product>('ecommerce').updateOne(
                        { id: item.product_id },
                        { $inc: { stock: -item.quantity } },
                        { session: dbSession }
                    );
                }

                // 3. Empty the user's cart
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

    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send();
});


// ---- Global Middleware ----
// This MUST come AFTER the webhook endpoint
app.use(express.json({ limit: "1mb" }));


// ---- API Routes ----
app.get("/", (_req, res) => {
  res.json({ message: "Welcome to my backend API" });
});

app.use("/products", productRouter);
app.use("/users", userRouter);
app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);
app.use("/categories", categoryRouter);
app.use("/wishlist", wishListRouter);


// ---- Server Startup ----
// A single, reliable function to connect to MongoDB
async function connectToDatabase() {
    try {
        mongoClient = new MongoClient(MONGO_URI, { ignoreUndefined: true });
        await mongoClient.connect(); // Await the connection
        db = mongoClient.db(DB_NAME);
        console.log(`[Mongo] Connected to ${MONGO_URI}/${DB_NAME}`);
    } catch (err) {
        console.error("[Mongo] Connection error:", err);
        process.exit(1);
    }
}

// Start the server only after the database is connected
async function startServer() {
    await connectToDatabase();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

startServer();