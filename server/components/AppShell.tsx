"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PersonaMeta } from "@/lib/engine/personas";
import type { ConsentLevel, Group } from "@/lib/engine/types";
import { SCENARIOS } from "@/lib/stories";
import { KatePhone, type Me, type Tab } from "./KatePhone";

// The whole app: KBC-style landing ("Wie ben je?"), the customer's Overzicht with what just happened,
// the notification that leads into Kate Ahead, and Kate's screens. Moments appear one by one.

export default function AppShell() {
  const [personas, setPersonas] = useState<PersonaMeta[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(0);
  const [typing, setTyping] = useState(false);
  const [banner, setBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const loadMe = useCallback(async (): Promise<Me | null> => {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = (await res.json()) as Me;
    return data.signedIn ? data : null;
  }, []);

  const patch = useCallback(
    async (body: object) => {
      const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("Couldn't update the dial");
      const v = await loadMe();
      if (v) setMe(v);
      return v;
    },
    [loadMe],
  );

  useEffect(() => {
    fetch("/api/personas").then((r) => r.json()).then((p) => setPersonas(p.personas)).catch(() => setError("Couldn't load the demo"));
    return clearTimers;
  }, []);

  async function signIn(id: string) {
    setError(null);
    clearTimers();
    setChosen({});
    setRevealed(0);
    setBanner(false);
    setTab("overview");
    const res = await fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ persona: id }) });
    if (!res.ok) return setError("Unknown customer");
    await patch({ consent: 3 });
    // The notification arrives a few seconds after landing, while the presenter narrates what happened.
    timers.current.push(window.setTimeout(() => setBanner(true), 4000));
  }

  function openKate() {
    setBanner(false);
    setTab("kate");
    if (revealed > 0 || !me) return;
    // Reveal the moments one by one, Kate typing in between.
    let i = 0;
    const next = () => {
      if (!me || i >= me.moments.length) return;
      setTyping(true);
      timers.current.push(
        window.setTimeout(() => {
          setTyping(false);
          i += 1;
          setRevealed(i);
          if (i < me.moments.length) timers.current.push(window.setTimeout(next, 1800));
        }, 1100),
      );
    };
    next();
  }

  function signOut() {
    clearTimers();
    fetch("/api/session", { method: "DELETE" }).catch(() => {});
    setMe(null);
    setRevealed(0);
    setBanner(false);
  }

  const scenario = me ? SCENARIOS[me.customer.id] : null;
  const cards = me ? (revealed === 0 && tab !== "kate" ? [] : me.moments.slice(0, Math.max(revealed, tab === "kate" && revealed === 0 ? 0 : revealed))) : [];

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col bg-white text-slate-900 sm:my-6 sm:min-h-0 sm:rounded-[2.2rem] sm:border-[6px] sm:border-slate-800 sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]" style={{ height: "min(100dvh, 860px)" }}>
      <div className="flex items-center justify-between px-5 pt-3 text-[11px] text-slate-500">
        <span>9:41</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">KBC Mobile · concept</span>
        <button onClick={signOut} className="text-[#0091d2]">{me ? "afmelden" : ""}</button>
      </div>

      {me && scenario ? (
        <KatePhone
          me={me}
          cards={cards}
          greeting={`Hi ${me.customer.name}. Before this becomes a problem:`}
          liveKind={typing ? undefined : cards[cards.length - 1]?.kind}
          typing={typing}
          chosen={chosen}
          onChoose={(kind, option) => setChosen((c) => ({ ...c, [kind]: option }))}
          onLevel={(l: ConsentLevel) => patch({ consent: l })}
          onGroups={(g: Group[]) => patch({ groups: g })}
          tab={tab}
          onTabChange={(t) => (t === "kate" ? openKate() : setTab(t))}
          overviewExtra={
            <div className="mt-3 rounded-2xl border border-[#0091d2]/30 bg-[#e3f3fb] p-4">
              <p className="text-[11px] uppercase tracking-wider text-[#005f8f]">Zonet</p>
              <p className="mt-1 text-sm leading-relaxed">{scenario.happened}</p>
            </div>
          }
          banner={
            banner ? (
              <button onClick={openKate} className="notify absolute left-3 right-3 top-2 z-20 rounded-2xl bg-white/95 p-3 text-left shadow-lg ring-1 ring-slate-200 backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="kate-avatar flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white">K</span>
                  Kate Ahead · now
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{scenario.notify.title}</p>
                <p className="text-xs text-slate-700">{scenario.notify.body}</p>
              </button>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-1 flex-col bg-[#eef3f6]">
          <div className="kbc-header px-5 pb-8 pt-6 text-white">
            <span className="rounded-md bg-white px-1.5 py-0.5 font-display text-[11px] font-black tracking-tight text-[#0091d2]">KBC</span>
            <h1 className="mt-4 text-2xl font-semibold">Wie ben je?</h1>
            <p className="mt-1 text-sm text-white/85">This is a concept demo of Kate Ahead. Pick a customer to see their day.</p>
          </div>
          <div className="-mt-4 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
            {personas.map((p) => (
              <button key={p.id} onClick={() => signIn(p.id)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-[#0091d2]/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e3f3fb] font-semibold text-[#005f8f]">{p.name[0]}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{p.name} <span className="font-normal text-slate-500">· {p.age}</span></span>
                  <span className="block text-xs text-slate-500">{p.tagline}</span>
                </span>
                <span className="text-slate-400">›</span>
              </button>
            ))}
            {error && <p className="text-center text-sm text-rose-600">{error}</p>}
            <p className="pt-2 text-center text-[11px] text-slate-400">Invented customers, no real data, no live AI agent.</p>
          </div>
        </div>
      )}
    </main>
  );
}
