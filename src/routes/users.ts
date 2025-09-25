import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/mongo';
import { createAccessToken, createRefreshToken, verifyToken } from '../utils/jwt';
import { Address, JWTPayload, UserDoc } from '../models/types';
import { ObjectId } from 'mongodb';
import { authMiddleware } from '../middleware/auth';

const router = Router();


type AddressInput = Omit<Address, '_id' | 'isDefault'>;


type AddressInput = Omit<Address, '_id' | 'isDefault'>;

// POST /users/register
router.post(
  '/register',
  async (req: Request<{}, {}, { username?: string; email?: string; password?: string; DOB?: string; address?: AddressInput }>, res: Response) => {
  async (req: Request<{}, {}, { username?: string; email?: string; password?: string; DOB?: string; address?: AddressInput }>, res: Response) => {
    try {
      const { username, email, password, DOB, address } = req.body || {};
      
      if (!username || !email || !password || !DOB || !address || !address.street || !address.city || !address.state || !address.postalCode || !address.country) {
        return res.status(422).json({ detail: 'Username, email, password, DOB, and a complete address object are required' });
      }

      const dobDate = new Date(DOB);
      if (isNaN(dobDate.getTime())) {
          return res.status(422).json({ detail: 'Invalid DOB format. Please use a valid date string like "YYYY-MM-DD".' });
      const { username, email, password, DOB, address } = req.body || {};
      
      if (!username || !email || !password || !DOB || !address || !address.street || !address.city || !address.state || !address.postalCode || !address.country) {
        return res.status(422).json({ detail: 'Username, email, password, DOB, and a complete address object are required' });
      }

      const dobDate = new Date(DOB);
      if (isNaN(dobDate.getTime())) {
          return res.status(422).json({ detail: 'Invalid DOB format. Please use a valid date string like "YYYY-MM-DD".' });
      }

      const db = getDb();
      const users = db.collection<UserDoc>('users');

      const existsEmail = await users.findOne({ email });
      if (existsEmail) {
        return res.status(400).json({ detail: 'Email already registered' });
        return res.status(400).json({ detail: 'Email already registered' });
      }
      const existsUsername = await users.findOne({ username });
      if (existsUsername) {
        return res.status(400).json({ detail: 'Username taken' });
        return res.status(400).json({ detail: 'Username taken' });
      }

      const hashed = bcrypt.hashSync(password, 10);
      const user_id = randomUUID();
      
      
      const userDoc: UserDoc = {
        username,
        email,
        password: hashed,
        user_id,
        DOB: dobDate,
        addresses: [
          {
            ...address,
            _id: new ObjectId(), // This now works because ObjectId is imported
            isDefault: true
          }
        ],
        DOB: dobDate,
        addresses: [
          {
            ...address,
            _id: new ObjectId(), // This now works because ObjectId is imported
            isDefault: true
          }
        ],
        created_at: new Date(),
      };

      await users.insertOne(userDoc);
      res.status(201).json({ message: 'User registered successfully', user_id });
      res.status(201).json({ message: 'User registered successfully', user_id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

// --- NEW: GET ALL ADDRESSES FOR THE LOGGED-IN USER ---
router.get('/addresses', authMiddleware, async (req: Request, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const db = getDb();
        const user = await db.collection<UserDoc>('users').findOne({ user_id });

        if (!user) {
            return res.status(404).json({ detail: 'User not found' });
        }
        res.json(user.addresses || []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

// --- NEW: ADD A NEW ADDRESS FOR THE LOGGED-IN USER ---
router.post('/addresses', authMiddleware, async (req: Request<{}, {}, AddressInput>, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const addressData = req.body;

        if (!addressData || !addressData.street || !addressData.city || !addressData.state || !addressData.postalCode || !addressData.country) {
            return res.status(422).json({ detail: 'A complete address object is required' });
        }

        const newAddress: Address = {
            ...addressData,
            _id: new ObjectId(),
            isDefault: false
        };

        const db = getDb();
        await db.collection<UserDoc>('users').updateOne(
            { user_id },
            { $push: { addresses: newAddress } }
        );

        res.status(201).json({ message: 'Address added successfully', address: newAddress });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});

// --- NEW: UPDATE AN EXISTING ADDRESS ---
router.put('/addresses/:addressId', authMiddleware, async (req: Request<{ addressId: string }, {}, AddressInput>, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const { addressId } = req.params;
        const updatedAddressData = req.body;
        
        const db = getDb();

        // Find the user to preserve the isDefault status
        const user = await db.collection<UserDoc>('users').findOne({ user_id, "addresses._id": new ObjectId(addressId) });
        const existingAddress = user?.addresses.find(addr => addr._id.toString() === addressId);

        if (!existingAddress) {
            return res.status(404).json({ detail: 'Address not found for this user' });
        }

        const result = await db.collection<UserDoc>('users').updateOne(
            { user_id, "addresses._id": new ObjectId(addressId) },
            { $set: { 
                "addresses.$.street": updatedAddressData.street,
                "addresses.$.city": updatedAddressData.city,
                "addresses.$.state": updatedAddressData.state,
                "addresses.$.postalCode": updatedAddressData.postalCode,
                "addresses.$.country": updatedAddressData.country,
                // "addresses.$.isDefault": existingAddress.isDefault // Preserve the isDefault value
            }}
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ detail: 'Address not found for this user' });
        }

        res.json({ message: 'Address updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});



// --- NEW: DELETE AN ADDRESS ---
router.delete('/addresses/:addressId', authMiddleware, async (req: Request<{ addressId: string }>, res: Response) => {
    try {
        const user_id = (req as any).user.user_id;
        const { addressId } = req.params;

        const db = getDb();
        await db.collection<UserDoc>('users').updateOne(
            { user_id },
            { $pull: { addresses: { _id: new ObjectId(addressId) } } }
        );

        res.json({ message: 'Address deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});
// POST /users/login
router.post(
  '/login',
  async (req: Request<{}, {}, { email?: string; password?: string }>, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(422).json({ detail: 'email and password are required' });
      }

      const db = getDb();
      const user = await db.collection<UserDoc>('users').findOne({ email });

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ detail: 'Invalid credentials' });
      }
      
      // --- FIX IS HERE ---
      // Add 'role: "user"' to the payload to match the JWTPayload type.
      const payload: JWTPayload = { user_id: user.user_id, role: 'user' };
      const access_token = createAccessToken(payload);
      const refresh_token = createRefreshToken(payload);

      res.json({ access_token, refresh_token, token_type: 'bearer' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

// POST /users/refresh
router.post(
  '/refresh',
  async (req, res) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(422).json({ detail: 'refresh_token is required' });
      }
      
      // --- FIX IS HERE ---
      // Verify the token and check that it's a valid USER token.
      const payload = verifyToken(String(refresh_token)) as JWTPayload;
      
      if (payload.role !== 'user' || !payload.user_id) {
        return res.status(401).json({ detail: 'Invalid refresh token for a user account' });
      }

      // Create new tokens with the correct payload structure
      const new_payload: JWTPayload = { user_id: payload.user_id, role: 'user' };
      const access_token = createAccessToken(new_payload);
      const new_refresh = createRefreshToken(new_payload);

      res.json({ access_token, refresh_token: new_refresh, token_type: 'bearer' });
    } catch (err) {
      // Catches expired or malformed tokens
      res.status(401).json({ detail: 'Invalid or expired refresh token' });
    }
  }
);


router.get('/profile', authMiddleware, async (req: Request, res: Response) => {
    try {
        // The user_id is attached to the request by the authMiddleware
        const user_id = (req as any).user.user_id;

        const db = getDb();
        const user = await db.collection<UserDoc>('users').findOne({ user_id });

        if (!user) {
            return res.status(404).json({ detail: 'User profile not found' });
        }
        const { password, ...userProfile } = user;//removing password field from the user 

        res.json(userProfile);

    } catch (err) {
        console.error(err);
        res.status(500).json({ detail: 'Internal Server Error' });
    }
});


export default router;
