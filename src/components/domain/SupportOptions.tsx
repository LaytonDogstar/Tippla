// Optional gambling support (verified destinations). Shared by the Spending insight and Hardship support.
import { ExternalLink } from "lucide-react";
import { gamblingSupport } from "@/content/support";

export function SupportOptions() {
  return (
    <div className="flex flex-col gap-t4">
      <p className="text-body text-text-muted">{gamblingSupport.intro}</p>
      <ul className="flex flex-col gap-t3">
        {gamblingSupport.items.map((s) => (
          <li key={s.id} className="rounded-sm bg-surface2 p-t4">
            {s.href ? (
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-tap items-center gap-t2 text-h3 text-accent underline-offset-4 hover:underline">
                {s.name}<ExternalLink aria-hidden size={16} /><span className="sr-only">{gamblingSupport.opensIn}</span>
              </a>
            ) : <p className="text-h3 text-text">{s.name}</p>}
            <p className="mt-t1 text-small text-text-muted">{s.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
