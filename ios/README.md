# Jeevo for iPhone

Two ways to have Jeevo on the iPhone. Use both.

## 1. The web app (works today, gets push notifications)
Open your hub's **https** address in Safari (`https://jeevo-fire7.<tailnet>.ts.net/app/?token=…`, see the build guide, part C),
then Share → **Add to Home Screen**. Open Jeevo from the Home Screen → Settings → **Enable here** for notifications
(iOS 16.4+). That's the whole app: Today, Ride, Life, Inbox, Memory, Crew, Settings, the face and the Ask bar.

## 2. The native app (Siri, widgets, Apple Health)
What it adds on top of the web app:
- **Siri / Action button:** "Ask Jeevo", "Remind me with Jeevo", "Tell Jeevo" (App Intents; they run without opening the app).
- **Widgets:** Home Screen (small, medium) and Lock Screen: mood, next thing, scooter %, tasks.
- **Apple Health:** steps, active energy, last night's sleep, resting heart rate → your hub.
- The full Jeevo web app inside it.

Build it (needs a Mac with Xcode 15+; a free Apple ID works, the app re-signs every 7 days):
```sh
brew install xcodegen
cd ios && xcodegen          # makes Jeevo.xcodeproj from project.yml
open Jeevo.xcodeproj        # Signing & Capabilities → your team, for both targets; plug in the iPhone; Run
```
Then in the app: ⚙︎ → hub address (`http://<fire7-tailscale-name>:8047`) and token → Test → Allow Health and sync now.
For the widget: add it, long-press → Edit Widget → same address and token.

Status: written against iOS 17 SDK APIs (App Intents, WidgetKit AppIntentConfiguration, HealthKit async descriptors) but **not
compiled here** (no Mac in this environment). Expect a round of small Xcode fixes on first build; send me the errors.
Push notifications come from the web app, not the native one (native push needs a paid developer account).
