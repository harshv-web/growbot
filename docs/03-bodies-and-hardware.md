# Bodies and hardware

<!-- Generated from site/src/data.js by site/build.mjs. Edit the data, not this file. -->

Your old tablet and iPhone do most of the work. Everything else is optional and adds up to about ₹9,415 over four months (estimates; check Robu or Robocraze).

## Fire 7 · home body (rooted, LineageOS) (Phase 0)

Your rooted Fire 7 (likely the 2019 'mustang': 7-inch 1024×600, MT8163, 1 GB RAM, ~290 g) is the always-on face, ears and eyes at home. Root means the soul gets real system access, not a browser sandbox.

**Does**

- Animated face full-screen (kiosk WebView), always on, dimmed at night
- Far-field listening with on-device voice detection; sound events
- Camera only when the radar says someone's there
- Root powers: charge limit via sysfs, boot-start services, no Doze, notification access, USB-OTG serial to the legs, screen and volume control

**Build**

- Termux + Termux:Boot + Termux:API: a small 'body daemon' (Node or Python) that holds the WebSocket to the Soul Core
- Magisk + ACC (Advanced Charging Controller) to hold the battery at 40–80%
- Face UI in a kiosk WebView; check the WebView version with the Lab's Device Check
- Legs: the Strider base (Phase 5); the Fire 7's light weight lets MG996R-class servos walk it

| Part | ₹ | Note |
|---|---:|---|
| Fire 7 (rooted) | ₹0 | You have it |
| Printed stand + shutter | ₹60 | PLA |
| USB-OTG cable | ₹150 | Tablet ↔ Pico for wired legs |

**Limits**

- 1 GB RAM: the brain stays in the cloud; the tablet only senses, shows and speaks
- Unofficial ROM: keep a TWRP backup before changing anything
- Mic and speaker are small: an external USB/3.5 mm mic helps far-field
- No NFC on the Fire 7

## iPhone · pocket presence (Phase 1–2)

Jeevo in your pocket: Siri, Shortcuts, notifications, NFC reader, and the phone that knows where you are.

**Does**

- 'Hey Siri, ask Jeevo' and the Action button (15 Pro and later) or Back Tap
- Automations: alarm, Wi-Fi, Focus, charger, NFC, bank SMS, arrive/leave
- Web Push from the Jeevo web app
- On-device SMS parsing with Apple's model on Apple Intelligence iPhones

**Build**

- Install the Jeevo web app to the home screen
- Import the Jeevo Shortcuts pack (you'll build it in Phase 2)
- Add the Jeevo connector in Claude on the web; it syncs to the Claude iOS app

| Part | ₹ | Note |
|---|---:|---|
| iPhone | ₹0 | You have it |

**Limits**

- Web apps get no Bluetooth or NFC and stop listening when locked
- iOS can't give a web app your call audio or other apps' notifications
- A native app (later, optional) removes the Bluetooth limit

## Keychain · three tiers (Phase 5)

Tier 1 NFC buttons, tier 2 BLE beacon + button + buzzer, tier 3 pendant ears.

**Does**

- Tier 1: tap = run a Shortcut (leave, sleep, medicine, parked)
- Tier 2: 'forgot your keys', haptic nudges, one-button capture at home
- Tier 3: push-to-talk voice capture anywhere (Omi-style)

**Build**

- Tier 1: NTAG215 tag in a printed or resin fob
- Tier 2: XIAO nRF52840 + 100 mAh LiPo + coin vibration motor + button
- Tier 3: XIAO nRF52840 Sense (mic + IMU) with Omi's MIT firmware as the reference

| Part | ₹ | Note |
|---|---:|---|
| NTAG215 tags ×10 | ₹250 | Tier 1 |
| XIAO nRF52840 (Sense for tier 3) | ₹1,600 | Estimate; check Robu/Robocraze |
| LiPo 100 mAh + vibration motor + button | ₹250 | Tier 2 |
| Printed shell | ₹30 | PETG or TPU |

**Limits**

- Outside home an iPhone web app can't hear BLE: tier 2 and 3 need store-and-forward or a native app
- Coin-size batteries: push-to-talk only for long life

## iPhone case · dock key (Phase 5)

A printed TPU case that keeps MagSafe charging and adds a keyed rail, an NFC tap-card and a camera shutter.

**Does**

- Snaps onto the Swivel in the same spot every time (MagSafe charger in the dock → 'docked' automation)
- Friends tap it to get your UPI QR, Instagram or Wi-Fi, depending on your mode
- Lanyard loop for the keychain

**Build**

- Parametric TPU case from your code-CAD engine
- MagSafe-compatible magnet ring
- NTAG215 under a thin skin on the back, away from the phone's own NFC reader at the top

| Part | ₹ | Note |
|---|---:|---|
| TPU filament | ₹150 | One case |
| Magnet ring | ₹150 | MagSafe-compatible |
| NTAG215 | ₹25 |  |

**Limits**

- Keep metal and tags clear of the phone's top-back NFC area and the MagSafe coil centre

## Dock · nervous system + Swivel (Phase 4)

One ESP32 that senses the room and does what a web page can't: radar, IR, UDP, BLE scanning, power sensing, and the motor.

**Does**

- mmWave presence (sitting still counts)
- IR for AC/TV/fans; WiZ and Tuya over the LAN
- BLE scanner for the keychain beacon
- Heartbeat on mains power = power-cut detector
- Silent pan motor that turns the tablet to face you

**Build**

- ESP32-S3 dev board, LD2410C radar, AHT20, IR LED + receiver
- Swivel: lazy-susan bearing, NEMA17 + TMC2209 (silent), GT2 belt, 12 V supply
- Firmware: WebSocket out to the Soul Core; speaks the GrowBot-style pose/act/stop messages

| Part | ₹ | Note |
|---|---:|---|
| ESP32-S3 dev board | ₹600 | Estimate |
| LD2410C radar | ₹300 | From ≈ ₹269 |
| AHT20 + IR LED/receiver | ₹200 |  |
| NEMA17 + TMC2209 + belt + bearing | ₹1,800 | Estimate |
| 12 V 2 A supply + wiring | ₹400 |  |

**Limits**

- 2.4 GHz Wi-Fi only; mesh band steering can confuse it
- IR is one-way
- Tablet weight: use a bearing, never hang it on a servo horn

## Walker · old phone with legs (Phase 6)

The GrowBot-style body for your old phone. Same soul, different body.

**Does**

- Walk, spin, dance, stand tall
- Show that the soul moves between bodies

**Build**

- Pico 2 W + 2× MG90S (180°, metal gear) + 4×AA lithium + printed body
- Stock GrowBot firmware is fine for personal use

| Part | ₹ | Note |
|---|---:|---|
| Pico 2 W | ₹729 | Robu |
| MG90S ×2 | ₹538 | Robu, ₹269 each |
| AA lithium ×4 + holder | ₹900 |  |
| Printed body | ₹80 |  |

**Limits**

- Fake 360° servos and weak batteries are the top two failures
- Screen-forward walking is still early

## What each device can do

| Capability | Fire 7 · LineageOS (root) | iPad (Safari) | iPhone web app | iPhone Shortcuts | ESP32 dock |
|---|---|---|---|---|---|
| Always on at home | yes | yes | no | — | yes |
| Listen in background | yes (screen on) | yes (screen on) | no | dictation on demand | with mic node |
| Speech recognition | Web Speech en/hi-IN | Safari, not standalone | unreliable | Siri dictation | — |
| Bluetooth LE | Web Bluetooth | no | no | no | yes |
| NFC | no (no hardware) | no | no | tag automations | PN532 add-on |
| Push notifications | yes | iPadOS 16.4+ app | iOS 16.4+ app | — | — |
| Local LAN (UDP/TCP) | yes (Termux, root) | no | no | no | yes |
| Motors, IR, radar | no | no | no | no | yes |
| Knows your location | — | — | no | arrive/leave, Wi-Fi | — |
| Reads bank SMS | — | — | no | Message trigger | — |

## Parts budget

| Phase | What | ₹ |
|---|---|---:|
| Phase 0 | Smart plug for the charge window, printed stand | ₹960 |
| Phase 4 | ESP32-S3, LD2410C radar, AHT20, IR parts, Swivel motor kit, 12 V supply | ₹3,300 |
| Phase 4 (optional) | Kitchen mic node: ESP32 + INMP441 | ₹450 |
| Phase 5 | NFC tags ×10, keychain tier 2 electronics, printed case parts | ₹2,455 |
| Phase 6 | Walker: Pico 2 W, 2× MG90S, AA lithium, printed body | ₹2,250 |
| **Total** | | **₹9,415** |
