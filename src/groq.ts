// routes/groqSearch.ts

import { Router, Request, Response } from "express";
import { getDb } from "./db/mongo";
import { GoogleGenAI } from "@google/genai";
import { Product } from "./models/types";

const router = Router();

const groqData = async (req: Request, res: Response) => {
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

    // Extract and split the text from the response
    const resultText = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("[Gemini Output]:", resultText);

    if (!resultText) {
      return res.json({ result: "No match found" });
    }

    // Split resultText into titles (assuming comma-separated)
    const titles = resultText
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (titles.length === 0) {
      return res.json({ result: "No valid product titles found" });
    }

    // Find all matching products
    const matchedProducts = await ecommerceCol
      .find({ title: { $in: titles } })
      .toArray();

    if (matchedProducts.length === 0) {
      return res.json({ result: resultText, detail: "No products found in ecommerce collection" });
    }

    // Sanitize products to remove circular references
    const sanitizedProducts = matchedProducts.map((prod) => {
      const { _id, ...rest } = prod;
      return { ...rest, _id: _id?.toString?.() ?? _id };
    });

    return res.json({
      result: resultText,
      products: sanitizedProducts,
    });
  } catch (err) {
    console.error("[Groq Search Error]:", err);
    res.status(500).json({ detail: "Internal Server Error" });
  }
};

export default groqData;
