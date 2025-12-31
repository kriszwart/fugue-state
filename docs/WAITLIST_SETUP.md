# Waitlist System Setup Guide

## 📋 Overview

Your waitlist system is ready! Here's what's been built:

- ✅ **Waitlist page** (`/waitlist`) for users to request access
- ✅ **Admin dashboard** (`/admin/waitlist`) to approve/reject requests
- ✅ **Modified signup flow** that checks waitlist status
- ✅ **API endpoints** for managing the waitlist
- ✅ **Database migration** for waitlist table

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Apply Database Migration

**Option A: Supabase SQL Editor** (Recommended)
```bash
# Copy and paste this into Supabase SQL Editor:
# supabase/migrations/005_create_waitlist.sql
```

**Option B: Supabase CLI**
```bash
supabase db push
```

### Step 2: Set Admin API Key

Add to your `.env.local`:
```bash
# Admin API key for waitlist management
ADMIN_API_KEY=your_secure_random_key_here
```

Generate a secure key:
```bash
# macOS/Linux
openssl rand -hex 32

# Or use your existing API_KEY
# The admin endpoints accept either ADMIN_API_KEY or API_KEY
```

### Step 3: Test the Flow

1. **Join Waitlist**: Visit `http://localhost:3000/waitlist`
   - Enter email, name, reason
   - Submit → "You're on the list!"

2. **Check Admin Dashboard**: Visit `http://localhost:3000/admin/waitlist`
   - Enter your API key
   - See the waitlist entry
   - Approve it

3. **Try Signup**: Visit `http://localhost:3000/auth/signup`
   - Enter the approved email
   - Signup should work!

4. **Try Unapproved Signup**: Visit `/auth/signup` with different email
   - Should redirect to `/waitlist`

---

## 📊 How It Works

### User Flow
```
1. User visits /waitlist
   ↓
2. Submits email + details
   ↓
3. Status: "pending" (added to waitlist table)
   ↓
4. Admin approves via /admin/waitlist
   ↓
5. Status: "approved"
   ↓
6. User can now sign up at /auth/signup
```

### Signup Gate
When user tries to sign up:
1. **Check waitlist status** (`GET /api/waitlist?email=user@example.com`)
2. **If approved**: Allow signup
3. **If pending**: Show "You're on the waitlist!"
4. **If not found**: Redirect to `/waitlist`

---

## 🔐 Security Features

### Database (RLS Policies)
- ✅ Anyone can **INSERT** (join waitlist)
- ✅ Users can **SELECT** their own entry
- ✅ Only service role can **UPDATE** (approve/reject)
- ✅ Only service role can **DELETE**

### API Endpoints
- ✅ `POST /api/waitlist` - Public (anyone can join)
- ✅ `GET /api/waitlist?email=...` - Public (check status)
- ✅ `GET /api/waitlist/admin` - Admin only (list entries)
- ✅ `PATCH /api/waitlist/admin` - Admin only (approve/reject)
- ✅ `DELETE /api/waitlist/admin` - Admin only (delete entry)

---

## 🎨 Pages & Components

### `/waitlist` - User Waitlist Page
**Features:**
- Beautiful form with name, email, reason, referral code
- Success state ("You're on the list!")
- Link to signup for already-approved users

### `/admin/waitlist` - Admin Dashboard
**Features:**
- API key authentication
- Waitlist statistics (pending, approved, rejected counts)
- Filter by status
- Approve/Reject buttons
- Delete entries
- Real-time updates

### `/auth/signup` - Modified Signup
**New behavior:**
- Checks waitlist before allowing signup
- Shows helpful errors ("Join waitlist first")
- Link to waitlist page

---

## 📡 API Reference

### Join Waitlist
```javascript
POST /api/waitlist
{
  "email": "user@example.com",
  "full_name": "John Doe",
  "reason": "Excited about the product!",
  "referral_code": "twitter" // optional
}

// Response
{
  "success": true,
  "message": "You're on the waitlist!",
  "entry": { ... }
}
```

### Check Status
```javascript
GET /api/waitlist?email=user@example.com

// Response
{
  "success": true,
  "status": "approved",
  "joined_at": "2025-01-15T10:00:00Z",
  "can_signup": true
}
```

### Admin: List Entries
```javascript
GET /api/waitlist/admin?status=pending&limit=50&offset=0
Headers: { "x-admin-key": "your_api_key" }

// Response
{
  "success": true,
  "entries": [ ... ],
  "total": 42,
  "stats": [
    { "status": "pending", "count": 20 },
    { "status": "approved", "count": 15 },
    { "status": "rejected", "count": 7 }
  ]
}
```

### Admin: Approve/Reject
```javascript
PATCH /api/waitlist/admin
Headers: { "x-admin-key": "your_api_key" }
{
  "id": "uuid-here",
  "status": "approved", // or "rejected"
  "send_email": true // optional
}

// Response
{
  "success": true,
  "message": "Waitlist entry approved",
  "entry": { ... }
}
```

### Admin: Delete Entry
```javascript
DELETE /api/waitlist/admin?id=uuid-here
Headers: { "x-admin-key": "your_api_key" }

// Response
{
  "success": true,
  "message": "Waitlist entry deleted"
}
```

---

## 🔔 Email Notifications (TODO)

The system has placeholders for email notifications:

```javascript
// In app/api/waitlist/admin/route.ts

// After approval
if (status === 'approved') {
  // TODO: Integrate with your email service
  // await sendApprovalEmail(entry.email, entry.full_name)
}
```

### Recommended Email Services:
1. **SendGrid** - Free tier: 100 emails/day
2. **Resend** - Modern, developer-friendly
3. **Postmark** - Great deliverability
4. **Loops.so** - Beautiful transactional emails

### Email Templates Needed:
1. **Waitlist Confirmation** - "You're on the list!"
2. **Approval Email** - "You're approved! Sign up here: [link]"
3. **Rejection Email** (optional) - "Thank you for your interest..."

---

## 🎯 Customization Ideas

### 1. Priority Queue
Add a `priority` field to waitlist table:
```sql
ALTER TABLE public.waitlist ADD COLUMN priority INTEGER DEFAULT 0;
CREATE INDEX idx_waitlist_priority ON public.waitlist(priority DESC, created_at ASC);
```

### 2. Referral System
Give users a unique referral code after joining:
```javascript
const referralCode = crypto.randomUUID().slice(0, 8);
// Track referrals for rewards
```

### 3. Auto-Approve Conditions
Auto-approve based on criteria:
```javascript
// In /api/waitlist POST handler
if (referral_code === 'VIP' || email.endsWith('@yourcompany.com')) {
  status = 'approved';
}
```

### 4. Waiting Position
Show users their position in queue:
```sql
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as position
  FROM waitlist WHERE status = 'pending'
)
SELECT position FROM ranked WHERE id = $1;
```

---

## 🐛 Troubleshooting

### "Unauthorized" when accessing admin dashboard
- Check that `ADMIN_API_KEY` or `API_KEY` is set in `.env.local`
- Verify the key matches what you're entering
- Restart your dev server after adding the env var

### "Email not found on waitlist" error on signup
- User needs to join `/waitlist` first
- Or approve them manually in admin dashboard

### Waitlist page not loading
- Run the migration: `supabase/migrations/005_create_waitlist.sql`
- Check Supabase logs for errors
- Verify RLS policies are applied

### Can't approve users
- Check that service role key is correct in `.env.local`
- Verify admin API key in request headers
- Check Supabase logs for permission errors

---

## 📈 Analytics & Monitoring

### Track Key Metrics:
1. **Conversion rate**: Waitlist signups → Approved → Actual signups
2. **Time to approval**: How long users wait
3. **Referral sources**: Which codes/sources work best
4. **Drop-off rate**: Approved users who don't sign up

### Simple SQL Queries:
```sql
-- Daily signups
SELECT DATE(created_at), COUNT(*)
FROM waitlist
GROUP BY DATE(created_at);

-- Approval rate
SELECT
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM waitlist
GROUP BY status;

-- Average time to approval
SELECT AVG(approved_at - created_at) as avg_wait_time
FROM waitlist
WHERE status = 'approved' AND approved_at IS NOT NULL;
```

---

## 🚀 Ready to Launch!

### Pre-Launch Checklist:
- [ ] Run migration in production Supabase
- [ ] Set `ADMIN_API_KEY` in production env
- [ ] Test waitlist signup flow
- [ ] Test admin approval flow
- [ ] Test signup gate (approved vs unapproved)
- [ ] Set up email notifications (optional)
- [ ] Add waitlist link to homepage
- [ ] Monitor first 10 signups

### Production URLs:
- Waitlist: `https://yourapp.com/waitlist`
- Admin: `https://yourapp.com/admin/waitlist`
- Signup: `https://yourapp.com/auth/signup`

---

## 💡 Marketing Tips

### Promote Your Waitlist:
1. **Homepage CTA**: "Request Early Access" → `/waitlist`
2. **Twitter/Social**: Share waitlist link with compelling reason
3. **Product Hunt**: Launch with waitlist-only access
4. **Referral rewards**: Give users who refer X friends early access
5. **Scarcity**: "Only approving 100 users this week"

### Waitlist Copy Ideas:
- ✨ "Be the first to transform your memories into art"
- 🎨 "Limited beta access - request yours now"
- 🚀 "Join 500+ creators on the waitlist"
- 💎 "Early access comes with exclusive features"

---

## 🎉 You're All Set!

Your waitlist system is production-ready. Questions? Check the inline comments in the code or reach out!

**Next Steps:**
1. Apply the migration
2. Set the admin API key
3. Test the flow end-to-end
4. Add email notifications (optional)
5. Launch! 🚀
