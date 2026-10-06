// Database access (server only). Postgres via `pg` when DATABASE_URL is set (Railway); otherwise PGlite,
// an in-process Postgres, persisted under .data/ (or in memory for tests). Both expose the same tiny
// interface, so everything above this file is plain SQL with $1 parameters.
import { MIGRATIONS } from "./migrations";

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
  kind: "postgres" | "pglite";
}

let current: Promise<Db> | null = null;

async function open(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url, max: 5, ssl: /sslmode=require|railway\.app|rlwy\.net/.test(url) ? { rejectUnauthorized: false } : undefined });
    return {
      kind: "postgres",
      query: async (sql, params) => ({ rows: (await pool.query(sql, params)).rows }),
      close: () => pool.end(),
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  let dir = process.env.TIPPLA_DB === "memory" ? undefined : process.env.TIPPLA_DB_DIR ?? ".data/pglite";
  if (dir) {
    try {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(dir, { recursive: true });
    } catch {
      console.warn(`[db] can't write to ${dir}; using an in-memory database (data resets on restart)`);
      dir = undefined;
    }
  }
  const pg = dir ? new PGlite(dir) : new PGlite();
  return {
    kind: "pglite",
    query: async <T,>(sql: string, params?: unknown[]) => {
      // PGlite's query() runs one statement; exec() runs several (migrations) without parameters.
      if (!params?.length && sql.trim().replace(/;\s*$/, "").includes(";")) { await pg.exec(sql); return { rows: [] as T[] }; }
      return { rows: (await pg.query<T>(sql, params)).rows };
    },
    close: () => pg.close(),
  };
}

async function migrate(db: Db) {
  await db.query("CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const done = new Set((await db.query<{ id: string }>("SELECT id FROM migrations")).rows.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.query(m.sql);
    await db.query("INSERT INTO migrations (id) VALUES ($1)", [m.id]);
  }
}

/** The shared, migrated database for this process. */
export function db(): Promise<Db> {
  current ??= open().then(async (d) => { await migrate(d); return d; }).catch((e) => { current = null; throw e; });
  return current;
}

/** Tests: start from a fresh in-memory database. */
export async function resetDbForTests(): Promise<Db> {
  if (current) await (await current).close().catch(() => {});
  process.env.TIPPLA_DB = "memory";
  current = null;
  return db();
}
