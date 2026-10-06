// Support services: maintained configuration, checked against official pages (design/screens.md, 30/09/2026).
// Hours change: keep them here, never in components, and always offer the website as the fallback.
export const NDH = {
  name: "National Debt Helpline",
  phoneDisplay: "1800 007 007",
  tel: "tel:1800007007",
  hours: "Weekdays 9:30am – 4:30pm",
  url: "https://ndh.org.au/",
} as const;

/** Crisis support (spec 08: distress cues lead with support). Verify with the official page before launch. */
export const LIFELINE = {
  name: "Lifeline",
  phoneDisplay: "13 11 14",
  tel: "tel:131114",
  url: "https://www.lifeline.org.au/",
} as const;
