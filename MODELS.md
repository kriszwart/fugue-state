# Fugue State Model Architecture

## Model Strategy Overview

Fugue State uses a multi-model approach with specialized models for different tasks, ensuring optimal performance for each use case.

## Model Categories

### 1. Thinking Models (Memory Analysis & Pattern Detection)

**Purpose**: Deep reasoning, pattern detection, memory analysis, and finding hidden connections.

**Models Used** (selected randomly for variety):
- `meta-llama/Llama-3.1-70B-Instruct` - Best reasoning, 70B parameters
- `Qwen/Qwen2.5-72B-Instruct` - Excellent analytical capabilities
- `mistralai/Mixtral-8x7B-Instruct-v0.1` - Mixture of experts, great for complex analysis
- `deepseek-ai/DeepSeek-Coder-33B-instruct` - Strong logical reasoning
- `meta-llama/Llama-3.1-8B-Instruct` - Fast, good reasoning

**When Used**:
- Analyzing memories for patterns
- Detecting emotional and thematic connections
- Neural threading (connecting disparate memories)
- Deep reasoning about user's digital life
- Pattern detection and insight generation

**Temperature**: 0.3 (lower for more consistent, analytical responses)

### 2. Chat Models (Conversational Responses)

**Purpose**: Natural, empathetic conversations with Dameris.

**Models Used** (selected randomly for unique responses):
- `meta-llama/Llama-3.1-8B-Instruct` - Fast, natural conversations
- `mistralai/Mistral-7B-Instruct-v0.2` - Great for empathetic dialogue
- `Qwen/Qwen2.5-7B-Instruct` - Balanced conversational ability
- `google/gemma-2-9b-it` - Google's latest, excellent chat
- `microsoft/Phi-3-mini-4k-instruct` - Small but capable

**When Used**:
- User conversations with Dameris
- Chat responses in workspace
- Conversational interactions
- Empathetic dialogue

**Temperature**: 0.7 (balanced for natural, varied responses)

**Key Feature**: "Multiple AI models selected at random, ensuring each response is unique and non-generic."

### 3. Image Generation Models

**Premium Models** (best quality, used by default):
- `black-forest-labs/FLUX.1-dev` - **Best overall quality**, state-of-the-art
- `stabilityai/stable-diffusion-xl-base-1.0` - SDXL, excellent quality
- `playgroundai/playground-v2.5-1024px-aesthetic` - High aesthetic quality
- `stabilityai/sdxl-turbo` - Fast SDXL variant

**Standard Models** (faster, good quality):
- `runwayml/stable-diffusion-v1-5`
- `CompVis/stable-diffusion-v1-4`
- `stabilityai/stable-diffusion-2-1`

**When Used**:
- Generating images from memories
- Visualise mode
- Creating artefacts from memory descriptions
- Memory visualization

**Selection**: Random from premium models for best quality

## Model Selection Flow

### Chat Flow
1. User sends message
2. System loads conversation history and relevant memories
3. **Chat model** selected randomly from CHAT_MODELS
4. Response generated with memory context
5. Response saved to database

### Memory Analysis Flow
1. Memories are collected from data sources
2. **Thinking model** selected randomly from THINKING_MODELS
3. Deep analysis performed:
   - Emotional pattern detection
   - Thematic connections
   - Temporal relationships
   - Hidden narratives
4. Patterns saved to database
5. Insights generated

### Image Generation Flow
1. User requests image from memory
2. Memory description prepared
3. **Premium image model** selected randomly from PREMIUM_IMAGE_MODELS
4. Image generated with high quality settings
5. Image saved to Supabase Storage
6. Artefact record created

## Why Multiple Models?

1. **Uniqueness**: Random model selection ensures no two responses are identical
2. **Specialization**: Right model for the right task
3. **Resilience**: If one model fails, others are available
4. **Quality**: Best models for each use case
5. **Variety**: Different models bring different perspectives

## Configuration

All models are configured in:
- `lib/ai/providers/huggingface.ts` - Text models
- `lib/generation/image-service.ts` - Image models

## Model Usage Tracking

Each generated response/image includes:
- Model name used
- Provider (huggingface)
- Token usage (for text)
- Generation parameters

This is stored in:
- `messages.metadata` - For chat messages
- `artefacts.metadata` - For generated images
























