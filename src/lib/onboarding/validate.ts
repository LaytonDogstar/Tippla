// O1 validation and the 04XX XXX XXX mobile mask.
export const digits = (s: string) => s.replace(/\D/g, "");

/** Formats as the customer types: "0412345678" → "0412 345 678". Accepts +61 4… and converts to 04…. */
export function formatMobile(input: string): string {
  let d = digits(input);
  if (d.startsWith("614")) d = "0" + d.slice(2);
  d = d.slice(0, 10);
  return [d.slice(0, 4), d.slice(4, 7), d.slice(7, 10)].filter(Boolean).join(" ");
}

export const isValidMobile = (input: string) => /^04\d{8}$/.test(digits(input).replace(/^614/, "04"));
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isValidPassword = (s: string) => s.length >= 10;
