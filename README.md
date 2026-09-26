# Jeevo

**One soul. Every surface.** A personal, multi-agent AI that lives in an old tablet at home, an iPhone, a keychain, a printed phone case and an ESP32 dock. It listens, keeps a private life log, learns about its owner, reflects every night, and plugs into the Bengaluru services he uses: Namma Metro, Swiggy and Instamart, Alexa, UPI and bank SMS, WhatsApp and Telegram, and Claude and ChatGPT through an MCP connector.

This repo holds the concept, the research, and the Lab site. It's a personal project (concept v2, 27 Sep 2026), inspired by Brit Cruise's [GrowBot](https://github.com/britcruise9/GrowBot).

## Read

| Doc | What's in it |
|---|---|
| [01 · Concept](docs/01-concept.md) | What Jeevo is, what changed from v1, principles, the cast, open questions |
| [02 · Architecture](docs/02-architecture.md) | Soul Core, presences, ears and life log, privacy tiers, the 11-agent crew, model router, Model of Me, attention router, sync |
| [03 · Bodies and hardware](docs/03-bodies-and-hardware.md) | Tablet, iPhone, keychain, case, dock, walker; parts in ₹; device capability matrix |
| [04 · Use cases](docs/04-use-cases.md) | 74 use cases with triggers, flows and edge cases |
| [05 · Integrations](docs/05-integrations.md) | 37 services checked in Sep 2026, with costs, catches and sources |
| [06 · Build plan](docs/06-build-plan.md) | Eight phases, demos, done-when tests, running costs |
| [07 · Risks and edge cases](docs/07-risks-and-edge-cases.md) | Platform limits, service catches, privacy, hardware safety |
| [08 · Research log](docs/08-research-log.md) | What the GrowBot Discord (14,390 messages) and earlier briefs taught us |
| [09 · Decisions](docs/09-decisions.md) | Decided, proposed and open |

## The Lab site

`site/` builds a single-file page with the concept, a transit-map system diagram, the use-case library, the integration matrix and the plan, plus working tools: a device check, an attention-router sandbox, a crew budget calculator, a sync simulator, an "Ask Claude" console, a build board, and a synced Archive. The board, the Archive and Ask Claude need the page to be opened as a Claude artifact; everything else works in any browser.

```sh
node site/build.mjs              # → site/dist/jeevo-lab.html and docs/03–06
```

Edit `site/src/data.js` (use cases, integrations, crew, phases, prices); docs 03–06 are generated from it.

## Licence note

Personal and noncommercial. GrowBot's code is PolyForm Noncommercial and its hardware CC BY-NC; anything reused from it stays under those terms.
