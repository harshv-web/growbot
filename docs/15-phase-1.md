# Phase 1: Jeevo, fully wired into your life

Phase 1 turns the hub on your Fire 7 into a life system:
- **65 agents** gather your data, understand it, plan your days and look after you.
- **One app** runs on the tablet and the iPhone, with a **native iPhone app** for Siri, widgets and Apple Health.
- **Your own Claude** is connected to Jeevo as a connector.
- The **Ather** is logged in directly.
- The **XIAO keychain** has pages and alerts.

Everything runs on the tablet. Models are called only when a job needs judgment, inside hard rate limits and a daily budget.

## 1. The shape of it

```
 iPhone ─ Shortcuts (health, Focus, places, bank SMS, ride BT) ─┐
 iPhone ─ Jeevo web app (push) · native app (Siri, widget, Health) ┤
 Claude app (web / iPhone / desktop) ─ MCP connector ──────────────┤  HTTPS via Tailscale (Serve for you, Funnel for Claude)
                                                                   ▼
 Fire 7 hub ── soul (mood) · memory (Model of Me, tasks, diary) · event log (append-only, scrubbed)
           ├── crew: 65 agents, 9 departments, queue of 2 ── router ── Claude Haiku / Sonnet / Opus · Gemini Flash
           │                                                 └─ limiter: rpm, rpd, $/day, background share, per-agent caps
           ├── adapters: notifications (WhatsApp, Gmail, Zepto…), email (IMAP), calendar (ICS), Ather (OTP login),
           │             weather (Open-Meteo), tablet battery, camera words
           └── one way out: pushLine → face + app (live), keychain (alert/note), iPhone (Web Push)
 XIAO keychain ── WebSocket (mood + info pages + alerts) · touch · B button · BLE beacon · OTA
```

## 2. The crew

Every agent is a small module with a trigger:
- a clock time (`at`, optionally on certain days);
- an interval (`every` N minutes);
- or events (`on`).

All of them work on rules alone. The ones marked with a model tier make better calls when a key and budget are available, and fall back to rules when they aren't. You can switch any agent off or run it now from the **Crew** screen.

65 agents in 9 departments.

### Gather (10)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Notification scout** `notifications` | Watches every app notification on the Fire 7 (WhatsApp, Gmail, Zepto, Swiggy, Ather, banks). | every 30 min | rules |
| **Mail scout** `mail` | Reads new personal email headers over IMAP (read-only) and spots orders and replies owed. | every 30 min | rules |
| **Calendar scout** `calendar` | Keeps today's calendar fresh from your private ICS link and finds the next event. | every 15 min | rules |
| **Ather scout** `ather` | Reads the scooter's live telemetry every 5 minutes with your Ather login. | every 15 min | rules |
| **Body sense** `body` | Feels the Fire 7's own battery, charger and temperature. | every 15 min | rules |
| **Eyes** `eyes` | Turns the camera's words (arrived, left, wave, dark) into presence: when you're home and at your desk. | every 30 min | rules |
| **iPhone link** `phone` | Receives the iPhone's daily sync (health, focus, places, screen time) and tells you if it stopped. | every 120 min | rules |
| **Bank SMS reader** `bank` | Reads debit/credit SMS your iPhone forwards (OTPs never leave the phone) and files each spend. | on spend, credit | rules |
| **Health reader** `health` | Steps, sleep, heart rate and workouts from Apple Health via the Daily Sync. | on health | rules |
| **Places** `places` | Learns your places (home, office, gym, parents') and when you usually arrive and leave. | on place | rules |

### Understand (10)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Librarian** `librarian` | Learns lasting facts about you from what you say and write. | on input | fast (falls back to rules) |
| **Mood reader** `mood-reader` | Reads the feeling in what you say (English + Hindi) and keeps a daily mood line. | on input | rules |
| **People keeper** `people` | Remembers the people in your life and when you last talked. | on input, message | rules |
| **Routine miner** `routine-miner` | Learns your real rhythm from two weeks of data: wake, leave, office, home, sleep. | at 04:05 | rules |
| **Habit miner** `habit-miner` | Finds patterns in orders and spending: which days, which hours, how much. | at 04:10; on order | rules |
| **Spend analyst** `spend-analyst` | Sorts every rupee into food, travel, bills, shopping, subscriptions, health. | at 21:05; on spend | rules |
| **Topic tracker** `topics` | What's been on your mind this week, in a few words. | at 18:05 (Sun) | fast (falls back to rules) |
| **Promise keeper** `promises` | Catches promises you make ("I'll send it by Friday") and turns them into tasks. | on input | rules |
| **Idea catcher** `ideas` | Saves ideas the moment you say them ("idea: …", "what if…", "I should build…"). | on input | rules |
| **Gap finder** `curiosity` | Notices questions it couldn't answer well, so you know what to connect next. | on answer | rules |

### Plan (9)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Planner** `planner` | Plans your day every morning (or when you wake), with Claude when there's budget. | at 07:40; on wake | agent (falls back to rules) |
| **Week planner** `weekly` | Sunday evening: an honest look back and three to five intentions for next week. | at 19:30 (Sun) | deep (falls back to rules) |
| **Timekeeper** `timekeeper` | Fires every reminder on time, on every device, and follows up once if you miss it. | every minute | rules |
| **Focus guard** `focus-guard` | Finds a free 90-minute window for deep work and guards it when your iPhone Focus is on. | at 09:50, 13:50; on focus | rules |
| **Commute** `commute` | Tells you when to leave, with the scooter's range and the rain in mind. | every 5 min | rules |
| **Weather** `weather` | Bengaluru weather from Open-Meteo (free, no key): rain before your rides. | every 60 min | rules |
| **Meals** `meals` | Lunch and dinner ideas from what you like and usually order, cook-or-order included. | at 12:50, 19:50 | fast (falls back to rules) |
| **Errands** `errands` | Groups errands by where you'll be ("on the ride home: …"). | at 17:40 | rules |
| **Bedtime** `bedtime` | Works out when you should sleep from tomorrow's first thing, and says it once. | at 22:05 | rules |

### Act (9)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Inbox** `inbox` | Sorts messages and email: what needs you, what can wait. Evening reminder of what's still open. | at 18:15; on message | rules |
| **Reply drafter** `reply-drafter` | Drafts short replies in your voice for messages that need you. You send them; it never does. | on message | fast (falls back to rules) |
| **Butler** `butler` | Money today and this month, and restocking: spots what's running low from your order rhythm. | every 60 min | rules |
| **Bills** `bills` | Rent, BESCOM, phone and card bills: reminds you two days before, from your profile and bill SMS. | at 09:05 | rules |
| **Subscriptions** `subscriptions` | Finds recurring payments (Netflix, Spotify, iCloud, Figma…) and warns the day before renewal. | at 04:20 | rules |
| **Rider** `rider` | Charge planning for tomorrow's ride, tyre warnings, full-charge and Ather login expiry. | every 30 min; on telemetry | rules |
| **Charge log** `charging` | Logs every charging session and learns your real efficiency (km per % of battery). | on charge, ride | rules |
| **Parking memory** `parking` | Remembers where the scooter was parked (from the ride-end Shortcut or the Ather's GPS). | on ride | rules |
| **Ride log** `ride-log` | Every ride: when, how far, battery used; weekly km. | on ride | rules |

### Care (8)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Coach** `coach` | Each night: sleep, steps, late nights and late orders, in one kind line. | at 22:30 | rules |
| **Meal guard** `meal-guard` | Designers skip lunch. If nothing says you ate by 2:15, it asks once. | at 14:15 | rules |
| **Breaks** `breaks` | At the office, a stretch-and-water nudge every two hours of sitting. Twice a day at most. | every 20 min | rules |
| **Night owl** `night-owl` | Late creative sessions are yours. It just counts them and says one line near midnight. | at 23:50 | rules |
| **Mood mirror** `mood-mirror` | Watches your mood over days, not minutes. Low for three days: a gentle check-in. Good streak: it notices. | at 21:35 | rules |
| **Family** `family` | If you haven't talked to someone close in a week, it suggests a call on Sunday. | at 11:10 (Sun) | rules |
| **Wins** `wins` | Collects your wins and, on Friday evening, reads the week's list back to you. | at 18:40 (Fri); on win | rules |
| **Stress guard** `stress-guard` | When you say you're stressed or tired, it quiets everything non-urgent for two hours. | on input | rules |

### Work (5)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Office day** `office` | When you reach the office: today's meetings, promises due and one thing to protect. | on place | rules |
| **Meeting prep** `meeting-prep` | Ten minutes before a meeting: the heads-up, plus anything you've noted about it. | every 5 min | rules |
| **Standup writer** `standup` | At 6:30 pm on workdays: what you did today, drafted from your notes, wins and finished tasks. | at 18:30 | fast (falls back to rules) |
| **Focus log** `focus-log` | Adds up your iPhone Focus time: how many deep-work hours you really got. | on focus | rules |
| **Work hours** `work-hours` | Hours at the office each day and week; warns past 50 hours. | at 20:30; on place | rules |

### Home (5)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Chores** `chores` | Keeps the chore list from your profile (laundry every 4 days, rent on the 1st…) and marks them done when you say so. | every 30 min | rules |
| **Deliveries** `deliveries` | Orders on the way: tells you when to expect the doorbell, and nudges if one looks stuck. | on order | rules |
| **Home arrival** `arrival` | When you get home: one line with what's due tonight and what's arriving. | on place | rules |
| **Leaving check** `departure` | When you leave home: keys, wallet, helmet, and whether the scooter has enough charge. | on place, nfc | rules |
| **Laundry weather** `laundry-weather` | Bengaluru rain vs. drying clothes: if laundry's due and tomorrow looks dry, it says so. | at 20:10 | rules |

### Create (3)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Content scout** `content` | Each night, turns the day's build moments into one reel idea (hook, shot, caption). | at 21:15 | fast (falls back to rules) |
| **Build log** `build-log` | Tracks the Jeevo build itself: tasks, prints, firmware flashes, what's next. | at 21:20 | rules |
| **Learnings** `learnings` | Keeps what you learn ("TIL…", "learned that…") as a searchable list. | on input | rules |

### Meta (6)

| Agent | What it does | When | Model |
|---|---|---|---|
| **Dreamer** `dreamer` | At night: one diary line and, rarely, one new "I know…" sentence (GrowBot's dream; identity capped at 800 characters). | at 03:30 | deep (falls back to rules) |
| **Conductor** `conductor` | Watches the whole crew: failing agents, dead sources, spend vs budget. One line at night if something's off. | at 21:45; every 15 min | rules |
| **Privacy guard** `privacy` | Nightly: deletes raw events older than your retention setting and scrubs anything that looks like an OTP or card number. | at 04:30 | rules |
| **Backup** `backup` | Nightly copy of Jeevo's memory (soul, facts, events) — 7 days kept, optionally to shared storage. | at 04:40 | rules |
| **Critic** `critic` | Weekly: which nudges you answered and which you ignored. Quiet sources get quieter. | at 18:20 (Sun) | rules |
| **Memory gardener** `gardener` | Weekly memory upkeep: merges duplicate facts and lets unconfirmed guesses fade. | at 04:50 (Mon) | rules |



## 3. Models, rate limits and budget

| Job | Tries in order | Used by |
|---|---|---|
| fast | Claude Haiku 4.5 → Gemini Flash | sorting inbox, extracting facts, reply drafts, meals, standup, topics, reel ideas |
| chat | Gemini Flash → Claude Sonnet 5 → Haiku | answers when there's no tool use |
| agent | Claude Sonnet 5 (with tools) → Gemini Flash | your questions, the planner |
| deep | Claude Opus 5 (adaptive thinking, server-side refusal fallback) → Sonnet 5 → Gemini | dreams, weekly review |
| vision | Claude Sonnet 5 → Gemini Flash | "what do you see?" |
| audio | Gemini Flash | hearing you on the Fire 7 (no Google speech there) |

The limiter (`hub/src/limits.mjs`, set in `config.json → limits`) enforces these rules:
- **Per model:** requests per minute and per day, plus $ per million input/output tokens. Spend is computed from the real token counts each provider returns, including prompt-cache reads.
- **Daily budget:** $1.50 by default (about ₹125). Most days use a fraction of it.
- **Background share:** agents may use 60% of the budget. **Your own questions** get the rest, and may run to 125% of it.
- **Per-agent daily caps:** 24 calls by default, with overrides (librarian 40, reply-drafter 15, …).
- **When a limit is hit:** the router tries the next model for that job. When none is left, the agent quietly uses its rule-based path. The **Crew** screen shows spend, calls per model and the last limit hit.
- **Counts survive a restart:** they're saved in `data/usage.json`, with 30 days of history.

Claude answers use a **manual tool-use loop** (the same 14 tools as the connector: today, search_memory, profile, remember, forget, add_task, complete_task, list_tasks, scooter, orders, inbox, recent, note, nudge). The system prompt is prompt-cached, and every turn goes through the limiter.

## 4. Every data source

| Source | How it arrives | What Jeevo does with it |
|---|---|---|
| WhatsApp, Gmail, Zepto, Swiggy, Blinkit, Ather app, bank apps | Termux:API notification access on the Fire 7 | Orders, messages that need you, reply drafts, people |
| Personal email | IMAP (app password), read-only headers | Orders, replies owed |
| Calendar | Private ICS link | Plan, meeting prep, focus windows |
| Ather 450 | Your Ather login (OTP) → `cerberus.ather.io` telemetry every 5 min | Battery, range, tyres, odometer, location, charging; rides, charge log, efficiency, parking |
| Ride start/end | iPhone Bluetooth automation with the dash | Ride mode, parking spot |
| Apple Health | Daily Sync Shortcut or the native app | Steps, sleep, resting HR, active energy → coach, bedtime |
| Focus | iPhone Focus automations | Do Not Disturb, focus hours |
| Places | iPhone arrive/leave automations, office/home Wi-Fi | Office days, work hours, arrival and departure briefs, routine |
| Money | Bank SMS (amount + merchant only; OTPs dropped on the phone *and* scrubbed on the hub) | Spend by category, subscriptions, bills, budget |
| Camera | Face page: 32×24 grey thumbnail in the browser → words only | Presence, desk time, greeting, dozing at night; a picture only when you ask |
| Microphone | Tap Talk | Gemini transcribes (English/Hindi), then the brain |
| Weather | Open-Meteo (free, no key) | Rain before rides, laundry weather |
| Tablet | termux-battery-status | Battery care, heat warnings |
| What you say | App, face, Siri, keychain, Claude | Facts, promises, ideas, learnings, feelings, wins |
| Work (off) | Only if your employer's policy allows it | — |

## 5. Your Claude, connected (MCP)

The hub serves Jeevo as a **remote MCP server** (Streamable HTTP, stateless JSON) at `/mcp/<secret>`. The same 14 tools the crew uses show up in Claude, so from claude.ai, the Claude iPhone app or Claude Desktop you can ask things like:
- "What's on my plate today?"
- "What did I order from Zepto this week?"
- "Remind me to call Aditi on Sunday."
- "Remember that I'm allergic to cashews."

Claude has to reach the hub over **public HTTPS**:
1. Turn on Tailscale **Funnel** for the tablet, once in the admin console. Then run:
   ```sh
   tailscale --socket=$PREFIX/var/run/tailscaled.sock funnel --bg 8047
   ```
2. In the app, open **Settings → Your Claude, connected** and copy the URL.
3. In Claude, go to **Settings → Connectors → Add custom connector** and paste it.

Custom connectors need a Claude plan that includes them. The long random part of the URL is the key: keep it private. If it leaks, set a new `MCP_SECRET`. With Funnel on, set `"trustLocalhost": false` and use a `HUB_TOKEN`. Funnel traffic arrives from localhost, and the connector route is the only one that should work without a token.

## 6. The apps

**Jeevo app** (`/app/`). One app for both screen sizes: a side rail on the tablet, bottom tabs and a More sheet on the iPhone. Eight screens:

| Screen | What's on it |
|---|---|
| Jeevo | The full camera face on the tablet; the canvas face and Ask bar on the phone |
| Today | Plan, tasks (add, tick off), calendar, orders, chores, what the crew said |
| Ride | Battery ring, range, tyres, charging, parking, rides, every raw signal; Ather OTP login |
| Inbox | Needs you / everything else, reply drafts to copy |
| Life | Steps, sleep, spend, rides, office and focus hours, mood week, money by category, subscriptions, rhythm, habits, people, diary, identity, ideas, reel ideas, standup |
| Memory | Search your life, teach it, forget anything |
| Crew | All agents by department, on/off, run now, spend and limits |
| Settings | Every connection's status, model test, push, Claude connector URL, quiet mode, voice |

How the app behaves:
- It installs to the Home Screen as a web app, with a manifest and a service worker (the shell works offline).
- **Push:** on iOS 16.4+ it sends Web Push when installed from Safari over Tailscale Serve https.
- **Voice:** Safari's speech recognition on the iPhone. On the Fire 7 the app records and the hub transcribes.

**Native iPhone app** (`ios/`, SwiftUI):
- Siri App Intents: "Ask Jeevo", "Remind me with Jeevo", "Tell Jeevo".
- Home and Lock Screen widgets.
- HealthKit sync.
- The web app inside it.

It's built with XcodeGen and Xcode, and a free Apple ID works.

## 7. The keychain (XIAO ESP32-S3 + 1.3" SH1106)

- **Face:** 38 moods, springy, the same presets as the tablet.
- **Pages** (press B): face → next up → scooter → today → clock (IST over NTP). They fall back to the face after 20 s.
- **B button:** twice = "on my way"; hold = the soul moves into the key.
- **Alerts:** reminders, charge-tonight, tyre and bill alerts take over the screen with a blinking frame. Touch = done (the task closes on the hub).
- **Notes:** a small line at the bottom for 6 s.
- **Idle:** it dims after 45 s.
- **Networks:** roams between home, office and your iPhone hotspot.
- **Updates:** over Wi-Fi (OTA). There's also the BLE beacon and LED mode with no screen.

## 8. Privacy, exactly

- Everything lives in `hub/data/` on the tablet: `events.jsonl`, `memory.json`, `soul.json`, `usage.json`, `ather.json` (0600) and `push.json` (0600). Nightly backups, 7 kept.
- OTP-like codes and 12–19 digit numbers are scrubbed before anything is written, and the privacy agent re-scrubs nightly. Events older than `privacy.retentionDays` (365) are deleted.
- Models get only what a job needs: a message to sort, a question plus the tool results Claude asks for, or one photo when you ask.
- You can see and delete every learned fact on the Memory screen, and switch off any agent on the Crew screen.

## 9. What's tested and what isn't

| Area | Status |
|---|---|
| Hub, crew, memory, tasks, reminders, limiter, Claude tool loop (stand-in client), Ather login + telemetry (stand-in server), MCP connector, app API | **57 automated checks pass** (`npm test`: 17 smoke + 40 phase-1) |
| App screens | Loaded in Chromium at 1024×600 (Fire 7) and 390×844 (iPhone) with sample data, no page errors |
| Keychain firmware | Type-checks under `-Wall -Wextra` against stand-in libraries; faces, pages and the alert rendered by running the real drawing code (`firmware/sim/render.sh`). **Not yet flashed**: the Arduino servers are blocked here |
| Real Ather servers | Endpoints and headers come from two working open-source projects. **Not yet run against your scooter**; unknown extra fields show up on the Ride screen's signal list |
| Real Claude / Gemini calls | Code follows the documented SDK patterns. **Not yet run with your keys** (use Settings → Test) |
| iOS native app | Written, **not compiled** (no Mac here) |
| Web Push to iOS | Built with `web-push` + VAPID. Needs your https (Tailscale Serve) to try |

## 10. Rollout, in order

1. **Hub:** `git pull` in Termux → `npm install` → `npm test` → `jeevo start`. On the Fire 7, open `http://localhost:8047/app/`.
2. **Keys:** add them in `secrets.json`, then Settings → Test. Set your daily budget in `config.json → limits`.
3. **Ather:** Ride screen → phone → OTP.
4. **Tailscale Serve** (https) → install the app on the iPhone from Safari → Settings → Enable push.
5. **Shortcuts:** Daily Sync, Focus, places, bank SMS, ride BT (`shortcuts/README.md`).
6. **Claude:** Funnel → Settings → copy the connector URL → Claude → Connectors.
7. **Keychain:** fill in `secrets.h` with 2–3 networks → flash → after that, OTA.
8. **Native app:** when you're at a Mac.
9. **After a week:** check the Crew screen (what's useful, what's noisy) and the Memory screen (what it learned). Let the critic quiet the rest.
