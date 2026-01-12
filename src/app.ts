import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import { errorHandler } from './middleware/error.middleware';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import eventRoutes from './routes/event.routes';
import bookingRoutes from './routes/booking.routes';
import reviewRoutes from './routes/review.routes';
import adminRoutes from './routes/admin.routes';
import paymentRoutes from './routes/payment.routes';
import hostRoutes from './routes/host.routes';

const app: Application = express();

// CORS configuration
const allowedOrigins = [
  config.frontendUrl,
  'https://events-activities-client-kappa.vercel.app',
  'https://events-activities-client-et8q.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Remove trailing slash for comparison
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === cleanOrigin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-JSON', 'X-Total-Count'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Explicit OPTIONS handler for preflight
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const cleanOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o => o.replace(/\/$/, '') === cleanOrigin);
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Events & Activities Platform API',
    version: '1.0.0'
  });
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/users', userRoutes); // Alias for clients calling /users/*
app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes); // Alias for clients calling /events/*
app.use('/api/bookings', bookingRoutes);
app.use('/bookings', bookingRoutes); // Alias for clients calling /bookings/*
app.use('/api/booking', bookingRoutes); // Alias for singular form /api/booking/*
app.use('/booking', bookingRoutes); // Alias for singular form /booking/*
app.use('/api/reviews', reviewRoutes);
app.use('/reviews', reviewRoutes); // Alias for clients calling /reviews/*
app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes); // Alias for clients calling /admin/*
app.use('/api/payments', paymentRoutes);
app.use('/payments', paymentRoutes); // Alias for clients calling /payments/*
app.use('/api/hosts', hostRoutes);
app.use('/hosts', hostRoutes); // Alias for clients calling /hosts/*

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use(errorHandler);

export default app;