import { buildPersonas, PERSONA_META } from "@/lib/engine/personas";
import { clearSession, writeSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// "Log in" as a demo persona. The persona id is validated against the fixed list.
export async function POST(req: Request) {
  let body: { persona?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = typeof body.persona === "string" ? body.persona : "";
  if (!PERSONA_META.some((p) => p.id === id)) return Response.json({ error: "Unknown persona" }, { status: 400 });
  const customer = buildPersonas()[id];
  await writeSession({ persona: id, consent: customer.consent, iat: Math.floor(Date.now() / 1000) });
  return Response.json({ ok: true, persona: id, consent: customer.consent });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
