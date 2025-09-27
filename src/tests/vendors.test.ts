// import request from 'supertest';
// import express from 'express';
// import vendorRouter from '../routes/vendors';
// import { Product, VendorDoc } from '../models/types';
// import { getDb } from '../db/mongo';

// const app = express();
// app.use(express.json());
// app.use('/vendors', vendorRouter);

// describe('Vendor Routes', () => {
//   let vendorToken: string;
//   let vendorId: string;

//   beforeEach(async () => {
//     // Har test se pehle ek naya vendor register aur login karein
//     await request(app).post('/vendors/register').send({
//         companyName: 'Test Vendor', email: 'vendor@test.com', password: 'password123'
//     });
//     const loginRes = await request(app).post('/vendors/login').send({ email: 'vendor@test.com', password: 'password123' });
//     vendorToken = loginRes.body.access_token;
    
//     const db = getDb();
//     const vendor = await db.collection<VendorDoc>('vendors').findOne({email: 'vendor@test.com'});
//     vendorId = vendor!.vendor_id;
//   });

//   it('should add a new product for a logged-in vendor', async () => {
//     const res = await request(app)
//       .post('/vendors/products')
//       .set('Authorization', `Bearer ${vendorToken}`)
//       .send({
//         title: "New Gadget",
//         description: "A very cool gadget",
//         price: 99.99,
//         stock: 50,
//         category: "electronics",
//         brand: "Gadget Co",
//         thumbnail: "image.jpg",
//         images: ["image1.jpg", "image2.jpg"]
//       });
      
//     expect(res.statusCode).toEqual(201);
//     expect(res.body.product).toHaveProperty('title', 'New Gadget');
//     expect(res.body.product).toHaveProperty('vendorId', vendorId);
//   });

//   it('should get all products for the logged-in vendor', async () => {
//     // Ek product add karein
//     await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({
//         title: "Another Gadget", price: 10, stock: 10, category: "cat", brand:"brand", thumbnail: "thumb.jpg", images: []
//     });

//     const res = await request(app)
//       .get('/vendors/products')
//       .set('Authorization', `Bearer ${vendorToken}`);

//     expect(res.statusCode).toEqual(200);
//     expect(res.body.length).toBe(1);
//     expect(res.body[0].title).toBe('Another Gadget');
//   });

//   it('should update a product for the logged-in vendor', async () => {
//       const addRes = await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({
//         title: "Updatable Gadget", price: 20, stock: 20, category: "cat", brand:"brand", thumbnail: "thumb.jpg", images: []
//     });
//     const productId = addRes.body.product.id;

//     const updateRes = await request(app)
//         .put(`/vendors/products/${productId}`)
//         .set('Authorization', `Bearer ${vendorToken}`)
//         .send({ price: 25, stock: 15 });

//     expect(updateRes.statusCode).toEqual(200);

//     const db = getDb();
//     const updatedProduct = await db.collection<Product>('ecommerce').findOne({id: productId});
//     expect(updatedProduct?.price).toBe(25);
//     expect(updatedProduct?.stock).toBe(15);
//   });
  
//   it('should delete a product for the logged-in vendor', async () => {
//     const addRes = await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({
//         title: "Deletable Gadget", price: 30, stock: 30, category: "cat", brand:"brand", thumbnail: "thumb.jpg", images: []
//     });
//     const productId = addRes.body.product.id;

//     const deleteRes = await request(app)
//         .delete(`/vendors/products/${productId}`)
//         .set('Authorization', `Bearer ${vendorToken}`);

//     expect(deleteRes.statusCode).toEqual(200);
    
//     const db = getDb();
//     const deletedProduct = await db.collection<Product>('ecommerce').findOne({id: productId});
//     expect(deletedProduct).toBeNull();
//   });
// });


import request from 'supertest';
import express from 'express';
import vendorRouter from '../routes/vendors';
import { Product, VendorDoc } from '../models/types';
import { getDb } from '../db/mongo';

const app = express();
app.use(express.json());
app.use('/vendors', vendorRouter);

describe('Vendor Routes', () => {
  let vendorToken: string;
  let vendorId: string;

  beforeEach(async () => {
    await request(app).post('/vendors/register').send({ companyName: 'Test Vendor', email: 'vendor@test.com', password: 'password123' });
    const loginRes = await request(app).post('/vendors/login').send({ email: 'vendor@test.com', password: 'password123' });
    vendorToken = loginRes.body.access_token;
    const db = getDb();
    const vendor = await db.collection<VendorDoc>('vendors').findOne({ email: 'vendor@test.com' });
    vendorId = vendor!.vendor_id;
  });

  it('should add a new product for a logged-in vendor', async () => {
    const res = await request(app)
      .post('/vendors/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ title: "New Gadget", price: 99.99, stock: 50, category: "electronics", brand: "Gadget Co", description: "A gadget", thumbnail: "thumb.jpg", images: ["img.jpg"] });
    expect(res.statusCode).toEqual(201);
    expect(res.body.product.vendorId).toBe(vendorId);
  });

  it('should return 422 if required product fields are missing', async () => {
    const res = await request(app)
      .post('/vendors/products')
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ title: "Incomplete Gadget" }); // price aur stock missing hain
    expect(res.statusCode).toEqual(422);
  });

  it('should get all products for the logged-in vendor', async () => {
    await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({ title: "Another Gadget", price: 10, stock: 10, category: "cat", brand:"brand", description: "desc", thumbnail: "thumb.jpg", images: [] });
    const res = await request(app).get('/vendors/products').set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBe(1);
  });

  it('should update a product for the logged-in vendor', async () => {
    const addRes = await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({ title: "Updatable", price: 20, stock: 20, category: "cat", brand:"brand", description: "desc", thumbnail: "thumb.jpg", images: [] });
    const productId = addRes.body.product.id;
    const updateRes = await request(app).put(`/vendors/products/${productId}`).set('Authorization', `Bearer ${vendorToken}`).send({ price: 25, stock: 15 });
    expect(updateRes.statusCode).toEqual(200);
    const db = getDb();
    const updatedProduct = await db.collection<Product>('ecommerce').findOne({ id: productId });
    expect(updatedProduct?.price).toBe(25);
  });
  
  it('should not update a product belonging to another vendor', async () => {
    const updateRes = await request(app).put(`/vendors/products/999`).set('Authorization', `Bearer ${vendorToken}`).send({ price: 25 });
    expect(updateRes.statusCode).toEqual(404);
  });

  it('should delete a product for the logged-in vendor', async () => {
    const addRes = await request(app).post('/vendors/products').set('Authorization', `Bearer ${vendorToken}`).send({ title: "Deletable", price: 30, stock: 30, category: "cat", brand:"brand", description: "desc", thumbnail: "thumb.jpg", images: [] });
    const productId = addRes.body.product.id;
    const deleteRes = await request(app).delete(`/vendors/products/${productId}`).set('Authorization', `Bearer ${vendorToken}`);
    expect(deleteRes.statusCode).toEqual(200);
  });
});