import { chat, type ChatTurn } from "@/lib/chat";
import { gate, groupsForLevel, normaliseGroups } from "@/lib/engine/gate";
import { buildPersonas } from "@/lib/engine/personas";
import { runWatchers } from "@/lib/engine/watchers";
import { readSession, writeSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const MAX_TEXT = 600;
const MAX_HISTORY = 12;
const RATE_LIMIT = 40; // messages per session per 10 minutes
const WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

function limited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5_000) hits.clear();
  return recent.length > RATE_LIMIT;
}

// Talk to Kate. Persona and consent come from the session cookie only; the text is validated and capped.
export async function POST(req: Request) {
  const session = await readSession();
  const customer = session ? buildPersonas()[session.persona] : undefined;
  if (!session || !customer) return Response.json({ error: "Pick a customer first" }, { status: 401 });
  if (limited(`${session.persona}:${session.iat}`)) return Response.json({ error: "Kate needs a short break. Try again in a few minutes." }, { status: 429 });

  let body: { text?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  if (text.length < 1) return Response.json({ error: "Say something first" }, { status: 400 });
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter((t): t is ChatTurn => typeof t === "object" && t !== null && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
        .slice(-MAX_HISTORY)
        .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_TEXT * 2) }))
    : [];

  const groups = session.groups ? normaliseGroups(session.groups) : groupsForLevel(session.consent);
  const { visible, hiddenByConsent } = gate(customer, runWatchers(customer), groups);
  const result = chat(customer, session.consent, visible, hiddenByConsent, history, text);
  for (const a of result.actions) if (a.type === "consent") await writeSession({ persona: session.persona, consent: a.level, iat: session.iat });
  return Response.json(result, { headers: { "Cache-Control": "no-store, private" } });
}
