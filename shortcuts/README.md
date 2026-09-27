# iPhone Shortcuts for Jeevo

Every Shortcut ends in one **Get Contents of URL** action:
- URL: `http://<fire7-tailscale-name>:8047/input`
- Method: POST · Header `Authorization: Bearer <HUB_TOKEN>` · Request body JSON
- Then **Show Result** / **Speak Text** on the `line` key of the response.

| Shortcut | Trigger | JSON body |
|---|---|---|
| **Ask Jeevo** | "Hey Siri, ask Jeevo", Action button, or Back Tap | `{"kind":"voice","text":"<Dictated Text>","from":"iphone"}` (Dictate Text action first; set its language to Hindi when you want) |
| **Tell Jeevo** | Share sheet (text, URL, image) | `{"kind":"share","text":"<Shortcut Input>","from":"iphone"}` |
| **Ride start** | Automation: Bluetooth connects to the Ather dash | `{"kind":"telemetry","text":"ride started","from":"ather-bt"}` · also turn on a "Riding" Focus |
| **Ride end** | Automation: Bluetooth disconnects from the dash | `{"kind":"telemetry","text":"ride ended","data":{"lat":<Latitude>,"lon":<Longitude>},"from":"ather-bt"}` (Get Current Location first) |
| **At office / left office** | Automation: Wi-Fi joins/leaves the office network, or arrive/leave a location | `{"kind":"telemetry","text":"arrived at office","from":"iphone"}` |
| **Home** | Automation: joins home Wi-Fi | `{"kind":"telemetry","text":"arrived home","from":"iphone"}` |
| **Alarm stopped** | Automation: Alarm is stopped | `{"kind":"telemetry","text":"woke up","from":"iphone"}` |
| **Bank SMS** | Automation: Message from your bank sender, contains "debited" | Use **Match Text** for the amount and merchant, then `{"kind":"sms","text":"debited ₹<amount> at <merchant>","from":"bank"}`. Add an **If** that stops when the message contains "OTP". Never send the whole SMS. |
| **Helmet tap** | Automation: NFC tag "helmet" | `{"kind":"nfc","data":{"tag":"helmet"}}` |
| **Door tap / bed tap / pill tap** | NFC tags | `{"kind":"nfc","data":{"tag":"door"}}` etc. |
| **How was today** | Automation: 10:30 pm, Ask for Input | `{"kind":"text","text":"today felt: <answer>","from":"iphone"}` |

## Phase 1 additions: know every little thing

| Shortcut | Trigger | JSON body |
|---|---|---|
| **Daily Sync** | Automation: every day at 10:00 pm | Find Health Samples (Steps today → Calculate Statistics → Sum; Sleep last night → Sum of duration in hours; Resting Heart Rate latest; Active Energy sum), Get Screen Time is not available to Shortcuts, so skip it. Then `{"kind":"sync","data":{"health":{"steps":<n>,"sleepHours":<h>,"restingHR":<bpm>,"activeKcal":<kcal>}},"from":"iphone"}`. The native app's "sync now" does the same. |
| **Focus on / off** | Automation: when any Focus turns on / off (make one per Focus: Work, Sleep, Riding) | `{"kind":"focus","data":{"mode":"Work","on":true},"from":"iphone"}` / `…"on":false` → Jeevo holds non-urgent nudges and the keychain goes "focused" |
| **Arrive / leave a place** | Automation: arrive at / leave Home, Office, Gym, Parents' | `{"kind":"location","data":{"place":"office","stage":"arrive","lat":<lat>,"lon":<lon>},"from":"iphone"}` (`"stage":"leave"` when leaving) |
| **Expense** | Share sheet or "Hey Siri, log expense" | `{"kind":"expense","data":{"amount":<n>,"what":"<text>"},"from":"iphone"}` |
| **Bank credit** | Automation: message contains "credited" | `{"kind":"sms","text":"credited ₹<amount>","from":"bank"}` |
| **Bill due** | Automation: message contains "due" from a biller | `{"kind":"sms","text":"<biller> bill ₹<amount> due on <dd/mm>","from":"<biller>"}` |
| **Remind me** | Siri or Action button | `{"kind":"voice","text":"remind me to <Dictated Text>","from":"iphone"}` (or use the native app's "Remind me with Jeevo") |

The native app (`ios/`) adds Siri phrases, widgets and a one-tap Apple Health sync. The web app (Home Screen) adds push notifications.

Tips: set each automation to **Run Immediately**; keep the token in a Text action at the top of each Shortcut; if Tailscale is off, the Shortcut simply fails quietly.
