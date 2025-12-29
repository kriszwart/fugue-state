# Fugue State: Cloud Run Deployment Guide

This guide covers deploying Fugue State to Google Cloud Run for the ElevenLabs + Vertex Voice Muse demo.

## Prerequisites

- Google Cloud Platform account
- `gcloud` CLI installed and authenticated
- Supabase project (database)
- Domain name (optional, for custom domain)

## Architecture Overview

**Services Used:**
- **Cloud Run**: Serverless Next.js application hosting
- **Vertex AI**: Gemini models for reasoning and chat
- **Cloud Speech-to-Text**: Voice input transcription
- **ElevenLabs**: Voice output (external service)
- **Supabase**: PostgreSQL database (external)

## Step 1: Set Up Google Cloud Project

### 1.1 Create Project

```bash
# Set your project ID
export PROJECT_ID="fugue-state-demo"
export REGION="us-central1"

# Create project (if needed)
gcloud projects create $PROJECT_ID --name="Fugue State"

# Set as active project
gcloud config set project $PROJECT_ID
```

### 1.2 Enable Required APIs

```bash
# Enable Cloud Run
gcloud services enable run.googleapis.com

# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Speech-to-Text
gcloud services enable speech.googleapis.com

# Enable Container Registry
gcloud services enable containerregistry.googleapis.com

# Enable Cloud Build
gcloud services enable cloudbuild.googleapis.com
```

### 1.3 Set Up Service Account

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create fugue-state-sa \
    --display-name="Fugue State Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fugue-state-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:fugue-state-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/speech.client"
```

## Step 2: Configure Environment Variables

### 2.1 Create `.env.production` File

Create a `.env.production` file with your production environment variables:

```env
# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-url.run.app
ENCRYPTION_KEY=your_encryption_key_here
API_KEY=your_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# LLM Provider (use "vertex" for Gemini)
LLM_PROVIDER=vertex

# Vertex AI Configuration
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

# ElevenLabs API
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional: Toolhouse API
TOOLHOUSE_API_KEY=your_toolhouse_api_key

# Optional: Redis (for caching - recommended for production)
# Use managed Redis like Google Memorystore or Upstash
REDIS_URL=redis://your-redis-host:6379
```

### 2.2 Set OAuth Redirect URIs

**Important**: Update your OAuth app redirect URIs:

**Google OAuth Console:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://your-app-url.run.app/api/oauth/callback?provider=google`

**Notion Integrations:**
1. Go to https://www.notion.so/my-integrations
2. Edit your integration
3. Add redirect URI: `https://your-app-url.run.app/api/oauth/callback?provider=notion`

## Step 3: Build and Deploy

### 3.1 Create Dockerfile (if not exists)

Create `Dockerfile` in the project root:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variable for build
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### 3.2 Update `next.config.js`

Add standalone output for Cloud Run:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... rest of your config
}

module.exports = nextConfig
```

### 3.3 Create `.dockerignore`

```
node_modules
.next
.git
.env.local
.env*.local
*.md
README.md
LICENSE
.gitignore
```

### 3.4 Deploy to Cloud Run

```bash
# Build and deploy in one command
gcloud run deploy fugue-state \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account fugue-state-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 10 \
  --min-instances 0 \
  --set-env-vars LLM_PROVIDER=vertex,VERTEX_PROJECT_ID=$PROJECT_ID,VERTEX_LOCATION=$REGION,NEXT_TELEMETRY_DISABLED=1

# Or use gcloud build + deploy
gcloud builds submit --tag gcr.io/$PROJECT_ID/fugue-state

gcloud run deploy fugue-state \
  --image gcr.io/$PROJECT_ID/fugue-state \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --service-account fugue-state-sa@$PROJECT_ID.iam.gserviceaccount.com
```

### 3.5 Set Secrets via Secret Manager (Recommended)

For sensitive values like API keys:

```bash
# Create secrets
echo -n "your_elevenlabs_api_key" | gcloud secrets create elevenlabs-api-key --data-file=-
echo -n "your_supabase_service_role_key" | gcloud secrets create supabase-service-role-key --data-file=-
echo -n "your_encryption_key" | gcloud secrets create encryption-key --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding elevenlabs-api-key \
  --member="serviceAccount:fugue-state-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Update Cloud Run to use secrets
gcloud run services update fugue-state \
  --update-secrets=ELEVENLABS_API_KEY=elevenlabs-api-key:latest,SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,ENCRYPTION_KEY=encryption-key:latest \
  --region $REGION
```

## Step 4: Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service fugue-state \
  --domain your-domain.com \
  --region $REGION

# Follow instructions to update DNS records
```

## Step 5: Set Up Monitoring

### 5.1 Enable Cloud Logging

Logs are automatically available in Cloud Logging:
```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=fugue-state" --limit 50
```

### 5.2 Set Up Alerts (Optional)

Create uptime check and alerting policy in Cloud Console for production monitoring.

## Step 6: Environment-Specific Configuration

### 6.1 Update All Environment Variables

```bash
# Set all environment variables at once
gcloud run services update fugue-state \
  --region $REGION \
  --set-env-vars \
NEXT_PUBLIC_APP_URL=https://your-app-url.run.app,\
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co,\
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key,\
LLM_PROVIDER=vertex,\
VERTEX_PROJECT_ID=$PROJECT_ID,\
VERTEX_LOCATION=$REGION,\
GOOGLE_CLIENT_ID=your_google_client_id,\
NOTION_CLIENT_ID=your_notion_client_id,\
API_KEY=your_api_key
```

## Testing the Deployment

### 1. Test Health Check
```bash
curl https://your-app-url.run.app/
```

### 2. Test Voice Flow
1. Navigate to `/voice` page
2. Upload a notes file via `/initialization`
3. Speak: "Dameris, find the missing idea I keep circling"
4. Verify:
   - Speech-to-text works (Google STT)
   - Gemini generates response with references
   - ElevenLabs Agent speaks response

### 3. Test Data Sources
1. Connect Google (Gmail + Drive)
2. Sync data
3. Verify memories are created
4. Test Drive Google Docs export

## Performance Optimization

### 1. Configure Concurrency
```bash
gcloud run services update fugue-state \
  --concurrency 80 \
  --region $REGION
```

### 2. Enable CPU Boost (for faster cold starts)
```bash
gcloud run services update fugue-state \
  --cpu-boost \
  --region $REGION
```

### 3. Set up Cloud CDN (for static assets)
Configure via Cloud Console for faster asset delivery.

## Cost Optimization

### Recommended Settings
- **Min instances**: 0 (scale to zero when not in use)
- **Max instances**: 10 (prevent runaway costs)
- **Memory**: 2 Gi (adequate for Next.js + AI inference)
- **CPU**: 2 (for better performance)
- **Timeout**: 300s (5 minutes for long-running requests)

### Monitoring Costs
```bash
# Check current costs
gcloud billing accounts list
gcloud billing budgets list
```

## Troubleshooting

### Issue: "Permission denied" errors for Vertex AI
**Solution**: Verify service account has `roles/aiplatform.user` role

### Issue: OAuth redirects fail
**Solution**: Update redirect URIs in OAuth consoles to match Cloud Run URL

### Issue: Cold start latency
**Solution**:
- Set min instances to 1
- Enable CPU boost
- Use Vertex Flash model for faster responses

### Issue: Timeout errors
**Solution**: Increase timeout:
```bash
gcloud run services update fugue-state --timeout 600 --region $REGION
```

### Check Logs
```bash
# Real-time logs
gcloud run services logs tail fugue-state --region $REGION

# Filter by severity
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=fugue-state AND severity>=ERROR" --limit 100
```

## Continuous Deployment

### Set up GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy fugue-state \
            --source . \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

## Demo Checklist

Before presenting to judges:

- [ ] Service is deployed and accessible
- [ ] OAuth (Google) is configured with correct redirect URIs
- [ ] Voice page (`/voice`) loads without errors
- [ ] Can upload a notes.md file
- [ ] Speech-to-text works (try "Dameris, find the missing idea")
- [ ] Gemini returns response with memory references
- [ ] ElevenLabs Agent speaks the response
- [ ] Logs show successful Vertex AI and STT calls
- [ ] Error handling works gracefully

## Support & Documentation

- **Cloud Run Docs**: https://cloud.google.com/run/docs
- **Vertex AI Docs**: https://cloud.google.com/vertex-ai/docs
- **Speech-to-Text Docs**: https://cloud.google.com/speech-to-text/docs
- **ElevenLabs Agents**: https://elevenlabs.io/docs/agents

## License

Include a LICENSE file in your repository (required for hackathon submission).

Create `LICENSE` file:
```
ISC License

Copyright (c) 2025, Fugue State

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
