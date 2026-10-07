// Spec 08 entry points: "Ask Tippla" on Today, and "Ask about this" with a question on other screens.
import Link from "next/link";
import { ChevronRight, MessageCircleQuestion } from "lucide-react";
import { assistantCopy as t } from "@/content/assistant";

export function AskTipplaLink() {
  return (
    <Link href="/assistant" className="flex min-h-tap items-center gap-t3 rounded-card-s bg-surface shadow-card sm:rounded-card p-t4 hover:bg-surface2">
      <span aria-hidden className="inline-flex h-[40px] w-[40px] shrink-0 items-center justify-center rounded-sm bg-surface2 text-neutral"><MessageCircleQuestion size={24} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-strong text-text">{t.entry}</span>
        <span className="block text-small text-text-muted">{t.entryBody}</span>
      </span>
      <ChevronRight aria-hidden size={20} className="text-accent" />
    </Link>
  );
}

export function AskAboutThis({ question }: { question: string }) {
  return (
    <Link href={`/assistant?entry=contextual&q=${encodeURIComponent(question)}`} className="inline-flex min-h-tap items-center gap-t2 text-body-strong text-accent underline-offset-2 hover:underline">
      <MessageCircleQuestion aria-hidden size={20} />{t.askAbout}: {question}
    </Link>
  );
}
