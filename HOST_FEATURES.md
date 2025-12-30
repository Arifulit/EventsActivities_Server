# HOST Role Features

## Overview
Hosts are event creators and managers who can create events, manage bookings, view participants, and receive payments.

---

## 1. Create Events
**Endpoint:** `POST /api/events`
**Auth:** Required (HOST or ADMIN role)
**Body:**
```json
{
  "title": "Yoga Workshop",
  "description": "Morning yoga session",
  "type": "workshop",
  "category": "health",
  "date": "2025-01-15",
  "time": "08:00",
  "duration": 60,
  "location": {
    "venue": "Yoga Studio",
    "address": "123 Main St",
    "city": "Dhaka",
    "coordinates": { "lat": 23.8103, "lng": 90.4125 }
  },
  "maxParticipants": 20,
  "price": 50,
  "tags": ["yoga", "health", "morning"],
  "isPublic": true
}
```
**Response:** Event object with hostId set to current user

---

## 2. View & Manage Own Events
**Endpoint:** `GET /api/events/hosted-events`
**Auth:** Required
**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:** Paginated list of all events hosted by the logged-in user

---

## 3. View Event Participants
**Endpoint:** `GET /api/events/:eventId/participants`
**Auth:** Required (Only host or admin can access)
**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search by participant name or email

**Response:** 
```json
{
  "success": true,
  "data": [
    {
      "_id": "userId",
      "fullName": "John Doe",
      "email": "john@example.com",
      "profileImage": "url",
      "location": { "city": "Dhaka" },
      "isVerified": true
    }
  ],
  "message": "Event participants retrieved successfully",
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 5
  }
}
```

---

## 4. Update/Edit Events
**Endpoint:** `PUT /api/events/:eventId`
**Auth:** Required (Only host or admin)
**Body:** Any event field to update
```json
{
  "title": "Advanced Yoga Workshop",
  "maxParticipants": 25,
  "price": 60
}
```
**Response:** Updated event object

---

## 5. Delete Events
**Endpoint:** `DELETE /api/events/:eventId`
**Auth:** Required (Only host or admin)
**Response:** Success message

---

## 6. View Bookings for Hosted Events
**Endpoint:** `GET /api/bookings?type=host`
**Auth:** Required
**Query Params:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status (pending, confirmed, cancelled)

**Response:** List of all bookings for events hosted by the user
```json
{
  "success": true,
  "data": [
    {
      "_id": "bookingId",
      "eventId": { "title": "Yoga Workshop", "date": "2025-01-15" },
      "userId": { "fullName": "Jane Doe", "profileImage": "url" },
      "amount": 50,
      "status": "confirmed",
      "paymentStatus": "paid",
      "bookingDate": "2025-01-10"
    }
  ]
}
```

---

## 7. Confirm/Manage Bookings
**Endpoint:** `PATCH /api/bookings/:bookingId/confirm`
**Auth:** Required (Only host or admin)
**Prerequisites:** Payment must be completed (paymentStatus === 'paid')
**Response:** Confirmed booking with updated status

---

## 8. Update Booking Status
**Endpoint:** `PUT /api/bookings/:bookingId`
**Auth:** Required (Only host or admin for status changes)
**Body:**
```json
{
  "status": "confirmed",
  "specialRequests": "vegetarian meal"
}
```
**Response:** Updated booking object

---

## 9. Receive Payments
**Endpoints:**
- `POST /api/bookings/create-intent` - Create payment intent
- Payment processing via Stripe (configured in payment service)

**Payment Flow:**
1. User books event (creates pending booking)
2. Payment intent created
3. User pays via Stripe
4. Payment confirmed in system
5. Host can confirm booking once payment is received
6. Funds held in Stripe account for payout

**Configuration:** See `src/config/payment.ts` for Stripe setup

---

## 10. View Host Dashboard Stats
**Endpoint:** `GET /api/admin/stats` (Admin endpoint)
**Auth:** Required (ADMIN role only)
**Available Stats:**
- Total hosted events
- Total bookings
- Revenue earned
- Pending confirmations

---

## Host Access Control

### Routes by Role:
| Feature | HOST | ADMIN | USER |
|---------|------|-------|------|
| Create Events | ✅ | ✅ | ❌ |
| Edit Own Events | ✅ | ✅ | ❌ |
| Delete Own Events | ✅ | ✅ | ❌ |
| View Participants | ✅ | ✅ | ❌ |
| View Host Bookings | ✅ | ✅ | ❌ |
| Confirm Bookings | ✅ | ✅ | ❌ |
| Receive Payments | ✅ | ✅ | ❌ |

---

## Middleware Protection

All HOST endpoints are protected with:
- `authenticate` - Verifies JWT token
- `authorize(UserRole.HOST, UserRole.ADMIN)` - Checks user role
- `isOwnerOrAdmin` - Verifies resource ownership (for edit/delete)

---

## Example Host Workflow

### Day 1: Create Event
```bash
POST /api/events
Authorization: Bearer <HOST_TOKEN>
Body: { title, description, date, time, location, maxParticipants, price, ... }
```

### Day 2: View Bookings
```bash
GET /api/bookings?type=host
Authorization: Bearer <HOST_TOKEN>
```

### Day 3: Confirm Attendance
```bash
PATCH /api/bookings/:bookingId/confirm
Authorization: Bearer <HOST_TOKEN>
```

### Day 4: View Participants
```bash
GET /api/events/:eventId/participants
Authorization: Bearer <HOST_TOKEN>
```

### Day 5+: View Revenues
- Payments automatically processed via Stripe
- Host can check transaction history in Stripe dashboard
- Pending payouts shown in dashboard stats

---

## Important Notes

1. **Role Assignment:** Admins assign HOST role during user management
2. **Verification:** Hosts should be verified before hosting paid events (admin can verify)
3. **Payment Processing:** Stripe account required for hosts to receive payments
4. **Participant Privacy:** Only host or admin can view full participant list
5. **Booking Confirmation:** Payment must complete before host can confirm booking
