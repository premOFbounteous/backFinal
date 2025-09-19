import { MongoClient, Db } from "mongodb";
import { MONGO_URI, DB_NAME } from "../config/env";

let db: Db;

export async function initMongo(): Promise<void> {
  const client = new MongoClient(MONGO_URI, { ignoreUndefined: true });
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[Mongo] Connected to ${MONGO_URI}/${DB_NAME}`);
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB not initialized");
  return db;
}
