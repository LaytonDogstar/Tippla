// Copy for the docs/09 states: analysing, lapsed subscription, offline, bank connection, one-off data.
export const statesCopy = {
  offline: (when: string) => `Couldn't refresh. Showing data from ${when}.`,
  analysing: {
    title: "Working out your SmartScore",
    body: "Your bank is connected. We're reading your transactions now, which usually takes under a minute. This page fills in when it's done.",
    steps: ["Reading your transactions", "Finding your pay cycle", "Checking loans and repayments", "Working out your SmartScore"],
    loading: "Still working",
  },
  lapsed: {
    title: "Your subscription has ended",
    body: "Your SmartScore is still on Home. Reactivate to see your spending, loans and the steps that would lift your score.",
    reactivate: "Reactivate subscription",
    home: "Back to Home",
    homeCard: "Your subscription has ended, so the rest of Tippla is paused. Your SmartScore stays here.",
  },
  devMenu: "Dev states",
  devStates: {
    analysing: "Analysing (brand new)",
    lapsed: "Lapsed subscription",
    bank_expired: "Bank connection expired",
    offline: "Offline / API error",
    one_off: "One-off $4,000 deposit",
    two_accounts: "Second account",
  },
  clearStates: "Clear states",
  hardshipSelf: {
    label: "I'm finding things hard right now",
    on: "We'll keep these options at the top of Home for you.",
    off: "",
  },
} as const;
