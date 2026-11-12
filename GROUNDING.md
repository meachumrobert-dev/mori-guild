# Grounded world pass

This is a first integration, not a new game. The planet is still 1,536 regions on a 3,185 km sphere. Seeds, terraform deltas, and gather-depletion keys are unchanged. Nothing here teaches an autonomous model by importing a book. The sources below were read for general rules. The code in `js/grounded.js` is original. No textbook prose, no Bannerlord data, and no picture of a real place or a real person is copied into the game.

## What is in the game

- **Pitched frames.** Seeded hamlets, the Guild hall, and a player-built house use one roof triangle. Rise is run × tan(pitch). Rafter length is run / cos(pitch), checked against the straight-line distance. A short cottage has corner posts, a wall plate, a door header, and two slopes that meet on one ridge. A long span adds a tie and a king post. That is a carpenter's picture of a load path, not a structural certificate.
- **Hamlets.** Stage 3 and 4 places stop being a random ring. The form is nucleated, linear along a road, or dispersed on a steep or cold biome. Footprints do not overlap. Each door has a walkable link to the well or the road. Standing water is refused.
- **Fields.** A field is a scored plot, not a decoration. Suitability is soil (from the biome) plus a **water probe**: distance to the civic well, or to the first sample on eight rays that sits in standing water. There is no flow, no watershed, and no river solver. A furrow art only widens that probe (26 m to about 36–42 m). The field also needs a haul path back to the well, capped at 46 m. If a gather herb lands on the field it prefers that crop and still depletes.
- **Flowers.** Coarse seeded nodes (about 168 m) are metadata. They are not meshes and they are not harvest targets. Visible flowers and herb gathers cluster around a node with a Gaussian falloff and a biome weight. Grass holds more nodes than desert. The Guild herb meadow stays where it was.
- **Minerals.** Ore is no longer rolled into every cell. A coarse deposit (about 220 m) is accepted from biome and elevation. Inside it, a strike-aligned vein is patchy: some shoots are gaps. Mithral and adamantine stay rare and high. Beach cells almost never host a deposit. Depletion keys are still `seed|region|cell,slot|k`.
- **Civic card.** A city-state shows one dominant face (an original culture label tied to an SRD race), optional minorities, sometimes a small brush-kin band, the frontier of a material tech list, and a grand-crest span. Gravenmoor stays undead catfolk. Delroth's model is not redesigned. Taught arts are an optional save field `worlds[seed].civic`. Selling copper, or finishing a mapped quest, can add one art if the prerequisites are already there. A character level cannot.

## Command span (data only)

A grand crest speaks to **4** captains. Each captain leads a band of **6**. A full host under one crest is 4×6 = **24**, and that number is a label, not a spawned army.

Four is inside the small set of people one person can actually brief when the work depends on food and roads. Six is one fire, one pot, and one voice. An ally keeps their own crest and does not take a captain seat. A teacher opens an art and does not add fighters. A fifth captain is refused. No battle is fought from this.

## Tech graph (data only)

The civic list is not the Guild station ladder. The Guild can still start on a cast-iron pot as a house gift. A town does not.

| Art | Comes only after | Not the same as |
|---|---|---|
| Bonfire pottery | digging clay | roof tiles, clay pipe, mill |
| Kiln | pottery and fieldstone courses | — |
| Roof tiles, clay pipe | a kiln | a pot |
| Mill | masonry and pegged timber | anything made of clay |
| Copper hearth | charcoal | iron |
| Bronze | copper hearth and tin sorting | iron |
| Bark-tan leather | scraped rawhide, and a greenweald teacher if the town is not already that culture | a day-one hide |
| Bellows | tanned leather and pegged timber | — |
| Bloomery, then iron bloom | bellows, masonry, charcoal | bronze |
| Folded steel, mail | an iron bloom | — |
| Plate | folded steel and tanned straps | leather armor |
| Irrigation furrow | a dug line, not a pipe | hydrology |

Bark-tan is recorded as 20 days and 8 shifts. Plate is 30 days and 40 shifts, more labor than leather armor (6 days, 8 shifts). Those numbers are requirements on the card. Nothing in this pass counts them down.

Station ids that do map: pottery → clay, copper hearth → copper, bronze → bronze, iron bloom → cast iron, folded steel → steel, brass alloy → brass. `citySupportsStation` is a note. It does not lock the player's forge, and brass here is the alloy, not the green-potion rule.

## Sources

General rules only. URLs were checked for this pass.

- OpenStax, *Algebra and Trigonometry 2e*, Jay Abramson and contributing authors, Rice University. Web, 21 Dec 2021. [Right triangle trigonometry, §7.2](https://openstax.org/books/algebra-and-trigonometry-2e/pages/7-2-right-triangle-trigonometry) and [key equations for chapter 7](https://openstax.org/books/algebra-and-trigonometry-2e/pages/7-key-equations). The preface states the book is [CC BY-NC-SA 4.0](https://openstax.org/books/algebra-and-trigonometry-2e/pages/preface). Used ideas: tan = opposite/adjacent, cos = adjacent/hypotenuse, so a roof rise and a rafter length. No text or figures are reproduced.
- David Dorrell, Joseph Henderson, and co-authors, *Introduction to Human Geography* (2nd ed.), University System of Georgia / University of North Georgia Press, 2019. [CC BY 4.0](https://oer.galileo.usg.edu/geo-textbooks/2/). Chapter: [12.2 Rural Settlement Patterns](https://socialsci.libretexts.org/Bookshelves/Geography_(Human)/Introduction_to_Human_Geography_(Dorrell_and_Henderson)/12%3A_Human_Settlements/12.02%3A_Rural_Settlement_Patterns). Used idea: clustered, linear, and dispersed rural forms. No place names from the chapter appear in the game.
- Arnaud Emilien, Adrien Bernhardt, Adrien Peytavie, Marie-Paule Cani, and Eric Galin, “Procedural Generation of Villages on Arbitrary Terrains,” *The Visual Computer* 28 (2012). Record: [hal-00694525](https://inria.hal.science/hal-00694525). © Springer-Verlag 2012. Used ideas only: keep buildings off steep or wet ground, give each a footprint, connect them by paths. Their shape grammars, parcel conquest, and comparison photographs are not implemented and not copied.
- U.S. Geological Survey, “Comments on the ‘three-step’ method…” Open-File Report 93-23 (1993), [pubs.usgs.gov/of/1993/0023](https://pubs.usgs.gov/of/1993/0023/report.pdf). US government work. Used idea: ore deposits cluster where conditions match; they are not an even scatter. No named district is used.
- TaleWorlds, [Bannerlord modding documentation](https://moddocs.bannerlord.com/). Community tutorial on settlement XML: [How settlements work](https://github.com/Bannerlord-Modding/Documentation/blob/master/docs/_tutorials/new_settlements.md). API names only, as a design reference: a village is a production site bound to a town ([Village](https://apidoc.bannerlord.com/v/1.0.0/class_tale_worlds_1_1_campaign_system_1_1_settlements_1_1_village.html), [VillageProductionCalculatorModel](https://apidoc.bannerlord.com/v/1.3.4/class_tale_worlds_1_1_campaign_system_1_1_component_interfaces_1_1_village_production_calculator_model.html)); a town tracks food, loyalty, and security separately from any one hero ([Town](http://apidoc.bannerlord.com/v/1.2.10/class_tale_worlds_1_1_campaign_system_1_1_settlements_1_1_town.html)). No XML, no class, and no number from those pages is in this repo. “Heroes of Might and Magic” is mentioned here only as a readability analogy (one dominant face per region). None of its factions, art, or rules are used.

## Later, on purpose

These are not started, and a level does not unlock them.

- **Council, court, kingdom.** Needs a food surplus the field heuristic does not yet sum, a haul that is more than one path, the existing Guild treasury, and legitimacy from quests and reputation. Roles (steward, marshal, speaker) are names to design, not seats the player holds.
- **Armies.** The crest span above is the cap on direct command. Fielding troops needs food, a logistics path, treasury pay, and a captain who already holds a crest. Diplomacy may someday trade a captain or a teacher. A teacher accelerates or opens one culture art. A teacher does not hand out a stat bonus.
- **Hydrology, timed research, armor crafting rewrite.** The probe is not a river. Days and shifts are not a clock. The Guild forge ladder is unchanged.

## Mori's English and the tablet

`js/lexicon.js` is an original list of game words and paraphrases, grouped as synsets. That grouping is the same idea as Princeton WordNet (https://wordnet.princeton.edu/). This file is not a copy of the WordNet database, so the WordNet license does not apply and no WordNet gloss is reproduced. `js/english.js` only supplies articles, plurals, and the Oxford comma. Answers about a ruler, a motto, a people, or an art are read from the current city card. If the card has no ruler, Mori says so. She names the guild meadow for an herb only when a patch of that herb is actually there.

Herb patches in a forest city take turns through that biome's herb list. A flower node still pulls the plants into a cluster. It does not paint the whole region one species. A field plot may still be the one crop that plot was given.

## Limits a player will notice

- Village ground is recomputed from the seed. An old visit shows the new hamlet the next time you arrive. Terraform deltas and depletion timers still load.
- A taught art updates the civic card. It does not move houses or open a vein.
- Paths share the gravel shader. Hamlet paths are requested at 2.2 m; the main roads stay wider.
- One herb node may sit on a field. The field is not an infinite pile.
- City walls still use the old keep mesh. Only the houses, the well, and the fields are new.
