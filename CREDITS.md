# Credits — Mori Guild 3D v3: World Seed

## Code and assets
- **three.js r170**: MIT License, © 2010–2024 three.js authors. A pinned local copy is at `vendor/three-r170.min.js`, with its license in `vendor/three-LICENSE.txt`. No CDN is used.
- **3D models, textures, terrain and the UI** are procedural. They were generated in code in this project (`js/hero.js`, `js/world.js`). The project uses no external model, texture, sound or font files. The UI uses system fonts only.
- **Mori engine** (`js/mori-engine.js`): Robert's Mori engine (Talk, TTS, Beat/DAW, Blue room, adjustSelf), included inline.
- **Robert's world content**: catfolk, Delroth, Mori, Lyra, Juno and Kit, the Mori Doll, Life/LARPy, the Template Painter (Wolfcut, Corset, Pauldron, Stomper, Obsidian Black), Holo Tape, Gothic Rose Dye, Synth: Hologram, Gold Pick, the Weedwake and Tokenbloom potions, builder ranks, Robert's Strider Armor, and Robert's House Rules for the item bench and loot rarity colors. All of it is used by permission of the game's owner (Robert).

- **Planet generator** (`js/planet.js`, `js/seedworld.js`): written for this project. The 3D simplex noise follows Stefan Gustavson's public-domain simplex noise algorithm. The seed hashing (xmur3) and random generator (mulberry32) are well-known public-domain snippets. Region, city and ruler names are generated from syllables written for this project.
- **Delroth reference art**: Robert's own artwork and a photo of his real-life +5 HAT (`/workspace/robert_zip/delroth_refs/`, 5 images). This art guided v3's procedural Delroth: the wide-brim top hat with a velvet skull, thorn horns, a ring of roses and the eyeball rose; charcoal fur, green eyes, red scars and fangs; the gold-filigree coat, vest, gears and pocket watches; the scorpion crystal staff; and the green necrotic aura. © Robert, used by permission. **The reference images are not included in this zip.**

## Game rules: System Reference Document 3.5 (Open Game Content)
The game's rules content comes from the **System Reference Document 3.5**:
- races: human, dwarf, elf, gnome, half-elf, half-orc, halfling
- monsters: dire rat, human skeleton, human zombie, gray ooze
- templates: half-fiend, fiendish, celestial, skeleton, zombie
- d20 attack rolls and AC
- d% treasure and magic item tables, simplified
- magic item creation pricing formulas
- item creation feats and their minimum caster levels
- the spells and metamagic feats named on the item bench

The game uses no text from Deities & Demigods, the Epic Level Handbook, the Arms & Equipment Guide or other non-SRD books. "Lich-touched" is a cosmetic undead tint, not the SRD lich template text. "Dread Necromancer" appears only as Delroth's in-world title; no class rules are reproduced. Undead Catfolk is a race from Robert's world.

### Open Game License v1.0a, Section 15: Copyright Notice
Open Game License v 1.0a Copyright 2000, Wizards of the Coast, Inc.
System Reference Document Copyright 2000-2003, Wizards of the Coast, Inc.; Authors Jonathan Tweet, Monte Cook, Skip Williams, Rich Baker, Andy Collins, David Noonan, Rich Redman, Bruce R. Cordell, John D. Rayner, Eric Cagle, David Ecker, Jennifer Clarke Wilkes, based on original material by E. Gary Gygax and Dave Arneson.

The SRD-derived mechanics in `js/srd.js` and `js/craft.js` are Open Game Content under the OGL v1.0a (https://opengamingfoundation.org/ogl.html). All Product Identity is excluded, including Robert's world, character names, the Mori engine and art direction.

## v3.3
- Templates v2 textures/palettes: derived from photos in Robert's approved "Mori templates" Drive folder (used with permission); only textures/colours are kept, no photos ship.
- Geometry flowers: procedural code written for this project (MIT), no external assets.

## Grounded world pass
Rules behind `js/grounded.js` are original code. The references were read for general ideas only; no textbook text, figures, Bannerlord data, or real-place names are included. Full URLs and licenses are in `GROUNDING.md`.
- OpenStax, *Algebra and Trigonometry 2e* (Jay Abramson and co-authors, Rice University), CC BY-NC-SA 4.0. Roof pitch uses tan and cos.
- Dorrell, Henderson, and co-authors, *Introduction to Human Geography* 2e, University System of Georgia, CC BY 4.0. Clustered, linear, and dispersed hamlets.
- Emilien et al., “Procedural Generation of Villages on Arbitrary Terrains,” *The Visual Computer* 2012, © Springer-Verlag. Ideas only: dry ground, footprints, paths.
- USGS Open-File Report 93-23 (1993), US government work. Ore clusters instead of an even scatter.
- TaleWorlds Bannerlord modding docs (https://moddocs.bannerlord.com/) as a design reference for “a village produces and is bound to a town.” No game data copied.
