# HeroLock roadmap

HeroLock is the character creator. The aim is a face you can sculpt, save, and show someone else, at a quality in the same family as a modern beauty album: sliders for the face and the body, hair, skin, named presets, and a gallery of faces people can share.

The Black Desert Beauty Album (https://www.naeu.playblackdesert.com/en-US/BeautyAlbum/Home/Rank) is a style reference only. Nothing was downloaded from it. No images, meshes, or UI art from that site are in this repo.

## What is already here

- Face and body sliders (jaw, cheeks, eyes, brow, nose, ears, horns, height).
- Skin, hair, and eye colors, plus hair styles, scars, beard, veil, and clothes.
- Race presets, and locked faces for Delroth and Mori that can be duplicated.
- Five camera angles used as an identity check.
- A text gallery: save a face, copy a code, and load someone else's code. Codes are JSON. They are not pictures. The list holds 24 faces so a phone stays light.

## What it still needs

These are the pieces that would move HeroLock off primitive meshes. They are not in the game yet.

1. **Skinned glTF bodies.** One base mesh per body plan, with a skeleton, so the same face can walk, sit, and hold a tool. Morph targets on the head carry the sliders (jaw, cheeks, eyes, nose, ears) instead of rebuilding spheres.
2. **PBR skin and hair.** A skin material with color, roughness, and a soft normal, plus hair cards or a simple shell. Textures should come from CC0 libraries named in `CREDITS.md` (Poly Haven, ambientCG, Kenney, Quaternius) or from three.js examples. Not from a commercial game.
3. **A preset gallery people can browse.** The text codes are the start. A later gallery can show a rendered thumbnail made on this device, a name, and a share code. Thumbnails are generated here. They are never copied from another game's album.

Phones stay on the low graphics setting. The gallery does not download meshes. A shared face is a few hundred bytes of text.
