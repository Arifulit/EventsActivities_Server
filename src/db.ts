import mongoose from 'mongoose';
import { config } from './config/env';

let connectionAttempts = 0;
const maxRetries = 3;

export const connectDB = async (): Promise<void> => {
  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('URI (masked):', config.mongodbUri?.replace(/(:)(.+?)(@)/, '$1***$3'));
    
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    connectionAttempts = 0; // Reset on success
    
    // Handle connection events
    mongoose.connection.on('reconnect', () => {
      console.log('🔄 MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error: any) {
    console.error('❌ Database connection failed:', error?.message || error);
    console.error('Ensure MONGODB_URI is set in Vercel env vars and Atlas allows your IP');
    
    // Don't exit immediately on serverless - allow retries
    if (process.env.VERCEL) {
      console.warn('⚠️ Running on Vercel - connection will retry on next request');
      return;
    }
    
    process.exit(1);
  }
};

export default connectDB;