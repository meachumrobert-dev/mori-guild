# Little fingers

Mori's tablet may change one small thing at a time. Each change is a finger: one vocab pack, one intent rule, one sentence template, one furniture record, or one recipe note. A finger is data. It is not code. It does not run until the sandbox checks pass and the player taps Approve. Revert drops the last approved patch and rebuilds from the ones that remain.

The hosts below stay as they are. A finger does not replace `window.GATHERING`, `window.QUESTS`, `window.TREASURY`, or any other existing plug. It only calls the hook named for its kind.

| Finger | Hook | What it may change |
|---|---|---|
| `vocab` | `LEXICON.addLemmas(id, words)` | Extra lemmas on a synset |
| `intent` | `MORICHAT.addFinger` | Phrases that select a template id |
| `template` | `MORICHAT.addFinger` | A sentence with `{ruler}` `{name}` `{motto}` `{gov}` `{race}` `{region}` `{arts}` only |
| `furniture` | `FURNITURE.addPiece` | A bench, chair, table, stool, or shelf inside the guild yard |
| `recipe` | `RECIPENOTES.add` | A label and a note. It does not change a brew cost |

`FINGERS.apply`, `FINGERS.restore`, and `FINGERS.reapply` are the only router. `TABLET.validatePatch` rejects anything that is not those fields, and rejects strings that look like code. `TABLET.check` runs the cases in a Web Worker that is given the patch and the cases and nothing else. If the worker cannot start, the same pure check runs and still cannot touch the save.

`ENGLISH` (articles, plurals, Oxford comma) and `FURNITURE.proportions` are fixed. A finger cannot resize a seat or rewrite Behave.
