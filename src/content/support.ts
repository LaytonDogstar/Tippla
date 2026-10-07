// Optional support destinations (verified against official service pages, design/screens.md 30/09/2026).
// Offered as options, never pushed. Used by the gambling insight's "View support options" and Hardship.
export const gamblingSupport = {
  title: "Support options",
  intro: "These are options, not instructions. Use any, all or none.",
  items: [
    { id: "block", name: "A gambling block on your bank card", body: "Many banks let you block gambling payments on your card. Ask your bank whether it offers one and what it covers.", href: null },
    { id: "betstop", name: "BetStop", body: "The national self-exclusion register for licensed Australian online and phone wagering providers.", href: "https://www.betstop.gov.au/" },
    { id: "gho", name: "Gambling Help Online", body: "Free, confidential support across Australia, 24/7. Call the National Gambling Helpline on 1800 858 858, or chat online.", href: "https://www.gamblinghelponline.org.au/" },
    { id: "ndh", name: "National Debt Helpline", body: "Free financial counselling. Call 1800 007 007; current hours are on its website.", href: "https://ndh.org.au/" },
  ],
  opensIn: "(opens in a new tab)",
  back: "Back",
} as const;
