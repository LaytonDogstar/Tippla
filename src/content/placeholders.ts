// Screens not built yet. Each route still goes somewhere and says what will be there (non-negotiable 7).
export const placeholders: Record<string, { title: string; body: string; phase: number }> = {
  "": { title: "Home", body: "Your dashboard: SmartScore, the next thing to do, your pay cycle and next bill.", phase: 3 },
  score: { title: "SmartScore", body: "Your score, the path to the next stage, and every factor with what lifts it.", phase: 3 },
  savings: { title: "Ways to lift your score", body: "Specific steps, ordered by what they'd change.", phase: 3 },
  spending: { title: "Spending", body: "Where your money goes this pay cycle, by category, with search.", phase: 4 },
  calendar: { title: "Calendar", body: "Payday to payday at a glance, with predicted bills.", phase: 4 },
  subscriptions: { title: "Subscriptions", body: "Regular charges, what they cost per pay cycle, and how to cancel.", phase: 4 },
  loans: { title: "Loans & credit", body: "Your loans, pay advances and buy now, pay later, with estimated balances.", phase: 5 },
  offers: { title: "Offers", body: "Offers from partner lenders, only if you've turned on lender matching.", phase: 5 },
  hardship: { title: "Hardship support", body: "If money's tight right now, these are real options: talking to your lender, free financial counselling through the National Debt Helpline (1800 007 007), and pausing Tippla.", phase: 5 },
  help: { title: "Help", body: "Answers to common questions, like why you were declined and who sees your data.", phase: 5 },
  notifications: { title: "Notifications", body: "Score changes, bill reminders and bank connection updates.", phase: 5 },
};
export const placeholderNote = (phase: number) => `This screen is being built (phase ${phase}).`;
export const devLinks = { components: "Component library", selectors: "Selector figures", onboarding: "Start onboarding" };
