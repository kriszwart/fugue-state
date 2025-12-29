# ElevenLabs Voice Setup Guide

## Why Voice Isn't Working

The most common reason voice features aren't working is that the **ElevenLabs API key is not configured**.

## Setup Steps

1. **Get Your ElevenLabs API Key**
   - Sign up at https://elevenlabs.io
   - Go to your profile settings
   - Copy your API key

2. **Add to Environment Variables**
   - Open `.env.local` in the project root
   - Add: `ELEVENLABS_API_KEY=your_api_key_here`
   - Restart your development server

3. **Verify Configuration**
   - Visit `/api/tts/check` to verify the API key is configured
   - Should return: `{ "configured": true }`

## Features

- **Voice Button**: Click the volume icon on any Dameris message to hear it spoken
- **Auto-Voice Toggle**: Click the volume icon in the chat header to enable/disable auto-playback
- **Voice Selection**: Visit `/dameris.html` to try different voices and save your favorite

## Troubleshooting

### "ElevenLabs API key not configured"
- Add `ELEVENLABS_API_KEY` to your `.env.local` file
- Restart the dev server: `npm run dev`

### "Failed to generate speech"
- Check your API key is valid
- Verify you have credits/quota on your ElevenLabs account
- Check browser console for detailed error messages

### Voice button doesn't appear
- Ensure `/js/dameris-voice.js` is loaded
- Check browser console for JavaScript errors

## API Key Not Required

Voice features are **optional**. The app works perfectly without ElevenLabs - you just won't have voice synthesis. All other features (chat, memory analysis, image generation) work independently.

