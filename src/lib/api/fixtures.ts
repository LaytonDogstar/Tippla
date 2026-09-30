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
