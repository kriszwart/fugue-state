# 🚀 Setup Guide: Visual Memory Upload & Deep Life Analysis

## Overview

Two high-impact features have been implemented:
1. **Visual Memory Upload** - Upload photos with AI vision analysis
2. **Deep Life Analysis** - Analyze entire life journal for profound insights

---

## ✅ What's Already Done

### Backend APIs (Complete)
- ✅ `/api/memories/upload-image` - Image upload with Gemini Vision analysis
- ✅ `/api/memories/deep-analysis` - Deep life analysis with 2M token context
- ✅ Enhanced Vertex Gemini provider with thinking mode & caching

### Frontend Components (Complete)
- ✅ `ImageUpload.tsx` - Full-featured image upload modal
- ✅ `/app/analyze/page.tsx` - Beautiful deep analysis page
- ✅ Studio integration - Upload button & Analyze link added

### Database Migration (Ready to Run)
- ✅ `010_create_analyses_table.sql` - Migration file created

---

## 🔧 Setup Steps

### Step 1: Run Database Migration

You need to create the `analyses` table in Supabase. Choose one method:

#### Option A: Using Supabase Dashboard (Easiest)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `/supabase/migrations/010_create_analyses_table.sql`
4. Copy the entire SQL content
5. Paste into SQL Editor and click **Run**

#### Option B: Using Supabase CLI
```bash
# If you have Supabase CLI installed
npx supabase db push

# Or run the specific migration
npx supabase migration up
```

#### Option C: Direct SQL Execution
Execute this SQL in your Supabase database:

```sql
-- Create the analyses table
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_type ON analyses(type);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);

-- Add update trigger
CREATE OR REPLACE FUNCTION update_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER analyses_updated_at_trigger
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_analyses_updated_at();

-- Enable RLS
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own analyses"
  ON analyses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analyses"
  ON analyses FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analyses"
  ON analyses FOR DELETE USING (auth.uid() = user_id);
```

### Step 2: Verify Environment Variables

Ensure these are set in `.env.local`:

```bash
# Gemini AI (Required for both features)
LLM_PROVIDER=vertex
VERTEX_PROJECT_ID=your-project-id
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

# Enhanced Gemini Features
ENABLE_THINKING_MODE=true
ENABLE_CONTEXT_CACHING=true
ENABLE_EXTENDED_CONTEXT=true
ENABLE_MULTIMODAL=true

# Gemini Models
GEMINI_CHAT_MODEL=gemini-2.0-flash-exp
GEMINI_THINKING_MODEL=gemini-2.0-flash-thinking-exp-1219
GEMINI_VISION_MODEL=gemini-1.5-pro-002
GEMINI_EXTENDED_MODEL=gemini-1.5-pro-002

# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 3: Verify Storage Bucket

Ensure the `memories` storage bucket exists in Supabase:

1. Go to Supabase Dashboard → **Storage**
2. Check if `memories` bucket exists
3. If not, create it:
   - Click **New bucket**
   - Name: `memories`
   - Public: `Yes` (for image URLs)
   - Click **Create bucket**

4. Set storage policies (if not already set):
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload their own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'memories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Public can view images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'memories');
```

### Step 4: Start the Application

```bash
npm run dev
```

---

## 🎯 How to Use the New Features

### Visual Memory Upload

**From Studio Page:**
1. Look for the **"Upload Visual Memory"** button (purple/fuchsia gradient)
2. Click to open the upload modal
3. Drag & drop an image OR click "Select Image"
4. Optionally add:
   - Title (e.g., "Beach Sunset")
   - Context (e.g., "My vacation in Paris last summer")
5. Click **"Analyze & Upload"**
6. Watch as Gemini Vision analyzes your image
7. See the full analysis with:
   - Visual description
   - Themes extracted
   - Mood detected
   - Dominant colors
   - Suggested tags

**What Happens:**
- Image uploaded to Supabase Storage
- Gemini Vision analyzes the image
- Structured themes extracted via function calling
- Memory saved with rich metadata
- Analysis appears in chat

**API Details:**
```bash
# Direct API usage (for testing)
curl -X POST http://localhost:3000/api/memories/upload-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/photo.jpg" \
  -F "context=My vacation" \
  -F "title=Beach Sunset"
```

### Deep Life Analysis

**From Studio Page:**
1. Click the **"Analyze My Life"** button (indigo/purple gradient)
2. You'll be taken to `/analyze` page
3. Click **"Start Deep Analysis"**
4. Wait 30 seconds to 5 minutes (depending on memory count)
5. View comprehensive 10-part analysis:
   - Life Narrative
   - Major Life Themes
   - Emotional Evolution
   - Life Chapters
   - Hidden Patterns
   - Turning Points
   - Strengths & Growth
   - Areas for Reflection
   - Future Insights
   - Synthesis

**Features:**
- Collapsible sections for easy reading
- Export as Markdown
- Share functionality
- Shows analysis stats (memories analyzed, timespan, etc.)
- Cost savings from context caching displayed

**What Happens:**
- Loads ALL your memories (up to 2M tokens)
- Creates cached context (60-90% cost savings on reruns)
- Uses thinking mode for deep reasoning
- Generates comprehensive 10-part analysis
- Saves to database for later viewing

**API Details:**
```bash
# Direct API usage (for testing)
curl -X POST http://localhost:3000/api/memories/deep-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"

# View previous analyses
curl http://localhost:3000/api/memories/deep-analysis \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Testing the Features

### Test Image Upload

1. **Quick Test:**
   - Go to `/studio`
   - Click "Upload Visual Memory"
   - Upload any photo
   - Verify analysis appears

2. **Test with Context:**
   - Add title and context
   - Verify they appear in the analysis

3. **Check Database:**
```sql
SELECT * FROM memories WHERE media_type = 'image' ORDER BY created_at DESC LIMIT 5;
```

### Test Deep Analysis

1. **Ensure You Have Memories:**
```sql
SELECT COUNT(*) FROM memories WHERE user_id = 'your-user-id';
```

2. **Run Analysis:**
   - Go to `/analyze`
   - Click "Start Deep Analysis"
   - Wait for completion

3. **Check Database:**
```sql
SELECT * FROM analyses WHERE type = 'deep_life_analysis' ORDER BY created_at DESC LIMIT 5;
```

4. **Check Cached Context:**
   - Look in logs for "Context cached: ..."
   - Run analysis again, should be 60-90% cheaper

---

## 📊 Cost Estimates

### Image Upload
- **Gemini Vision:** ~$0.002 per image
- **Storage:** Included in Supabase free tier
- **Per 100 uploads:** ~$0.20

### Deep Life Analysis
- **First run:** $0.05-0.10 (depending on memory count)
- **Cached re-run:** $0.005-0.01 (60-90% savings!)
- **Per user per month:** <$0.50

Both features are cost-effective and provide premium value.

---

## 🐛 Troubleshooting

### Image Upload Issues

**Error: "Failed to upload image to storage"**
- Check Supabase Storage bucket exists
- Verify storage policies are set
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct

**Error: "Image must be less than 10MB"**
- Compress the image before uploading
- Supported formats: JPG, PNG, GIF, WebP

**Error: "Failed to analyze image"**
- Check `GEMINI_VISION_MODEL` is set
- Verify Google Cloud credentials
- Check Vertex AI API is enabled

### Deep Analysis Issues

**Error: "No memories found to analyze"**
- User needs to have memories first
- Check: `SELECT COUNT(*) FROM memories WHERE user_id = auth.uid()`

**Error: "Failed to perform analysis"**
- Check `ENABLE_EXTENDED_CONTEXT=true`
- Verify `GEMINI_EXTENDED_MODEL` is set
- Check Google Cloud quota limits

**Analysis takes too long (>5 minutes)**
- Normal for 500+ memories
- Check server logs for progress
- Verify `maxDuration = 300` in route.ts

**Database Error: "table analyses does not exist"**
- Run the migration (Step 1)
- Verify: `SELECT * FROM information_schema.tables WHERE table_name = 'analyses'`

---

## 📝 File Locations

### New Files Created
```
app/
  components/
    ImageUpload.tsx                     # Image upload modal component
  analyze/
    page.tsx                           # Deep analysis page
  api/
    memories/
      upload-image/
        route.ts                       # Image upload API
      deep-analysis/
        route.ts                       # Deep analysis API

supabase/
  migrations/
    010_create_analyses_table.sql      # Database migration

lib/
  ai/
    providers/
      vertex-enhanced.ts               # Enhanced Gemini provider
    memory-cache-manager.ts            # Context caching manager

docs/
  HIGH_IMPACT_FEATURES.md              # Feature documentation
  SETUP_NEW_FEATURES.md                # This file
```

### Modified Files
```
app/
  studio/
    page.tsx                           # Added upload button & analyze link

lib/
  ai/
    llm-service.ts                     # Enhanced with thinking mode

.env.local                             # Updated with Gemini config
```

---

## ✨ Next Steps

Once setup is complete:

1. **Try Image Upload:**
   - Upload a meaningful photo
   - See how Gemini Vision analyzes it
   - Check the themes and mood extraction

2. **Try Deep Analysis:**
   - Make sure you have 5+ memories
   - Run your first analysis
   - Explore the 10-part report

3. **Monitor Costs:**
   - Check Google Cloud billing
   - Verify context caching is working (check logs)
   - Monitor token usage in analysis stats

4. **Gather Feedback:**
   - Test with different image types
   - Try analysis with varying memory counts
   - Note any edge cases or improvements

---

## 🎉 Success Criteria

You'll know everything is working when:

✅ Image upload modal opens from studio
✅ Images upload and get analyzed with themes/mood/colors
✅ Uploaded images appear in chat with full analysis
✅ Deep analysis page loads at `/analyze`
✅ Analysis completes successfully with all 10 sections
✅ Previous analyses are saved and viewable
✅ Context caching shows cost savings (check logs)
✅ No errors in browser console or server logs

---

## 📞 Support

If you encounter issues:

1. Check server logs: `npm run dev` output
2. Check browser console for errors
3. Verify all environment variables
4. Test APIs directly with curl
5. Check Supabase logs and storage

**Common Issues:**
- **401 Unauthorized**: Check auth token
- **403 Forbidden**: Check RLS policies
- **500 Server Error**: Check server logs
- **Storage upload fails**: Check bucket & policies
- **Vision analysis fails**: Check Gemini API key

---

**Ready to go!** 🚀

Once the migration is run, both features are fully functional and ready to use.
