# Google Cloud Vertex AI Imagen Setup

FugueState now uses **Google Cloud Vertex AI Imagen** for image generation! This showcases Google Cloud's full AI stack for the hackathon.

## 🎨 How It Works

The image generation system now uses a **smart fallback strategy**:

1. **Primary**: Google Cloud Vertex AI Imagen (Imagen 3, 2, 1)
2. **Fallback**: Hugging Face Stable Diffusion models

### Vertex AI Imagen Models

- `imagegeneration@006` - **Imagen 3** (latest, best quality)
- `imagegeneration@005` - Imagen 2 (fallback)
- `imagegeneration@002` - Imagen 1 (backup)

## ✅ Already Configured

Your environment is already set up! The system uses:

```env
VERTEX_PROJECT_ID=fugue-state-481202
VERTEX_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## 🚀 Usage

Image generation now automatically:

1. Tries Vertex AI Imagen first
2. Falls back to Hugging Face if Vertex fails
3. Logs which provider was used

### Check the Logs

You'll see console output like:
```
[Image Gen] Trying Google Cloud Vertex AI Imagen...
[Vertex Image] Generating with model: imagegeneration@006
[Vertex Image] Success with model: imagegeneration@006
[Image Gen] ✅ Success with Vertex AI Imagen
```

Or if fallback occurs:
```
[Image Gen] Trying Google Cloud Vertex AI Imagen...
[Vertex Image] Error with model imagegeneration@006: ...
[Image Gen] Vertex AI failed, falling back to Hugging Face
[Image Gen] Using Hugging Face models...
```

## 🎯 For the Hackathon

This setup is **perfect** for the ElevenLabs + Google Cloud hackathon because it showcases:

- ✅ **Google Cloud Vertex AI Gemini** (LLM for chat & creative modes)
- ✅ **Google Cloud Vertex AI Imagen** (Image generation)
- ✅ **Google Cloud Speech-to-Text** (Voice input)
- ✅ **ElevenLabs TTS** (Voice output)

**Complete Google Cloud + ElevenLabs integration!**

## 🔧 Optional: Force Hugging Face

To disable Vertex AI Imagen and use only Hugging Face, add to `.env.local`:

```env
USE_VERTEX_IMAGES=false
```

## 📊 Model Comparison

| Provider | Model | Quality | Speed | Cost |
|----------|-------|---------|-------|------|
| Vertex AI | Imagen 3 | ⭐⭐⭐⭐⭐ | Fast | Pay per use |
| Vertex AI | Imagen 2 | ⭐⭐⭐⭐ | Fast | Pay per use |
| HuggingFace | SDXL | ⭐⭐⭐⭐ | Medium | Free (rate limited) |
| HuggingFace | SD 1.5 | ⭐⭐⭐ | Fast | Free |

## 🎨 Features

### Vertex AI Imagen Advantages

- Higher quality and more photorealistic results
- Better prompt understanding
- Faster generation
- More consistent outputs
- Professional-grade results

### Hugging Face Advantages

- Free (with rate limits)
- Multiple model choices
- Good for development/testing
- No GCP account needed

## 🔍 Troubleshooting

### "VERTEX_PROJECT_ID environment variable is required"

Make sure `.env.local` has:
```env
VERTEX_PROJECT_ID=your-project-id
```

### "Invalid credentials"

Check that `GOOGLE_APPLICATION_CREDENTIALS` points to valid service account key.

### All Vertex models fail

System automatically falls back to Hugging Face. Check:
1. Service account has Vertex AI permissions
2. Imagen API is enabled in GCP project
3. Billing is enabled

## 🎉 Benefits

Using Vertex AI Imagen gives you:

1. **Higher quality images** - Imagen 3 is state-of-the-art
2. **Better reliability** - Enterprise-grade infrastructure
3. **Hackathon alignment** - Full Google Cloud stack
4. **Automatic fallback** - Never breaks, always generates
5. **Future-proof** - Latest models as Google releases them

Perfect for showcasing Google Cloud capabilities! 🚀
