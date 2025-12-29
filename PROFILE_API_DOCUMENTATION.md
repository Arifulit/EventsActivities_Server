# Profile Management API Documentation

## Overview
Complete profile management system with create, edit, view, and discovery features.

---

## Authentication Endpoints

### 1. Get Current User Profile
**GET** `/api/auth/me`
- **Auth Required:** Yes
- **Description:** Get authenticated user's complete profile
- **Response:** User object with all profile fields

### 2. Update User Profile
**PUT** `/api/auth/profile`
- **Auth Required:** Yes
- **Description:** Update authenticated user's profile
- **Request Body:**
```json
{
  "fullName": "John Doe",
  "bio": "Music enthusiast and event organizer",
  "interests": ["Music", "Sports", "Gaming", "Art"],
  "location": {
    "city": "New York",
    "area": "Manhattan",
    "coordinates": {
      "lat": 40.7128,
      "lng": -74.0060
    }
  },
  "profileImage": "https://cloudinary-url.com/image.jpg"
}
```
- **Validation:**
  - fullName: 2-100 characters
  - bio: max 500 characters
  - interests: array of strings (1-50 chars each)
  - location.city: 2-100 characters
  - location.area: max 100 characters
  - coordinates.lat: -90 to 90
  - coordinates.lng: -180 to 180

### 3. Upload Profile Image
**POST** `/api/auth/upload-profile-image`
- **Auth Required:** Yes
- **Content-Type:** multipart/form-data
- **Description:** Upload profile image to Cloudinary
- **Request Body:**
  - Field name: `profileImage`
  - File types: jpeg, jpg, png, gif, webp
  - Max size: 5MB
- **Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "profileImage": "https://cloudinary-url.com/profile-images/xyz.jpg",
    "user": { /* updated user object */ }
  }
}
```

### 4. Get Profile Completeness
**GET** `/api/auth/profile/completeness`
- **Auth Required:** Yes
- **Description:** Check profile completion percentage
- **Response:**
```json
{
  "success": true,
  "data": {
    "completeness": 85,
    "missingFields": ["bio"],
    "isComplete": false
  }
}
```
- **Scoring:**
  - Full Name: 20%
  - Email: 20%
  - Profile Image: 20%
  - Bio: 15%
  - Interests: 15%
  - Location: 10%

---

## User Endpoints

### 5. Get Public User Profile
**GET** `/api/users/:id/public`
- **Auth Required:** No
- **Description:** View any user's public profile (for discovering compatible users)
- **Response:**
```json
{
  "success": true,
  "data": {
    "_id": "userId",
    "fullName": "John Doe",
    "profileImage": "https://...",
    "bio": "Music enthusiast...",
    "interests": ["Music", "Sports"],
    "location": {
      "city": "New York",
      "area": "Manhattan"
    },
    "stats": {
      "totalHostedEvents": 12,
      "memberSince": "2024-01-15T00:00:00.000Z",
      "isVerified": true,
      "rating": 4.5,
      "totalReviews": 45
    },
    "hostedEvents": [ /* published events only */ ]
  }
}
```

### 6. Discover Users
**GET** `/api/users/discover`
- **Auth Required:** No
- **Description:** Search and discover users by interests and location
- **Query Parameters:**
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 12)
  - `search` (optional): Search by name
  - `city` (optional): Filter by city
  - `interests` (optional): Comma-separated interests (e.g., "Music,Sports,Art")
- **Example:**
```
GET /api/users/discover?city=New%20York&interests=Music,Gaming&page=1&limit=12
```
- **Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "userId",
      "fullName": "John Doe",
      "profileImage": "https://...",
      "bio": "Music lover...",
      "interests": ["Music", "Gaming"],
      "location": {
        "city": "New York",
        "area": "Manhattan"
      },
      "averageRating": 4.5,
      "totalReviews": 20,
      "isVerified": true,
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 58,
    "itemsPerPage": 12,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 7. Get User by ID (Authenticated)
**GET** `/api/users/:id`
- **Auth Required:** Yes
- **Description:** Get detailed user profile (own profile or admin access)
- **Authorization:** User can only access their own profile unless they're an admin
- **Response:** Full user object including private information

### 8. Update User (Admin or Self)
**PUT** `/api/users/:id`
- **Auth Required:** Yes
- **Description:** Update user profile (users can update their own, admins can update any)
- **Request Body:** Same as profile update endpoint
- **Additional:** Admins can change user roles

### 9. Upload User Profile Image
**POST** `/api/users/:id/upload-profile-image`
- **Auth Required:** Yes
- **Content-Type:** multipart/form-data
- **Description:** Upload profile image for a specific user
- **Authorization:** Users can only upload their own image unless they're an admin

### 10. Get Top Hosts
**GET** `/api/users/top-hosts`
- **Auth Required:** No
- **Description:** Get top-rated event hosts
- **Query Parameters:**
  - `limit` (optional): Number of hosts (default: 10)

---

## Profile Fields

### Required Fields (for registration)
- **fullName**: User's full name
- **email**: User's email address
- **password**: User's password
- **location.city**: User's city

### Optional Profile Fields
- **profileImage**: Cloudinary URL of profile picture
- **bio**: Short description (max 500 chars)
- **interests**: Array of interest tags
- **location.area**: Specific area/neighborhood
- **location.coordinates**: GPS coordinates {lat, lng}

---

## Interest Examples
Users can add interests from various categories:
- **Arts:** Art, Photography, Drawing, Painting
- **Music:** Music, Concerts, DJ, Singing
- **Sports:** Sports, Football, Basketball, Tennis, Yoga, Fitness
- **Gaming:** Gaming, Video Games, Board Games
- **Social:** Networking, Meetups, Community Events
- **Food:** Cooking, Food Tasting, Restaurants
- **Tech:** Technology, Coding, AI, Startups
- **Outdoor:** Hiking, Camping, Nature, Travel

---

## Use Cases

### 1. Complete Profile Setup
```javascript
// Step 1: Register
POST /api/auth/register
{ email, password, fullName, location: { city } }

// Step 2: Upload profile image
POST /api/auth/upload-profile-image
FormData: { profileImage: file }

// Step 3: Complete profile
PUT /api/auth/profile
{ bio, interests, location: { city, area } }

// Step 4: Check completeness
GET /api/auth/profile/completeness
```

### 2. Discover Compatible Users
```javascript
// Find users with similar interests in your city
GET /api/users/discover?city=NewYork&interests=Music,Gaming

// Search for specific user
GET /api/users/discover?search=John

// View detailed public profile
GET /api/users/:id/public
```

### 3. Profile Editing
```javascript
// Update specific fields
PUT /api/auth/profile
{ interests: ["Music", "Sports", "Art"] }

// Upload new profile image
POST /api/auth/upload-profile-image
FormData: { profileImage: newFile }
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [ /* array of items */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 50,
    "itemsPerPage": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Security & Validation

### Authentication
- JWT tokens required for protected routes
- Tokens in Authorization header: `Bearer <token>`
- Refresh token mechanism available

### File Upload Security
- Only image files allowed (jpeg, jpg, png, gif, webp)
- Maximum file size: 5MB
- Files stored in Cloudinary with unique paths
- Automatic image optimization

### Data Validation
- All inputs validated using express-validator
- XSS protection through input sanitization
- MongoDB query protection
- Field length restrictions enforced

### Privacy Controls
- Users can only edit their own profiles
- Admins have full access
- Public profiles show limited information
- Email and password never exposed in responses

---

## Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Authentication required
- **403**: Forbidden - Insufficient permissions
- **404**: Not Found - Resource doesn't exist
- **500**: Internal Server Error - Server issue

---

## Notes

1. **Profile Completeness**: Higher completion rates improve visibility in discovery
2. **Interests Matching**: Users with similar interests rank higher in discovery
3. **Verification**: Verified users have higher trust scores
4. **Location**: City-based filtering helps find local connections
5. **Images**: Always use Cloudinary URLs, automatic optimization applied
