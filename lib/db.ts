import "server-only";

import mongoose from "mongoose";

import { env } from "@/lib/env";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};

global.mongooseCache = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(env.MONGODB_URI_MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      bufferCommands: false,
      serverSelectionTimeoutMS: env.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    const message =
      error instanceof Error && error.message
        ? error.message
        : "MongoDB connection failed";
    const sanitized = new Error(message);
    throw sanitized;
  }

  return cached.conn;
}

export default dbConnect;