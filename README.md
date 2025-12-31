# FugueState.ai

**An experiment in memory, creativity, and machine dreaming.**

FugueState is an AI-powered creative companion built with **Google Vertex AI (Gemini 2.0)** that analyses your entire body of work—poems, stories, notes, emails—to reveal patterns, themes, and psychological threads you didn't even know were there. Built on neuroscience principles of memory consolidation and retrieval, FugueState uses Google's latest AI models to help you rediscover and reimagine your creative past.

## 🎬 Demo Video

**[Link to your 3-minute demo video here]**

## ✨ Features

- **Deep Memory Analysis**: Upload your creative work and get a comprehensive "First Scan" analysis revealing patterns, themes, and insights
- **AI Muse Personalities**: Choose from 5 different muse modes (Poet, Analyst, Visualist, Narrator, Synthesis) that adapt Dameris's communication style
- **Voice-First Interface**: Speak with Dameris using ElevenLabs TTS and Google Cloud Speech-to-Text
- **Real-Time Processing**: Redis-powered caching, rate limiting, and live chat streams for instant responses
- **Creative Modes**: Generate poems, visualisations, curated collections, and journal entries from your memories
- **Multi-Source Integration**: Connect Gmail, Google Drive, Notion, or upload files directly
- **Privacy-First**: Your data stays yours. No tracking, no selling, no surveillance capitalism

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- **Google Cloud Platform account** with billing enabled (required for Vertex AI)
- **Vertex AI API enabled** in your GCP project
- **Speech-to-Text API enabled** in your GCP project
- A Supabase account (free tier available)
- ElevenLabs API key (for voice synthesis)
- Redis instance (optional but recommended - free tier available on Redis Cloud)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fugue-state.git
   cd fugue-state
   ```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
```bash
cp .env.local.example .env.local
```

   Fill in your environment variables:

```env
   # Google Cloud Configuration (REQUIRED)
   # Set up Vertex AI: https://console.cloud.google.com/vertex-ai
   LLM_PROVIDER=vertex
   VERTEX_PROJECT_ID=your-gcp-project-id
   VERTEX_LOCATION=us-central1
   
   # For local development:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   # For production (Vercel/Cloud Run):
   # GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
   
   # Google Cloud Speech-to-Text (REQUIRED for voice features)
   GOOGLE_STT_LANGUAGE=en-US
   
   # Google OAuth (for Gmail/Drive integration)
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # ElevenLabs API (for voice synthesis)
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

   # Optional Integrations
   NOTION_CLIENT_ID=your_notion_client_id
   NOTION_CLIENT_SECRET=your_notion_client_secret

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Security
   ENCRYPTION_KEY=your_encryption_key_here  # Generate with: openssl rand -hex 32
   API_KEY=your_api_key_here

   # Redis Configuration (optional but recommended)
   REDIS_URL=redis://localhost:6379
   ```

4. **Set up Google Cloud Platform (REQUIRED)**

   This project is built on **Google Vertex AI (Gemini 2.0)** and requires GCP setup:
   
   **a. Create GCP Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable billing (required for Vertex AI)
   
   **b. Enable Required APIs**
   ```bash
   gcloud services enable aiplatform.googleapis.com --project=your-project-id
   gcloud services enable speech.googleapis.com --project=your-project-id
   ```
   Or enable via [Cloud Console](https://console.cloud.google.com/apis/library)
   
   **c. Create Service Account**
   ```bash
   gcloud iam service-accounts create fuguestate-sa \
     --display-name="FugueState Service Account" \
     --project=your-project-id
   
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:fuguestate-sa@your-project-id.iam.gserviceaccount.com" \
     --role="roles/aiplatform.user"
   
   gcloud projects add-iam-policy-binding your-project-id \
     --member="serviceAccount:fuguestate-sa@your-project-id.iam.gserviceaccount.com" \
     --role="roles/speech.client"
   ```
   
   **d. Download Service Account Key**
   ```bash
   gcloud iam service-accounts keys create service-account-key.json \
     --iam-account=fuguestate-sa@your-project-id.iam.gserviceaccount.com
   ```
   
   **e. Set Environment Variables**
   - Add `VERTEX_PROJECT_ID=your-project-id` to `.env.local`
   - Add `VERTEX_LOCATION=us-central1` (or your preferred region)
   - Add `GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json`
   
   See `docs/VERTEX_AI_SETUP.md` for detailed instructions.

5. **Set up Supabase**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the migration in `supabase/migrations/001_initial_schema.sql` in the SQL Editor
   - Enable Storage and create a bucket named `artefacts` with public access
   - Copy your project URL and keys to `.env.local`

6. **Set up Redis (optional but recommended)**

   **Option A: Local Installation**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Linux
   sudo apt-get install redis-server
   sudo systemctl start redis-server
   ```

   **Option B: Redis Cloud (Free tier)**
   - Sign up at [redis.com/try-free](https://redis.com/try-free/)
   - Create a database and copy the connection URL to `REDIS_URL`

   **Option C: Docker**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:latest
   ```

7. **Generate encryption key**
   ```bash
   openssl rand -hex 32
   ```
   Add the output to `ENCRYPTION_KEY` in `.env.local`

8. **Run the development server**
```bash
npm run dev
```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Technologies Used

### Google Cloud Products (Primary)
- **Google Vertex AI (Gemini 2.0)** - Primary LLM for deep memory analysis, pattern detection, and creative generation
- **Google Cloud Speech-to-Text** - Real-time voice input transcription
- **Google OAuth** - Gmail and Google Drive integration for data source connections
- **Google Cloud Platform** - Infrastructure and deployment (Cloud Run compatible)

### AI & Machine Learning
- **Gemini 2.0 Flash Experimental** - Advanced reasoning and analysis capabilities
- **Vertex AI Gemini Models** - Multi-modal understanding and generation
- **ElevenLabs** - Text-to-speech voice synthesis (complements Google STT)

### Infrastructure & Performance
- **Redis** - Real-time caching, rate limiting, chat streams, and analytics
- **Supabase** - PostgreSQL database and authentication
- **Next.js 14** - React framework with App Router

### Additional Integrations
- **Notion OAuth** - Notion workspace integration
- **Model Context Protocol (MCP)** - Custom agent connections

## 📁 Project Structure

```
fugue-state/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── voice/             # Voice interface page
│   ├── studio/            # Studio workspace
│   └── components/        # React components
├── lib/                   # Core libraries
│   ├── ai/               # LLM service and providers
│   ├── data-sources/     # OAuth and MCP connectors
│   └── redis.ts          # Redis utilities
├── public/                # Static assets
├── supabase/
│   └── migrations/       # Database migrations
└── docs/                  # Additional documentation
```

## 🔧 Configuration

### Required Environment Variables

**Google Cloud (REQUIRED):**
- `LLM_PROVIDER=vertex` - Must be set to 'vertex' to use Gemini 2.0
- `VERTEX_PROJECT_ID` - Your GCP project ID
- `VERTEX_LOCATION` - GCP region (e.g., us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account key (local development)
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Service account JSON string (production/Vercel)

**Supabase (REQUIRED):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Voice Features:**
- `ELEVENLABS_API_KEY` - For text-to-speech
- `GOOGLE_STT_LANGUAGE` - Speech-to-text language (default: en-US)

**Recommended:**
- `REDIS_URL` - For caching and real-time features
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - For Gmail/Drive OAuth integration

See `SETUP.md` for detailed configuration instructions.

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📚 Documentation

- **Setup Guide**: `SETUP.md`
- **Vertex AI Setup**: `docs/VERTEX_AI_SETUP.md`
- **Redis Features**: `REDIS_FEATURES.md`
- **Database Setup**: `DATABASE-SETUP.md`
- **Voice Setup**: `VOICE_SETUP.md`
- **Deployment**: `CLOUD_RUN_DEPLOYMENT.md` and `GITHUB_DEPLOYMENT.md`

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables
4. Deploy

See `GITHUB_DEPLOYMENT.md` for detailed instructions.

### Google Cloud Run

See `CLOUD_RUN_DEPLOYMENT.md` for step-by-step Cloud Run deployment.

## 🎯 Key Features Explained

### Powered by Google Vertex AI (Gemini 2.0)
FugueState leverages **Google's Gemini 2.0 Flash Experimental** model for:
- **Deep Memory Analysis**: Full-collection pattern detection and cognitive analysis
- **Multi-Modal Understanding**: Processes text, context, and relationships simultaneously
- **Advanced Reasoning**: Finds connections across thousands of pieces of creative work
- **Real-Time Processing**: Fast, responsive analysis even with large datasets

### First Scan Analysis
Upload your creative work and FugueState uses **Gemini 2.0** to perform a deep cognitive analysis, detecting patterns and connections across your entire collection—just like your brain does during REM sleep when consolidating memories.

### Voice Interface with Google Cloud
- **Google Cloud Speech-to-Text**: Real-time voice input transcription
- **ElevenLabs TTS**: Natural voice synthesis for Dameris's responses
- **Seamless Integration**: Voice-first interface powered by Google's speech recognition

### Muse Personalities
Choose from 5 different muse modes powered by Gemini 2.0 that adapt how Dameris communicates:
- **Poet**: Lyrical, metaphorical, beautiful
- **Analyst**: Pattern-forward, structured, insightful
- **Visualist**: Cinematic, descriptive, vivid
- **Narrator**: Storytelling, dramatic, engaging
- **Synthesis**: Multi-faceted, holistic, wise

### Real-Time Processing
Redis powers:
- Intelligent caching (60-80% reduction in API calls to Vertex AI)
- Rate limiting (protects Google Cloud endpoints)
- Live chat streams (sub-10ms message delivery)
- Analytics and metrics tracking

## 🤝 Contributing

This is an open-source project. Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **AI powered by [Google Vertex AI (Gemini 2.0)](https://cloud.google.com/vertex-ai)** - Core LLM and reasoning engine
- **Voice powered by [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text)** - Real-time transcription
- Built with [Next.js](https://nextjs.org/)
- Voice synthesis by [ElevenLabs](https://elevenlabs.io)
- Database and auth by [Supabase](https://supabase.com)
- Caching and real-time features by [Redis](https://redis.io)

## 🏆 Built for Google Cloud Hackathon

This project demonstrates the power of **Google Vertex AI (Gemini 2.0)** for creative AI applications, combining:
- **Gemini 2.0's advanced reasoning** for deep memory analysis
- **Google Cloud Speech-to-Text** for voice-first interaction
- **Google OAuth** for seamless data source integration
- **Redis** for real-time performance optimization

See how Google Cloud products enable a complete AI creative companion experience.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built for the intersection of data and desire. An experiment in collective recollection.**
