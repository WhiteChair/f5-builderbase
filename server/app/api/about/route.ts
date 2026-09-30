import { GUARDRAILS, HARNESS, SKILLS } from "@/lib/engine/skills";

export const dynamic = "force-static";

// How it works, for the phone app's "Meer" screen: skills, harness, guardrails.
export function GET() {
  return Response.json({ skills: SKILLS, harness: HARNESS, guardrails: GUARDRAILS });
}
