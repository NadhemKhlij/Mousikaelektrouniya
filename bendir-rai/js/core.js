// Bendir & Raï — Shared data and state: drums, maqamat, sounds, rhythms, instrument pages, and saving to the browser.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

var STEPS = 16, ROWS = 8, NPAT = 4, LETTERS = ['A', 'B', 'C', 'D'];
var $ = function (id) { return document.getElementById(id); };
function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

var DRUMS = [
  { id: 'dum', name: 'Dum', key: 'B', head: true }, { id: 'tak', name: 'Tak', key: 'N', head: true }, { id: 'ka', name: 'Ka', key: 'M', head: true },
  { id: 'slap', name: 'Slap', key: 'V', head: true }, { id: 'roll', name: 'Roll', key: 'R', head: true },
  { id: 'bendir', name: 'Bendir', key: '4' }, { id: 'bendirt', name: 'Bendir edge', key: '' },
  { id: 'tar', name: 'Tar', key: '5' }, { id: 'tarj', name: 'Tar jingles', key: '' },
  { id: 'shq', name: 'Shqashiq', key: '6' },
  { id: 'tbal', name: 'Tbal', key: '7' }, { id: 'tbalt', name: 'Tbal thin stick', key: '' },
  { id: 'clap', name: 'Clap', key: '8' },
  { id: 'kick', name: 'Kick', key: '9', machine: true }, { id: 'snare', name: 'Snare', key: '0', machine: true },
  { id: 'hat', name: 'Hat', key: '-', machine: true }, { id: 'ohat', name: 'Open hat', key: '=', machine: true },
  // more drum-machine voices, used on the Drum machine page and in Compose (not shown in the studio grid)
  { id: 'mclap', name: 'Machine clap', key: '', machine: true, extra: true }, { id: 'rim', name: 'Rim', key: '', machine: true, extra: true },
  { id: 'ltom', name: 'Low tom', key: '', machine: true, extra: true }, { id: 'htom', name: 'High tom', key: '', machine: true, extra: true },
  { id: 'ride', name: 'Ride', key: '', machine: true, extra: true }, { id: 'cow', name: 'Cowbell', key: '', machine: true, extra: true }
];
var ALT = { dum: 1, tak: 1, ka: 1, clap: 1, tarj: 1 }; // drums with a second recorded take
var NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
var SCALES = { hijaz: [0, 1, 4, 5, 7, 8, 10], kurd: [0, 1, 3, 5, 7, 8, 10], nahawand: [0, 2, 3, 5, 7, 8, 10], bayati: [0, 1.5, 3, 5, 7, 8, 10], rast: [0, 2, 3.5, 5, 7, 9, 10.5], ajam: [0, 2, 4, 5, 7, 9, 11] };

var SOUNDS = {
  'Raï lead':    { inst: 'lead',      cutoff: 92, attack: 1,  release: 16, delay: 26, octave: 4, glide: 28, vibrato: 28 },
  Zorna:         { inst: 'zorna',     cutoff: 96, attack: 1,  release: 10, delay: 10, octave: 4, glide: 22, vibrato: 20 },
  Gasba:         { inst: 'gasba',     cutoff: 94, attack: 6,  release: 18, delay: 22, octave: 4, glide: 34, vibrato: 30, breath: 45 },
  Oud:           { inst: 'oud',       cutoff: 100, attack: 0, release: 40, delay: 8,  octave: 3, glide: 0,  vibrato: 0 },
  Accordion:     { inst: 'accordion', cutoff: 96, attack: 2,  release: 14, delay: 8,  octave: 4, glide: 0,  vibrato: 6 },
  'Synth brass': { inst: 'brass',     cutoff: 90, attack: 1,  release: 18, delay: 18, octave: 4, glide: 0,  vibrato: 8 },
  Strings:       { inst: 'strings',   cutoff: 92, attack: 30, release: 55, delay: 15, octave: 3, glide: 0,  vibrato: 10 },
  Bass:          { inst: 'bass',      cutoff: 85, attack: 0,  release: 12, delay: 0,  octave: 2, glide: 0,  vibrato: 0 },
  'Analog lead': { inst: '',          cutoff: 72, attack: 1,  release: 18, delay: 26, octave: 4, glide: 28, vibrato: 30 },
  'Acid bass':   { inst: 'acid',      cutoff: 100, attack: 0, release: 8,  delay: 12, octave: 2, glide: 0,  vibrato: 0 }
};
// Sounds made in the page instead of from a recorded pack. When real oud recordings are packed as
// s/oud.json (python3 tools/build_packs.py notes FOLDER oud), delete oud from this list to use them.
var MODELLED = { oud: true, acid: true };
var SOUND_KEYS = ['inst', 'cutoff', 'attack', 'release', 'delay', 'glide', 'vibrato', 'octave', 'breath'];
var TRACKS = [
  { id: 'lead', name: 'Lead', sound: 'Raï lead', level: 70, what: 'one note per step' },
  { id: 'chords', name: 'Chords', sound: 'Strings', level: 45, what: 'each row is a chord; fill steps in a row to hold it' },
  { id: 'bass', name: 'Bass', sound: 'Bass', level: 75, what: 'one note per step' }
];

// Fazzani, Douik, Barwal, Btayhi and Khatm follow published dum/tak transcriptions; Stambeli and the raï grooves are sketches.
var BEATS = {
  Fazzani:  { steps: 12, bpm: 126, d: { dum: 'x..x..x..x..', tak: '..x..x..x..x', ka: '.x..x..x..x.' } },
  Douik:    { steps: 16, bpm: 100, d: { dum: 'x.......x.......', tak: '..x...x.....x...', ka: '....x.....x...x.' } },
  Barwal:   { steps: 16, bpm: 132, d: { dum: 'x.......x.......', tak: '....x.x.....x...' } },
  Btayhi:   { steps: 16, bpm: 76,  d: { dum: 'x...............', tak: '..x...x.x...x...' } },
  Khatm:    { steps: 12, bpm: 120, d: { dum: 'x...x.x.....', tak: '..........x.' } },
  Stambeli: { steps: 12, bpm: 110, d: { shq: 'x.xx.xx.xx.x', tbal: 'x.....x..x..' } },
  'Raï':    { steps: 16, bpm: 100, d: { dum: 'x..x....x.x.....', tak: '....x.......x...', ka: '......x.......x.', tar: '..x...x...x...x.' } },
  'Raï 80s machine': { steps: 16, bpm: 100, d: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', ohat: '..............x.', dum: 'x..x....x.x.....', tak: '....x.......x..x' } }
};

// ---------- state ----------
function blankDrums() { var o = {}; DRUMS.forEach(function (d) { o[d.id] = new Array(STEPS).fill(false); }); return o; }
function blankGrid() { var m = []; for (var r = 0; r < ROWS; r++) m.push(new Array(STEPS).fill(false)); return m; }
function blankPattern() { var n = {}; TRACKS.forEach(function (t) { n[t.id] = blankGrid(); }); return { steps: 16, beat: '', drums: blankDrums(), notes: n }; }
function trackFromSound(name, level) {
  var s = SOUNDS[name], o = { sound: name, level: level, mute: false, orn: false };
  SOUND_KEYS.forEach(function (k) { o[k] = s[k]; });
  return o;
}
var state = {
  bpm: 100, swing: 0, vol: 80, rec: false, mode: 'loop', touch: 85,
  perc: 'darbuka', percView: 'real', guide: true, surface: 'auto', oudSnap: true, oudTrem: false, page: '', practice: null, compose: null,
  root: 2, scale: 'nahawand', qt: new Array(12).fill(false),
  levels: {}, tracks: {}, sel: 'lead',
  patterns: [], cur: 0, chain: []
};
DRUMS.forEach(function (d) { state.levels[d.id] = d.machine ? 70 : 80; });
TRACKS.forEach(function (t) { state.tracks[t.id] = trackFromSound(t.sound, t.level); });
state.tracks.solo = trackFromSound('Raï lead', 75);
// On an instrument page you practise over your own rhythm and play your own voice, so the song is never changed.
var PAGES = {
  compose: { name: 'Compose', kind: 'compose' },
  darbuka: { name: 'Darbuka', kind: 'perc', sim: 'darbuka', beat: 'Raï',
    about: 'A goblet drum, held under the arm or on the knee. It carries the rhythm in Tunisian and raï music: a deep <b>Dum</b> from the middle of the skin and sharp <b>Tak</b> and <b>Ka</b> strokes from the edge.' },
  bendir: { name: 'Bendir', kind: 'perc', sim: 'bendir', beat: 'Fazzani',
    about: 'A large frame drum held upright in one hand. Gut snares stretched under the skin give every stroke its buzz. It is played at Sufi gatherings, festivals and weddings across the Maghreb.' },
  tar: { name: 'Tar', kind: 'perc', sim: 'tar', beat: 'Douik',
    about: 'A small frame drum with metal jingles set into its rim, played in Tunisian malouf and popular music. Strike the skin for the beat and shake the jingles in between.' },
  tbal: { name: 'Tbal', kind: 'perc', sim: 'tbal', beat: 'Barwal',
    about: 'A big double-sided drum played with two sticks, often outdoors beside the zorna at weddings and festivals. A heavy curved stick gives the deep beat and a thin stick fills the space around it.' },
  shqashiq: { name: 'Shqashiq', kind: 'perc', sim: 'shq', beat: 'Stambeli',
    about: 'Large iron castanets, one pair in each hand, also called krakeb. They drive stambeli, the trance music of Tunisia, with a fast galloping clatter.' },
  'drum-machine': { name: 'Drum machine', kind: 'groove',
    about: 'Analog-style drums and an acid bass line, for techno, house and acid house, and the 80s pop-raï sound.' },
  oud: { name: 'Oud', kind: 'mel', sound: 'Oud', surface: 'oud', beat: 'Douik',
    about: 'A short-necked lute with a deep, pear-shaped body and no frets, plucked with a long plectrum. Without frets, the player can land between the notes of a piano, which the maqam needs.' },
  gasba: { name: 'Gasba', kind: 'mel', sound: 'Gasba', surface: 'pipe', beat: 'Fazzani',
    about: 'A long flute of cane or metal, blown across its open top end. Its breathy, wandering lines answer the singer in traditional raï and Bedouin music.' },
  zorna: { name: 'Zorna', kind: 'mel', sound: 'Zorna', surface: 'pipe', beat: 'Barwal',
    about: 'A loud double-reed pipe, also called zokra in Tunisia. Made to be heard outdoors, it plays with the tbal at weddings and celebrations.' },
  keyboard: { name: 'Raï keyboard', kind: 'mel', surface: 'piano', sounds: true, beat: 'Raï 80s machine',
    about: 'From the 1980s, keyboards took the lead in pop-raï: bright synth leads bent like a voice, accordion and brass sounds, and quarter tones from oriental keyboards.' }
};
function PG() { return PAGES[state.page] || null; }
function curTrack() { var g = PG(); if (g && g.kind === 'compose') return cKeysTrack(); return g && g.kind === 'mel' ? 'solo' : state.sel; }
function patAt(i) { return i === -1 ? state.practice : state.patterns[i]; }
function P() { return state.page ? state.practice : state.patterns[state.cur]; }
function T() { var id = curTrack(); return state.tracks[id] || compCache[id]; }

function fill(grid, row, steps) { steps.forEach(function (i) { grid[row][i] = true; }); }
function range(a, b) { var o = []; for (var i = a; i <= b; i++) o.push(i); return o; }
function setDrums(p, d) { Object.keys(d).forEach(function (id) { for (var i = 0; i < STEPS; i++) p.drums[id][i] = d[id][i] === 'x'; }); }
function demo() {
  // An original example in D Nahawand at 100 BPM: verse (A), turnaround (B), drum break (C).
  state.patterns = []; for (var i = 0; i < NPAT; i++) state.patterns.push(blankPattern());
  var A = state.patterns[0], B = state.patterns[1], C = state.patterns[2];
  setDrums(A, BEATS['Raï 80s machine'].d); A.beat = 'Raï 80s machine';
  fill(A.notes.chords, 0, range(0, 7)); fill(A.notes.chords, 5, range(8, 11)); fill(A.notes.chords, 6, range(12, 15));
  [[0, 0], [3, 0], [6, 7], [8, 5], [11, 5], [12, 6], [14, 6]].forEach(function (n) { A.notes.bass[n[1]][n[0]] = true; });
  [[0, 4], [2, 3], [3, 4], [4, 5], [6, 4], [8, 3], [10, 2], [11, 3], [12, 1], [14, 0]].forEach(function (n) { A.notes.lead[n[1]][n[0]] = true; });
  setDrums(B, BEATS['Raï 80s machine'].d); B.beat = 'Raï 80s machine';
  B.drums.snare[14] = B.drums.snare[15] = true; B.drums.tak[13] = true;
  fill(B.notes.chords, 3, range(0, 7)); fill(B.notes.chords, 4, range(8, 15));
  [[0, 3], [3, 3], [6, 3], [8, 4], [11, 4], [12, 4], [14, 7]].forEach(function (n) { B.notes.bass[n[1]][n[0]] = true; });
  [[0, 6], [1, 5], [2, 4], [4, 3], [6, 4], [8, 5], [9, 4], [10, 3], [12, 2], [13, 1], [14, 2]].forEach(function (n) { B.notes.lead[n[1]][n[0]] = true; });
  setDrums(C, BEATS['Raï'].d); C.beat = 'Raï'; C.drums.kick[0] = true;
  fill(C.notes.chords, 0, range(0, 15));
  state.chain = [0, 0, 1, 0, 2, 1];
  state.cur = 0; state.bpm = 100; state.root = 2; state.scale = 'nahawand'; autoQt();
}
function loadBeat(name) {
  var b = BEATS[name], p = P();
  p.drums = blankDrums(); setDrums(p, b.d);
  p.steps = b.steps; p.beat = name; state.bpm = b.bpm;
  if (b.steps === 12) state.swing = 0;
}
function loadSound(name) {
  var tr = T(), s = SOUNDS[name];
  SOUND_KEYS.forEach(function (k) { tr[k] = s[k]; });
  tr.sound = name;
}
function autoQt() {
  state.qt = new Array(12).fill(false);
  SCALES[state.scale].forEach(function (d) { if (d % 1) state.qt[(state.root + Math.ceil(d)) % 12] = true; });
}
function patternEmpty(p) {
  var any = function (g) { return Object.keys(g).some(function (k) { return g[k].some(function (r) { return Array.isArray(r) ? r.some(Boolean) : r; }); }); };
  return !any(p.drums) && !any(p.notes);
}

var saveTimer, STORE = 'bendir-rai-4';
function save() {
  clearTimeout(saveTimer);
  if (state.page === 'compose' && hist && hist.last != null) histSoon();
  saveTimer = setTimeout(function () { try { localStorage.setItem(STORE, JSON.stringify(Object.assign({}, state, { page: '' }))); } catch (e) {} }, 300);
}
(function restore() {
  var ok = false;
  try {
    var s = JSON.parse(localStorage.getItem(STORE));
    if (s && s.patterns && s.patterns.length === NPAT && s.tracks && SCALES[s.scale] && s.qt && s.qt.length === 12) {
      s.patterns.forEach(function (p) {
        if (p.steps !== 12 && p.steps !== 16) throw 0;
        DRUMS.forEach(function (d) { // drums added in later versions start empty
          if (!p.drums[d.id]) p.drums[d.id] = new Array(STEPS).fill(false);
          else if (p.drums[d.id].length !== STEPS) throw 0;
        });
        TRACKS.forEach(function (t) { if (!p.notes[t.id] || p.notes[t.id].length !== ROWS) throw 0; });
      });
      TRACKS.forEach(function (t) { if (!s.tracks[t.id]) throw 0; });
      Object.assign(state.levels, s.levels || {}); delete s.levels;
      delete s.page;
      if (s.practice) {
        if (s.practice.steps !== 12 && s.practice.steps !== 16) s.practice = null;
        else DRUMS.forEach(function (d) { if (!s.practice.drums[d.id]) s.practice.drums[d.id] = new Array(STEPS).fill(false); });
      }
      if (s.tracks && !s.tracks.solo) delete s.tracks.solo;
      Object.assign(state, s); state.rec = false; ok = true;
      if (!state.tracks.solo) state.tracks.solo = trackFromSound('Raï lead', 75);
      if (!state.tracks[state.sel]) state.sel = 'lead';
      state.chain = (state.chain || []).filter(function (i) { return i >= 0 && i < NPAT; });
    }
  } catch (e) {}
  if (!ok) demo();
  if (!state.practice) state.practice = blankPattern();
})();
