// // import request from 'supertest';
// // import express from 'express';
// // import productRouter from '../routes/products';
// // import { Product } from '../models/types';
// // import { getDb } from '../db/mongo';

// // const app = express();
// // app.use(express.json());
// // app.use('/products', productRouter);

// // describe('Public Product Routes', () => {
// //   beforeEach(async () => {
// //     const db = getDb();
// //     await db.collection<Product>('ecommerce').insertMany([
// //         { id: 1, title: 'Laptop', price: 1200, category: 'electronics', stock: 10, description: 'A laptop', brand: 'BrandA', thumbnail: 'a.jpg', images: ['a.jpg'] },
// //         { id: 2, title: 'Phone', price: 800, category: 'electronics', stock: 20, description: 'A phone', brand: 'BrandB', thumbnail: 'b.jpg', images: ['b.jpg'] },
// //         { id: 3, title: 'Shirt', price: 50, category: 'fashion', stock: 100, description: 'A shirt', brand: 'BrandC', thumbnail: 'c.jpg', images: ['c.jpg'] },
// //     ]);
// //   });

// //   it('should fetch a list of all products', async () => {
// //     const res = await request(app).get('/products');
// //     expect(res.statusCode).toEqual(200);
// //     expect(res.body.products.length).toBe(3);
// //   });

// //   it('should fetch products by category', async () => {
// //     const res = await request(app).get('/products?category=electronics');
// //     expect(res.statusCode).toEqual(200);
// //     expect(res.body.products.length).toBe(2);
// //     expect(res.body.products[0].category).toBe('electronics');
// //   });

// //   it('should fetch a single product by ID', async () => {
// //     const res = await request(app).get('/products/2');
// //     expect(res.statusCode).toEqual(200);
// //     expect(res.body.title).toBe('Phone');
// //   });

// //   it('should return 404 for a non-existent product', async () => {
// //     const res = await request(app).get('/products/99');
// //     expect(res.statusCode).toEqual(404);
// //   });
// // });


// import request from 'supertest';
// import express from 'express';
// import productRouter from '../routes/products';
// import { Product } from '../models/types';
// import { getDb } from '../db/mongo';

// const app = express();
// app.use(express.json());
// app.use('/products', productRouter);

// describe('Public Product Routes', () => {
//   beforeEach(async () => {
//     const db = getDb();
//     await db.collection<Product>('ecommerce').insertMany([
//         { id: 1, title: 'Laptop', price: 1200, category: 'electronics', stock: 10, description: 'A laptop', brand: 'BrandA', thumbnail: 'a.jpg', images: ['a.jpg'] },
//         { id: 2, title: 'Phone', price: 800, category: 'electronics', stock: 20, description: 'A phone', brand: 'BrandB', thumbnail: 'b.jpg', images: ['b.jpg'] },
//         { id: 3, title: 'Shirt', price: 50, category: 'fashion', stock: 100, description: 'A shirt', brand: 'BrandC', thumbnail: 'c.jpg', images: ['c.jpg'] },
//     ]);
//   });

//   it('should fetch a list of all products', async () => {
//     const res = await request(app).get('/products');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.products.length).toBe(3);
//   });

//   it('should fetch and sort products by price descending', async () => {
//     const res = await request(app).get('/products?sort=-price');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.products[0].title).toBe('Laptop');
//   });

//   it('should return 400 for an invalid sort field', async () => {
//     const res = await request(app).get('/products?sort=invalidfield');
//     expect(res.statusCode).toEqual(400);
//   });
  
//   it('should fetch products by category', async () => {
//     const res = await request(app).get('/products?category=electronics');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.products.length).toBe(2);
//   });

//   it('should fetch a single product by ID', async () => {
//     const res = await request(app).get('/products/2');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.title).toBe('Phone');
//   });
  
//   it('should return products based on search string', async () => {
//     const res = await request(app).get('/products/search?search_str=phone');
//     expect(res.statusCode).toEqual(200);
//     expect(res.body.products.length).toBe(1);
//     expect(res.body.products[0].title).toBe('Phone');
//   });

//   it('should return 422 if search string is missing', async () => {
//     const res = await request(app).get('/products/search');
//     expect(res.statusCode).toEqual(422);
//   });
// });

import request from 'supertest';
import express from 'express';
import productRouter from '../routes/products';
import { Product } from '../models/types';
import { getDb } from '../db/mongo';

// --- Mock GoogleGenAI so we can control voice-search response ---
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: { parts: [{ text: 'Laptop, Phone' }] },
            },
          ],
        }),
      },
    })),
  };
});

const app = express();
app.use(express.json());
app.use('/products', productRouter);

describe('Public Product Routes', () => {
  beforeEach(async () => {
    const db = getDb();
    await db.collection<Product>('ecommerce').deleteMany({});
    await db.collection<Product>('ecommerce').insertMany([
      { id: 1, title: 'Laptop', price: 1200, category: 'electronics', stock: 10, description: 'A laptop', brand: 'BrandA', thumbnail: 'a.jpg', images: ['a.jpg'] },
      { id: 2, title: 'Phone', price: 800, category: 'electronics', stock: 20, description: 'A phone', brand: 'BrandB', thumbnail: 'b.jpg', images: ['b.jpg'] },
      { id: 3, title: 'Shirt', price: 50, category: 'fashion', stock: 100, description: 'A shirt', brand: 'BrandC', thumbnail: 'c.jpg', images: ['c.jpg'] },
    ]);
  });

  it('should fetch a list of all products', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toEqual(200);
    expect(res.body.products.length).toBe(3);
  });

  it('should fetch and sort products by price descending', async () => {
    const res = await request(app).get('/products?sort=-price');
    expect(res.statusCode).toEqual(200);
    expect(res.body.products[0].title).toBe('Laptop');
  });

  it('should return 400 for an invalid sort field', async () => {
    const res = await request(app).get('/products?sort=invalidfield');
    expect(res.statusCode).toEqual(400);
  });

  it('should fetch products by category', async () => {
    const res = await request(app).get('/products?category=electronics');
    expect(res.statusCode).toEqual(200);
    expect(res.body.products.length).toBe(2);
  });

  it('should fetch a single product by ID', async () => {
    const res = await request(app).get('/products/2');
    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe('Phone');
  });

  it('should return 404 for non-numeric product id', async () => {
    const res = await request(app).get('/products/abc');
    expect(res.statusCode).toEqual(404);
  });

  it('should return 404 if product is not found', async () => {
    const res = await request(app).get('/products/999');
    expect(res.statusCode).toEqual(404);
  });

  it('should return products based on search string', async () => {
    const res = await request(app).get('/products/search?search_str=phone');
    expect(res.statusCode).toEqual(200);
    expect(res.body.products.length).toBe(1);
    expect(res.body.products[0].title).toBe('Phone');
  });

  it('should return 422 if search string is missing', async () => {
    const res = await request(app).get('/products/search');
    expect(res.statusCode).toEqual(422);
  });

  it('should handle voice-search and return matched products', async () => {
    const db = getDb();
    await db.collection('BOTdoc').deleteMany({});
    await db.collection('BOTdoc').insertMany([
      { id: 1, title: 'Laptop', brand: 'BrandA', category: 'electronics' },
      { id: 2, title: 'Phone', brand: 'BrandB', category: 'electronics' },
    ]);

    const res = await request(app).get('/products/voice-search?search_str=electronics');
    expect(res.statusCode).toEqual(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    expect(res.body.result).toContain('Laptop');
  });

  it('should return 422 on voice-search when search_str is empty', async () => {
    const res = await request(app).get('/products/voice-search');
    expect(res.statusCode).toEqual(422);
  });

  it('should handle voice-search with no matching titles', async () => {
    // Override mock to return empty string
    const { GoogleGenAI } = require('@google/genai');
    (GoogleGenAI as jest.Mock).mockImplementationOnce(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          candidates: [
            {
              content: { parts: [{ text: '' }] },
            },
          ],
        }),
      },
    }));

    const res = await request(app).get('/products/voice-search?search_str=xyz');
    expect(res.statusCode).toEqual(200);
    expect(res.body.result).toBe('No match found');
  });
});
