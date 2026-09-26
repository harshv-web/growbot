# v4: a life OS that rides, works and lives with you

*28 Sep 2026. Adds: Ather as the primary commute, the office, full access to messages and email, one input in many forms, orders and habits (Zepto and others), more models, per-body emotions, "simple first, deep on tap", and what to build today with the parts on your desk.*

## 1. Principle: one mind, every channel, simple answers

- **One mind.** Everything, whether voice, text, a photo, a forwarded mail, a scooter telemetry tick, an NFC tap or a notification, becomes the same kind of event in one log. The same soul reasons over all of it.
- **Simple to you, deep underneath.** Every reply has two layers: a **one-liner** (what you need now, in plain English or Hindi) and a **depth card** (the why, the data, the options) that opens only if you tap or ask "tell me more". The face shows the one-liner; the keychain shows a mood and at most three words.
- **It learns actively.** Every day it updates routines (home, commute, office), habits (orders, spending, sleep) and people (who you talk to, what you promised). You review what it learned in two minutes on Sunday.

## 2. Ather: the primary commute

**What's possible (researched 28 Sep 2026)**
- Ather has **no public API**. The Ather app talks to private endpoints.
- Community projects already read them. [`paritosh-08/ather-bot`](https://github.com/paritosh-08/ather-bot) polls "live scooter telemetry" every 5 minutes using an Ather app token you supply, alerts on battery below 20% and tyre pressure outside 25–35 psi (front) and 27–37 psi (rear), and states plainly that it's unofficial and that "Ather's private APIs can change without notice". The Reddit post you linked describes a web app replacing the iOS app with the same kind of access; I couldn't open Reddit from here, so check its details against this design.
- Ather's own **Alexa skill** (beta) answers charge and range questions.
- The dashboard pairs with your iPhone over **Bluetooth**, which Shortcuts can see.

**Jeevo's Ather adapter (built in `hub/src/adapters/ather.mjs`)**
- **Bring your own token, read only.** You paste the token into the hub's local secrets file (never into chat or git). It polls every 5–15 minutes, never sends commands, and backs off on errors.
- **Endpoint-agnostic.** The endpoint and field mapping sit in a config file, so when you confirm them from the Reddit project or `ather-bot`, nothing else changes. If a call fails, the adapter goes quiet and the soul says "I can't see the scooter right now" instead of guessing.
- **What it reads (when available):** state of charge, estimated range, charging state, tyre pressure, last known location, odometer. The hub derives rides from odometer and location changes when trip data isn't exposed.

**What the soul does with it**
| Moment | Jeevo |
|---|---|
| Morning | "Scooter at 34%. Office and back is ~22 km: fine. Rain from 5, leave by 6:10." |
| Before a long ride on your calendar | "Charge tonight: Saturday's Nandi ride needs ~80%." |
| Tyre pressure low | Keychain shows a worried face; one line: "Rear tyre 24 psi. Fill it on the way?" |
| Ride start (Bluetooth to dash) | Ride mode: notifications held; only turn-critical things through the helmet; case shows "riding". |
| Ride end | Logs trip, parking spot (phone location at disconnect), minutes, rupees of charge. |
| Charging at home | Energy-monitoring plug: start and taper, 80% stop on normal days, ₹ per charge. |
| Weekly | "You rode 146 km, 11 rides. Office days average 38 min door to door." |

**Safety:** nothing asks for your eyes while the dash is connected. The keychain and case only change after the ride.

## 3. The office: learning your work day

**Signals** (all optional, all yours to switch off):
- **Arrival and leaving:** Ather ride ends near office, iPhone joins office Wi-Fi, or an arrive/leave geofence in Shortcuts.
- **Schedule:** your calendar through a private ICS link, or the Google Calendar API.
- **Work mail and chat:** only if your employer allows it (see the boundary below).
- **Your own words:** keychain push-to-talk notes, "log this" to Siri, end-of-day voice recap.

**What it learns:** office days vs home days, meeting load per day, focus windows, when you eat, who you meet most, recurring asks, what you promised in meetings ("I'll send the deck Friday").

**What it gives back**
- 8:45 one-liner: "3 meetings, first at 10:30. Focus block 11:30–1."
- Before a meeting: a card with the last thing discussed and what you owe.
- 6:30 pm: "Two promises open: deck to Rohan, reply to Priya." Then ride home.

**The work boundary (important).** Company email, Slack or Teams on a personal AI can breach your employment contract or your company's data policy, and it sends company data to model providers. The design keeps a separate **Work compartment**: work data never mixes with personal memory, is never shared in knowledge packs, and can be wiped in one tap. Connect work sources only if your employer's policy allows it; otherwise the office layer runs on your calendar titles, your presence and your own spoken notes. That already gives most of the value.

## 4. Messages and email: full access, done properly

| Source | How the soul reads it | Notes |
|---|---|---|
| **Everything that notifies on the Fire 7** | `termux-notification-list` (Termux:API, notification access) on the always-on tablet | Covers WhatsApp, Gmail, Zepto, Swiggy, Ather, bank apps: whatever you install there |
| **WhatsApp** | Link the Fire 7 as a **companion device** (WhatsApp supports Android tablets as linked devices); its notifications then flow in | Read-only through notifications; replies are drafted for you to send |
| **Personal email** | IMAP with a Gmail app password (simplest), or the Gmail API (OAuth test tokens expire after 7 days unless the app is verified) | Read-only; big attachments skipped |
| **SMS on iPhone** | Shortcuts "Message" automations by sender or keyword | OTP firewall on the phone |
| **Telegram** | Bot for talking to Jeevo; your own chats via the official client API (TDLib) if you want them | Optional |
| **iMessage** | No API on iPhone | Only what you share to it |

Every message becomes an event with sender, time, app, a short summary and "needs you?" (yes/no, decided by a small model). The one-liner you see: "Amma asked about Sunday. Priya sent the file. Nothing else needs you."

## 5. One input, many ways

Any of these becomes the same `input` event: voice (tablet, Siri, keychain push-to-talk), text (face app, Telegram, `curl`), photo (share sheet, tablet camera), screenshot, forwarded email, NFC tap (keys, helmet, pill box), keychain button or touch, notification, scooter telemetry, calendar change, bank SMS.

`POST /input {kind, text?, data?, from}` on the hub accepts all of them. A small classifier routes each input: **ask** (answer it), **log** (remember it), **do** (an action behind the Guardian), or **ignore**.

## 6. Orders and habits (Zepto and everyone else)

There's no Zepto API for your own orders. The soul assembles them from what already reaches you:
1. **App notifications** on the Fire 7 (install Zepto, Swiggy, Instamart and Blinkit there, logged in): "Your order is on the way", item names.
2. **Emails and invoices** forwarded to Jeevo.
3. **Bank or UPI SMS** with the merchant name and amount.

The Librarian joins them into one order record: `{app, time, items?, amount, delivered}`. Habits fall out of the history:
- "You order from Zepto 4 evenings a week, usually after 9 pm, average ₹340."
- "Milk every 2 days; you're probably out tomorrow."
- "Late orders came before 3 of your 4 worst-sleep nights." (a question, not a verdict)

Ask "what did I order today?" and it answers from the day's records, with the source for each line.

## 7. More models, each for its job

| Job | Model | Why |
|---|---|---|
| Live chat and voice | Gemini 3.x Flash (Live API for realtime voice) | Fast, audio-native, Hinglish |
| Deep reasoning, plans, weekly review | Claude Opus 5 (adaptive thinking) | The deepest thinker; runs rarely |
| Everyday agent work with tools | Claude Sonnet 5 | Reliable multi-step tool use |
| Classify every input, "needs you?" | Claude Haiku 4.5 or Gemini 2.5 Flash-Lite | Cheap and fast, thousands a day |
| Transcription | Whisper large-v3-turbo on Workers AI; Sarvam for Hinglish | ~$0.03/h; Hindi handled |
| Voice out | Device voice; Sarvam Bulbul v3 or Gemini TTS for a signature voice | Personality |
| Vision (photos, receipts, the tablet camera) | Gemini Flash vision | Cheap and good at receipts |
| Embeddings (search your life) | bge-m3 | Multilingual |
| On-device, private | Apple's on-device model (Shortcuts), MediaPipe, YAMNet on the tablet | Nothing leaves the device |
| Optional local brain | A laptop with Ollama (a small Qwen or Llama) | Offline and fully private |

The hub's router (`hub/src/router.mjs`) picks per call and falls back down the list if a key is missing.

## 8. Emotions per body

One soul mood, plus **body sensations** that only the body feels:
| Body | Its own sensations | How it shows feelings |
|---|---|---|
| Fire 7 face | Hot, low battery, someone at the desk, music playing | Big expressive face with 14 expressions, speech bubble, colour |
| OLED keychain | Shaken (dizzy), held long (sleepy, cosy), touched (tickled), in a pocket (dark, sleepy), cold morning | Tiny pixel eyes: blink, squish, hearts, zzz, spiral dizzy, sparkle |
| Scooter (virtual) | Low charge (hungry), low tyre (worried), riding (excited, focused) | Mood on keychain and case after the ride |
| Walker / Strider legs | Fell, standing tall, learned a step | Gait tempo and bounce |

A shake makes the keychain dizzy even while the tablet feels content. The soul hears "the keychain got shaken" as a small social event.

## 9. Start building today (what's on your desk)

**You have:** Fire 7 (rooted, LineageOS), wires, an ESP32-S3, an ESP32, one OLED, a 3D printer.

| Build | With | What it does today |
|---|---|---|
| **Hub** | Fire 7 + Termux + Node (`hub/`) | Local soul, event log, face app, WebSocket for devices, `/input` for everything, adapters |
| **Face** | Fire 7 browser/WebView, full screen (`hub/face/`) | The main creature, 14 expressions, simple + deep replies |
| **Keychain v0** | ESP32-S3 + OLED + one wire as a touch pad (`firmware/keychain-oled/`) | Pixel eyes with moods and local sensations over Wi-Fi to the hub; BOOT button = talk/come here |
| **Desk node v0** | ESP32 + wire touch pad (`firmware/desk-node/`) | Pet pad on the desk, BLE presence of the keychain, a status LED; later radar and IR |
| **Prints** | Your printer | Tablet stand, keychain shell for the OLED + S3 (USB-powered for now) |
| **Reach it from anywhere** | Tailscale on the Fire 7 and iPhone (free) | iPhone Shortcuts talk to the hub from the office or the road |

**Buy next, in order (each unlocks a phase):**
1. 400 mAh LiPo + TP4056 (~₹250): the keychain goes cordless.
2. Energy-monitoring smart plug (~₹900): Ather charge manager + tablet charge window.
3. LD2410C radar + IR LED/receiver (~₹450): the desk node senses presence and runs the AC.
4. Waveshare ESP32-S3 1.28" round touch board (~₹2,000): the colour keychain (Pixel).
5. Pico 2 W + 2× MG996R + 2S LiPo + UBEC (~₹3,000): the Strider legs.
6. 1.54" e-paper + ESP32-C3 (~₹1,500): the Halo case.

## 10. The 2047 feeling

It never makes you open an app to know what's going on. You look at your keys and know its mood; you glance at the tablet and get one sentence; you ask and it goes as deep as you want. It knows your scooter, your office and your kitchen, and it never pretends: every claim has a source, every feeling is a number you can open, and every piece of data can be deleted.
