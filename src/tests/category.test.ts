import request from 'supertest';
import express from 'express';
import categoryRouter from '../routes/category';
import { Product } from '../models/types';
import { getDb } from '../db/mongo';

const app = express();
app.use(express.json());
app.use('/categories', categoryRouter);

describe('Category Routes', () => {
  beforeEach(async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').insertMany([
        { id: 1, title: 'A', category: 'cat1' } as Product,
        { id: 2, title: 'B', category: 'cat2' } as Product,
        { id: 3, title: 'C', category: 'cat1' } as Product,
    ]);
  });

  it('should return a list of unique categories', async () => {
    const res = await request(app).get('/categories');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('count', 2);
    expect(res.body.categories).toContain('cat1');
    expect(res.body.categories).toContain('cat2');
  });
});