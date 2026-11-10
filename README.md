# Mori Guild 3D v3 — World Seed (The Retired Bard)
To play, open `index.html` in any modern browser. It works from file://, with no server, and on phones.

## Controls
| Action | Desktop | Touch |
|---|---|---|
| Move | WASD or the arrow keys | Joystick at the bottom left |
| Orbit the camera | Drag | Drag |
| Zoom | Mouse wheel | Pinch |
| Interact | E | Context button |
| Attack | Space | ⚔ |
| Drink a potion | Q | 🧪 |
| Jobs panel | J | |
| Bag | B | |
| HeroLock creator | H | |
| Globe / World Seed | G or M | 🌍 Globe |
| Close globe | Esc | ✕ |
| Globe: rotate / zoom / pick | Drag / wheel / click | Drag / pinch / tap |

## World Seed (new in v3)
Mori was made to be a world seed generator, so the world is now a whole planet that starts out unprogrammed.
- **Scale:** a sphere with a radius of 3,185 km, about 1/4 of Earth's surface area (≈127.5 million km²). It is split into 1,536 cube-sphere regions of roughly 300 km each.
- **Seed:** the planet is fully deterministic from its seed string (default `mori`). Continents, oceans, mountains, biomes, region names and city-states all come from seeded noise and are recomputed on demand. The save only stores the seed, each region's layer and which regions you explored. Progress is kept separately for each seed, so switching seeds and back loses nothing.
- **Void:** regions nobody has programmed yet are gray wireframe void, both on the globe and on the ground.
- **Seed jobs:** Mori programs a region one layer per job at the World Seed Obelisk next to the Guild Hall: **terrain → roads → villages → city-state**. Ocean regions stop at terrain. City-states keep about 950 km apart. She suggests seed jobs herself, alternating them with town builds. You can also queue one from the globe or from the Jobs panel.
- **Politics:** each city-state has a name, a government (Lord, Council, Theocracy or Guild Charter), a ruler title, two banner colors, a motto and claimed borders. Neighbours within about 1,600 km are allies, rivals, vassals or neutral. These ties show as green, red and gold dashed lines on the globe.
- **Travel:** pick a region on the globe and press **Travel here** to arrive by waystone. The ground streams in 64 m chunks around you, with level of detail (LOD) and a lighter setting on phones. Programmed regions have roads, milestones, villages, walled cities with keeps and banners, and barrow dungeons with SRD monsters and loot (deeper the farther from the Guild). The Guild, the Retired Bard tavern and Delroth stay at the start region.

## Item bench
The **Item bench** uses SRD 3.5 pricing, item creation feat gates and Robert's House Rules.

## Loot rarity
| Color | Tier |
|---|---|
| Gray | Mundane |
| White | Masterwork |
| Green | +1 or minor magic |
| Blue | Enhanced and with a spell |
| Purple | +3/+4 or multiple spells |
| Orange | +5, epic or artifact |

## v3.1 beta-test fixes (Tinker Gearwhistle playtest)
- HeroLock creator has a **Class (3.5 SRD, flavor only)** select (the 11 core classes) plus a free-text flavor, e.g. "Gnome Wizard (artificer-style crafter)". Artificer is not SRD, so wizard is the stand-in. The class is cosmetic. Your level is still 3 + dungeon clears, and that level is your caster level at the bench.
- Leveling matters now: **+5 max HP per level** above 3, and **+1 attack every 2 levels**. Clearing a dungeon heals you to the new maximum.
- Lyra, Juno and Kit give **+2 flanking** to hit (SRD flanking).
- New games start with 2 Potions of Cure Light Wounds.
- Masterwork weapons give +1 to hit only (SRD), so real +1 magic weapons now auto-equip over them.
- The level-gated loot potion heals 1d8+1, like every other CLW.
- Chat: "seed …" / "program …" queues a World Seed job. The bench names your crafter, e.g. "You (Tinker Gearwhistle, Wizard)".

## v3.2 Phase 1: Mori terraforming
Mori reshapes the region you are standing in, a little at a time, in front of you. You see green sparkles where she plants, and a rumble with dust where the earth moves.
- **Jobs (Mori's Jobs panel, Terraform row):** Plant Grove, Raise Hill, Raise Mountain, Carve Lake, Carve River, Flatten for Town. A job picks a spot ahead of you. Spots avoid the guild/town core, existing features and river paths. Each job runs for 7–18 sim-seconds.
- **Chat:** "plant some trees", "raise a hill", "raise a mountain", "carve a lake", "carve a river" and "flatten for a town" all queue the matching job.
- **Suggestions:** when her queue is empty, Mori proposes a terraform job that fits what the region still lacks (for example, a grove first on a fresh region).
- **Save format:** each region saves a compact delta, never meshes. That delta is a sparse heightmap delta on a 4 m grid (sorted cell keys stored as varint gaps, zigzag varint decimetres, base64, about 3 bytes per cell), plus a tree list `[x,z,scale,type]`, lakes, rivers and a feature list. The heightmap is stored in field `c2`; older `c` saves still load. A six-job run is about 10 KB per region. Caps are 12,000 cells, 360 trees and 24 features per region.
- **Performance:**
  - Edits are spread across frames, and chunk rebuilds are capped per frame (1–2) and by milliseconds.
  - Full-detail chunks are kept only near the player.
  - Trees are instanced, three draw calls in total (pines, oaks, trunks), and drawn only within the tier's tree radius.
  - Particle buffers are fixed and reused. Old region data is evicted.
  - A frame-time governor steps quality high → medium → low when the average frame time stays over budget (20 ms desktop, 33 ms touch), and steps back up when there is headroom. Touch devices top out at medium.
  - URL options: `?quality=low|medium|high` pins a tier and turns off the governor. `?perf=1` shows a live perf line (frame ms, JS ms, tier, draws, triangles, rebuilds).
- **Quick wins:**
  - **Gold:** 1 gold = 1 gp (SRD scale). Shops sell at half price.
  - **Armor:** base AC uses SRD values by armor type, for example Padded 1, Leather 2, Chain Shirt 4, Breastplate 5, Full Plate 8, with max Dex applied. Shields add +1/+2/+4.
  - **Messages:** normal crafts now say "Crafting begun". "Ritual begun" is only for rituals.
  - **Dungeons:**
    - Monsters aggro only when you get near (room by room).
    - Each dungeon has a campfire rest spot that heals you once.
    - Kills are kept if you retreat and come back.
    - The location bar shows the dungeon and the room.
  - **Gnome hair:** the gnome preset now uses the short hairstyle, not the wolfcut.

## v3.4 Phase 2: gathering and the Demon Clan
- **Gathering:** walk up to a herb, rock, ore vein or log and press E (or click). Tool swings and synthesized sounds play, and nodes deplete and respawn on a timer. Depletion, reagents and skills are saved.
- **Skills:** Herbalism, Mining, Woodcutting and Skinning level with use. Kill a creature, then skin its carcass for parts by SRD creature type.
- **Reagents:** reagents are in the bag with rarity color, stack, weight and gp, and you can Sell them. Brews and forge recipes use them as required or optional components.
- **Ask Mori:** "where is iron", "where are herbs", "gather run", "cleanse", "clan raid".
- **Distant view:** past mid distance, trees and towns become flat cut-out cards. These are cheap, and their switch distance follows the quality tier.
- **Gravenmoor:** the Demon Clan city-state, led by Clan Lord Delroth, with Legion and the Death of Earth.
- **Havenwall:** the besieged sister city, with the Dragon's Forge, Brakka's shop and quest, and the Pale Wolf's Mantle.
- **The Coilblight:** a spreading corruption that you, Mori, the Moonfang Kin and Clan raids cleanse. Each faction has its own reputation.
- See DESIGN_LOG.md for why each part works.

## Tests
- `node tests_phase2.js [m]`: tests nodes, gathering, respawn, monster parts, warm-up timing, the impostor card switch, components and save/reload.
- `node tests_v38.js`: v3.8 checks: real herbal reagents + folklore lore, sensible blends, healing ladder (salve/bandage/grey/green), pot & forge tiers, smithing DCs 10/15/20, Enchanting Forge/Circle, durability, treasury buys crafted, no paywall.
- `node tests_v37.js`: v3.7 checks (24): idle builder progress/settings/toggle, ticks, heading priority, away catch-up + summary, hidden pause, no paywall, Behave #1, guild treasury / Mori Marks / bounty scaling / bandit risk.
- `node tests_v36.js`: v3.6 checks (34): Edit/Regen/Pin chat controls, talk-objective quests (Diplomacy/Intimidate/Bluff), lore cards, persona card, memory book + bond meters, Dread Lord form, cursed knockoffs and lawn tokens.
- `node tests_v35.js`: v3.5 checks (62): bench defaults/lock sorting/spell chip, NPC routines, E/Talk, distinct personalities, the npcReply interface (sync + async brain), Mori intents and the behave rule (no shrugs), all 9 quests with rewards and reload, haggling, and voice (no-API fallback, fake mic, wake word).
- `node tests_demonclan.js`: tests city-state presence, the trademark scan, corruption spread and cleanse, the quest, reputation and reload.
Run `node tests_playwright.js` for desktop, or `node tests_playwright.js m` for mobile. It needs playwright-core and Chrome.
The test writes its screenshots to `/tmp/v3/`. It runs the v2 flow and then the World Seed flow: a real Mori seed job, fast-forwarding 420 more jobs, the globe, travel to a city-state, chunk streaming, a barrow dungeon, a void region, reloading while away, re-seeding and switching back, and Delroth close-ups.
- `node tests_phase1.js`: quick-win and terraform checks: armor AC, messages, dungeon aggro/rest/retreat, chat and Jobs panel queueing, and Sell.
- `node tests_terraform_save.js`: runs all six terraform jobs, then reloads and checks the region delta round-trips exactly.
- `node tests_perf.js`: headless perf, desktop 1280×720 and mobile 390×844 (dpr 3, touch, 4× CPU throttle), idle vs. Mori terraforming. It runs with the auto governor and with pinned tiers, and writes `perf_results.json`.

## Known limitations
- The ground you walk on is 64 m chunks around you, streamed within each region's local tangent frame. Each region is a ~300 km patch that you enter by waystone; you can't walk seamlessly from one region into the next, and the walkable area is clamped to ±2.4 km around the landing point.
- Terrain far from the player is low resolution, and the globe's colors are coarse (cube-sphere grid of 48 per face).
- City-states, villages and roads are generated decorations with sign, banner and interact targets. Their NPCs don't trade or have quests yet.
- Saves made by v1/v2 are not imported. v3 uses its own save key, but characters made in HeroLock are shared.
- Terraform changes are saved per region and cleared when that region is re-seeded. Mori works only on the region you are in. Groves near the guild sit 160 m or more out, because the town core is kept clear.
- Perf numbers come from headless SwiftShader, a CPU renderer, so they are pessimistic. Real GPUs should do much better. The mobile run throttles only the page's main thread.
- Dungeon aggro starts in the entry room, so the first two foes engage as soon as you enter.

## Mori Templates pack (optional)

`assets/templates/` holds an optional texture and sprite pack built from Robert's approved "Mori templates" Drive folder:
- 13 seamless textures (512 px, plus 256 px for the low tier, webp)
- 5 flame strips (fire, fel, arcane, frost, gold), 2 bolt strips and 2 sparks
- `palettes.json`: colour themes, tagged
- `manifest.json`: maps every asset to the source file it came from

`assets/templates/templates.js` stores the pack as data URIs, so it also works from `file://`. `js/templates.js` (`window.MT`) wires the pack in:

- **Buildings and walls:** the guild hall, tavern, forge, stalls, fences, built houses, walls, towers, shrines, seeded towns, city walls and dungeon walls and floors get stone, plaster, plank, shingle and bark textures. UVs are scaled in metres, and each material is tinted so its average matches the original procedural colour.
- **Roads:** gravel road ribbons run from the guild gates and along the dungeon road, and follow seeded-town roads.
- **Fire and spells:** the forge hearth, dragon breath and dungeon campfire use animated flame sprites. Attacking with a spell weapon plays a flame or bolt cast that matches the spell (cosmetic only; d20 rules are unchanged).
- **Palettes:** house wall and roof colours and terraform tree, spark and dust colours come from `palettes.json`.
- **Quality tiers:** the low tier uses 256 px textures, anisotropy 1 and a smaller spell pool. Medium and high use 512 px textures with anisotropy 2 and 4.
- **Turning it off:** add `?templates=0` to the URL or set `localStorage['mori.templates']='off'`. If `assets/templates/` is deleted, the game falls back to the original procedural look with no errors.
- **Tests:** `node tests_templates.js` checks three cases: pack on, pack off and pack missing.
- **Screenshots:** `templates_ingame.png` and `templates_kit_contact.png`.

## v3.3 — Templates v2, geometry flowers, roof fix
- **Mori Templates v2**: 7 new CC0-style textures made from Robert's approved "Mori templates" Drive folder (foliage, bark, clover, leaf litter etc.) plus new palettes (`meadow_flowers`, `foliage`, `flowers`). Trees use foliage/bark textures; meadows and groves get draped clover / leaf-litter ground patches. `?templates=0` still gives the procedural fallback.
- **Geometry flowers** (`js/flowers.js`): 7 low-poly species — zinnia, marigold, vinca, sunflower, canna, gloomrose, squash blossom — built from stem, two leaves, rings of petals and a centre dome, coloured from the kit palette. Petal count, size, tilt and petal colour vary by seed. One InstancedMesh per species variant (≤12 draw calls), no shadows, shared material; per-tier radius/cap (low 55 m/450, mobile-low 300; medium 85 m/1100, mobile-medium 700; high 130 m/2400).
- Natural flower patches scatter in grass/forest/jungle/savanna/steppe/swamp biomes from the world seed, plus the Herb Meadow at the Guild.
- **Plant Grove** now also plants grove flowers; new **Flower Meadow** job (🌼, chat: "plant flowers / meadow / wildflowers"). Planted flowers are saved in the region terraform delta (`fl`).
- **Roof fix**: the tavern's two roof slopes were tilted the wrong way (`rotation.x = -s*0.5`), making an upside-down V. Sign flipped, ridge raised, plaster gable ends added. Guild hall, house, tower, seed-world houses and market awnings checked.
- Tests: `tests_flowers.js` (new), `tests_terraform_save.js` now includes meadow.

## v3.5 — Living NPCs, quests, smarter Mori, voice
- **Bench fix:** opens on the first recipe your crafter can actually make. Locked bases sort last and say why ("🔒 Wand — needs Craft Wand (caster level 5+); crafter is CL 3"). Your picked spell chip now sticks. Changing the crafter re-fits the recipe.
- **Living NPCs (13):** Guild: Oswin, Pell, Merra, Grizzik. Retired Bard: Tamsin, Lark. Gravenmoor: Vesk, Korrin, Dagna. Havenwall: Brakka, Sefa, Tobin, Wren. Each has a work/eat/sleep routine on the Guild clock (night-shift and evening variants), a personality, topics, and memory of your quests, haggles and rep. Walk up and press **E** / **Talk** to open the shared chat bar. "back to Mori" (or start with "Mori,") returns to Mori. The chat ends if you walk more than 10 m away.
- **Brain interface:** every NPC line comes from `NPCS.npcReply(npc, text, state)` → `{text, actions, mem, intent}`. It is fully scripted, with no API key. `NPCS.setBrain(fn)` can swap in another brain (sync or Promise-returning); `setBrain(null)` restores the scripted one.
- **Haggling:** "haggle" with a merchant rolls d20 + rep bonus vs a DC. A win gives a 10% coupon for the rest of the in-game day.
- **Mori chat:** adds intents (intro/name, feelings, the world, places, lore, quests, help, jokes) and a friendly fallback instead of a shrug. **Rule #1 is "behave."** Mori's dad, the Goddess of Earth, asked only that. It means be kind, be honest, do no harm, and help people find each other. Ask "what is your rule?" or "why behave?".
- **Quests (9):** open the log with **L** or 📜 Quests. Quests are fetch, chain, room-clear, deliver, craft and cleanse types, with gold/XP/rep/item rewards. They are saved and survive reloads. Quest XP feeds character level (+1 per 1,000 XP).
- **Voice:** 🎤 uses the browser Web Speech API. Chrome's recognizer needs a network connection; when speech isn't available, the button says so and typing still works. "Say 'Mori' to talk" (wake word) is **off by default**. "Speak replies" reads Mori and NPC lines aloud, with a per-NPC voice pitch and rate.

## v3.6 — What players love (companion / NPC / story apps)
Ships the top love-to-effort gaps from the Mori Price Check page — without energy timers or paywalls. Rule #1 remains **behave**.

- **Chat controls:** every You / Mori / NPC bubble has ✏️ Edit, 🔄 Regenerate (deterministic alternate line per seed), and 📌 Pin (saved into the Memory book).
- **Talk objectives:** 3 quests finish through Diplomacy, Intimidate or Bluff (d20 + mods vs DC). The quest log shows a visible **Talk goal**.
- **Lore cards:** collectible SRD-safe codex for cities (Guild / Gravenmoor / Havenwall), factions, creatures and NPCs. Unlock on meet or discover. Demon Clan canon names only.
- **Persona card:** name, race, class, background and bio from HeroLock. NPCs at Acquaintance+ reference it. You are never Delroth — his look stays locked.
- **Memory book + bonds:** per-NPC memories (never silently wiped; you Forget), bond meters Stranger → Acquaintance → Friend → Trusted → Sworn. Trusted unlocks a 5% perk. Bond-gated dialogue.
- **Delroth Dread Lord form (temporary):** horns grow, +5 HAT comes off, eyes crackle neon yellow-green, self-centered Fireball + scorpion-staff shockwave, Death of Earth (legless skeletal torso + scythe) floats in. Then canon restores.
- **Mori Doll shop:** grumpy ("stay off my lawn"), lawn tokens, and cheap cursed knockoffs that whisper *"You are now a loyal follower of Delroth."*

## v3.7 — Mori's idle world builder
- While the game is open, Mori slowly seeds the next regions in the background (terrain → roads → villages → city-states), deterministic from the World Seed. Gathering nodes, roads and settlements appear as stages advance.
- **Priority:** the direction you are walking (velocity/heading), your active quest's place, then nearest seedable neighbors. If a Tinker save is in localStorage, its last heading is a fallback.
- **Away catch-up:** `lastSeen` is stamped on hide/unload. On load Mori applies up to ~24 hours of work ticks, spread over the first minute so load does not hitch, then shows a **"While you were away, Mori built…"** card in her voice.
- **Progress:** HUD chip `🌍 built/1536 · %`. Full toggle + Slow/Normal speed live in the World Seed / globe panel.
- Pauses when the tab is hidden, or on the lowest quality tier with a low battery. Never steals a real job from the queue. **No energy timers, no paywalls.** Rule #1 is still behave.
- **Guild treasury:** Mori Marks mint when she builds. Quest gold is paid from that purse (shown on the quest board). A lean treasury scales bounties down (with a floor — never unpaid) and nudges bandit raids up; a healthy treasury pays bonus bounties.


## v3.8 — Real herbalism, healing ladder, crafting tiers
- **Herbs:** lavender, frankincense, chamomile, yarrow, comfrey, calendula, sage, mint, rosemary, willow bark, aloe, myrrh — gathered in biomes. Lore codex entries are folklore, not medical advice. Mythical beast reagents upgrade blends to magic.
- **Healing ladder:** 🧴 salves = HoT, no roll (auto from hotbar). 🩹 bandages on every hotbar = HoT + D&D 3.5 Heal check (d20+Wis+ranks). ⚪ grey draughts = stronger HoT. 💚 green potions = instant (brass+ pot).
- **Stations:** alchemy pots & forges climb clay → cast iron (DC 10) → steel (masterwork sword DC 15) → copper/bronze → brass (jewelry; zinc starts green) → ironwood → orichalcum/mythril/adamantine. Brass+ironwood unlock mythic metals. Enchanting Forge (magic arms) and Enchanting Circle (wondrous) are separate; Mori's pot is one high-tier pot, not the only one.
- Use-based craft skills; crafted gear has durability + lifetime max. Merchants stock herbs/metals; guild treasury buys crafted goods. **No energy timers, no paywalls.** Behave stays #1.

## Grounded hamlets, frames, and deposits
`js/grounded.js` is a first pass on top of the existing seed, not a new world. `GROUNDING.md` lists the sources, the licenses, and what is still only a design note.
- Seeded houses, the Guild hall, and a built cottage use one pitched roof (rise = run × tan, rafter = run / cos) with posts, a plate, and a king post only when the span is long.
- A programmed village is nucleated, linear along a road, or dispersed on steep ground. Footprints do not overlap. Doors link to the well or the road.
- A field is placed only if a soil score and a water **probe** (well, or standing water on a short ray) agree, and a haul path is short enough. That probe is not a river model.
- Wild flowers and herb gathers cluster on seeded nodes. Those nodes are not objects you can click. Ore sits in biome-and-elevation veins, patchy inside the vein, instead of an even scatter.
- A city card shows one dominant culture, a short material tech list (a pot is not a pipe; bronze is not iron), and a grand crest of 4 captains × 6. Nothing here fields an army or grants a throne from a level. Selling the right good, or finishing a mapped quest, can teach one art if the prerequisites are already known.
