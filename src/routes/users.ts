import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { getDb } from '../db/mongo';
import { createAccessToken, createRefreshToken, verifyToken } from '../utils/jwt';
import { UserDoc } from '../models/types';

const router = Router();

// POST /users/register
router.post(
  '/register',
  async (req: Request<{}, {}, { username?: string; email?: string; password?: string }>, res: Response) => {
    try {
      const { username, email, password } = req.body || {};
      if (!username || !email || !password) {
        res.status(422).json({ detail: 'username, email and password are required' });
        return;
      }

      const db = getDb();
      const users = db.collection<UserDoc>('users');

      const existsEmail = await users.findOne({ email });
      if (existsEmail) {
        res.status(400).json({ detail: 'Email already registered' });
        return;
      }
      const existsUsername = await users.findOne({ username });
      if (existsUsername) {
        res.status(400).json({ detail: 'Username taken' });
        return;
      }

      const hashed = bcrypt.hashSync(password, 10);
      const user_id = randomUUID();
      const userDoc: UserDoc = {
        username,
        email,
        password: hashed,
        user_id,
        created_at: new Date(),
      };

      await users.insertOne(userDoc);
      res.json({ message: 'User registered', user_id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

// POST /users/login
router.post(
  '/login',
  async (req: Request<{}, {}, { email?: string; password?: string }>, res: Response) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        res.status(422).json({ detail: 'email and password are required' });
        return;
      }

      const db = getDb();
      const users = db.collection<UserDoc>('users');
      const user = await users.findOne({ email });

      if (!user) {
        res.status(404).json({ detail: 'User not found' });
        return;
      }

      const ok = bcrypt.compareSync(password, user.password);
      if (!ok) {
        res.status(401).json({ detail: 'Incorrect password' });
        return;
      }

      const access_token = createAccessToken({ user_id: user.user_id });
      const refresh_token = createRefreshToken({ user_id: user.user_id });

      res.json({ access_token, refresh_token, token_type: 'bearer' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

// POST /users/refresh
// Accepts refresh_token in query or body (keeps same shape as original)
router.post(
  '/refresh',
  async (
    req: Request<Record<string, never>, unknown, { refresh_token?: string }, { refresh_token?: string }>,
    res: Response
  ) => {
    try {
      const tokenFromQuery = req.query.refresh_token;
      const tokenFromBody = req.body?.refresh_token;
      const refresh_token = tokenFromQuery ?? tokenFromBody;

      if (!refresh_token) {
        res.status(422).json({ detail: 'refresh_token is required' });
        return;
      }

      try {
        const payload = verifyToken(String(refresh_token));
        const user_id = (payload as any).user_id;
        if (!user_id) {
          res.status(401).json({ detail: 'Invalid refresh token' });
          return;
        }

        const access_token = createAccessToken({ user_id });
        const new_refresh = createRefreshToken({ user_id });

        res.json({ access_token, refresh_token: new_refresh, token_type: 'bearer' });
      } catch (err) {
        // verifyToken throws on invalid token
        res.status(401).json({ detail: 'Invalid refresh token' });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: 'Internal Server Error' });
    }
  }
);

export default router;
