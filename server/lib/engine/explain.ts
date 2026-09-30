// Turns moments into what Kate says. This demo has no live language model: every message is the
// watcher's own plain-language summary, which is written from the same facts the card cites.

import type { Customer, ExplainedMoment, Moment } from "./types";

export function explainAll(c: Customer, moments: Moment[]): ExplainedMoment[] {
  return moments.map((m) => ({ ...m, message: m.summary, explainedBy: "template", channelHint: c.channel }));
}
