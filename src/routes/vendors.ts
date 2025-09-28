import { Router, Request, Response } from 'express';

import bcrypt from 'bcryptjs';

import { randomUUID } from 'crypto';

import { getDb } from '../db/mongo';

import { createAccessToken, createRefreshToken, verifyToken } from '../utils/jwt';

import { VendorDoc, Product, JWTPayload, Wishlist, Cart } from '../models/types'; // JWTPayload import karein

import { vendorAuthMiddleware } from '../middleware/vendorAuth';
 
const router = Router();
 
// POST /vendors/register

router.post('/register', async (req: Request<{}, {}, { companyName?: string; email?: string; password?: string }>, res: Response) => {

    try {

        const { companyName, email, password } = req.body;

        if (!companyName || !email || !password) {

            return res.status(422).json({ detail: 'Company name, email, and password are required' });

        }
 
        const db = getDb();

        const vendors = db.collection<VendorDoc>('vendors');

        const existingVendor = await vendors.findOne({ email });

        if (existingVendor) {

            return res.status(400).json({ detail: 'Email is already registered' });

        }
 
        const vendor_id = randomUUID();

        const hashedPassword = bcrypt.hashSync(password, 10);

        const newVendor: VendorDoc = {

            companyName,

            email,

            password: hashedPassword,

            vendor_id,

            createdAt: new Date(),

        };
 
        await vendors.insertOne(newVendor);

        res.status(201).json({ message: 'Vendor registered successfully', vendor_id });

    } catch (err) {

        console.error(err);

        res.status(500).json({ detail: 'Internal Server Error' });

    }

});
 
// POST /vendors/login

router.post('/login', async (req: Request<{}, {}, { email?: string; password?: string }>, res: Response) => {

    try {

        const { email, password } = req.body;

        if (!email || !password) {

            return res.status(422).json({ detail: 'Email and password are required' });

        }
 
        const db = getDb();

        const vendor = await db.collection<VendorDoc>('vendors').findOne({ email });

        if (!vendor || !bcrypt.compareSync(password, vendor.password)) {

            return res.status(401).json({ detail: 'Invalid credentials' });

        }
 
        const payload: JWTPayload = { vendor_id: vendor.vendor_id, role: 'vendor' };

        const access_token = createAccessToken(payload);

        const refresh_token = createRefreshToken(payload);
 
        res.json({ access_token, refresh_token, token_type: 'bearer', companyName: vendor.companyName, vendorId: vendor.vendor_id });

    } catch (err) {

        console.error(err);

        res.status(500).json({ detail: 'Internal Server Error' });

    }

});
 
 
// NEW: POST /vendors/refresh

router.post('/refresh', async (req, res) => {

    try {

        const { refresh_token } = req.body;
 
        if (!refresh_token) {

            return res.status(422).json({ detail: 'refresh_token is required' });

        }
 
        const payload = verifyToken(String(refresh_token)) as JWTPayload;
 
        // Verify the token is for a vendor

        if (payload.role !== 'vendor' || !payload.vendor_id) {

            return res.status(401).json({ detail: 'Invalid refresh token for a vendor account' });

        }
 
        // Create new tokens for the vendor

        const new_payload: JWTPayload = { vendor_id: payload.vendor_id, role: 'vendor' };

        const access_token = createAccessToken(new_payload);

        const new_refresh = createRefreshToken(new_payload);
 
        res.json({ access_token, refresh_token: new_refresh, token_type: 'bearer' });

    } catch (err) {

        // Catches expired or malformed tokens

        res.status(401).json({ detail: 'Invalid or expired token' });

    }

});
 
 
// --- VENDOR PRODUCT MANAGEMENT (PROTECTED ROUTES) ---
 
// GET /vendors/products - Get all products listed by the logged-in vendor

router.get('/products', vendorAuthMiddleware, async (req: Request, res: Response) => {

    try {

        const vendor_id = (req as any).vendor.vendor_id;

        const db = getDb();

        const products = await db.collection<Product>('ecommerce').find({ vendorId: vendor_id }).toArray();

        res.json(products);

    } catch (err) {

        console.error(err);

        res.status(500).json({ detail: 'Internal Server Error' });

    }

});
 
 
// POST /vendors/products - Add a new product

router.post('/products', vendorAuthMiddleware, async (req: Request, res: Response) => {

    try {

        const vendor_id = (req as any).vendor.vendor_id;

        const { title, description, price, stock, category, brand, thumbnail,images } = req.body;

        if (!title || !price || !stock) {

            return res.status(422).json({ detail: 'Title, price, and stock are required fields' });

        }
 
        const db = getDb();

        const productsCol = db.collection<Product>('ecommerce');
 
        // Find the highest existing ID to auto-increment

        const lastProduct = await productsCol.find().sort({ id: -1 }).limit(1).toArray();

        const newId = (lastProduct[0]?.id || 0) + 1;
 
        const newProduct: Omit<Product, '_id'> = {

            id: newId,

            title,

            description: description || '',

            price: Number(price),

            stock: Number(stock),

            category: category || 'Uncategorized',

            brand: brand || 'Generic',

            thumbnail: thumbnail || '',

            vendorId: vendor_id, // Link product to the vendor

            rating: 0, // Default rating

            images: images || [thumbnail]

        };
 
        await productsCol.insertOne(newProduct as Product);

        const botDoc = {
            id: newProduct.id,
            title: newProduct.title,
            description: newProduct.description,
            category: newProduct.category,
            brand: newProduct.brand
        };

        // 3. 'BOTdoc' updated
        const botCol = getDb().collection("BOTdoc");
        await botCol.insertOne(botDoc);


        res.status(201).json({ message: 'Product added successfully', product: newProduct });

    } catch (err) {

        console.error(err);

        res.status(500).json({ detail: 'Internal Server Error' });

    }

});
 
 
// PUT /vendors/products/:productId - Update a product's price and stock

router.put('/products/:productId', vendorAuthMiddleware, async (req: Request<{ productId: string }, {}, { price?: number; stock?: number }>, res: Response) => {

    try {

        const vendor_id = (req as any).vendor.vendor_id;

        const productId = Number(req.params.productId);

        const { price, stock } = req.body;

        if (!price && !stock) {

            return res.status(422).json({ detail: 'Either price or stock is required for update' });

        }

        if (isNaN(productId)) {

            return res.status(400).json({ detail: 'Product ID must be a number' });

        }
 
        const updateFields: { price?: number; stock?: number } = {};

        if (price) updateFields.price = Number(price);

        if (stock) updateFields.stock = Number(stock);

        const db = getDb();

        const result = await db.collection<Product>('ecommerce').updateOne(

            { id: productId, vendorId: vendor_id }, // IMPORTANT: Security check for ownership

            { $set: updateFields }

        );
 
        if (result.matchedCount === 0) {

            return res.status(404).json({ detail: 'Product not found or you do not have permission to edit it' });

        }
 
        res.json({ message: 'Product updated successfully' });

    } catch (err) {

        console.error(err);

        res.status(500).json({ detail: 'Internal Server Error' });

    }

});
 

// DELETE /vendors/products/:productId - Remove a product
router.delete('/products/:productId', vendorAuthMiddleware, async (req: Request<{ productId: string }>, res: Response) => {
    try {
        const vendor_id = (req as any).vendor.vendor_id;
        const productId = Number(req.params.productId);

        if (isNaN(productId)) {
            return res.status(400).json({ detail: 'Product ID must be a number' });
        }

        const db = getDb();
        const productsCollection = db.collection<Product>('ecommerce');

        // 1. Product ko delete karein
        const result = await productsCollection.deleteOne(
            { id: productId, vendorId: vendor_id } // Ownership check
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Product not found or you do not have permission to delete it' });
        }

        // 2. Carts collection ka type <Cart> batayein
        const cartsCollection = db.collection<Cart>('carts');
        await cartsCollection.updateMany(
            { "items.product_id": productId },
            { $pull: { items: { product_id: productId } } }
        );

        // 3. Wishlists collection ka type <Wishlist> batayein
        const wishlistsCollection = db.collection<Wishlist>('wishlists');
        await wishlistsCollection.updateMany(
            { items: productId },
            { $pull: { items: productId } }
        );

        res.json({ message: 'Product deleted successfully from store, and all user carts and wishlists' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});


export default router;
 