import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';
import { connectDB } from '../src/db';
import { config } from '../src/config/env';

let dbPromise: Promise<void> | null = null;

async function ensureDb() {
  if (!dbPromise) {
    dbPromise = connectDB();
  }
  try {
    await dbPromise;
  } catch (err) {
    console.error('DB connection failed in serverless function:', err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers explicitly for Vercel
  const origin = req.headers.origin;
  const allowedOrigins = [
    config.frontendUrl,
    'https://events-activities-client-et8q.vercel.app',
    'https://events-activities-client-kappa.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  // Normalize origins (remove trailing slashes for comparison)
  const cleanOrigin = origin?.replace(/\/$/, '') || '';
  const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === cleanOrigin);

  if (origin && isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  await ensureDb();
  return app(req as any, res as any);
}
