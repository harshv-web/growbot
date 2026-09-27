# Jeevo hub

The local soul. It runs on your rooted Fire 7 (Termux) or any laptop. It holds the mood, the event log and the life rhythm, serves the tablet face, and talks to the ESP32 bodies and your iPhone.

## Run it on the Fire 7 (today)

The full walk-through is `docs/14-build-guide.md`. Short version, in Termux (from F-Droid):

```sh
pkg install -y git
git clone -b claude/relaxed-volta-mek7ih https://github.com/harshv-web/growbot ~/growbot
bash ~/growbot/hub/scripts/fire7-setup.sh      # packages, install, 17 self-tests, start at boot, the `jeevo` command
jeevo edit profile && jeevo edit secrets && jeevo start
```

Open `http://localhost:8047/app/` in Chrome 119 (the last Chrome for Android 7) and add it to the home screen. The whole system is described in `docs/15-phase-1.md`. `jeevo doctor` checks everything and says what to fix; `jeevo log`, `jeevo update`, `jeevo stop` do what they say.

With no model keys it still works on rules (orders, chores, scooter, calendar, feelings). Keys make it smarter:
- `GEMINI_API_KEY`: live chat, and **hearing** on the Fire 7 (it has no Google speech service, so the face records you and Gemini transcribes).
- `ANTHROPIC_API_KEY`: classification, agent work, deep reflection and **sight** (Look).
- Model ids are in `config.json` → `models`. Check Google's model list for the exact Gemini id.

## The face

`face/face.js` is a spring-physics face with 38 moods (`?demo` walks through them, `?clean` hides the UI for filming). Moods come from the soul's emotion engine plus short sensations the hub sets from what happens: you say "haha" → laughing, "cute" → shy, a scolding → sulky (twice → crying), an order out for delivery → excited, a win → proud. Touch: poke = squish + tickle, three taps = laughing, hold = cosy, drag = the eyes follow your finger.

**Eyes (front camera).** Presence, light and gaze run inside the browser on a 32×24 grey thumbnail; only words ("arrived", "wave", "dark") reach the hub. A picture leaves the tablet only when you ask it to look ("what do you see?", or **Look**), and only the description is kept. From the iPhone, a look borrows a frame from the open face, or falls back to `termux-camera-photo`. Turn parts off in `config.json → camera`.

**Body truth.** It reads the Fire 7's own battery (`termux-battery-status`), feels hungry when low, and tells you if it's getting warm on the charger.

## Reach it from the iPhone, anywhere

Install **Tailscale** on the iPhone, and run it inside Termux on the Fire 7 (the app needs Android 8+; `fire7-setup.sh` installs it and starts it at boot, see the build guide part C). The hub is then at `http://<fire7-tailscale-name>:8047` from the office or on the road. Set `HUB_TOKEN` in `secrets.json` and send it as `Authorization: Bearer …` from Shortcuts. Recipes are in `../shortcuts/README.md`.

## Connect your life

| What | Where | Notes |
|---|---|---|
| Notifications (WhatsApp, Gmail, Zepto, Swiggy, Blinkit, Ather…) | on by default on Termux | Link WhatsApp to the Fire 7 as a companion device; install the shopping apps there and log in |
| Calendar | `config.json → adapters.calendar.icsUrl` | Google Calendar → Settings → your calendar → "Secret address in iCal format" |
| Personal email | `adapters.email` + `EMAIL_APP_PASSWORD` | Gmail: 2-step verification → App passwords; `npm install imapflow` |
| Ather | App → Ride → phone number → OTP | Unofficial and read-only: the Ather app's own endpoints (`cerberus.ather.io`), telemetry every 5 min. Token kept in `data/ather.json`. Can break if Ather changes its app. |
| Who you are | `profile.json` | Your rhythm, chores, what drains you, what counts as a win. Fill the `fill_me_in` answers. |

**Work data:** keep `workCompartment` off unless your employer's policy allows company mail or chat on a personal AI.

## API

- `POST /input` `{kind, text?, data?, from}`: kinds `voice`, `text`, `photo`, `share`, `nfc`, `button`, `touch`, `shake`, `notification`, `email`, `sms`, `telemetry`. Returns `{line, deep}`: one plain sentence, plus details only if there are any.
- `GET /api/state`: mood, each body's expression, scooter, calendar, chores.
- `GET /api/log?h=24`: recent events.
- `WS /ws?body=tablet|keychain|desk[&compact=1]`: live state; send `{t:"input"}`, `{t:"sense", name:"dizzy"}`, `{t:"lease"}`, `{t:"look", image, q}`, `{t:"hear", audio, mime}`, `{t:"room", what}`, `{t:"eyes", on}`.
- Every `/api/*` read and `/input` needs `HUB_TOKEN` (header `Authorization: Bearer …` or `?token=`), except from the tablet itself. Set `"trustLocalhost": false` when Tailscale runs in userspace mode.

## Test

`npm test` runs 57 checks: `test/smoke.mjs` starts the hub and runs 17: orders, notes, chores, feelings, NFC, per-body sensations, the face, room events from the camera, a look relayed from the face, and hearing without a key; `test/phase1.mjs` runs 40 more on the crew, memory, reminders, the limiter, the Claude tool loop, the Ather flow and the connector.
