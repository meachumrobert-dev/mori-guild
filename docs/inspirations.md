# Inspirations

This is the design checklist for Mori Guild. Each game below is a public reference for a feeling or a rule. The links are official sites, wikis, talks, and dev posts that anyone can read. Mori's code, names, numbers, and art are original. Nothing here copies another game's source, meshes, textures, or UI.

Read this before adding a system. If a feature does not fit one of these rows, it does not belong in the upgrade.

Related notes: `docs/herolock.md`, `docs/skill-tree.md`, `CREDITS.md`, `GROUNDING.md`.

## Black Desert — face, hair, presets

**Read**

- Beauty Album, the public gallery of player faces: https://www.naeu.playblackdesert.com/en-US/BeautyAlbum/Home/Rank
- The regional game site that hosts that album: https://www.naeu.playblackdesert.com/

**Take**

A creator with sliders for the face and the body, separate controls for hair and skin, named presets, and a gallery of faces a player can share. The album is the picture of the goal: many faces, each one someone's, browsable without opening the sculpt screen.

**Mori**

`js/hero.js` builds a face from primitives and sliders (jaw, cheeks, eyes, brow, nose, ears, horns, height), plus skin, hair, scars, and clothes. HeroLock in `js/game.js` is that screen, with five camera angles. `js/gallery.js` stores up to 24 faces as text codes. A code is JSON. It is not a picture. Locked faces (Delroth, Mori) do not travel in a code.

**Still to do**

Skinned glTF bodies, morph targets, and PBR skin and hair from CC0 libraries named in `CREDITS.md`. Thumbnails generated on the device, never taken from the Beauty Album. The longer note is `docs/herolock.md`. No image or mesh from the album is in this repo.

## Elder Scrolls / Skyrim — shared effects, a world you can walk

**Read**

- UESP, Skyrim alchemy (effects, ingredients, apparatus): https://en.uesp.net/wiki/Skyrim:Alchemy
- Creation Kit, ingredient records: https://www.creationkit.com/index.php?title=Ingredient
- Bethesda's Skyrim page: https://elderscrolls.bethesda.net/en/skyrim

**Take**

A reagent has several effects. You learn them by using it. A potion is the effects that two or more reagents share, not a card that lists the ingredients. The world is one continuous place: you walk out of town and the land keeps going. Apparatus changes how strong the result is.

**Mori**

`js/recipes.js` gives every reagent four effects. Tasting reveals the next one. Combining two to four reagents keeps the effects they share. Mortar, clay pot, retort, alembic, distillery, and enchanted pot change potency, yield, and whether magic effects come through. Skill names walk Herbalism, Apothecary, Botany, and Alchemy, Chymistry, Chemistry. High Regeneration is the name of a strong shared Regenerate. It is not a recipe id. `js/planet.js` and `js/seedworld.js` are the walkable world: one seed, regions on a sphere, waystones in `js/portals.js` until the far lands are a continuous walk.

## Kingdom Come: Deliverance 2 — a day, and people in it

**Read**

- Kingdom Come: https://www.kingdomcomerpg.com/
- Deep Silver, side quests and a town that keeps moving: https://www.deepsilver.com/games/kingdom-come-deliverance-ii/news/exploring-the-side-quests-of-kingdom-come-deliverance-2
- Deep Silver, what NPCs notice: https://www.deepsilver.com/games/kingdom-come-deliverance-ii/news/insider-tips-from-the-developers-of-kingdom-come-deliverance-2
- GDC Vault listing, supporting thousands of NPCs and their routines: https://gdcvault.com/play/1035718/Supporting-Thousands-of-NPCs-in

**Take**

People have a day. They work, eat, and go home. Most of that happens whether or not you are looking. The town should feel built and used: roads cut into ground, houses with doors and yards, a gate you actually pass. Combat and chores stay light here. The reference is the schedule and the weight of the place, not a copy of the fight.

**Mori**

`js/folk.js` gives a town 10 to 50 people by population. Careers are farmer, smith, miner, woodcutter, merchant, guard, crafter, and herbalist. Once a day they add or spend stockpile goods. People far from you are numbers. At most six near you get a body. `js/houses.js` places varied footprints, doors, yards, and fences along short streets. `js/roads.js` grades a road to a slope limit, and `js/seedworld.js` blends that grade into the terrain as cut and fill. Bridges are a timber trestle or a stone arch, and only over water or a ravine.

## Medieval Dynasty — a village that eats and pays

**Read**

- Publisher page: https://www.toplitz-productions.com/medieval-dynasty.html
- Developer, Render Cube: https://rendercube.pl/
- Dynasty management (homes, jobs, fields, taxes, demand), public wiki: https://medieval-dynasty.fandom.com/wiki/Management

**Take**

A village is houses, fields, and jobs. People consume food and wood and produce the next good in the chain. The settlement owes a tax. Too heavy a tax, and people leave. You invite or lose population. You do not hand-craft every beam yourself.

**Mori**

`js/stockpile.js` buys, sells, and produces inside a price cap. `js/workshop.js` turns ore, logs, hides, and herbs into blooms, beams, leather, and a tisane. Black powder and Greek fire are named and refused. `js/tithe.js` is the feudal ladder, knight through king, with coin, goods, and labor caps, and a later hook for a seasonal realm. `js/elder.js` reads what the town lacks and asks for it. `js/townplan.js` lays the starter town: square, hall, elder, stalls, workshops, fields outside the palisade, streets the same width as the road. `js/village.js` is the door those pieces share. The player's own make takes goods out of the pack and says what left and what arrived.

## Albion Online — you get better by doing it

**Read**

- Albion Online: https://albiononline.com/
- Destiny Board, the public write-up of learning by use: https://wiki.albiononline.com/wiki/Destiny_Board
- Player markets, the public write-up: https://wiki.albiononline.com/wiki/Market

**Take**

Skills rise because you used them. Gathering, crafting, fighting, and trading are the same idea on different branches. The economy is players and towns moving goods, with prices that move when a chest is full or empty. Fame is not a class you pick once.

**Mori**

Gathering in `js/gather.js` already levels herbalism, mining, woodcutting, and skinning by use. `js/skills.js` and `docs/skill-tree.md` add the wider tree: gathering, crafting, combat, alchemy, social, and trade, with era names. Level is the square root of uses. Combat stays on the d20 until a later review. `js/stockpile.js` moves price with stock and demand, inside a floor and a ceiling. `js/reputation.js` caps how far a quest can move regard in one day, and that regard nudges price.

## Light No Fire — one planet, no edge you fall off

**Read**

- Light No Fire: https://lightnofire.com/
- Press fact sheet (a fantasy planet the size of Earth, biomes, building, survival): https://lightnofire.com/press
- Hello Games: https://hellogames.org/

**Take**

The promise is a single world you can keep walking: biomes, oceans, mountains, and towns, at a size that feels planetary. You are not loading a new game when you cross a border. Building and roads persist. The far distance can be a shorter step until the machine can hold the whole walk.

**Mori**

`js/planet.js` is a sphere of radius 3,185 km and 1,536 regions. One seed fixes the planet. Regions remember stage: void, terrain, roads, villages, city-state. `js/portals.js` puts a waystone at each programmed road end so travel reaches the next land before every region is a continuous mesh. Saves keep the character and, on a new seed, `js/newworld.js` backs up the old world instead of wiping it. Terraform deltas in `js/terraform.js` stay with the region.

## Roblox — the phone, not the blocks

**Read**

- Roblox creator docs: https://create.roblox.com/docs

**Take**

What to keep is the reach. A new player on a phone understands move, look, and act in a few seconds. Buttons are large. The game runs on a modest phone. What this project is leaving behind is the picture: one clay material, axis-aligned boxes, and roads that are slabs dropped on the grass.

**Mori**

`js/phone.js` targets a Galaxy S21-sized screen. Touch targets are at least 48 px. The stick is on the left and the actions are on the right. `js/look.js` defaults graphics to Low on a phone and offers Low, Medium, and High. Low skips extra grass and rocks. The picture path is vertex colors by slope, a little shade baked into those colors, ACES tone mapping, sRGB, hemisphere plus sun, fog the color of the sky, and a gradient sky dome. Roads are graded into the ground instead of painted on as boxes.

## D&D 3.5 SRD — the open rules underneath

**Read**

- Hypertext d20 SRD, the public 3.5 reference: https://www.d20srd.org/
- Open Game License v1.0a: https://opengamingfoundation.org/ogl.html
- The copyright notice we keep is in `CREDITS.md`

**Take**

Races, the shape of a d20 attack, armor class, treasure bands, and the idea of crafting magic items are open rules. Use them as the floor. Do not paste book text. Where a d20 is the wrong tool (gathering, crafting practice, a town's prices), prefer use and stock. Combat can stay a d20 until that pass is reviewed.

**Mori**

`js/srd.js` and `js/craft.js` hold the SRD-derived numbers: attack rolls, AC, item prices, feats, and spell names used as crafting ingredients. Races on the HeroLock screen match the SRD list plus Robert's catfolk and undead catfolk. Monster names used in raids and the undercroft follow the SRD list where they overlap (dire rat, skeleton, zombie, gray ooze). Product identity stays out: no book prose, no setting names from those books. `docs/skill-tree.md` says which checks are still dice.

## Dying Light — parkour, momentum, and a skill you earn by moving

**Read**

- GDC Vault, Bartosz Kulon, Techland, "Parkour: How to Improve Freedom of Movement in First-Person Games in 20 Simple Steps": https://gdcvault.com/play/1025208/Parkour-How-to-Improve-Freedom
- GDC speaker notes on ledge tests and jump timing: https://gdconf.com/article/speaker-q-a-dying-light-dev-bartosz-kulon-on-making-first-person-movement-feel-good/
- PlayStation Blog, Techland on natural movement (climb, jump, slide, wall-run chosen from the ground in front of you): https://blog.playstation.com/archive/2014/12/04/challenges-implementing-natural-movement-dying-light
- Dying Light Outpost, dev blog on reading ledges instead of hand-placed grab points: https://outpost.dyinglightgame.com/news/dev-blog-11
- Dying Light Wiki, Agility skills (what use unlocks, and that freerunning itself grants the points): https://dyinglight.wiki.gg/wiki/Agility_Skills
- Dying Light Wiki, Vault: https://dyinglight.wiki.gg/wiki/Vault
- Dying Light Wiki, Slide: https://dyinglight.wiki.gg/wiki/Slide
- Dying Light Wiki, Tic Tac (run up a wall): https://dyinglight.wiki.gg/wiki/Tic_Tac
- Dying Light 2 Wiki, Parkour skills (stamina gates the longer climbs and wall runs; proficiency comes from doing the moves): https://dyinglight.wiki.gg/wiki/Skills_(Dying_Light_2_Stay_Human)

**Take**

Movement is a chain, not a teleport. Speed you already have carries into the next action. A ledge grab catches a lip you would otherwise miss. A vault clears a low obstacle or a body without stopping. A climb is hands on a face, spending stamina as you go up. A wall run is a short vertical or diagonal sprint, then a push off. A slide keeps momentum through a low gap and is a place to catch your breath. Stamina is the gate: when it is gone, the chain ends and you hang, drop, or walk. The skill grows because you did the moves. Early moves are grab, climb, and slide. Later moves are vault, longer runs, and wall run. Nothing here is a combat trick copied from their trees.

**Mori**

Design only. Parkour is already on the backlog. No grab, vault, climb, wall run, or slide is in the game yet.

When it is built, it should be a small module with a stable interface, in the same spirit as `js/skills.js`:

- One use-based skill, `parkour`, on the gathering or combat branch. Level is still the square root of uses. Doing a grab, vault, climb, wall run, or slide is what adds a use. Buying the skill with a point is not the path.
- Stamina is a short bar that refills when you are on the ground and walking. Climb and wall run spend it. Slide spends less, or none, so it can be the breath in the chain. At empty stamina the chain stops. You do not fall through the world.
- Momentum is horizontal speed kept across a vault, a slide, and the first moment of a climb. Stopping, or missing a grab, sheds it.
- The ground decides the move from what is in front of the body: a lip in reach is a grab, a low block is a vault, a tall face is a climb, a wall while you still have speed and stamina is a wall run, a crouch at speed is a slide. Hand-placed grab points are a last resort for a gate or a roof that must be reliable.
- The camera stays the third-person orbit Mori already uses. Phone keeps the stick and the existing action buttons. Jump and crouch choose the move from context. No new cluster of buttons.
- Town walls, palisades, and roofs from `js/townplan.js` and `js/houses.js` are the first surfaces. Wilderness cliffs can wait.

**Still to do**

Leave it unbuilt until the backlog item is picked up. Do not add ray-cast climb code, animation sets, or a stamina HUD in this pass.

## Checklist for this upgrade

Use this list when reviewing the upgrade. A row is done when the Mori column exists and the "do not" column was respected.

| Reference | Done when |
| --- | --- |
| Black Desert | Sliders, hair, skin, and a text gallery. No album images. glTF and PBR stay written down, not faked. |
| Elder Scrolls | Potions come from shared effects. The planet is one seed. Waystones cover the lands you cannot walk yet. |
| Kingdom Come | Townsfolk have jobs and a day. Offscreen people are numbers. Roads are cut and filled. Bridges span water and ravines only. |
| Medieval Dynasty | Stockpile, workshops, fields, elder asks, and a capped tithe. Black powder and Greek fire are the ceiling. |
| Albion | Use raises a skill. Prices move with stock. The d20 is unchanged in combat. |
| Light No Fire | 1,536 regions, 3,185 km, saves survive, a new seed keeps a backup. |
| Roblox | Phone layout and a Low graphics default. The ground is not a stack of slabs. |
| D&D 3.5 SRD | Open rules only, notice kept in `CREDITS.md`. No closed-book text. |
| Dying Light | Design only. Ledge grab, vault, climb, wall run, slide, momentum, and a stamina-gated parkour skill that grows by use. No movement code in this pass. The work stays on the backlog. |
