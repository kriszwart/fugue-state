#!/usr/bin/env node

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '.env.local') });

console.log('🔍 Vertex AI Comprehensive Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Configuration check
console.log('📋 Configuration Check:');
console.log(`  ✓ Project ID: ${process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID || '❌ MISSING'}`);
console.log(`  ✓ Location: ${process.env.VERTEX_LOCATION || 'us-central1 (default)'}`);
console.log(`  ✓ Service Account Key: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✓ Set' : '❌ MISSING'}`);
console.log(`  ✓ LLM Provider: ${process.env.LLM_PROVIDER || '❌ MISSING'}`);
console.log();

if (!process.env.VERTEX_PROJECT_ID && !process.env.GCP_PROJECT_ID) {
  console.error('❌ ERROR: VERTEX_PROJECT_ID or GCP_PROJECT_ID is required');
  process.exit(1);
}

// Vertex Gemini LLM Class (inline implementation)
class VertexGeminiLLM {
  constructor(config) {
    this.projectId = config.projectId;
    this.location = config.location;
    this.serviceAccountKey = config.serviceAccountKey;
    this.accessToken = null;
    this.tokenExpiry = 0;
  }

  async ensureAccessToken() {
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return;
    }

    // Try service account authentication first (for local development)
    if (this.serviceAccountKey) {
      try {
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          keyFilename: this.serviceAccountKey,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        if (tokenResponse.token) {
          this.accessToken = tokenResponse.token;
          this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour
          return;
        }
      } catch (error) {
        console.error('Failed to get access token from service account:', error);
        throw new Error('Failed to authenticate with service account key');
      }
    }

    // Fall back to metadata server (works on Cloud Run)
    try {
      const response = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: {
            'Metadata-Flavor': 'Google'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get access token from metadata server');
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    } catch (error) {
      console.error('Failed to get access token:', error);
      throw new Error('Failed to authenticate with Vertex AI. Ensure running on Google Cloud or provide service account key.');
    }
  }

  selectModel(model, modelType) {
    if (model) {
      return model;
    }

    if (modelType === 'thinking') {
      return process.env.GEMINI_THINKING_MODEL || 'gemini-2.0-flash-exp';
    } else if (modelType === 'chat') {
      return process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp';
    } else {
      // Auto: use flash for speed
      return process.env.GEMINI_CHAT_MODEL || 'gemini-2.0-flash-exp';
    }
  }

  formatMessages(messages) {
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const result = { contents };

    if (systemMessage) {
      result.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    return result;
  }

  async generateResponse(messages, options = {}) {
    // Select model
    const modelName = this.selectModel(options.model, options.modelType);

    // Ensure we have a valid access token
    await this.ensureAccessToken();

    // Format messages for Gemini API
    const { contents, systemInstruction } = this.formatMessages(messages);

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:generateContent`;

    const requestBody = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vertex AI API error:', error);
      throw new Error(`Vertex AI API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = data.usageMetadata || {};

    return {
      content,
      model: modelName,
      provider: 'vertex',
      usage: {
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
        totalTokens: usage.totalTokenCount
      }
    };
  }

  async *generateStreamingResponse(messages, options = {}) {
    // Select model
    const modelName = this.selectModel(options.model, options.modelType);

    // Ensure we have a valid access token
    await this.ensureAccessToken();

    // Format messages for Gemini API
    const { contents, systemInstruction } = this.formatMessages(messages);

    const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${modelName}:streamGenerateContent`;

    const requestBody = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      }
    };

    if (systemInstruction) {
      requestBody.systemInstruction = systemInstruction;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Vertex AI streaming error:', error);
      throw new Error(`Vertex AI streaming error: ${response.statusText}`);
    }

    // Process streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield { content: text, done: false, model: modelName };
              }
            } catch (e) {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }

      yield { content: '', done: true, model: modelName };
    } finally {
      reader.releaseLock();
    }
  }
}

async function testBasicGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 1: Basic Text Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || 'us-central1';
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const llm = new VertexGeminiLLM({
      projectId,
      location,
      serviceAccountKey
    });

    console.log('📤 Sending request to Vertex AI...');
    const messages = [
      { role: 'user', content: 'Say "Hello from Vertex AI!" and nothing else.' }
    ];

    const response = await llm.generateResponse(messages, {
      modelType: 'chat',
      temperature: 0.1,
      maxTokens: 100
    });

    console.log('✅ Response received!\n');
    console.log('📝 Response Details:');
    console.log(`  Model: ${response.model}`);
    console.log(`  Provider: ${response.provider}`);
    console.log(`  Content: "${response.content}"`);

    if (response.usage) {
      console.log(`  Usage:`);
      console.log(`    - Prompt tokens: ${response.usage.promptTokens || 'N/A'}`);
      console.log(`    - Completion tokens: ${response.usage.completionTokens || 'N/A'}`);
      console.log(`    - Total tokens: ${response.usage.totalTokens || 'N/A'}`);
    }

    console.log();
    return true;
  } catch (error) {
    console.error('❌ Test FAILED');
    console.error(`Error: ${error.message}\n`);
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    return false;
  }
}

async function testStreamingGeneration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 2: Streaming Text Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || 'us-central1';
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const llm = new VertexGeminiLLM({
      projectId,
      location,
      serviceAccountKey
    });

    console.log('📤 Sending streaming request to Vertex AI...');
    const messages = [
      { role: 'user', content: 'Count from 1 to 5, one number per line.' }
    ];

    console.log('📥 Streaming response:');
    console.log('─────────────────────────────────────────');

    let fullContent = '';
    let chunkCount = 0;

    for await (const chunk of llm.generateStreamingResponse(messages, {
      modelType: 'chat',
      temperature: 0.1,
      maxTokens: 100
    })) {
      if (!chunk.done && chunk.content) {
        process.stdout.write(chunk.content);
        fullContent += chunk.content;
        chunkCount++;
      }
    }

    console.log('\n─────────────────────────────────────────');
    console.log(`✅ Streaming complete! Received ${chunkCount} chunks`);
    console.log(`📝 Full content: "${fullContent.trim()}"\n`);

    return true;
  } catch (error) {
    console.error('❌ Test FAILED');
    console.error(`Error: ${error.message}\n`);
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    return false;
  }
}

async function testThinkingMode() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 Test 3: Thinking Mode (Advanced Reasoning)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const projectId = process.env.VERTEX_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const location = process.env.VERTEX_LOCATION || 'us-central1';
    const serviceAccountKey = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const llm = new VertexGeminiLLM({
      projectId,
      location,
      serviceAccountKey
    });

    console.log('📤 Sending complex reasoning request...');
    const messages = [
      { role: 'user', content: 'What is 15 + 27? Just give me the number.' }
    ];

    const response = await llm.generateResponse(messages, {
      modelType: 'thinking',
      temperature: 0.1,
      maxTokens: 100
    });

    console.log('✅ Response received!\n');
    console.log('📝 Response Details:');
    console.log(`  Model: ${response.model}`);
    console.log(`  Content: "${response.content}"`);
    console.log();

    return true;
  } catch (error) {
    console.error('❌ Test FAILED');
    console.error(`Error: ${error.message}\n`);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting comprehensive Vertex AI tests...\n');

  const results = {
    basic: await testBasicGeneration(),
    streaming: await testStreamingGeneration(),
    thinking: await testThinkingMode()
  };

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`  Basic Generation:     ${results.basic ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Streaming:            ${results.streaming ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Thinking Mode:        ${results.thinking ? '✅ PASSED' : '❌ FAILED'}`);

  const totalPassed = Object.values(results).filter(r => r).length;
  const totalTests = Object.values(results).length;

  console.log();
  console.log(`  Total: ${totalPassed}/${totalTests} tests passed`);
  console.log();

  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! Vertex AI is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  process.exit(totalPassed === totalTests ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
