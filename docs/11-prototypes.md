# Prototypes

*One prototype per body, each with a technical job and an emotional job. Code lives in `prototypes/`. All firmware here is an untested first sketch: check pins, servo limits and power on your build before running it. Prices are Sep 2026 estimates from Robu/Robocraze listings; verify before buying.*

## P1 · Soul (the thing that moves between bodies)

- **Technical:** soul file format v1 (a GrowBot superset, see `10-growbot-fusion.md`), the embodiment lease, the emotion engine (`prototypes/soul/emotion.js`), and the motor learner (`prototypes/legs/learner.js`).
- **Emotional:** it is born once (in the Fire 7), dreams every night, and wakes up in whatever body you hand it.
- **Test:** tell the Fire 7 something, tap the keychain to the iPhone, and ask the iPhone about it. The mood carries over and the lease moves in under 2 seconds.

## P2 · Strider: the Fire 7 on legs

| | |
|---|---|
| Body | Fire 7 (2019, ~290 g) in a printed cradle, screen-forward, two legs at the ends like GrowBot |
| Servos | 2× MG996R (metal gear, ~11 kg·cm at 6 V) or DS3218 (20 kg) for margin |
| Controller | Raspberry Pi Pico 2 W running `prototypes/legs/gait_cpg.py` |
| Power | 2S 7.4 V LiPo (1,000–1,500 mAh) → 6 V 5 A UBEC for the servos; Pico from the UBEC |
| Link | USB-OTG serial to the Fire 7 (root makes the device path usable), Wi-Fi as a fallback |
| Legs | ~110 mm, textured TPU feet (GrowBot builds slipped on smooth PLA) |
| Mass budget | tablet 290 + cradle 80 + servos 110 + battery 90 ≈ 570 g |
| Parts | servos ₹900–1,800 · Pico 2 W ₹729 · LiPo + UBEC ₹1,100 · print ≈ ₹150 → **≈ ₹3,000–3,800** |

- **Learning:** it's born flat on the floor. The play sequence runs (wiggle, stand, lean, fall, get up, hide and seek). Then the (1+1) evolution strategy tunes the four rhythm numbers per stride while the forward model learns how this body tips. Emotion scales the tempo.
- **Emotional:** the first time it stands up on its own is episode one's ending. Every fall is a `fell` event (visible distress), every improvement a `learned_step` (glow).
- **Safety:** clamped angles, a dead-man stop after 500 ms, a soft "limp" on low battery, and it never walks when the tablet is hotter than 40 °C.
- **Test:** from a cold start, it reaches the perch 1 m away in under 30 minutes of trials, three times.

## P3 · Walker: the iPhone on legs

| | |
|---|---|
| Body | Stock GrowBot V1 geometry (85 mm legs), mounted on the Halo case's rail instead of foam tape |
| Servos | 2× MG90S (180°, metal gear; hold-test each one, fakes are common) |
| Controller | Pico 2 W + GrowBot relay firmware or `gait_cpg.py` |
| Power | 4× AA lithium (never 3.7 V cells), low-profile holder |
| Parts | ≈ ₹2,250 |

- **Learning:** it starts from the Strider's learned gait via `GaitLearner.transfer()` (scaled by leg length and mass), so it should learn in far fewer trials. That's the headline experiment for cross-body transfer.
- **Emotional:** "It moved from the tablet into my phone and walked to me."
- **Test:** transfer beats from-scratch on trials-to-first-metre, averaged over 5 runs.

## P4 · Perch: charging dock + swivel

- Lazy-susan bearing + NEMA17 + TMC2209 (silent) turns whatever sits on it to face you. It has a USB charger for the Fire 7, a MagSafe puck for the iPhone, and an ESP32-S3 with radar, IR and BLE (the "nervous system" from v2).
- **Emotional:** its bed. The Strider walks back to sleep here, and dreams run while it charges.
- **Parts:** ≈ ₹3,300 (unchanged from v2).

## P5 · Pixel: the keychain with a face

| | |
|---|---|
| Board | Waveshare ESP32-S3-Touch-LCD-1.28: round 240×240 colour display, touch, 6-axis IMU, LiPo charger, ~40 mm |
| Extras | 250–400 mAh LiPo, coin vibration motor + MOSFET, NFC sticker on the back, printed shell with a key ring |
| Firmware | `prototypes/keychain-pixel/pixel.ino` |
| Parts | board ≈ ₹1,800–2,200 · battery and extras ≈ ₹300 · shell ₹40 |

- **Shows:** the soul's live face (same expression values as every surface), with eyes that follow gravity when you tilt it.
- **Does:** shake = wake (the soul registers "greeted"); tap = pet (glow); long press = "come here" (transfer request); vibrates for leave-now and forgot-keys; its BLE advertising doubles as the keys-at-home beacon.
- **Battery:** a round LCD draws tens of mA, so it sleeps after 20 s and wakes on motion. Expect a day or two between charges with glances. It's a chunky keychain (~12 mm thick), not a tag.
- **Sync:** over BLE to the iOS companion app when you're out, to the Perch at home.
- **Test:** its mood matches the Fire 7's within 3 seconds; five shakes in a row make the soul "excited".

## P6 · Halo: the case with a display on the back

| | |
|---|---|
| Display | 1.54" 200×200 black/white e-paper (keeps its picture with no power) |
| Brain | ESP32-C3 SuperMini, 150 mAh LiPo, TP4056, USB-C on the case edge |
| Case | Printed TPU case with a ~7 mm back-pack; MagSafe ring below it; keeps clear of the phone's top-back NFC area |
| Firmware | `prototypes/case-halo/halo.ino` |
| Parts | e-paper ≈ ₹1,200 · C3 ₹269 · battery/charger ₹250 · TPU ₹150 |

- **Shows:** a 1-bit version of the soul's face, its mood word, and one line (next metro, rain at 4 pm, "keys at home?").
- **Battery:** it wakes every 10 minutes and redraws only when something changed, so weeks per charge.
- **Sync:** v1 over home Wi-Fi; v2 over BLE through the companion app so it updates anywhere.
- **Stretch (experimental):** a battery-free NFC-powered e-paper tag that the iPhone itself refreshes by NFC, which needs the native app.
- **Test:** it changes within 10 minutes of a mood change at home and lasts 2 weeks on a charge.

## P7 · Apps: web app, iOS companion, Fire 7 body daemon

- **Web app (PWA):** the face, chat, Soul Inspector, transfer button and settings. Runs on the Fire 7 (kiosk WebView) and the iPhone home screen, synced through the Soul Core.
- **iOS companion (SwiftUI, small):** needed because iOS web apps can't use Bluetooth. It relays Pixel and Halo over BLE, handles NFC tap-to-transfer, and shows Live Activities for leave-now. Sideload with a free Apple ID (re-sign weekly) or the ₹8,700/yr developer programme.
- **Fire 7 body daemon:** `prototypes/fire7/body-daemon.mjs` + `setup.sh`, in Termux with root: boot start, no Doze, charge window, serial to the Strider, battery and temperature reports, and the learner loop.

## Total parts (all prototypes)

About ₹12,000–14,000 on top of what you own (Fire 7, iPhone, printer), spread over the phases. The Strider and the Pixel are the two to buy first.

## Where the code stands

| File | Status |
|---|---|
| `prototypes/soul/emotion.js` | Runs; smoke-tested in Node, used live on the website |
| `prototypes/legs/learner.js` | Runs; converges on a simulated body in ~150 trials; forward model learns a toy dynamics task |
| `prototypes/legs/gait_cpg.py` | Untested MicroPython sketch |
| `prototypes/keychain-pixel/pixel.ino` | Untested; IMU and touch init left as TODO (use Waveshare's demo) |
| `prototypes/case-halo/halo.ino` | Untested |
| `prototypes/fire7/body-daemon.mjs`, `setup.sh` | Untested sketch; optical-flow and IMU inputs are TODO |

## P8 · Ather touchpoint (the scooter as a place the soul rides along)

There's no public Ather API, so this uses only what's allowed today:

- **Ride mode:** a Shortcuts automation on "Bluetooth connected: Ather dash" (or a helmet NFC tag). Notifications are held, only turn-critical things are spoken through the helmet headset, the Halo case shows "riding", and nothing on the keychain or case asks for your eyes while moving. On disconnect (after a 3-minute grace for signals), it logs the trip and where you parked.
- **Charge manager:** the portable charger on an energy-monitoring smart plug. Jeevo sees charging start and taper, stops around 80% on normal days for battery health, charges full before long rides on your calendar, and logs ₹ per charge.
- **Optional, experimental:** the Ather app on the rooted Fire 7, with notification access, for charge-complete and theft alerts. Ather's own Alexa skill (beta) already answers charge and range questions.
- **Community builds:** people are reverse-engineering Ather's cloud API. Treat those as unofficial: read-only at most, keep tokens local, and accept that your account could be flagged.
