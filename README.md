# Kate Ahead

> Your bank warns you before things go wrong, on data it already holds, and explains why.

A concept for the **KBC challenge** at the Tectonic Hackathon 2026 (team F5).

**What it adds:** a layer that uses data points the bank already holds, but doesn't yet turn into determinations for the customer. Eight groups of data (balances and recurring payments, policies and their dates, ID expiry, a notary deposit, a new device…), a small set of formulas a regulator can recompute by hand, a consent switch per data group, and a message that shows its evidence. The result: the app tells a customer what is about to go wrong and the cheapest fix, with a lead time of days to months, and says which data it used.

**Live:** https://f5-builderbase.vercel.app · **Repo:** https://github.com/WhiteChair/f5-builderbase

Five invented customers, no real data, no live AI agent.

## The two parts of this repo

| Directory | What it is | Runs where |
|---|---|---|
| [`server/`](server/) | The engine (skills over the customers' data), the **emulated agent** the app talks to, the API, and the same screens as a web UI | Vercel, from this directory (project Root Directory = `server`) |
| [`android/`](android/) | The phone app: a native Android app (Kotlin + Compose) wrapper that opens the server full screen as a native Android app; builds the APK | The phone |

The phone app contains no product logic; everything a customer sees is computed in `server/`. The web UI at the live URL is the same app without the APK, so it can be tried in any browser.

## Try it

Pick a customer:

| Customer | What just happened | What Kate Ahead catches |
|---|---|---|
| Lien & Tom, 31 | Signed the compromis for a €385k house, label E | The purchase analysed as a whole (bundle vs standalone with the 2024 switch right, EPC renovation obligation and energy loan, 2% duty); insure the rebuild value; the renovation clock |
| Marc, 64 | Confirmed his retirement date; his group hospitalisation cover ends that day | The continuation right, 5 months early (adviser confirms); ID expiry in 41 days; a term deposit maturing; idle savings |
| Ayşe, 24 | Paid abroad with another app again; 25th birthday in 38 days | The fee cliff at 25 with the tier that fits her usage; money drifting to Revolut; idle savings |
| Jos, 72 | Tapped a parcel-scam link, enrolled a new device, is about to send €2,850 | The scam stopped in the moment with reason codes, delivered by phone too; a premium rise at the policy anniversary |
| Nadia, 38 | Her client pays late; VAT is due on the 20th; she bought a car | A shortfall projected 10 days ahead; the car with no motor cover; the income-protection gap |

On their Overzicht, a notification leads into **Kate Ahead**: the moments appear one by one. Tap **Why?** for the exact data points behind each, tap an option, ask a question (typed or spoken), send a photo or video, open **Profiel** for the living profile, **Privacy** to switch data groups on and off, and **Meer** for the skills, the harness and the guardrails.

## Run it

**Server** (also the web UI):

```bash
cd server
npm install
cp .env.example .env.local   # set SESSION_SECRET to any long random string
npm run dev                  # http://localhost:3000
```

Node.js 20+. `npm run lint` type-checks; `npm run build` must pass.

**Phone app (APK):** see [`android/README.md`](android/README.md). The wrapper points at the live URL; the built APK is attached to the release, or build it with the Android SDK and JDK 17.

## How it works

```
signals (data the bank already holds)
   → situation record per customer
   → skills (8 watchers) produce moments with evidence, lead time, expected harm, options
   → consent gate (per data group) + cap of 4 on screen
   → templates render the message  ← the emulated agent answers questions here
   → app card / adviser / phone script
```

**Eight data groups**, all of which a bank-insurer already stores to run accounts and policies. Nothing new is collected.

| Group | Data points | Can be switched off |
|---|---|---|
| A Identity & compliance | ID expiry, KYC review date, missing documents | No (AML/KYC duty) |
| B Accounts & payments | Balance trajectory, inflows, recurring debits, new payees, amount vs usual, name-check result, outflows to other apps | Yes |
| C Products & pricing | Account tier vs feature use, rates held, deposits, loans, renovation drawdowns | Yes |
| D Insurance | Policies, insured capital vs rebuild value, group vs individual cover, anniversaries, premium changes | Yes |
| E Life stage & household | Age, household, employment, pension horizon, home ownership, energy label, flood zone | Yes |
| F Behaviour & channel | Logins, repeated screens, abandoned flows, searches, calls | Yes (the most personal) |
| G Device & security | New device, SMS link timing, pending transfer signals | No (fraud monitoring is a legal duty under PSR) |
| H External calendars & rules | Renovation obligation, switch window, medical index, tariff changes | Yes |

**The skills** (`server/lib/engine/watchers.ts`, described as data in `server/lib/engine/skills.ts`):

| Skill | Tier | Fires when |
|---|---|---|
| Deadline | 0 | ID expiry ≤ 60 days; KYC document missing; renovation obligation |
| Cover | 0 | Group hospitalisation ending ≤ 200 days; medical-index rise ≤ 45 days; insured capital < 90% of rebuild value or renovation after last valuation; car paid, no motor policy; self-employed, no income protection; flood zone |
| Cash-flow | 1 | 30-day projection `balance + inflows − recurring debits`, minimum < 0 |
| Risk | 2 | Logistic score on five reason codes (new device +2.2, SMS link +2.0, new payee +1.2, amount > 3× usual +1.0, name check not green +1.5, intercept −3), fires above p = 0.6; always on |
| Drift | 1 | Outflows to other apps: last 3 months > 2× first 3 and > €200 |
| Value | 0 | Fee cliff at 25 with best-fit tier; savings ≥ €5k at ≤ 1% for 12+ months; deposit maturing ≤ 30 days |
| Credit | 1 | Notary deposit + mortgage quote: duty, LTV, bundle vs standalone over the switch window, energy loan vs mortgage, rebuild value |
| Behaviour | 1 | Same screen opened 3 times in a week |

Tier 0 is calendars and facts (deterministic), tier 1 is patterns over transactions (no training), tier 2 is one score with reason codes. No model prices insurance or decides credit.

**Consent** is a set of data groups. The dial's four presets (Only the essentials → My products → My money patterns → How I use the app) are presets over that set; every group can also be toggled alone. A moment is shown only if every group in its evidence is allowed, and the app lists what can no longer be caught when a group is switched off (`server/lib/engine/gate.ts`).

**The emulated agent** (`server/lib/chat.ts`): a keyword classifier maps the message to a fixed intent (act, explain, consent, adviser, profile, media received, acknowledge, unclear); the engine validates the slots; templates render the reply. Anything outside those intents answers "This demo has no live AI agent yet." The goal is to harness a real agent on this layer: formulas and thresholds calibrated with market and actuarial research on the bank's own data, and the agent answering and deducing only over verified data points, citing them, acting through the same options. The templates and validation would not change.

**A photo or video** sent in the app stays on the device. The reply states the transcript understood (browser speech recognition), that identity could not be verified by face recognition, and that it was forwarded to a human.

## Security

- The signed-in customer comes only from a signed, httpOnly session cookie; no customer id is accepted in a URL or body on data routes (no IDOR).
- All inputs are validated and capped; the chat is rate-limited per session.
- Security headers on every route: CSP, `frame-ancestors 'none'`, nosniff, referrer policy, permissions policy (camera and microphone same-origin only), HSTS.
- No secrets in the repo; the only environment variable is `SESSION_SECRET`. The Android signing key is not in the repo.
- Nothing a customer records leaves the device.

## What's unfinished

- No live language model: replies are templated and the classifier is keyword-based (by design for this demo).
- All customers and the 50,000-customer scale view are synthetic and seeded; production would read the bank's own data and parameters (the demo's estimates are marked as such in `server/lib/engine/watchers.ts`).
- The adviser, phone and email channels are simulated as confirmations; there is no persistence between sessions.
- The phone app is a wrapper around the server; it needs a network connection.
- Dutch labels in the app chrome with English content, to keep one demo language.

## Team

Team F5: Miguel Terol (@Mixone-FinallyHere) and teammates. Built during the Tectonic Hackathon, 30 September 2026.

## License

[MIT](LICENSE)
