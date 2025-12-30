# Fugue State Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Environment Variables**

   Create a `.env.local` file in the root directory:
   ```bash
   cp .env.local.example .env.local
   ```

   Then fill in your environment variables:

   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Hugging Face API (Pro Account)
   HUGGINGFACE_API_KEY=your_huggingface_api_key_here

   # ElevenLabs API (for voice synthesis - optional)
   # Get your API key from: https://elevenlabs.io
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

   # OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   NOTION_CLIENT_ID=your_notion_client_id
   NOTION_CLIENT_SECRET=your_notion_client_secret

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Encryption Key (generate with: openssl rand -hex 32)
   ENCRYPTION_KEY=your_encryption_key_here

   # API Key for public API
   API_KEY=your_api_key_here

   # Redis Configuration (optional but recommended for caching and rate limiting)
   # Option 1: Use connection URL (for Redis Cloud, Upstash, etc.)
   REDIS_URL=redis://localhost:6379
   # Option 2: Use individual parameters
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   # REDIS_PASSWORD=your_redis_password
   # REDIS_DB=0
   ```

3. **Set Up Supabase**

   - Create a new Supabase project at https://supabase.com
   - Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL Editor
   - Enable Storage and create a bucket named `artefacts` with public access
   - Copy your project URL and keys to `.env.local`

4. **Generate Encryption Key**

   ```bash
   openssl rand -hex 32
   ```
   Add the output to `ENCRYPTION_KEY` in `.env.local`

5. **Set Up Redis (Optional but Recommended)**

   Redis is used for caching, rate limiting, and session management. You can either:
   
   **Option A: Install Redis Locally**
   ```bash
   # macOS (using Homebrew)
   brew install redis
   brew services start redis
   
   # Linux (Ubuntu/Debian)
   sudo apt-get update
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   
   # Verify installation
   redis-cli ping
   # Should return: PONG
   ```
   
   **Option B: Use Redis Cloud (Free tier available)**
   - Sign up at https://redis.com/try-free/
   - Create a database
   - Copy the connection URL to `REDIS_URL` in `.env.local`
   
   **Option C: Use Docker**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```
   
   If Redis is not configured, the app will continue to work but without caching benefits.

6. **Run the Development Server**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 in your browser.

## Features Ready to Use

- ✅ **Chat with Dameris**: Uses Hugging Face models (Llama, Mistral, Gemma, Phi-3, Qwen)
- ✅ **Image Generation**: Uses Hugging Face Stable Diffusion models
- ✅ **Data Connectors**: Gmail, Google Drive, Notion, Local files
- ✅ **Memory Analysis**: Pattern detection and neural threading
- ✅ **Export**: JSON, Markdown, ZIP formats
- ✅ **Privacy Hub**: Manage data sources and memories

## Hugging Face Models Used

### Text Generation (Chat)
- `meta-llama/Llama-3.1-8B-Instruct`
- `mistralai/Mistral-7B-Instruct-v0.2`
- `google/gemma-7b-it`
- `microsoft/Phi-3-mini-4k-instruct`
- `Qwen/Qwen2.5-7B-Instruct`

### Image Generation
- `stabilityai/stable-diffusion-xl-base-1.0`
- `runwayml/stable-diffusion-v1-5`
- `CompVis/stable-diffusion-v1-4`
- `stabilityai/sdxl-turbo`
- `black-forest-labs/FLUX.1-dev`

## Troubleshooting

- **API Errors**: Make sure your Hugging Face API key has Pro account access
- **Database Errors**: Verify Supabase migration ran successfully
- **Storage Errors**: Ensure the `artefacts` bucket exists and is public
- **OAuth Errors**: Check redirect URIs match your app URL

