// Raw persona fixtures. Only src/lib/api may import this file: everything else goes through the client,
// which strips fields the customer must never see.
import type { Consent, Derived, Offers, PersonaId, Profile, ScoreHistory, TaleFinScore, Transaction } from "./types";

import type { RawBankStatement } from "./talefin";

import jessProfile from "@mock/jess/profile.json";
import jessTx from "@mock/jess/transactions.json";
import jessBank from "@mock/jess/talefin_bank_statement.json";
import jessScore from "@mock/jess/talefin_score.json";
import jessHistory from "@mock/jess/score_history.json";
import jessDerived from "@mock/jess/derived.json";
import jessOffers from "@mock/jess/offers.json";
import jessConsents from "@mock/jess/consents.json";

import marcusProfile from "@mock/marcus/profile.json";
import marcusTx from "@mock/marcus/transactions.json";
import marcusBank from "@mock/marcus/talefin_bank_statement.json";
import marcusScore from "@mock/marcus/talefin_score.json";
import marcusHistory from "@mock/marcus/score_history.json";
import marcusDerived from "@mock/marcus/derived.json";
import marcusOffers from "@mock/marcus/offers.json";
import marcusConsents from "@mock/marcus/consents.json";

import priyaProfile from "@mock/priya/profile.json";
import priyaTx from "@mock/priya/transactions.json";
import priyaBank from "@mock/priya/talefin_bank_statement.json";
import priyaScore from "@mock/priya/talefin_score.json";
import priyaHistory from "@mock/priya/score_history.json";
import priyaDerived from "@mock/priya/derived.json";
import priyaOffers from "@mock/priya/offers.json";
import priyaConsents from "@mock/priya/consents.json";

// Payday snapshots (dev state "payday"): the same history, taken the morning the next pay lands.
import jessPProfile from "@mock/jess/payday/profile.json";
import jessPTx from "@mock/jess/payday/transactions.json";
import jessPBank from "@mock/jess/payday/talefin_bank_statement.json";
import jessPScore from "@mock/jess/payday/talefin_score.json";
import jessPHistory from "@mock/jess/payday/score_history.json";
import jessPDerived from "@mock/jess/payday/derived.json";
import jessPOffers from "@mock/jess/payday/offers.json";
import jessPConsents from "@mock/jess/payday/consents.json";
import marcusPProfile from "@mock/marcus/payday/profile.json";
import marcusPTx from "@mock/marcus/payday/transactions.json";
import marcusPBank from "@mock/marcus/payday/talefin_bank_statement.json";
import marcusPScore from "@mock/marcus/payday/talefin_score.json";
import marcusPHistory from "@mock/marcus/payday/score_history.json";
import marcusPDerived from "@mock/marcus/payday/derived.json";
import marcusPOffers from "@mock/marcus/payday/offers.json";
import marcusPConsents from "@mock/marcus/payday/consents.json";
import priyaPProfile from "@mock/priya/payday/profile.json";
import priyaPTx from "@mock/priya/payday/transactions.json";
import priyaPBank from "@mock/priya/payday/talefin_bank_statement.json";
import priyaPScore from "@mock/priya/payday/talefin_score.json";
import priyaPHistory from "@mock/priya/payday/score_history.json";
import priyaPDerived from "@mock/priya/payday/derived.json";
import priyaPOffers from "@mock/priya/payday/offers.json";
import priyaPConsents from "@mock/priya/payday/consents.json";
// Bill-eve snapshot (dev state "bill_due"), Jess only: the morning before her Beforepay repayment.
import jessBProfile from "@mock/jess/billdue/profile.json";
import jessBTx from "@mock/jess/billdue/transactions.json";
import jessBBank from "@mock/jess/billdue/talefin_bank_statement.json";
import jessBScore from "@mock/jess/billdue/talefin_score.json";
import jessBHistory from "@mock/jess/billdue/score_history.json";
import jessBDerived from "@mock/jess/billdue/derived.json";
import jessBOffers from "@mock/jess/billdue/offers.json";
import jessBConsents from "@mock/jess/billdue/consents.json";

export interface RawPersona {
  profile: Profile;
  transactions: { as_of: string; transactions: Transaction[] };
  bankStatement: RawBankStatement;
  score: TaleFinScore;
  scoreHistory: ScoreHistory;
  derived: Derived;
  offers: Offers;
  consents: { consents: Consent[] };
}

export const RAW: Record<PersonaId, RawPersona> = {
  jess: {
    profile: jessProfile as Profile, transactions: jessTx as RawPersona["transactions"], bankStatement: jessBank as unknown as RawBankStatement,
    score: jessScore as TaleFinScore, scoreHistory: jessHistory, derived: jessDerived as Derived, offers: jessOffers as Offers,
    consents: jessConsents as RawPersona["consents"],
  },
  marcus: {
    profile: marcusProfile as Profile, transactions: marcusTx as RawPersona["transactions"], bankStatement: marcusBank as unknown as RawBankStatement,
    score: marcusScore as TaleFinScore, scoreHistory: marcusHistory, derived: marcusDerived as Derived, offers: marcusOffers as Offers,
    consents: marcusConsents as RawPersona["consents"],
  },
  priya: {
    profile: priyaProfile as Profile, transactions: priyaTx as RawPersona["transactions"], bankStatement: priyaBank as unknown as RawBankStatement,
    score: priyaScore as TaleFinScore, scoreHistory: priyaHistory, derived: priyaDerived as Derived, offers: priyaOffers as Offers,
    consents: priyaConsents as RawPersona["consents"],
  },
};

/** The morning each persona's next pay lands (generator: write_snapshot). Score is still the 25/09 one. */
export const RAW_PAYDAY: Record<PersonaId, RawPersona> = {
  jess: {
    profile: jessPProfile as Profile, transactions: jessPTx as RawPersona["transactions"], bankStatement: jessPBank as unknown as RawBankStatement,
    score: jessPScore as TaleFinScore, scoreHistory: jessPHistory, derived: jessPDerived as Derived, offers: jessPOffers as Offers,
    consents: jessPConsents as RawPersona["consents"],
  },
  marcus: {
    profile: marcusPProfile as Profile, transactions: marcusPTx as RawPersona["transactions"], bankStatement: marcusPBank as unknown as RawBankStatement,
    score: marcusPScore as TaleFinScore, scoreHistory: marcusPHistory, derived: marcusPDerived as Derived, offers: marcusPOffers as Offers,
    consents: marcusPConsents as RawPersona["consents"],
  },
  priya: {
    profile: priyaPProfile as Profile, transactions: priyaPTx as RawPersona["transactions"], bankStatement: priyaPBank as unknown as RawBankStatement,
    score: priyaPScore as TaleFinScore, scoreHistory: priyaPHistory, derived: priyaPDerived as Derived, offers: priyaPOffers as Offers,
    consents: priyaPConsents as RawPersona["consents"],
  },
};

/** Jess on 29/09: tomorrow's Beforepay repayment is bigger than her balance. Other personas use the main snapshot. */
export const RAW_BILLDUE: Partial<Record<PersonaId, RawPersona>> = {
  jess: {
    profile: jessBProfile as Profile, transactions: jessBTx as RawPersona["transactions"], bankStatement: jessBBank as unknown as RawBankStatement,
    score: jessBScore as TaleFinScore, scoreHistory: jessBHistory, derived: jessBDerived as Derived, offers: jessBOffers as Offers,
    consents: jessBConsents as RawPersona["consents"],
  },
};
