"use client";
// Generated from design/empty-states/*.svg (Astra). Inline so currentColor and --color-accent inherit the theme.
import type { EmptyVariant } from "@/content/components";

const art: Record<EmptyVariant, JSX.Element> = {
  noBankData: (
    <>
      <path d="M28 46 62 26 96 46H28Z"/>
  <path d="M34 52v32m18-32v32m20-32v32m18-32v32M28 90h68M24 98h76"/>
  <rect x="108" y="48" width="28" height="50" rx="4"/>
  <path d="M116 74h12m-12 10h8"/>
  <path d="M116 62h12" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
  noOffers: (
    <>
      <rect x="30" y="28" width="42" height="64" rx="6"/>
  <rect x="88" y="28" width="42" height="64" rx="6"/>
  <path d="M40 78h22m36 0h22"/>
  <path d="M40 44h22m36 0h22" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
  noTransactions: (
    <>
      <rect x="40" y="28" width="80" height="68" rx="6"/>
  <path d="M56 22v14m48-14v14M40 46h80"/>
  <rect x="54" y="58" width="52" height="16" rx="4" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
  noSubscriptions: (
    <>
      <rect x="54" y="40" width="52" height="40" rx="6"/>
  <path d="M36 46V40c0-10 8-18 18-18h52m-8-8 8 8-8 8"/>
  <path d="M124 74v6c0 10-8 18-18 18H54m8-8-8 8 8 8"/>
  <path d="M66 54h28" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
  noRecommendations: (
    <>
      <path d="M80 34c-16-8-32-8-50-4v60c18-4 34-4 50 4 16-8 32-8 50-4V30c-18-4-34-4-50 4Z"/>
  <path d="M80 34v60M42 48h20m-20 14h20m36 2h20m-20 14h20"/>
  <path d="M96 29v23l6-4 6 4V28" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
  noSearchResults: (
    <>
      <circle cx="68" cy="52" r="26"/>
  <path d="m87 71 29 29"/>
  <path d="M49.615 33.615a26 26 0 0 1 36.77 0" stroke="var(--color-accent, currentColor)"/>
    </>
  ),
};

export function EmptyIllustration({ variant }: { variant: EmptyVariant }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className="tippla-empty-illustration mx-auto block h-[120px] w-[160px] text-neutral pointer-events-none"
    >
      {art[variant]}
    </svg>
  );
}
