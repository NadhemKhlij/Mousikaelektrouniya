# Bendir & Raï

Two small browser instruments built with the Web Audio API. No build step, no dependencies.

- **`bendir-rai/`** — a darbuka head you play by where you hit it (centre Dum, ring Slap, rims Tak and Ka, hold to roll, soft or hard touch), hand drums (bendir, tar, shqashiq, tbal, clap) and an 80s-style drum machine. A raï keyboard has three parts that play together (lead, chords, bass), with sounds including gasba, oud, zorna and raï lead, plus pitch bend, maqam scales and quarter-tone keys. Four patterns chain into a song.
- **`sixteen-steps/`** — the original 16-step drum machine and synth, fully synthesized.

## Play online

<https://nadhemkhlij.github.io/Mousikaelektrouniya/>

## Run locally

The percussion and keyboard recordings are loaded with `fetch`, so serve the folder over HTTP rather than opening the file directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/bendir-rai/> or <http://localhost:8000/sixteen-steps/>.

## Rhythms

Fazzani, Douik, Barwal, Btayhi and Khatm follow published dum/tak transcriptions; Stambeli and Raï are sketches. Correct them by ear, or record your own with **Record my taps**.

## Sample credits

- Percussion: [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 / public domain).
- Darbuka slap: [Darbuka App](https://github.com/codewithasfend/Darbuka-App) by asfend (MIT).
- Instrument notes: FluidR3 GM soundfont by Frank Wen (CC BY 3.0), via [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).
- The gasba uses the soundfont's pan-flute recording with added breath. The oud (a plucked-string model) and the drum machine are synthesized in the page.

## Licence

The code is released under the [MIT licence](LICENSE). The recordings keep their own terms, listed under Sample credits.
