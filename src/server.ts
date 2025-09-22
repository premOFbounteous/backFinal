import express from "express";
import cors from "cors";
import { PORT } from "./config/env"; 
import { initMongo } from "./db/mongo"; 
import productRouter from "./routes/products";
import userRouter from "./routes/users"
import cartRouter from "./routes/cart";
import ordersRouter from './routes/orders';
import categoryRouter from "./routes/category"
import wishListRouter from "./routes/wishlist"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";



const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: "*", credentials: true }));

app.get("/", (_req, res) => {
  res.json({ message: "Welcome to my backend API" });
});

app.use("/products", productRouter);
app.use("/users", userRouter);
app.use("/cart", cartRouter);
app.use("/orders", ordersRouter);
app.use("/categories",categoryRouter);
app.use("/wishlist",wishListRouter);

interface MongoInit {
    (): Promise<void>;
}

interface AppListenCallback {
    (): void;
}

interface MongoErrorHandler {
    (err: unknown): void;
}

const initMongoTyped: MongoInit = initMongo;

initMongoTyped()
    .then((): void => {
        app.listen(PORT, (() => console.log(`Server running at http://localhost:${PORT}`)) as AppListenCallback);
    })
    .catch(((err: unknown): void => {
        console.error("[Mongo] Connection error:", err);
        process.exit(1);
    }) as MongoErrorHandler);
