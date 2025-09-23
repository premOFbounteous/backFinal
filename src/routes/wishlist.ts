import { Router, Request, Response } from 'express';
import { getDb } from '../db/mongo';
import { authMiddleware } from '../middleware/auth';
import { Wishlist, Product } from '../models/types';

const router = Router();

// Add item to wishlist
router.post('/add', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ detail: 'Product ID is required' });
        }

        const db = getDb();
        const productsCollection = db.collection<Product>('ecommerce');
        const product = await productsCollection.findOne({ id: product_id });

        if (!product) {
            return res.status(404).json({ detail: 'Product not found' });
        }

        const wishlistsCollection = db.collection<Wishlist>('wishlists');
        await wishlistsCollection.updateOne(
            { user_id },
            { $addToSet: { items: product_id } },
            { upsert: true }
        );

        res.status(200).json({ message: 'Product added to wishlist' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

// Get user's wishlist
router.get('/', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const db = getDb();
        const wishlistsCollection = db.collection<Wishlist>('wishlists');
        const wishlist = await wishlistsCollection.findOne({ user_id });

        if (!wishlist) {
            return res.json({ items: [] });
        }

        const productsCollection = db.collection<Product>('ecommerce');
        const products = await productsCollection.find({ id: { $in: wishlist.items } }).toArray();

        res.json({ items: products });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

// Remove item from wishlist
router.post('/remove', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const { product_id } = req.body;

        if (!product_id) {
            return res.status(400).json({ detail: 'Product ID is required' });
        }

        const db = getDb();
        const wishlistsCollection = db.collection<Wishlist>('wishlists');
        await wishlistsCollection.updateOne(
            { user_id },
            { $pull: { items: product_id } }
        );

        res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

export default router;
