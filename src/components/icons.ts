// Lucide mapping from design/icons.md. Category icons take their colour from currentColor.
import {
  ArrowDownToLine, Banknote, BanknoteArrowDown, BanknoteArrowUp, CalendarClock, CarFront, CircleHelp, Clapperboard,
  HeartPulse, House, Layers, Plug, ReceiptText, Repeat, ShoppingBag, ShoppingBasket, Utensils, Wine, type LucideIcon,
} from "lucide-react";
import type { CategoryId } from "@/lib/api/types";

export const categoryIcons: Record<CategoryId | "centrelink" | "uncategorised", LucideIcon> = {
  housing: House,
  groceries: ShoppingBasket,
  food: Utensils,
  transport: CarFront,
  bills: Plug,
  subscriptions: Repeat,
  entertainment: Clapperboard,
  alcohol: Wine,
  gambling: Layers,
  health: HeartPulse,
  shopping: ShoppingBag,
  loan_repayment: BanknoteArrowUp,
  bnpl: CalendarClock,
  wage_advance: BanknoteArrowDown,
  cash: Banknote,
  fees: ReceiptText,
  income: ArrowDownToLine,
  centrelink: ArrowDownToLine,
  transfer: Repeat,
  uncategorised: CircleHelp,
};

/** CSS variable for a category colour, e.g. var(--cat-loan-repayment). */
export const catVar = (c: string, dim = false) => {
  const key = c === "transfer" ? "uncategorised" : c;
  return `var(--cat-${dim ? "dim-" : ""}${key.replace(/_/g, "-")})`;
};
