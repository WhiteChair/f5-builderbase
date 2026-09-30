"use client";

import { useEffect, useState } from "react";
import { GUARDRAILS, HARNESS, SKILLS } from "@/lib/engine/skills";
import { GROUP_NAMES, type Group } from "@/lib/engine/types";
import type { ScaleReport } from "@/lib/engine/population";

// "Meer": how Kate Ahead works, for judges. The skills, the harness, the guardrails, and the scale numbers.
export function MoreView() {
  const [scale, setScale] = useState<ScaleReport | null>(null);
  useEffect(() => {
    fetch("/api/scale").then((r) => r.json()).then(setScale).catch(() => {});
  }, []);
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");

  return (
    <div className="flex-1 overflow-y-auto bg-[#eef3f6] p-3 text-slate-900">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">About this demo</p>
        <p className="mt-1 text-sm">Kate Ahead warns you before something goes wrong, on data the bank already holds, and explains why. This is a concept: five invented customers, no real data, and no live AI agent. Every warning is computed by the rules below, and every reply is a template over verified facts.</p>
      </div>

      <Section title="The eight data groups">
        <ul className="space-y-1 text-xs">
          {(Object.keys(GROUP_NAMES) as Group[]).map((g) => (
            <li key={g} className="flex gap-2">
              <Chip g={g} />
              <span>{GROUP_NAMES[g]}{g === "A" || g === "G" ? <span className="text-slate-500"> · always on (legal duty)</span> : ""}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500">Nothing new is collected. Each group can be switched off on the Privacy tab, except A and G.</p>
      </Section>

      <Section title="The skills (watchers)">
        <div className="space-y-2">
          {SKILLS.map((s) => (
            <details key={s.name} className="rounded-xl bg-[#f6f9fb] p-2">
              <summary className="cursor-pointer text-sm font-medium">
                {s.name} <span className="text-[10px] uppercase tracking-wider text-slate-500">· tier {s.tier} · {s.leadTime}</span>
              </summary>
              <p className="mt-1 text-xs text-slate-700">{s.fires}</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {s.dataPoints.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <Chip g={d.group} />
                    <span>{d.field}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-slate-500">Moments: {s.moments.join(" · ")}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section title="The harness">
        <ol className="space-y-1.5 text-xs">
          {HARNESS.map((h) => (
            <li key={h.step}>
              <span className="font-medium">{h.step}.</span> {h.what}
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Guardrails">
        <ul className="list-disc space-y-1 pl-4 text-xs">
          {GUARDRAILS.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
      </Section>

      <Section title="At scale">
        {scale ? (
          <>
            <p className="text-xs">The same skills ran over {scale.population.toLocaleString("en-GB")} synthetic customers (seeded, no real data). {Math.round((scale.customersWithMoment / scale.population) * 100)}% have a moment today. Expected harm prevented if every warning lands: {eur(scale.rows.reduce((s, r) => s + r.harmEUR, 0))} a year; value found: {eur(scale.rows.reduce((s, r) => s + r.valueEUR, 0))} a year.</p>
            <table className="mt-2 w-full text-[11px]">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1">Moment</th>
                  <th className="py-1 text-right">Customers</th>
                  <th className="py-1 text-right">Lead</th>
                </tr>
              </thead>
              <tbody>
                {scale.rows.slice(0, 12).map((r) => (
                  <tr key={r.kind} className="border-t border-slate-100">
                    <td className="py-1">{r.kind.replace(/-/g, " ")}</td>
                    <td className="py-1 text-right">{r.count.toLocaleString("en-GB")}</td>
                    <td className="py-1 text-right text-slate-500">{r.avgHorizonDays === 0 ? "now" : r.avgHorizonDays > 365 ? `${Math.round(r.avgHorizonDays / 365)} y` : `${r.avgHorizonDays} d`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-xs text-slate-500">Running the skills over 50,000 synthetic customers…</p>
        )}
      </Section>
      <p className="mt-3 px-1 text-[11px] text-slate-500">Team F5 · Tectonic Hackathon 2026 · KBC challenge. Source: github.com/WhiteChair/f5-builderbase</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Chip({ g }: { g: Group }) {
  return <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700">{g}</span>;
}
