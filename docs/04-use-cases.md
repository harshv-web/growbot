# Use cases

<!-- Generated from site/src/data.js by site/build.mjs. Edit the data, not this file. -->

75 use cases. Status: Works today 45 · DIY hardware 15 · Workaround 3 · Experimental 10 · Waiting 2.

- **Works today**: Official APIs or built-in platform features.
- **DIY hardware**: Works once you build the part (ESP32, sensor, print).
- **Workaround**: No API: deep link, manual step or unofficial route.
- **Experimental**: Possible today but unproven or fragile. Prototype first.
- **Waiting**: Blocked on a platform or law that is announced but not here yet.

## Home

### Alarm-stopped morning brief

*Works today · P2 · 06:30 · Tablet, iPhone · crew: Chief of Staff, Jeevo*

**Trigger.** You stop your iPhone alarm. A Shortcuts automation posts a wake event to the Soul Core.

**What happens.** The tablet face wakes at low brightness and gives a 40-second brief in your language: rain window, AQI, first meeting, the metro to catch, bills due, one open promise from yesterday.

**Edge cases**

- Snooze isn't 'stopped': the automation fires only on Stop.
- Not at home (iPhone off home Wi-Fi): the brief arrives as a notification instead.
- Weekends and holidays get a lighter template (Karnataka holiday list + your calendar).
- Someone asleep in the room: quiet hours put the brief on the screen as text.

**Uses:** Shortcuts: Alarm, Open-Meteo, Google Calendar, Metro GTFS, Routes API

### Arrival handshake

*DIY hardware · P4 · 19:00 · iPhone, Dock, Tablet · crew: Housekeeper, Jeevo*

**Trigger.** Your iPhone joins home Wi-Fi and the dock's radar sees someone at the desk.

**What happens.** The Swivel turns to you, the face wakes, and Jeevo gives a three-line digest: what happened at home, what's arriving, what's due tonight. Lights go to the evening scene.

**Edge cases**

- Wi-Fi flaps at the gate: 3-minute debounce before 'arrived'.
- A guest walks in first: greet generically until your phone or face confirms.
- 1 am return: face only, no voice.
- On a call as you walk in (Work Focus): the digest waits.

**Uses:** Shortcuts: Wi-Fi, mmWave LD2410C, WiZ lights

### Leave-home sweep

*DIY hardware · P5 · 08:05 · Keychain, iPhone, Dock, Tablet · crew: Housekeeper, Chief of Staff*

**Trigger.** Tap the keychain on the NFC tag by the door, or leave home Wi-Fi.

**What happens.** Jeevo checks the house: AC still on (last IR command), rain later, anything the calendar says you need. It asks once on the iPhone and puts the tablet in away mode.

**Edge cases**

- IR is one-way, so 'AC on' is a guess: confirm with the room's temperature trend.
- Someone else still home (radar): switch nothing off.
- Accidental tap: undo within 60 seconds.
- Visitors' phones can read the door tag: it holds a URL that does nothing without your Shortcut.

**Uses:** NFC tag (NTAG215), Shortcuts: NFC, IR blaster, Open-Meteo

### Forgot-your-keys alert

*DIY hardware · P5 · Anytime · Keychain, Dock, iPhone · crew: Housekeeper*

**Trigger.** Your iPhone leaves home Wi-Fi while the dock can still hear the keychain's BLE beacon.

**What happens.** After 90 seconds of 'phone gone, keys still here', the iPhone says: your keys are still at home.

**Edge cases**

- Keys in a bag by the door sit at the Wi-Fi edge: RSSI threshold plus delay.
- Beacon battery: reported in the Sunday review.
- Beacon address randomisation: advertise a fixed custom ID.
- Spare keychain: every beacon has its own ID.

**Uses:** BLE beacon (nRF52840), ESP32 BLE scan

### Power-cut logger

*DIY hardware · P4 · Anytime · Tablet, Dock, iPhone · crew: Housekeeper*

**Trigger.** The tablet switches to battery and the mains-powered dock stops sending heartbeats.

**What happens.** Logs start and end, tells you if you're away, and keeps a monthly outage report you can quote to BESCOM (1912).

**Edge cases**

- Tablet unplugged but dock alive: not an outage.
- Put the dock on a non-inverter socket deliberately so it can sense cuts.
- Long cut: tablet drops to a low-power face early.
- Router without UPS: the Soul Core notices the silence instead.

**Uses:** Battery Status API (Chrome), ESP32 heartbeat

### AC and fan by the numbers

*DIY hardware · P4 · Night · Dock, Tablet, Alexa · crew: Housekeeper*

**Trigger.** You ask ('26 on the AC'), or a rule fires: you're home, it's 29°C and humid.

**What happens.** The dock's IR LED sends your AC's learned codes; at 1 am it moves to a sleep curve. IR fans (Atomberg and others) change speed the same way.

**Edge cases**

- IR can't read state: infer it from the temperature slope.
- Line of sight: the IR LED rides on the Swivel, which can turn to aim.
- After a power cut: resend the last state.
- Odd remote protocols: record your remote once to learn them.

**Uses:** IRremoteESP8266, AHT20 sensor

### Lights that follow the day

*DIY hardware · P4 · Evening · Dock, Tablet · crew: Housekeeper*

**Trigger.** Arrival, sitting at the desk, 11 pm wind-down, festival days.

**What happens.** Scenes switch through the dock, which speaks WiZ's UDP protocol and Tuya's LAN protocol directly.

**Edge cases**

- A web page can't send UDP: the ESP32 (or Termux on Android) does it.
- Tuya local keys need a one-time cloud pull.
- Bulbs are 2.4 GHz only; mesh routers with band steering confuse them.

**Uses:** WiZ local UDP, Tuya local (tinytuya)

### Household ledger

*Works today · P1 · Anytime · Tablet, iPhone, Chat · crew: Treasurer*

**Trigger.** 'Didi didn't come today', 'two extra milk packets', 'paid the paperwala'.

**What happens.** Entries land in a monthly ledger; on the 1st you get leaves, extras and dues, with UPI links to pay.

**Edge cases**

- Advances and half days.
- Festival bonus reminders (Diwali, Ugadi).
- Staff privacy: never record or learn their voices.
- Read the summary aloud to them in Hindi if you like.

**Uses:** UPI deep links

### Water motor timer

*Workaround · P3 · Day · Alexa, Keychain, iPhone · crew: Housekeeper*

**Trigger.** 'Motor on.'

**What happens.** A 25-minute timer. Alexa announces in the kitchen and the keychain buzzes; if you're out, the iPhone gets it.

**Edge cases**

- Power cut mid-run: the timer pauses with the outage log.
- Later: the Scribe listens for overflow sounds.

**Uses:** Voice Monkey

### Balcony plants

*DIY hardware · P6 · Day · Dock · crew: Housekeeper*

**Trigger.** Soil moisture drops below your threshold.

**What happens.** 'Water the tulsi', skipped when rain is forecast.

**Edge cases**

- Use capacitive sensors; resistive ones corrode within weeks.
- Monsoon: rain forecast suppresses reminders.

**Uses:** Capacitive soil sensor, Open-Meteo

### Ather charge manager

*DIY hardware · P4 · Night · Dock, iPhone · crew: Housekeeper, Treasurer*

**Trigger.** You plug the portable charger into an energy-monitoring smart plug at home.

**What happens.** Jeevo watches the plug's power draw: it knows when charging starts and when it tapers, can stop around 80% on normal days for battery health, charges fully before long rides on your calendar, and logs the rupees per charge from your BESCOM tariff.

**Edge cases**

- Estimating charge from power draw is approximate: calibrate against the dash once.
- Optional: the Ather app on the rooted Fire 7 lets Jeevo read its notifications (charge complete, theft alerts) — check Ather's terms first.
- Community reverse-engineered Ather APIs are unofficial: read-only at most, and your account is at risk.

**Uses:** Energy-monitoring smart plug, Ather app notifications (Fire 7, root)

## Listen

### Pressure-cooker whistle counter

*Experimental · P4 · Day · Tablet, Alexa, Keychain · crew: Scribe, Housekeeper*

**Trigger.** The Scribe hears a whistle in the kitchen.

**What happens.** It counts whistles and at your number ('3 for dal') Alexa or the tablet says: third whistle, turn off the gas.

**Edge cases**

- Two cookers, TV, the neighbour's cooker through the window: train on 20 clips of yours.
- Tablet in another room: a ₹400 kitchen mic node (ESP32 + INMP441).
- Unsure count: say the count with its confidence, never guess.

**Uses:** On-device sound classifier (YAMNet + your samples)

### Doorbell and knock relay

*Experimental · P4 · Anytime · Tablet, iPhone, Keychain, Alexa · crew: Scribe*

**Trigger.** A doorbell or knock while you're in the shower or on headphones.

**What happens.** Keychain buzz and 'someone's at the door' on the iPhone or kitchen Echo.

**Edge cases**

- TV doorbells: require the sound plus a radar change near the door.
- Delivery OTPs stay in your apps; Jeevo never reads OTPs.

**Uses:** On-device sound classifier

### What did they say?

*Experimental · P3 · Anytime · Tablet, iPhone, AI apps · crew: Librarian, Scribe*

**Trigger.** 'What did the electrician say about the MCB?'

**What happens.** The Librarian finds Tuesday's conversation, quotes the two lines, and links the transcript in the Soul Inspector.

**Edge cases**

- Others' words are Sensitive tier: summaries kept, raw text expires after 30 days.
- Needs 'Ambient · conversations' mode with the ring light on; 'Ambient · me' keeps only your side.
- Hinglish mix: routed to Sarvam or Gemini, not Whisper.

**Uses:** Scribe transcripts, Librarian search

### Promise keeper

*Experimental · P3 · Anytime · iPhone, Tablet · crew: Chief of Staff, Scribe*

**Trigger.** You say 'I'll send you the photos tonight' at home or into the pendant.

**What happens.** The Chief of Staff drafts a task with a deadline into 'Proposed'. One tap confirms; it nudges you at 9 pm.

**Edge cases**

- False positives: proposals only, never automatic tasks.
- Phone calls: iOS won't give a web app call audio; only what the tablet or pendant hears.

**Uses:** Scribe, Chief of Staff

### Day card and life log

*Works today · P3 · 03:00 · Tablet, iPhone · crew: Dreamer*

**Trigger.** The 03:00 dream.

**What happens.** A card per day: places, people, spend, what you said you'd do, highlights, and three things Jeevo learned about you, which you can correct.

**Edge cases**

- Days with little data are fine; the card says so.
- Your corrections outrank observations in the Model of Me.

**Uses:** Dreamer

### Ask my life

*Works today · P3 · Anytime · iPhone, AI apps, Tablet, Chat · crew: Librarian*

**Trigger.** 'How much did I spend on food in September?' 'When did I last go to Cubbon Park?' 'Who did I meet at the meetup?'

**What happens.** Answers from the lifelog with sources, in the Jeevo app, Telegram, or inside Claude through the connector.

**Edge cases**

- No source, no claim.
- Vault items need an on-device unlock first.

**Uses:** Jeevo MCP, Librarian

### Pocket ears (pendant keychain)

*Experimental · P5 · Anytime · Keychain · crew: Scribe*

**Trigger.** Hold the keychain button to capture; an optional ambient mode for long days.

**What happens.** Audio goes over BLE to the tablet at home, or is stored and synced later. The Scribe transcribes and files it.

**Edge cases**

- iOS web apps can't use Bluetooth: outside home you need store-and-forward or a small native app.
- Push-to-talk lasts days per charge; ambient lasts hours.
- In public, default to push-to-talk only.

**Uses:** XIAO nRF52840 Sense, Omi firmware (MIT)

### Voice diary and energy check

*Experimental · P6 · Night · Tablet, iPhone · crew: Coach*

**Trigger.** A 60-second voice note at night: how was today?

**What happens.** Kept as your diary; weekly trends of energy and sleep with no medical claims.

**Edge cases**

- Never diagnoses; suggests talking to someone only if you ask.
- Private tier, used for nothing else.

**Uses:** Scribe, Coach

## Commute

### Metro leave-now coach

*Works today · P2 · 08:10 · Keychain, iPhone, Tablet · crew: Concierge*

**Trigger.** Your usual leave window, or a calendar event that needs the metro.

**What happens.** Walk time plus next trains gives a keychain buzz at the right minute and 'next 3 trains' on the tablet while you get ready.

**Edge cases**

- Sunday first train 7:00; Mondays start earlier on Purple and Green (published timings; check BMRCL).
- Last trains: Purple/Green around 10:45–11:05 pm; Yellow's last from RV Road 11:55 pm. Jeevo warns you.
- Pink Line (Kalena Agrahara–Tavarekere) is opening: refresh the timetable when BMRCL publishes it.
- No realtime feed: disruptions come from you or the news, not an API.

**Uses:** Namma Metro GTFS, Routes API

### Ticket in one tap

*Workaround · P2 · Morning · iPhone · crew: Concierge*

**Trigger.** 'Ticket to MG Road.'

**What happens.** Opens BMRCL's WhatsApp chat or your ticket app; the fare lands in the ledger from the UPI SMS.

**Edge cases**

- No public ticketing API: Jeevo can't buy for you.
- Group or return tickets: say so in the request.

**Uses:** BMRCL WhatsApp bot, Namma Metro app, ONDC apps

### Rain plan B

*Works today · P2 · Evening · iPhone, Keychain · crew: Concierge*

**Trigger.** Heavy rain in your commute window and red traffic on your route.

**What happens.** 'Leave at 5:20, or take the 6:10 metro.' Cab apps open with the destination filled.

**Edge cases**

- No fare APIs (Uber's price estimates are restricted): times only.
- Known flooding spots: your own list of underpasses to avoid.

**Uses:** Open-Meteo, Routes API, Uber deep link

### Flights and trains

*Works today · P3 · Anytime · iPhone, Tablet · crew: Concierge*

**Trigger.** You forward an IndiGo, Air India or IRCTC e-ticket email.

**What happens.** A trip card, web check-in reminder, a leave-for-KIA time with a traffic buffer, and chart-preparation reminders for trains.

**Edge cases**

- No free official PNR API: link out.
- Changes: the newer email wins.

**Uses:** Cloudflare Email Workers

### Where I parked, and vehicle papers

*Works today · P2 · Anytime · iPhone, Keychain · crew: Concierge*

**Trigger.** Car Bluetooth disconnects, or you tap the NFC tag on your helmet.

**What happens.** Saves the spot. PUC, insurance and FASTag low-balance SMS become reminders.

**Edge cases**

- Basement with no GPS: say the floor.
- Two-wheeler without Bluetooth: the helmet tag.

**Uses:** Shortcuts: Bluetooth/CarPlay, NFC tag on helmet

### Ather ride mode

*Works today · P2 · Anytime · iPhone, Keychain, Case · crew: Concierge, Guardian*

**Trigger.** Your iPhone connects to the Ather dashboard over Bluetooth (or you tap the helmet tag).

**What happens.** Ride mode: notifications held, only turn-critical things spoken through your helmet headset, the Halo case shows 'riding', and on disconnect Jeevo saves where you parked and logs the trip.

**Edge cases**

- Never show anything on the keychain or case while moving; eyes on the road.
- Short stops at signals shouldn't end the ride: wait 3 minutes after disconnect.
- Pillion rider using your phone: ride mode keys off the dash connection, not the phone.

**Uses:** Shortcuts: Bluetooth (Ather dash), Helmet NFC tag

## Money

### Bank SMS → expense ledger

*Works today · P2 · Anytime · iPhone · crew: Treasurer, Guardian*

**Trigger.** A debit or credit SMS from your bank or UPI app.

**What happens.** On the phone, the Shortcut pulls amount, merchant and last four digits and sends only those. Weekly: 'Swiggy ₹3,400 this month.'

**Edge cases**

- OTP firewall: any SMS with OTP, one-time or verification code is dropped on the phone.
- Duplicate SMS from bank and UPI app.
- Refunds and reversals.
- UPI Lite sends no SMS: add by voice.
- Balances never leave the phone.

**Uses:** Shortcuts: Message trigger, Apple on-device model

### Bill radar

*Works today · P2 · Anytime · iPhone, Tablet · crew: Treasurer*

**Trigger.** BESCOM, broadband, postpaid, credit card, rent, SIP dates.

**What happens.** Reminder three days before; 'Pay' opens your UPI app with the amount; you enter the PIN.

**Edge cases**

- Jeevo never pays.
- UPI links behave differently per app on iOS: fallback is copying the UPI ID.
- Autopay mandates are marked so you don't pay twice.

**Uses:** SMS and email ingest, UPI deep links

### Split it

*Works today · P3 · Evening · Chat, iPhone · crew: Treasurer*

**Trigger.** 'Split ₹2,400 dinner with Rohan and Priya.'

**What happens.** Per-head amounts and UPI request links through the share sheet; incoming UPI credit SMS mark people paid.

**Edge cases**

- Uneven splits and tips.
- Friends without UPI.

**Uses:** Splitwise API, UPI links

### Subscription audit

*Works today · P3 · Monthly · Tablet · crew: Treasurer*

**Trigger.** First of the month.

**What happens.** All renewals (OTT, cloud storage, AI apps), the yearly total, and which ones you haven't used.

**Edge cases**

- Annual plans and price hikes.

**Uses:** Email ingest

### Agent wallet with a cap

*Waiting · P7 · Anytime · AI apps · crew: Treasurer, Guardian*

**Trigger.** When NPCI's agent-payment protocol and your bank support it.

**What happens.** A hard cap (say ₹500 a week), a merchant allowlist, and Guardian approval above ₹200.

**Edge cases**

- Until then every payment is a human tap.
- Use a separate small-balance wallet.

**Uses:** Swiggy Money via MCP, NPCI UPI Circle / Reserve Pay

## Food

### What's for dinner

*Works today · P3 · Evening · Tablet, AI apps · crew: Concierge, Jeevo*

**Trigger.** 'Cook or order?'

**What happens.** Weighs time, budget, what's in the kitchen, fasting days (Navratri, Ekadashi, Tuesday veg) and your dislikes. Ordering goes through Claude + Swiggy with your preferences attached.

**Edge cases**

- Festival and fasting dates move every year: computed, not copied.
- Late night: only kitchens still open.

**Uses:** Swiggy Food MCP (via Claude), Model of Me

### Kitchen stock → Instamart

*Works today · P3 · Anytime · Tablet, AI apps, iPhone · crew: Concierge*

**Trigger.** 'Atta khatam', 'we need milk', said anywhere.

**What happens.** Jeevo keeps the list. When you say 'order it', you ask Claude with the Jeevo and Instamart connectors: Claude reads the list, builds the cart, shows it, and orders only after your yes.

**Edge cases**

- Swiggy's MCP is cash on delivery (Swiggy Money added Sep 2026) and orders can't be cancelled: confirmation is mandatory.
- Swiggy doesn't permit third-party apps, so Jeevo never calls Swiggy itself; the AI app does.
- Keep the Swiggy app closed during the session (session conflicts).
- Out of stock: the list stores preferences ('Aashirvaad, 5 kg').

**Uses:** Swiggy Instamart MCP (via Claude), Jeevo MCP

### Recipe read aloud for the cook

*Works today · P1 · Morning · Tablet · crew: Coach*

**Trigger.** Your cook arrives.

**What happens.** The tablet reads today's recipe in Hindi, slowly, in katori and chamach measures.

**Edge cases**

- No Hindi voice on the device: Sarvam Bulbul v3.
- Camera off during staff hours.

**Uses:** Device TTS voices, Sarvam Bulbul v3

### Weekly menu and list

*Works today · P3 · Sunday · Tablet, AI apps · crew: Chief of Staff*

**Trigger.** Sunday review.

**What happens.** A seven-day menu from your favourites and the season; the list feeds the Instamart flow.

**Edge cases**

- Guests and fasting days change quantities.

**Uses:** Instamart flow

### Table booking

*Works today · P3 · Anytime · AI apps · crew: Concierge*

**Trigger.** 'Table for 4 near Indiranagar, Saturday 8 pm.'

**What happens.** Booked through Claude + Dineout; Jeevo adds it to the calendar and to the split later.

**Edge cases**

- The MCP supports free bookings only.

**Uses:** Swiggy Dineout MCP

## Work

### Desk focus buddy

*DIY hardware · P4 · Day · Tablet, Dock · crew: Coach*

**Trigger.** You sit down at the desk.

**What happens.** Pomodoro face, a 50-minute sitting nudge, water; silent during calendar meetings.

**Edge cases**

- Work confidentiality: Work Focus pauses ambient capture and memory.
- Calls: text only.

**Uses:** mmWave

### Thought capture anywhere

*Works today · P2 · Anytime · iPhone, Keychain, Tablet · crew: Scribe, Librarian*

**Trigger.** 'Hey Siri, tell Jeevo…', the Action button, or holding the keychain button.

**What happens.** Transcribed, tagged and filed; the evening digest sorts ideas, tasks and notes.

**Edge cases**

- Metro noise: the Scribe picks the model by language and noise.
- Accidental presses: hold-to-talk only.

**Uses:** Siri, Action button / Back Tap, Pendant push-to-talk

### Standup prep

*Works today · P2 · 09:50 · iPhone · crew: Chief of Staff*

**Trigger.** Weekdays at 09:50.

**What happens.** Three bullets from yesterday's captures, editable.

**Edge cases**

- Never pulls employer systems into the soul; only what you said.

**Uses:** Capture log

## People

### Family rhythm

*Works today · P3 · Weekly · iPhone, Tablet · crew: Chief of Staff*

**Trigger.** No call to Amma in five days; birthdays; anniversaries.

**What happens.** A gentle nudge at the time you usually call; birthdays by date, or by tithi for elders who follow it.

**Edge cases**

- Tithi dates move every year: computed, not copied.
- Relatives abroad: their time zones.

**Uses:** Calendar, Tithi calendar

### Voice notes to family

*Works today · P1 · Evening · Tablet · crew: Jeevo*

**Trigger.** 'Record a message for Mummy.'

**What happens.** Recorded on the tablet and handed to WhatsApp through the share sheet; you press send.

**Edge cases**

- An iPad works too, through Safari's share sheet.

**Uses:** Web Share, WhatsApp

### People memory

*Works today · P3 · Anytime · iPhone, AI apps · crew: Librarian*

**Trigger.** 'Rohan's daughter Anaya loves dinosaurs.'

**What happens.** Before you meet Rohan: when you last met, what you promised, what matters to him.

**Edge cases**

- Facts about other people are Sensitive tier and forgettable on request.

**Uses:** Model of Me

### Parents visiting mode

*Works today · P3 · Anytime · Tablet, Alexa · crew: Jeevo, Guardian*

**Trigger.** 'Parents are here till Sunday.'

**What happens.** Bigger text, slower Hindi voice, medicine reminders on Alexa, no face memory, one-tap 'call Harsh'.

**Edge cases**

- Ask them first, and turn it off together.

**Uses:** Hindi TTS, Voice Monkey

## Health

### Wind-down

*Works today · P2 · 22:45 · iPhone, Tablet, Alexa, Dock · crew: Housekeeper*

**Trigger.** Sleep Focus turns on.

**What happens.** Every surface goes quiet; the tablet dims to a clock; the AC moves to its sleep curve; Alexa goes to Do Not Disturb.

**Edge cases**

- Critical alerts (security, medicine) still get through.

**Uses:** Shortcuts: Sleep Focus

### Sit less, drink water

*DIY hardware · P4 · Day · Tablet, Keychain · crew: Coach*

**Trigger.** 90 minutes of continuous desk presence.

**What happens.** One nudge on the face; a keychain buzz if you ignore it twice.

**Edge cases**

- Learns which nudges you act on and drops the rest.

**Uses:** mmWave

### Medicine tap

*Works today · P2 · Anytime · Keychain, iPhone, Alexa · crew: Coach*

**Trigger.** Tap the pill-box tag with your phone.

**What happens.** Logs the dose; a missed dose gets one reminder; the parents' version runs on Alexa.

**Edge cases**

- Never gives medical advice; only your schedule.

**Uses:** NFC tag on the pill box

### Air, heat and dengue season

*Works today · P1 · Morning · Tablet, iPhone · crew: Chief of Staff*

**Trigger.** Daily.

**What happens.** Run or skip, mask or not; in the monsoon, a weekly 'check for stagnant water' reminder.

**Edge cases**

- Modelled AQI differs from nearby sensors: it says which it is.

**Uses:** Open-Meteo air quality

### Health digest

*Works today · P2 · Morning · iPhone · crew: Coach*

**Trigger.** A morning Shortcut reads steps and sleep.

**What happens.** Only summary numbers go to the soul; trends appear in the Sunday review.

**Edge cases**

- No raw Health export.

**Uses:** Apple Health via Shortcuts

## Mind

### Routine drift

*Experimental · P6 · Morning · iPhone, Keychain · crew: Chief of Staff*

**Trigger.** You usually leave by 8:10. It's 8:35 and you're still home.

**What happens.** 'Running late? Want a message to the team saying you'll join from the metro?' Drafted, not sent.

**Edge cases**

- Work-from-home days and holidays: learned from the calendar and weekday.
- One nudge, then it logs and stops.

**Uses:** Model of Me: routines

### Learned reflexes

*Experimental · P6 · Night · Tablet, Dock · crew: Dreamer, Housekeeper*

**Trigger.** The Dreamer notices 'good night' is followed by AC off and lights off, five nights running.

**What happens.** It proposes a reflex. Approve it once and it runs with no model call.

**Edge cases**

- Proposals only; you approve each reflex.
- Every reflex is listed and undoable in the Soul Inspector.

**Uses:** Dreamer, Reflex table

### One memory in every AI

*Works today · P3 · Anytime · AI apps · crew: Librarian, Guardian*

**Trigger.** You're chatting in Claude, ChatGPT or Claude Code.

**What happens.** They call Jeevo's MCP tools (recall, remember, today, lists, people), so your context follows you between AIs.

**Edge cases**

- Claude's free plan allows one custom connector.
- The MCP server must be public: OAuth, per-tool scopes, and confirmation on write tools.
- Other tools' output can carry prompt injections: the Guardian screens writes.

**Uses:** Jeevo MCP, Claude connectors, ChatGPT developer mode, Gemini CLI

### Import your AI past

*Works today · P3 · Once · AI apps, Tablet · crew: Librarian*

**Trigger.** You upload your ChatGPT and Claude exports.

**What happens.** The Librarian extracts candidate facts into a review queue. Nothing is accepted without you.

**Edge cases**

- Old facts are dated and down-weighted.
- Big exports run in batches overnight.

**Uses:** ChatGPT / Claude data exports

### Save anything from the share sheet

*Works today · P2 · Anytime · iPhone · crew: Librarian*

**Trigger.** Share a link, reel, post or screenshot to 'Jeevo'.

**What happens.** Summarised, tagged and linked to related notes; a Saturday digest of what you saved.

**Edge cases**

- Instagram pages often can't be read: add a line of your own.

**Uses:** Shortcuts share sheet

### Email as the Indian API

*Works today · P3 · Anytime · Tablet · crew: Librarian, Guardian*

**Trigger.** Forwarding rules send Swiggy, Amazon, IRCTC, airline, bill and statement emails to your Jeevo address.

**What happens.** Parsed into orders, trips, bills and statements.

**Edge cases**

- Password-protected PDF statements: skip, or unlock on your device.
- Emails can carry prompt injections: parsed as data only.
- Heavy parsing can exceed the free Workers CPU limit.

**Uses:** Cloudflare Email Routing + Email Workers

### Research runs

*Works today · P0 · Anytime · AI apps · crew: Scout*

**Trigger.** 'Research the best mmWave sensor for this.'

**What happens.** The Scout runs it in Claude and files the result in the Lab archive with dated sources.

**Edge cases**

- Research older than 90 days is flagged as stale.

**Uses:** Claude with web search, Lab archive

### Things I noticed about you

*Experimental · P6 · Sunday · Tablet · crew: Dreamer*

**Trigger.** Sunday review.

**What happens.** 'Late Swiggy orders came before 3 of your 4 worst-sleep nights.' Each pattern shows its evidence; keep, tweak or dismiss it.

**Edge cases**

- Correlation, not cause: phrased as a question.
- Small samples are flagged as weak.

**Uses:** Dreamer

## Voice

### Chat front door

*Works today · P1 · Anytime · Chat · crew: Jeevo*

**Trigger.** Message Jeevo on Telegram or WhatsApp.

**What happens.** Same soul, same memory; voice notes are transcribed.

**Edge cases**

- WhatsApp needs a Meta business setup and a separate number; service replies are free up to 1,000 a month per number from 1 Oct 2026, then ₹0.115 each.
- Telegram is free and quicker to set up.

**Uses:** Telegram Bot API, WhatsApp Cloud API

### Ask Jeevo from any Echo

*Works today · P3 · Anytime · Alexa · crew: Jeevo*

**Trigger.** 'Alexa, ask Jeevo what's pending today.'

**What happens.** The skill calls the Soul Core and Jeevo answers through Alexa in English or Hindi.

**Edge cases**

- Alexa waits only a few seconds: a fast path with cached answers.
- The skill stays in development mode on your account; no certification.

**Uses:** Alexa custom skill (dev mode)

### Jeevo speaks through Alexa

*Workaround · P3 · Anytime · Alexa · crew: Jeevo*

**Trigger.** An announcement routed to the room you're in.

**What happens.** Voice Monkey triggers an Alexa announcement or routine.

**Edge cases**

- Echo Do Not Disturb at night.
- Third-party relay: keep private details out of announcements.

**Uses:** Voice Monkey API

### Alexa+ bridge

*Waiting · P7 · Later · Alexa · crew: Jeevo*

**Trigger.** When Alexa+'s MCP Toolkit reaches India.

**What happens.** Connect Jeevo's MCP so Alexa+ can read your lists and memory directly.

**Edge cases**

- The toolkit is US-only today. Alexa+ launched in India in early access on 16 Sep 2026.

**Uses:** Alexa+ MCP Toolkit

## Play

### It turns to look at you

*DIY hardware · P4 · Anytime · Dock, Tablet · crew: Housekeeper, Jeevo*

**Trigger.** A face appears or someone speaks.

**What happens.** The Swivel pans to keep you centred; the on-screen eyes do the rest.

**Edge cases**

- Several people: follow whoever spoke last.
- The camera wakes only when the radar says someone's there.

**Uses:** MediaPipe face detection (on-device)

### Soul moves into a walker

*DIY hardware · P6 · Anytime · Walker · crew: Jeevo*

**Trigger.** 'Jeevo, go into the walker.'

**What happens.** The same memory drives an old phone on GrowBot-style legs.

**Edge cases**

- GrowBot code is PolyForm Noncommercial: fine for personal use.
- Weak AA cells brown out the Pico; fake 360° servos never stop.

**Uses:** GrowBot body protocol, Pico 2 W

### Two Jeevos meet

*Works today · P6 · Anytime · Tablet, iPhone · crew: Jeevo*

**Trigger.** Tablet and phone presences face each other.

**What happens.** One soul in two bodies talks to itself, or you spawn a sibling soul for a demo.

**Edge cases**

- One soul, two bodies: only the Soul Core writes memory.

**Uses:** Soul Core

### Cricket buddy

*Experimental · P6 · Evening · Tablet, Alexa · crew: Jeevo*

**Trigger.** An India or RCB match is on.

**What happens.** Reacts to wickets, argues about DRS, and tells the kitchen Echo when a wicket falls.

**Edge cases**

- Delayed streams: a spoiler delay setting.
- Free score APIs have daily limits; check their terms.

**Uses:** Cricket score API

### Festival modes

*DIY hardware · P6 · Seasonal · Tablet, Dock · crew: Housekeeper*

**Trigger.** Diwali, Ganesh Chaturthi, Ugadi, Onam.

**What happens.** Lights, greetings in Hindi, a rangoli judge on camera.

**Edge cases**

- Dates shift every year: computed.

**Uses:** WiZ

### Case tap-card

*Works today · P5 · Anytime · Case · crew: Guardian*

**Trigger.** A friend taps their phone on your case.

**What happens.** Opens a page that shows what your current mode allows: UPI QR at dinner, Instagram at meetups, Wi-Fi at home.

**Edge cases**

- The tag holds only a URL; what it shows changes on the server.
- Lock the tag so nobody can rewrite it.

**Uses:** NTAG215, Soul Core

## Guard

### Guest mode

*Works today · P1 · Anytime · Tablet, Case · crew: Guardian*

**Trigger.** 'Guest mode', or unknown faces for 10 minutes.

**What happens.** No memory formation, camera off, and guests can tap your case for the Wi-Fi password.

**Edge cases**

- Exits when the radar count drops and you confirm.

**Uses:** NFC case tag

### Privacy switch

*DIY hardware · P4 · Anytime · Dock, Tablet, Keychain · crew: Guardian*

**Trigger.** Flip the dock switch or tap the privacy tag.

**What happens.** Mic and camera stop on every presence, the ring light goes dark, and the log records the gap.

**Edge cases**

- A tablet's mic can't be cut in hardware: a physical camera shutter plus an app-level stop, shown honestly.

**Uses:** NFC privacy tag

### Forget that

*Works today · P1 · Anytime · Tablet, iPhone · crew: Librarian, Guardian*

**Trigger.** 'Forget the last 10 minutes' or 'forget everything about X'.

**What happens.** Deletes events, transcripts and derived facts, and records only that a deletion happened.

**Edge cases**

- Backups: the deletion carries into the next nightly export.

**Uses:** Librarian, Guardian

### Why did you do that?

*Works today · P1 · Anytime · Tablet, iPhone · crew: Guardian*

**Trigger.** Any action.

**What happens.** Every action carries a reason trace: trigger, agent, model, evidence, approvals.

**Uses:** Audit log

### Battery guardian

*DIY hardware · P0 · Anytime · Tablet, Dock · crew: Guardian, Housekeeper*

**Trigger.** Tablet charge above 80% or temperature above 40°C.

**What happens.** The plug switches off at 80% and on at 40%; camera and brightness drop when hot; a monthly 'check for swelling' reminder.

**Edge cases**

- A GrowBot builder's old Galaxy S9 battery swelled from constant sensor use.
- Samsung's 'Protect battery' (85% cap) where available.

**Uses:** Smart plug, Termux:API battery temperature

## Sync

### Internet down

*Works today · P7 · Anytime · Tablet · crew: Jeevo*

**Trigger.** ISP outage.

**What happens.** Clock, timers, reflexes, the cached brief and the ledger keep working; events queue and sync later.

**Edge cases**

- Browser speech recognition needs the network: tap UI while offline.

**Uses:** Local reflexes

### Handoff between devices

*Works today · P1 · Anytime · Tablet, iPhone · crew: Jeevo*

**Trigger.** You walk out mid-conversation.

**What happens.** The thread continues on the iPhone; the tablet shows 'continued on phone'.

**Uses:** Soul Core presence

### Split-brain-safe sync

*Works today · P1 · Anytime · Tablet, iPhone · crew: Librarian*

**Trigger.** Two devices edit memory while offline.

**What happens.** Events merge by hybrid logical clock; conflicting facts go to review instead of silently overwriting.

**Edge cases**

- The GrowBot community once had two copies of the same creature running at once.

**Uses:** Hybrid logical clock event log

### Soul backup and restore

*Works today · P1 · Nightly · Tablet · crew: Librarian*

**Trigger.** Nightly.

**What happens.** An encrypted export; restore on a new device by scanning a QR code.

**Edge cases**

- The vault stays encrypted with your passphrase; lose it and the vault is gone.

**Uses:** R2 or iCloud Drive export

### Presence-aware routing

*Works today · P2 · Anytime · Tablet, iPhone, Keychain, Alexa · crew: Jeevo, Chief of Staff*

**Trigger.** Any message.

**What happens.** Picks the surface by where you are, Focus, urgency, privacy and who's around, and learns from what you act on.

**Edge cases**

- A daily interruption budget; everything else goes to the digest.

**Uses:** Attention router

