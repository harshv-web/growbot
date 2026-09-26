# Risks and edge cases

Ordered by how likely each is to hurt this build. "Where it bites" names the phase.

## Platform limits

| Risk | Where it bites | What to do |
|---|---|---|
| iOS web apps stop audio when locked or backgrounded; no Web Bluetooth or NFC | P1–P5 | The iPhone is a summoned presence: Siri, Shortcuts, Action button, push. A small native app is an optional later step for BLE. |
| Speech recognition doesn't work reliably inside an installed iOS web app | P1 | On iPhone, record audio in the app and send it to the Scribe, or use Siri dictation through a Shortcut. |
| Old Android tablet stuck on an old Chrome | P0 | Run the Device Check. If Web Speech or Wake Lock is missing, use Fully Kiosk Browser or Termux-side helpers. |
| An iPad instead of Android: no Web Bluetooth, no Termux | P0, P4 | Nothing breaks: the dock talks to the Soul Core over Wi-Fi, not Bluetooth. Guided Access keeps it full-screen. |
| Android Doze kills sockets when the screen is off | P0 | Screen on at low brightness, plugged in, Wake Lock; reconnect with backoff. |
| A web page can't send UDP/TCP to bulbs and plugs | P4 | The ESP32 dock (or Termux on Android) is the LAN bridge. |

## Services

| Risk | What to do |
|---|---|
| Swiggy's MCP forbids third-party apps, is cash on delivery (Swiggy Money since Sep 2026), and orders can't be cancelled | Jeevo never calls Swiggy. You order through Claude or ChatGPT with both connectors, and every order needs an explicit yes. |
| No Namma Metro realtime feed or ticket API | Timetables from GTFS; disruptions from you; tickets by deep link. Refresh the timetable when the Pink Line opens. |
| Alexa's custom skill has a short response window | A fast path with cached answers; long answers go to the phone. |
| Alexa+ MCP Toolkit is US-only | Build on the classic skill + Voice Monkey now; bridge later. |
| WhatsApp Cloud API needs Meta business setup and its own number; pricing changes 1 Oct 2026 | Start with Telegram. WhatsApp stays under 1,000 free service messages a month for personal use. |
| Gemini Flash promo pricing ends 31 Dec 2026 (prices double) | The router can move Jeevo to Flash-Lite; the Lab's budget tool shows 2027 prices. |
| Free model tiers may use your data to improve products | The Guardian blocks free tiers for P2 and P3 data. |
| Tuya local keys and Tapo community libraries break on re-pair or firmware updates | Prefer WiZ (documented local UDP) or IR for anything you rely on daily. |

## Listening and privacy

| Risk | What to do |
|---|---|
| Recording other people (guests, cook, cleaner, family) | "Ambient · me" as the default; staff hours camera-off and no voice learning; guest mode; ring light always shows the mode. |
| Work confidentiality (your employer's calls at home) | Work Focus pauses ambient capture and memory; never connect employer systems. |
| Prompt injection through emails, web pages and other tools' output | Ingested text is data. The Guardian screens anything that would trigger an action; actions need approval above a threshold. |
| OTPs leaking | The OTP firewall drops any SMS mentioning OTP, one-time or verification code on the phone. |
| A lost phone or tablet | Revoke its device token from the Soul Inspector. The vault stays encrypted. |
| Losing the vault passphrase | The vault is unrecoverable by design. Write the passphrase down offline. |
| "Jeevo" misheard as "Jio" from TV ads (GrowBot's "Chirin" was heard as "Karen") | Test in Phase 0 with the TV on; keep a two-word wake phrase or pick another name. |

## Hardware and safety

| Risk | What to do |
|---|---|
| Old tablet battery swelling from always-on use (a GrowBot builder's Galaxy S9 swelled) | Charge window 40–80% with a smart plug or Samsung's 85% cap; temperature guard via Termux:API; remove any case; monthly check. Stop using a swollen battery immediately. |
| Overheating with camera + screen + voice together | Camera only when the radar sees someone; low-power face; ventilated mount. |
| ESP32 on 2.4 GHz only; mesh band steering | A dedicated 2.4 GHz SSID for devices. |
| IR is one-way | Infer state from temperature; resend after power returns. |
| Tablet weight on a motor | Lazy-susan bearing carries the load; the motor only turns it. |
| Walker: fake 360° servos, weak batteries (GrowBot's top two failures) | Buy from one vetted supplier; hold-test every servo; lithium AA cells. |
| Mains wiring | Never touch mains. The dock uses a 12 V adapter; outage sensing is by heartbeat, not mains sensing. |

## Project risks

| Risk | What to do |
|---|---|
| Scope explosion (74 use cases) | Phases with a "done when" test each. Nothing from a later phase starts before the current one is done. |
| Costs creeping up | Per-agent budgets and a monthly hard stop; the Lean preset is about ₹610/month. |
| Burnout | 10–12 hours a week, one demo per phase, and the Lab's task board as the only to-do list. |
| Research going stale | Every archive entry is dated; the Scout re-checks anything older than 90 days. |
