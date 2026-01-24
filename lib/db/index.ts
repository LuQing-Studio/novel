import { Pool } from 'pg';

let pool: Pool | null = null;

declare global {
  var __novelPgPool: Pool | undefined;
}

function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function camelizeRow(row: unknown): unknown {
  if (!isRecord(row)) return row;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    result[toCamelCase(key)] = value;
  }
  return result;
}

export function getPool(): Pool {
  const config = {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/novle',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
  };

  if (process.env.NODE_ENV !== 'production') {
    if (!globalThis.__novelPgPool) {
      globalThis.__novelPgPool = new Pool(config);
    }
    return globalThis.__novelPgPool;
  }

  if (!pool) {
    pool = new Pool(config);
  }

  return pool;
}

export async function query<T = unknown>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<T[]> {
  const pool = getPool();
  const result = params
    ? await pool.query(text, Array.from(params))
    : await pool.query(text);

  return result.rows.map((row) => camelizeRow(row) as T);
}

export async function queryOne<T = unknown>(
  text: string,
  params?: ReadonlyArray<unknown>
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}
