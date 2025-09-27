import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

// db/mongo se functions import karein
import { initMongo, getDb } from '../db/mongo';

// Asli functions ko mock (nakal) karein
jest.mock('../db/mongo', () => ({
  initMongo: jest.fn(),
  getDb: jest.fn(),
}));

let mongod: MongoMemoryServer;
let client: MongoClient;

// Saare tests se pehle ek baar
beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  
  // Ab initMongo ko mock karke in-memory DB se connect karein
  (initMongo as jest.Mock).mockImplementation(async () => {
    // isConnected() check hata diya gaya hai
    client = new MongoClient(uri); // useNewUrlParser options hata diye gaye hain
    await client.connect();
    const db = client.db('test-db');
    (getDb as jest.Mock).mockReturnValue(db);
  });

  // initMongo ko call karein
  await initMongo();
});

// Har ek test ke baad
afterEach(async () => {
  const db = getDb();
  if (db) {
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  }
});

// Sab kuch khatm hone par
afterAll(async () => {
  if (client) {
    await client.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});