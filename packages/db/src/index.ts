import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to configure the database connection?",
    );
  }

  return databaseUrl;
}

function shouldUseSsl(databaseUrl: string): boolean {
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname.toLowerCase();

    if (host === "localhost" || host === "127.0.0.1") {
      return false;
    }

    if (url.searchParams.get("sslmode") === "disable") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getPool() {
  if (!poolInstance) {
    const databaseUrl = getDatabaseUrl();

    poolInstance = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl(databaseUrl)
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
  }

  return poolInstance;
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }

  return dbInstance;
}

export * from "./schema";
