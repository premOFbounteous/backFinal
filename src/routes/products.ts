import { Router, Request, Response } from "express";
import { getDb } from "../db/mongo";
import { Product } from "../models/types";
import { GoogleGenAI } from "@google/genai";

const router = Router();
const allowedSorts = ["price", "rating", "title", "id"] as const;

router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const col = db.collection<Product>("ecommerce");

    let page = Number(req.query.page ?? 1);
    let limit = Number(req.query.limit ?? 10);
    const category = req.query.category as string | undefined;
    let sort = req.query.sort as string | undefined;

    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // console.log(limit)

    const query: Partial<Product> = {};
    if (category) query.category = category;

    let sortField: string = "id";
    let sortOrder: 1 | -1 = 1;

    if (typeof sort === "string") {
      sort = sort.trim();
      if (sort.startsWith("-")) {
        sortField = sort.slice(1);
        sortOrder = -1;
      } else {
        sortField = sort;
      }
      if (!allowedSorts.includes(sortField as any)) {
        res.status(400).json({ detail: `Invalid sort field '${sortField}'` });
        return;
      }
    }

    const total = await col.countDocuments(query);
    const total_pages = Math.max(Math.ceil(total / limit), 1);
    const skip = (page - 1) * limit;

    const products = await col
      .find(query)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .map((doc) => ({ ...doc, _id: String(doc._id) }))
      .toArray();

    res.json({ total, page, limit, pages: total_pages, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});

  router.get("/normal-search", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const col = db.collection<Product>("ecommerce");

    const search_str = (req.query.search_str ?? "").toString();
    if (!search_str || search_str.length < 1) {
      res.status(422).json({ detail: "Field 'search_str' min_length=1" });
      return;
    }

    let page = Number(req.query.page ?? 1);
    let limit = Number(req.query.limit ?? 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (!Number.isFinite(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const query = {
      $or: [
        { title: { $regex: search_str, $options: "i" } },
        { description: { $regex: search_str, $options: "i" } },
      ],
    };

    const total = await col.countDocuments(query);
    const total_pages = Math.max(Math.ceil(total / limit), 1);
    const skip = (page - 1) * limit;

    const products = await col
      .find(query)
      .skip(skip)
      .limit(limit)
      .map((doc) => ({ ...doc, _id: String(doc._id) }))
      .toArray();

    res.json({ total, page, limit, pages: total_pages, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Internal Server Error" });
  }

});

//voice-search"
router.get("/search", async (req, res) => {
  try {
    const botCol = getDb().collection("BOTdoc");
    const ecommerceCol = getDb().collection("ecommerce");

    const search_str = (req.query.search_str ?? "").toString();
    if (!search_str || search_str.length < 1) {
      return res.status(422).json({ detail: "Field 'search_str' min_length=1" });
    }

    const products = await botCol
      .find({})
      .map((doc) => ({
        id: doc.id ?? doc._id?.toString() ?? "",
        title: doc.title ?? "",
        brand: doc.brand ?? "",
        category: doc.category ?? "",
      }))
      .toArray();

    const readableProduct = products
      .map(
        (p: Product) =>
          `ID: ${p.id}, Title: ${p.title}, Brand: ${p.brand}, Category: ${p.category}`
      )
      .join("\n");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `User Query: "${search_str}"\nProducts:\n${readableProduct}\nReturn only the very relevant product Titles as a comma-separated plain text list.`,
    });

    const resultText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!resultText) {
      return res.json({ result: "No match found" });
    }

    const titles = resultText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (titles.length === 0) {
      return res.json({ result: "No valid product titles found" });
    }

    const matchedProducts = await ecommerceCol
      .find({ title: { $in: titles } })
      .toArray();

    if (matchedProducts.length === 0) {
      return res.json({ result: resultText, detail: "No products found in ecommerce collection" });
    }

    // Sanitize products
    const sanitizedProducts = matchedProducts.map((prod) => {
      const { _id, ...rest } = prod;
      return { ...rest, _id: _id?.toString?.() ?? _id };
    });
    // console.log("this is data -- "+sanitizedProducts)
    return res.json({
      result: resultText,
      products: sanitizedProducts,
    });
  } catch (err) {
    console.error("[Voice Search Error]:", err);
    return res.status(500).json({ detail: "Internal Server Error" });
  }
});



router.get("/:product_id", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const col = db.collection<Product>("ecommerce");

    const product_id = Number(req.params.product_id);
    if (!Number.isFinite(product_id)) {
      res.status(404).json({ detail: `Product ${req.params.product_id} not found` });
      return;
    }

    const product = await col.findOne({ id: product_id });
    if (!product) {
      res.status(404).json({ detail: `Product ${product_id} not found` });
      return;
    }

    (product as any)._id = String(product._id);
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
});



export default router;
