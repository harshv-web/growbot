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

Tips: set each automation to **Run Immediately**; keep the token in a Text action at the top of each Shortcut; if Tailscale is off, the Shortcut simply fails quietly.
