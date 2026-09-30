import { scaleReport } from "@/lib/engine/population";

export const dynamic = "force-dynamic";

// Aggregates over the synthetic population. No individual data leaves the server.
export function GET() {
  return Response.json(scaleReport(), { headers: { "Cache-Control": "public, max-age=300" } });
}
