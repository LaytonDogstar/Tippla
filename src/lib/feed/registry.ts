// The rule list. To add a rule: write src/lib/feed/rules/<name>.ts exporting a Rule, then add it here.
import type { Rule } from "./types";
import { billOverBalance } from "./rules/billOverBalance";
import { duplicateCharge } from "./rules/duplicateCharge";
import { newSubscription } from "./rules/newSubscription";
import { priceRise } from "./rules/priceRise";
import { repaymentDue } from "./rules/repaymentDue";
import { scoreChange } from "./rules/scoreChange";
import { shortfall } from "./rules/shortfall";
import { unusualSpend } from "./rules/unusualSpend";

export const RULES: Record<string, Rule> = {
  shortfall, billOverBalance, repaymentDue, newSubscription, priceRise, duplicateCharge, unusualSpend, scoreChange,
};
