"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "@/lib/engine/profile";
import { CONSENT_LABELS, GROUP_NAMES, type ConsentLevel, type ExplainedMoment, type Group } from "@/lib/engine/types";
import { CaptureSheet } from "./CaptureSheet";
import { Composer } from "./Composer";
import { MoreView } from "./MoreView";
import { ProfileView } from "./ProfileView";

export type Me = {
  signedIn: boolean;
  customer: { id: string; name: string; age: number; channel: string; digitalConfidence: string };
  accounts: { balance: number; savings: number; tier: string };
  consent: ConsentLevel;
  consentLabel: string;
  groups: Group[];
  profile: Profile;
  moments: ExplainedMoment[];
  hiddenByConsent: Array<{ id: string; kind: string; title: string; requiredConsent: ConsentLevel; missingGroups: Group[] }>;
  overflow: number;
};

type Bubble = { who: "kate" | "me" | "system"; text: string };
export type Tab = "overview" | "kate" | "profile" | "consent" | "more";

const ALWAYS_ON: Group[] = ["A", "G"];
const ALL: Group[] = ["A", "B", "C", "D", "E", "F", "G", "H"];
const PRESETS: ConsentLevel[] = [0, 1, 2, 3];
const CAPTURE = /^(upload|take a|record|send a photo|photo|video)/i;

export function KatePhone({
  me,
  cards,
  greeting,
  liveKind,
  typing,
  chosen,
  onChoose,
  onLevel,
  onGroups,
  note,
  tab: tabProp,
  onTabChange,
  overviewExtra,
  banner,
}: {
  me: Me;
  cards: ExplainedMoment[];
  greeting: string;
  liveKind?: string;
  typing?: boolean;
  chosen: Record<string, number>;
  onChoose: (kind: string, option: number) => void;
  onLevel: (level: ConsentLevel) => Promise<unknown>;
  onGroups: (groups: Group[]) => Promise<unknown>;
  note?: string;
  tab?: Tab;
  onTabChange?: (t: Tab) => void;
  overviewExtra?: React.ReactNode;
  banner?: React.ReactNode;
}) {
  const [tabState, setTabState] = useState<Tab>("kate");
  const tab = tabProp ?? tabState;
  const setTab = (t: Tab) => {
    setTabState(t);
    onTabChange?.(t);
  };
  const [chat, setChat] = useState<Bubble[]>([]);
  const [busy, setBusy] = useState(false);
  const [capture, setCapture] = useState<{ title: string; hint: string; kind: string; option: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [cards.length, chat.length, typing]);

  async function send(text: string) {
    setChat((c) => [...c, { who: "me", text }]);
    setBusy(true);
    try {
      const history = chat.filter((b) => b.who !== "system").slice(-12).map((b) => ({ role: b.who === "me" ? "user" : "assistant", content: b.text }));
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, history }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Kate couldn't answer");
      setChat((c) => [...c, { who: "kate", text: data.reply }]);
      for (const a of data.actions ?? []) {
        if (a.type === "act") onChoose(a.kind, a.option);
        if (a.type === "consent") await onLevel(a.level);
        if (a.type === "adviser") setChat((c) => [...c, { who: "system", text: `Adviser call booked: ${a.topic}` }]);
      }
    } catch (e) {
      setChat((c) => [...c, { who: "system", text: e instanceof Error ? e.message : "Something went wrong" }]);
    } finally {
      setBusy(false);
    }
  }

  function choose(m: ExplainedMoment, i: number) {
    const label = m.options[i].label;
    if (CAPTURE.test(label)) {
      setCapture({ title: label, hint: /id/i.test(label) ? "Hold your new ID card in front of the camera, both sides. Kate reads the expiry date and files it." : "A short video or photo is enough. Nothing leaves your phone until you tap Send.", kind: m.kind, option: i });
      return;
    }
    onChoose(m.kind, i);
  }

  const cardsAndChat = (
    <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-[#eef3f6] p-3">
      <KateBubble>{greeting}</KateBubble>
      {cards.map((m) => (
        <Card key={m.id} m={m} chosen={chosen[m.kind]} live={liveKind === m.kind} onChoose={(i) => choose(m, i)} />
      ))}
      {typing && (
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          Kate is typing <span className="dots" />
        </div>
      )}
      {note && (
        <div className="rounded-2xl bg-white p-3 text-xs text-slate-700 shadow-sm">
          <p className="font-semibold">Dial set to “{me.consentLabel}”.</p>
          <p className="mt-1">{note}</p>
        </div>
      )}
      {chat.map((b, i) =>
        b.who === "me" ? (
          <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-[#0091d2] px-3 py-2 text-sm text-white shadow-sm">{b.text}</div>
        ) : b.who === "kate" ? (
          <KateBubble key={i}>{b.text}</KateBubble>
        ) : (
          <p key={i} className="text-center text-[11px] text-slate-500">{b.text}</p>
        ),
      )}
      {busy && (
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
          Kate is thinking <span className="dots" />
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex h-[calc(100%-1.6rem)] flex-col">
      {banner}
      <div className="kbc-header flex items-center gap-3 px-4 py-3 text-white">
        {tab === "kate" ? (
          <>
            <div className="kate-avatar flex h-9 w-9 items-center justify-center rounded-full font-display text-lg font-bold text-white">K</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Kate</p>
              <p className="text-xs text-white/80">Kate Ahead · {me.consentLabel}</p>
            </div>
          </>
        ) : (
          <div className="flex-1">
            <p className="text-xs text-white/80">KBC Mobile</p>
            <p className="text-sm font-semibold">{tab === "overview" ? "Overzicht" : tab === "profile" ? "Mijn profiel" : tab === "consent" ? "Privacy & gegevens" : "Meer"}</p>
          </div>
        )}
        <span className="rounded-md bg-white px-1.5 py-0.5 font-display text-[11px] font-black tracking-tight text-[#0091d2]">KBC</span>
      </div>

      {tab === "overview" && (
        <div className="flex-1 overflow-y-auto bg-[#eef3f6] p-3 text-slate-900">
          <p className="px-1 text-lg font-semibold">{greetingWord()}, {me.customer.name}</p>
          {overviewExtra}
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Zichtrekening · {me.accounts.tier === "plus" ? "Plusrekening" : me.accounts.tier === "basic" ? "Basisrekening" : "Zichtrekening"}</p>
            <p className="mt-1 text-2xl font-semibold">{eur(me.accounts.balance)}</p>
            <p className="text-xs text-slate-500">BE71 7310 •••• 4512</p>
          </div>
          <div className="mt-2 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Spaarrekening</p>
            <p className="mt-1 text-2xl font-semibold">{eur(me.accounts.savings)}</p>
          </div>
          <button onClick={() => setTab("kate")} className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm">
            <div className="kate-avatar flex h-10 w-10 items-center justify-center rounded-full font-display text-lg font-bold text-white">K</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Kate Ahead</p>
              <p className="text-xs text-slate-500">{openCount(cards, chosen) > 0 ? `${openCount(cards, chosen)} heads-up${openCount(cards, chosen) === 1 ? "" : "s"} voor je` : "Warns you before things go wrong"}</p>
            </div>
            <span className="text-slate-400">›</span>
          </button>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] text-slate-600">
            {["Overschrijven", "Kaarten", "Verzekeren", "Beleggen"].map((t) => (
              <div key={t} className="rounded-xl bg-white p-2 shadow-sm">
                <div className="mx-auto mb-1 h-6 w-6 rounded-full bg-[#e3f3fb]" />
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === "kate" && (
        <>
          {cardsAndChat}
          <Composer onSend={send} busy={busy} onCamera={() => setCapture({ title: "Send Kate a photo or video", hint: "For a claim, a document, or anything you'd rather show than type.", kind: "", option: -1 })} />
        </>
      )}
      {tab === "profile" && (
        <ProfileView profile={me.profile} consent={me.consent} consentLabel={me.consentLabel} acted={cards.filter((m) => chosen[m.kind] !== undefined).map((m) => m.title)} openCount={cards.filter((m) => chosen[m.kind] === undefined).length} onDial={() => setTab("consent")} />
      )}
      {tab === "consent" && <ConsentView me={me} onLevel={onLevel} onGroups={onGroups} />}
      {tab === "more" && <MoreView />}

      <nav className="grid grid-cols-5 border-t border-slate-200 bg-white py-1.5 text-center text-[10px] text-slate-500">
        {([
          ["overview", "Overzicht", "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
          ["kate", "Kate", "M4 5h16v10H8l-4 4z"],
          ["profile", "Profiel", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8a8 8 0 0 1 16 0z"],
          ["consent", "Privacy", "M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"],
          ["more", "Meer", "M5 12h.01M12 12h.01M19 12h.01"],
        ] as Array<[Tab, string, string]>).map(([t, label, d]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex flex-col items-center gap-0.5 ${tab === t ? "font-semibold text-[#0091d2]" : ""}`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d={d} /></svg>
            {label}
          </button>
        ))}
      </nav>

      {capture && (
        <CaptureSheet
          title={capture.title}
          hint={capture.hint}
          onCancel={() => setCapture(null)}
          onDone={(kind, transcript) => {
            const c = capture;
            setCapture(null);
            if (c.option >= 0) onChoose(c.kind, c.option);
            const understood = kind === "video" ? `This is the text I understood: “${transcript || "no speech detected"}”. ` : "I received your photo. ";
            setChat((x) => [...x, { who: "system", text: `${kind === "video" ? "Video" : "Photo"} sent` }, { who: "kate", text: `${understood}I was not able to verify your identity via face recognition, so I have forwarded it to a real human for review. Apologies for the wait; you'll hear back by email.` }]);
          }}
        />
      )}
    </div>
  );
}

function ConsentView({ me, onLevel, onGroups }: { me: Me; onLevel: (l: ConsentLevel) => Promise<unknown>; onGroups: (g: Group[]) => Promise<unknown> }) {
  const [pending, setPending] = useState(false);
  const allowed = new Set(me.groups);
  async function toggle(g: Group) {
    if (ALWAYS_ON.includes(g) || pending) return;
    const next = ALL.filter((x) => (x === g ? !allowed.has(x) : allowed.has(x)));
    setPending(true);
    try {
      await onGroups(next);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex-1 overflow-y-auto bg-[#eef3f6] p-3 text-slate-900">
      <h2 className="text-base font-semibold">What may Kate notice?</h2>
      <p className="mt-1 text-xs text-slate-600">Pick a preset, or switch data groups one by one. Identity and security stay on: the bank has to act on an expiring ID and on fraud.</p>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {PRESETS.map((l) => (
          <button key={l} disabled={pending} onClick={() => onLevel(l)} className={`rounded-lg border px-2 py-1.5 text-left text-xs ${me.consentLabel === CONSENT_LABELS[l] ? "border-sky-600 bg-sky-50" : "border-slate-200 bg-white"}`}>
            <span className="font-medium">{l}. {CONSENT_LABELS[l]}</span>
          </button>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {ALL.map((g) => (
          <li key={g} className="flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-200 text-[11px] font-bold text-slate-700">{g}</span>
            <span className="flex-1 text-sm">{GROUP_NAMES[g]}</span>
            <button
              role="switch"
              aria-checked={allowed.has(g)}
              disabled={ALWAYS_ON.includes(g) || pending}
              onClick={() => toggle(g)}
              className={`relative h-6 w-11 rounded-full transition ${allowed.has(g) ? "bg-sky-600" : "bg-slate-300"} disabled:opacity-60`}
              title={ALWAYS_ON.includes(g) ? "Always on: legal duty" : undefined}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${allowed.has(g) ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl bg-white p-3 text-xs shadow-sm">
        <p className="font-medium">With this setting, Kate won&apos;t notice:</p>
        {me.hiddenByConsent.length ? (
          <ul className="mt-1 space-y-1 text-slate-600">
            {me.hiddenByConsent.map((h) => (
              <li key={h.id}>
                {h.title} <span className="text-slate-400">(needs {h.missingGroups.join(", ")})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-slate-600">Nothing. Everything Kate found is shown.</p>
        )}
      </div>
    </div>
  );
}

const eur = (n: number) => "€ " + Math.round(n).toLocaleString("nl-BE");
const openCount = (cards: ExplainedMoment[], chosen: Record<string, number>) => cards.filter((m) => chosen[m.kind] === undefined).length;
function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? "Goedemorgen" : h < 18 ? "Goedemiddag" : "Goedenavond";
}

function KateBubble({ children }: { children: React.ReactNode }) {
  return <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">{children}</div>;
}

export function fmtLead(days: number, realtime?: boolean) {
  if (realtime) return "real time";
  if (days === 0) return "now";
  if (days > 365) return `${Math.round(days / 365)} years`;
  return `${days} days`;
}

const STRIPE = { 3: "bg-rose-500", 2: "bg-amber-500", 1: "bg-sky-500" } as const;

export function Card({ m, chosen, live, onChoose }: { m: ExplainedMoment; chosen?: number; live: boolean; onChoose?: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`card-in overflow-hidden rounded-2xl bg-white shadow-sm ${live ? "ring-2 ring-sky-300" : ""}`}>
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${STRIPE[m.severity]}`} />
        <div className="flex-1 p-3">
          <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wider">
            {m.realtime ? <Tag tone="rose">right now</Tag> : m.horizonDays > 0 && <Tag tone="slate">{fmtLead(m.horizonDays)} ahead</Tag>}
            {m.needsHuman && <Tag tone="violet">adviser confirms</Tag>}
            {m.channelHint !== "app" && <Tag tone="emerald">also by {m.channelHint}</Tag>}
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-slate-900">{m.title}</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-slate-700">{live ? <Typewriter text={m.message} /> : m.message}</p>
          <button onClick={() => setOpen((o) => !o)} className="mt-2 text-xs font-medium text-[#0091d2]">
            {open ? "Hide" : "Why?"} · based on {m.evidence.length} data point{m.evidence.length > 1 ? "s" : ""}
          </button>
          {open && (
            <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
              {m.evidence.map((e, k) => (
                <li key={k} className="flex gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700" title={GROUP_NAMES[e.group]}>{e.group}</span>
                  <span><span className="font-medium">{e.field}:</span> {e.value}</span>
                </li>
              ))}
              {(m.harmEUR || m.valueEUR) && (
                <li className="pt-1 text-slate-500">
                  {m.harmEUR ? `Prevents about €${Math.round(m.harmEUR).toLocaleString("en-GB")}. ` : ""}
                  {m.valueEUR ? `Worth about €${Math.round(m.valueEUR).toLocaleString("en-GB")}/yr.` : ""}
                </li>
              )}
            </ul>
          )}
          <div className="mt-2 flex flex-col gap-1.5">
            {m.options.map((o, k) =>
              chosen === undefined ? (
                <button key={o.label} disabled={!onChoose} onClick={() => onChoose?.(k)} className="rounded-lg border border-[#0091d2]/40 px-3 py-1.5 text-left text-xs text-[#005f8f] enabled:hover:bg-[#e3f3fb]">
                  {o.label}
                  {o.effect && <span className="text-slate-500"> · {o.effect}</span>}
                </button>
              ) : k === chosen ? (
                <div key={o.label} className="tap rounded-lg border border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800">
                  ✓ {o.label}
                  {o.effect && <span className="text-emerald-700"> · {o.effect}</span>}
                </div>
              ) : null,
            )}
            {chosen !== undefined && <p className="text-[11px] text-slate-500">{m.needsHuman ? "Your adviser confirms this before it's final." : "Kate takes it from here and confirms when it's done."}</p>}
          </div>
        </div>
      </div>
    </article>
  );
}

function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = window.setInterval(() => setN((x) => (x >= text.length ? x : x + 3)), 30);
    return () => window.clearInterval(id);
  }, [text]);
  return <>{text.slice(0, n)}</>;
}

const TONES = { rose: "bg-rose-100 text-rose-700", slate: "bg-slate-100 text-slate-600", violet: "bg-violet-100 text-violet-700", emerald: "bg-emerald-100 text-emerald-700" } as const;
function Tag({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`rounded px-1.5 py-0.5 ${TONES[tone]}`}>{children}</span>;
}
