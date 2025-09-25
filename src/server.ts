import express from "express";
import cors from "cors";
import { PORT } from "./config/env";
import { initMongo } from "./db/mongo";
import productRouter from "./routes/products";
import userRouter from "./routes/users";
import cartRouter, { stripeWebhookHandler } from "./routes/cart"; // Import the handler
import ordersRouter from './routes/orders';
import categoryRouter from "./routes/category";
import wishListRouter from "./routes/wishlist";
import vendorRouter from "./routes/vendors";


// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
 
const app = express();
 
app.post("/cart/webhook/stripe", express.raw({ type: 'application/json' }), stripeWebhookHandler);
 
// NOW, use the JSON parser for all other routes
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: "*", credentials: true }));
 
app.get("/", (_req, res) => {
  res.json({ message: "Welcome to my backend API" });
});
 
// Your other routes
app.use("/products", productRouter);
app.use("/users", userRouter);
app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);
app.use("/categories", categoryRouter);
app.use("/wishlist", wishListRouter);
app.use("/vendors", vendorRouter);

 
initMongo()
    .then(() => {
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    })
    .catch((err) => {
        console.error("[Mongo] Connection error:", err);
        process.exit(1);
    });
 