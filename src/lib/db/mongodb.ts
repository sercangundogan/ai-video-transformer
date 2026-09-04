import "server-only";

import { MongoClient, type Db } from "mongodb";

import { getMongoEnv } from "@/lib/env.server";

declare global {
  // Reusable serverless / HMR connection cache across Next.js module reloads.
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const { MONGODB_URI } = getMongoEnv();

  if (!global.__mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI);
    global.__mongoClientPromise = client.connect();
  }

  return global.__mongoClientPromise;
}

/**
 * Returns the application database using a reusable MongoDB connection.
 * The client promise is cached on `globalThis` so Next.js hot reloads and
 * warm serverless isolates do not open a new connection on every call.
 */
export async function getDb(): Promise<Db> {
  const { MONGODB_DB_NAME } = getMongoEnv();
  const client = await getClientPromise();
  return client.db(MONGODB_DB_NAME);
}
