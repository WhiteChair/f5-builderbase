# server/ — the engine and the emulated agent

This is what the phone app talks to. Vercel deploys this directory (project Root Directory = `server`) to https://f5-builderbase.vercel.app.

- **Engine** (`lib/engine/`): the five synthetic customers, the eight watchers (skills) that turn their data into moments with evidence and options, the consent gate, the living profile, the harness description, and the synthetic population for the scale numbers.
- **Emulated agent** (`lib/chat.ts`, `app/api/chat`): there is no live language model. The customer's message is classified into a fixed intent by keywords, the engine validates the slots, and the reply is rendered from templates over verified facts. Anything else answers "This demo has no live AI agent yet." In production this is where a small model would sit, forced to call one tool with the same schema, with the same templates and validation around it.
- **Web UI** (`app/`, `components/`): the same screens the phone app shows; open the URL in a browser to use it without the APK.
- **API**: `/api/personas` (public list), `/api/session` (sign in as a customer; signed httpOnly cookie), `/api/me` (moments, profile, consent; persona from the cookie only), `/api/chat` (the emulated agent), `/api/scale` (aggregates over the synthetic population).

Run locally: `npm install`, copy `.env.example` to `.env.local` (set `SESSION_SECRET`), `npm run dev`. `npm run lint` type-checks; `npm run build` must pass before a push.
