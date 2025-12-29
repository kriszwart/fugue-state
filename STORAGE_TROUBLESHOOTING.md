# Storage Bucket Troubleshooting Guide

## Quick Fix Steps

### Option 1: Apply Migration (Recommended)
```bash
# If you have Supabase CLI installed:
supabase db push

# Or apply the migration manually in Supabase SQL Editor
```

Copy and paste the contents of `supabase/migrations/004_setup_storage_bucket.sql` into your Supabase SQL Editor and run it.

### Option 2: Manual Setup via Dashboard

1. **Create the Bucket**
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `artefacts`
   - Public: **OFF** (keep it private)
   - Click "Create bucket"

2. **Set up RLS Policies**
   - Click on the `artefacts` bucket
   - Go to "Policies" tab
   - Click "New policy"
   - Add the policies from the migration file

---

## Common Errors & Solutions

### Error: "Bucket not found"
**Solution**: The bucket doesn't exist. Create it using Option 1 or 2 above.

### Error: "new row violates row-level security policy"
**Solution**: RLS policies aren't set up correctly. Run the migration or add policies manually.

**Quick SQL Fix:**
```sql
-- Run this in Supabase SQL Editor
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Then apply the policies from 004_setup_storage_bucket.sql
```

### Error: "Permission denied for table objects"
**Solution**: User doesn't have permissions on storage.objects table.

**Quick SQL Fix:**
```sql
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
```

### Error: "JWT expired" or "Invalid JWT"
**Solution**: User session expired. Sign out and sign back in.

---

## How to Check Browser Console Errors

### Chrome/Edge/Brave:
1. Right-click anywhere → "Inspect"
2. Click "Console" tab
3. Try uploading a file
4. Look for red error messages

### Firefox:
1. Right-click anywhere → "Inspect Element"
2. Click "Console" tab
3. Try uploading a file
4. Look for red error messages

### Safari:
1. Safari → Preferences → Advanced → "Show Develop menu"
2. Develop → Show Web Inspector
3. Click "Console" tab
4. Try uploading a file
5. Look for red error messages

---

## Verify Setup

Run this query in Supabase SQL Editor to check if everything is set up:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'artefacts';

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check artefacts table
SELECT COUNT(*) FROM public.artefacts;
```

Expected results:
- Bucket query should return 1 row with `public = false`
- Policies query should return 4 rows (SELECT, INSERT, UPDATE, DELETE)
- Artefacts table should exist (even if count is 0)

---

## Test Upload Manually

Use this JavaScript in browser console to test upload:

```javascript
// Get Supabase client from window (if available)
const supabase = window.supabaseClient;

// Or create one
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_ANON_KEY'
);

// Test upload
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const { data, error } = await supabase.storage
  .from('artefacts')
  .upload(`vault/${(await supabase.auth.getUser()).data.user.id}/test-${Date.now()}.txt`, testFile);

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('Upload success:', data);
}
```

---

## Still Having Issues?

Share these details:
1. **Exact error message** from browser console
2. **Screenshot** of the error
3. **Result** of the "Verify Setup" queries above
4. **Supabase plan** (Free/Pro/Team)

Then I can provide a more specific fix!
