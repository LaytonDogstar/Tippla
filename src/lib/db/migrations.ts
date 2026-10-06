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
  {
    id: "002_billing_events",
    sql: `
      CREATE TABLE IF NOT EXISTS billing_events (
        id BIGSERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        type TEXT NOT NULL,
        from_date DATE,
        to_date DATE,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS billing_events_once ON billing_events (member_id, type, from_date, to_date);
    `,
  },
  {
    id: "003_notifications",
    sql: `
      CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id BIGSERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        platform TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        key TEXT NOT NULL,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        send_after TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ,
        opened_at TIMESTAMPTZ,
        actioned_at TIMESTAMPTZ,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        href TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS notifications_once ON notifications (member_id, key, channel);
      CREATE TABLE IF NOT EXISTS email_outbox (
        id BIGSERIAL PRIMARY KEY,
        member_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        to_address TEXT NOT NULL,
        subject TEXT NOT NULL,
        text_body TEXT NOT NULL,
        html_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS email_unsubscribes (
        member_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (member_id, kind)
      );
    `,
  },
  {
    // Spec 05: anonymised corrections for the categorisation team (no member id; gate G3), and daily
    // forecast snapshots compared with the actual balance once the date passes.
    id: "004_data_trust",
    sql: `
      CREATE TABLE IF NOT EXISTS correction_reports (
        id BIGSERIAL PRIMARY KEY,
        entity TEXT NOT NULL,
        correction TEXT NOT NULL,
        merchant TEXT NOT NULL,
        from_category TEXT,
        to_category TEXT,
        reported_on DATE NOT NULL DEFAULT CURRENT_DATE
      );
      CREATE TABLE IF NOT EXISTS forecast_snapshots (
        member_id TEXT NOT NULL,
        made_on DATE NOT NULL,
        for_date DATE NOT NULL,
        horizon INT NOT NULL,
        predicted NUMERIC(12, 2) NOT NULL,
        actual NUMERIC(12, 2),
        PRIMARY KEY (member_id, made_on, for_date)
      );
    `,
  },
];
