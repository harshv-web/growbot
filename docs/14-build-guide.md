# Build guide: Jeevo from the parts on your desk

Step by step, for the exact kit you have today. Every part ends with a **Done when** check. If a check fails, run the doctor (A7) and send the output.

## What you have, and what it becomes today

| You have | It becomes |
|---|---|
| **Fire 7** (7th gen, 2017, codename "austin"), LineageOS 14.1 unofficial (June 2023 build), Android 7.1.2, rooted, SELinux permissive | **The home body and the soul's hub.** It runs Jeevo, shows the fluid face with 38 moods, sees with its front camera, hears through the mic, and reads your phone's notifications. |
| **Seeed XIAO ESP32-S3** + its antenna | **Jeevo Key.** A pocket creature on your keys, with its own feelings. |
| **1.3" I2C OLED** (SH1106, 128×64, blue on black) | **The key's face.** Springy pixel eyes. |
| **iPhone** | **The remote.** Ask Jeevo, tell it things, send ride/office/home events through Shortcuts. |
| **3D printer** | Printed parts: a tablet stand, the key case, and Pebble (a desk body). |
| Wires | The touch pad (you pet it) and the OLED wiring. |

**You'll also need:**
- a USB-C **data** cable (charge-only cables can't flash the board);
- a laptop (Mac or Windows) for Arduino.

**Soldering: why a ~₹500 iron matters.** The XIAO's pins arrive loose. Until they're soldered, the key runs in **LED mode**: no screen, but it connects, breathes the mood on its LED, and the B button works. So Day 1 needs no soldering.

### Know the tablet's limits first (why the steps look the way they do)

| Limit on Android 7.1 | What we do instead |
|---|---|
| The Tailscale app needs Android 8+ | Run Tailscale **inside Termux** in userspace mode (part C) |
| Chrome stopped at **version 119** on Android 7 | Install Chrome 119 and use it **only** for the face on `localhost`. Don't browse the web with it (it no longer gets security fixes). |
| No Google services, so browser voice typing fails | The face records you and the hub turns it into text with **Gemini** (needs `GEMINI_API_KEY`) |
| 1 GB RAM, 32-bit ARM | The hub is capped at 160 MB. The face drops to 1× pixels by itself if frames get slow. |
| The battery is from 2017 and will sit on a charger | The hub watches the battery temperature and health and tells you if it's warm. Check the back for bulging once a month. |

Your screenshot showed the battery at **1%**. Charge it to at least 50% before you start.

---

## Part A: The Fire 7 becomes the hub (about 90 minutes)

**A1. Charge and check.** Use a 2 A charger. Press gently on the back: it should not flex or bulge, and the screen should not be lifting at the edges. If it is swollen, stop and replace the battery before continuing.

**A2. Developer options and root.**
1. Go to Settings → About tablet and tap **Build number** 7 times.
2. Go to Settings → Developer options:
   - **Root access → Apps and ADB**;
   - **Stay awake** on.
3. If "Root access" is missing, your build doesn't have LineageOS's su add-on. Everything still works except the auto keep-awake lines, which you can then set by hand.

**A3. F-Droid and three Termux apps.**
1. On the tablet, open the browser, go to `f-droid.org`, and install F-Droid. Allow "unknown sources" when asked.
2. In F-Droid, install **Termux**, **Termux:API** and **Termux:Boot**. All three must come from F-Droid; mixing sources breaks them.
3. Open **Termux:Boot** once, then close it.
4. Go to Settings → Apps → **Termux:API** → Permissions and allow **Camera** and **Microphone**.
5. Go to Settings → Sound & notification → **Notification access** and turn on **Termux:API**. This is how Jeevo reads WhatsApp, Gmail, Zepto and the rest.

**A4. Chrome 119, for the face only.** Download *Google Chrome 119.0.6045.194 (arm-v7a, Android 7.0+)* from APKMirror, which checks Google's signature. Install it and open it once. When the face asks, allow the camera and microphone for `localhost`.

**A5. Install Jeevo.** Open Termux and run:

```sh
pkg install -y git
git clone -b claude/relaxed-volta-mek7ih https://github.com/harshv-web/growbot ~/growbot
bash ~/growbot/hub/scripts/fire7-setup.sh
```

The setup script does these things:
- installs Node LTS, Termux:API tools and Tailscale;
- installs the hub and copies the config, profile and secrets templates;
- runs the **17 self-tests**;
- adds a boot script (hub + Tailscale + face open on startup, screen stays on while charging, Termux never sleeps);
- adds a `jeevo` command.

Close Termux and open it again so the `jeevo` command is found.

**A6. Tell it who you are, and give it keys.**

```sh
jeevo edit profile     # the fill_me_in answers: who you live with, your areas, the people who matter, a good day
jeevo edit secrets     # GEMINI_API_KEY (hearing + chat), ANTHROPIC_API_KEY (sight + thinking), HUB_TOKEN (any long random word)
jeevo start
```

Get the keys from Google AI Studio (Gemini) and console.anthropic.com (Claude). Check that Google's current Flash model id matches `config.json → models.chat`.

**A7. The app and the face.**
1. In Chrome, open `http://localhost:8047/app/` (the full app; its Jeevo screen is the camera face).
2. Open the ⋮ menu and choose **Add to Home screen**. It now opens full screen like an app.
3. Tap **Eyes** (top right) and allow the camera.

If anything looks off, run `jeevo doctor`. It checks Node, packages, Termux:API, camera, notification access, root, the boot script, the hub, Tailscale, Wi-Fi IP, RAM, storage and keys, and says exactly what to fix.

**Done when:**
- `jeevo doctor` is all green, or only Tailscale is red (Tailscale comes in part C).
- The face blinks and breathes.
- Tapping it squishes it; three quick taps make it laugh; holding it makes it cosy; dragging makes its eyes follow your finger.
- **Type → "what did I order today?"** gets a one-line answer.
- Tapping the mood name at the top walks through all 38 moods.
- After a reboot, it all comes back by itself within about a minute.

## Part B: Eyes and ears (15 minutes, once the keys are in)

| Try | What should happen |
|---|---|
| Walk away for 30+ minutes, then come back | "arrived" → it looks surprised, then greets you (morning: "Morning. Chai first.") |
| Walk left and right in front of it | Its eyes follow you |
| Wave big, three times | "Hi hi!" and a tickled face |
| Turn the lights off after 10 pm | After a minute it dozes (closed eyes and zzz) |
| Press **Look**, or ask "what do you see?" | One line about what's in front of it; tap for detail |
| From the iPhone: "what do you see on my desk?" | Same: the hub borrows a frame from the open face, or snaps one with Termux |
| Press **Talk**, speak in Hindi or English, press **Done** | It shows what it heard, then answers |

**Privacy, exactly:**
- Presence, light and gaze are worked out **inside Chrome on the tablet** from a 32×24 grey thumbnail. Only words ("arrived", "dark") reach the hub.
- A real picture leaves the tablet **only when you ask it to look**. Only the description is saved; the photo isn't.
- Tap **Eyes** to close them. `config.json → camera` turns each part off.

**Done when:** a wave gets a "Hi hi!", and Look describes your desk correctly.

## Part C: Reach it from the iPhone, anywhere (20 minutes)

1. Install **Tailscale** on the iPhone and sign in.
2. On the Fire 7, in Termux, after a reboot (so `tailscaled` is running), run:

   ```sh
   tailscale --socket=$PREFIX/var/run/tailscaled.sock up
   ```

   Open the link it prints on your iPhone and approve the tablet.
3. Run `jeevo doctor`. It prints `tailscale: http://100.x.y.z:8047`. That is your hub from the office or the road.
4. For the iPhone app with push, give the hub an https address: `tailscale --socket=$PREFIX/var/run/tailscaled.sock serve --bg 8047`, then open `https://<tablet-name>.<tailnet>.ts.net/app/?token=…` in Safari → Share → Add to Home Screen → Settings → Enable here.
5. In `config.json`, set `"trustLocalhost": false` so every device must send `HUB_TOKEN`. With userspace Tailscale, remote requests look like they come from the tablet itself. Then open the app once as `http://localhost:8047/app/?token=YOUR_TOKEN`; it remembers the token.
6. Build three Shortcuts from `shortcuts/README.md`:
   - **Ask Jeevo**: dictate, then POST `/input`.
   - **Ride start/end**: an automation for when the iPhone connects to or disconnects from the Ather's Bluetooth.
   - **Arrive office / home**: a location automation.

**Plan B** if `pkg install tailscale` fails: `pkg install cloudflared` and a Cloudflare Tunnel. Ask me and I'll add it.

**Done when:** from mobile data, "Ask Jeevo → how are you?" gets a reply on the phone and the tablet's face reacts.

## Part D: Connect your day (30 minutes, then it learns)

| Source | How |
|---|---|
| WhatsApp | On the tablet: WhatsApp → **Link as companion device** → scan with your iPhone. If WhatsApp won't install on Android 7.1, skip it; email and SMS still work. |
| Zepto, Swiggy, Instamart, Blinkit | Install them on the tablet and log in. Their notifications become orders and habits. Older Android can block some apps; order emails and bank SMS cover the gap. |
| Calendar | Google Calendar → Settings → your calendar → **Secret address in iCal format** → `config.json → adapters.calendar.icsUrl`, and `enabled: true` |
| Personal email | Gmail → App passwords → `secrets.json → EMAIL_APP_PASSWORD`; `adapters.email.user`, `enabled: true`; then `cd ~/growbot/hub && npm install imapflow` |
| Bank SMS | iPhone Shortcut (OTPs are filtered on the phone and never sent) |
| Ather | App → **Ride** → your phone number → OTP. Jeevo then reads battery, range, tyres and location every 5 minutes (unofficial, read-only). Ride mode also comes from the Bluetooth Shortcut. |

**Work data:** keep `workCompartment` off unless your employer's policy allows it.

**Done when:** a Zepto "out for delivery" makes its face go **excited**, and "what did I order today?" lists it.

---

## Part E: Jeevo Key on the XIAO ESP32-S3

### E1. Laptop setup (20 minutes, once)
1. Install **Arduino IDE 2**.
2. Go to Settings → Additional boards manager URLs and add `https://espressif.github.io/arduino-esp32/package_esp32_index.json`.
3. Go to Boards Manager and install **esp32 by Espressif** (3.x).
4. Go to Library Manager and install **Adafruit GFX**, **Adafruit SH110X**, **WebSockets** (by Markus Sattler), **ArduinoJson** (7.x) and **NimBLE-Arduino**.
5. Screw the small antenna onto the XIAO's gold connector (a gentle press-click). Without it, Wi-Fi barely reaches.

### E2. Day 1, no soldering: LED mode (20 minutes)
1. Open `firmware/keychain-oled/keychain-oled.ino`.
2. Copy `secrets.example.h` to `secrets.h` next to it and fill in:
   - home Wi-Fi, which must be **2.4 GHz**;
   - `HUB_HOST`, the tablet's Wi-Fi IP (from `jeevo doctor`);
   - `HUB_TOKEN`, if you set one.
3. Select Tools → Board → **XIAO_ESP32S3**, and set Tools → USB CDC On Boot → **Enabled**.
4. Plug in the XIAO and pick its port.
5. Click **Upload**. If upload fails: hold **B**, tap **R**, release **B**, and upload again.
6. Open Serial Monitor at 115200. You should see `No OLED found: using the RGB LED`.

**Done when:**
- the small yellow LED breathes;
- a short press of **B** makes the tablet say it got "on my way";
- a long press makes the tablet show the soul moving to the keychain.

### E3. Solder and wire the face (40 minutes)

| OLED pin (read your board's labels) | XIAO pin |
|---|---|
| VCC / VDD | **3V3** |
| GND | **GND** |
| SDA | **D4** |
| SCL / SCK | **D5** |
| (touch) a 10 cm wire, or copper tape | **D3** |

- Solder wires straight to the pads; skip header pins to keep the key thin.
- Keep the OLED wires under 10 cm.
- Don't cross VCC and GND: many 1.3" boards put GND first.

Upload again. Serial should say `OLED at 0x3C`.

**Done when:**
- the eyes blink and follow the tablet's mood;
- touching the wire makes it tickled, holding it makes it cosy, and three quick taps make it dizzy;
- saying "haha" to the tablet makes the key laugh too.

**If the OLED stays blank:**
- 99% of the time SDA and SCL are swapped or VCC/GND are wrong: check both.
- A screen of snow or noise means it's an SSD1306 after all: set `OLED_SH1106 0`.

**Preview without hardware:** `firmware/sim/render.sh` runs the real sketch on your laptop and draws every mood (`docs/assets/keychain-moods.png`).

### E4. Later: cordless
The XIAO has a LiPo charger built in. Solder a 3.7 V LiPo of about 400 mAh to the **BAT+ / BAT−** pads under the board; USB-C then charges it. In `hardware/jeevo-key.scad`, set `lipo_t = 5` to make room for it.

---

## Part F: Print (while other things run)

| File | What | Settings | Time (approx.) |
|---|---|---|---|
| `hardware/stl/fire7-stand.stl` | Holds the Fire 7 in landscape, leaning back 16°, open back for cooling, cable slot | PLA, 0.2 mm, 15–20% infill, no supports, as modelled | 3–4 h |
| `hardware/stl/jeevo-key-fit.stl` | **Print this first:** just the key's front wall, to test the window and OLED fit | 0.2 mm | 15 min |
| `hardware/stl/jeevo-key-shell.stl` + `-back.stl` | The key case: 40 × 17 × 47 mm plus the ring loop | 0.16 mm, 100% infill for the loop, no supports | 1.5 h |
| `hardware/stl/jeevo-pebble-shell.stl` + `-back.stl` | Pebble, a desk body with ears (same electronics); put copper tape inside the top and pat its head | 0.2 mm, supports only under the ears | 3 h |

**Fitting the parts:**
- Measure your OLED module with a ruler and change `oled_pcb` / `oled_win` in the `.scad` files if they differ.
- Open the `.scad` in OpenSCAD (free), set `part`, and export an STL.
- Fix the OLED behind the window with small pieces of double-sided tape.
- Tape the touch foil inside the back plate.

## Part G: Your first week

| Day | Do | You'll see |
|---|---|---|
| 1 (today) | Parts A + B, E1–E2, start the stand print | The face lives on the tablet, sees you and greets you. The key breathes on its LED. |
| 2 | Part C and the three Shortcuts | Ask from office; ride mode on the Ather |
| 3 | Part D (WhatsApp, shopping apps, calendar) | "What did I order?", "Anything I need to reply to?" |
| 4 | Buy a soldering kit (and a 400 mAh LiPo); E3 | The key gets its face |
| 5 | Print the key case; assemble | It's on your keys |
| 6 | Fill in the profile properly; use it all day | Morning chai, lunch check, laundry, rent day |
| 7 | Sunday: open `http://localhost:8047/?clean&demo` and film the moods for a first reel | Episode 1 footage |

## When something's wrong

| Symptom | Fix |
|---|---|
| Face is a black screen | You're not in Chrome 119, or JavaScript is off. Open `http://localhost:8047` in Chrome, not the built-in browser. |
| "I can't open my eyes here" | Chrome needs camera permission for `localhost`. Tap the lock icon → Permissions. |
| Talk shows "I need a Gemini key" | Add `GEMINI_API_KEY`, then `jeevo stop && jeevo start` |
| Hub stops overnight | Run `jeevo doctor`. Check that Termux:Boot was opened once and root is allowed (for the Doze whitelist). |
| Tablet warm | It says so itself. Take it off the charger for an hour. Prop it on the stand (open back). |
| Key: "offline" dot bottom-right | Wrong `HUB_HOST`, 5 GHz Wi-Fi, antenna not fitted, or the tablet IP changed. Fix: set a DHCP reservation for the tablet in your router. |
| Key upload fails | Hold B, tap R, release B, then upload. Use a data cable. |

## Next buys, in order

| Item | ~₹ | Why |
|---|---:|---|
| Soldering iron kit + solder | 500 | Gives the key its face |
| 3.7 V LiPo, ~400 mAh (JST or wires) | 250 | Cordless key; the XIAO charges it |
| Copper tape roll | 150 | Touch pads for the key and Pebble |
| Smart plug with energy monitoring | 900 | Ather charging sessions, and resting the tablet's battery |
| mmWave presence sensor (LD2410) | 350 | Knows you're home even when you sit still |
| Round colour display (GC9A01) + second XIAO | 1,300 | Pebble v2 with a full-colour face |
