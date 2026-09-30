// Data model for the Heads-Up engine.
// Every field here is something a bank-insurer like KBC already stores for operations or compliance.
// The letters A–H are the data groups from docs/hackathon/PLAN.private.md; each moment cites the groups it used.

export type ConsentLevel = 0 | 1 | 2 | 3;
export const CONSENT_LABELS: Record<ConsentLevel, string> = {
  0: "Only the essentials",
  1: "My products",
  2: "My money patterns",
  3: "How I use the app",
};

export type Group = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export const GROUP_NAMES: Record<Group, string> = {
  A: "Identity & compliance",
  B: "Accounts & payments",
  C: "Products & pricing",
  D: "Insurance",
  E: "Life stage & household",
  F: "Behaviour & channel",
  G: "Device & security",
  H: "External calendars & rules",
};

// Which consent level unlocks which data group (see the plan's "consent dial" section).
export const GROUP_CONSENT: Record<Group, ConsentLevel> = { A: 0, G: 0, C: 1, D: 1, H: 1, B: 2, E: 2, F: 3 };

export type Channel = "app" | "branch" | "phone" | "letter";

export interface Recurring {
  name: string;
  amount: number; // positive = debit
  dayOfMonth: number;
  category: string;
}

export interface Inflow {
  type: "salary" | "pension" | "benefit" | "invoices";
  amount: number;
  dayOfMonth?: number; // regular inflows
  expectedDate?: string; // irregular (invoices), ISO date
  source?: string;
}

export interface TxEvent {
  date: string; // ISO
  type: string; // "notary-deposit" | "car-dealer" | "vehicle-registration" | "contractor" | "child-allowance" | ...
  amount?: number;
  merchant?: string;
}

export interface Customer {
  id: string;
  name: string;
  age: number;
  consent: ConsentLevel;
  channel: Channel;
  digitalConfidence: "low" | "medium" | "high";
  language: "nl" | "fr" | "en";

  identity: { idExpiry: string; kycDue?: string; missingDocs: string[] };

  accounts: {
    balance: number;
    savings: number;
    savingsRate: number; // %, e.g. 0.6
    savingsIdleMonths: number;
    tier: "basic" | "plus" | "payg";
    tierFee: number; // €/month currently paid
    tierFeatureUse: number; // 0..1 share of tier features actually used
    inflows: Inflow[];
    recurring: Recurring[];
    typicalTransfer: number; // median outgoing transfer
    competitorOutflows: number[]; // last 6 months, € to neobank / broker IBANs
    overdraftDays: number;
  };

  products: {
    mortgage?: { start: string; termYears: number; rate: number; monthly: number; principal: number; bundledInsurance: boolean };
    mortgageQuote?: MortgageQuote; // a purchase in progress
    renovationLoan?: { drawdownDate: string; amount: number };
    termDepositMaturing?: { date: string; amount: number; rate: number };
    pensionSavings?: number;
    investments?: number;
  };

  insurance: {
    home?: { insuredCapital: number; rebuildValue: number; lastValuation: string; premium: number };
    hospitalisation?: { type: "group" | "individual"; premium: number; employerCoverEnds?: string; anniversary?: string; nextChangePct?: number };
    motor?: boolean;
    family?: boolean;
    incomeProtection?: boolean;
    legal?: boolean;
  };

  life: {
    household: "single" | "couple" | "family";
    dependants: number;
    employment: "employee" | "self-employed" | "retired" | "student";
    retirementDate?: string;
    birthday?: string; // next birthday, ISO
    homeowner: boolean;
    epc?: "A" | "B" | "C" | "D" | "E" | "F";
    purchaseDate?: string;
    floodZone: boolean;
    region: "Flanders" | "Wallonia" | "Brussels";
  };

  behaviour: { loginsPerMonth: number; repeatedScreens: string[]; abandonedFlows: string[]; searches: string[]; contactCentreCalls: number };

  device: {
    newDeviceDays?: number; // days since a new device was enrolled
    smsLinkFollowedMinutesAgo?: number;
    pendingTransfer?: { amount: number; newBeneficiary: boolean; vop: "green" | "orange" | "grey"; beneficiaryName: string };
  };

  events: TxEvent[];
}

export interface MortgageQuote {
  price: number;
  ownFunds: number;
  soleOwnHome: boolean; // Flanders: 2% registration duty for the sole own home since 2025, else 12%
  termYears: number;
  rateStandalone: number; // % without bundled insurance
  rateBundled: number; // % with KBC home + protection insurance
  bundledHomePremium: number; // €/yr
  marketHomePremium: number; // €/yr, comparable cover elsewhere
  protectionPremium: number; // €/yr mortgage protection (schuldsaldo)
  epc: "A" | "B" | "C" | "D" | "E" | "F";
  renovationEstimate: number; // € to reach label D
  energyLoanRate: number; // %
}

export type MomentFamily = "deadline" | "cover" | "cashflow" | "risk" | "drift" | "lifeevent" | "credit" | "value";

export interface Evidence {
  group: Group;
  field: string; // human label
  value: string;
}

export interface MomentOption {
  label: string;
  effect?: string; // "+€312/yr", "avoids a block"
}

export interface Moment {
  id: string;
  family: MomentFamily;
  kind: string; // stable identifier used for aggregation, e.g. "id-expiry"
  title: string;
  summary: string; // template text (fallback when the LLM is unavailable)
  severity: 1 | 2 | 3;
  horizonDays: number; // 0 = now
  harmEUR?: number; // what it prevents
  valueEUR?: number; // what it gains
  evidence: Evidence[];
  options: MomentOption[];
  requiredConsent: ConsentLevel; // max of the groups used
  realtime?: boolean;
  needsHuman?: boolean; // health/credit-adjacent: adviser confirms before sending
}

export interface ExplainedMoment extends Moment {
  message: string;
  explainedBy: "gemini" | "template";
  channelHint: Channel;
}
