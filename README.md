# Bendir & Raï

Two small browser instruments built with the Web Audio API. No build step, no dependencies.

- **`bendir-rai/`** — every instrument is played on a screen shaped like the real thing. The percussion: a darbuka (centre Dum, ring Slap, edges Tak and Ka, hold to roll), a bendir with buzzing snares, a tar with jingles, a two-stick tbal, shqashiq castanets, claps and an 80s drum machine, with an optional big-button view and lights that show the next hit. The melodic instruments: a fretless oud neck, flute holes for the gasba and zorna, and piano keys for the raï synths. Three parts (lead, chords, bass) and four patterns chain into a song.
- **`sixteen-steps/`** — the original 16-step drum machine and synth, fully synthesized.

## Play online

<https://nadhemkhlij.github.io/Mousikaelektrouniya/>

## Run locally

The percussion and keyboard recordings are loaded with `fetch`, so serve the folder over HTTP rather than opening the file directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/bendir-rai/> or <http://localhost:8000/sixteen-steps/>.

## Instrument pages

Each instrument also has its own page, with a short introduction and a rhythm to play along with:
[darbuka](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#darbuka),
[bendir](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#bendir),
[tar](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#tar),
[tbal](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#tbal),
[shqashiq](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#shqashiq),
[drum machine](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#drum-machine),
[oud](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#oud),
[gasba](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#gasba),
[zorna](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#zorna) and the
[raï keyboard](https://nadhemkhlij.github.io/Mousikaelektrouniya/bendir-rai/#keyboard).
Practising on these pages never changes your song in the studio.

## The oud

No openly licensed oud recordings were available, so the oud is a physical model of a plucked double string with a deep wooden body. Its settings were tuned by measuring real oud recordings (how fast each note fades, how bright it is, where the body resonates) and matching the model to them. The recordings were used only as a reference and are not part of this project.

## Rhythms

Fazzani, Douik, Barwal, Btayhi and Khatm follow published dum/tak transcriptions; Stambeli and Raï are sketches. Correct them by ear, or record your own with **Record my taps**.

## Sample credits

- Percussion: [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 / public domain): darbuka, frame drums, tambourine, finger cymbals, bass drum and claps.
- Darbuka slap: [Darbuka App](https://github.com/codewithasfend/Darbuka-App) by asfend (MIT).
- Instrument notes: FluidR3 GM soundfont by Frank Wen (CC BY 3.0), via [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).
- The gasba uses the soundfont's pan-flute recording with added breath. The oud (a plucked-string model) and the drum machine are synthesized in the page.

## Licence

The code is released under the [MIT licence](LICENSE). The recordings keep their own terms, listed under Sample credits.
