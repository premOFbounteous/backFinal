import request from 'supertest';
import express from 'express';
import ordersRouter from '../routes/orders';
import userRouter from '../routes/users';
import { OrderDoc } from '../models/types';
import { getDb } from '../db/mongo';
import { ObjectId } from 'mongodb';

const app = express();
app.use(express.json());
app.use('/orders', ordersRouter);
app.use('/users', userRouter);

describe('Order Routes', () => {
  let userToken: string;
  let userId: string;

  beforeEach(async () => {
    // User Register karein
    const userRes = await request(app).post('/users/register').send({
        username: 'orderuser', email: 'order@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
    });
    userId = userRes.body.user_id;

    // Login karke token lein
    const loginRes = await request(app).post('/users/login').send({ email: 'order@example.com', password: 'password123' });
    userToken = loginRes.body.access_token;
    
    // Database mein ek order daalein
    const db = getDb();
    await db.collection<OrderDoc>('orders').insertOne({
        _id: new ObjectId(),
        user_id: userId,
        items: [{ product_id: 1, title: 'Test Order Item', price: 10, quantity: 1, thumbnail: 'order.jpg' }],
        total: 10,
        status: 'paid',
        createdAt: new Date(),
        shippingAddress: { _id: new ObjectId(), street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country', isDefault: true }
    });
  });

  it('should fetch the order history for the logged-in user', async () => {
    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('count', 1);
    expect(res.body.orders[0].user_id).toBe(userId);
    expect(res.body.orders[0].items[0].title).toBe('Test Order Item');
  });

  it('should return an empty array if the user has no orders', async () => {
      // Ek naya user banayein jiska koi order nahi hai
      await request(app).post('/users/register').send({
        username: 'noorderuser', email: 'noorder@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
    });
    const loginRes = await request(app).post('/users/login').send({ email: 'noorder@example.com', password: 'password123' });
    const noOrderToken = loginRes.body.access_token;

    const res = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${noOrderToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('count', 0);
    expect(res.body.orders.length).toBe(0);
  });
});