# Jeevo hub

The local soul. It runs on your rooted Fire 7 (Termux) or any laptop. It holds the mood, the event log and the life rhythm, serves the tablet face, and talks to the ESP32 bodies and your iPhone.

## Run it on the Fire 7 (today)

1. Install **Termux**, **Termux:API** and **Termux:Boot** from F-Droid. In Android settings, give Termux:API **notification access** (this is how Jeevo reads WhatsApp, Gmail, Zepto, Swiggy and Ather notifications).
2. In Termux:
   ```sh
   pkg update && pkg install nodejs-lts git termux-api
   git clone -b claude/relaxed-volta-mek7ih https://github.com/harshv-web/growbot && cd growbot/hub
   npm install
   cp config.example.json config.json && cp profile.example.json profile.json && cp secrets.example.json secrets.json
   npm start
   ```
3. Open `http://localhost:8047` on the Fire 7 in full screen (Chrome, a kiosk browser, or "Add to Home screen"). That's the face.
4. Optional: `prototypes/fire7/setup.sh` makes it start at boot, disables Doze and sets up the 40–80% battery window.

With no model keys it still works on rules (orders, chores, scooter, calendar, feelings). Add keys to `secrets.json` to make it think:
- `GEMINI_API_KEY` for live chat, `ANTHROPIC_API_KEY` for classification, agent work and deep reflection.
- Model ids are in `config.json` → `models` (defaults: Gemini Flash for chat, Claude Haiku 4.5 to classify, Claude Sonnet 5 for tools, Claude Opus 5 for deep thinking). Check Google's model list for the exact Gemini id.

## Reach it from the iPhone, anywhere

Install **Tailscale** on the Fire 7 and the iPhone (free for personal use). The hub is then at `http://<fire7-tailscale-name>:8047` from the office or on the road. Set `HUB_TOKEN` in `secrets.json` and send it as `Authorization: Bearer …` from Shortcuts. Recipes are in `../shortcuts/README.md`.

## Connect your life

| What | Where | Notes |
|---|---|---|
| Notifications (WhatsApp, Gmail, Zepto, Swiggy, Blinkit, Ather…) | on by default on Termux | Link WhatsApp to the Fire 7 as a companion device; install the shopping apps there and log in |
| Calendar | `config.json → adapters.calendar.icsUrl` | Google Calendar → Settings → your calendar → "Secret address in iCal format" |
| Personal email | `adapters.email` + `EMAIL_APP_PASSWORD` | Gmail: 2-step verification → App passwords; `npm install imapflow` |
| Ather | `adapters.ather` + `ATHER_TOKEN` | Unofficial and read-only. Fill `baseUrl`, `statusPath` and field paths once confirmed (see docs/13). Can break without notice. |
| Who you are | `profile.json` | Your rhythm, chores, what drains you, what counts as a win. Fill the `fill_me_in` answers. |

**Work data:** keep `workCompartment` off unless your employer's policy allows company mail or chat on a personal AI.

## API

- `POST /input` `{kind, text?, data?, from}`: kinds `voice`, `text`, `photo`, `share`, `nfc`, `button`, `touch`, `shake`, `notification`, `email`, `sms`, `telemetry`. Returns `{line, deep}`: one plain sentence, plus details only if there are any.
- `GET /api/state`: mood, each body's expression, scooter, calendar, chores.
- `GET /api/log?h=24`: recent events.
- `WS /ws?body=tablet|keychain|desk[&compact=1]`: live state; send `{t:"input"}`, `{t:"sense", name:"dizzy"}`, `{t:"lease"}`.

## Test

`npm test` starts the hub on a spare port and checks orders, notes, chores, feelings, NFC, per-body sensations and the face.
