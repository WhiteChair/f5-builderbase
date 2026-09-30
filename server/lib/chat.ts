// THE EMULATED AGENT. This is what the phone app talks to (via /api/chat on the Vercel deployment).
// Kate's conversation in the demo. There is no live AI agent: a keyword classifier maps the customer's
// message to one of a fixed set of intents, the engine validates the slots, and the reply is rendered
// from templates over verified facts. Anything outside the allowed intents gets a fixed answer that
// says so. In production the classifier is a small model forced to call one tool with the same
// schema; the templates and validation stay exactly as here (see lib/engine/skills.ts GUARDRAILS).

import { buildProfile } from "./engine/profile";
import { CONSENT_LABELS, type ConsentLevel, type Customer, type Group, type Moment } from "./engine/types";

export type ChatAction =
  | { type: "act"; kind: string; option: number; label: string }
  | { type: "consent"; level: ConsentLevel }
  | { type: "adviser"; topic: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type Intent = "act" | "explain" | "consent" | "adviser" | "profile" | "media_received" | "acknowledge" | "unclear";

export interface ChatResult {
  reply: string;
  actions: ChatAction[];
  intent: Intent;
}

type Hidden = { kind: string; title: string; requiredConsent: ConsentLevel; missingGroups?: Group[] };

interface Decision {
  intent: Intent;
  kind?: string;
  option?: number;
  level?: number;
  topic?: string;
}

export const NO_AGENT_REPLY = "This demo has no live AI agent yet. I can act on the heads-ups above: ask me why, tell me which option you want, ask what I know about you, or change the dial.";

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");

// ---------- Templates: every reply the customer sees comes from here ----------

function confirmation(m: Moment, i: number): string {
  const label = m.options[i].label;
  const l = label.toLowerCase();
  const human = m.needsHuman ? " Your adviser checks it before it's final; you'll get that confirmation by email, and nothing changes until then." : "";
  if (/cancel/.test(l)) return "Cancelled. The payment won't go out, and nothing has left your account. You'll get a confirmation by email in a minute.";
  if (/hold/.test(l)) return "Holding it for 4 hours. I'll call you on your usual number to go through it together. If we don't speak, it stays on hold.";
  if (/i'm sure|send it/.test(l)) return "Understood. Because of the warning signs, an adviser will call you within 15 minutes to confirm by phone before it goes out. Nothing is sent until then.";
  if (/adviser|book|call me|talk to|walk through/.test(l)) return `Done. Your adviser will call you tomorrow at 10:30 about "${m.title}". You'll get an email confirmation in a minute and a reminder an hour before.`;
  if (/upload|photo|video/.test(l)) return "Received. I'm processing it now; you'll get an email confirmation within the hour, and I'll confirm here too. Nothing else is needed from you.";
  if (/remind/.test(l)) return "No problem. I'll leave it as it is and remind you in two weeks.";
  if (/not now|keep|decide later|it's insured elsewhere|i just wanted/.test(l)) return "No problem. I'll leave it as it is and won't bring it up again unless something changes.";
  if (/pre-register|continuation/.test(l)) return "Done. I've pre-registered the continuation with our insurance team, so no medical questionnaire will be needed." + human;
  if (/compare|show me|see what/.test(l)) return `On its way: I'm preparing the comparison for "${m.title}" and you'll have it here and by email within the hour.` + human;
  if (/move|transfer|switch|renew|split|update|set the insured|plan|add an energy loan|take the bundle|shift/.test(l)) return `Done: "${label}". You'll get an email confirmation shortly, and I'll let you know here when it's through.` + human;
  return `Done: "${label}". You'll get an email confirmation shortly.` + human;
}

function explain(m: Moment): string {
  const facts = m.evidence.map((e) => `${e.field.toLowerCase()}: ${e.value}`).join("; ");
  const money = m.harmEUR ? ` Acting early prevents about ${eur(m.harmEUR)}.` : m.valueEUR ? ` It's worth about ${eur(m.valueEUR)} a year.` : "";
  return `${m.title}. I'm going on ${facts}.${money} ${m.needsHuman ? "An adviser confirms before anything final happens." : "Nothing changes unless you say so."}`;
}

function render(d: Decision, customer: Customer, consent: ConsentLevel, visible: Moment[], hidden: Hidden[]): ChatResult {
  const actions: ChatAction[] = [];
  const find = (kind?: string) => visible.find((m) => m.kind === kind);
  switch (d.intent) {
    case "act": {
      const m = find(d.kind) ?? (visible.length === 1 ? visible[0] : undefined);
      const i = Number.isInteger(d.option) ? (d.option as number) : 0;
      if (!m || i < 0 || i >= m.options.length) return { reply: NO_AGENT_REPLY, actions, intent: "unclear" };
      actions.push({ type: "act", kind: m.kind, option: i, label: m.options[i].label });
      return { reply: confirmation(m, i), actions, intent: "act" };
    }
    case "explain": {
      const m = find(d.kind) ?? visible[0];
      return m ? { reply: explain(m), actions, intent: "explain" } : { reply: NO_AGENT_REPLY, actions, intent: "unclear" };
    }
    case "consent": {
      const level = [0, 1, 2, 3].includes(d.level as number) ? (d.level as ConsentLevel) : consent;
      if (level === consent) return { reply: `Your dial is on "${CONSENT_LABELS[consent]}". Held back right now: ${hidden.map((h) => h.title).join("; ") || "nothing"}. You can change it on the Privacy tab, or tell me a level from 0 to 3.`, actions, intent: "consent" };
      actions.push({ type: "consent", level });
      return { reply: `Done. Your dial is now on "${CONSENT_LABELS[level]}". ${level < consent ? "I'll stop noticing the things that need more than that; turn it back up any time on the Privacy tab." : "I can now catch a bit more for you."}`, actions, intent: "consent" };
    }
    case "adviser": {
      const topic = (d.topic ?? visible[0]?.title ?? "your account").slice(0, 120);
      actions.push({ type: "adviser", topic });
      return { reply: `Done. Your adviser will call you tomorrow at 10:30 about ${topic}. You'll get an email confirmation in a minute and a reminder an hour before.`, actions, intent: "adviser" };
    }
    case "profile": {
      const p = buildProfile(customer, consent);
      return { reply: `Here's what I'm working from: ${p.headline.toLowerCase()}. ${p.unlockedGroups} of 8 data groups are unlocked by your dial. Open the Profiel tab to see every fact and where it comes from; nothing there is new, it's what the bank already holds to run your accounts.`, actions, intent: "profile" };
    }
    case "media_received":
      return { reply: "I received your recording. I was not able to verify your identity via face recognition, so I have forwarded it to a real human for review. Apologies for the wait; you'll hear back by email.", actions, intent: "media_received" };
    case "acknowledge":
      return { reply: "You're welcome. I'll be here if anything changes.", actions, intent: "acknowledge" };
    default:
      return { reply: NO_AGENT_REPLY, actions, intent: "unclear" };
  }
}

export function chat(customer: Customer, consent: ConsentLevel, visible: Moment[], hidden: Hidden[], history: ChatTurn[], text: string): ChatResult {
  return render(classify(visible, consent, text, history), customer, consent, visible, hidden);
}

// ---------- Keyword classifier over the same data ----------

const STOP = new Set(["the", "and", "you", "your", "for", "with", "that", "this", "what", "why", "how", "about", "from", "are", "was", "can", "not", "its", "have", "has", "would", "could", "should", "think", "does", "did", "please", "kate"]);
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9€ ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const overlap = (a: string, b: string) => {
  const B = new Set(words(b));
  return words(a).filter((w) => B.has(w)).length;
};

function classify(visible: Moment[], consent: ConsentLevel, text: string, history: ChatTurn[]): Decision {
  const t = text.toLowerCase().trim();
  const lastDiscussed = () => {
    for (let i = history.length - 1; i >= 0; i--) {
      const hit = visible.find((m) => history[i].content.includes(m.title));
      if (hit) return hit;
    }
    return visible[0];
  };
  const byOverlap = () => {
    const ranked = visible.map((m) => ({ m, s: overlap(text, m.title) * 3 + overlap(text, m.summary + " " + m.evidence.map((e) => e.value).join(" ")) })).sort((a, b) => b.s - a.s);
    return ranked[0]?.s > 0 ? ranked[0].m : lastDiscussed();
  };
  if (/^(ok|okay|yes|yep|sure|do it|go ahead|please do|fine|alright)\b/.test(t)) {
    const m = lastDiscussed();
    return m ? { intent: "act", kind: m.kind, option: 0 } : { intent: "unclear" };
  }
  if (/\b(thanks|thank you|bye|great|perfect)\b/.test(t) && t.length < 40) return { intent: "acknowledge" };
  if (/\b(sent|uploaded|recorded)\b.*\b(photo|video|picture|document|recording)\b/.test(t)) return { intent: "media_received" };
  if (/\b(dial|privacy|consent|essentials|stop noticing|my products|money patterns)\b/.test(t)) {
    const level = /\b(0|zero|essentials|only)\b/.test(t) ? 0 : /\b(1|one|products)\b/.test(t) ? 1 : /\b(2|two|patterns|payments)\b/.test(t) ? 2 : /\b(3|three|app|everything|all)\b/.test(t) ? 3 : consent;
    return { intent: "consent", level };
  }
  if (/\b(why|how do you know|based on|evidence|explain|reason)\b/.test(t)) return { intent: "explain", kind: byOverlap()?.kind };
  if (/\b(adviser|advisor|call me|book|appointment|branch|human|someone)\b/.test(t)) return { intent: "adviser", topic: byOverlap()?.title };
  if (/\b(profile|know about me|what do you know|my data)\b/.test(t)) return { intent: "profile" };
  let best: { m: Moment; i: number; s: number } | null = null;
  visible.forEach((m) =>
    m.options.forEach((o, i) => {
      const s = overlap(text, o.label) * 2 + (overlap(text, m.title) > 0 ? 1 : 0);
      if (s > 1 && (!best || s > best.s)) best = { m, i, s };
    }),
  );
  if (best) {
    const b = best as { m: Moment; i: number; s: number };
    return { intent: "act", kind: b.m.kind, option: b.i };
  }
  return { intent: "unclear" };
}
