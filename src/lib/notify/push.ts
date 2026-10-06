// Web Push (spec 10, flag push_v1). VAPID keys come from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY; without them
// a key pair is generated once and kept in the database, so a demo deploy works with no setup (but
// subscriptions stop working if the database is reset). Server only.
import webpush from "web-push";
import { db } from "@/lib/db";

export interface PushPayload { title: string; body: string; url: string; tag: string }
export interface StoredSubscription { endpoint: string; p256dh: string; auth: string }
type Sender = (sub: StoredSubscription, payload: PushPayload) => Promise<{ ok: boolean; gone?: boolean }>;

let keys: Promise<{ publicKey: string; privateKey: string }> | null = null;

export function vapidKeys() {
  keys ??= (async () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    const d = await db();
    const row = (await d.query<{ value: string }>("SELECT value FROM app_settings WHERE key = 'vapid'")).rows[0];
    if (row) return JSON.parse(row.value) as { publicKey: string; privateKey: string };
    const k = webpush.generateVAPIDKeys();
    await d.query("INSERT INTO app_settings (key, value) VALUES ('vapid', $1) ON CONFLICT (key) DO NOTHING", [JSON.stringify(k)]);
    return (JSON.parse((await d.query<{ value: string }>("SELECT value FROM app_settings WHERE key = 'vapid'")).rows[0]!.value)) as { publicKey: string; privateKey: string };
  })().catch((e) => { keys = null; throw e; });
  return keys;
}

const webPushSender: Sender = async (sub, payload) => {
  const { publicKey, privateKey } = await vapidKeys();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      TTL: 60 * 60 * 12,
      vapidDetails: { subject: process.env.VAPID_SUBJECT ?? "mailto:support@tippla.example", publicKey, privateKey },
    });
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
};

let sender: Sender = webPushSender;
/** Tests: capture pushes instead of sending them. */
export function setPushSender(s: Sender | null) { sender = s ?? webPushSender; }

export async function saveSubscription(member: string, sub: StoredSubscription, platform: string) {
  const d = await db();
  await d.query(`INSERT INTO push_subscriptions (member_id, endpoint, p256dh, auth, platform) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (endpoint) DO UPDATE SET member_id = EXCLUDED.member_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, platform = EXCLUDED.platform`,
  [member, sub.endpoint, sub.p256dh, sub.auth, platform]);
}

export async function removeSubscription(endpoint: string) {
  await (await db()).query("DELETE FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
}

export async function subscriptionsFor(member: string): Promise<StoredSubscription[]> {
  return (await (await db()).query<StoredSubscription>("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE member_id = $1", [member])).rows;
}

/** Send to every device the member has turned on. Expired subscriptions are removed. Returns devices reached. */
export async function sendPush(member: string, payload: PushPayload): Promise<{ devices: number; delivered: number }> {
  const subs = await subscriptionsFor(member);
  let delivered = 0;
  for (const s of subs) {
    const r = await sender(s, payload);
    if (r.ok) delivered++;
    else if (r.gone) await removeSubscription(s.endpoint);
  }
  return { devices: subs.length, delivered };
}
