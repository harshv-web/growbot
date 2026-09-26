# Jeevo: concept v2, personal edition

*27 Sep 2026 · Bengaluru · Harsh's own project, built evenings and weekends.*

## In one paragraph

Jeevo is a personal AI with one memory and many bodies. It lives in an old tablet at home (a face that listens, sees and talks), in your iPhone (Siri, Shortcuts, notifications, the phone that knows where you are and what you spent), in a keychain (NFC buttons, a "you forgot your keys" beacon, push-to-talk ears) and in a printed phone case (a dock key and a tap-card). An ESP32 "dock" gives the house senses and hands: radar presence, IR for the AC, lights, power-cut detection, and a motor that turns the tablet to look at you. A crew of specialist agents, each on the model that suits its job, listens, remembers, reflects on your life overnight, and plugs into the Bengaluru services you actually use: Namma Metro, Swiggy and Instamart, Alexa, UPI and bank SMS, WhatsApp and Telegram, and Claude and ChatGPT through an MCP connector.

## What changed since v1

v1 ("Jeevo Mission Control", 27 Sep) was a business plan: products, pricing, grants and investors. v2 is a personal project to build and show the world. Three things follow from that:

- **Use GrowBot freely.** The PolyForm Noncommercial licence allows personal use, so the walker body can run Brit's firmware and protocol as is. If this ever becomes a product, clean-room it first.
- **Your devices, not a market's.** The tablet and iPhone you own set the design. Every idea is judged on whether you can build it and use it daily.
- **Depth over breadth of SKUs.** The keychain and case stay, but as parts of your own system, not products.

Your note on 27 Sep ("listen, think about me, private, personalised, save everything around me, learn around me, advanced, dynamic, multi-agent, multi-model") adds four pillars:

1. **Ears and a lifelog.** Jeevo listens at home and, when you choose, through the pendant keychain. It keeps transcripts, sounds, places, money, orders and more as one searchable life log.
2. **A Model of Me.** It learns about you from what you tell it, what it observes, and what you do with its nudges. Every fact has evidence, a confidence and an off switch.
3. **A crew, not one bot.** Eleven agents (Jeevo, Scribe, Librarian, Dreamer, Chief of Staff, Concierge, Treasurer, Housekeeper, Guardian, Scout, Coach) share one memory and one writer.
4. **Many models.** A router picks the model per call by task, language, privacy tier, latency and the day's budget: Gemini Flash for live voice, Whisper on Cloudflare for cheap transcription, Sarvam for Kannada, Claude Sonnet 5 on the batch lane for the nightly dream, Apple's on-device model for your bank SMS, and plain rules wherever a rule is enough.

## Principles

1. **One writer.** Every device and agent proposes; only the Soul Core commits. There is never a second copy of you drifting apart (the GrowBot community hit exactly this).
2. **Senses stay local.** Voice detection, faces, sound events and SMS parsing run on the device. Only what's needed goes up.
3. **Reflexes before tokens.** If a rule can do it, no model runs.
4. **Humans pay, send and order.** Jeevo prepares; you tap.
5. **Every surface is optional.** Lose the keychain, the dock or the internet and the rest keeps working.
6. **Show your work.** Every action has a reason trace, every fact has evidence, everything is forgettable.
7. **Your language.** English, Hindi, Kannada and the mix you actually speak.
8. **Built in public.** Each phase ends in a demo worth posting.

## The cast

| Surface | Job | Always there? |
|---|---|---|
| Tablet | Home body: face, far-field ears, camera on demand, voice | Yes, plugged in |
| iPhone | Pocket presence: Siri, Shortcuts, push, NFC reader, location, SMS | With you |
| Keychain | NFC buttons → BLE beacon + buzzer → pendant ears | With you |
| Case | MagSafe dock key, NFC tap-card, camera shutter | With you |
| Dock | ESP32: radar, IR, lights, BLE scan, power sense, Swivel motor | Yes |
| Alexa | Ask Jeevo from any Echo; Jeevo announces through it | Rooms with an Echo |
| AI apps | Claude, ChatGPT, Gemini CLI read and write Jeevo's memory | Wherever you chat |
| Chat | Telegram or WhatsApp front door | Anywhere |
| Walker | The old phone on GrowBot legs | For play |

## What it will show the world

One demo per phase, each a reel:

1. "My old tablet woke up and spoke Kannada."
2. "I told the tablet. My phone remembered."
3. "My alarm briefed my tablet, and my keychain told me when to leave for the metro."
4. "Claude ordered my Jeevo grocery list on Instamart." · "Alexa, ask Jeevo…"
5. "It turned to look at me when I walked in." · "It counted my cooker's whistles."
6. "My keys texted me."
7. "The same soul, now with legs." · "What Jeevo learned about me in 30 days."

## Open questions for you

- Which tablet is it (make, model, Android or iPadOS version)? The Lab's Device Check answers most of this; save the report to the Archive.
- Which iPhone? An iPhone 15 Pro or later has the Action button and runs Apple's on-device model in Shortcuts.
- Do you have Echo devices, and which rooms?
- Which bank(s) and UPI app, for the SMS parser?
- Who else lives at home, and which languages do they use? This sets the listening mode and guest rules.
- Swiggy, Zomato or both?
- Keep the name "Jeevo"? Test it against "Jio" ads on TV before committing to it as a wake word.
