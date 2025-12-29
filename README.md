# Fugue State

An experiment in memory, creativity, and machine dreaming.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your environment variables (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `HUGGINGFACE_API_KEY` - Your Hugging Face Pro API key (format: `hf_...`)
- `ELEVENLABS_API_KEY` - Your ElevenLabs API key for voice synthesis (optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Gmail/Drive OAuth
- `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` - For Notion OAuth
- `ENCRYPTION_KEY` - Generate with: `openssl rand -hex 32`
- `API_KEY` - For public API access

**Important**: Add your Hugging Face API key to `.env.local`:
```env
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

3. Set up Supabase:
- Run the migration in `supabase/migrations/001_initial_schema.sql`
- Enable Storage and create a bucket named `artefacts`
- Set up Row Level Security policies (included in migration)

4. Run the development server:
```bash
npm run dev
```

## Features

- **Multi-LLM Chat**: Random model selection from Hugging Face models
- **Data Source Connectors**: Gmail, Google Drive, Notion, MCP, Local files
- **Memory Analysis**: Pattern detection and neural threading
- **Image Generation**: Hugging Face Stable Diffusion models
- **Export**: JSON, Markdown, and ZIP formats
- **Privacy Hub**: Data source management and memory deletion

## Architecture

- **Frontend**: Next.js 14 with React
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **AI**: Hugging Face Inference API
- **Storage**: Supabase Storage

## API Endpoints

- `POST /api/auth` - Authentication
- `POST /api/chat` - Chat with Dameris
- `GET /api/memories` - Get memories
- `POST /api/generate/image` - Generate images
- `GET /api/export` - Export data
- `GET /api/oauth/connect` - OAuth connection
- `GET /api/oauth/callback` - OAuth callback

## License

ISC

