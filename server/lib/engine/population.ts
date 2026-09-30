// A seeded synthetic population, so the scale view shows what the engine finds across tens of thousands
// of customers "today". No real data anywhere; the same seed gives the same numbers on every server.

import { daysFromNow } from "./personas";
import type { Customer, MomentFamily } from "./types";
import { runWatchers } from "./watchers";

export const POPULATION_SIZE = 50_000;

// mulberry32: small, fast, deterministic
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synth(i: number, r: () => number): Customer {
  const age = 18 + Math.floor(r() * 70);
  const employment = age >= 66 ? "retired" : r() < 0.14 ? "self-employed" : age < 23 && r() < 0.5 ? "student" : "employee";
  const homeowner = age > 28 && r() < 0.7;
  const savings = Math.round(r() ** 2 * 120_000);
  const groupHosp = employment === "employee" && r() < 0.6;
  const retiringSoon = employment === "employee" && age >= 63 && r() < 0.5;
  const rebuild = 180_000 + Math.round(r() * 220_000);
  const insuredRatio = 0.75 + r() * 0.35;
  const scam = r() < 0.003;
  const salaryDay = 25 + Math.floor(r() * 6);
  const rentDay = 1 + Math.floor(r() * 5);
  const income = employment === "retired" ? 1_500 + r() * 1_500 : 1_800 + r() * 2_800;
  const drift = r() < 0.12 && age < 40;
  const buying = age >= 25 && age <= 45 && !homeowner && r() < 0.02;
  const renovated = homeowner && r() < 0.05;

  return {
    id: `s${i}`,
    name: "",
    age,
    consent: (r() < 0.1 ? 0 : r() < 0.35 ? 1 : r() < 0.85 ? 2 : 3) as 0 | 1 | 2 | 3,
    channel: age > 70 && r() < 0.6 ? "phone" : "app",
    digitalConfidence: age > 70 ? "low" : "high",
    language: r() < 0.6 ? "nl" : "fr",
    identity: { idExpiry: daysFromNow(Math.floor(r() * 3650) - 30), missingDocs: r() < 0.015 ? ["proof of address"] : [] },
    accounts: {
      balance: Math.round(r() * 6_000) - (r() < 0.1 ? 500 : 0),
      savings,
      savingsRate: 0.6,
      savingsIdleMonths: Math.floor(r() * 40),
      tier: age < 25 ? "plus" : r() < 0.5 ? "plus" : "basic",
      tierFee: age < 25 ? 0 : 4.25,
      tierFeatureUse: r(),
      inflows:
        employment === "self-employed"
          ? [{ type: "invoices", amount: Math.round(income * 1.4), expectedDate: daysFromNow(10 + Math.floor(r() * 25)) }]
          : [{ type: employment === "retired" ? "pension" : "salary", amount: Math.round(income), dayOfMonth: salaryDay }],
      recurring: [
        { name: homeowner ? "Mortgage" : "Rent", amount: Math.round(600 + r() * 700), dayOfMonth: rentDay, category: "housing" },
        { name: "Energy", amount: Math.round(120 + r() * 150), dayOfMonth: 5, category: "utilities" },
        ...(employment === "self-employed" ? [{ name: "VAT prepayment", amount: Math.round(800 + r() * 2_000), dayOfMonth: 20, category: "tax" }] : []),
      ],
      typicalTransfer: 100 + Math.round(r() * 400),
      competitorOutflows: drift ? [20, 40, 80, 150, 220, 300].map((x) => Math.round(x * (0.6 + r()))) : [0, 0, 0, 0, 0, 0],
      overdraftDays: 0,
    },
    products: {
      termDepositMaturing: r() < 0.04 ? { date: daysFromNow(Math.floor(r() * 30)), amount: 10_000 + Math.round(r() * 40_000), rate: 2.6 } : undefined,
      renovationLoan: renovated ? { drawdownDate: daysFromNow(-Math.floor(r() * 80)), amount: 15_000 + Math.round(r() * 40_000) } : undefined,
      mortgageQuote: buying
        ? { price: 250_000 + Math.round(r() * 250_000), ownFunds: 40_000 + Math.round(r() * 100_000), soleOwnHome: true, termYears: 25, rateStandalone: 3.45, rateBundled: 3.3, bundledHomePremium: 640, marketHomePremium: 470, protectionPremium: 410, epc: r() < 0.4 ? "E" : "C", renovationEstimate: 35_000, energyLoanRate: 2.45 }
        : undefined,
    },
    insurance: {
      home: homeowner ? { insuredCapital: Math.round(rebuild * insuredRatio), rebuildValue: rebuild, lastValuation: daysFromNow(-Math.floor(r() * 1500)), premium: 450 } : undefined,
      hospitalisation: groupHosp
        ? { type: "group", premium: 0, employerCoverEnds: retiringSoon ? daysFromNow(Math.floor(r() * 200)) : undefined }
        : r() < 0.5
          ? { type: "individual", premium: 700 + Math.round(r() * 500), anniversary: daysFromNow(Math.floor(r() * 365)), nextChangePct: 11.86 }
          : undefined,
      motor: r() < 0.7,
      incomeProtection: employment === "self-employed" ? r() < 0.4 : undefined,
    },
    life: {
      household: r() < 0.4 ? "single" : r() < 0.7 ? "couple" : "family",
      dependants: 0,
      employment,
      retirementDate: retiringSoon ? daysFromNow(Math.floor(r() * 200)) : undefined,
      birthday: age === 24 ? daysFromNow(Math.floor(r() * 365)) : undefined,
      homeowner,
      floodZone: r() < 0.045,
      region: r() < 0.55 ? "Flanders" : r() < 0.85 ? "Wallonia" : "Brussels",
    },
    behaviour: { loginsPerMonth: Math.floor(r() * 40), repeatedScreens: r() < 0.02 ? ["overdraft-settings", "overdraft-settings", "overdraft-settings"] : [], abandonedFlows: [], searches: [], contactCentreCalls: 0 },
    device: scam ? { newDeviceDays: 0, smsLinkFollowedMinutesAgo: 5 + Math.floor(r() * 50), pendingTransfer: { amount: 800 + Math.round(r() * 4_000), newBeneficiary: true, vop: "orange", beneficiaryName: "unknown" } } : {},
    events: r() < 0.01 ? [{ date: daysFromNow(-Math.floor(r() * 25)), type: "car-dealer", amount: 12_000 + Math.round(r() * 20_000), merchant: "car dealer" }] : [],
  };
}

export interface ScaleRow {
  kind: string;
  family: MomentFamily;
  title: string;
  count: number;
  avgHorizonDays: number;
  harmEUR: number;
  valueEUR: number;
  hiddenByConsent: number;
}

export interface ScaleReport {
  population: number;
  customersWithMoment: number;
  totalMoments: number;
  rows: ScaleRow[];
  consentDistribution: number[]; // index = level
  generatedAt: string;
}

let cache: ScaleReport | null = null;

export function scaleReport(size = POPULATION_SIZE): ScaleReport {
  if (cache && cache.population === size) return cache;
  const r = rng(20260930);
  const rows = new Map<string, ScaleRow & { horizonSum: number }>();
  const consent = [0, 0, 0, 0];
  let withMoment = 0;
  let total = 0;
  for (let i = 0; i < size; i++) {
    const c = synth(i, r);
    consent[c.consent]++;
    const moments = runWatchers(c);
    if (moments.length) withMoment++;
    for (const m of moments) {
      total++;
      const row = rows.get(m.kind) ?? { kind: m.kind, family: m.family, title: m.title.replace(/\d[\d,.]*/g, "…").replace(/on …+ \w+ \d+/g, ""), count: 0, avgHorizonDays: 0, harmEUR: 0, valueEUR: 0, hiddenByConsent: 0, horizonSum: 0 };
      row.count++;
      row.horizonSum += m.horizonDays;
      row.harmEUR += m.harmEUR ?? 0;
      row.valueEUR += m.valueEUR ?? 0;
      if (m.requiredConsent > c.consent) row.hiddenByConsent++;
      rows.set(m.kind, row);
    }
  }
  const out: ScaleRow[] = [...rows.values()]
    .map(({ horizonSum, ...row }) => ({ ...row, avgHorizonDays: Math.round(horizonSum / row.count) }))
    .sort((a, b) => b.count - a.count);
  cache = { population: size, customersWithMoment: withMoment, totalMoments: total, rows: out, consentDistribution: consent, generatedAt: new Date().toISOString() };
  return cache;
}
