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
  // Set CORS headers FIRST - before anything else
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://events-activities-client-kappa.vercel.app',
    'https://events-activities-client-et8q.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  // Check if origin is allowed (normalize by removing trailing slash)
  const normalizedOrigin = origin.replace(/\/$/, '');
  const isAllowed = allowedOrigins.some(allowed => 
    normalizedOrigin === allowed.replace(/\/$/, '')
  );

  // ALWAYS set CORS headers for allowed origins
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // No origin (Postman, mobile apps, etc.)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  // Set common CORS headers for all requests
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin,Access-Control-Request-Headers,Access-Control-Request-Method');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight OPTIONS request - MUST return immediately
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Connect to DB and handle actual request
  await ensureDb();
  return app(req as any, res as any);
}
