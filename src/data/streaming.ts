// Video streaming services (Subscriptions redesign, 12/10/2026). We don't categorise subscriptions yet, so the
// "3 streaming services" insight and the review order use this list. Sample logic: matched on the merchant name.
const VIDEO = ["netflix", "binge", "stan", "disney", "kayo", "paramount", "prime video", "amazon prime", "apple tv", "foxtel", "flash", "britbox", "youtube premium", "hayu"];

const PATTERN = new RegExp(`(^|[^a-z])(${VIDEO.join("|")})([^a-z]|$)`);
/** Whole words only, so "Stan" matches "Stan" and "Stan.com.au" but not "Standard Chartered". */
export const isVideoStreaming = (merchant: string) => PATTERN.test(merchant.toLowerCase());
