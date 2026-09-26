# Jeevo

**Give your old things a soul.** A personal, multi-agent AI creature, built on GrowBot's principles, that is born in a rooted Fire 7, learns to walk on legs, and moves between an iPhone, a keychain with a face, a phone case with an e-paper back and an ESP32 dock. It listens, keeps a private life log, learns about its owner, reflects every night, and plugs into the Bengaluru services he uses: Namma Metro, Swiggy and Instamart, Alexa, UPI and bank SMS, WhatsApp and Telegram, and Claude and ChatGPT through an MCP connector.

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
| [10 · GrowBot fusion (concept v3)](docs/10-growbot-fusion.md) | Soul file v1, one soul across many bodies, learning to walk in life, the emotion engine, full access, knowledge sharing |
| [11 · Prototypes](docs/11-prototypes.md) | Strider, Walker, Perch, Pixel keychain, Halo case, apps, Ather touchpoint |
| [12 · Build and content plan](docs/12-build-and-content-plan.md) | Phases B0–B9 and the ten-episode content journey |

## Prototypes

`prototypes/` holds the first code: `soul/emotion.js` (emotion engine), `legs/learner.js` (gait learner + on-device forward model), `legs/gait_cpg.py` (Pico rhythm firmware, GrowBot-compatible), `keychain-pixel/pixel.ino`, `case-halo/halo.ino`, and `fire7/` (Termux body daemon + setup). The JS modules are smoke-tested; the firmware is untested.

## The product site

`web/` builds a five-page Three.js site (Home, Soul, Bodies, Journey, Live Lab) that runs the real emotion engine and learner in the browser: `node web/build.mjs` → `web/dist` (publish) and `web/preview` (local; drop `three.min.js` r128 into `web/preview/assets`).

## The Lab site

`site/` builds a single-file page with the concept, a transit-map system diagram, the use-case library, the integration matrix and the plan, plus working tools: a device check, an attention-router sandbox, a crew budget calculator, a sync simulator, an "Ask Claude" console, a build board, and a synced Archive. The board, the Archive and Ask Claude need the page to be opened as a Claude artifact; everything else works in any browser.

```sh
node site/build.mjs              # → site/dist/jeevo-lab.html and docs/03–06
```

Edit `site/src/data.js` (use cases, integrations, crew, phases, prices); docs 03–06 are generated from it.

## Licence note

Personal and noncommercial. GrowBot's code is PolyForm Noncommercial and its hardware CC BY-NC; anything reused from it stays under those terms.
