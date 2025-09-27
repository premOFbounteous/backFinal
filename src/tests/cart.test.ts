// import request from 'supertest';
// import express from 'express';
// import cartRouter from '../routes/cart';
// import userRouter from '../routes/users';
// import { Product, UserDoc, Address } from '../models/types';
// import { getDb } from '../db/mongo';

// const app = express();
// app.use(express.json());
// app.use('/cart', cartRouter);
// app.use('/users', userRouter);

// describe('Cart Routes', () => {
//   let userToken: string;
//   let userId: string;
//   let testAddress: Address;

//   beforeEach(async () => {
//     const userRes = await request(app).post('/users/register').send({
//       username: 'cartuser',
//       email: 'cart@example.com',
//       password: 'password123',
//       DOB: '2000-01-01',
//       address: { street: '123 Cart St', city: 'Cart City', state: 'TS', postalCode: '54321', country: 'India' }
//     });
//     userId = userRes.body.user_id;

//     const loginRes = await request(app).post('/users/login').send({
//       email: 'cart@example.com',
//       password: 'password123',
//     });
//     userToken = loginRes.body.access_token;

//     const db = getDb();
//     const user = await db.collection<UserDoc>('users').findOne({ user_id: userId });
//     expect(user).not.toBeNull(); // ✅ TS now knows user exists
//     testAddress = user!.addresses[0];

//     await db.collection<Product>('ecommerce').insertMany([
//       {
//         id: 101,
//         title: 'Test Book',
//         price: 20,
//         stock: 10,
//         category: 'books',
//         brand: 'Brand',
//         description: 'desc',
//         thumbnail: 'thumb.jpg',
//         images: ['img.jpg'],
//       },
//       {
//         id: 102,
//         title: 'Test Pen',
//         price: 5,
//         stock: 0,
//         category: 'stationery',
//         brand: 'Brand',
//         description: 'desc',
//         thumbnail: 'thumb.jpg',
//         images: ['img.jpg'],
//       },
//     ]);
//   });

//   it('should add an item to the cart', async () => {
//     const res = await request(app)
//       .post('/cart/add')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101, quantity: 2 });

//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('message', 'Item added to cart');

//     const db = getDb();
//     const cart = await db.collection('carts').findOne({ user_id: userId });
//     expect(cart).not.toBeNull();
//     expect(cart!.items.length).toBe(1);
//     expect(cart!.items[0].quantity).toBe(2);
//   });

//   it('should not add an out-of-stock item to the cart', async () => {
//     const res = await request(app)
//       .post('/cart/add')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 102, quantity: 1 });

//     expect(res.statusCode).toEqual(400);
//     expect(res.body).toHaveProperty('detail', 'Only 0 items left in stock');
//   });

//   it('should update the quantity of an item in the cart', async () => {
//     await request(app)
//       .post('/cart/add')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101, quantity: 1 });

//     const res = await request(app)
//       .post('/cart/update_quantity')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101, quantity: 5 });

//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('message', 'Cart quantity updated');

//     const db = getDb();
//     const cart = await db.collection('carts').findOne({ user_id: userId });
//     expect(cart).not.toBeNull();
//     expect(cart!.items[0].quantity).toBe(5);
//   });

//   it('should remove an item from the cart', async () => {
//     await request(app)
//       .post('/cart/add')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101, quantity: 1 });

//     const res = await request(app)
//       .post('/cart/remove')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101 });

//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('message', 'Item removed from cart');

//     const db = getDb();
//     const cart = await db.collection('carts').findOne({ user_id: userId });
//     expect(cart).not.toBeNull();
//     expect(cart!.items.length).toBe(0);
//   });

//   it('should create an order and return a Stripe URL on checkout', async () => {
//     await request(app)
//       .post('/cart/add')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ product_id: 101, quantity: 1 });

//     const res = await request(app)
//       .post('/cart/checkout')
//       .set('Authorization', `Bearer ${userToken}`)
//       .send({ addressId: testAddress._id.toString() });

//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('url');
//     expect(res.body.url).toContain('https://checkout.stripe.com');
//   });
// });


import request from 'supertest';
import express from 'express';
import cartRouter, { stripeWebhookHandler } from '../routes/cart';
import { getDb } from '../db/mongo';
import { Cart, Product, UserDoc, OrderDoc } from '../models/types';
import Stripe from 'stripe';

jest.mock('../middleware/auth', () => ({
  authMiddleware: (req: any, _res: any, next: any) => {
    req.user = { user_id: 'user123' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/cart', cartRouter);

describe('Cart Routes', () => {
  beforeEach(async () => {
    const db = getDb();
    await db.collection<Cart>('carts').deleteMany({});
    await db.collection<Product>('ecommerce').deleteMany({});
    await db.collection<UserDoc>('users').deleteMany({});
    await db.collection<OrderDoc>('orders').deleteMany({});
  });

  it('should reject invalid quantity in /add (422)', async () => {
    const res = await request(app)
      .post('/cart/add')
      .send({ product_id: 1, quantity: 0 });
    expect(res.status).toBe(422);
  });

  it('should reject when product not found in /add', async () => {
    const res = await request(app)
      .post('/cart/add')
      .send({ product_id: 1, quantity: 1 });
    expect(res.status).toBe(404);
  });

  it('should reject when stock insufficient in /add', async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').insertOne({ id: 1, stock: 0, price: 10, title: 'Test' } as Product);
    const res = await request(app)
      .post('/cart/add')
      .send({ product_id: 1, quantity: 5 });
    expect(res.status).toBe(400);
  });

  it('should create cart and add item successfully', async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').insertOne({ id: 1, stock: 5, price: 10, title: 'Test' } as Product);
    const res = await request(app)
      .post('/cart/add')
      .send({ product_id: 1, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Item added to cart');
  });

  it('should return empty items if cart does not exist', async () => {
    const res = await request(app).get('/cart');
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('should update quantity in cart', async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').insertOne({ id: 1, stock: 10, price: 10, title: 'Test' } as Product);
    await db.collection<Cart>('carts').insertOne({ user_id: 'user123', items: [{ product_id: 1, quantity: 1 }] });
    const res = await request(app)
      .post('/cart/update_quantity')
      .send({ product_id: 1, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Cart quantity updated');
  });

  it('should 404 when updating quantity of non-existent item', async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').insertOne({ id: 1, stock: 10, price: 10, title: 'Test' } as Product);
    const res = await request(app)
      .post('/cart/update_quantity')
      .send({ product_id: 1, quantity: 3 });
    expect(res.status).toBe(404);
  });

  it('should remove item from cart', async () => {
    const db = getDb();
    await db.collection<Cart>('carts').insertOne({ user_id: 'user123', items: [{ product_id: 1, quantity: 1 }] });
    const res = await request(app)
      .post('/cart/remove')
      .send({ product_id: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Item removed from cart');
  });

  it('should reject invalid product_id in /remove', async () => {
    const res = await request(app)
      .post('/cart/remove')
      .send({ product_id: 'abc' });
    expect(res.status).toBe(422);
  });

  it('should fail checkout when addressId missing', async () => {
    const res = await request(app).post('/cart/checkout').send({});
    expect(res.status).toBe(422);
  });

  it('should fail checkout when user not found', async () => {
    const res = await request(app).post('/cart/checkout').send({ addressId: 'someid' });
    expect(res.status).toBe(404);
  });

  it('should hit stripeWebhookHandler with missing signature', async () => {
    const req: any = { headers: {}, body: {} };
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await stripeWebhookHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should hit stripeWebhookHandler with invalid signature', async () => {
    jest.spyOn(Stripe.prototype.webhooks, 'constructEvent').mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const req: any = { headers: { 'stripe-signature': 'bad' }, body: {} };
    const res: any = { status: jest.fn().mockReturnThis(), send: jest.fn() };
    await stripeWebhookHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
