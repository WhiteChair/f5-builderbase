import { PERSONA_META } from "@/lib/engine/personas";
import { SCENARIOS } from "@/lib/stories";

export const dynamic = "force-static";

// Public: the five demo personas (invented people, no account data).
export function GET() {
  return Response.json({ personas: PERSONA_META.map((p) => ({ ...p, scenario: SCENARIOS[p.id] })) });
}
