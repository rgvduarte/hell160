# HELL160 · Product

Durable product truth for design and copy decisions. Visual direction lives in `DESIGN.md`.

## What it is

The 2027 webapp of **HELL160 — Shadows and Dust**, an ultra-endurance event in A-do-Pinto (Serpa, Beja, Alentejo, Portugal), on the left bank of the Guadiana river.

- **HELL160:** 164.6 km, 2648 m D+, 36 h limit, self-sufficient between aid stations, GPS navigation, mandatory gear checked at the start and on course. It starts on a Friday at 22:00 in early July, from the Pavilhão Polivalente de A-do-Pinto. The course is a circuit on GR15 and GR15.2: dirt tracks, montado, villages and the Guadiana. There are 13 aid stations, 3 of them life bases.
- **HELL100 and relays:** solo, pairs and teams of four.
- **HELL100 Bike:** moving to February (2027 date to be announced), with a possible cross-border course with Spain.

## Who organises it

The **Associação Desportiva e Cultural HELL160** (sports and cultural association), based in A-do-Pinto. It is in its first year and has about 50 members. Its manifesto: *"Uma região com memória. Um futuro por construir."* It was born to keep alive a region fighting desertification, lost opportunities and oblivion, out of the memory of the parents and grandparents who worked this land.

- **The name** is a metaphor for a region that is little known, ignored or associated only with heat and hardship. The aim is to turn that into discovery, opportunity and recognition.
- **The event came first.** The first edition brought 320 athletes to A-do-Pinto. The wider purpose is integrated regional development: sport attracts people, culture preserves identity, education opens horizons, social action brings generations together, and heritage keeps the collective memory alive.
- **Projects:** Casa HELL160; Centro Interpretativo Memória Viva da Margem Esquerda do Guadiana; Bosque e Caminho dos Lendários; Fórum de Desenvolvimento Rural Além Guadiana; and the *A do Pinto 2035* vision (community, economic development, knowledge and innovation). The manifesto names these projects without describing them, so the site must not invent descriptions, dates or figures for them.
- **Role:** "o cérebro e o coração de uma região" (the brain that plans and the heart that keeps the link to people and roots).
- **Signature:** "Desporto. Cultura. Comunidade. Um território, um propósito, um futuro."

The manifesto is reproduced on `/associacao` in the association's own words. Copy about the association comes from it and nothing else.

## Why it exists

HELL160 is organised to bring health and safety resources to the villages on the left bank of the Guadiana, which are far from hospitals.

1. **The cause.** The event funds a network of defibrillators in the villages along the course, together with basic life-support training for residents and volunteers. Two devices have been secured so far. This is the public reason for the event and should lead the story.
2. **Accommodation in the villages.** The area has no hotels. Village families open their houses to athletes and their families at 50–80 € per night, and the money stays with the hosts.
3. **Safety on course.** Every athlete is tracked in real time: the HELL160 app is mandatory, a GPS watch acts as a second source, and a satellite tracker can be rented. There are medical posts at the life bases and rescue teams along the course.

Internal matters (past incidents, technical make-or-buy decisions, investors and institutional partners) belong in the partners' briefing. They never go on the public site or in this public repository.

## Brand

The official HELL160 logo (from the association's final artwork, `HELL_160_-_Logos_AF_RGB.pdf`) is a flame plus HELL160 with the tagline SHADOWS AND DUST. The flame and the 160 use a red-to-orange gradient (#E20613 → #F8AB02). HELL is #7A6A58 on light backgrounds and #CABA9F on dark ones. The tagline is #4B3C31 on light backgrounds and white on dark ones. The versions are horizontal, centred and vertical, each with a negative. A compact version without the tagline (header, small sizes) and the flame alone (favicon, avatar) are cut from the same artwork. The fire-texture versions in the PDF are not used on the site. The files live in `public/brand`, and the inline geometry in `src/components/logoArt.ts` is generated from the PDF and must not be edited by hand. The site's colours all come from the logo: white and light sand panels (#F2EEE7), dark-brown ink (#1F1813, #4B3C31, #6F604F), the warm black of the negative for night sections, and one action colour, the orange of the 160 (#F17307 with dark text, #F59403 on hover, #B34C07 for small text and focus rings on light backgrounds). The logo red appears only in the logo itself and in the SOS emergency state. The earlier custom "O Dorsal" mark is retired.

## Audiences

- **Athletes:** PT, ES and international. They register, pay, upload a medical certificate, check gear, test GPS and book a house. They are often on a phone.
- **Families and supporters:** they book houses and follow the live tracking, often at night and outdoors.
- **Hosts:** village residents, often older and not very digital. They register a house, accept requests and get paid.
- **Organisation and rescue:** they validate, confirm, export and watch alerts. Accuracy matters more than expression for them.
- **Sponsors:** they need a clear way to support the cause.
- **Community and institutions:** members, partners and public bodies who want to understand the association behind the race.

## Surfaces and visitor mode

- **Persuade:** home, the cause, who we are (the association), races, territory, support, brand.
- **Operate:** registration, accommodation booking, host area, athlete area, back-office, live tracking.

## Constraints

- Static hosting (GitHub Pages) and no backend yet. Data stays in the browser behind `src/lib/store.ts`, and payments are simulated, labelled as such.
- 2027 dates, prices and course are provisional, based on the 2026 regulations. Maps, elevation and temperatures are schematic and must be labelled as such. The schematic map must never be offered for navigation.
- No real photography yet. Placeholders must be honest, never fake photos or clip-art scenes.
- WCAG AA, `prefers-reduced-motion`, and 390 px phones as a first-class target.

## Voice

The UI is in European Portuguese (PT-PT). It is concrete and dry, with the understatement of the Alentejo. No ad slogans, no emoji, no "it's not X — it's Y" constructions, no em-dash habit. Numbers and facts beat adjectives. Anything simulated or provisional says so plainly.
