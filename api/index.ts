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
  // Set CORS headers explicitly for Vercel
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://events-activities-client-et8q.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(204).end();
    return;
  }

  await ensureDb();
  return app(req as any, res as any);
}
