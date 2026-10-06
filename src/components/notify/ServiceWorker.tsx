"use client";
// Registers the service worker (spec 10) in production builds, and records an install. Development skips
// it so pages are never served from a cache while you work.
import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => { /* the app works without it */ });
    const installed = () => track("pwa_installed", {});
    window.addEventListener("appinstalled", installed);
    return () => window.removeEventListener("appinstalled", installed);
  }, []);
  return null;
}
