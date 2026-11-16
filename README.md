# Bendir & Raï

Two small browser instruments built with the Web Audio API. No build step, no dependencies.

- **`bendir-rai/`** — Tunisian percussion pads (darbuka dum/tak/ka, bendir, tar, shqashiq, tbal, clap), an 80s-style drum machine (kick, snare, hats), and a raï keyboard with three parts that play together (lead, chords, bass). It has pitch bend, maqam scales, quarter-tone keys and tap recording, plus four patterns you can chain into a song.
- **`sixteen-steps/`** — the original 16-step drum machine and synth, fully synthesized.

## Run

The percussion and keyboard recordings are loaded with `fetch`, so serve the folder over HTTP rather than opening the file directly:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/bendir-rai/> or <http://localhost:8000/sixteen-steps/>.

## Rhythms

Fazzani, Douik, Barwal, Btayhi and Khatm follow published dum/tak transcriptions; Stambeli and Raï are sketches. Correct them by ear, or record your own with **Record my taps**.

## Sample credits

- Percussion: [Versilian Community Sample Library](https://github.com/sgossner/VCSL) (CC0 / public domain).
- Instrument notes: FluidR3 GM soundfont by Frank Wen (CC BY 3.0), via [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts).

## Licence

The code is released under the [MIT licence](LICENSE). The recordings keep their own terms, listed under Sample credits.
