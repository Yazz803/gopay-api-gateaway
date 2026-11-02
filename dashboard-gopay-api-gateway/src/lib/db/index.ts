import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let client: postgres.Sql | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const url = getDatabaseUrl();
  if (!url) {
    // Return null or throw if actually called in runtime query
    return null;
  }

  if (!client) {
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: url.includes('sslmode=require') || url.includes('neon.tech') ? 'require' : undefined,
    });
  }

  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

export { schema };
export const db = getDb();
