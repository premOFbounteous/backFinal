// // import request from 'supertest';
// // import express from 'express';
// // import userRouter from '../routes/users';
// // import { UserDoc } from '../models/types';
// // import { getDb } from '../db/mongo';

// // const app = express();
// // app.use(express.json());
// // app.use('/users', userRouter);

// // describe('User Routes', () => {
// //   it('should register a new user', async () => {
// //     const res = await request(app)
// //       .post('/users/register')
// //       .send({
// //         username: 'testuser',
// //         email: 'test@example.com',
// //         password: 'password123',
// //         DOB: '2000-01-01',
// //         address: { street: '123 Test St', city: 'Test City', state: 'TS', postalCode: '12345', country: 'India' }
// //       });
// //     expect(res.statusCode).toEqual(201);
// //     expect(res.body).toHaveProperty('message', 'User registered successfully');
// //   });

// //   it('should log in a user and return tokens', async () => {
// //     // Pehle user register karein
// //     await request(app).post('/users/register').send({
// //         username: 'loginuser', email: 'login@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
// //     });

// //     const res = await request(app)
// //       .post('/users/login')
// //       .send({ email: 'login@example.com', password: 'password123' });

// //     expect(res.statusCode).toEqual(200);
// //     expect(res.body).toHaveProperty('access_token');
// //     expect(res.body).toHaveProperty('refresh_token');
// //   });

// //   it('should fetch the user profile', async () => {
// //     await request(app).post('/users/register').send({
// //         username: 'profileuser', email: 'profile@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
// //     });
// //     const loginRes = await request(app).post('/users/login').send({ email: 'profile@example.com', password: 'password123' });
// //     const token = loginRes.body.access_token;
    
// //     const profileRes = await request(app)
// //       .get('/users/profile')
// //       .set('Authorization', `Bearer ${token}`);
      
// //     expect(profileRes.statusCode).toEqual(200);
// //     expect(profileRes.body.email).toBe('profile@example.com');
// //     expect(profileRes.body).not.toHaveProperty('password');
// //   });
// // });

// import request from 'supertest';
// import express from 'express';
// import userRouter from '../routes/users';
// import { UserDoc, Address } from '../models/types';
// import { getDb } from '../db/mongo';
// import { ObjectId } from 'mongodb';

// const app = express();
// app.use(express.json());
// app.use('/users', userRouter);

// describe('User Routes', () => {
//   // Happy Path Tests
//   it('should register a new user successfully', async () => {
//     const res = await request(app)
//       .post('/users/register')
//       .send({
//         username: 'testuser',
//         email: 'test@example.com',
//         password: 'password123',
//         DOB: '2000-01-01',
//         address: { street: '123 Test St', city: 'Test City', state: 'TS', postalCode: '12345', country: 'India' }
//       });
//     expect(res.statusCode).toEqual(201);
//     expect(res.body).toHaveProperty('message', 'User registered successfully');
//   });

//   it('should log in a registered user and return tokens', async () => {
//     await request(app).post('/users/register').send({
//         username: 'loginuser', email: 'login@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
//     });
//     const res = await request(app).post('/users/login').send({ email: 'login@example.com', password: 'password123' });
//     expect(res.statusCode).toEqual(200);
//     expect(res.body).toHaveProperty('access_token');
//     expect(res.body).toHaveProperty('refresh_token');
//   });

//   it('should fetch the user profile with a valid token', async () => {
//     await request(app).post('/users/register').send({
//         username: 'profileuser', email: 'profile@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
//     });
//     const loginRes = await request(app).post('/users/login').send({ email: 'profile@example.com', password: 'password123' });
//     const token = loginRes.body.access_token;
    
//     const profileRes = await request(app).get('/users/profile').set('Authorization', `Bearer ${token}`);
//     expect(profileRes.statusCode).toEqual(200);
//     expect(profileRes.body.email).toBe('profile@example.com');
//     expect(profileRes.body).not.toHaveProperty('password');
//   });

//   // Sad Path / Error Case Tests
//   it('should return 422 if registration data is incomplete', async () => {
//     const res = await request(app).post('/users/register').send({ username: 'testuser' });
//     expect(res.statusCode).toEqual(422);
//   });

//   it('should return 400 for duplicate email on registration', async () => {
//     await request(app).post('/users/register').send({
//         username: 'user1', email: 'dup@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
//     });
//     const res = await request(app).post('/users/register').send({
//         username: 'user2', email: 'dup@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
//     });
//     expect(res.statusCode).toEqual(400);
//   });

//   it('should return 401 for incorrect login password', async () => {
//     await request(app).post('/users/register').send({
//         username: 'loginfail', email: 'loginfail@example.com', password: 'password123', DOB: '2000-01-01', address: { street: '123', city: 'city', state: 'state', postalCode: '123', country: 'country' }
//     });
//     const res = await request(app).post('/users/login').send({ email: 'loginfail@example.com', password: 'wrongpassword' });
//     expect(res.statusCode).toEqual(401);
//   });

//   it('should return 401 for profile access without a token', async () => {
//     const res = await request(app).get('/users/profile');
//     expect(res.statusCode).toEqual(401);
//   });

//   it('should return 401 for profile access with an invalid token', async () => {
//     const res = await request(app).get('/users/profile').set('Authorization', 'Bearer invalidtoken');
//     expect(res.statusCode).toEqual(401);
//   });
// });


import request from "supertest";
import express from "express";
import userRouter from "../routes/users";
import { getDb } from "../db/mongo";
import { UserDoc } from "../models/types";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const app = express();
app.use(express.json());
app.use("/users", userRouter);

describe("Users Routes", () => {
  let db: ReturnType<typeof getDb>;
  let userId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeEach(async () => {
    db = getDb();
    await db.collection("users").deleteMany({});
  });

  it("should register a new user successfully", async () => {
    const res = await request(app).post("/users/register").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123 Test St",
        city: "TestCity",
        state: "TS",
        postalCode: "12345",
        country: "India",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty("user_id");

    userId = res.body.user_id;
  });

  it("should fail to register with missing fields", async () => {
    const res = await request(app).post("/users/register").send({
      email: "no-username@example.com",
    });
    expect(res.statusCode).toBe(422);
    expect(res.body.detail).toMatch(/required/i);
  });

  it("should not register with duplicate email", async () => {
    await db.collection<UserDoc>("users").insertOne({
      username: "dupuser",
      email: "dup@example.com",
      password: bcrypt.hashSync("password123", 10),
      user_id: "abc",
      DOB: new Date(),
      addresses: [],
      created_at: new Date(),
    });

    const res = await request(app).post("/users/register").send({
      username: "dupuser2",
      email: "dup@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123",
        city: "City",
        state: "ST",
        postalCode: "12345",
        country: "India",
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.detail).toMatch(/Email already registered/i);
  });

  it("should login and return tokens", async () => {
    await request(app).post("/users/register").send({
      username: "loginuser",
      email: "login@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123",
        city: "City",
        state: "ST",
        postalCode: "12345",
        country: "India",
      },
    });

    const res = await request(app).post("/users/login").send({
      email: "login@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("access_token");
    expect(res.body).toHaveProperty("refresh_token");
    accessToken = res.body.access_token;
    refreshToken = res.body.refresh_token;
  });

  it("should not login with wrong password", async () => {
    await request(app).post("/users/register").send({
      username: "wrongpass",
      email: "wrong@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123",
        city: "City",
        state: "ST",
        postalCode: "12345",
        country: "India",
      },
    });

    const res = await request(app).post("/users/login").send({
      email: "wrong@example.com",
      password: "badpassword",
    });

    expect(res.statusCode).toBe(401);
  });

  it("should refresh token successfully", async () => {
    // login to get tokens first
    await request(app).post("/users/register").send({
      username: "refreshuser",
      email: "refresh@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123",
        city: "City",
        state: "ST",
        postalCode: "12345",
        country: "India",
      },
    });

    const loginRes = await request(app).post("/users/login").send({
      email: "refresh@example.com",
      password: "password123",
    });

    const refresh = loginRes.body.refresh_token;

    const res = await request(app).post("/users/refresh").send({
      refresh_token: refresh,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("access_token");
  });

  it("should fail refresh with missing token", async () => {
    const res = await request(app).post("/users/refresh").send({});
    expect(res.statusCode).toBe(422);
  });

  describe("Address Management", () => {
    let authToken: string;
    let addressId: string;

    beforeEach(async () => {
      await request(app).post("/users/register").send({
        username: "addruser",
        email: "addr@example.com",
        password: "password123",
        DOB: "2000-01-01",
        address: {
          street: "123",
          city: "City",
          state: "ST",
          postalCode: "12345",
          country: "India",
        },
      });

      const loginRes = await request(app).post("/users/login").send({
        email: "addr@example.com",
        password: "password123",
      });
      authToken = loginRes.body.access_token;

      const getRes = await request(app)
        .get("/users/addresses")
        .set("Authorization", `Bearer ${authToken}`);

      addressId = getRes.body[0]._id;
    });

    it("should get all addresses", async () => {
      const res = await request(app)
        .get("/users/addresses")
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("should add a new address", async () => {
      const res = await request(app)
        .post("/users/addresses")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          street: "456 New St",
          city: "NewCity",
          state: "NC",
          postalCode: "67890",
          country: "India",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.address.street).toBe("456 New St");
    });

    it("should update an address", async () => {
      const res = await request(app)
        .put(`/users/addresses/${addressId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          street: "Updated St",
          city: "Updated City",
          state: "US",
          postalCode: "11111",
          country: "India",
        });

      expect(res.statusCode).toBe(200);
    });

    it("should delete an address", async () => {
      const res = await request(app)
        .delete(`/users/addresses/${addressId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  it("should return user profile", async () => {
    await request(app).post("/users/register").send({
      username: "profileuser",
      email: "profile@example.com",
      password: "password123",
      DOB: "2000-01-01",
      address: {
        street: "123",
        city: "City",
        state: "ST",
        postalCode: "12345",
        country: "India",
      },
    });

    const loginRes = await request(app).post("/users/login").send({
      email: "profile@example.com",
      password: "password123",
    });

    const res = await request(app)
      .get("/users/profile")
      .set("Authorization", `Bearer ${loginRes.body.access_token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("username", "profileuser");
  });
});
