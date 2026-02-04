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

export interface DocumentUploadResponse {
  message?: string;
  status?: string;
  doc_id?: string;
  docId?: string;
}

export interface DocumentStatusResponse {
  total_documents: number;
  indexed_documents: number;
  pending_documents: number;
}

interface StatusCountsResponse {
  status_counts: Record<string, number>;
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
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (this.config.apiKey) {
      headers.set('X-API-Key', this.config.apiKey);
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

  async uploadDocument(request: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    return this.request<DocumentUploadResponse>('/documents/text', {
      method: 'POST',
      body: JSON.stringify({
        text: request.content,
        description: request.description
      }),
    });
  }

  async getDocumentStatus(): Promise<DocumentStatusResponse> {
    try {
      const { status_counts: rawCounts } = await this.request<StatusCountsResponse>(
        '/documents/status_counts',
        { method: 'GET' }
      );

      const counts = Object.fromEntries(
        Object.entries(rawCounts).map(([key, value]) => [key.toLowerCase(), value])
      );

      const total =
        typeof counts.all === 'number'
          ? counts.all
          : Object.entries(counts)
              .filter(([key]) => key !== 'all')
              .reduce((sum, [, value]) => sum + value, 0);

      const processed = counts.processed ?? 0;

      return {
        total_documents: total,
        indexed_documents: processed,
        pending_documents: Math.max(0, total - processed),
      };
    } catch (error) {
      // Backward compatibility for older LightRAG versions.
      if (error instanceof Error && error.message.includes('404')) {
        return this.request<DocumentStatusResponse>('/documents/status', {
          method: 'GET',
        });
      }
      throw error;
    }
  }

  async deleteDocument(docId: string): Promise<{ message: string }> {
    try {
      const response = await this.request<{ message?: string; status?: string }>(
        '/documents/delete_document',
        {
          method: 'DELETE',
          body: JSON.stringify({ doc_ids: [docId] }),
        }
      );
      return { message: response.message || response.status || 'ok' };
    } catch (error) {
      // Backward compatibility for older LightRAG versions.
      if (error instanceof Error && error.message.includes('404')) {
        return this.request<{ message: string }>(`/documents/${docId}`, {
          method: 'DELETE',
        });
      }
      throw error;
    }
  }

  async health(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health', {
      method: 'GET',
    });
  }
}

function createClientFromEnv(options: {
  baseUrlEnv: string;
  apiKeyEnv: string;
  defaultBaseURL: string;
}): LightRAGClient {
  const baseURL = process.env[options.baseUrlEnv] || options.defaultBaseURL;
  const apiKey = process.env[options.apiKeyEnv];

  return new LightRAGClient({ baseURL, apiKey });
}

// Story RAG (剧情记忆) client
export function getStoryRAGClient(): LightRAGClient {
  return createClientFromEnv({
    baseUrlEnv: 'LIGHTRAG_BASE_URL',
    apiKeyEnv: 'LIGHTRAG_API_KEY',
    defaultBaseURL: 'http://localhost:9621',
  });
}

// Tech RAG (技法库) client
export function getTechRAGClient(): LightRAGClient {
  return createClientFromEnv({
    baseUrlEnv: 'LIGHTRAG_TECH_BASE_URL',
    apiKeyEnv: 'LIGHTRAG_TECH_API_KEY',
    defaultBaseURL: 'http://localhost:9622',
  });
}

// Backward-compatible alias (defaults to Story RAG)
export function getLightRAGClient(): LightRAGClient {
  return getStoryRAGClient();
}
