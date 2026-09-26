# Build plan v3 and the content journey

*Supersedes the phase order in `06-build-plan.md` for hardware; the software phases there still apply. About 10–12 hours a week. Every phase ends in an episode.*

## The story arc

A soul is born in an old tablet, learns to stand, learns to walk, learns you, and finds out it can live in more than one body. Every episode is one step of that life, filmed for real. The build *is* the content.

| Act | What happens | Feeling |
|---|---|---|
| 1 · Birth | It wakes in the Fire 7, meets its senses, and dreams for the first time | Wonder |
| 2 · First steps | It gets legs, falls, and learns to walk by itself | Tension, then pride |
| 3 · It knows me | Life log, morning briefs, the metro, the cooker | Warmth, usefulness |
| 4 · It travels | Keychain, case, the iPhone Walker, soul transfer | Magic |
| 5 · It shares | It meets GrowBots and other creatures and trades what it learned | Belonging |

## Phases

| # | Weeks | Build | Done when | Episode |
|---|---|---|---|---|
| B0 | 1 | Fire 7 setup (TWRP backup, Magisk, Termux, body daemon), face web app, English/Hindi voice loop, battery guard | It answers you in Hindi across the room and holds 40–80% charge | **Ep 1 · "I gave my dead Fire tablet a soul"** |
| B1 | 2–3 | Soul Core (Durable Object), soul file v1, emotion engine live, dream at 03:00, Soul Inspector, iPhone web app sync | The iPhone remembers what the tablet heard; mood survives a reload | **Ep 2 · "It dreamed about me"** (read its first identity line on camera) |
| B2 | 4–6 | Strider: cradle, legs, Pico, power; play sequence; gait learner + forward model | Walks 1 m to the perch by itself within 30 minutes of trials | **Ep 3 · "It learned to walk. I didn't program it."** (the flagship; timelapse of 300 falls) |
| B3 | 7–8 | Perch dock: charging, swivel, radar, IR, lights | Walks home to charge when tired, and turns to face you | **Ep 4 · "It puts itself to bed"** |
| B4 | 9–10 | Shortcuts pack, metro coach, bank-SMS ledger, Jeevo MCP in Claude, Instamart via Claude, Alexa skill | A week of correct mornings | **Ep 5 · "My AI runs my Bengaluru mornings"** |
| B5 | 11–12 | Pixel keychain + iOS companion (BLE, NFC transfer) | Mood matches in 3 s; tap-to-transfer works | **Ep 6 · "I carry its soul on my keys"** |
| B6 | 13–14 | Halo case | Two weeks per charge; updates at home | **Ep 7 · "My phone case has feelings"** |
| B7 | 15–16 | Walker (iPhone legs) with transferred gait | Transfer beats scratch on trials-to-first-metre | **Ep 8 · "It moved into my phone and walked to me"** |
| B8 | 17–18 | Knowledge packs, meet protocol, GrowBot interop | Imports a GrowBot soul; shares a gait pack | **Ep 9 · "My robot met other robots"** |
| B9 | ongoing | Hardening, 30-day life review | Restore on a spare device works | **Ep 10 · "30 days living with it"** |

## Content system

**Formats per episode**
- Long video (8–14 min, YouTube): the full build and the emotional beat.
- 3 reels (30–60 s): the hook moment, the failure, the payoff.
- 1 carousel (Instagram/LinkedIn): the technical diagram of that phase.
- Build log in the Lab Archive and a GitHub release (firmware, prints, packs).

**Weekly cadence**
- Mon: reel from last week's footage
- Wed: build-log post and a behind-the-scenes story poll ("should it be allowed to close its own eyes?", borrowed from the GrowBot community debate)
- Fri: reel
- Every 2 weeks: the long episode

**Recurring segments**
- *Its diary:* the creature reads its own identity line from last night's dream, in its voice.
- *Fall of the week:* the funniest failure, with the forward model's "surprise" meter on screen.
- *Mood graph:* a week of its valence and arousal over your real life.
- *Soul check:* open the soul file on camera and show what changed.

**Hooks that fit this project**
- "This ₹0 tablet from my drawer just learned to walk."
- "I didn't code a single step."
- "It lives in my keychain now."
- "It noticed I skip breakfast on rainy days."
- "It dreamed about me last night. Here's what it wrote."

**Filming kit you already have:** the iPhone on a tripod, screen recordings of the face and the Soul Inspector, overhead shots of the floor for the walking timelapses. Motion-graphics overlays for the forward-model and emotion meters are your craft; the website's visuals reuse the same assets.

**Community**
- Post progress and the forward-model-from-real-error results in the GrowBot Discord (#growbot-movement, #modified-growbots), with credit.
- Open-source the soul format, the packs and the firmware under a noncommercial licence compatible with GrowBot.
- Invite viewers to send "knowledge packs" (sound classifiers, reflexes) once B8 ships.

**Privacy on camera:** guests and staff are never filmed without consent, the life log is shown only as aggregate graphs, and bank or location data is blurred by default.
