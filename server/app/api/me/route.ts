import { explainAll } from "@/lib/engine/explain";
import { gate, groupsForLevel, levelForGroups, normaliseGroups } from "@/lib/engine/gate";
import { buildPersonas } from "@/lib/engine/personas";
import { buildProfile } from "@/lib/engine/profile";
import { CONSENT_LABELS, type ConsentLevel } from "@/lib/engine/types";
import { runWatchers } from "@/lib/engine/watchers";
import { readSession, writeSession, type Session } from "@/lib/session";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store, private" };

export const allowedGroups = (s: Session) => (s.groups ? normaliseGroups(s.groups) : groupsForLevel(s.consent));

// The signed-in persona's moments and profile. The persona comes from the session cookie only.
export async function GET() {
  const session = await readSession();
  const customer = session ? buildPersonas()[session.persona] : undefined;
  if (!session || !customer) return Response.json({ signedIn: false }, { headers: noStore });

  const groups = allowedGroups(session);
  const level = session.groups ? levelForGroups(groups) : session.consent;
  const all = runWatchers(customer);
  const { visible, hiddenByConsent, overflow } = gate(customer, all, groups);
  const moments = await explainAll(customer, visible);

  return Response.json(
    {
      signedIn: true,
      customer: { id: customer.id, name: customer.name, age: customer.age, channel: customer.channel, digitalConfidence: customer.digitalConfidence },
      accounts: { balance: customer.accounts.balance, savings: customer.accounts.savings, tier: customer.accounts.tier },
      consent: level,
      consentLabel: session.groups && groups.length !== groupsForLevel(level).length ? "Custom" : CONSENT_LABELS[level],
      groups,
      profile: buildProfile(customer, level),
      moments,
      hiddenByConsent,
      overflow,
    },
    { headers: noStore },
  );
}

// Move the dial ({ consent: 0-3 }, a preset) or set the groups directly ({ groups: ["A","C",...] }).
export async function PATCH(req: Request) {
  const session = await readSession();
  if (!session) return Response.json({ error: "Pick a persona first" }, { status: 401, headers: noStore });
  let body: { consent?: unknown; groups?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (Array.isArray(body.groups)) {
    const groups = normaliseGroups(body.groups.filter((g): g is string => typeof g === "string"));
    await writeSession({ ...session, consent: levelForGroups(groups), groups });
    return Response.json({ ok: true, groups }, { headers: noStore });
  }
  const level = body.consent;
  if (level !== 0 && level !== 1 && level !== 2 && level !== 3) return Response.json({ error: "consent must be 0-3, or pass groups" }, { status: 400 });
  await writeSession({ persona: session.persona, consent: level as ConsentLevel, iat: session.iat });
  return Response.json({ ok: true, consent: level }, { headers: noStore });
}
