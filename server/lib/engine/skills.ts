// The agent harness, described as data: which skills (watchers) exist, which data points each reads,
// how it decides, and the guardrails around the language layer. Rendered in the app's "Meer" tab and
// mirrored in the README, so judges can see exactly how the data is used.

import type { Group } from "./types";

export interface Skill {
  name: string;
  tier: 0 | 1 | 2;
  fires: string; // the rule, in words a customer or a regulator can recompute
  dataPoints: Array<{ group: Group; field: string }>;
  leadTime: string;
  moments: string[];
}

export const SKILLS: Skill[] = [
  {
    name: "Deadline watcher",
    tier: 0,
    fires: "ID or permit expiry within 60 days; a KYC document missing before its review date.",
    dataPoints: [{ group: "A", field: "ID card expiry" }, { group: "A", field: "KYC review date, missing documents" }],
    leadTime: "up to 60 days",
    moments: ["ID expiring", "Document missing", "Renovation obligation (label E/F → D within 6 years)"],
  },
  {
    name: "Cover watcher",
    tier: 0,
    fires: "Group hospitalisation policy ending within 200 days (continuation right: request within 30 days); medical-index rise at the next anniversary; insured capital below 90% of rebuild value, or a renovation drawn after the last valuation; a car paid for with no motor policy; self-employed without income protection; a home in a flood-risk zone.",
    dataPoints: [
      { group: "D", field: "Policies held, insured capital, premiums, anniversaries" },
      { group: "H", field: "Medical index, continuation right, renovation obligation" },
      { group: "C", field: "Renovation or energy loan drawdowns" },
      { group: "B", field: "Car-dealer and vehicle-registration payments" },
      { group: "E", field: "Employment, address flood zone" },
    ],
    leadTime: "30 to 200 days",
    moments: ["Premium shock at retirement", "Premium rise at anniversary", "Home underinsured", "New car, no cover", "Income-protection gap", "Flood-zone check"],
  },
  {
    name: "Cash-flow watcher",
    tier: 1,
    fires: "A 30-day projection: balance + expected inflows − recurring debits, day by day. Fires when the projected minimum goes below zero; names the date and the debits that cause it.",
    dataPoints: [{ group: "B", field: "Balance, salary/pension/invoice inflows, recurring debits (same payee, same day ±2, amount ±15%)" }],
    leadTime: "up to 30 days",
    moments: ["Month-end shortfall"],
  },
  {
    name: "Risk watcher",
    tier: 2,
    fires: "One logistic score with five reason codes: new device ≤ 1 day (+2.2), SMS link opened ≤ 60 min (+2.0), first payment to this payee (+1.2), amount > 3× usual (+1.0), name check not green (+1.5), intercept −3. Fires above p = 0.6. Always on: fraud monitoring is a legal duty.",
    dataPoints: [{ group: "G", field: "Device enrolment, SMS link timing" }, { group: "B", field: "Pending transfer: payee history, amount vs usual, name-check result" }],
    leadTime: "real time",
    moments: ["Scam in progress"],
  },
  {
    name: "Drift watcher",
    tier: 1,
    fires: "Monthly outflows to neobank or broker IBANs: the last three months average more than twice the first three, and more than €200.",
    dataPoints: [{ group: "B", field: "Transfers to competitor IBANs, six months" }],
    leadTime: "monthly",
    moments: ["Money drifting to another app"],
  },
  {
    name: "Value watcher",
    tier: 0,
    fires: "Free youth account turning paid within 60 days, with the tier that fits actual feature use; savings ≥ €5,000 at ≤ 1% for 12+ months while a better KBC product exists; a term deposit maturing within 30 days.",
    dataPoints: [{ group: "A", field: "Date of birth" }, { group: "C", field: "Account tier, feature use, rates held, deposits" }, { group: "B", field: "Savings balance and how long it has sat" }],
    leadTime: "30 to 60 days",
    moments: ["Fee cliff at 25", "Idle savings", "Term deposit maturing"],
  },
  {
    name: "Credit watcher",
    tier: 1,
    fires: "A notary deposit plus a mortgage quote: computes duty (2% sole own home vs 12%), loan and LTV, the bundle's interest saving vs its insurance premium over the switch window (1/3 of term, law of June 2024), the energy loan vs mortgage for an EPC E/F renovation, and the rebuild value to insure.",
    dataPoints: [{ group: "B", field: "Notary deposit" }, { group: "C", field: "Mortgage quote: rates, term, own funds" }, { group: "D", field: "Bundled vs market home premium" }, { group: "H", field: "Registration duty, switch right, renovation obligation" }, { group: "F", field: "Abandoned simulator, searches (only at dial level 3)" }],
    leadTime: "before the deed",
    moments: ["House purchase, checked as a whole", "Insure the rebuild value"],
  },
  {
    name: "Behaviour watcher",
    tier: 1,
    fires: "The same screen opened three times in a week (e.g. overdraft settings): offer help before the customer takes the expensive route.",
    dataPoints: [{ group: "F", field: "Repeated screens, abandoned flows" }],
    leadTime: "same week",
    moments: ["Stuck on a screen"],
  },
];

export const HARNESS = [
  { step: "Sense", what: "Payments, logins and devices arrive as events; balances, policies and calendars as a nightly batch." },
  { step: "Situate", what: "A situation record per customer: life stage, horizon dates, risk state, digital confidence, preferred channel, consent set." },
  { step: "Decide", what: "The skills above turn the record into candidate moments, each with evidence, lead time, expected harm and options. Rules decide; no model decides." },
  { step: "Gate", what: "Consent set (per data group), regulation, frequency caps: at most four moments on screen, one screen never a feed. Health and credit moments route to an adviser before sending." },
  { step: "Explain", what: "Every message is rendered from templates over the facts. In production a small model phrases it and the output is rejected if it contains a number not in the facts." },
  { step: "Route", what: "App card if the customer is app-active; adviser task if branch-preferred; letter or phone script otherwise." },
  { step: "Learn", what: "Opened, acted, dismissed, harm-happened-anyway: precision and lead time per skill feed the thresholds." },
];

export const GUARDRAILS = [
  "The model never decides and never writes a reply on its own: it only classifies the customer's message into a fixed intent and fills slots the engine validates.",
  "Every reply the customer sees is a template over verified facts; a factual answer is discarded if it contains a number not in the fact sheet, claims an action, or exceeds 60 words.",
  "Every moment cites its data points by group; the customer can switch any group off, except identity and security (legal duty).",
  "Health- and credit-related moments need an adviser to confirm before anything is final.",
  "No AI is used to price insurance or decide credit (AI Act high-risk categories).",
];
