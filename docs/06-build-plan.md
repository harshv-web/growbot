# Build plan

<!-- Generated from site/src/data.js by site/build.mjs. Edit the data, not this file. -->

About 10–12 hours a week. Each phase ends in a demo and a "done when" test; nothing from a later phase starts before the current one passes.

## P0 · Wake the tablet (Week 1)

The old tablet becomes a face that listens and talks back in three languages.

- [ ] Run the Lab's Device Check on the tablet and the iPhone; save both reports
- [ ] Decide the tablet path (Android Chrome vs iPad Safari)
- [ ] Face web app: animated eyes, clock, wake lock, dim schedule
- [ ] Talk loop: browser speech → Gemini → device voice, with local memory
- [ ] Battery guard: charge window + temperature check
- [ ] Say 'Jeevo' 50 times with the TV on: does it hear 'Jio'?

**Demo:** “My old tablet woke up and spoke Kannada.”

**Done when:** It answers a Hindi question and a Kannada question from across the room.

**Cost:** ₹0–900

## P1 · One soul (Weeks 2–3)

A Soul Core in the cloud that every device shares: one memory, one writer.

- [ ] Cloudflare Worker + Durable Object (Agents SDK): event log, facts, device tokens
- [ ] WebSocket presence from tablet and iPhone web app; Web Push to the iPhone
- [ ] Hybrid logical clocks + offline queue in IndexedDB
- [ ] Soul Inspector: timeline, facts, reason traces, forget
- [ ] Telegram bot as the first chat door
- [ ] Guardian v0: spend cap, OTP firewall rules, confirm-before-send

**Demo:** “I told the tablet. My phone remembered.”

**Done when:** Airplane-mode edits on both devices merge correctly, with the conflict shown.

**Cost:** ₹0 (free tiers)

## P2 · iPhone senses (Weeks 4–5)

The iPhone becomes Jeevo's sense of time, place and money.

- [ ] Shortcuts pack: Ask Jeevo (Siri, Action button, Back Tap), alarm-stopped brief, Wi-Fi arrive/leave, Focus sync, charger/dock
- [ ] Bank SMS ledger with the on-phone OTP firewall
- [ ] Share-sheet capture
- [ ] Metro coach with BMRCL GTFS + Routes API; rain plan B
- [ ] Attention router v1 with the interruption budget

**Demo:** “My alarm briefed my tablet, and my keychain told me when to leave.”

**Done when:** One week of mornings where the brief and the metro nudge are right.

**Cost:** ₹0–200/month

## P3 · Connected person (Weeks 6–7)

Jeevo's memory inside every AI you use, and the Indian services wired in.

- [ ] Jeevo MCP server (Streamable HTTP, OAuth): recall, remember, today, lists, people
- [ ] Connect to Claude (web + iOS) and ChatGPT developer mode; add Swiggy's connectors next to it
- [ ] Email ingest on your domain: orders, trips, bills, statements
- [ ] Alexa custom skill + Voice Monkey announcements
- [ ] Crew v1: Jeevo, Librarian, Chief of Staff, Guardian; Dreamer nightly on Batch

**Demo:** “Claude ordered my Jeevo grocery list on Instamart.” · “Alexa, ask Jeevo…”

**Done when:** Ask-my-life answers three real questions with sources.

**Cost:** ≈ ₹300–600/month + domain

## P4 · Nervous system (Weeks 8–10)

The house gets senses and hands: radar, sound, IR, lights, power, and a head that turns.

- [ ] ESP32-S3 dock: LD2410C, AHT20, IR, BLE scan, WiZ/Tuya bridge, heartbeat
- [ ] Swivel base: bearing + NEMA17 + TMC2209; MediaPipe face tracking on the tablet
- [ ] Scribe v1: Whisper on Workers AI, Sarvam/Gemini for Kannada; sound events (doorbell, cooker)
- [ ] Housekeeper reflexes: arrival, AC curve, lights, power-cut log
- [ ] Privacy switch + ring light

**Demo:** “It turned to look at me when I walked in.” · “It counted my cooker's whistles.”

**Done when:** A week of arrivals, power cuts and AC nights handled with no manual step.

**Cost:** ≈ ₹3,500 parts

## P5 · Pocket (Weeks 11–12)

The keychain and the case make Jeevo physical outside the house.

- [ ] NFC tags: door, bed, desk, helmet, pill box, privacy
- [ ] Printed iPhone case: MagSafe ring, dock key, tap-card, shutter
- [ ] Keychain tier 2: BLE beacon + buzzer → forgot-keys alert
- [ ] Keychain tier 3 prototype: push-to-talk pendant from Omi's firmware

**Demo:** “My keys texted me.”

**Done when:** Forgot-keys fires correctly five times out of five, with no false alarms for a week.

**Cost:** ≈ ₹2,500 parts

## P6 · Learn and play (Month 4)

Jeevo starts noticing things about you, and shows off.

- [ ] Model of Me review loop: proposed facts, routines, patterns
- [ ] Learned reflexes; routine drift; Kannada coach; voice diary
- [ ] Walker body for the old phone; two Jeevos meet
- [ ] Cricket buddy, festival modes

**Demo:** “The same soul, now with legs.” · “What Jeevo learned about me in 30 days.”

**Done when:** Ten accepted facts and two approved reflexes the Dreamer found by itself.

**Cost:** ≈ ₹2,300 parts

## P7 · Hardening (Ongoing)

Make it boring to trust.

- [ ] Offline mode and cached brief
- [ ] Nightly encrypted export and restore by QR
- [ ] Monthly privacy audit: what's stored, where, for how long
- [ ] Budget alerts and model-price updates (Gemini promo ends 31 Dec 2026)
- [ ] Watch for NPCI agent payments and Alexa+ MCP in India

**Demo:** “I unplugged the internet for a day.”

**Done when:** A restore from backup on a spare phone works.

**Cost:** —

## Running cost (crew presets)

| Preset | Now (Sep 2026 prices) | From Jan 2027 |
|---|---:|---:|
| Lean | ₹611/month | ₹647/month |
| Balanced | ₹1,580/month | ₹2,218/month |
| Everything on | ₹6,347/month | ₹8,681/month |

Per-agent detail and editable assumptions are in the Lab's Crew budget tool.

## Weekly rhythm

- Tue + Thu evenings (2 h each): the current phase's next task.
- Saturday (4–5 h): the big build block, tested on the real tablet and phone.
- Sunday (1 h): Jeevo's Sunday review, update the Lab board, log decisions, clip the week's reel.
