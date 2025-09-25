import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/mongo';
import { createAccessToken, createRefreshToken, verifyToken } from '../utils/jwt';
import { VendorDoc, Product } from '../models/types';
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

        const payload = { vendor_id: vendor.vendor_id, role: 'vendor' as const };
        const access_token = createAccessToken(payload);
        const refresh_token = createRefreshToken(payload);

        res.json({ access_token, refresh_token, token_type: 'bearer' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
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
        const { title, description, price, stock, category, brand, thumbnail } = req.body;
        
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
        };

        await productsCol.insertOne(newProduct as Product);
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
        const result = await db.collection<Product>('ecommerce').deleteOne(
            { id: productId, vendorId: vendor_id } // IMPORTANT: Security check for ownership
        );

        if (result.deletedCount === 0) {
            return res.status(404).json({ detail: 'Product not found or you do not have permission to delete it' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

export default router;