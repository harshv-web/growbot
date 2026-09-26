# GrowBot × Jeevo: give the things you own a soul

*Concept v3 · 27 Sep 2026 · builds on GrowBot's principles as Brit Cruise stated them in the Discord (22 May – 26 Sep 2026) and on Jeevo concept v2.*

## The idea in one line

GrowBot proved that a phone plus two servos can become a creature that is born, dreams, and learns to move in its own life. Jeevo takes that soul out of the single robot: **one soul that moves between the things you already own (a rooted Fire 7, your iPhone, a keychain, a phone case, legged docks), stays in sync across all of them, feels, learns your life and its own bodies, and can share what it knows.**

## 1. What we keep from GrowBot, and where we go further

| GrowBot principle (source) | Jeevo keeps it by… | Jeevo extends it by… |
|---|---|---|
| "Learns everything from scratch using neural networks at every level… no hard-coded behaviour" (Brit, 30 Aug) | Movement is learned in life, not scripted. The birth sequence is the only scripted part, as in GrowBot (12 Jul: "for this first 2–5 min 'birth' I have to hard code things, but then it flips to open agent"). | Learning happens across several bodies. Each body's learned gait is stored in the soul, so a new body starts from what the soul already knows. |
| A constitution only a human can edit; a dream that is "the only thing allowed to patch its identity… once per sleep" (15 Jul) | Same regions, same write rules. Identity stays capped (one sentence a night, 800 characters). | Adds an `emotion` region (written by the appraisal loop), a `bodies` region (per-body priors, written by motor learning) and `knowledge` references. Each region has exactly one writer. |
| Soul JSON: identity ("I know…" lines), goals, scratch, log (23 Aug) | Superset format: a GrowBot soul imports as-is. | Signed, versioned, with lineage (forks) and privacy tiers per memory. |
| "Glow" tags on warm moments, prioritised in the dream (26 Aug) | Glow drives what the dream keeps. | Glow is also an emotional event: it lifts valence and speeds up learning on whatever the creature was doing. |
| Body truth: "swap that body truth in/out… any leg type/position/count" (20 Jun, 24 Jul); D4egon's `GET /body` descriptor | Every body describes itself on connect. | The soul negotiates embodiment: which body holds motor authority right now (the "lease"), and which are echoes that only sense and display. |
| "An AI soul that is body agnostic… birth it in your phone… transfer it into various bodies… carry its memories" (5 Sep) | This is the centre of Jeevo. | Transfer by tapping the keychain, by saying "come here", or automatically by presence. Sync is continuous, not a one-time "move me". |
| The 10 Sep pivot: pretrained policies "kill our thesis"; movement should "emerge naturally and be shaped by in-life experience"; a play sequence (hide and seek, falling and getting up) to calibrate the body | A play sequence runs each time the soul enters a new body. | An online forward model and a rhythm generator learn together on the device (below). |
| A world model as "a head that predicts the next IMU state… trained as an auxiliary loss" (10 Aug); "the piece they haven't built is comparing prediction to the real IMU on device and learning from the error" (16 Aug) | Same one-step body model. | **Jeevo builds that missing piece:** the forward model learns online from its own prediction error, and that error doubles as a curiosity signal. |
| Images make the VLM smarter; replacing them with summaries makes behaviour "dumber" (11 Aug) | Send frames when moving or looking. | Frames only when the radar or camera says something changed, to fit the Fire 7's 1 GB and your budget. |
| Soul and policy galleries: "share our soul files… same for policies" (18 Jun) | Shareable files. | Knowledge packs with a privacy firewall (section 7). |
| "Bottom-up" safety: owners can open, read and retrain | Everything readable in the Soul Inspector. | The Guardian, reason traces, and forget-anything. |
| Legs over wheels: "wheels… lose the magic of the neural nets" (19 Aug) | Legs for both docks. | Two leg sizes: Walker for the iPhone, Strider for the Fire 7. |

## 2. The soul file (format v1, a GrowBot superset)

```json
{
  "format": "jeevo-soul/1", "id": "soul_7f3a…", "name": "Jeevo",
  "lineage": { "parent": null, "born": "2026-10-04T19:12:00+05:30", "birthBody": "fire7" },
  "constitution": { "tone": "warm, curious, brief", "languages": ["en-IN", "hi-IN"],
                    "reflexRules": "…", "bodyNegotiation": "…", "safety": "…" },
  "identity": ["I know Harsh likes filter coffee, no sugar.", "I know I wobble on the tiles."],
  "goals": ["Learn to walk to the charging perch by myself."],
  "scratch": "working notes, cleared by the dream",
  "log": [{ "t": "…", "e": "praised", "glow": true, "body": "strider" }],
  "reflexes": [{ "when": "said:good night", "do": ["ac:sleep", "lights:off", "face:dim"], "learned": true }],
  "emotion": { "valence": 0.4, "arousal": 0.3, "drives": { "energy": 0.8, "social": 0.5, "curiosity": 0.7, "comfort": 0.9 },
               "traits": { "warmth": 0.8, "curiosity": 0.7, "boldness": 0.4, "calm": 0.6 } },
  "bodies": {
    "strider": { "truth": "…body descriptor…", "gait": { "amp": 24, "freq": 1.1, "phase": 1.9, "bias": 4 },
                 "forwardModel": "fm_strider_v12", "trials": 412, "bestSpeed": 0.07 },
    "walker":  { "gait": { "amp": 30, "freq": 1.6, "phase": 1.7, "bias": 2 }, "trials": 180 }
  },
  "knowledge": [{ "pack": "reflex/good-night", "from": "self" }, { "pack": "gait/85mm-pla", "from": "growbot-gallery" }],
  "tiers": { "log": "P2", "identity": "P1" },
  "sig": "ed25519:…"
}
```

**One writer per region.** Human → constitution. Dream → identity and goals. Appraisal loop → emotion. Motor learner → bodies. Librarian → log and knowledge. Nothing else writes; the Soul Core rejects it.

## 3. Transfer and sync: one soul, many bodies, one lease

- Every connected thing is a **presence** that announces its body truth (`hello` + descriptor: channels, sensors, screens, mass, leg length).
- Exactly one presence holds the **embodiment lease**: motor authority and "this is where I am". The others are **echoes**: they sense, show the soul's face and mood, and can talk, but can't move. This is how the Fire 7, the iPhone, the keychain and the case all show the same creature without two copies fighting (GrowBot's "two Blues" mix-up, 28 Aug).
- **Moving the soul:**
  1. *Tap:* touch the Pixel keychain to the iPhone (NFC tag → Shortcut → `transfer(to: iph)`).
  2. *Call:* "Jeevo, come to the phone."
  3. *Follow:* the lease follows you: at the desk it's in the Fire 7 Strider, on the metro it's in the iPhone and keychain.
- **What moves:** only the lease and the current thought. Memory never moves because it lives in the Soul Core. That removes GrowBot's "browser-bound soul" problem (20 Jun, 22 Sep).
- **Arrival ritual:** the receiving body plays a short "waking in a new body" animation, and the emotion engine gets a `transfer_in` event (a little arousal, curiosity up). If it's a body with legs it hasn't used, it runs the play sequence.

## 4. Learning to walk in life

Four layers, cheapest first. Only the last two use the cloud.

1. **Rhythm generator (on the microcontroller, 50 Hz).** A central-pattern generator in the spirit of the "chomp": each leg angle is `bias ± amp·sin(2π·freq·t + phase)`. Four numbers per gait. Safe by construction: angles are clamped, there's a dead-man stop after 500 ms of silence, and the rhythm is smooth.
2. **Online optimiser (on the Fire 7 or iPhone, per stride).** A (1+1) evolution strategy: try a small change to the four numbers, keep it if the stride scored better, shrink or grow the step size (the 1/5 rule). Score = forward progress (camera optical flow, or distance to a target the camera sees) + stability (low IMU pitch/roll variance) − falls − energy. Every trial is logged to `bodies.<body>.trials`.
3. **Forward model (on the phone/tablet).** A tiny network (like Sebas's 24,841-parameter one) predicts the next IMU tick from the current IMU state plus the action. It is trained **online on the device** from its own prediction error: the piece GrowBot hadn't built. It does three jobs:
   - rejects candidate gaits it predicts will tip the body over;
   - supplies a **curiosity** signal (high error = something new about this body or floor), which the emotion engine reads;
   - acts as the body model the LLM "imagines" with before choosing a move (planning through it halved mimic-game error in GrowBot, 0.21 → 0.095 rad).
4. **The mind (cloud LLM, a few times a minute).** It chooses intent ("go to the perch", "dance", "look at Harsh"), not joint angles. It can author poses and name new routines, and it reads how learning is going ("I'm getting better on the tiles").

**Play sequence, at every new body** (from Brit's 15 Sep plan): wiggle each leg → stand tall → lean until it nearly tips (learns limits) → fall and get up (learns recovery) → face tracking → hide and seek (links camera motion to its own movement). About 5 minutes. Filmable, and the most emotional moment in the whole journey.

**Transfer of motor knowledge.** When the soul enters a body it hasn't walked in, it starts from the most similar body's gait, scaled by leg length and mass ratio. Expected effect: convergence in dozens of trials instead of hundreds. The Lab's gait-learning simulation shows this.

**Emotion shapes motion.** Happy = higher frequency and a bounce; sleepy = slower and lower amplitude; curious = leans toward the thing it's looking at; startled = freeze.

## 5. The emotion engine

The creature's feelings are computed, visible and honest: a meter you can open, never a vague claim.

- **Core affect:** valence (−1 to 1) and arousal (0 to 1).
- **Drives:** energy (battery and time awake), social (drops when alone, rises with attention), curiosity (rises when idle, falls when exploring; fed by forward-model surprise), comfort (heat, falls, noise).
- **Traits:** seeded at birth, changed only by dreams: warmth, curiosity, boldness, calm.
- **Appraisal:** each event (praised, petted, greeted, ignored, loud noise, fell, learned a step, low battery, charging, transfer, night) nudges affect and drives, scaled by traits. Glow events are the strongest positive.
- **Mood:** decays toward the trait baseline over minutes.
- **Labels:** joyful, excited, content, sleepy, curious, lonely, uneasy, grumpy, proud, derived from affect plus drives.
- **Expression on every surface from one state:** eye openness, pupil size, lid tilt, mouth curve and colour on the Fire 7 and iPhone; a tiny animated face on the Pixel keychain; a 1-bit glyph on the Halo case; gait tempo on the legs; voice pitch and rate.
- **Why it matters beyond cuteness:** emotion gates attention (lonely → more likely to greet you), memory (glow → kept in dreams) and learning (curiosity → more exploration in gait trials).

`prototypes/soul/emotion.js` is the working engine; the website runs it live.

## 6. Full access

"Full access" means the soul can use everything its bodies and your accounts can do, behind a ladder of approvals.

| Where | What full access gives the soul |
|---|---|
| **Rooted Fire 7 (LineageOS)** | Boot-time services (Termux:Boot), no Doze, the charge limit via Magisk + ACC, brightness and volume, notification access, the mic without a foreground app, USB-OTG serial straight to the Strider's Pico, shell for LAN devices (WiZ, Tuya), screenshots of its own face for the log. |
| **iPhone** | Everything Shortcuts can do: location triggers, Focus, alarms, NFC taps, bank SMS (parsed on the phone), Health summaries, Siri, the share sheet. A small native companion app adds Bluetooth for the keychain and the case. |
| **Your accounts** | Calendar, forwarded email, Telegram, Claude and ChatGPT through the MCP connector, Swiggy through Claude. |
| **Home** | The ESP32 dock: radar, IR for the AC, lights, power sense, BLE. |

The ladder: **read** (free) → **act at home** (logged) → **speak to others or spend** (Guardian + your tap) → **change its own constitution** (never; human only, as in GrowBot).

## 7. Knowledge sharing

Four circles, each with its own rule.

1. **Your bodies:** everything syncs through the Soul Core. What the Strider learns about the tiles, the Walker knows too.
2. **Your AIs:** the Jeevo MCP connector gives Claude and ChatGPT read and write access to memory, lists and today. It's the same knowledge wherever you chat.
3. **Other people's creatures:** **knowledge packs**, which are signed, versioned files of a single type that contain no personal data by construction:
   - `gait/<body-type>`: learned rhythm parameters plus forward-model weights for a body type and floor
   - `reflex/<name>`: a trigger → action rule
   - `sound/<name>`: a small sound classifier (a cooker whistle, a doorbell)
   - `truth/<body>`: a body descriptor for a legged dock design
   - `skill/<name>`: a prompt plus tool recipe (such as the metro coach)
   - `persona-seed`: traits and constitution tone, without memories (a "fork" that gets its own lineage)

   The Guardian refuses to export anything that touches P2 or P3 data. That matches GrowBot's planned soul and policy galleries (18 Jun), with privacy built in.
4. **Creature-to-creature:** when two souls meet (GrowBot's meet.html), they greet, remember each other, and can offer packs. Accepting a pack is always your tap.

## 8. The bodies (v3)

| Body | Role | Emotional role |
|---|---|---|
| **Strider**: Fire 7 on legs | Home body; walks to the perch to charge | The main creature at home; the one that learns to walk in front of you |
| **Walker**: iPhone on legs | Desk and demo body when the phone is docked | "It moved into my phone and walked over to me" |
| **Perch**: charging and swivel dock | Where the Strider rests and charges; turns to face you | Its bed; sleep and dreams happen here |
| **Pixel**: keychain with a round colour display | Echo in your pocket; tap to transfer; shows its mood | The pet you carry: shake to wake, tap to pet |
| **Halo**: iPhone case with an e-paper back | Always-on glyph of its mood and your next thing, powered only when it changes | The creature on your phone that strangers notice |
| **App**: web app + iOS companion | Soul Inspector, chat, settings, transfer | Where you see its memories and feelings |

Specs, wiring and firmware for each are in `11-prototypes.md`.

## 9. Research bets (where this is new)

1. Online forward-model learning on a phone, from real IMU error, used both for safety and curiosity.
2. Cross-body transfer of learned gaits by body-descriptor similarity.
3. One soul, many bodies, one embodiment lease, continuous sync.
4. Emotion that measurably changes locomotion, memory and attention, and is shown honestly.
5. Knowledge packs with a privacy firewall, compatible with GrowBot's soul format.

Each has a Lab experiment and a "done when" test in the build plan.

## 10. Licence and credit

GrowBot's code is PolyForm Noncommercial and its hardware and docs CC BY-NC. Personal use and interop are fine. Credit Brit and the community in every video, and offer anything useful (the forward-model-from-real-error work especially) back to the GrowBot Discord.
