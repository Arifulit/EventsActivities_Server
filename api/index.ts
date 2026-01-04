import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { connectDB } from '../src/db';

let dbPromise: Promise<void> | null = null;

async function ensureDb() {
  if (!dbPromise) {
    dbPromise = connectDB();
  }
  try {
    await dbPromise;
  } catch (err) {
    console.error('DB connection failed in serverless function:', err);
    // Let the request still proceed; mongoose will buffer briefly
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDb();
  return app(req as any, res as any);
}
