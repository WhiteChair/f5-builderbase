"use client";

import type { Profile } from "@/lib/engine/profile";
import type { ConsentLevel } from "@/lib/engine/types";

// The Profile tab: the living profile the watchers read, shown to the customer, group by group,
// with locked groups greyed out. This is the "we know a lot about you, and you can see it" beat.
export function ProfileView({ profile, consent, consentLabel, acted, openCount, onDial }: { profile: Profile; consent: ConsentLevel; consentLabel: string; acted: string[]; openCount: number; onDial: () => void }) {
  return (
    <div className="h-full overflow-y-auto bg-[#eef3f6] p-3 text-slate-900">
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">Your profile, as Kate sees it</p>
        <p className="mt-1 text-sm font-semibold">{profile.headline}</p>
        <p className="mt-1 text-xs text-slate-600">
          {profile.unlockedGroups} of 8 data groups unlocked · dial: {consentLabel}.{" "}
          <button onClick={onDial} className="text-sky-700 underline">Change</button>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-lg font-semibold">{openCount}</p>
            <p className="text-slate-500">open heads-ups</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-lg font-semibold">{acted.length}</p>
            <p className="text-slate-500">handled</p>
          </div>
        </div>
      </div>

      {acted.length > 0 && (
        <div className="mt-3 rounded-2xl bg-white p-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Handled ahead of time</p>
          <ul className="mt-1 space-y-1 text-xs">
            {acted.map((a) => (
              <li key={a} className="flex gap-2 text-emerald-800">
                <span>✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {profile.groups.map((g) => (
          <details key={g.group} className={`rounded-2xl bg-white p-3 shadow-sm ${g.unlocked ? "" : "opacity-60"}`} open={g.unlocked && g.facts.length <= 3}>
            <summary className="flex cursor-pointer items-center gap-2 text-sm">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700">{g.group}</span>
              <span className="font-medium">{g.name}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500">{g.unlocked ? `${g.facts.length} facts` : "locked by your dial"}</span>
            </summary>
            {g.unlocked ? (
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                {g.facts.map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-500">The bank holds this data, but Kate doesn't use it for heads-ups at your current dial level.</p>
            )}
          </details>
        ))}
      </div>
      <p className="mt-3 px-1 text-[11px] text-slate-500">Every fact here is something the bank already stores to run your accounts and policies. Heads-Up doesn't collect anything new; it reads what's there, for you, with your say-so.</p>
    </div>
  );
}
