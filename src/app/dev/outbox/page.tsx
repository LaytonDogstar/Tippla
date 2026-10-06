// Dev-only: what the notification service has done (spec 10). The notification log per persona (sent,
// held for quiet hours, kept in the inbox and why, blocked) and the email outbox (no provider connected yet).
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { loadPersona, PERSONAS } from "@/lib/api/client";
import { outbox } from "@/lib/notify/email";
import { dispatch, notificationLog } from "@/lib/notify/service";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

async function runDispatch() {
  "use server";
  for (const id of PERSONAS) await dispatch(id, (await loadPersona(id, { latencyMs: 0 })).data, {});
  revalidatePath("/dev/outbox");
}
async function clearAll() {
  "use server";
  const d = await db();
  await d.query("DELETE FROM notifications"); await d.query("DELETE FROM email_outbox");
  revalidatePath("/dev/outbox");
}

export default async function OutboxPage() {
  const logs = await Promise.all(PERSONAS.map(async (id) => [id, await notificationLog(id)] as const));
  const mail = await outbox();
  const devices = (await (await db()).query<{ member_id: string; n: string }>("SELECT member_id, count(*) AS n FROM push_subscriptions GROUP BY member_id")).rows;
  const cell = "border-t border-line p-t2 text-left align-top";
  return (
    <main id="main" className="min-h-[100dvh] bg-bg px-gutter py-t6 text-text">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-t6">
        <header className="flex flex-wrap items-start justify-between gap-t3">
          <div>
            <h1 className="text-h1 font-display">Notifications and email</h1>
            <p className="mt-t1 text-small text-text-muted">Push devices: {devices.length ? devices.map((r) => `${r.member_id} ${r.n}`).join(", ") : "none yet (turn on in Account › Profile)"}. Email isn&apos;t sent anywhere yet: it lands here.</p>
          </div>
          <div className="flex gap-t2">
            <form action={runDispatch}><button type="submit" className="min-h-tap rounded-sm bg-surface px-t4 text-small text-accent hover:bg-surface2">Run dispatch now</button></form>
            <form action={clearAll}><button type="submit" className="min-h-tap rounded-sm bg-surface px-t4 text-small text-accent hover:bg-surface2">Clear log and outbox</button></form>
          </div>
        </header>
        {logs.map(([id, rows]) => (
          <section key={id} aria-labelledby={`log-${id}`} className="rounded-lg bg-surface p-t5">
            <h2 id={`log-${id}`} className="text-h2 font-display capitalize">{id}</h2>
            {rows.length ? (
              <div className="mt-t3 overflow-x-auto" tabIndex={0} role="region" aria-label={`${id} notification log (scrolls sideways)`}>
                <table className="w-full text-small">
                  <thead className="text-caption text-text-muted"><tr>{["Key", "Priority", "Channel", "Status", "Why", "Send after", "Sent", "Title"].map((h) => <th key={h} scope="col" className="p-t2 text-left font-normal">{h}</th>)}</tr></thead>
                  <tbody>{rows.map((r) => (
                    <tr key={r.key + r.channel}>
                      <td className={cell}><code>{r.key}</code></td><td className={cell}>{r.priority}</td><td className={cell}>{r.channel}</td>
                      <td className={cell}>{r.status}</td><td className={cell}>{r.reason ?? ""}</td><td className={cell}>{r.send_after.slice(0, 16)}</td>
                      <td className={cell}>{r.sent_at?.slice(0, 16) ?? ""}</td><td className={cell}>{r.title}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="mt-t2 text-small text-text-muted">Nothing yet. Run dispatch.</p>}
          </section>
        ))}
        <section aria-labelledby="mail-h" className="rounded-lg bg-surface p-t5">
          <h2 id="mail-h" className="text-h2 font-display">Email outbox</h2>
          {mail.length ? (
            <ul className="mt-t3 flex flex-col gap-t3">{mail.map((m, i) => (
              <li key={i} className="rounded-md bg-surface2 p-t3">
                <p className="text-small text-text-muted">{m.member_id} · {m.kind} · to {m.to_address} · {m.created_at.slice(0, 16)}</p>
                <p className="text-body-strong">{m.subject}</p>
                <pre className="mt-t1 whitespace-pre-wrap break-words text-caption text-text-muted">{m.text_body}</pre>
              </li>
            ))}</ul>
          ) : <p className="mt-t2 text-small text-text-muted">No emails yet.</p>}
        </section>
        <Link href="/dev/analytics" className="text-small text-accent">Analytics dashboards</Link>
      </div>
    </main>
  );
}
