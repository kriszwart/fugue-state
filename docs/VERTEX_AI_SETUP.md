# Vertex AI Gemini Setup Guide

## Overview
This guide explains how to enable Vertex AI with Gemini models for Dameris chat functionality.

## Prerequisites
1. Google Cloud Platform account
2. Active GCP project with billing enabled
3. Vertex AI API enabled

## Environment Variables

Add these to your `.env.local` file:

```bash
# LLM Provider Selection
LLM_PROVIDER=vertex  # Options: 'vertex' or 'huggingface'

# Vertex AI Configuration
VERTEX_PROJECT_ID=your-gcp-project-id
VERTEX_LOCATION=us-central1  # Or your preferred region
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Alternative: Use GCP_PROJECT_ID if VERTEX_PROJECT_ID is not set
GCP_PROJECT_ID=your-gcp-project-id
```

## Setup Steps

### 1. Enable Vertex AI API

```bash
# Using gcloud CLI
gcloud services enable aiplatform.googleapis.com --project=your-gcp-project-id
```

Or via [Google Cloud Console](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)

### 2. Create Service Account (for local development)

```bash
# Create service account
gcloud iam service-accounts create fuguestate-vertex \
  --display-name="FugueState Vertex AI" \
  --project=your-gcp-project-id

# Grant permissions
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="serviceAccount:fuguestate-vertex@your-gcp-project-id.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download key
gcloud iam service-accounts keys create vertex-key.json \
  --iam-account=fuguestate-vertex@your-gcp-project-id.iam.gserviceaccount.com
```

### 3. Set Environment Variables

```bash
# Add to .env.local
echo "LLM_PROVIDER=vertex" >> .env.local
echo "VERTEX_PROJECT_ID=your-gcp-project-id" >> .env.local
echo "VERTEX_LOCATION=us-central1" >> .env.local
echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/vertex-key.json" >> .env.local
```

### 4. Verify Configuration

```bash
# Test authentication
gcloud auth application-default print-access-token

# Should print an access token
```

## Available Gemini Models

The system supports three Gemini models:

1. **gemini-1.5-pro-002** (Thinking Mode)
   - Best for: Complex reasoning, multi-step analysis
   - Context: 2M tokens
   - Use when: Deep reflection, complex synthesis

2. **gemini-1.5-flash-002** (Chat Mode - Default)
   - Best for: Fast conversational responses
   - Context: 1M tokens
   - Use when: Quick chat, general synthesis

3. **gemini-2.0-flash-exp** (Experimental Chat Mode)
   - Best for: Latest features, experimental capabilities
   - Context: 1M tokens
   - Use when: Testing new Gemini features

## Model Selection

The system automatically selects models based on `modelType`:

```typescript
// In your code
const response = await llmService.generateResponse(messages, {
  modelType: 'thinking',  // Uses gemini-1.5-pro-002
  // OR
  modelType: 'chat',      // Uses gemini-1.5-flash-002
  // OR
  modelType: 'auto',      // Uses gemini-1.5-flash-002 (default)
  temperature: 0.7,
  maxTokens: 2048
});
```

## Production Deployment (Cloud Run)

When deploying to Cloud Run, authentication is automatic via Application Default Credentials.

### 1. Build and Deploy

```bash
# Build Docker image
docker build -t gcr.io/your-gcp-project-id/fuguestate .

# Push to GCR
docker push gcr.io/your-gcp-project-id/fuguestate

# Deploy to Cloud Run
gcloud run deploy fuguestate \
  --image gcr.io/your-gcp-project-id/fuguestate \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars LLM_PROVIDER=vertex,VERTEX_PROJECT_ID=your-gcp-project-id,VERTEX_LOCATION=us-central1
```

### 2. Grant Cloud Run Service Account Permissions

```bash
# Get Cloud Run service account
gcloud run services describe fuguestate --region us-central1 --format='value(spec.template.spec.serviceAccountName)'

# Grant Vertex AI permissions
gcloud projects add-iam-policy-binding your-gcp-project-id \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/aiplatform.user"
```

## Troubleshooting

### Error: "Failed to authenticate"

**Solution 1:** Check service account key path
```bash
# Verify file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS
```

**Solution 2:** Check permissions
```bash
# Verify service account has correct role
gcloud projects get-iam-policy your-gcp-project-id \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:fuguestate-vertex@*"
```

### Error: "Vertex AI API not enabled"

```bash
# Enable API
gcloud services enable aiplatform.googleapis.com --project=your-gcp-project-id

# Verify
gcloud services list --enabled --project=your-gcp-project-id | grep aiplatform
```

### Error: "Rate limit exceeded"

- Vertex AI has generous rate limits, but you can request increases
- Check quotas: [Vertex AI Quotas](https://console.cloud.google.com/iam-admin/quotas?service=aiplatform.googleapis.com)

### Error: "Region not supported"

Available regions for Gemini:
- us-central1 (recommended)
- us-east4
- us-west1
- europe-west1
- europe-west4
- asia-southeast1

## Cost Estimation

### Gemini 1.5 Flash Pricing (as of 2024)
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens

### Gemini 1.5 Pro Pricing
- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens

**Estimated monthly cost for 10,000 conversations:**
- Flash: ~$50-100/month
- Pro: ~$500-800/month (if used exclusively)

## Monitoring

View usage in [Google Cloud Console](https://console.cloud.google.com/ai/platform/locations/us-central1/studio/chat):

```bash
# View recent API calls
gcloud logging read "resource.type=aiplatform.googleapis.com/Endpoint" \
  --limit 50 \
  --format json
```

## Next Steps

After setup:
1. Restart your development server: `npm run dev`
2. Test chat functionality in `/studio/workspace`
3. Monitor logs for any authentication errors
4. Review [Gemini Agent Enhancement Plan](./GEMINI_AGENT_PLAN.md) for advanced features

## Support

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Pricing Calculator](https://cloud.google.com/products/calculator)










