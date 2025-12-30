import { CHAT_MODELS, THINKING_MODELS } from './huggingface'
import type { LLMModel } from '../llm-service'

export function selectRandomModel(): string {
  return CHAT_MODELS[Math.floor(Math.random() * CHAT_MODELS.length)]?.name || CHAT_MODELS[0]?.name || ''
}

export function selectRandomThinkingModel(): string {
  return THINKING_MODELS[Math.floor(Math.random() * THINKING_MODELS.length)]?.name || THINKING_MODELS[0]?.name || ''
}

export function selectRandomChatModel(): string {
  return CHAT_MODELS[Math.floor(Math.random() * CHAT_MODELS.length)]?.name || CHAT_MODELS[0]?.name || ''
}

export function selectRandomModelWithWeights(weights?: Record<LLMModel, number>): LLMModel {
  if (!weights) {
    return selectRandomModel()
  }

  const models = Object.keys(weights) as LLMModel[]
  const totalWeight = models.reduce((sum, model) => sum + (weights[model] || 0), 0)
  let random = Math.random() * totalWeight

  for (const model of models) {
    random -= weights[model] || 0
    if (random <= 0) {
      return model
    }
  }

  return models[0] || ''
}

