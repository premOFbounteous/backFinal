import { Router, Request, Response } from "express";
import { getDb } from "../db/mongo";
import { Product } from "../models/types";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const db = getDb();
    const col = db.collection<Product>("ecommerce");
    const categories = await col.distinct("category");
    res.json({ count: categories.length, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

export default router;