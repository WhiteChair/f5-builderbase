import type { Customer } from "./types";

// Five demo customers, two or three moments each. Dates are relative to "today" so the demo never goes stale.
// All data is invented; names and numbers are plausible for Belgium in 2026.

export const daysFromNow = (n: number): string => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const daysUntil = (iso: string): number => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.round((Date.parse(iso) - today.getTime()) / 86_400_000);
};

export type PersonaMeta = { id: string; name: string; age: number; tagline: string; story: string; showcases: string[] };

export const PERSONA_META: PersonaMeta[] = [
  {
    id: "lien",
    name: "Lien & Tom",
    age: 31,
    tagline: "Buying their first house",
    story: "Signed a compromis for a €385k house with an EPC label E. Their KBC mortgage quote is on the table, and so is a bundled insurance discount.",
    showcases: ["Purchase analysis: credit, insurance and the renovation obligation, in one view", "Home insured for its rebuild value, not its price", "Renovation deadline planned before it bites"],
  },
  {
    id: "marc",
    name: "Marc",
    age: 64,
    tagline: "Retiring in March",
    story: "Employee for 31 years, hospitalisation cover through his employer. His ID card expires next month and a term deposit is maturing.",
    showcases: ["Premium shock at retirement, caught 5 months early", "ID expiry before it becomes a blocked account", "The consent dial: what Kate stops noticing"],
  },
  {
    id: "ayse",
    name: "Ayşe",
    age: 24,
    tagline: "Turning 25 next month",
    story: "Free Plus account until her birthday. Uses Revolut more every month for trips and splitting bills. €9k sits in a savings account at 0.6%.",
    showcases: ["The fee cliff at 25, and the cheapest setup for how she actually banks", "Money drifting to Revolut, and why", "Idle savings vs a 3.15% KBC product"],
  },
  {
    id: "jos",
    name: "Jos",
    age: 72,
    tagline: "Prefers the branch and the phone",
    story: "Retired, banks mostly by phone. Twelve minutes ago he tapped a link in an SMS about a parcel, enrolled a new device, and is about to send €2,850 to a new account.",
    showcases: ["A scam stopped in the moment, explained instead of blamed", "The same moment delivered by phone and adviser, not only the app", "A hospitalisation premium rise flagged before the anniversary"],
  },
  {
    id: "nadia",
    name: "Nadia",
    age: 38,
    tagline: "Self-employed, one child",
    story: "Freelance designer with irregular invoices. VAT prepayment and social contributions land on the 20th; her main client pays late. Bought a car last week.",
    showcases: ["A month-end shortfall projected ten days ahead", "A new car with no motor cover, spotted from one transfer", "The income-protection gap most self-employed people have"],
  },
];

export function buildPersonas(): Record<string, Customer> {
  const base = {
    identity: { idExpiry: daysFromNow(900), missingDocs: [] as string[] },
    behaviour: { loginsPerMonth: 20, repeatedScreens: [] as string[], abandonedFlows: [] as string[], searches: [] as string[], contactCentreCalls: 0 },
    device: {},
    events: [],
  };

  const lien: Customer = {
    ...base,
    id: "lien",
    name: "Lien",
    age: 31,
    consent: 3,
    channel: "app",
    digitalConfidence: "high",
    language: "nl",
    accounts: {
      balance: 4_200,
      savings: 96_000,
      savingsRate: 0.6,
      savingsIdleMonths: 30,
      tier: "plus",
      tierFee: 4.25,
      tierFeatureUse: 0.7,
      inflows: [
        { type: "salary", amount: 2_650, dayOfMonth: 27, source: "Colruyt Group" },
        { type: "salary", amount: 2_900, dayOfMonth: 25, source: "UZ Gent" },
      ],
      recurring: [
        { name: "Rent", amount: 1_050, dayOfMonth: 1, category: "housing" },
        { name: "Energy", amount: 180, dayOfMonth: 5, category: "utilities" },
      ],
      typicalTransfer: 300,
      competitorOutflows: [0, 0, 0, 0, 0, 0],
      overdraftDays: 0,
    },
    products: {
      mortgageQuote: {
        price: 385_000,
        ownFunds: 95_000,
        soleOwnHome: true,
        termYears: 25,
        rateStandalone: 3.45,
        rateBundled: 3.3,
        bundledHomePremium: 640,
        marketHomePremium: 470,
        protectionPremium: 410,
        epc: "E",
        renovationEstimate: 38_000,
        energyLoanRate: 2.45,
      },
    },
    insurance: { family: true },
    life: { household: "couple", dependants: 0, employment: "employee", homeowner: false, epc: "E", floodZone: false, region: "Flanders" },
    behaviour: { ...base.behaviour, loginsPerMonth: 35, abandonedFlows: ["mortgage-simulator"], searches: ["woonlening simulatie", "EPC E renovatieplicht"] },
    events: [
      { date: daysFromNow(-12), type: "notary-deposit", amount: 38_500, merchant: "Notaris Vermeulen" },
      { date: daysFromNow(-20), type: "epc-certificate", merchant: "EPC Keur" },
    ],
  };

  const marc: Customer = {
    ...base,
    id: "marc",
    name: "Marc",
    age: 64,
    consent: 2,
    channel: "app",
    digitalConfidence: "medium",
    language: "nl",
    identity: { idExpiry: daysFromNow(41), missingDocs: [] },
    accounts: {
      balance: 6_800,
      savings: 62_000,
      savingsRate: 0.6,
      savingsIdleMonths: 26,
      tier: "plus",
      tierFee: 4.25,
      tierFeatureUse: 0.5,
      inflows: [{ type: "salary", amount: 3_150, dayOfMonth: 28, source: "Bekaert" }],
      recurring: [
        { name: "Mortgage", amount: 720, dayOfMonth: 2, category: "housing" },
        { name: "Car insurance", amount: 68, dayOfMonth: 10, category: "insurance" },
      ],
      typicalTransfer: 400,
      competitorOutflows: [0, 0, 0, 0, 0, 0],
      overdraftDays: 0,
    },
    products: {
      mortgage: { start: daysFromNow(-365 * 22), termYears: 25, rate: 2.1, monthly: 720, principal: 180_000, bundledInsurance: true },
      termDepositMaturing: { date: daysFromNow(19), amount: 25_000, rate: 2.6 },
      pensionSavings: 41_000,
    },
    insurance: {
      home: { insuredCapital: 310_000, rebuildValue: 320_000, lastValuation: daysFromNow(-700), premium: 520 },
      hospitalisation: { type: "group", premium: 0, employerCoverEnds: daysFromNow(152) },
      motor: true,
      family: true,
    },
    life: { household: "couple", dependants: 0, employment: "employee", retirementDate: daysFromNow(152), homeowner: true, epc: "C", floodZone: false, region: "Flanders" },
    behaviour: { ...base.behaviour, loginsPerMonth: 12, searches: ["pensioen aanvragen", "hospitalisatieverzekering na pensioen"] },
  };

  const ayse: Customer = {
    ...base,
    id: "ayse",
    name: "Ayşe",
    age: 24,
    consent: 2,
    channel: "app",
    digitalConfidence: "high",
    language: "nl",
    accounts: {
      balance: 1_350,
      savings: 9_000,
      savingsRate: 0.6,
      savingsIdleMonths: 18,
      tier: "plus",
      tierFee: 0, // free under 25
      tierFeatureUse: 0.2,
      inflows: [{ type: "salary", amount: 2_150, dayOfMonth: 30, source: "Deloitte" }],
      recurring: [
        { name: "Rent", amount: 690, dayOfMonth: 1, category: "housing" },
        { name: "Phone", amount: 25, dayOfMonth: 8, category: "utilities" },
      ],
      typicalTransfer: 120,
      competitorOutflows: [40, 60, 110, 170, 260, 340],
      overdraftDays: 0,
    },
    products: {},
    insurance: { family: false },
    life: { household: "single", dependants: 0, employment: "employee", birthday: daysFromNow(38), homeowner: false, floodZone: false, region: "Brussels" },
    behaviour: { ...base.behaviour, loginsPerMonth: 40, searches: ["kosten plusrekening", "wisselkoers kaart buitenland"] },
  };

  const jos: Customer = {
    ...base,
    id: "jos",
    name: "Jos",
    age: 72,
    consent: 1,
    channel: "phone",
    digitalConfidence: "low",
    language: "nl",
    accounts: {
      balance: 3_900,
      savings: 48_000,
      savingsRate: 0.6,
      savingsIdleMonths: 40,
      tier: "basic",
      tierFee: 2.5,
      tierFeatureUse: 0.6,
      inflows: [{ type: "pension", amount: 1_920, dayOfMonth: 3, source: "Federale Pensioendienst" }],
      recurring: [
        { name: "Energy", amount: 210, dayOfMonth: 6, category: "utilities" },
        { name: "Hospitalisation insurance", amount: 74, dayOfMonth: 15, category: "insurance" },
      ],
      typicalTransfer: 150,
      competitorOutflows: [0, 0, 0, 0, 0, 0],
      overdraftDays: 0,
    },
    products: {},
    insurance: {
      hospitalisation: { type: "individual", premium: 888, anniversary: daysFromNow(33), nextChangePct: 11.86 },
      home: { insuredCapital: 260_000, rebuildValue: 265_000, lastValuation: daysFromNow(-400), premium: 430 },
      family: true,
    },
    life: { household: "single", dependants: 0, employment: "retired", homeowner: true, epc: "D", floodZone: true, region: "Wallonia" },
    behaviour: { ...base.behaviour, loginsPerMonth: 3, contactCentreCalls: 2 },
    device: { newDeviceDays: 0, smsLinkFollowedMinutesAgo: 12, pendingTransfer: { amount: 2_850, newBeneficiary: true, vop: "orange", beneficiaryName: "PostNL Douane BV" } },
  };

  const nadia: Customer = {
    ...base,
    id: "nadia",
    name: "Nadia",
    age: 38,
    consent: 2,
    channel: "app",
    digitalConfidence: "high",
    language: "fr",
    accounts: {
      balance: 1_900,
      savings: 6_000,
      savingsRate: 0.6,
      savingsIdleMonths: 9,
      tier: "plus",
      tierFee: 4.25,
      tierFeatureUse: 0.8,
      inflows: [{ type: "invoices", amount: 4_800, expectedDate: daysFromNow(24), source: "Studio Marchand (late payer)" }],
      recurring: [
        { name: "Rent (workspace + home)", amount: 1_150, dayOfMonth: 1, category: "housing" },
        { name: "VAT prepayment", amount: 2_400, dayOfMonth: 20, category: "tax" },
        { name: "Social contributions", amount: 890, dayOfMonth: 20, category: "tax" },
        { name: "Childcare", amount: 420, dayOfMonth: 5, category: "family" },
      ],
      typicalTransfer: 500,
      competitorOutflows: [0, 0, 0, 0, 0, 0],
      overdraftDays: 4,
    },
    products: {},
    insurance: { family: true, motor: false, incomeProtection: false },
    life: { household: "family", dependants: 1, employment: "self-employed", homeowner: false, floodZone: false, region: "Brussels" },
    behaviour: { ...base.behaviour, loginsPerMonth: 25, repeatedScreens: ["overdraft-settings", "overdraft-settings", "overdraft-settings"] },
    events: [
      { date: daysFromNow(-6), type: "car-dealer", amount: 18_500, merchant: "Garage Delvaux" },
      { date: daysFromNow(-4), type: "vehicle-registration", amount: 61, merchant: "DIV / SPF Mobilité" },
    ],
  };

  return { lien, marc, ayse, jos, nadia };
}
