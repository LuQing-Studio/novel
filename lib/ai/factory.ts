import { AIService, AIProviderConfig } from './types';
import { OpenAIService } from './openai';
import { AnthropicService } from './anthropic';
import { GeminiService } from './gemini';

export class AIFactory {
  static createService(config: AIProviderConfig): AIService {
    switch (config.provider) {
      case 'openai':
        return new OpenAIService(config);
      case 'anthropic':
        return new AnthropicService(config);
      case 'gemini':
        return new GeminiService(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}

// Helper function to get AI service from environment variables
export function getAIService(): AIService {
  const provider = (process.env.AI_PROVIDER || 'anthropic') as AIProviderConfig['provider'];
  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL;
  const baseURL = process.env.AI_BASE_URL;

  if (!apiKey) {
    throw new Error('AI_API_KEY environment variable is required');
  }

  return AIFactory.createService({
    provider,
    apiKey,
    model,
    baseURL,
  });
}
