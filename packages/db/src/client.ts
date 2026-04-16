import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const queryClient = postgres(process.env.DATABASE_URL, { max: 10 });

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;
