"use client";
// Session start (once per browser session) and a page view for every portal page (spec 09).
import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

export function PageAnalytics({ route, payday }: { route: string; payday: boolean }) {
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("tippla-session-started")) {
        sessionStorage.setItem("tippla-session-started", "1");
        const entry = new URLSearchParams(location.search).get("src");
        track("session_started", { entry: entry === "push" || entry === "email" || entry === "install" ? entry : "direct", payday });
      }
    } catch { /* no storage: skip the session marker */ }
    track("page_viewed", { route });
  }, [route, payday]);
  return null;
}
