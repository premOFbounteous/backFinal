import request from 'supertest';
import express from 'express';
import wishlistRouter from '../routes/wishlist';
import userRouter from '../routes/users';
import { Product } from '../models/types';
import { getDb } from '../db/mongo';

const app = express();
app.use(express.json());
app.use('/wishlist', wishlistRouter);
app.use('/users', userRouter);

describe('Wishlist Routes', () => {
  let userToken: string;
  
  beforeEach(async () => {
    await request(app).post('/users/register').send({
        username: 'wishlistuser', email: 'wishlist@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
    });
    const loginRes = await request(app).post('/users/login').send({ email: 'wishlist@example.com', password: 'password123' });
    userToken = loginRes.body.access_token;
    
    const db = getDb();
    await db.collection<Product>('ecommerce').insertOne({
        id: 201, title: 'Wishlist Item', price: 50, stock: 5, category: 'books', brand: 'Brand', description: 'desc', thumbnail: 'thumb.jpg', images: ['img.jpg']
    });
  });

  it('should add a product to the wishlist', async () => {
    const res = await request(app)
      .post('/wishlist/add')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ product_id: 201 });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Product added to wishlist');
  });

  it('should retrieve the user\'s wishlist', async () => {
    await request(app).post('/wishlist/add').set('Authorization', `Bearer ${userToken}`).send({ product_id: 201 });

    const res = await request(app)
      .get('/wishlist')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].id).toBe(201);
  });

  it('should remove a product from the wishlist', async () => {
    await request(app).post('/wishlist/add').set('Authorization', `Bearer ${userToken}`).send({ product_id: 201 });

    const removeRes = await request(app)
      .post('/wishlist/remove')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ product_id: 201 });
      
    expect(removeRes.statusCode).toEqual(200);

    const getRes = await request(app).get('/wishlist').set('Authorization', `Bearer ${userToken}`);
    expect(getRes.body.items.length).toBe(0);
  });
});