# Integrations (checked September 2026)

<!-- Generated from site/src/data.js by site/build.mjs. Edit the data, not this file. -->

## Commerce

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Swiggy Food · Instamart · Dineout** | Works today | Official MCP servers (mcp.swiggy.com/food, /im, /dineout) with OAuth, used from Claude, ChatGPT or VS Code. Jeevo supplies lists and context through its own MCP. | Free | Cash on delivery (Swiggy Money added Sep 2026); orders can't be cancelled; Dineout free bookings only; third-party apps not permitted; keep the app closed during a session. | [Swiggy MCP manifest](https://github.com/Swiggy/swiggy-mcp-server-manifest) |
| **Zomato** | Works today | Zomato's MCP server exposes search, menu, cart and checkout to AI chat apps. | Free | Check current terms before relying on it; District by Zomato is slated for Alexa+. | [Analytics Vidhya, Nov 2025](https://www.analyticsvidhya.com/blog/2025/11/zomato-mcp-server/) |
| **Zepto** | Waiting | Zepto Cafe tested an ordering agent (Dec 2025). No official public MCP. | — | Community 'Zepto MCPs' are scrapers: skip them. | [Medianama, Dec 2025](https://www.medianama.com/2025/12/223-zepto-cafe-ai-agent-orders-users/) |
| **Blinkit** | Waiting | No official MCP or API. | — | Use Instamart for agent ordering. | [Tru Commerce analysis](https://trucommerce.ai/insights/india-quick-commerce-agentic-mcp) |

## Transit

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Namma Metro (BMRCL)** | Workaround | Static GTFS on the open-data portal shared with BMTC for timetables. Tickets through BMRCL's WhatsApp bot, the Namma Metro app, or ONDC apps (Rapido, Namma Yatri, Redbus, Tummoc and others). | Free | No realtime feed and no ticketing API. Purple, Green, Yellow open; Pink (Kalena Agrahara–Tavarekere) targeted for late Sep 2026; Pink phase 2 around Mar 2027. | [Deccan Herald: BMRCL + BMTC open data](https://www.deccanherald.com/india/karnataka/bengaluru/in-historic-first-namma-metro-bmtc-open-up-their-data-to-help-public-transport-users-in-bengaluru-3160955) |
| **BMTC buses** | Works today | Official GTFS on the common portal; the unofficial Vonter/bmtc-gtfs dataset as a backup. | Free | Realtime promised later; treat times as schedules. | [Vonter/bmtc-gtfs](https://github.com/Vonter/bmtc-gtfs) |
| **Google Maps Routes API** | Works today | Traffic-aware ETAs for walking, driving and transit. | 10,000 free Essentials calls/month | Beyond that, paid tiers. Cache aggressively. | [Routes API billing](https://developers.google.com/maps/documentation/routes/usage-and-billing) |
| **Uber · Namma Yatri · Rapido** | Workaround | Deep links open the app with pickup and drop filled. | Free | No fare estimates (Uber's are restricted). | [Namma Yatri (open source)](https://github.com/nammayatri) |

## Data

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Open-Meteo** | Works today | Weather, rain windows and air quality with no API key. | Free (non-commercial) | Modelled AQI, not a sensor reading. | [open-meteo.com](https://open-meteo.com/) |
| **Google Calendar and Gmail** | Works today | Official APIs or a private ICS feed. | Free | Keep scopes read-only. | [Google Calendar API](https://developers.google.com/calendar) |
| **Apple Health** | Works today | Read daily summaries in a Shortcut and post them. | Free | Summaries only. | [Shortcuts guide](https://support.apple.com/guide/shortcuts/welcome/ios) |

## Payments

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **UPI deep links** | Works today | upi://pay links open your UPI app with payee, amount and note filled; you enter the PIN. | Free | Behaviour differs per app on iOS; fallback is copying the UPI ID. | [NPCI](https://www.npci.org.in/) |
| **NPCI agent payments** | Waiting | UPI Circle and Reserve Pay let a user delegate small payments; NPCI's Unified Agent Protocol was expected around Global Fintech Fest 2026. ChatGPT + Razorpay piloted it. | — | Not available to individuals yet. Pine Labs P3P (Jun 2026) and Mastercard Agent Pay (Feb 2026) are merchant-side. | [Business Standard, Jul 2026](https://www.business-standard.com/finance/news/india-may-allow-agentic-ai-led-upi-transactions-under-new-npci-protocol-126070801343_1.html) |
| **Bank and UPI SMS** | Works today | iOS Shortcuts 'Message' automation (run immediately) on sender or keyword; parsed on the phone. | Free | Build the OTP firewall first. | [Apple: communication triggers](https://support.apple.com/guide/shortcuts/communication-triggers-apdd711f9dff/ios) |
| **Splitwise** | Works today | Official API for splits. | Free | OAuth. | [Splitwise API](https://dev.splitwise.com/) |

## Voice

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Alexa custom skill** | Works today | A development-mode skill on your own account (en-IN, hi-IN) whose endpoint is the Soul Core. | Free | Short response window; no certification needed for your own devices. | [Alexa Skills Kit](https://developer.amazon.com/en-US/alexa/alexa-skills-kit) |
| **Voice Monkey** | Workaround | REST API that triggers Alexa routines and announcements; available on Amazon.in. | Free tier + paid | Third-party relay; keep announcements generic. | [Voice Monkey API](https://voicemonkey.io/docs/api) |
| **Alexa+ (India)** | Waiting | Launched 16 Sep 2026 in early access with Hindi and Hinglish; Swiggy, District, EazyDiner and MakeMyTrip integrations planned. Its MCP Toolkit lets an MCP server plug in, but only in the US. | Free in early access; free with Prime; ₹2,000/month otherwise | Wait for the MCP Toolkit in India; it requires Streamable HTTP. | [Alexa+ MCP Toolkit](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html) |
| **Telegram Bot API** | Works today | Free bot as a chat front door; voice notes supported. | Free | None that matter here. | [Telegram Bot API](https://core.telegram.org/bots/api) |
| **WhatsApp Cloud API** | Works today | Official API with a separate number; replies inside the 24-hour window. | From 1 Oct 2026: 1,000 service messages/month free per number, then ₹0.115; utility ₹0.115 | Meta business setup; not for your personal number. | [WhatsApp pricing, Oct 2026](https://mark360.ai/blog/whatsapp-service-message-pricing-october-1-2026) |

## AI

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Claude connectors (remote MCP)** | Works today | Add the Jeevo MCP URL on claude.ai; it syncs to the iOS app. | Free plan: 1 custom connector | Server must be reachable from the public internet. | [Claude Help Center](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) |
| **ChatGPT developer mode** | Works today | Add MCP servers as connectors (how Swiggy's integration is used). | Plan-dependent | Developer mode must be on. | [Medianama, Jan 2026](https://www.medianama.com/2026/01/223-ordering-chatgpt-swiggy-services-working/) |
| **Gemini API** | Works today | 3.x Flash for conversation and vision; 2.5 / 3.5 Flash-Lite for cheap classification; Live API for realtime voice. | Flash $0.75/$3.75 per M until 31 Dec 2026, then $1.50/$7.50; 2.5 Flash-Lite $0.10/$0.40; Live ≈ $0.005/min in | Free tier data may be used to improve Google's products: not for your lifelog. | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| **Claude API** | Works today | Sonnet 5 for reflection and tool-heavy work; Haiku 4.5 for fast classification; Batch API at half price for the nightly dream. | Haiku 4.5 $1/$5 · Sonnet 5 $2/$10 · Opus 5 $5/$25 per M tokens | Or run deep work inside your Claude subscription through the connector. | [Anthropic pricing](https://docs.anthropic.com/en/docs/about-claude/pricing) |
| **Sarvam AI** | Works today | Bulbul v3 voices in 11 Indian languages including Kannada; Saaras speech-to-text in 22. | TTS ₹30 per 10k characters (beta); ₹100 free credits | Check data-use terms for lifelog audio. | [Sarvam pricing](https://www.sarvam.ai/api-pricing) |
| **Workers AI (Cloudflare)** | Works today | Whisper large-v3-turbo transcription and bge-m3 multilingual embeddings next to the Soul Core. | Whisper $0.00051/min; 10,000 free neurons/day ≈ 3.5 h of Whisper; bge-m3 $0.01 per M tokens | Whisper is weak on Kannada and code-mixed speech. | [Workers AI: Whisper](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/) |

## Platform

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Cloudflare Workers + Durable Objects** | Works today | The Soul Core: one Durable Object per soul, WebSockets, alarms, SQLite storage, the Agents SDK for the crew. | Free plan ≈ 100k requests/day; SQLite storage not billed on Free | Heavy CPU per request needs the paid plan ($5/month). | [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) |
| **Cloudflare Email Routing** | Works today | Your own address; an Email Worker parses every forwarded mail. | Free | Needs a domain on Cloudflare (~₹600–900/year). | [Email Workers](https://developers.cloudflare.com/email-routing/email-workers/) |
| **Apple Shortcuts** | Works today | Automations on Alarm, Wi-Fi, NFC, Message, Email, Focus, Charger, Bluetooth/CarPlay, arrive/leave; 'Use Model' runs Apple's model on-device on Apple Intelligence iPhones. | Free | Your iPhone model decides Action button and on-device model support. | [Apple: Intelligence in Shortcuts](https://support.apple.com/guide/iphone/use-apple-intelligence-in-shortcuts-iph78c41eaf8/26/ios/26) |
| **iOS web app (PWA)** | Works today | Home-screen web app with Web Push (iOS 16.4+). | Free | No Web Bluetooth or NFC; audio stops when locked or in the background; speech recognition unreliable in standalone mode. | [PWA iOS limits, 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) |
| **Android tablet (Chrome)** | Works today | Web Bluetooth, Web Speech (en-IN, hi-IN, kn-IN), Wake Lock, Battery Status, Web Share; Termux for local bridges. | Free | Old Android may be stuck on an older Chrome: run the Device Check. | [caniuse: Web Bluetooth](https://caniuse.com/web-bluetooth) |

## Home

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Philips WiZ** | Works today | Local UDP JSON on port 38899. | Free | Send from the ESP32 or Termux, not the browser. | [pywizlight](https://github.com/sbidy/pywizlight) |
| **Tuya devices (Wipro, Syska…)** | Workaround | tinytuya over the LAN after a one-time key pull. | Free | Tuya's cloud developer trial needs renewal; LAN keys change if you re-pair. | [tinytuya](https://github.com/jasonacox/tinytuya) |
| **TP-Link Tapo** | Workaround | Community Python/Rust libraries; no published local API. | Free | Firmware updates can break it. | [mihai-dinculescu/tapo](https://github.com/mihai-dinculescu/tapo) |
| **IR remotes (AC, TV, fans)** | DIY hardware | ESP32 + IR LED + receiver with IRremoteESP8266. | ≈ ₹100 in parts | One-way: no state feedback. | [IRremoteESP8266](https://github.com/crankyoldgit/IRremoteESP8266) |

## Hardware

| Service | Status | How Jeevo uses it | Cost | The catch | Source |
|---|---|---|---|---|---|
| **Omi pendant** | Works today | Open-source wearable firmware and app (MIT) on the XIAO nRF52840 — the reference for the pendant keychain. | Board ≈ ₹1,100–1,600 | BLE to a phone app; iOS needs their app or yours. | [BasedHardware/omi](https://github.com/BasedHardware/omi) |
| **GrowBot** | Works today | Body protocol (pose, act, routine, stop), firmware and walk policies for the walker body. | Free (personal use) | PolyForm Noncommercial code; CC BY-NC hardware. | [britcruise9/GrowBot](https://github.com/britcruise9/GrowBot) |

## All sources

- [Swiggy MCP manifest (GitHub)](https://github.com/Swiggy/swiggy-mcp-server-manifest)
- [Swiggy Money added to MCP (Medianama, Sep 2026)](https://www.medianama.com/2026/09/223-swiggy-money-mcp-agentic-payments/)
- [Swiggy Builders Club (AWS press, Apr 2026)](https://press.aboutamazon.com/aws/2026/4/swiggy-to-launch-builders-club-giving-developers-and-enterprises-access-to-its-ai-commerce-stack)
- [Zomato MCP server (Analytics Vidhya, Nov 2025)](https://www.analyticsvidhya.com/blog/2025/11/zomato-mcp-server/)
- [Zepto Cafe agent test (Medianama, Dec 2025)](https://www.medianama.com/2025/12/223-zepto-cafe-ai-agent-orders-users/)
- [Alexa+ India launch (TechCrunch, 16 Sep 2026)](https://techcrunch.com/2026/09/16/amazon-launches-alexa-in-india-with-hindi-support/)
- [Alexa+ MCP Toolkit overview](https://developer.amazon.com/docs/alexaplus/add-ons/mcp-toolkit-overview.html)
- [Voice Monkey API](https://voicemonkey.io/docs/api)
- [NPCI agentic UPI protocol (Business Standard, Jul 2026)](https://www.business-standard.com/finance/news/india-may-allow-agentic-ai-led-upi-transactions-under-new-npci-protocol-126070801343_1.html)
- [Namma Metro ONDC ticketing apps (Hans India)](https://www.thehansindia.com/bengaluru/bengaluru-metro-tickets-now-bookable-on-9-popular-apps-via-ondc-integration-986523)
- [BMRCL + BMTC open GTFS (Deccan Herald)](https://www.deccanherald.com/india/karnataka/bengaluru/in-historic-first-namma-metro-bmtc-open-up-their-data-to-help-public-transport-users-in-bengaluru-3160955)
- [Pink Line status (Wikipedia)](https://en.wikipedia.org/wiki/Pink_Line_(Namma_Metro))
- [Metro timings (bengalurumetro.in, unofficial)](https://bengalurumetro.in/bangalore-metro-timings.html)
- [Routes API usage and billing](https://developers.google.com/maps/documentation/routes/usage-and-billing)
- [WhatsApp service message pricing from 1 Oct 2026](https://mark360.ai/blog/whatsapp-service-message-pricing-october-1-2026)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objects SQLite storage billing](https://developers.cloudflare.com/changelog/2026-01-07-durable-objects-sqlite-storage-billing)
- [Cloudflare Email Workers](https://developers.cloudflare.com/email-routing/email-workers/)
- [Workers AI Whisper large-v3-turbo](https://developers.cloudflare.com/workers-ai/models/whisper-large-v3-turbo/)
- [Workers AI bge-m3](https://developers.cloudflare.com/workers-ai/models/bge-m3/)
- [Claude custom connectors (remote MCP)](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini API pricing breakdown, Sep 2026 (Puter)](https://developer.puter.com/tutorials/gemini-api-pricing/)
- [Sarvam API pricing](https://www.sarvam.ai/api-pricing)
- [Bulbul v3 (Sarvam)](https://www.sarvam.ai/blogs/bulbul-v3)
- [Apple: Intelligence in Shortcuts (iOS 26)](https://support.apple.com/guide/iphone/use-apple-intelligence-in-shortcuts-iph78c41eaf8/26/ios/26)
- [Apple: communication triggers in Shortcuts](https://support.apple.com/guide/shortcuts/communication-triggers-apdd711f9dff/ios)
- [PWA limits on iOS, 2026 (MagicBell)](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Speech recognition in PWAs (firt.dev, iOS 14.5)](https://firt.dev/ios-14.5/)
- [DPDP Act s.3 personal/domestic exemption](https://tlh.law/insights/dpdp-acts-exemption-of-personal-and-domestic-purpose)
- [Omi open-source wearable](https://github.com/BasedHardware/omi)
- [openWakeWord](https://github.com/dscripka/openWakeWord)
- [tinytuya](https://github.com/jasonacox/tinytuya)
- [XIAO ESP32S3 Sense price (Robocraze)](https://robocraze.com/products/seeed-studio-xiao-esp32s3-sense)
- [GrowBot repository](https://github.com/britcruise9/GrowBot)
