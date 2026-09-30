// The living profile: what the bank knows about this customer, grouped by data group, filtered by consent.
// This is the "situation record" the watchers read. Shown to the customer on the Profile tab, so the
// profile is something they can see, not something done to them.

import { daysUntil } from "./personas";
import { GROUP_CONSENT, GROUP_NAMES, type ConsentLevel, type Customer, type Group } from "./types";

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export interface ProfileGroup {
  group: Group;
  name: string;
  unlocked: boolean;
  facts: string[];
}

export interface Profile {
  headline: string; // "Employee, couple, homeowner, retiring in 5 months"
  groups: ProfileGroup[];
  unlockedGroups: number;
  totalFacts: number;
}

export function buildProfile(c: Customer, consent: ConsentLevel): Profile {
  const a = c.accounts;
  const facts: Record<Group, string[]> = {
    A: [
      `ID card valid until ${fmt(c.identity.idExpiry)}${daysUntil(c.identity.idExpiry) <= 60 ? " (expiring soon)" : ""}`,
      c.identity.missingDocs.length ? `Missing: ${c.identity.missingDocs.join(", ")}` : "KYC file complete",
    ],
    B: [
      `Current account ${eur(a.balance)}, savings ${eur(a.savings)} at ${a.savingsRate}%`,
      ...a.inflows.map((i) => `${i.type === "invoices" ? "Invoices" : i.type[0].toUpperCase() + i.type.slice(1)} ${eur(i.amount)}${i.dayOfMonth ? ` on the ${i.dayOfMonth}th` : i.expectedDate ? ` expected ${fmt(i.expectedDate)}` : ""}${i.source ? ` (${i.source})` : ""}`),
      `${a.recurring.length} recurring payments: ${a.recurring.map((r) => r.name).join(", ")}`,
      ...(a.competitorOutflows[5] > 0 ? [`Transfers to other apps: ${eur(a.competitorOutflows[5])} last month`] : []),
      ...(a.overdraftDays ? [`${a.overdraftDays} days in overdraft this year`] : []),
    ],
    C: [
      `${a.tier[0].toUpperCase() + a.tier.slice(1)} account, ${a.tierFee ? eur(a.tierFee) + "/month" : "free"}, ${Math.round(a.tierFeatureUse * 100)}% of features used`,
      ...(c.products.mortgage ? [`Mortgage ${eur(c.products.mortgage.principal)} since ${fmt(c.products.mortgage.start)}, ${c.products.mortgage.rate}%`] : []),
      ...(c.products.mortgageQuote ? [`Mortgage quote in progress: ${eur(c.products.mortgageQuote.price)} purchase`] : []),
      ...(c.products.termDepositMaturing ? [`Term deposit ${eur(c.products.termDepositMaturing.amount)} matures ${fmt(c.products.termDepositMaturing.date)}`] : []),
      ...(c.products.pensionSavings ? [`Pension savings ${eur(c.products.pensionSavings)}`] : []),
      ...(c.products.renovationLoan ? [`Renovation loan ${eur(c.products.renovationLoan.amount)}`] : []),
    ],
    D: [
      ...(c.insurance.home ? [`Home insured for ${eur(c.insurance.home.insuredCapital)} (valued ${fmt(c.insurance.home.lastValuation)})`] : ["No home insurance with us"]),
      ...(c.insurance.hospitalisation ? [`Hospitalisation: ${c.insurance.hospitalisation.type}${c.insurance.hospitalisation.employerCoverEnds ? `, employer cover ends ${fmt(c.insurance.hospitalisation.employerCoverEnds)}` : ""}${c.insurance.hospitalisation.premium ? `, ${eur(c.insurance.hospitalisation.premium)}/yr` : ""}`] : ["No hospitalisation insurance with us"]),
      `Motor: ${c.insurance.motor ? "yes" : "no"} · Family: ${c.insurance.family ? "yes" : "no"} · Income protection: ${c.insurance.incomeProtection ? "yes" : "no"}`,
    ],
    E: [
      `${c.age}, ${c.life.household}, ${c.life.employment}${c.life.dependants ? `, ${c.life.dependants} dependant` : ""}`,
      `${c.life.homeowner ? "Homeowner" : "Renting"}${c.life.epc ? `, energy label ${c.life.epc}` : ""}, ${c.life.region}${c.life.floodZone ? ", flood-risk zone" : ""}`,
      ...(c.life.retirementDate ? [`Retiring ${fmt(c.life.retirementDate)}`] : []),
      ...(c.life.birthday ? [`Next birthday ${fmt(c.life.birthday)}`] : []),
    ],
    F: [
      `${c.behaviour.loginsPerMonth} app logins a month, prefers ${c.channel}, digital confidence ${c.digitalConfidence}`,
      ...(c.behaviour.searches.length ? [`Recent searches: ${c.behaviour.searches.join(", ")}`] : []),
      ...(c.behaviour.abandonedFlows.length ? [`Abandoned: ${c.behaviour.abandonedFlows.join(", ")}`] : []),
      ...(c.behaviour.contactCentreCalls ? [`${c.behaviour.contactCentreCalls} calls to the contact centre this year`] : []),
    ],
    G: [
      c.device.newDeviceDays !== undefined ? `New device enrolled ${c.device.newDeviceDays === 0 ? "today" : `${c.device.newDeviceDays} days ago`}` : "Known device",
      ...(c.device.pendingTransfer ? [`Pending transfer ${eur(c.device.pendingTransfer.amount)} to ${c.device.pendingTransfer.beneficiaryName}, name check ${c.device.pendingTransfer.vop}`] : []),
    ],
    H: [
      ...(c.life.epc && ["E", "F"].includes(c.life.epc) ? ["Flemish renovation obligation: label D within 6 years of purchase"] : []),
      ...(c.products.mortgage?.bundledInsurance ? ["Bundled insurance may be switched after 1/3 of the term (law of June 2024)"] : []),
      ...(c.insurance.hospitalisation?.nextChangePct ? [`Medical index this year: +${c.insurance.hospitalisation.nextChangePct}%`] : []),
      ...(c.life.retirementDate ? ["Hospitalisation continuation right: request within 30 days of the group policy ending"] : []),
      "KBC tariffs change on 1 January",
    ],
  };
  const groups = (Object.keys(GROUP_NAMES) as Group[]).map((g) => ({ group: g, name: GROUP_NAMES[g], unlocked: GROUP_CONSENT[g] <= consent, facts: facts[g] }));
  const headline = [c.life.employment, c.life.household, c.life.homeowner ? "homeowner" : "renting", c.life.retirementDate ? `retiring in ${Math.round(daysUntil(c.life.retirementDate) / 30)} months` : null, c.products.mortgageQuote ? "buying a house" : null]
    .filter(Boolean)
    .join(", ");
  return { headline: headline[0].toUpperCase() + headline.slice(1), groups, unlockedGroups: groups.filter((g) => g.unlocked).length, totalFacts: groups.reduce((s, g) => s + g.facts.length, 0) };
}
