# Decision log

| # | Decision | Status | Why |
|---|---|---|---|
| D1 | Personal project, not a business | Decided (27 Sep) | Your call. GrowBot's noncommercial licence then allows reuse. |
| D2 | The Soul Core is a Cloudflare Durable Object (Agents SDK) | Proposed | One writer per soul, WebSockets, alarms, SQLite, MCP hosting and email in one free-tier platform. The alternative is Supabase (Postgres, Realtime, pgvector), but free projects pause when idle and it has no single-writer primitive. |
| D3 | iPhone = web app + Shortcuts + Siri; native app deferred | Proposed | Covers location, SMS, NFC, Focus and push today. A native app only buys BLE and background audio. |
| D4 | Swiggy only through Claude/ChatGPT connectors | Decided | Swiggy's terms forbid third-party apps. |
| D5 | Camera off by default; radar for presence | Proposed | Privacy, heat, battery. |
| D6 | Default listening mode is "Ambient · me" | Proposed | Keeps your life, not other people's. "Conversations" mode is opt-in. |
| D7 | Models: Gemini Flash for voice, Whisper for transcription, Claude Sonnet 5 on Batch for the dream, on-device for SMS | Proposed | Best fit per task; about ₹610/month on the Lean preset. |
| D8 | Tablet path (Android Chrome vs iPad Safari) | Open | Run the Device Check on the tablet first. |
| D9 | Name and wake phrase | Open | Test "Jeevo" against "Jio" ads. |
| D10 | Chat front door: Telegram first, WhatsApp later | Proposed | Free and instant vs Meta business setup. |
| D11 | Languages: English and Hindi only | Decided (27 Sep) | Your call; Kannada removed everywhere. |
| D12 | The home body is the rooted Fire 7 (LineageOS) | Decided (27 Sep) | Root gives boot services, no Doze, charge control and USB-OTG serial to the legs. Resolves D8. |
| D13 | Merge with GrowBot's principles: one soul, many bodies, learn in life | Decided (27 Sep) | See 10-growbot-fusion.md. |
| D14 | Legs for both docks: Strider (Fire 7) and Walker (iPhone) | Decided (27 Sep) | Legs over wheels, as GrowBot argues. |
| D15 | A small iOS companion app is in scope | Proposed | Needed for Bluetooth to the Pixel keychain and Halo case outside home. |
| D16 | Ather through allowed routes only (Bluetooth ride mode, smart-plug charging) | Proposed | No public API; community APIs are unofficial. |
