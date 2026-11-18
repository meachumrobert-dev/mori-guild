# Skill tree (draft)

This is a design note for Mori Guild. The game still rolls d20 where combat and speech already do. This draft does not replace those checks. It records use, so a later pass can retire a roll where a roll is the wrong tool.

The writing below is Mori's own. Public design notes from other games were read for ideas. No proprietary code was copied. No MIT source was vendored.

## What other games make obvious

- Elder Scrolls alchemy is about reagents with several effects. A potion is the effect two reagents share. Mori already does that in `js/recipes.js`. Apparatus and era names (Alchemy, Chymistry, Chemistry) stay on that ladder.
- Kingdom Come-style days give each person a schedule. Mori's townsfolk in `js/folk.js` are abstract most of the time: a career, an hour, and a stockpile line. Only a few near the player get a body.
- Medieval Dynasty-style villages turn raw goods into made goods and eat the surplus. Mori's stockpile, workshop ceiling (black powder and Greek fire are the top, not a recipe you press), and folk jobs are that idea in miniature.
- Albion-style skills rise because you used them. Gathering in Mori already says this. The tree below is the same rule for crafting, trade, and talk.

## Branches

| Branch | Era names, as you practice | Skills |
| --- | --- | --- |
| Gathering | Herbalism, Apothecary, Botany | herbalism, mining, woodcutting, skinning |
| Crafting | Bench, Smithy, Workshop | smithing, leather, cook |
| Combat | Militia, Arms, Veteran | melee, guard |
| Alchemy | Alchemy, Chymistry, Chemistry | mix, distill |
| Social | Gossip, Regard, Charter | talk, elder |
| Trade | Barter, Merchant, Factor | sell, haggle |

Combat is marked `d20: true`. Hits, armor class, and speech checks stay on the existing dice until this note is reviewed. Using a weapon can still add tree experience without changing the roll.

## Levels

Experience is a count of uses. Level is the square root of that count, rounded down. One use is level 1. Twenty-five uses is level 5, which steps the era name. One hundred uses is level 10, the last era name on that branch.

Nothing in this draft gates a recipe, a price, or a hit. `js/skills.js` only stores the count and reports the era name. Gathering, a workshop make, and a sale can call `SKILLS.use`.

## Later, after review

- Pick which combat and speech moments should read the tree instead of a d20.
- Let era names change the sentence Mori and the elder use, not the math, until the dice pass is accepted.
- Keep black powder and Greek fire above the workshop. Practice does not unlock them.
