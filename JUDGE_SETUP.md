# Judge Authentication Setup Guide

This guide will help you set up the judge authentication system for your hackathon using **www.fuguestate.ai**.

## 📋 Prerequisites

- Supabase project set up and linked
- Environment variables configured in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for invite code generation)

---

## 🚀 Quick Start

### Step 1: Link Your Supabase Project

If you haven't already linked your Supabase project:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase dashboard URL:
- Format: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### Step 2: Apply the Database Migration

Run the migration to add judge authentication tables:

```bash
npm run migrate
```

This will:
- Add `user_role` column to the `users` table
- Create `invite_codes` table for judge invitations
- Update the `handle_new_user()` trigger to support roles

### Step 3: Generate Judge Invite Codes

Create invite codes for your judges:

**Option A: Create a specific invite for a judge**
```bash
npm run generate-invite-codes -- --email judge@hackathon.com --code JUDGE2025
```

**Option B: Generate multiple codes**
```bash
npm run generate-invite-codes -- --count 5
```

**Option C: Quick single code with auto-generated code**
```bash
npm run generate-invite-codes -- --email judge@hackathon.com
```

The script will output:
- The invite code
- A direct signup URL with pre-filled email and code
- Example: `https://www.fuguestate.ai/auth/judge-signup?code=JUDGE2025&email=judge@hackathon.com`

---

## 🔗 Judge URLs

Share these URLs with your judges:

- **Signup**: `https://www.fuguestate.ai/auth/judge-signup`
- **Login**: `https://www.fuguestate.ai/auth/judge-login`
- **Dashboard**: `https://www.fuguestate.ai/judge-dashboard` (auto-redirected after login)

With invite code pre-filled:
```
https://www.fuguestate.ai/auth/judge-signup?code=INVITECODE&email=judge@example.com
```

---

## 🎯 Judge Flow

1. **Judge receives invite**: You send them the signup URL with their invite code
2. **Judge signs up**: They visit `/auth/judge-signup` and create their account
3. **Automatic role assignment**: System assigns `user_role: 'judge'` to their account
4. **Skip initialization**: Judges bypass the muse selection flow
5. **Access dashboard**: Redirected to `/judge-dashboard` after login

---

## 🧪 Testing Locally

Before deploying to Vercel:

### 1. Start your dev server
```bash
npm run dev
```

### 2. Create a test invite code
```bash
npm run generate-invite-codes -- --email test@judge.com --code TEST123
```

### 3. Test the signup flow
Visit: `http://localhost:3000/auth/judge-signup?code=TEST123&email=test@judge.com`

### 4. Test the login flow
Visit: `http://localhost:3000/auth/judge-login`

### 5. Verify dashboard access
After login, you should be redirected to: `http://localhost:3000/judge-dashboard`

---

## 🌐 Deploying to Vercel with www.fuguestate.ai

### Before Deployment

1. **Update environment variables in Vercel**:
   - Go to your Vercel project settings
   - Add all environment variables from `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - Other API keys (Hugging Face, Vertex AI, etc.)

2. **Configure domain in Vercel**:
   - Add `www.fuguestate.ai` as a custom domain
   - Vercel will provide DNS records to configure

3. **Update DNS records** (at your domain registrar):
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Or follow Vercel's specific instructions

### Deploy
```bash
vercel deploy --prod
```

Or push to your Git repository if you have continuous deployment set up.

### After Deployment

1. **Generate production invite codes**:
```bash
npm run generate-invite-codes -- --email judge@hackathon.com --code JUDGE2025
```

2. **Share production URLs** with judges:
```
https://www.fuguestate.ai/auth/judge-signup?code=JUDGE2025&email=judge@hackathon.com
```

---

## 📊 Managing Invite Codes

### View All Invite Codes

Run this SQL query in Supabase SQL Editor:

```sql
SELECT
  code,
  email,
  created_at,
  used_at,
  expires_at,
  is_active
FROM invite_codes
ORDER BY created_at DESC;
```

### Deactivate an Invite Code

```sql
UPDATE invite_codes
SET is_active = false
WHERE code = 'CODENAME';
```

### Check Used Codes

```sql
SELECT
  ic.code,
  ic.email,
  ic.used_at,
  u.full_name as judge_name
FROM invite_codes ic
LEFT JOIN users u ON u.id = ic.used_by_id
WHERE ic.used_at IS NOT NULL
ORDER BY ic.used_at DESC;
```

---

## 🔐 Security Features

✅ **Invite-only access**: Judges must have a valid invite code to sign up
✅ **Code validation**: Server-side validation prevents tampering
✅ **One-time use**: Codes are marked as used after signup
✅ **Expiration**: Codes expire after 30 days (configurable)
✅ **Role verification**: Judge routes protected by middleware
✅ **RLS policies**: Row-level security on invite_codes table

---

## 🛠️ Troubleshooting

### "Migration failed" error
- Ensure Supabase project is linked: `npx supabase link --check`
- Check for syntax errors in the migration file
- Verify you have necessary permissions in Supabase

### "Cannot create invite code" error
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Verify the migration was applied successfully
- Check Supabase logs for detailed errors

### "This account does not have judge access" on login
- Verify the user was created with `user_role: 'judge'`
- Check the database: `SELECT user_role FROM users WHERE email = 'judge@example.com'`
- If wrong role, update: `UPDATE users SET user_role = 'judge' WHERE email = 'judge@example.com'`

### Judge redirected to initialization instead of dashboard
- Clear browser cookies
- Verify middleware is updated (should skip initialization for judges)
- Check that `user_role` field exists in database

---

## 📝 Next Steps

After setting up judge authentication:

1. **Customize the judge dashboard** (`/app/judge-dashboard/page.tsx`)
   - Add hackathon-specific features
   - Implement submission review interface
   - Add scoring/rating functionality

2. **Create submission endpoints**
   - API routes for judges to view submissions
   - Scoring/evaluation endpoints
   - Analytics dashboard

3. **Set up email notifications**
   - Send invite codes via email
   - Notify judges of new submissions
   - Reminder emails for incomplete reviews

---

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase logs in the dashboard
3. Verify all environment variables are set correctly
4. Ensure the migration was applied successfully

---

**Domain**: www.fuguestate.ai
**Environment**: Production (Vercel)
**Database**: Supabase Cloud
