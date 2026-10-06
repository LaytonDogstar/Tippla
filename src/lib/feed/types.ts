// "Needs a look" feed. Each rule is a pure function from the customer's data to zero or more items.
import type { PersonaData } from "@/lib/api/types";
import type { ISODate } from "@/lib/format/dates";
import type { CategoryOverrides } from "@/lib/selectors/transactions";
import type { AccountState } from "@/lib/account/state";

/** Navigation sections (Today · Money · Score · Borrowing · Help). Badge counts group by these. */
export type FeedSection = "today" | "money" | "score" | "borrowing" | "help";

export type FeedType =
  | "shortfall" | "bill_over_balance" | "repayment_due" | "new_subscription" | "price_rise"
  | "duplicate_charge" | "unusual_spend" | "score_change" | "tippla_billing_relief";

/** 5 = act today … 1 = for your info. */
export type Urgency = 1 | 2 | 3 | 4 | 5;

export interface FeedAction { label: string; href: string }

export interface FeedItem {
  /** Stable across refreshes for the same underlying thing, so done / snooze / dismiss stick. */
  id: string;
  type: FeedType;
  section: FeedSection;
  title: string;
  body: string;
  action: FeedAction;
  /** Shown on cards about money being tight: hardship options are always one tap away. */
  hardship?: FeedAction;
  urgency: Urgency;
  /** Dollars at stake this pay cycle (recurring costs are per pay cycle, not per year). */
  amountAtStake: number;
  /** After this date the item no longer applies (a bill that has come out). */
  expiresAt: ISODate | null;
  /** Transactions behind the item, for "see the charges" and tests. */
  transactionIds?: string[];
}

export interface FeedContext {
  d: PersonaData;
  edits: CategoryOverrides;
  /** The member's account choices (billing, hardship), for rules that depend on them. */
  account?: AccountState;
}

export type Rule = (ctx: FeedContext) => FeedItem[];

export interface FeedItemState { status: "done" | "dismissed" | "snoozed"; until?: ISODate; at: ISODate }
export type FeedState = Record<string, FeedItemState>;
