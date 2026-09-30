// Policy & consent gate: which moments a customer actually sees.
// - consent is a SET of data groups the customer allows Kate to use. The dial levels are presets over
//   that set; each group can also be toggled on its own. Identity (A) and security (G) are always on:
//   a bank must act on an expiring ID and on fraud whatever the customer prefers (legal duty).
// - a moment is shown only if every data group in its evidence is allowed
// - ranking: real-time first, then harm (severity), then the nearest horizon
// - cap: one screen of moments, never a feed (alert fatigue kills prevention)

import { GROUP_CONSENT, type ConsentLevel, type Customer, type Group, type Moment } from "./types";

export const MAX_VISIBLE = 4;
export const ALWAYS_ON: Group[] = ["A", "G"];
export const ALL_GROUPS: Group[] = ["A", "B", "C", "D", "E", "F", "G", "H"];

export function groupsForLevel(level: ConsentLevel): Group[] {
  return ALL_GROUPS.filter((g) => GROUP_CONSENT[g] <= level);
}

export function normaliseGroups(input: Iterable<string>): Group[] {
  const set = new Set<Group>(ALWAYS_ON);
  for (const g of input) if ((ALL_GROUPS as string[]).includes(g)) set.add(g as Group);
  return ALL_GROUPS.filter((g) => set.has(g));
}

// The lowest dial level whose preset covers the allowed set (for display).
export function levelForGroups(groups: Group[]): ConsentLevel {
  return groups.reduce<ConsentLevel>((m, g) => (GROUP_CONSENT[g] > m ? GROUP_CONSENT[g] : m), 0);
}

export interface HiddenMoment {
  id: string;
  kind: string;
  title: string;
  requiredConsent: ConsentLevel;
  missingGroups: Group[];
}

export interface GateResult {
  visible: Moment[];
  hiddenByConsent: HiddenMoment[];
  overflow: number; // ranked below the cap
}

export function gate(customer: Customer, moments: Moment[], allowedGroups: Group[] = groupsForLevel(customer.consent)): GateResult {
  const allowed = new Set<Group>([...ALWAYS_ON, ...allowedGroups]);
  const missing = (m: Moment) => [...new Set(m.evidence.map((e) => e.group))].filter((g) => !allowed.has(g));
  const ok = (m: Moment) => m.requiredConsent === 0 || missing(m).length === 0;
  const ranked = moments.filter(ok).sort((a, b) => {
    if (a.realtime !== b.realtime) return a.realtime ? -1 : 1;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return a.horizonDays - b.horizonDays;
  });
  return {
    visible: ranked.slice(0, MAX_VISIBLE),
    hiddenByConsent: moments.filter((m) => !ok(m)).map(({ id, kind, title, requiredConsent }) => ({ id, kind, title, requiredConsent, missingGroups: missing(moments.find((m) => m.id === id)!) })),
    overflow: Math.max(ranked.length - MAX_VISIBLE, 0),
  };
}
