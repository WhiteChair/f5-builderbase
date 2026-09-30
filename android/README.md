# Kate Ahead – Android app

Native Android app (Kotlin + Jetpack Compose). No WebView: every screen is Compose, and the app talks to the
server in `../server` over its JSON API only (`/api/personas`, `/api/session`, `/api/me`, `/api/chat`,
`/api/about`, `/api/scale`). The server is the engine and the emulated agent; the phone is the customer's view.

## Layout

- `app/src/main/java/be/f5/kateahead/`
  - `MainActivity.kt` – app state, sign-in, notification after 4 s, moment reveal on the Kate tab, chat, speech input (system `SpeechRecognizer`), video message (system camera via `FileProvider`) with Kate's fixed "forwarded to a human" reply.
  - `Screens.kt` – KBC-styled screens: Overzicht, Kate, Profiel, Privacy (per-group switches), Meer (skills, harness, guardrails, scale).
  - `Api.kt` – OkHttp client with an in-memory cookie jar for the signed session cookie.
  - `Models.kt` – wire types (kotlinx-serialization).
- `app/src/main/res/xml/network_security_config.xml` – HTTPS only, cleartext allowed for LAN/localhost when pointing at a local server.

## Build

```
./gradlew assembleRelease                       # uses https://f5-builderbase.vercel.app
./gradlew assembleRelease -PapiBase=http://192.168.1.10:3000   # local server
```
Needs JDK 17 and an Android SDK (compileSdk 36). The release build is signed with the debug key so it installs on any phone (allow "install from unknown sources"). Output: `app/build/outputs/apk/release/app-release.apk`.

## Demo flow

1. "Wie ben je?" – pick one of the five invented customers.
2. Overzicht shows the KBC-style balance and what just happened; after 4 s a Kate Ahead notification appears.
3. Tap it: Kate reveals the moments one by one with evidence, lead time and options.
4. Privacy: switch data groups off and watch moments disappear; Profiel: what the bank already knows.
5. Anything off-script gets "the demo has no live AI agent yet"; a video message gets the face-recognition/human-review reply.
