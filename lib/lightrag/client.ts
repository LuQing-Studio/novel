/**
 * LightRAG API Client
 * 用于与 LightRAG 服务进行通信
 */

export interface LightRAGConfig {
  baseURL: string;
  apiKey?: string;
}

export interface QueryRequest {
  query: string;
  mode?: 'local' | 'global' | 'hybrid' | 'naive' | 'mix';
  only_need_context?: boolean;
  only_need_prompt?: boolean;
}

export interface QueryResponse {
  response: string;
  context?: string;
  prompt?: string;
}

export interface DocumentUploadRequest {
  content: string;
  description?: string;
}

export interface DocumentStatusResponse {
  total_documents: number;
  indexed_documents: number;
  pending_documents: number;
}

export class LightRAGClient {
  private config: LightRAGConfig;

  constructor(config: LightRAGConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LightRAG API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async query(request: QueryRequest): Promise<QueryResponse> {
    return this.request<QueryResponse>('/query', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async uploadDocument(request: DocumentUploadRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/documents/upload', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getDocumentStatus(): Promise<DocumentStatusResponse> {
    return this.request<DocumentStatusResponse>('/documents/status', {
      method: 'GET',
    });
  }

  async deleteDocument(docId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${docId}`, {
      method: 'DELETE',
    });
  }

  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health', {
      method: 'GET',
    });
  }
}

// Helper function to get LightRAG client from environment variables
export function getLightRAGClient(): LightRAGClient {
  const baseURL = process.env.LIGHTRAG_BASE_URL || 'http://localhost:9621';
  const apiKey = process.env.LIGHTRAG_API_KEY;

  return new LightRAGClient({
    baseURL,
    apiKey,
  });
}
