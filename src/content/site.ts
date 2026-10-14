// The public marketing site (14/10/2026). Same voice as the portal (docs/02): plain, factual, on the customer's side.
// No partner is named publicly. No approval promises, no urgency, no rankings, no testimonials until real, consented
// ones exist. Only features that are on without a pending compliance gate are described (featureFlags: no `gate`).
// Security wording quotes TaleFin's own public pages (talefin.com, talefin.com/legal/security, checked 14/10/2026);
// anything they don't state (read-only access, hosting location, retention) is not claimed.
// COMPLIANCE REVIEW before launch: all of this page copy, the price statement and the security section.

export const PRICE = "$4.99";

export const site = {
  name: "Tippla",
  skip: "Skip to content",
  nav: {
    label: "Site",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/smartscore", label: "SmartScore" },
      { href: "/pricing", label: "Pricing" },
      { href: "/security", label: "Security" },
      { href: "/faq", label: "FAQ" },
    ],
    login: "Log in",
    start: "Get started",
    menu: "Menu",
    close: "Close menu",
    home: "Tippla home",
  },
  footer: {
    tagline: "Clear steps to get credit-ready, one pay cycle at a time.",
    columns: [
      { title: "Tippla", links: [{ href: "/#how", label: "How it works" }, { href: "/smartscore", label: "SmartScore" }, { href: "/pricing", label: "Pricing" }, { href: "/faq", label: "FAQ" }] },
      { title: "Trust", links: [{ href: "/security", label: "Security and privacy" }, { href: "/support", label: "Free help and support" }] },
      { title: "Account", links: [{ href: "/login", label: "Log in" }, { href: "/onboarding", label: "Get started" }] },
    ],
    help: "Free, confidential help: National Debt Helpline 1800 007 007 · Gambling Help Online 1800 858 858",
    general: "General information only. It doesn't take your personal situation into account. Tippla isn't a lender and doesn't give credit advice.",
    /** Placeholders until Tippla's legal details are confirmed. */
    legal: "ABN, privacy policy, terms of use and complaints process: to be confirmed before launch.",
    copyright: (year: number) => `© ${year} Tippla`,
  },

  home: {
    meta: { title: "Tippla · Get credit-ready, one pay cycle at a time", description: "Knocked back for credit? Tippla shows what lenders see in your bank data and gives you clear steps that fit your pay cycle. $4.99 a month." },
    hero: {
      eyebrow: "For anyone who's been knocked back for credit",
      title: "Find out why, and what would change the answer",
      body: "Tippla reads your bank data, shows you what lenders see, and gives you clear steps that fit your pay cycle.",
      price: `${PRICE} a month. Cancel any time.`,
      start: "Get started",
      login: "Log in",
      previewAlt: "Example of Tippla's Today screen: about $53 short before payday, with options",
    },
    how: {
      title: "How it works",
      steps: [
        { title: "Connect your bank", body: "Securely, through TaleFin, an ACCC-accredited Consumer Data Right data recipient. You choose the accounts." },
        { title: "See your SmartScore", body: "A score from 0 to 1,000 and the nine things behind it, in plain words. No jargon, no judgement." },
        { title: "Follow your plan", body: "Small, specific steps that fit your pay cycle, so you can see progress every payday." },
      ],
    },
    preview: {
      title: "What you'll see",
      sub: "Real Tippla screens, with example data.",
      example: "Example",
      items: [
        { id: "today", title: "Your pay cycle at a glance", body: "What's due before payday, and whether you'll be short, before it happens.", alt: "Example Today screen showing the pay cycle, money due before payday and a way forward" },
        { id: "score", title: "Your SmartScore and what moved it", body: "Where you are, the next stage, and the factors that matter most right now.", alt: "Example SmartScore screen with the score, its stage and the path to the next stage" },
        { id: "plan", title: "Where your pay went", body: "Each square is about 1% of your pay, so it's easy to see what takes the most.", alt: "Example Money plan card showing where the pay went, square by square" },
        { id: "cycles", title: "How each pay cycle ended", body: "Your balance the day before each payday, so you can see the trend and what changed it.", alt: "Example chart of the balance the day before each payday" },
      ],
    },
    side: {
      title: "On your side",
      items: [
        { title: "We're not a lender", body: "We don't push loans, and Tippla works fully without ever seeing an offer." },
        { title: "Lender matching is your choice", body: "It's off unless you turn it on. Lenders see nothing about you until you do." },
        { title: "No pressure, ever", body: "No countdowns, no promises that you're already approved, and no comparing you with anyone else." },
      ],
    },
    features: {
      title: "What you get",
      items: [
        { title: "Pay cycle view", body: "Your money from payday to payday, with what's due and what's left." },
        { title: "SmartScore", body: "Your score, its nine factors, and what moved it since last time." },
        { title: "Money plan", body: "Where your pay went, and specific options to free some up." },
        { title: "Calendar forecast", body: "Bills, pay and your balance, day by day, up to your next payday and beyond." },
        { title: "Subscriptions", body: "Regular charges in one place, including ones you may have forgotten." },
        { title: "Help when it's hard", body: "Hardship options, templates to ask a lender for help, and free counselling." },
      ],
    },
    help: {
      title: "If things are hard right now",
      body: "Free help is available whether or not you join Tippla.",
      items: [
        { label: "National Debt Helpline", detail: "Free financial counselling", tel: "1800 007 007", href: "tel:1800007007" },
        { label: "Gambling Help Online", detail: "Free and confidential, 24/7", tel: "1800 858 858", href: "tel:1800858858" },
      ],
      more: "More free help",
    },
    cta: { title: "Ready to see where you stand?", body: `${PRICE} a month. Cancel in one tap.`, start: "Get started" },
  },

  smartscore: {
    meta: { title: "How SmartScore works · Tippla", description: "Your SmartScore is a score from 0 to 1,000 built from your bank data, with nine factors and four stages." },
    title: "How SmartScore works",
    lead: "Your SmartScore is a score from 0 to 1,000, built from your bank data by TaleFin. It looks at how money moves through your accounts: the same kind of picture a lender looks at.",
    stagesTitle: "Four stages",
    stageOf: (n: number, of: number) => `${n} of ${of}`,
    stagesBody: "Instead of a single number to chase, you see your stage and what it would take to reach the next one.",
    stages: [
      { name: "Building", body: "Getting the basics steady." },
      { name: "Steadying", body: "Fewer surprises before payday." },
      { name: "Healthy", body: "Money left over most pay cycles." },
      { name: "Thriving", body: "A buffer, and room to choose." },
    ],
    factorsTitle: "The nine factors",
    factorsBody: "Each factor is explained in plain words in the app, with what's behind it and what could lift it.",
    notTitle: "What it isn't",
    not: [
      "It isn't your credit report, and signing up isn't a credit application.",
      "It doesn't compare you with other people.",
      "It doesn't decide whether a lender says yes. It shows you what they're likely to look at.",
    ],
  },

  pricing: {
    meta: { title: "Pricing · Tippla", description: `One plan, everything included: ${PRICE} a month. Cancel in one tap.` },
    title: "One plan, everything included",
    price: PRICE,
    per: "a month",
    includes: [
      "Your SmartScore and its nine factors",
      "Your pay cycle view and calendar forecast",
      "A money plan with specific options",
      "Subscriptions in one place",
      "Hardship help and free counselling contacts",
    ],
    start: "Get started",
    terms: [
      { title: "Cancel in one tap", body: "From your account. No calls, no retention offers." },
      { title: "Pause a month", body: "If money's tight, skip a month instead of cancelling." },
      { title: "Nothing hidden", body: "No set-up fee, no extra tiers, no add-ons." },
    ],
  },

  security: {
    meta: { title: "Security and privacy · Tippla", description: "How Tippla connects to your bank, what we see, and who can see your data." },
    title: "Security and privacy",
    lead: "Your bank data is personal. Here's how it's handled, in plain words.",
    bankTitle: "Connecting your bank",
    bankBody: "Tippla connects to your bank through TaleFin. TaleFin says it is:",
    talefin: [
      "an ACCC-accredited Data Recipient under the Consumer Data Right",
      "independently certified to ISO 27001 across its whole business",
      "independently assured under ASAE 3150 for its controls and governance",
      "encrypting data in transit and at rest",
    ],
    source: "Source: TaleFin's website (talefin.com), checked 14/10/2026.",
    seeTitle: "What we see",
    see: "The transactions and balances in the accounts you choose to connect, so we can work out your pay cycle, your SmartScore and your plan.",
    neverTitle: "What we never show",
    never: "Some details in bank data are sensitive, like signs of hardship or personal circumstances. We use what's needed for your score and never display those details in the app.",
    whoTitle: "Who can see your data",
    who: "You. Lenders see nothing about you unless you turn on lender matching, and you can turn it off again at any time.",
    deleteTitle: "Leaving Tippla",
    delete: "You can cancel any time from your account.",
    /** Tippla's own statement: for counsel to complete before launch. */
    ownTitle: "Tippla's privacy and security",
    own: "Tippla's own privacy policy and security statement, including where data is stored, how long it's kept and how to have it deleted, will be published here before launch.",
    placeholder: "To be confirmed",
  },

  support: {
    meta: { title: "Free help and support · Tippla", description: "Free, confidential help with debt, money worries and gambling, whether or not you use Tippla." },
    title: "Free help and support",
    lead: "You don't need to be a Tippla member to get help. These services are free and confidential.",
    items: [
      { title: "National Debt Helpline", body: "Free financial counselling. A counsellor can help you work out which debts to deal with first, and talk to lenders for you.", tel: "1800 007 007", href: "tel:1800007007", web: "https://ndh.org.au/", webLabel: "ndh.org.au" },
      { title: "Gambling Help Online", body: "Free and confidential support, any time of day or night.", tel: "1800 858 858", href: "tel:1800858858", web: "https://www.gamblinghelponline.org.au/", webLabel: "gamblinghelponline.org.au" },
      { title: "BetStop", body: "The national self-exclusion register. One sign-up covers every licensed online bookmaker.", tel: null, href: null, web: "https://www.betstop.gov.au/", webLabel: "betstop.gov.au" },
    ],
    hardshipTitle: "Asking a lender for hardship help",
    hardship: "If you're struggling to make repayments, you can ask your lender for hardship help, such as lower or paused repayments for a while. Lenders have to consider a hardship request. A financial counsellor can help you ask.",
    opensIn: "(opens in a new tab)",
  },

  faq: {
    meta: { title: "FAQ · Tippla", description: "Answers to common questions about Tippla, SmartScore, price and your data." },
    title: "Frequently asked questions",
    items: [
      { q: "Is Tippla a loan?", a: "No. Tippla isn't a lender, and signing up isn't a credit application. We help you understand your money and what lenders look at." },
      { q: "What does it cost?", a: `${PRICE} a month, with everything included. You can cancel in one tap, or pause for a month if money's tight.` },
      { q: "How does Tippla see my bank data?", a: "Through TaleFin, an ACCC-accredited Consumer Data Right data recipient. You choose which accounts to connect." },
      { q: "Do lenders see my information?", a: "Not unless you turn on lender matching. It's off by default, and Tippla works fully without it." },
      { q: "What if I'm on Centrelink?", a: "Centrelink payments count as income, just like wages. They're shown the same way." },
      { q: "I'm paid fortnightly. Does that matter?", a: "Tippla is built around your pay cycle, so everything lines up with your paydays rather than calendar months." },
      { q: "What if I'm struggling right now?", a: "You can get free help straight away, whether or not you join: the National Debt Helpline on 1800 007 007, or Gambling Help Online on 1800 858 858." },
      { q: "Can I cancel?", a: "Yes, any time, in one tap from your account. There's no call to make and no retention offer." },
    ],
  },

  login: {
    meta: { title: "Log in · Tippla", description: "Log in to Tippla." },
    title: "Log in",
    lead: "Welcome back.",
    password: "Password",
    passwordHelp: "During the preview, use the preview password you were given.",
    submit: "Log in",
    error: "That password didn't work. Try again.",
    noAccount: "New to Tippla?",
    start: "Get started",
  },
} as const;
