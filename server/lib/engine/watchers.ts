// Watchers: one per moment family. Each reads the customer's data, and when a preventive moment exists,
// returns it with the evidence (which data points, from which group) and the options.
// Tier 0 = facts and calendars, Tier 1 = patterns over transactions, Tier 2 = scores with reason codes.
// No LLM here: rules decide; the Explainer (explain.ts) only phrases the result.

import { daysFromNow, daysUntil } from "./personas";
import { GROUP_CONSENT, type ConsentLevel, type Customer, type Evidence, type Moment } from "./types";

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
const pct = (n: number) => n.toFixed(2).replace(/\.?0+$/, "") + "%";
const ordinal = (n: number) => `${n}${[, "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10] || "th"}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function consentFor(evidence: Evidence[], override?: ConsentLevel): ConsentLevel {
  if (override !== undefined) return override;
  return evidence.reduce<ConsentLevel>((m, e) => (GROUP_CONSENT[e.group] > m ? GROUP_CONSENT[e.group] : m), 0);
}

type Draft = Omit<Moment, "id" | "requiredConsent"> & { requiredConsent?: ConsentLevel };

function moment(c: Customer, d: Draft): Moment {
  return { ...d, id: `${c.id}:${d.kind}`, requiredConsent: consentFor(d.evidence, d.requiredConsent) };
}

// Monthly annuity payment for a loan.
const annuity = (principal: number, ratePct: number, years: number) => {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
};

// ---------- Tier 0: deadlines ----------

export function deadlineWatcher(c: Customer): Moment[] {
  const out: Moment[] = [];
  const idDays = daysUntil(c.identity.idExpiry);
  if (idDays <= 60) {
    out.push(
      moment(c, {
        family: "deadline",
        kind: "id-expiry",
        title: idDays < 0 ? "Your ID card has expired" : `Your ID card expires in ${idDays} days`,
        summary: `Your identity card expires on ${fmtDate(c.identity.idExpiry)}. Without a valid ID on file, payments and cards get restricted. Renewing it takes one photo in the app.`,
        severity: idDays <= 30 ? 3 : 2,
        horizonDays: Math.max(idDays, 0),
        evidence: [{ group: "A", field: "ID card expiry", value: fmtDate(c.identity.idExpiry) }],
        options: [{ label: "Upload the new ID now", effect: "avoids a block" }, { label: "Book a 10-minute branch slot" }, { label: "Remind me in 2 weeks" }],
      }),
    );
  }
  if (c.identity.missingDocs.length) {
    out.push(
      moment(c, {
        family: "deadline",
        kind: "kyc-missing",
        title: "One document is still missing",
        summary: `We're missing ${c.identity.missingDocs.join(", ")}. Once it's in, nothing else is needed.`,
        severity: 2,
        horizonDays: c.identity.kycDue ? Math.max(daysUntil(c.identity.kycDue), 0) : 30,
        evidence: [{ group: "A", field: "KYC file", value: `missing: ${c.identity.missingDocs.join(", ")}` }],
        options: [{ label: "Upload it now" }, { label: "Ask what exactly is needed" }],
      }),
    );
  }
  return out;
}

// ---------- Tier 0/1: insurance cover ----------

export function coverWatcher(c: Customer): Moment[] {
  const out: Moment[] = [];
  const h = c.insurance.hospitalisation;

  if (h?.type === "group" && h.employerCoverEnds) {
    const days = daysUntil(h.employerCoverEnds);
    if (days <= 200) {
      const individual = 900 + Math.max(0, c.age - 50) * 9; // demo estimate of an individual premium at this age
      out.push(
        moment(c, {
          family: "cover",
          kind: "hospitalisation-retirement",
          title: "Your hospitalisation cover changes when you retire",
          summary: `Your employer's hospitalisation insurance ends on ${fmtDate(h.employerCoverEnds)}. By law you can continue it individually without a new medical questionnaire, but only if you ask within 30 days of it ending. An individual policy at your age costs about ${eur(individual)} a year; a two-person-room formula is cheaper.`,
          severity: 3,
          horizonDays: Math.max(days, 0),
          harmEUR: individual,
          needsHuman: true,
          evidence: [
            { group: "D", field: "Hospitalisation policy", value: `group policy via employer, ends ${fmtDate(h.employerCoverEnds)}` },
            { group: "H", field: "Continuation right", value: "request within 30 days, no medical questionnaire" },
          ],
          options: [
            { label: "Pre-register the continuation", effect: "keeps cover, no medical questions" },
            { label: "Compare the two-person-room formula", effect: "lower premium" },
            { label: "Talk to an adviser" },
          ],
        }),
      );
    }
  }

  if (h?.type === "individual" && h.anniversary && h.nextChangePct) {
    const days = daysUntil(h.anniversary);
    if (days <= 45) {
      const next = h.premium * (1 + h.nextChangePct / 100);
      out.push(
        moment(c, {
          family: "cover",
          kind: "hospitalisation-increase",
          title: `Your hospitalisation premium goes up by ${pct(h.nextChangePct)} on ${fmtDate(h.anniversary)}`,
          summary: `The medical index allows a ${pct(h.nextChangePct)} rise this year, so your premium goes from ${eur(h.premium)} to ${eur(next)} a year. Switching to a two-person-room formula limits the rise to 6.47%.`,
          severity: 2,
          horizonDays: Math.max(days, 0),
          harmEUR: next - h.premium,
          evidence: [
            { group: "D", field: "Hospitalisation policy", value: `individual, ${eur(h.premium)}/yr, anniversary ${fmtDate(h.anniversary)}` },
            { group: "H", field: "Medical index 2026", value: `single room +${pct(h.nextChangePct)}, two-person room +6.47%` },
          ],
          options: [{ label: "Switch to the two-person-room formula", effect: `saves about ${eur(next - h.premium - h.premium * 0.0647)}/yr` }, { label: "Keep as is" }, { label: "Call me about it" }],
        }),
      );
    }
  }

  const home = c.insurance.home;
  if (home && c.products.renovationLoan && daysUntil(c.products.renovationLoan.drawdownDate) >= -90 && home.lastValuation < c.products.renovationLoan.drawdownDate) {
    out.push(
      moment(c, {
        family: "cover",
        kind: "home-underinsured-renovation",
        title: "Your renovation isn't covered yet",
        summary: `Your home insurance is based on a valuation from ${fmtDate(home.lastValuation)}, before your ${eur(c.products.renovationLoan.amount)} renovation. If it's insured for less than it's worth, a claim is paid out proportionally. Updating the insured amount takes two minutes.`,
        severity: 2,
        horizonDays: 30,
        evidence: [
          { group: "C", field: "Renovation loan", value: `${eur(c.products.renovationLoan.amount)} drawn on ${fmtDate(c.products.renovationLoan.drawdownDate)}` },
          { group: "D", field: "Home insurance", value: `insured for ${eur(home.insuredCapital)}, valued ${fmtDate(home.lastValuation)}` },
        ],
        options: [{ label: "Update the insured amount" }, { label: "Ask for a new valuation" }],
      }),
    );
  } else if (home && home.insuredCapital < home.rebuildValue * 0.9) {
    const shortfall = 1 - home.insuredCapital / home.rebuildValue;
    out.push(
      moment(c, {
        family: "cover",
        kind: "home-underinsured",
        title: "Your home is insured for less than it's worth",
        summary: `Your home is insured for ${eur(home.insuredCapital)} but rebuilding it would cost about ${eur(home.rebuildValue)}. On a ${eur(20_000)} claim you'd get ${eur(20_000 * (1 - shortfall))}.`,
        severity: 2,
        horizonDays: 30,
        harmEUR: Math.round(home.rebuildValue * 0.04 * 0.5 * shortfall), // expected yearly: 4% claim chance × a partial loss × the proportional cut
        evidence: [{ group: "D", field: "Home insurance", value: `insured ${eur(home.insuredCapital)} vs rebuild value ${eur(home.rebuildValue)}` }],
        options: [{ label: "Update the insured amount" }],
      }),
    );
  }

  if (c.life.floodZone && home) {
    out.push(
      moment(c, {
        family: "cover",
        kind: "flood-zone-check",
        title: "Your street is in a flood-risk zone",
        summary: `Your address is in a zone with flood risk. Your fire insurance covers floods by law, but the ceiling matters: check that the insured amount and contents cover are up to date before the next storm season.`,
        severity: 1,
        horizonDays: 60,
        evidence: [
          { group: "E", field: "Address", value: "flood-risk zone (regional map)" },
          { group: "D", field: "Home insurance", value: `insured for ${eur(home.insuredCapital)}` },
        ],
        options: [{ label: "Check my cover" }, { label: "Not now" }],
      }),
    );
  }

  const recentCar = c.events.find((e) => e.type === "car-dealer" && daysUntil(e.date) >= -30);
  if (recentCar && !c.insurance.motor) {
    out.push(
      moment(c, {
        family: "lifeevent",
        kind: "new-car-no-cover",
        title: "New car, no motor insurance on file",
        summary: `You paid ${eur(recentCar.amount ?? 0)} to ${recentCar.merchant} and registered a vehicle. We don't see motor insurance with us. If it's insured elsewhere, tell me once and I'll stop asking.`,
        severity: 2,
        horizonDays: 0,
        evidence: [
          { group: "B", field: "Payments", value: `${eur(recentCar.amount ?? 0)} to ${recentCar.merchant}, vehicle registration fee` },
          { group: "D", field: "Motor insurance", value: "none with KBC" },
        ],
        options: [{ label: "Get a motor quote" }, { label: "It's insured elsewhere" }],
      }),
    );
  }

  if (c.life.employment === "self-employed" && !c.insurance.incomeProtection) {
    out.push(
      moment(c, {
        family: "cover",
        kind: "income-protection-gap",
        title: "If you couldn't work for three months, what would come in?",
        summary: `You're self-employed without income-protection cover. The statutory benefit is around ${eur(1_900)} a month after the waiting period. Guaranteed-income cover fills the gap; it's tax-deductible for the self-employed.`,
        severity: 1,
        horizonDays: 90,
        needsHuman: true,
        evidence: [
          { group: "E", field: "Employment", value: "self-employed" },
          { group: "D", field: "Income protection", value: "none" },
        ],
        options: [{ label: "See what it would cost" }, { label: "Not now" }],
      }),
    );
  }

  return out;
}

// ---------- Tier 1: cash-flow projection ----------

export function cashflowWatcher(c: Customer): Moment[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let balance = c.accounts.balance;
  let min = balance;
  let minDate = today;
  const causes = new Set<string>();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const dom = d.getUTCDate();
    for (const inflow of c.accounts.inflows) {
      if (inflow.dayOfMonth === dom || inflow.expectedDate === iso) balance += inflow.amount;
    }
    for (const r of c.accounts.recurring) {
      if (r.dayOfMonth === dom) {
        balance -= r.amount;
        if (balance < 0) causes.add(r.name);
      }
    }
    if (balance < min) {
      min = balance;
      minDate = d;
    }
  }
  if (min >= 0) return [];
  const shortfall = -min;
  const lateInvoice = c.accounts.inflows.find((i) => i.type === "invoices");
  return [
    moment(c, {
      family: "cashflow",
      kind: "month-end-shortfall",
      title: `Your account dips ${eur(shortfall)} below zero on ${fmtDate(minDate.toISOString())}`,
      summary: `Based on your usual payments, ${[...causes].join(" and ")} on the ${ordinal(minDate.getUTCDate())} take the balance to ${eur(min)}${lateInvoice ? `, before ${lateInvoice.source} pays on ${fmtDate(lateInvoice.expectedDate!)}` : ""}. Moving ${eur(shortfall)} from savings for two weeks avoids overdraft interest and a declined payment.`,
      severity: 3,
      horizonDays: Math.max(daysUntil(minDate.toISOString().slice(0, 10)), 0),
      harmEUR: Math.round(shortfall * 0.012 + 12), // overdraft interest for two weeks + a declined-debit fee
      evidence: [
        { group: "B", field: "Balance", value: eur(c.accounts.balance) },
        { group: "B", field: "Upcoming debits", value: c.accounts.recurring.map((r) => `${r.name} ${eur(r.amount)} (${ordinal(r.dayOfMonth)})`).join(", ") },
        ...(lateInvoice ? [{ group: "B" as const, field: "Expected inflow", value: `${eur(lateInvoice.amount)} from ${lateInvoice.source}, ${fmtDate(lateInvoice.expectedDate!)}` }] : []),
      ],
      options: [
        { label: `Move ${eur(shortfall)} from savings until the invoice lands`, effect: "no overdraft cost" },
        { label: "Shift the social contributions to the 28th" },
        { label: "Set a low-balance alert only" },
      ],
    }),
  ];
}

// ---------- Tier 2: risk score (reason codes) ----------

export function riskWatcher(c: Customer): Moment[] {
  const t = c.device.pendingTransfer;
  if (!t) return [];
  const reasons: Evidence[] = [];
  let z = -3;
  if (c.device.newDeviceDays !== undefined && c.device.newDeviceDays <= 1) {
    z += 2.2;
    reasons.push({ group: "G", field: "New device", value: `enrolled ${c.device.newDeviceDays === 0 ? "today" : "yesterday"}` });
  }
  if (c.device.smsLinkFollowedMinutesAgo !== undefined && c.device.smsLinkFollowedMinutesAgo <= 60) {
    z += 2.0;
    reasons.push({ group: "G", field: "SMS link", value: `opened ${c.device.smsLinkFollowedMinutesAgo} min ago` });
  }
  if (t.newBeneficiary) {
    z += 1.2;
    reasons.push({ group: "B", field: "Beneficiary", value: `first payment to ${t.beneficiaryName}` });
  }
  if (t.amount > 3 * c.accounts.typicalTransfer) {
    z += 1.0;
    reasons.push({ group: "B", field: "Amount", value: `${eur(t.amount)} vs your usual ${eur(c.accounts.typicalTransfer)}` });
  }
  if (t.vop !== "green") {
    z += 1.5;
    reasons.push({ group: "B", field: "Name check", value: `${t.vop}: name and account don't match` });
  }
  const p = 1 / (1 + Math.exp(-z));
  if (p < 0.6) return [];
  return [
    moment(c, {
      family: "risk",
      kind: "scam-in-progress",
      title: "Let's pause this payment for a moment",
      summary: `This ${eur(t.amount)} transfer to ${t.beneficiaryName} looks like a scam we see a lot: a link in a text message, a new device, a new account, and a name that doesn't match. Nothing is blocked. I'll hold it for 4 hours and call you on your usual number; you can also cancel it now.`,
      severity: 3,
      horizonDays: 0,
      realtime: true,
      harmEUR: t.amount,
      requiredConsent: 0, // fraud monitoring is a legal duty, not a preference
      evidence: [...reasons, { group: "G", field: "Risk score", value: `${Math.round(p * 100)}% (reason codes above)` }],
      options: [{ label: "Hold it 4 hours and call me", effect: "you decide after the call" }, { label: "Cancel the payment" }, { label: "I'm sure, send it (adviser confirms by phone)" }],
    }),
  ];
}

// ---------- Tier 1: drift to competitors ----------

export function driftWatcher(c: Customer): Moment[] {
  const o = c.accounts.competitorOutflows;
  if (o.length < 6) return [];
  const first = (o[0] + o[1] + o[2]) / 3;
  const last = (o[3] + o[4] + o[5]) / 3;
  if (last < 200 || last < 2 * Math.max(first, 30)) return [];
  return [
    moment(c, {
      family: "drift",
      kind: "competitor-drift",
      title: `You've moved ${eur(o[5])} to another app this month`,
      summary: `Your top-ups to Revolut went from ${eur(o[0])} to ${eur(o[5])} a month. If it's about card costs abroad, the Basic account with the travel option costs less than what you're paying now. If it's the app, tell me what's missing.`,
      severity: 1,
      horizonDays: 0,
      valueEUR: last * 12 * 0.02,
      evidence: [{ group: "B", field: "Transfers to neobank IBANs", value: o.map((x) => eur(x)).join(" → ") }],
      options: [{ label: "Show me the cheaper setup" }, { label: "It's the app, here's what's missing" }, { label: "Stop noticing this" }],
    }),
  ];
}

// ---------- Tier 0/1: fees and idle money ----------

export function valueWatcher(c: Customer): Moment[] {
  const out: Moment[] = [];
  const a = c.accounts;

  if (c.age === 24 && c.life.birthday && daysUntil(c.life.birthday) <= 60 && a.tier === "plus" && a.tierFee === 0) {
    const plus = 4.25;
    const basic = 2.5;
    const fit = a.tierFeatureUse < 0.4 ? "basic" : "plus";
    out.push(
      moment(c, {
        family: "value",
        kind: "fee-cliff-25",
        title: `Your free account ends on your birthday (${fmtDate(c.life.birthday)})`,
        summary: `From 25, the Plus account costs ${eur(plus)} a month. You use about ${Math.round(a.tierFeatureUse * 100)}% of what Plus offers, so the ${fit === "basic" ? `Basic account at ${eur(basic)} a month fits how you bank` : "Plus account is worth keeping"}. Nothing changes unless you say so.`,
        severity: 2,
        horizonDays: daysUntil(c.life.birthday),
        valueEUR: fit === "basic" ? (plus - basic) * 12 : 0,
        evidence: [
          { group: "A", field: "Date of birth", value: `turns 25 on ${fmtDate(c.life.birthday)}` },
          { group: "C", field: "Account tier", value: `Plus, free under 25, ${Math.round(a.tierFeatureUse * 100)}% of features used` },
        ],
        options: [{ label: `Switch to Basic on my birthday`, effect: `saves ${eur((plus - basic) * 12)}/yr` }, { label: "Keep Plus" }],
      }),
    );
  }

  if (a.savings >= 5_000 && a.savingsRate <= 1 && a.savingsIdleMonths >= 12) {
    const better = a.savings >= 25_000 ? { name: "a 1-year term deposit at 2.6%", rate: 2.6, base: a.savings - 5_000 } : { name: "Start2Save at 3.15% (up to €500 a month)", rate: 3.15, base: Math.min(a.savings, 6_000) };
    const gain = (better.base * (better.rate - a.savingsRate)) / 100;
    out.push(
      moment(c, {
        family: "value",
        kind: "idle-savings",
        title: `${eur(a.savings)} has earned ${pct(a.savingsRate)} for ${a.savingsIdleMonths} months`,
        summary: `Your savings haven't moved in ${a.savingsIdleMonths} months. Keeping a buffer where it is and putting the rest in ${better.name} would earn about ${eur(gain)} more a year, still with us.`,
        severity: 1,
        horizonDays: 0,
        valueEUR: gain,
        evidence: [
          { group: "B", field: "Savings balance", value: `${eur(a.savings)}, unchanged ${a.savingsIdleMonths} months` },
          { group: "C", field: "Rate", value: `${pct(a.savingsRate)} vs ${better.name}` },
        ],
        options: [{ label: "Move it, keep a buffer", effect: `+${eur(gain)}/yr` }, { label: "Not now" }],
      }),
    );
  }

  const td = c.products.termDepositMaturing;
  if (td && daysUntil(td.date) <= 30) {
    out.push(
      moment(c, {
        family: "value",
        kind: "term-deposit-maturing",
        title: `Your ${eur(td.amount)} term deposit matures on ${fmtDate(td.date)}`,
        summary: `It earned ${pct(td.rate)}. If you do nothing it lands on your savings account at ${pct(a.savingsRate)}. You can renew, or split it if you'll need some of it around retirement.`,
        severity: 1,
        horizonDays: Math.max(daysUntil(td.date), 0),
        valueEUR: (td.amount * (td.rate - a.savingsRate)) / 100,
        evidence: [{ group: "C", field: "Term deposit", value: `${eur(td.amount)} at ${pct(td.rate)}, matures ${fmtDate(td.date)}` }],
        options: [{ label: "Renew for 1 year" }, { label: "Split: half renew, half available" }, { label: "Decide later" }],
      }),
    );
  }

  return out;
}

// ---------- Tier 0/1: buying a house, analysed as a whole ----------

export function creditWatcher(c: Customer): Moment[] {
  const q = c.products.mortgageQuote;
  if (!q) return [];
  const duty = q.soleOwnHome ? 0.02 : 0.12;
  const notary = 0.015;
  const totalCost = q.price * (1 + duty + notary);
  const loan = totalCost - q.ownFunds;
  const ltv = loan / q.price;
  const mBundled = annuity(loan, q.rateBundled, q.termYears);
  const mStandalone = annuity(loan, q.rateStandalone, q.termYears);
  const interestSaved = (mStandalone - mBundled) * 12 * q.termYears;
  const insuranceExtra = (q.bundledHomePremium - q.marketHomePremium) * q.termYears;
  const switchYear = Math.ceil(q.termYears / 3);
  const netBundle = interestSaved - (q.bundledHomePremium - q.marketHomePremium) * switchYear;
  const rebuild = Math.round(q.price * 0.62);
  const renovationOnMortgage = annuity(q.renovationEstimate, q.rateBundled, q.termYears) * 12 * q.termYears - q.renovationEstimate;
  const renovationEnergyLoan = annuity(q.renovationEstimate, q.energyLoanRate, 10) * 12 * 10 - q.renovationEstimate;
  const deposit = c.events.find((e) => e.type === "notary-deposit");

  return [
    moment(c, {
      family: "credit",
      kind: "house-purchase-analysis",
      title: "Your house purchase, checked as a whole",
      summary: `With ${eur(q.ownFunds)} of your own money you borrow ${eur(loan)} (${Math.round(ltv * 100)}% of the price), which keeps you in the standard rate band. Three things to know: (1) the bundled insurance discount saves ${eur(interestSaved)} in interest over ${q.termYears} years but the home policy costs ${eur(q.bundledHomePremium - q.marketHomePremium)} a year more; since 2024 you may switch insurer after year ${switchYear} at no cost and keep the discount, so taking the bundle and reviewing it in year ${switchYear} nets about ${eur(netBundle)}. (2) The EPC label E means you must reach label D within 6 years; the ${eur(q.renovationEstimate)} renovation costs ${eur(renovationOnMortgage - renovationEnergyLoan)} less in interest through an energy loan at ${pct(q.energyLoanRate)} than added to the mortgage. (3) Make sure the notary applies the 2% registration duty for a sole own home: that's ${eur(q.price * 0.1)} less than the standard rate.`,
      severity: 3,
      horizonDays: 45,
      needsHuman: true,
      valueEUR: netBundle + (renovationOnMortgage - renovationEnergyLoan),
      evidence: [
        { group: "B", field: "Payments", value: deposit ? `${eur(deposit.amount ?? 0)} deposit to ${deposit.merchant} (compromis signed)` : "notary deposit" },
        { group: "C", field: "Mortgage quote", value: `${eur(loan)} over ${q.termYears} yrs, ${pct(q.rateBundled)} bundled / ${pct(q.rateStandalone)} standalone` },
        { group: "D", field: "Bundled home insurance", value: `${eur(q.bundledHomePremium)}/yr vs ${eur(q.marketHomePremium)}/yr comparable` },
        { group: "H", field: "Rules", value: `switch insurer after 1/3 of term (law of June 2024); EPC E → label D within 6 years; 2% duty for sole own home` },
        { group: "F", field: "App activity", value: `mortgage simulator abandoned twice; searched "EPC E renovatieplicht"` },
      ],
      options: [
        { label: "Take the bundle, set a review for year " + switchYear, effect: `about ${eur(netBundle)} net` },
        { label: "Add an energy loan for the renovation", effect: `${eur(renovationOnMortgage - renovationEnergyLoan)} less interest` },
        { label: "Book the adviser to walk through it" },
      ],
    }),
    moment(c, {
      family: "cover",
      kind: "home-insure-rebuild-value",
      title: "Insure the rebuild value, not the price",
      summary: `The ${eur(q.price)} price includes the land. Rebuilding the house would cost about ${eur(rebuild)}. Insuring that amount, indexed, keeps you fully covered without paying premium on the land.`,
      severity: 2,
      horizonDays: 45,
      evidence: [
        { group: "D", field: "Home insurance", value: `to be set up; rebuild estimate ${eur(rebuild)} (ABEX-indexed model)` },
        { group: "C", field: "Purchase", value: `price ${eur(q.price)}` },
      ],
      options: [{ label: `Set the insured amount to ${eur(rebuild)}` }, { label: "Ask for a valuation visit" }],
    }),
    moment(c, {
      family: "deadline",
      kind: "renovation-obligation",
      title: "Label E: the renovation clock starts at the deed",
      summary: `Homes with label E or F bought in Flanders must reach label D within 6 years of the deed. Planning the roof and glazing in year 1 unlocks the Flemish renovation premium and keeps the energy loan rate.`,
      severity: 1,
      horizonDays: 60 + 365 * 6,
      evidence: [
        { group: "H", field: "Flemish renovation obligation", value: "EPC E/F → D within 6 years of purchase" },
        { group: "E", field: "EPC certificate", value: "label E (paid to EPC Keur)" },
      ],
      options: [{ label: "Plan it with the energy loan" }, { label: "Remind me after the deed" }],
    }),
  ];
}

// ---------- Tier 1: behaviour ----------

export function behaviourWatcher(c: Customer): Moment[] {
  const b = c.behaviour;
  const stuck = b.repeatedScreens.filter((s) => s === "overdraft-settings").length;
  if (stuck >= 3) {
    return [
      moment(c, {
        family: "cashflow",
        kind: "stuck-on-overdraft",
        title: "You opened the overdraft settings three times",
        summary: `Looks like you're weighing an overdraft. Before you do: with your invoice pattern, a short buffer from savings is cheaper, and if it's a late client, we can send the reminder for you.`,
        severity: 1,
        horizonDays: 0,
        evidence: [{ group: "F", field: "App activity", value: "overdraft settings opened 3 times this week" }],
        options: [{ label: "Show me the cheaper buffer" }, { label: "I just wanted to look" }],
      }),
    ];
  }
  return [];
}

export const ALL_WATCHERS = [deadlineWatcher, coverWatcher, cashflowWatcher, riskWatcher, driftWatcher, valueWatcher, creditWatcher, behaviourWatcher];

export function runWatchers(c: Customer): Moment[] {
  return ALL_WATCHERS.flatMap((w) => w(c));
}

export const todayISO = () => daysFromNow(0);
