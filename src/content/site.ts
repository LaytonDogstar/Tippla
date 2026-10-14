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
    start: "See my SmartScore",
    menu: "Menu",
    close: "Close menu",
    home: "Tippla home",
  },
  footer: {
    tagline: "Clear steps to get credit-ready, one pay cycle at a time.",
    columns: [
      { title: "Tippla", links: [{ href: "/#how", label: "How it works" }, { href: "/smartscore", label: "SmartScore" }, { href: "/pricing", label: "Pricing" }, { href: "/faq", label: "FAQ" }] },
      // TODO(launch): point Privacy policy and Terms and complaints at the real pages once published.
      { title: "Trust", links: [{ href: "/security", label: "Security and privacy" }, { href: "/support", label: "Free help and support" }, { href: "/security#tippla-privacy", label: "Privacy policy" }, { href: "/security#tippla-privacy", label: "Terms and complaints" }] },
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
    start: "See my SmartScore",
    example: "Example",
    hero: {
      eyebrow: "For anyone who's been knocked back for credit",
      title: ["Find out why.", "Then change the answer."],
      body: "Tippla reads your bank data, shows you what lenders see, and gives you small, clear steps that fit your pay cycle.",
      how: "See how it works",
      ticks: [`${PRICE} a month`, "Cancel in one tap", "Not a lender"],
      shortCallout: { label: (days: number) => `Heads up, ${days} days out`, value: (amt: string) => `${amt} short`, detail: (day: string) => `before payday on ${day}` },
      subsCallout: { label: "Found in your subscriptions", value: (n: number, amt: string) => `${n} streaming services, ${amt} a month` },
    },
    phone: {
      title: "SmartScore",
      gaugeLabel: (score: number, max: string) => `SmartScore gauge at ${score} out of ${max}`,
      outOf: (max: string) => `out of ${max}`,
      change: (delta: number, since: string) => `${delta < 0 ? "Down" : "Up"} ${Math.abs(delta)} since ${since}`,
      nextStage: "Next stage",
      stageAt: (name: string, at: number) => `${name} at ${at}`,
      toGo: (n: number) => `${n} to go`,
      moved: "What moved it",
      points: (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`),
      nextStep: "Your next step",
    },
    trustLabel: "Your data, your choice",
    trust: [
      // TODO(launch): the mockup's "Read-only access · We can see, never move, your money" waits on TaleFin confirming
      // read-only access for both CDR and its other connection method. Until then, a claim TaleFin makes publicly.
      { icon: "lock", title: "Bank-grade security", body: "TaleFin is ISO 27001 certified" },
      { icon: "shield", title: "Consumer Data Right", body: "Via TaleFin, ACCC-accredited" },
      { icon: "bank", title: "We're not a lender", body: "No loans pushed, ever" },
      { icon: "accounts", title: "You choose the accounts", body: "Disconnect any time" },
    ],
    features: {
      kicker: "What you'll see",
      title: "Your money, the way a lender reads it. Explained like a friend would.",
      rows: [
        {
          id: "cycle", kicker: "Pay cycle view", title: "Know you'll be short before it happens",
          body: "Tippla lines up your bills against your balance, payday to payday. If something won't fit, you'll know days ahead, with options that don't involve another pay advance.",
          points: ["Calendar forecast, day by day", "A plain-English \"how we worked this out\""],
        },
        {
          id: "plan", kicker: "Money plan", title: "See exactly where your pay goes",
          body: "One picture of your whole pay cycle, no spreadsheets. Then specific options to free some up, including regular charges you may have forgotten about.",
          points: ["Subscriptions in one place", "No judgement, just the numbers"],
        },
        {
          id: "score", kicker: "SmartScore", title: "Watch the trend turn, one payday at a time",
          body: "Your SmartScore runs from 0 to 1,000 and is built from nine things lenders look at. After every payday you'll see what moved it, and the one step that would help most next.",
          points: ["Nine factors, in plain words", "Steps sized to your pay cycle"],
        },
      ],
    },
    cycleCard: {
      period: (from: string, to: string) => `Pay cycle ${from} – ${to}`,
      flag: "Short before payday",
      detail: (day: string) => `short of what's due before payday on ${day}`,
      days: "Days to payday",
      daysLeft: (n: number) => `${n} left`,
      daysLabel: (n: number, of: number) => `Day ${n} of ${of} in this pay cycle`,
      balance: (amt: string) => `Balance ${amt}`,
      due: (amt: string) => `Due ${amt}`,
      covered: (pct: number) => `Your balance covers ${pct}% of what's due`,
      bills: (list: string) => `${list} come out before payday.`,
    },
    planCard: {
      title: "Where your pay went",
      sub: "Each square is 1% of your pay",
      ranOut: "Your pay ran out here",
      label: (parts: string, over: number) => `Where the pay went, as squares of 1% of pay: ${parts}. The last ${over} squares are past what was paid.`,
      share: (name: string, pct: number) => `${name} ${pct}%`,
    },
    trendCard: {
      title: "How each pay cycle ended",
      sub: "Money left the day before payday",
      now: "Now",
      label: (values: string) => `Money left the day before payday, oldest to newest: ${values}. The last one is a forecast.`,
      spoken: (amt: string, below: boolean) => (below ? `minus ${amt}` : amt),
    },
    how: {
      title: "Set up in about five minutes",
      steps: [
        { title: "Connect your bank", body: "Securely, through TaleFin under the Consumer Data Right. You choose which accounts." },
        { title: "See your SmartScore", body: "Your score and the nine things behind it. No jargon, no judgement." },
        { title: "Follow your plan", body: "Small, specific steps each payday, so you can see yourself getting closer." },
      ],
    },
    side: {
      title: "On your side, not a lender's",
      body: "Tippla works fully without ever showing you an offer. You pay us, so we work for you.",
      items: [
        { title: "We're not a lender", body: "We don't sell loans and we don't push them." },
        { title: "Lender matching is off", body: "Unless you turn it on. Lenders see nothing about you until you do." },
        { title: "No pressure, ever", body: "No countdowns, no promises that you're already approved, and no comparing you with anyone." },
      ],
    },
    pricing: {
      kicker: "One plan, everything included",
      per: "a month",
      terms: "Cancel in one tap. No lock-in.",
      includes: ["SmartScore and its nine factors", "Pay cycle view and calendar forecast", "Money plan and subscriptions", "Hardship templates and free counselling links"],
      more: "Full pricing details",
    },
    faq: {
      title: "Questions people ask first",
      items: [
        { q: "Is it safe to connect my bank?", a: "Your bank connects through TaleFin, an ACCC-accredited Consumer Data Right data recipient that's independently certified to ISO 27001. You choose the accounts, and you can disconnect any time." },
        // TODO(launch): confirm with TaleFin and counsel whether anything is recorded on a credit file. Draft from the
        // mockup: "Tippla doesn't make a credit enquiry, so nothing is recorded on your credit file."
        { q: "Will this show up on my credit file?", a: "Signing up for Tippla isn't a credit application. What, if anything, appears on your credit file will be confirmed here before launch." },
        // TODO(launch): confirm wording. The SmartScore is the TaleFin Score (docs/05), not "Tippla's own score".
        { q: "Is the SmartScore my credit score?", a: "No. It's a score from 0 to 1,000 that TaleFin builds from your bank data. It isn't your credit report. It shows the kinds of things lenders tend to look at." },
        { q: "How do I cancel?", a: "One tap in the app. No phone calls, no retention offers." },
      ],
      more: "More questions",
    },
    cta: { title: "Ready to see what lenders see?", body: `Five minutes to set up. ${PRICE} a month. Cancel in one tap.` },
    help: {
      title: "If things are hard right now",
      body: "Free help is available whether or not you join Tippla.",
      items: [
        { label: "National Debt Helpline", tel: "1800 007 007", href: "tel:1800007007" },
        { label: "Gambling Help Online, 24/7", tel: "1800 858 858", href: "tel:1800858858" },
      ],
      more: "More free help",
    },
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
