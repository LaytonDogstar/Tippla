// Notification channel copy (en-AU): lock-screen fallbacks, lifecycle emails, push setup. No amounts or
// sensitive categories in subjects; never offers.

export const emailCopy = {
  notificationSubject: (title: string) => title,
  open: "Open Tippla",
  digest: {
    subject: "Your week with Tippla",
    intro: (from: string, to: string) => `Here's your week with Tippla, ${from} – ${to}.`,
    safe: (v: string) => `Safe to spend today: ${v}.`,
    none: "A quiet week: nothing new to report.",
  },
  recap: {
    subject: "Your last pay cycle in review",
    intro: "Your pay has landed, and your last pay cycle's recap is ready in Tippla.",
  },
  consentExpiry: {
    subject: "Your bank connection needs renewing",
    body: (date: string) => `Your bank connection ends on ${date}. Renew it in Tippla to keep your forecasts up to date. It takes about a minute.`,
    link: "Renew my connection",
  },
  winBack: {
    subject: "Something new in Tippla",
    intro: (first: string) => `Hi ${first}, we noticed something you might want to see:`,
  },
} as const;

export const pushCopy = {
  heading: "Notifications on this device",
  unsupported: "This browser can't show Tippla notifications. You'll still see everything in your notifications here.",
  ios: "On iPhone, add Tippla to your Home Screen first: tap Share, then Add to Home Screen. Then open Tippla from there and turn notifications on.",
  off: "Turn on notifications on this device",
  on: "On for this device",
  turnOff: "Turn off on this device",
  denied: "Notifications are blocked for Tippla in your browser settings. You'll still see everything here.",
  test: "Send me a test notification",
  testSent: (n: number) => (n === 1 ? "Test sent to 1 device" : `Test sent to ${n} devices`),
  testNoDevice: "Turn on notifications on this device first",
  working: "One moment…",
  failed: "That didn't work. Try again in a moment.",
} as const;

export const installCopy = {
  title: "Add Tippla to your home screen",
  body: "Open Tippla in one tap, and get a heads-up before you run short if you turn notifications on.",
  add: "Add to home screen",
  how: "Show me how",
  notNow: "Not now",
  iosTitle: "Add Tippla to your Home Screen",
  iosSteps: ["Tap the Share button at the bottom of Safari.", "Scroll down and tap Add to Home Screen, then Add.", "Open Tippla from your Home Screen. You can turn notifications on in Account › Profile."],
} as const;
