# HELL160 · Product

Durable product truth for design and copy decisions. Visual direction lives in `DESIGN.md`.

## What it is

The 2027 webapp of **HELL160 — Shadows and Dust**, an ultra-endurance event in A-do-Pinto (Serpa, Beja, Alentejo, Portugal), on the left bank of the Guadiana river.

- **HELL160:** 164.6 km, 2648 m D+, 36 h limit, total self-sufficiency, GPS navigation, mandatory gear checked at the start and on course. It starts on a Friday at 22:00 in early July, from the Pavilhão Polivalente de A-do-Pinto. The course is a circuit on GR15 and GR15.2: dirt tracks, montado, villages and the Guadiana. There are 13 aid stations, 3 of them life bases.
- **HELL100 and relays:** solo, pairs and teams of four.
- **HELL100 Bike:** moving to February (2027 date to be announced), with a possible cross-border course with Spain.

## Why it exists

HELL160 is organised to bring health and safety resources to the villages on the left bank of the Guadiana, which are far from hospitals.

1. **The cause.** The event funds a network of defibrillators in the villages along the course, together with basic life-support training for residents and volunteers. Two devices have been secured so far. This is the public reason for the event and should lead the story.
2. **Accommodation in the villages.** The area has no hotels. Village families open their houses to athletes and their families at 50–80 € per night, and the money stays with the hosts.
3. **Safety on course.** Every athlete is tracked in real time: the HELL160 app is mandatory, a GPS watch acts as a second source, and a satellite tracker can be rented. There are medical posts at the life bases and rescue teams along the course.

Internal matters (past incidents, technical make-or-buy decisions, investors and institutional partners) belong in the partners' briefing. They never go on the public site or in this public repository.

## Audiences

- **Athletes:** PT, ES and international. They register, pay, upload a medical certificate, check gear, test GPS and book a house. They are often on a phone.
- **Families and supporters:** they book houses and follow the live tracking, often at night and outdoors.
- **Hosts:** village residents, often older and not very digital. They register a house, accept requests and get paid.
- **Organisation and rescue:** they validate, confirm, export and watch alerts. Accuracy matters more than expression for them.
- **Sponsors:** they need a clear way to support the cause.

## Surfaces and visitor mode

- **Persuade:** home, the cause, races, territory, support.
- **Operate:** registration, accommodation booking, host area, athlete area, back-office, live tracking.

## Constraints

- Static hosting (GitHub Pages) and no backend yet. Data stays in the browser behind `src/lib/store.ts`, and payments are simulated, labelled as such.
- 2027 dates, prices and course are provisional, based on the 2026 regulations. Maps, elevation and temperatures are schematic and must be labelled as such. The schematic map must never be offered for navigation.
- No real photography yet. Placeholders must be honest, never fake photos or clip-art scenes.
- WCAG AA, `prefers-reduced-motion`, and 390 px phones as a first-class target.

## Voice

The UI is in European Portuguese (PT-PT). It is concrete and dry, with the understatement of the Alentejo. No ad slogans, no emoji, no "it's not X — it's Y" constructions, no em-dash habit. Numbers and facts beat adjectives. Anything simulated or provisional says so plainly.
