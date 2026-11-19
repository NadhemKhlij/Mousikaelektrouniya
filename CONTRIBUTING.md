# Working on Mousikaelektrouniya

This guide is for anyone changing the code or the sounds. For what the project is, see [README.md](README.md); for what's planned, see [TODO.md](TODO.md).

## Getting set up

1. Ask Nadhem to add you as a collaborator on GitHub, or fork the repository.
2. Clone it and start a local server from the repository folder:

   ```bash
   git clone https://github.com/NadhemKhlij/Mousikaelektrouniya.git
   cd Mousikaelektrouniya
   python3 -m http.server 8000
   ```

3. Open <http://localhost:8000/bendir-rai/>. Edit, save and reload; there is no build step and no dependencies to install.

You need Python 3 for the local server. The sound-pack builder also needs [ffmpeg](https://ffmpeg.org/).

## How we work together

- `main` is the live site: every push to it is published by GitHub Pages within a minute or two. Keep it working.
- Do each change on its own branch (`git switch -c add-saadaoui-rhythm`), push it, and open a pull request. The other person reviews it before it is merged.
- Keep pull requests small and focused on one thing, so they are easy to review.
- Before you open a pull request, go through the checks in [Testing a change](#testing-a-change).

## How the app is organised

Everything for the main app is in `bendir-rai/index.html`: the CSS in `<style>`, the page structure, then one `<script>`. The script is split into sections marked with comments like `// ---------- audio ----------`; search for `// ----------` to jump between them.

### Data you will most often change

These tables near the top of the script describe the music; most features read from them.

| Name | What it holds |
|---|---|
| `DRUMS` | Every drum stroke: `id`, display `name` and computer `key`. `head: true` marks darbuka strokes; `machine: true` marks the drum machine, which is synthesized. |
| `SCALES` | The maqamat, as semitone steps from the key note. `1.5` and `3.5` are quarter tones. |
| `SOUNDS` | The melodic sounds: `inst` is the sound pack name in `s/`, plus brightness, fades, echo, glide, vibrato and default octave. |
| `MODELLED` | Sounds made in the page instead of from a pack. The oud is listed here. |
| `BEATS` | Rhythm presets: `steps` is 16 for 4/4 or 12 for 6/8, `bpm` is the tempo, and `d` maps each stroke id to a pattern of `x` (hit) and `.` (rest). |
| `PAGES` | The instrument pages: the address after `#`, the name, the simulator or sound it shows, its starting rhythm, and its introduction text. |
| `SIMS` | How each percussion simulator is drawn. A round drum is made of rings (`r: [inner, outer]`, from 0 to 1), which can be split into left (`side: -1`) and right (`side: 1`). `hold` says what happens while a finger stays down. |
| `KITS` | Which strokes each percussion track has on the Compose page. |

### The other sections

- **state:** everything the user changes, saved to the browser's `localStorage` under the key `bendir-rai-4`. On load, the `restore` function checks the saved data and falls back to the example song when something doesn't fit.
- **audio:**
  - `ensureAudio` creates the audio engine on the first click or key press.
  - `loadPack` fetches and decodes a sound pack.
  - `hit` and `playStroke` play drum strokes.
  - `makeVoice` builds one melodic note, from a recording or from the oud model (`makeOud`).
- **sequencer:** the studio's player, which loops a pattern or plays the song order.
- **percussion simulators:** draw a drum from its `SIMS` entry and turn a touch into a stroke, using where it lands.
- **step grids, song bar, tracks:** the studio's editors.
- **keyboard, oud neck and flute holes:** the three playing surfaces for melodic sounds.
- **composer:** the Compose page: timeline, clips, mixer and the two clip editors.
  - Song data lives in `state.compose`. Each track is `{ kind: 'perc' | 'mel', inst, vol, mute, solo, octave, clips }`.
  - A drum clip is `{ start, len, steps: { strokeId: [true/false per 16th note] } }`.
  - A melody clip is `{ start, len, notes: [{ s: step, r: scale degree, l: length in steps }] }`.
- **playing a track and recording into it:** picking a track shows its instrument under the editor (the same drum or keyboard panel the other pages use). With Record on, drum strokes go through `record` → `cRecordHit` and melody notes through `cRecNoteOn` / `cRecNoteOff`, which place them at the step that is playing (`cPos`) and make a one-bar clip where there is none.
- **undo and redo:** every change on the Compose page calls `save()`, which also feeds the undo history. Changes within half a second of each other become one step, and a whole recording take is one step.
- **drum machine page:** the voices in `MACHINE` are synthesized like analog drum machines; `kp()` reads each drum's tune and decay from `state.gb.kit`. The styles are in `GB_PRESETS`, with patterns written as `x` and `.`, and bass lines as one token per step: semitones above the key note, or `.` for a rest, followed by `^` (octave up), `v` (octave down), `a` (accent) or `s` (slide). `state.gb.pats` holds the four patterns (A to D: drums, accents and bass line), while tempo, kit, bass sound and effects in `state.gb` are shared by all of them. `gbSched` switches pattern only at the start of a bar (`gbQueued`, or the next filled pattern when chaining). Each pattern also has `chords` (an index into `CHORD_ROWS` per step) and `filt` (recorded filter moves, one value or `null` per step); `keysChord` plays the chords and `pumpAt` ducks the bass and chords (they go through `GBN.duck`) on each kick. A beat is shared as `#beat=…` (`packBeat` / `unpackBeat`, which checks every value). `acidVoice` and `acidNote` are the 303-style bass, and the page has its own filter, echo and reverb (`gbBuild`, `applyGb`). `DRUMS` entries marked `extra: true` are drum-machine voices that don't appear in the studio grid.
- **audio kept in the browser:** voice recordings and sounds loaded onto pads are too big for `localStorage`, so `audioPut` / `audioGet` keep them in IndexedDB (database `bendir-rai`, store `audio`). `audioTidy` removes anything no song or kit uses any more. They stay on the device they were made on and are never part of shared links.
- **voice tracks:** a track with `kind: 'voice'` has clips `{ start, len, audio, off, nudge }`. `audio` is the IndexedDB key; `off` is the automatic correction for audio delay worked out when recording; `nudge` is the player's own adjustment. `micStart` reads the microphone through an audio worklet (`REC_CODE`) so each block knows when it was heard, and `micStop` turns the take into a clip. `playVoice` plays it, from the clip's start or wherever playback starts.
- **your own drum sounds:** `state.gb.kit[id].sample` points to a stored file; `userBufs[id]` holds it decoded, and `hit` plays it (`playUser`) instead of the built-in voice.
- **download the song as a WAV file:** `renderSong` plays the whole song into an offline audio context (faster than real time) by building a second copy of the mixer with `buildGraph`, and `wavBlob` turns the result into a file.
- **share a song as a link:** `packSong` writes the song in a compact form, which is compressed and placed after `#song=` in the link. `unpackSong` reads it back and checks every value, because a link can contain anything. Opening a shared song keeps the person's own song in `state.composeBackup` until they choose.
- **instrument pages:** reads the address after `#` (for example `#oud`) and shows that page. Instrument pages use their own practice rhythm (`state.practice`) and voice (`state.tracks.solo`), so they never change the studio song.

### Saved data

People's songs are stored in their browser. If you change the shape of what is saved, make sure `restore` still accepts older saved data (fill in what's missing) instead of throwing it away. If an old shape really can't be read, change the storage key (`bendir-rai-4`) so old data is ignored rather than breaking the page.

## Common tasks

### Add a rhythm

Add an entry to `BEATS`. Use 16 steps for 4/4 and 12 for 6/8, and name strokes by their `DRUMS` id:

```js
Saadaoui: { steps: 16, bpm: 96, d: { dum: 'x.....x...x.....', tak: '....x.......x...', ka: '..x.......x...x.' } },
```

It appears in the studio, on the instrument pages that use those strokes, and as a fill on the Compose page (4/4 only).

### Use real recordings for an instrument

Name each recording after its note (`C4.wav`, `Eb3.wav`, `F#2.wav`), put them in one folder, and run:

```bash
python3 tools/build_packs.py notes path/to/recordings oud
```

This trims and levels each note and writes `bendir-rai/s/oud.json`. Notes can be any set; the app uses the nearest recording and shifts its pitch.

- **For the oud:** remove `oud` from `MODELLED` so the app uses the recordings instead of the model.
- **For a new instrument:** also add a `SOUNDS` entry whose `inst` is the pack name.

[TODO.md](TODO.md) has the guide for recording.

### Change or add a drum sound

1. Edit `tools/packs.json`. Each drum entry says where the recording comes from (`vcsl:` for the Versilian library, or a full URL), how many seconds to keep, its peak level and its silence threshold.
2. Rebuild:

   ```bash
   python3 tools/build_packs.py --only drums
   ```

3. For a new stroke, also add it to `DRUMS`, to the right `SIMS` entry (where it sits on the drum) and to `KITS` (for the Compose page).

Running `python3 tools/build_packs.py` with no options rebuilds every pack from `tools/packs.json`; downloads are cached in `tools/.cache/`.

### Add an instrument page

Add an entry to `PAGES`. Percussion pages point at a `SIMS` key; melodic pages name a `SOUNDS` entry and a playing surface (`piano`, `oud` or `pipe`). The navigation and the address (`#your-page`) work automatically. Add the page to the list on the home page (`index.html`) too.

### The installable app and link previews

- `bendir-rai/manifest.webmanifest` names the app and its icons, which is what makes it installable.
- `bendir-rai/sw.js` is the service worker that makes it work offline:
  - the page itself is always fetched fresh when online, so changes show up straight away;
  - sounds and fonts come from the cache and are refreshed in the background.

  If you rename or remove a file listed in `CORE` at the top of `sw.js`, update that list. To force everyone's cache to clear, change `CACHE` (for example to `bendir-rai-v2`).
- The link-preview tags (`og:` and `twitter:`) are in the `<head>` of `bendir-rai/index.html` and `index.html`. The preview picture is `og.png` (1200 × 630).

## Rules of the road

- **No build step and no dependencies.** Plain JavaScript in the page, and libraries only if one does a lot of work for us.
- **Colours come from the tokens** at the top of the CSS (`--bg`, `--ink`, `--drum`, `--synth` and so on). The light values are on `:root`, and the dark values are repeated in the two dark-mode blocks under it. Don't put a colour directly on a component, or it will break in one of the two themes.
- **It must work on a phone.** Check at about 400 px wide: no sideways scrolling of the page, and everything usable by touch.
- **Only add recordings we're allowed to share.** That means public domain, Creative Commons or our own, and each one credited in the README. A recording with no licence can't go in, even if it's on GitHub.
- **Write for musicians.** Labels and help text use the words a player would use.

## Testing a change

There are no automated tests yet. Before opening a pull request, check by hand:

- [ ] The studio plays (▶ Play) and the drum heads respond to taps.
- [ ] The Compose page plays the example song, and you can add a clip and a note.
- [ ] The pages you changed work, and so does one you didn't change.
- [ ] It works at phone width (open your browser's developer tools and pick a phone size), in both light and dark mode.
- [ ] The browser console shows no errors.
- [ ] A song you made before your change still loads after it. Saved songs live in your browser, so test in the same browser.
