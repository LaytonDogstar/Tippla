// Schema migrations, applied in order on first use and recorded in `migrations`. Append only: never edit
// a migration that has shipped; add a new one.
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_analytics_events",
    sql: `
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        event TEXT NOT NULL,
        member_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        ts TIMESTAMPTZ NOT NULL,
        props JSONB NOT NULL DEFAULT '{}'::jsonb,
        app_version TEXT NOT NULL,
        platform TEXT NOT NULL,
        flags TEXT[] NOT NULL DEFAULT '{}',
        seeded BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS analytics_events_event_ts ON analytics_events (event, ts);
      CREATE INDEX IF NOT EXISTS analytics_events_member_ts ON analytics_events (member_id, ts);
    `,
  },
];
