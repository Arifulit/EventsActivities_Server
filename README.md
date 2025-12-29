# Events & Activities Platform - Backend API

Complete backend API for Events & Activities Platform built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Features

- ✅ User Authentication (JWT)
- ✅ Role-based Access Control (User, Host, Admin)
- ✅ User Profile Management
- ✅ Event CRUD Operations
- ✅ Event Search & Filtering
- ✅ Join/Leave Events
- ✅ Payment Integration (Stripe)
- ✅ Review & Rating System
- ✅ Image Upload (Cloudinary)
- ✅ Admin Dashboard

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url>

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Fill in your environment variables

# Run in development
npm run dev

# Build for production
npm run build

# Run production
npm start
```

## 🔧 Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
STRIPE_SECRET_KEY=your_stripe_key
FRONTEND_URL=http://localhost:3000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (Protected)

### Users
- `GET /api/users` - Get all users (Protected)
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update profile (Protected)

### Events
- `GET /api/events` - Get all events (with filters)
- `GET /api/events/:id` - Get event details
- `POST /api/events` - Create event (Host/Admin)
- `PUT /api/events/:id` - Update event (Host/Admin)
- `DELETE /api/events/:id` - Delete event (Host/Admin)
- `POST /api/events/:id/join` - Join event (Protected)
- `DELETE /api/events/:id/leave` - Leave event (Protected)
- `GET /api/events/my-events` - Get my joined events (Protected)
- `GET /api/events/hosted-events` - Get hosted events (Host)

### Bookings
- `POST /api/bookings/create-intent` - Create payment intent (Protected)
- `POST /api/bookings/confirm` - Confirm payment (Protected)
- `GET /api/bookings/my-bookings` - Get my bookings (Protected)

### Reviews
- `POST /api/reviews` - Create review (Protected)
- `GET /api/reviews/host/:hostId` - Get host reviews
- `GET /api/reviews/event/:eventId` - Get event reviews

### Admin
- `GET /api/admin/stats` - Get dashboard stats (Admin)
- `GET /api/admin/users` - Get all users (Admin)
- `PUT /api/admin/users/:userId/role` - Update user role (Admin)
- `DELETE /api/admin/users/:userId` - Delete user (Admin)
- `GET /api/admin/events` - Get all events (Admin)
- `PUT /api/admin/events/:eventId/status` - Update event status (Admin)
- `DELETE /api/admin/events/:eventId` - Delete event (Admin)

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   ├── server.ts       # Server entry point
│   └── db.ts           # Database connection
├── dist/               # Compiled JavaScript
├── .env                # Environment variables
├── package.json
└── tsconfig.json
```

## 🛠️ Technologies Used

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Cloudinary** - Image hosting
- **Stripe** - Payment processing
- **Multer** - File upload

## 📝 License

MIT