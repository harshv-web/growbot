# Research log

## 27 Sep 2026: GrowBot Discord, what matters for Jeevo

Source: the full export of the GrowBot Discord (14,390 messages, 20 channels and 39 threads, 22 May to 26 Sep 2026), searched by keyword and read in context.

**Identity and sync**

- Souls are tied to one browser. Brit (20 Jun): "No hardware ID; it saves a random id in browser local storage, so Safari and Firefox each have their own creature." Still true on 22 Sep ("they are still browser bound"); moving needs Settings → "move me". → Jeevo keeps the soul server-side with one writer, and devices are presences.
- Two copies of the same soul ran at once after a soul-file mix-up (jaytay579, 28 Aug). → single-writer Soul Core; conflicts go to review.
- Unnamed soul backups got lost in a pile of files (jaytay579, 15 Aug). → named, dated nightly exports.
- "Watch links" let Brit read a creature's logs remotely (Aug–Sep). → the Soul Inspector and reason traces.

**iPhone specifics**

- In-app browsers block camera and mic prompts; open in real Safari (Brit, 22 Jul).
- Safari remembers a past "no": Settings → Safari → Camera & Microphone (Brit, 24 Jul).
- The ringer switch silences speech on iOS (Brit, 23 Jul).
- The mic isn't released when switching tabs until Safari is force-quit (jaytay579, 24 Jul).
- iPhone 7 on iOS 15.8 had audio glitches and hung at first sleep; an iPhone SE 2 on iOS 26.5 ran "pretty flawlessly" (Braydar, 27 Jul).
- Vibration doesn't work from the web on iOS (Brit, 9 Sep). → haptics come from the keychain, not the phone.

**Heat and batteries**

- "Very cool but it's making my iPhone 15 overheat" (14 Jun).
- An old Galaxy S9's battery swelled from constant sensor use (Aminer, 16 Aug). Brit: this confirms "we can't hack the phone battery to run the servos".
- No thermal throttling in the app (25 Aug); a low-power mode followed (Sep). → Jeevo's battery guardian and radar-gated camera.

**Listening**

- Brit (25 Jun): agrees it should be "always listening", experimenting with "wake word or contextual listen"; two kinds of listening: raw audio and transcription.
- JGC (30 Jun): proposes "attention modes", a low-attention state like "a cat sleeping lightly" that wakes on wake words or big changes. → Jeevo's listening modes.
- Names get misheard: "Chirin" became "Kieran" and "Karen" (JGC, 7 Aug). → test "Jeevo" against "Jio".
- New ear (30 Aug): adaptive noise floor, speech vs sound, audio sent natively to Gemini; dropped words in quiet rooms were still the weak spot (1 Sep).

**Memory and vision**

- Visual memory (live 18 Sep): stores descriptions, no cloud storage by design; Gemini Flash 2.5 for vision; Brit wants memories to fade into embeddings over time. → the Librarian's decay.
- Face tracking went live in the agent on 26 Sep, at quiet, conversational and engaged energy levels.

**Community ideas worth borrowing**

- An old Echo Show 5 as a robot head (4 Jul).
- A 7–9B local model running a smart home, with the robot as its body to "go look" (29 Jul).
- Phone overheating fixes: vent slots in the printed case (13 Aug).
- Glass-back phones defeat adhesives (28 Jul). → a proper case and dock key.
- Mesh routers (Deco XE75) and 2.4 GHz confusion (Aug). → a dedicated 2.4 GHz device network.

## 26 Sep 2026: GrowBot Field Brief (summary)

The earlier brief covers Brit Cruise's GrowBot: phone brain, Pico 2 W and two MG90S servos, about $30–43 in parts; hosted brain on Gemini 3.8 Flash via OpenRouter; soul format with constitution, identity (written only by the nightly dream, one sentence per sleep), working memory, episodic log with "glow" moments, reflexes and body truth; the six-message body contract over a Cloudflare relay with no auth; the 10 Sep pivot from pretrained walk policies to learned movement; licence PolyForm Noncommercial (code) and CC BY-NC (hardware). For Jeevo: reuse the soul structure ideas, the body contract, and the walker for personal use.

## 27 Sep 2026: Jeevo Mission Control (v1, archived)

A business plan (Soul Case, Soul Key, Walker kit, Neck Dock, Pocket Buddy; Brain Pass; schools; grants). Superseded by this personal edition. Still useful from it: India component prices (Robu, Sep 2026: ESP32-C3 SuperMini ₹269, MG90S ₹269, Pico 2 W ₹729), the idea of the case as the robot's spine, Sarvam pricing, and the risk list.

## 27 Sep 2026: Integration research

Summary in `05-integrations.md`. Headline findings:

- Swiggy runs official MCP servers for Food, Instamart and Dineout (cash on delivery; Swiggy Money added Sep 2026; no third-party apps; orders can't be cancelled). Zomato has an MCP server; Zepto only a test; Blinkit nothing.
- Alexa+ launched in India on 16 Sep 2026 (early access, Hindi and Hinglish, free with Prime afterwards, ₹2,000/month otherwise). Its MCP Toolkit is US-only.
- NPCI is building agent payments on UPI Circle and Reserve Pay; not yet for individuals.
- BMRCL and BMTC publish GTFS; no realtime or ticketing API. Tickets via BMRCL's WhatsApp bot, the app and nine ONDC apps.
- WhatsApp Cloud API: from 1 Oct 2026, 1,000 free service messages a month per number, then ₹0.115.
- Workers AI Whisper large-v3-turbo costs $0.00051 per minute, and the 10,000 free daily neurons cover about 3.5 hours; bge-m3 embeddings cost $0.01 per M tokens.
- iOS web apps get Web Push but no Bluetooth, NFC or background audio.
- DPDP Act s.3(c)(i): personal or domestic processing by an individual is out of scope.

## Sources

See `05-integrations.md` for per-row links and the Lab site's Sources list.
