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
