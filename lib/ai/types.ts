// AI Provider types
export type AIProvider = 'openai' | 'anthropic' | 'gemini';

// Common message format
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// AI Request
export interface AIRequest {
  messages: ReadonlyArray<Message>;
  temperature?: number;
  maxTokens?: number;
}

// AI Response
export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// AI Provider Config
export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

// AI Service Interface
export interface AIService {
  generate(request: AIRequest): Promise<AIResponse>;
  stream(request: AIRequest): AsyncIterable<string>;
}
