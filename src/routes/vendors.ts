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




router.post('/products', vendorAuthMiddleware, async (req: Request, res: Response) => {
    try {
        // 1. Get vendor ID from the authentication middleware
        const vendor_id = (req as any).vendor.vendor_id;

        // 2. Destructure ALL expected fields from the request body
        const {
            title, description, category, price, discountPercentage,
            stock, sku, tags, brand,
            weight, dimensions,
            warrantyInformation, shippingInformation, returnPolicy,
            minimumOrderQuantity,
            images, thumbnail
        } = req.body;

        // 3. Expanded validation to check for all required fields
        const requiredFields = [
            'title', 'description', 'category', 'price', 'stock', 'sku', 'brand',
            'weight', 'dimensions', 'warrantyInformation', 'shippingInformation',
            'returnPolicy', 'images'
        ];
        
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(422).json({ detail: `Missing required field: ${field}` });
            }
        }

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(422).json({ detail: 'Product must have at least one image.' });
        }

        const db = getDb();
        const productsCol = db.collection<Product>('ecommerce');

        // 4. Auto-increment the numeric ID
        const lastProduct = await productsCol.find().sort({ id: -1 }).limit(1).toArray();
        const newId = (lastProduct[0]?.id || 0) + 1;

        // 5. Build the complete product object matching your interface
        const newProduct: Omit<Product, '_id'> = {
            id: newId,
            
            // --- Core Details ---
            title,
            description,
            category,
            price: Number(price),
            discountPercentage: Number(discountPercentage) || 0,
            
            // ✅ ADDED: Initialize rating to 0 for new products
            rating: 0, 

            // --- Inventory & SKU ---
            stock: Number(stock),
            sku,
            tags: tags || [],
            brand,

            // --- Shipping Details ---
            weight: Number(weight),
            dimensions: {
                width: Number(dimensions.width),
                height: Number(dimensions.height),
                depth: Number(dimensions.depth),
            },

            // --- Logistics & Policies ---
            warrantyInformation,
            shippingInformation,
            returnPolicy,
            minimumOrderQuantity: Number(minimumOrderQuantity) || 1,

            // --- Media ---
            images,
            thumbnail: thumbnail || images[0],

            // --- System-Managed ---
            vendorId: vendor_id,
        };

        // 6. Insert the new product into the database
        const result = await productsCol.insertOne(newProduct as any);
        
        const createdProduct = { ...newProduct, _id: result.insertedId };

        res.status(201).json({ message: 'Product added successfully', product: createdProduct });
    } catch (err) {
        console.error("Failed to add product:", err);
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