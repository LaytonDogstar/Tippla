"use client";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Feedback";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
