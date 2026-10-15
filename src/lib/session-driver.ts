import pg from 'pg';

/**
 * Astro session storage in Postgres, for EmDash's admin logins on Vercel (see astro.config.mjs).
 * It keeps them in the site's own EU database instead of a separate key-value service. The
 * connection comes from the PG* environment variables, read when the server runs.
 */

/** A session nobody has used for this long is deleted (see `purgeSessions`). */
const MAX_IDLE_DAYS = 30;

let pool: pg.Pool | undefined;
let ready: Promise<unknown> | undefined;

function connect(): pg.Pool {
  pool ??= new pg.Pool({ max: 2, connectionTimeoutMillis: 10_000 });
  ready ??= pool.query(
    `CREATE TABLE IF NOT EXISTS astro_sessions (
       key text PRIMARY KEY,
       value text NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  return pool;
}

async function query(text: string, values: unknown[] = []) {
  const db = connect();
  await ready;
  return db.query(text, values);
}

/** Deletes sessions idle for longer than MAX_IDLE_DAYS. Run by the hourly housekeeping job. */
export async function purgeSessions(): Promise<number> {
  const result = await query(
    `DELETE FROM astro_sessions WHERE updated_at < now() - make_interval(days => $1)`,
    [MAX_IDLE_DAYS],
  );
  return result.rowCount ?? 0;
}

export default function postgresSessionDriver() {
  return {
    async getItem(key: string) {
      const result = await query(`SELECT value FROM astro_sessions WHERE key = $1`, [key]);
      return result.rows[0]?.value ?? null;
    },
    async setItem(key: string, value: unknown) {
      await query(
        `INSERT INTO astro_sessions (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, typeof value === 'string' ? value : JSON.stringify(value)],
      );
    },
    async removeItem(key: string) {
      await query(`DELETE FROM astro_sessions WHERE key = $1`, [key]);
    },
  };
}
