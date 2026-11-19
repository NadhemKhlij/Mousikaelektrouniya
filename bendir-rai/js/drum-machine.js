// Bendir & Raï — The Drum machine page: analog drums, acid bass, chords, effects, four patterns, beat links and your own sounds.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

// ---------- drum machine page: analog drums + acid bass line ----------
var GB_VOICES = ['kick', 'snare', 'mclap', 'hat', 'ohat', 'rim', 'ltom', 'htom', 'ride', 'cow'];
var GB_NAMES = { kick: 'Kick', snare: 'Snare', mclap: 'Clap', hat: 'Closed hat', ohat: 'Open hat', rim: 'Rim', ltom: 'Low tom', htom: 'High tom', ride: 'Ride', cow: 'Cowbell' };
// Each style: tempo, swing, key note, drum patterns (x = hit), accents, drum shaping [tune, decay], levels,
// and the bass line: one token per step: a number of semitones above the key note, "." for silence,
// then ^ (octave up), v (octave down), a (accent), s (slide). ch: one chord per step (an index into
// CHORD_ROWS, or "."), keys: the chord sound, pump: how much the kick ducks the bass and chords.
var GB_PRESETS = {
  Techno: { bpm: 130, swing: 0, root: 9, d: { kick: 'x...x...x...x...', mclap: '....x.......x...', hat: '..x...x...x...x.', ride: 'x.x.x.x.x.x.x.x.', rim: '...x.....x....x.', ltom: '..........x.....' },
    acc: 'x...x...x...x...', kit: { kick: [-2, 1.3], ride: [0, 0.7] }, lv: { ride: 40, rim: 45, ltom: 55, hat: 60 },
    bass: '. 0 0 0 . 0 0 0 . 0 0 0 . 0 0 3', synth: { wave: 'sawtooth', cut: 24, res: 40, env: 35, dec: 18, acc: 40, drive: 35, vol: 70 }, fx: [0, 20, 18], ch: '. . . 0 . . . . . . 0 . . . . .', keys: { sound: 'Stab', cut: 45, len: 12, vol: 55, sev: false }, pump: 25 },
  House: { bpm: 124, swing: 20, root: 5, d: { kick: 'x...x...x...x...', mclap: '....x.......x...', ohat: '..x...x...x...x.', hat: 'x.xxx.xxx.xxx.xx', rim: '.......x.......x' },
    acc: 'x...x...x...x...', kit: { kick: [0, 1], ohat: [0, 0.8] }, lv: { hat: 35, rim: 40, ohat: 60 },
    bass: '0 . . 0 . . 0 . 3 . . 3 . 5 . 7', synth: { wave: 'square', cut: 35, res: 20, env: 25, dec: 45, acc: 30, drive: 10, vol: 72 }, fx: [0, 18, 22], ch: '. . 0 . . . 0 . . . 4 . . . 5 .', keys: { sound: 'Organ', cut: 65, len: 14, vol: 55, sev: true }, pump: 35 },
  'Acid house': { bpm: 122, swing: 6, root: 9, d: { kick: 'x...x...x...x...', mclap: '....x.......x...', hat: '..x...x...x...x.', ohat: '......x.......x.', cow: '..........x.....' },
    acc: 'x...x...x...x...', kit: { kick: [-1, 1.2] }, lv: { cow: 35, ohat: 45 },
    bass: '0a 12s 0 . 0 3a 15s 3 0 . 12 7a 10s 12 3 0a', synth: { wave: 'sawtooth', cut: 18, res: 88, env: 72, dec: 32, acc: 75, drive: 45, vol: 70 }, fx: [0, 28, 12], ch: '', keys: { sound: 'Stab', cut: 50, len: 12, vol: 50, sev: false }, pump: 15 },
  'Deep house': { bpm: 120, swing: 24, root: 2, d: { kick: 'x...x...x...x...', rim: '..x..x....x..x..', ohat: '..x...x...x...x.', mclap: '....x.......x...', hat: '.x.x.x.x.x.x.x.x' },
    acc: 'x...x...x...x...', kit: { kick: [-3, 1.2], mclap: [-2, 1.3] }, lv: { hat: 30, mclap: 45, rim: 45 },
    bass: '0s 0s 0 . . . 0s 3 . . . . 5s 5 3 .', synth: { wave: 'square', cut: 15, res: 8, env: 15, dec: 70, acc: 20, drive: 5, vol: 78 }, fx: [-15, 22, 35], ch: '0 . . . . . . . 2 . . . . . . .', keys: { sound: 'Pad', cut: 40, len: 85, vol: 50, sev: true }, pump: 45 },
  Minimal: { bpm: 126, swing: 10, root: 7, d: { kick: 'x...x...x...x...', rim: '...x..x...x..x..', hat: '.x.x.x.x.x.x.x.x', mclap: '....x.......x...', cow: '......x.......x.' },
    acc: 'x...x...x...x...', kit: { kick: [0, 0.8], cow: [5, 0.6] }, lv: { hat: 30, mclap: 35, cow: 30 },
    bass: '. . 0 . . . 0 . . . 0 . . 0 . .', synth: { wave: 'square', cut: 30, res: 50, env: 50, dec: 10, acc: 40, drive: 20, vol: 70 }, fx: [0, 30, 15], ch: '. . . . . . . 0 . . . . . . . .', keys: { sound: 'Stab', cut: 35, len: 8, vol: 45, sev: false }, pump: 20 },
  Electro: { bpm: 128, swing: 0, root: 4, d: { kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.xxx.', cow: '..x..x..........', htom: '..............x.' },
    acc: 'x.....x...x.....', kit: { kick: [-5, 1.6], cow: [0, 0.7] }, lv: { cow: 40, htom: 55 },
    bass: '0 . 0 12 . 0 . 7 0 . 0 12 . 10 . 7', synth: { wave: 'square', cut: 35, res: 40, env: 40, dec: 20, acc: 45, drive: 25, vol: 70 }, fx: [0, 15, 10], ch: '', keys: { sound: 'Stab', cut: 55, len: 10, vol: 50, sev: false }, pump: 0 },
  'Raï 80s': { bpm: 104, swing: 12, root: 2, d: { kick: 'x..x....x.x.....', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', ohat: '..............x.', mclap: '....x.......x...' },
    acc: 'x.......x.......', kit: {}, lv: { mclap: 40, hat: 50 },
    bass: '0 . . 0 . . 7 . 5 . . 5 . . 3 .', synth: { wave: 'square', cut: 30, res: 25, env: 30, dec: 40, acc: 30, drive: 10, vol: 70 }, fx: [0, 20, 20], ch: '0 . . . . . . . 4 . . . 5 . . .', keys: { sound: 'Organ', cut: 55, len: 40, vol: 45, sev: false }, pump: 0 }
};
function gbBlankBass() { var b = []; for (var i = 0; i < 16; i++) b.push({ on: false, n: 0, o: 0, a: false, s: false }); return b; }
function gbParseBass(str) {
  return str.split(/\s+/).map(function (tok) {
    if (tok === '.') return { on: false, n: 0, o: 0, a: false, s: false };
    var m = /^(-?\d+)([\^vas]*)$/.exec(tok), n = +m[1], f = m[2];
    return { on: true, n: n % 12, o: Math.floor(n / 12) + (f.indexOf('^') >= 0 ? 1 : 0) - (f.indexOf('v') >= 0 ? 1 : 0), a: f.indexOf('a') >= 0, s: f.indexOf('s') >= 0 };
  });
}
// Four patterns (A to D) hold the drums, accents and bass line; the sound settings are shared, as on the hardware.
var GB_LETTERS = ['A', 'B', 'C', 'D'];
function gbBlankPat() { var d = {}; GB_VOICES.forEach(function (id) { d[id] = new Array(16).fill(false); }); return { name: '', drums: d, accent: new Array(16).fill(false), bass: gbBlankBass(), chords: new Array(16).fill(-1), filt: new Array(16).fill(null) }; }
var KEYS_DEFAULT = { sound: 'Organ', cut: 60, len: 20, vol: 55, sev: true, mute: false };
function gbNormalize(g) { // fill in what older saves don't have
  if (!g || !Array.isArray(g.pats)) return;
  g.pats.forEach(function (p) { if (!Array.isArray(p.chords) || p.chords.length !== 16) p.chords = new Array(16).fill(-1); if (!Array.isArray(p.filt) || p.filt.length !== 16) p.filt = new Array(16).fill(null); });
  g.keys = Object.assign({}, KEYS_DEFAULT, g.keys || {});
  if (g.fx && g.fx.pump == null) g.fx.pump = 0;
}
function EP() { return state.gb.pats[state.gb.edit]; } // the pattern being edited
function patFilled(p) { return GB_VOICES.some(function (id) { return p.drums[id].some(Boolean); }) || p.bass.some(function (b) { return b.on; }); }
function gbDefault() {
  var g = { bpm: 128, swing: 0, root: 9, pats: [gbBlankPat(), gbBlankPat(), gbBlankPat(), gbBlankPat()], edit: 0, chain: false, bassMute: false, kit: {},
    synth: { wave: 'sawtooth', cut: 25, res: 60, env: 50, dec: 30, acc: 50, drive: 30, vol: 70 }, keys: Object.assign({}, KEYS_DEFAULT), fx: { filter: 0, echo: 20, verb: 15, pump: 0 } };
  GB_VOICES.forEach(function (id) { g.kit[id] = { tune: 0, decay: 1, mute: false }; });
  return g;
}
function gbMigrate(g) { // songs saved before patterns existed keep their one pattern as A
  if (!g || g.pats || !g.drums) return;
  var a = { name: g.preset || '', drums: g.drums, accent: g.accent, bass: g.bass };
  g.pats = [a, gbBlankPat(), gbBlankPat(), gbBlankPat()]; g.edit = 0; g.chain = false;
  delete g.drums; delete g.accent; delete g.bass; delete g.preset;
}
function gbVariation(a) { // a B pattern for first-time visitors: the same groove with open hats, a snare fill and the bass a fourth higher
  var b = JSON.parse(JSON.stringify(a));
  b.name = a.name ? a.name + ' variation' : '';
  for (var i = 0; i < 16; i++) { if (i % 4 === 2) b.drums.ohat[i] = true; if (i >= 12) b.drums.snare[i] = true; }
  b.drums.hat = b.drums.hat.map(function (v, i) { return v && i % 4 !== 2; });
  b.bass.forEach(function (s2) { if (s2.on) { var n = s2.n + 5; s2.n = n % 12; s2.o += Math.floor(n / 12); } });
  return b;
}
function gbLoad(name) { // a style sets the shared sound and fills the pattern being edited
  var pr = GB_PRESETS[name], g = state.gb, pt = EP();
  g.bpm = pr.bpm; g.swing = pr.swing; g.root = pr.root; pt.name = name;
  GB_VOICES.forEach(function (id) {
    var pat = pr.d[id] || ''; pt.drums[id] = new Array(16).fill(false).map(function (x, i) { return pat[i] === 'x'; });
    var k = pr.kit[id] || [0, 1]; g.kit[id] = { tune: k[0], decay: k[1], mute: false };
    state.levels[id] = pr.lv[id] != null ? pr.lv[id] : 70;
  });
  pt.accent = new Array(16).fill(false).map(function (x, i) { return pr.acc[i] === 'x'; });
  pt.bass = gbParseBass(pr.bass); g.bassMute = false;
  pt.chords = (pr.ch || '').split(/\s+/).concat(new Array(16).fill('.')).slice(0, 16).map(function (t) { return t === '.' || t === '' ? -1 : +t; });
  pt.filt = new Array(16).fill(null);
  g.keys = Object.assign({}, KEYS_DEFAULT, pr.keys || {});
  for (var k2 in pr.synth) g.synth[k2] = pr.synth[k2];
  g.fx = { filter: pr.fx[0], echo: pr.fx[1], verb: pr.fx[2], pump: pr.pump || 0 };
}
function gbValid(g) {
  try {
    return !!g && Array.isArray(g.pats) && g.pats.length === 4 && g.edit >= 0 && g.edit < 4 && g.synth && g.fx && g.kit &&
      GB_VOICES.every(function (id) { return !!g.kit[id]; }) &&
      g.pats.every(function (p) { return p.bass && p.bass.length === 16 && p.chords && p.chords.length === 16 && p.filt && p.filt.length === 16 && p.accent && p.accent.length === 16 && GB_VOICES.every(function (id) { return p.drums[id] && p.drums[id].length === 16; }); });
  } catch (e) { return false; }
}

// sound: the drum machine has its own filter, echo and reverb
var GBN = null, acidV = null, shaperCurves = {};
function gbBuild() {
  var n = { input: ctx.createGain(), duck: ctx.createGain(), lp: ctx.createBiquadFilter(), hp: ctx.createBiquadFilter(), out: ctx.createGain(), echoSend: ctx.createGain(), echo: ctx.createDelay(2), fb: ctx.createGain(), damp: ctx.createBiquadFilter(), verbSend: ctx.createGain(), verb: ctx.createConvolver() };
  // the DJ filter is a low-pass and a high-pass in a row, so a sweep can be scheduled ahead of time
  n.lp.type = 'lowpass'; n.lp.frequency.value = 22000; n.lp.Q.value = 1.2; n.hp.type = 'highpass'; n.hp.frequency.value = 20; n.hp.Q.value = 1.2;
  n.duck.connect(n.input); // bass and chords come in here, so the kick can push them down (the pump)
  n.input.connect(n.lp); n.lp.connect(n.hp); n.hp.connect(n.out); n.out.connect(master);
  n.input.connect(n.echoSend); n.echoSend.connect(n.echo); n.echo.connect(n.damp); n.damp.connect(n.fb); n.fb.connect(n.echo); n.damp.connect(n.lp);
  n.damp.type = 'lowpass'; n.damp.frequency.value = 3500; n.fb.gain.value = 0.38;
  var len = Math.floor(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate); // a simple room: decaying noise
  for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  n.verb.buffer = ir; n.input.connect(n.verbSend); n.verbSend.connect(n.verb); n.verb.connect(n.lp);
  GBN = n;
}
function applyGb() {
  if (!GBN || !state.gb) return;
  var g = state.gb, t = ctx.currentTime, sd = 60 / g.bpm / 4;
  filterAt(g.fx.filter, t, 0.03);
  if (!g.fx.pump) { GBN.duck.gain.cancelScheduledValues(t); GBN.duck.gain.setTargetAtTime(1, t, 0.02); }
  GBN.echoSend.gain.setTargetAtTime(g.fx.echo / 100 * 0.55, t, 0.03);
  GBN.verbSend.gain.setTargetAtTime(g.fx.verb / 100 * 0.6, t, 0.03);
  GBN.echo.delayTime.setTargetAtTime(Math.min(1.9, sd * 3), t, 0.05); // a dotted eighth
}
function filterAt(v, t, tc) { // -100 (low-pass, dark) … 0 (open) … 100 (high-pass, thin)
  GBN.lp.frequency.setTargetAtTime(v < -2 ? 20000 * Math.pow(2, v / 100 * 8.4) : 22000, t, tc);
  GBN.hp.frequency.setTargetAtTime(v > 2 ? 20 * Math.pow(2, v / 100 * 9) : 20, t, tc);
}
function pumpAt(t, sd) { // the kick pushes the bass and chords down, and they swell back before the next beat
  var depth = state.gb.fx.pump / 100 * 0.85; if (!depth) return;
  var gp = GBN.duck.gain; gp.cancelScheduledValues(t); gp.setTargetAtTime(1 - depth, t, 0.004); gp.setTargetAtTime(1, t + 0.03, sd * 0.85);
}
// Chords: one per step, built from the key. In a minor key the chords are i, III, iv, v, VI and VII.
var CHORD_ROWS = [{ deg: 0, minor: true, name: 'i' }, { deg: 3, name: 'III' }, { deg: 5, minor: true, name: 'iv' }, { deg: 7, minor: true, name: 'v' }, { deg: 8, name: 'VI' }, { deg: 10, name: 'VII', dom: true }];
function chordNotes(row) {
  var c = CHORD_ROWS[row], k = state.gb.keys, base = 12 * 4 + state.gb.root + c.deg;
  if (state.gb.root + c.deg > 16) base -= 12; // keep the chords in the middle of the keyboard
  var iv = c.minor ? [0, 3, 7] : [0, 4, 7];
  if (k.sev) iv.push(c.minor || c.dom ? 10 : 11);
  return iv.map(function (x) { return base + x; });
}
var FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'], SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
function chordName(row) { // spelled the way the key is written: minor keys on E, B, F♯ and C♯ use sharps, the others flats
  var c = CHORD_ROWS[row], k = state.gb.keys, names = [4, 11, 6, 1].indexOf(state.gb.root) >= 0 ? SHARP_NAMES : FLAT_NAMES;
  return names[(state.gb.root + c.deg) % 12] + (c.minor ? 'm' : '') + (k.sev ? (c.minor || c.dom ? '7' : 'maj7') : '');
}
function keysChord(t, row, dest) {
  var k = state.gb.keys, notes = chordNotes(row), dur = 0.05 + Math.pow(k.len / 100, 2) * 3;
  var cut = 180 * Math.pow(2, k.cut / 100 * 6.6), f = ctx.createBiquadFilter(), vca = ctx.createGain(), lvl = Math.pow(k.vol / 100, 1.5) * 0.5 / Math.sqrt(notes.length);
  f.type = 'lowpass'; f.Q.value = k.sound === 'Stab' ? 3 : 0.8;
  var att = k.sound === 'Pad' ? 0.35 : 0.004, rel = k.sound === 'Pad' ? 0.6 : k.sound === 'Organ' ? 0.06 : 0.12, end = t + Math.max(dur, att + 0.02);
  if (k.sound === 'Stab') { f.frequency.setValueAtTime(Math.min(18000, cut * 4), t); f.frequency.exponentialRampToValueAtTime(Math.max(60, cut), t + 0.18); }
  else f.frequency.value = Math.min(18000, cut);
  vca.gain.setValueAtTime(0, t); vca.gain.linearRampToValueAtTime(lvl, t + att);
  if (k.sound === 'Stab') vca.gain.setTargetAtTime(0, t + att, Math.max(0.03, dur / 3)); else vca.gain.setTargetAtTime(0, end, rel / 3);
  notes.forEach(function (m) {
    var hz = midiHz(m), stop = end + rel * 2 + 0.1;
    if (k.sound === 'Organ') { // a square and a sine an octave up: the classic house organ
      osc('square', hz, t, stop).connect(f);
      var g2 = ctx.createGain(); g2.gain.value = 0.6; osc('sine', hz * 2, t, stop).connect(g2); g2.connect(f);
    } else [-9, 9].forEach(function (c) { var o = osc('sawtooth', hz, t, stop); o.detune.value = c; o.connect(f); });
  });
  f.connect(vca); vca.connect(dest);
}
function shaper(drive) { // soft clipping, stronger as Drive goes up
  var k = Math.round(drive / 5); if (shaperCurves[k]) return shaperCurves[k];
  var c = new Float32Array(1024), a = 1 + k * 1.2; for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; c[i] = Math.tanh(a * x) / Math.tanh(a); }
  return (shaperCurves[k] = c);
}
// One note of the acid bass: an oscillator through two resonant low-pass filters whose cutoff jumps up
// and falls back on each new note (the envelope), with more of everything on accented notes.
function acidVoice(t, midi, acc, dest, forCompose) {
  var sy = state.gb ? state.gb.synth : gbDefault().synth, hz = midiHz(midi);
  var o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), vca = ctx.createGain(), sh = ctx.createWaveShaper(), out = ctx.createGain();
  o.type = sy.wave; o.frequency.setValueAtTime(hz, t);
  var base = 55 * Math.pow(2, sy.cut / 100 * 7.6), am = acc ? 1 + sy.acc / 100 : 1;
  var peak = Math.min(18000, base * Math.pow(2, sy.env / 100 * 4.5 * am)), dec = (0.05 + Math.pow(sy.dec / 100, 2) * 1.4) * (acc ? 0.7 : 1);
  [f1, f2].forEach(function (f, i) { f.type = 'lowpass'; f.Q.value = i ? 0.7 : 0.7 + sy.res / 100 * 19 * (acc ? 1.1 : 1); f.frequency.setValueAtTime(peak, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, base), t + dec); });
  sh.curve = shaper(sy.drive); out.gain.value = 1 / (1 + sy.drive / 60);
  var level = (acc ? 0.42 * (1 + sy.acc / 160) : 0.32) * Math.pow(sy.vol / 100, 1.5) * 1.6;
  o.connect(f1); f1.connect(f2); f2.connect(vca); vca.connect(sh); sh.connect(out); out.connect(dest);
  vca.gain.setValueAtTime(0, t); vca.gain.linearRampToValueAtTime(level, t + 0.003);
  o.start(t);
  if (forCompose) { vca.gain.value = level; return { osc: o, vca: vca }; } // Compose shapes the note with its own envelope
  return { osc: o, vca: vca, level: level, end: t };
}
function acidNote(t, midi, dur, acc, slideIn, dest) {
  if (slideIn && acidV && acidV.end >= t - 0.002) { // glide into this note without a new attack
    acidV.osc.frequency.setTargetAtTime(midiHz(midi), t, 0.022);
    acidV.vca.gain.cancelScheduledValues(t); acidV.vca.gain.setValueAtTime(acidV.level, t);
  } else acidV = acidVoice(t, midi, acc, dest);
  acidV.end = t + dur;
  acidV.vca.gain.setTargetAtTime(0, t + dur, 0.012);
  try { acidV.osc.stop(t + dur + 0.25); } catch (e) {}
}
function gbMidi(b) { return 12 * 3 + state.gb.root + b.n + 12 * b.o; }
// The grid has 13 rows: the key note up to the key note an octave higher (row 12).
// A step's octave shift (Up/Down) is whatever is left over after its row.
function bassRow(b) { return b.n === 0 && b.o >= 1 ? 12 : b.n; }
function bassShift(b) { return b.o - (bassRow(b) === 12 ? 1 : 0); }

// sequencer
var gbPlaying = false, gbTimer = null, gbStep = 0, gbBase = 0, gbQ = [], gbSkip = {}, gbShown = -1, gbRec = false;
var gbPlayIdx = 0, gbQueued = null, gbPrevBass = null, gbFirstBar = true;
// One step of a pattern. `next` is the pattern that plays after this one, so a slide on the last step
// can glide into the next bar even when the pattern changes there.
function gbStepAt(pat, i, t, sd, dest, next, live) {
  var g = state.gb, vel = pat.accent[i] ? 1.3 : 0.85, md = GBN.duck;
  // filter moves: write the knob into the pattern while recording, and play back what is written
  if (live && gbFiltRec && filtHeld() && pat === g.pats[gbPlayIdx]) pat.filt[i] = g.fx.filter;
  if (pat.filt[i] != null) filterAt(pat.filt[i], t, sd * 0.4);
  else if (i === 0 && !pat.filt.some(function (v) { return v != null; })) filterAt(g.fx.filter, t, 0.02);
  drumDest = dest; rollLen = sd;
  GB_VOICES.forEach(function (id) { if (pat.drums[id][i] && !g.kit[id].mute && !(gbSkip[id] > t)) hit(id, t, vel); });
  drumDest = null;
  if (pat.drums.kick[i] && !g.kit.kick.mute) pumpAt(t, sd);
  if (pat.chords[i] >= 0 && !g.keys.mute) keysChord(t, pat.chords[i], md);
  dest = md;
  var b = pat.bass[i], prev = gbPrevBass;
  gbPrevBass = b.on && !g.bassMute ? b : null;
  if (b.on && !g.bassMute) {
    var nb = i < 15 ? pat.bass[i + 1] : (next || pat).bass[0], slideOut = b.s && nb.on;
    acidNote(t, gbMidi(b), slideOut ? sd * 1.05 : sd * 0.55, b.a, !!prev && prev.s, dest);
  }
}
function gbNextFilled(i) { for (var k = 1; k <= 4; k++) { var j = (i + k) % 4; if (patFilled(state.gb.pats[j])) return j; } return i; }
function gbUpcoming() { return gbQueued != null ? gbQueued : state.gb.chain ? gbNextFilled(gbPlayIdx) : gbPlayIdx; }
function gbSequence(bars) { // which pattern plays in each bar, for downloads and Compose
  var g = state.gb, seq = [], i = g.chain ? (patFilled(g.pats[0]) ? 0 : gbNextFilled(0)) : g.edit;
  for (var b = 0; b < bars; b++) { seq.push(i); if (g.chain) i = gbNextFilled(i); }
  return seq;
}
function gbSched() {
  var g = state.gb, sd = 60 / g.bpm / 4;
  while (gbBase < ctx.currentTime + 0.12) {
    if (gbStep === 0) { // the start of a bar: switch pattern here, so the beat never breaks
      if (gbFirstBar) gbFirstBar = false;
      else { var nx = gbUpcoming(); gbQueued = null; gbPlayIdx = nx; }
    }
    var t = gbBase + (gbStep % 2 ? g.swing / 100 * sd * 0.66 : 0);
    gbStepAt(g.pats[gbPlayIdx], gbStep, t, sd, GBN.input, gbStep === 15 ? g.pats[gbUpcoming()] : null, true);
    gbQ.push({ step: gbStep, time: t, pat: gbPlayIdx });
    gbStep = (gbStep + 1) % 16; gbBase += sd;
  }
}
function gbPlay() {
  ensureAudio(); if (playing) stopStudio(); if (cPlaying) cStop();
  gbPlaying = true; gbStep = 0; gbBase = ctx.currentTime + 0.06; gbQ = []; acidV = null; gbPrevBass = null; applyGb();
  gbPlayIdx = state.gb.edit; gbQueued = null; gbFirstBar = true; gbHeard = gbPlayIdx;
  gbSched(); gbTimer = setInterval(gbSched, 25);
  $('gbPlay').textContent = '■ Stop'; $('gbPlay').classList.add('playing');
}
function gbStop() {
  gbPlaying = false; clearInterval(gbTimer); gbTimer = null; gbQ = []; gbShowStep(-1); gbQueued = null; gbHeard = -1; gbMarkPats();
  if (gbRec) gbSetRec(false);
  $('gbPlay').textContent = '▶ Play'; $('gbPlay').classList.remove('playing');
}
function gbToggle() { gbPlaying ? gbStop() : gbPlay(); }
function gbPick(i) { // edit this pattern; while playing, it also starts at the next bar
  state.gb.edit = i;
  if (gbPlaying) gbQueued = i === gbPlayIdx && gbQueued == null ? null : i;
  gbMarkCells(); save();
}
var gbHeard = -1; // the pattern you can hear right now (the scheduler runs slightly ahead)
function gbFrame() {
  var cur = null; while (gbQ.length && gbQ[0].time <= ctx.currentTime) cur = gbQ.shift();
  if (!cur) return;
  if (cur.pat !== gbHeard) {
    gbHeard = cur.pat;
    if (state.gb.chain && state.gb.edit !== cur.pat) { state.gb.edit = cur.pat; gbMarkCells(); } // in a chain, the grids follow what plays
    gbMarkPats();
  }
  gbShowStep(state.gb.edit === cur.pat ? cur.step : -1);
  var fv = state.gb.pats[cur.pat].filt[cur.step]; // show recorded filter moves on the knob
  if (fv != null && !filtHeld()) { $('gbFilt').value = fv; $('gbFiltOut').textContent = filtLabel(fv); }
  if (fv != null && !filtHeld()) gbMarkFilt();
}
var gbFiltRec = false, filtDown = false, filtTouched = 0;
function filtHeld() { return filtDown || performance.now() - filtTouched < 250; }
function filtLabel(v) { return v < -2 ? 'low-pass' : v > 2 ? 'high-pass' : 'off'; }
function gbRecordHit(id) {
  if (!gbRec || !gbPlaying || GB_VOICES.indexOf(id) < 0) return;
  var sd = 60 / state.gb.bpm / 4, now = ctx.currentTime - (ctx.outputLatency || 0), step = ((Math.round(gbStep - (gbBase - now) / sd) % 16) + 16) % 16;
  gbSkip[id] = ctx.currentTime + sd * 0.7; // do not replay the tap the player just made
  var pt = state.gb.pats[gbPlayIdx]; // taps go into the pattern that is playing
  if (!pt.drums[id][step]) { pt.drums[id][step] = true; pt.name = ''; gbMarkCells(); save(); }
}
function gbSetRec(on) { gbRec = on; $('gbRec').classList.toggle('sel', on); $('gbRec').setAttribute('aria-pressed', on); $('gbRec').textContent = on ? '● Recording taps' : '● Record taps'; }

// page
var gbCells = { drums: {}, accent: [], bass: [], oct: [], acc: [], slide: [], chords: [], filt: [] }, gbCols = [], gbPadEls = {};
function gbMarkFilt() {
  EP().filt.forEach(function (v, i) {
    var b = gbCells.filt[i]; if (!b) return;
    b.classList.toggle('on', v != null); b.style.setProperty('--fh', v == null ? 0 : Math.round((v + 100) / 2));
    b.title = v == null ? '' : 'Filter ' + filtLabel(v) + (v ? ' (' + v + ')' : '');
  });
}
function gbFlash(id) { var p = gbPadEls[id]; if (!p) return; p.classList.add('hit'); clearTimeout(p._t); p._t = setTimeout(function () { p.classList.remove('hit'); }, 90); }
function gbShowStep(n) {
  if (n === gbShown) return;
  if (gbShown >= 0) gbCols[gbShown].forEach(function (e) { e.classList.remove('now'); });
  if (n >= 0) gbCols[n].forEach(function (e) { e.classList.add('now'); });
  gbShown = n;
}
var gbPaint = null;
window.addEventListener('pointerup', function () { gbPaint = null; });
function gbCell(grid, i, label, get, set, extra) {
  var b = el('button', 'cell' + (Math.floor(i / 4) % 2 === 0 ? ' alt' : '') + (i % 4 === 0 && i ? ' beat' : '') + (extra || '')); b.type = 'button';
  b.setAttribute('aria-label', label + ', step ' + (i + 1));
  b.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button === 0) { e.preventDefault(); gbPaint = !get(); set(gbPaint); b._p = true; } });
  b.addEventListener('pointerenter', function () { if (gbPaint !== null && get() !== gbPaint) set(gbPaint); });
  b.addEventListener('click', function () { if (b._p) { b._p = false; return; } set(!get()); });
  grid.appendChild(b); gbCols[i].push(b); return b;
}
function gbBuildGrids() {
  var dg = $('gbDrumGrid'), bg = $('gbBassGrid'), g = state.gb, i;
  dg.textContent = ''; bg.textContent = ''; gbCols = []; for (i = 0; i < 16; i++) gbCols.push([]);
  GB_VOICES.forEach(function (id) {
    var lab = el('button', 'lab', GB_NAMES[id]); lab.type = 'button'; lab.title = 'Mute or unmute';
    lab.addEventListener('click', function () { g.kit[id].mute = !g.kit[id].mute; gbMarkCells(); save(); });
    dg.appendChild(lab); gbCells.drums[id] = { lab: lab, cells: [] };
    for (i = 0; i < 16; i++) (function (i) {
      gbCells.drums[id].cells.push(gbCell(dg, i, GB_NAMES[id], function () { return EP().drums[id][i]; }, function (v) {
        EP().drums[id][i] = v; EP().name = ''; gbMarkCells(); save();
        if (v && !gbPlaying) { ensureAudio(); drumDest = GBN.input; hit(id, ctx.currentTime, EP().accent[i] ? 1.3 : 0.85); drumDest = null; }
      }));
    })(i);
  });
  dg.appendChild(el('span', 'sep'));
  var al = el('span', 'lab', 'Accent'); dg.appendChild(al);
  var ar = []; for (i = 0; i < 16; i++) (function (i) { ar.push(gbCell(dg, i, 'Accent', function () { return EP().accent[i]; }, function (v) { EP().accent[i] = v; EP().name = ''; gbMarkCells(); save(); })); })(i);
  ar.forEach(function (c) { c.classList.add('acc-cell'); }); gbCells.accent = ar;
  var fl = el('span', 'lab', 'Filter moves'); dg.appendChild(fl); gbCells.filt = [];
  for (i = 0; i < 16; i++) (function (i) {
    var b = el('button', 'cell fcell' + (Math.floor(i / 4) % 2 === 0 ? ' alt' : '') + (i % 4 === 0 && i ? ' beat' : '')); b.type = 'button';
    b.setAttribute('aria-label', 'Filter move, step ' + (i + 1) + '. Click to remove it.');
    b.addEventListener('click', function () { EP().filt[i] = null; gbMarkFilt(); save(); });
    dg.appendChild(b); gbCols[i].push(b); gbCells.filt.push(b);
  })(i);
  // chords
  var cg = $('gbChordGrid'); cg.textContent = ''; gbCells.chords = [];
  for (var cr = CHORD_ROWS.length - 1; cr >= 0; cr--) (function (r) {
    var lab = el('span', 'lab' + (r === 0 ? ' rootrow' : ''), chordName(r)); lab.title = CHORD_ROWS[r].name; cg.appendChild(lab); gbCells.chords[r] = [];
    for (var i4 = 0; i4 < 16; i4++) (function (i) {
      gbCells.chords[r].push(gbCell(cg, i, 'Chord ' + chordName(r), function () { return EP().chords[i] === r; }, function (v) {
        EP().chords[i] = v ? r : -1; EP().name = ''; gbMarkCells(); save();
        if (v && !gbPlaying) { ensureAudio(); keysChord(ctx.currentTime, r, GBN.duck); }
      }));
    })(i4);
  })(cr);
  // bass: 13 note rows (the key note up to its octave), then Up/Down, Accent and Slide
  for (var r = 12; r >= 0; r--) (function (r) {
    var lab = el('span', 'lab' + (r % 12 === 0 ? ' rootrow' : ''), NOTE_NAMES[(g.root + r) % 12] + (r === 12 ? ' ↑' : '')); bg.appendChild(lab);
    gbCells.bass[r] = [];
    for (var i2 = 0; i2 < 16; i2++) (function (i) {
      gbCells.bass[r].push(gbCell(bg, i, 'Bass note ' + NOTE_NAMES[(g.root + r) % 12], function () { var b = EP().bass[i]; return b.on && bassRow(b) === r; }, function (v) {
        var b = EP().bass[i], shift = bassShift(b);
        if (v) { b.on = true; b.n = r % 12; b.o = (r === 12 ? 1 : 0) + shift; }
        else b.on = false;
        EP().name = ''; gbMarkCells(); save();
        if (v && !gbPlaying) { ensureAudio(); acidV = null; acidNote(ctx.currentTime, gbMidi(b), 0.25, b.a, false, GBN.input); }
      }));
    })(i2);
  })(r);
  bg.appendChild(el('span', 'sep'));
  [['oct', 'Up / Down'], ['acc', 'Accent'], ['slide', 'Slide']].forEach(function (row) {
    bg.appendChild(el('span', 'lab', row[1])); gbCells[row[0]] = [];
    for (var i3 = 0; i3 < 16; i3++) (function (i) {
      var b = el('button', 'cell txt' + (Math.floor(i / 4) % 2 === 0 ? ' alt' : '') + (i % 4 === 0 && i ? ' beat' : '')); b.type = 'button';
      b.setAttribute('aria-label', row[1] + ', step ' + (i + 1));
      b.addEventListener('click', function () {
        var s2 = EP().bass[i];
        if (row[0] === 'oct') { var sh = bassShift(s2), nx = sh === 0 ? 1 : sh === 1 ? -1 : 0; s2.o = (bassRow(s2) === 12 ? 1 : 0) + nx; } else if (row[0] === 'acc') s2.a = !s2.a; else s2.s = !s2.s;
        EP().name = ''; gbMarkCells(); save();
      });
      bg.appendChild(b); gbCols[i].push(b); gbCells[row[0]].push(b);
    })(i3);
  });
}
function gbMarkCells() {
  var g = state.gb;
  GB_VOICES.forEach(function (id) {
    var c = gbCells.drums[id]; c.lab.classList.toggle('muted', g.kit[id].mute); c.lab.setAttribute('aria-pressed', g.kit[id].mute);
    c.cells.forEach(function (b, i) { setCell(b, EP().drums[id][i]); });
    if (gbPadEls[id]) gbPadEls[id].classList.toggle('muted', g.kit[id].mute);
  });
  var ep = EP();
  gbCells.accent.forEach(function (b, i) { setCell(b, ep.accent[i]); });
  for (var r = 0; r <= 12; r++) gbCells.bass[r].forEach(function (b, i) { setCell(b, ep.bass[i].on && bassRow(ep.bass[i]) === r); });
  for (var i = 0; i < 16; i++) {
    var s3 = ep.bass[i], sh = bassShift(s3);
    gbCells.oct[i].textContent = sh > 0 ? '↑' : sh < 0 ? '↓' : ''; setCell(gbCells.oct[i], sh !== 0);
    setCell(gbCells.acc[i], s3.a); setCell(gbCells.slide[i], s3.s);
  }
  $('gbMuteBass').classList.toggle('sel', g.bassMute); $('gbMuteBass').setAttribute('aria-pressed', g.bassMute);
  CHORD_ROWS.forEach(function (c, r) { gbCells.chords[r].forEach(function (b, i) { setCell(b, ep.chords[i] === r); }); });
  $('gbMuteChords').classList.toggle('sel', g.keys.mute); $('gbMuteChords').setAttribute('aria-pressed', g.keys.mute);
  $('gbSev').classList.toggle('sel', g.keys.sev); $('gbSev').setAttribute('aria-pressed', g.keys.sev);
  gbMarkFilt();
  Array.prototype.forEach.call($('gbPresets').children, function (b) { b.classList.toggle('sel', b.dataset.name === ep.name); });
  gbMarkPats();
}
function gbMarkPats() {
  var g = state.gb;
  gbPatEls.forEach(function (b, i) {
    var playingNow = gbPlaying && gbHeard === i, queued = gbPlaying && gbQueued === i;
    b.classList.toggle('sel', g.edit === i); b.classList.toggle('empty', !patFilled(g.pats[i]));
    b.classList.toggle('playing', playingNow); b.classList.toggle('queued', queued);
    b.setAttribute('aria-pressed', g.edit === i);
    b.title = 'Pattern ' + GB_LETTERS[i] + (g.pats[i].name ? ': ' + g.pats[i].name : patFilled(g.pats[i]) ? '' : ' (empty)') + (playingNow ? ', playing' : queued ? ', starts at the next bar' : '');
  });
  $('gbChain').classList.toggle('sel', g.chain); $('gbChain').setAttribute('aria-pressed', g.chain);
  $('gbPatHint').textContent = gbQueued != null && gbPlaying ? 'Pattern ' + GB_LETTERS[gbQueued] + ' starts at the next bar.' : g.chain ? 'Chain is on: the patterns that have something in them play in turn.' : 'While the music plays, a pattern you pick starts at the end of the bar, so the beat never breaks.';
}
var gbPatEls = [];
function gbVoiceUI() {
  var id = $('gbVoice').value, k = state.gb.kit[id];
  $('gbTune').value = k.tune; $('gbTuneOut').textContent = (k.tune > 0 ? '+' : '') + k.tune;
  $('gbDecay').value = Math.round(k.decay * 100); $('gbDecayOut').textContent = Math.round(k.decay * 100);
  $('gbLevel').value = state.levels[id];
  var smp = state.gb.kit[id].sample;
  $('gbSampleName').textContent = smp ? 'Plays your sound: ' + smp.name : 'Plays the built-in ' + GB_NAMES[id].toLowerCase() + '.';
  $('gbBuiltIn').hidden = !smp;
}
function decodeBytes(bytes) { return new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes.slice(0)); }
function loadUserSample(id) {
  var k = state.gb.kit[id];
  if (!k.sample) { delete userBufs[id]; return Promise.resolve(); }
  return audioGet(k.sample.key).then(function (v) {
    if (!v) { delete k.sample; delete userBufs[id]; return; } // not on this device any more
    return decodeBytes(v.bytes).then(function (b) { userBufs[id] = b; });
  }).catch(function () {});
}
function loadSoundFile(id, file) {
  var note = $('gbSampleNote');
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { note.textContent = 'That file is over 8 MB. Use a short sound: a single hit of a few seconds at most.'; return; }
  note.textContent = 'Loading ' + file.name + '…';
  file.arrayBuffer().then(function (bytes) {
    return decodeBytes(bytes).then(function (buf) {
      var k = state.gb.kit[id], old = k.sample && k.sample.key, key = 'smp-' + id + '-' + Date.now().toString(36);
      if (buf.duration > 10) throw new Error('long');
      return audioPut(key, { name: file.name, bytes: bytes }).then(function (kept) {
        k.sample = { key: key, name: file.name.slice(0, 60) }; userBufs[id] = buf; if (old) audioDel(old);
        save(); gbVoiceUI(); gbMarkPads();
        note.textContent = GB_NAMES[id] + ' now plays ' + file.name + '.' + (kept ? '' : ' This browser cannot keep it after you close the page.');
        ensureAudio(); tap(id);
      });
    });
  }).catch(function (e) {
    note.textContent = e && e.message === 'long' ? 'That sound is longer than 10 seconds. Use a single hit or a short sample.' : 'That file could not be read as audio. Try a WAV, MP3 or OGG file.';
  });
}
function gbMarkPads() { GB_VOICES.forEach(function (id) { var p = gbPadEls[id]; if (!p) return; var own = !!state.gb.kit[id].sample; p.classList.toggle('own', own); p.title = own ? GB_NAMES[id] + ': ' + state.gb.kit[id].sample.name + ' (your sound). Drop a file here to replace it.' : GB_NAMES[id] + '. Drop an audio file here to use your own sound.'; }); }
var GB_SLIDERS = { gbCut: 'cut', gbRes: 'res', gbEnv: 'env', gbDec: 'dec', gbAcc: 'acc', gbDrive: 'drive', gbVol: 'vol' };
function gbRender() {
  var g = state.gb;
  gbBuildGrids(); gbMarkCells();
  $('gbBpm').value = g.bpm; $('gbBpmOut').textContent = g.bpm; $('gbSwing').value = g.swing; $('gbSwingOut').textContent = g.swing;
  $('gbRoot').value = g.root; $('gbWave').value = g.synth.wave;
  Object.keys(GB_SLIDERS).forEach(function (k) { $(k).value = g.synth[GB_SLIDERS[k]]; });
  $('gbFilt').value = g.fx.filter; $('gbFiltOut').textContent = filtLabel(g.fx.filter);
  $('gbPump').value = g.fx.pump; $('gbPumpOut').textContent = g.fx.pump;
  $('gbKeysSound').value = g.keys.sound; $('gbKeysCut').value = g.keys.cut; $('gbKeysLen').value = g.keys.len; $('gbKeysVol').value = g.keys.vol;
  $('gbEcho').value = g.fx.echo; $('gbVerb').value = g.fx.verb;
  gbVoiceUI(); if (ctx) applyGb();
}
function gbNewLine() { // a random acid line in the minor pentatonic, with a few accents and slides
  var pool = [0, 0, 0, 3, 5, 7, 10, 12], b = gbBlankBass();
  b.forEach(function (s2, i) {
    s2.on = i === 0 || Math.random() < 0.68; s2.n = pool[Math.floor(Math.random() * pool.length)] % 12;
    s2.o = Math.random() < 0.18 ? 1 : 0; if (s2.n === 0 && Math.random() < 0.25) s2.o = 1;
    s2.a = Math.random() < 0.25; s2.s = Math.random() < 0.2;
  });
  EP().bass = b; EP().name = ''; gbMarkCells(); save();
}
function gbToCompose() { // add the drums and the bass line to Compose, 8 bars long
  var g = state.gb, bars = Math.min(8, C.bars), note = $('gbNote');
  if (C.tracks.length > 10) { note.textContent = 'Compose already has ' + C.tracks.length + ' tracks. Remove a couple there first.'; return; }
  var dt = { id: cNew('t'), kind: 'perc', inst: 'machine', vol: 85, mute: false, solo: false, octave: 0, clips: [] }, k = percClip('machine', 0, bars);
  var seq = gbSequence(bars).map(function (i) { return g.pats[i]; });
  KITS.machine.strokes.forEach(function (id) { if (GB_VOICES.indexOf(id) >= 0 && !g.kit[id].mute) for (var i = 0; i < bars * 16; i++) k.steps[id][i] = seq[Math.floor(i / 16)].drums[id][i % 16]; });
  k.id = cNew('c'); dt.clips.push(k); C.tracks.push(dt);
  if (!g.bassMute && seq.some(function (pt) { return pt.bass.some(function (b) { return b.on; }); })) {
    var bt = { id: cNew('t'), kind: 'mel', inst: 'Acid bass', vol: 80, mute: false, solo: false, octave: 2, clips: [] }, notes = [];
    for (var bar = 0; bar < bars; bar++) seq[bar].bass.forEach(function (b, i) {
      if (!b.on) return;
      var midi = gbMidi(b), best = 0; for (var r = 1; r <= 14; r++) if (Math.abs(cMidi(bt, r) - midi) < Math.abs(cMidi(bt, best) - midi)) best = r;
      notes.push({ s: bar * 16 + i, r: best, l: b.s ? 2 : 1 });
    });
    bt.clips.push({ id: cNew('c'), start: 0, len: bars, notes: notes }); C.tracks.push(bt);
  }
  if (!g.keys.mute && seq.some(function (pt) { return pt.chords.some(function (c) { return c >= 0; }); }) && C.tracks.length < 12) {
    var kt = { id: cNew('t'), kind: 'mel', inst: g.keys.sound === 'Pad' ? 'Strings' : 'Synth brass', vol: 55, mute: false, solo: false, octave: 3, clips: [] }, kn = [];
    for (var bar2 = 0; bar2 < bars; bar2++) seq[bar2].chords.forEach(function (c, i) {
      if (c < 0) return;
      var len = g.keys.sound === 'Pad' ? Math.max(2, Math.round(Math.pow(g.keys.len / 100, 2) * 3 / (60 / g.bpm / 4))) : 2;
      chordNotes(c).forEach(function (m) {
        var best = 0; for (var r = 1; r <= 14; r++) if (Math.abs(cMidi(kt, r) - m) < Math.abs(cMidi(kt, best) - m)) best = r;
        if (!kn.some(function (x) { return x.s === bar2 * 16 + i && x.r === best; })) kn.push({ s: bar2 * 16 + i, r: best, l: Math.min(len, bars * 16 - (bar2 * 16 + i)) });
      });
    });
    kt.clips.push({ id: cNew('c'), start: 0, len: bars, notes: kn }); C.tracks.push(kt);
  }
  C.bpm = g.bpm; save();
  location.hash = '#compose';
}
// Share a beat: the whole drum machine (all four patterns and the sound) goes into the link after #beat=.
// Your own loaded sounds are not included.
function packBeat() {
  var g = state.gb;
  return JSON.stringify({ v: 1, b: g.bpm, w: g.swing, k: g.root, c: g.chain ? 1 : 0, e: g.edit, bm: g.bassMute ? 1 : 0,
    kit: GB_VOICES.map(function (id) { var k = g.kit[id]; return [k.tune, Math.round(k.decay * 100), k.mute ? 1 : 0, state.levels[id]]; }),
    sy: g.synth, ky: g.keys, fx: g.fx,
    p: g.pats.map(function (pt) {
      return { n: pt.name, d: GB_VOICES.map(function (id) { return bitsHex(pt.drums[id], 16); }), a: bitsHex(pt.accent, 16),
        s: pt.bass.map(function (b) { return b.on ? [b.n, b.o, b.a ? 1 : 0, b.s ? 1 : 0] : 0; }), h: pt.chords, f: pt.filt };
    }) });
}
function num(v, lo, hi) { v = +v; if (!isFinite(v)) throw new Error('not a number'); return Math.max(lo, Math.min(hi, v)); }
function unpackBeat(json) { // checks everything, since a link can contain anything
  var o = JSON.parse(json);
  if (o.v !== 1 || !Array.isArray(o.p) || o.p.length !== 4 || !Array.isArray(o.kit) || o.kit.length !== GB_VOICES.length) throw new Error('not a beat');
  var g = gbDefault(), levels = {};
  g.bpm = int(o.b, 60, 160); g.swing = int(o.w, 0, 60); g.root = int(o.k, 0, 11); g.chain = !!o.c; g.edit = int(o.e, 0, 3); g.bassMute = !!o.bm;
  GB_VOICES.forEach(function (id, j) { var k = o.kit[j]; g.kit[id] = { tune: int(k[0], -12, 12), decay: num(k[1], 25, 250) / 100, mute: !!k[2] }; levels[id] = int(k[3], 0, 100); });
  var sy = o.sy || {}; g.synth = { wave: sy.wave === 'square' ? 'square' : 'sawtooth', cut: num(sy.cut, 0, 100), res: num(sy.res, 0, 100), env: num(sy.env, 0, 100), dec: num(sy.dec, 0, 100), acc: num(sy.acc, 0, 100), drive: num(sy.drive, 0, 100), vol: num(sy.vol, 0, 100) };
  var ky = o.ky || {}; g.keys = { sound: ['Organ', 'Stab', 'Pad'].indexOf(ky.sound) >= 0 ? ky.sound : 'Organ', cut: num(ky.cut, 0, 100), len: num(ky.len, 0, 100), vol: num(ky.vol, 0, 100), sev: !!ky.sev, mute: !!ky.mute };
  var fx = o.fx || {}; g.fx = { filter: num(fx.filter, -100, 100), echo: num(fx.echo, 0, 100), verb: num(fx.verb, 0, 100), pump: num(fx.pump || 0, 0, 100) };
  g.pats = o.p.map(function (q) {
    var pt = gbBlankPat(); pt.name = String(q.n || '').slice(0, 40);
    GB_VOICES.forEach(function (id, j) { pt.drums[id] = hexBits(String((q.d || [])[j] || '').replace(/[^0-9a-f]/gi, ''), 16); });
    pt.accent = hexBits(String(q.a || '').replace(/[^0-9a-f]/gi, ''), 16);
    for (var i = 0; i < 16; i++) {
      var b = (q.s || [])[i]; if (Array.isArray(b)) pt.bass[i] = { on: true, n: int(b[0], 0, 11), o: int(b[1], -1, 2), a: !!b[2], s: !!b[3] };
      var ch = (q.h || [])[i]; pt.chords[i] = ch == null || ch < 0 ? -1 : int(ch, 0, CHORD_ROWS.length - 1);
      var fv = (q.f || [])[i]; pt.filt[i] = fv == null ? null : num(fv, -100, 100);
    }
    return pt;
  });
  return { gb: g, levels: levels };
}
function beatLink() {
  var json = packBeat(), base = location.href.split('#')[0];
  if (window.CompressionStream) return streamBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw')).then(function (z) { return base + '#beat=z' + b64url(z); });
  return Promise.resolve(base + '#beat=j' + b64url(new TextEncoder().encode(json)));
}
function gbShare() {
  var note = $('gbNote'); note.textContent = '';
  if (gbPlaying) { /* keep playing */ }
  beatLink().then(function (url) {
    $('gbShareBox').hidden = false; $('gbShareUrl').value = url;
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { navigator.share({ title: 'My beat', text: 'Listen to my beat, made with Bendir & Raï', url: url }).catch(function () {}); return; }
    copyText('gbShareUrl', 'gbCopyNote');
  }).catch(function () { note.textContent = 'The link could not be made in this browser.'; });
}
function copyText(inputId, noteId) {
  var inp = $(inputId), st = $(noteId);
  var fallback = function () { inp.focus(); inp.select(); st.textContent = 'The link is selected: copy it with Ctrl+C (⌘+C on a Mac), or your phone\'s Copy option.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(function () { st.textContent = 'Link copied. Paste it anywhere to share your beat.'; }, fallback);
  else fallback();
}
function openBeat(code) {
  readLink(code).then(unpackBeat).then(function (r) {
    if (!state.gbBackup) state.gbBackup = { gb: state.gb, levels: GB_VOICES.reduce(function (a, id) { a[id] = state.levels[id]; return a; }, {}) };
    state.gb = r.gb; Object.keys(r.levels).forEach(function (id) { state.levels[id] = r.levels[id]; }); save();
    GB_VOICES.forEach(function (id) { loadUserSample(id); }); gbMarkPads();
    $('gbShared').hidden = false; $('gbKeepShared').hidden = false; $('gbBackMine').hidden = false;
    $('gbSharedNote').textContent = 'This is a beat someone shared with you. Press Play to hear it. Your own beat is kept safe.';
  }).catch(function () {
    $('gbShared').hidden = false; $('gbKeepShared').hidden = true; $('gbBackMine').hidden = true;
    $('gbSharedNote').textContent = 'This beat link is incomplete or damaged, so it could not be opened. Ask for the link again, and make sure all of it was copied.';
  }).then(function () {
    history.replaceState(null, '', location.pathname + location.search + '#drum-machine');
    state.page = 'drum-machine'; applyPage(); window.scrollTo(0, 0);
  });
}
function gbDownload() {
  var b = $('gbWav'), note = $('gbNote');
  b.disabled = true; b.textContent = 'Preparing the file…'; note.textContent = '';
  ensureAudio();
  var g = state.gb, sd = 60 / g.bpm / 4;
  var seq = gbSequence(8);
  renderOffline(8 * 16 * sd + 2.5, 0.3, function () {
    gbPrevBass = null;
    for (var i = 0; i < 128; i++) { var bar = Math.floor(i / 16); gbStepAt(g.pats[seq[bar]], i % 16, 0.3 + i * sd + (i % 2 ? g.swing / 100 * sd * 0.66 : 0), sd, GBN.input, g.pats[seq[(bar + 1) % 8]], false); }
    gbPrevBass = null;
  }).then(function (r) {
    var blob = wavBlob(r.buf, r.skip), url = URL.createObjectURL(blob), a = el('a');
    a.href = url; a.download = 'drum-machine-' + ((g.chain ? 'chain' : EP().name || 'loop').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'loop') + '-' + g.bpm + 'bpm.wav';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    note.textContent = 'Saved ' + a.download + '. If nothing downloaded, your browser may have blocked it: try the live site.';
  }).catch(function () { note.textContent = 'The file could not be made in this browser. Try the latest Chrome, Firefox or Safari.'; })
    .then(function () { b.disabled = false; b.textContent = '⤓ Download 8 bars'; });
}

gbMigrate(state.gb); gbNormalize(state.gb);
if (state.gbBackup) { gbMigrate(state.gbBackup); gbNormalize(state.gbBackup); if (!gbValid(state.gbBackup)) delete state.gbBackup; }
if (!gbValid(state.gb)) { state.gb = gbDefault(); gbLoad('Techno'); state.gb.pats[1] = gbVariation(state.gb.pats[0]); }
(function gbWire() {
  Object.keys(GB_PRESETS).forEach(function (name) {
    var b = el('button', 'chip', name); b.type = 'button'; b.dataset.name = name;
    b.addEventListener('click', function () { gbLoad(name); gbRender(); save(); });
    $('gbPresets').appendChild(b);
  });
  GB_VOICES.forEach(function (id) {
    var b = el('button', 'bpad'); b.type = 'button'; b.appendChild(el('span', '', GB_NAMES[id]));
    var key = DRUM_BY[id].key; if (key) b.appendChild(el('small', '', key));
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); tap(id); });
    b.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); tap(id); } });
    $('gbPads').appendChild(b); gbPadEls[id] = b;
    var o = el('option', '', GB_NAMES[id]); o.value = id; $('gbVoice').appendChild(o);
  });
  NOTE_NAMES.forEach(function (n, i) { var o = el('option', '', n); o.value = i; $('gbRoot').appendChild(o); });
  $('gbPlay').addEventListener('click', gbToggle);
  $('gbRec').addEventListener('click', function () { gbSetRec(!gbRec); if (gbRec && !gbPlaying) gbPlay(); });
  $('gbBpm').addEventListener('input', function () { state.gb.bpm = +this.value; $('gbBpmOut').textContent = this.value; applyGb(); save(); });
  $('gbSwing').addEventListener('input', function () { state.gb.swing = +this.value; $('gbSwingOut').textContent = this.value; save(); });
  $('gbRoot').addEventListener('change', function () { state.gb.root = +this.value; gbRender(); save(); });
  $('gbWave').addEventListener('change', function () { state.gb.synth.wave = this.value; save(); });
  Object.keys(GB_SLIDERS).forEach(function (k) { $(k).addEventListener('input', function () { state.gb.synth[GB_SLIDERS[k]] = +this.value; save(); }); });
  $('gbVoice').addEventListener('change', gbVoiceUI);
  $('gbTune').addEventListener('input', function () { var id = $('gbVoice').value; state.gb.kit[id].tune = +this.value; gbVoiceUI(); save(); });
  $('gbDecay').addEventListener('input', function () { var id = $('gbVoice').value; state.gb.kit[id].decay = +this.value / 100; gbVoiceUI(); save(); });
  $('gbLevel').addEventListener('input', function () { state.levels[$('gbVoice').value] = +this.value; save(); });
  $('gbLoadBtn').addEventListener('click', function () { $('gbFile').click(); });
  $('gbFile').addEventListener('change', function () { loadSoundFile($('gbVoice').value, this.files[0]); this.value = ''; });
  $('gbBuiltIn').addEventListener('click', function () {
    var id = $('gbVoice').value, k = state.gb.kit[id]; if (!k.sample) return;
    audioDel(k.sample.key); delete k.sample; delete userBufs[id]; save(); gbVoiceUI(); gbMarkPads(); $('gbSampleNote').textContent = GB_NAMES[id] + ' plays its built-in sound again.';
  });
  GB_VOICES.forEach(function (id) { // drop an audio file onto a pad to use it
    var p = gbPadEls[id];
    p.addEventListener('dragover', function (e) { e.preventDefault(); p.classList.add('drop'); });
    p.addEventListener('dragleave', function () { p.classList.remove('drop'); });
    p.addEventListener('drop', function (e) { e.preventDefault(); p.classList.remove('drop'); var f = e.dataTransfer.files[0]; if (f) { $('gbVoice').value = id; loadSoundFile(id, f); } });
  });
  GB_VOICES.forEach(function (id) { loadUserSample(id); });
  gbMarkPads();
  ['gbTune', 'gbDecay'].forEach(function (k) { $(k).addEventListener('change', function () { if (!gbPlaying) tap($('gbVoice').value); }); });
  $('gbFilt').addEventListener('input', function () { var v = +this.value; state.gb.fx.filter = v; $('gbFiltOut').textContent = filtLabel(v); if (!(gbFiltRec && gbPlaying)) applyGb(); else filterAt(v, ctx.currentTime, 0.02); save(); });
  $('gbFiltReset').addEventListener('click', function () { state.gb.fx.filter = 0; $('gbFilt').value = 0; $('gbFiltOut').textContent = 'off'; applyGb(); save(); });
  $('gbFilt').addEventListener('pointerdown', function () { filtDown = true; });
  ['pointerup', 'pointercancel', 'change'].forEach(function (ev) { $('gbFilt').addEventListener(ev, function () { filtDown = false; }); });
  $('gbFilt').addEventListener('input', function () { filtTouched = performance.now(); });
  $('gbFiltRec').addEventListener('click', function () {
    gbFiltRec = !gbFiltRec; this.classList.toggle('sel', gbFiltRec); this.setAttribute('aria-pressed', gbFiltRec);
    this.textContent = gbFiltRec ? '● Recording filter moves' : '● Record filter moves';
    if (gbFiltRec && !gbPlaying) gbPlay();
  });
  $('gbFiltClear').addEventListener('click', function () { EP().filt = new Array(16).fill(null); gbMarkFilt(); applyGb(); save(); });
  $('gbPump').addEventListener('input', function () { state.gb.fx.pump = +this.value; $('gbPumpOut').textContent = this.value; applyGb(); save(); });
  $('gbKeysSound').addEventListener('change', function () { state.gb.keys.sound = this.value; save(); if (!gbPlaying) { ensureAudio(); keysChord(ctx.currentTime, 0, GBN.duck); } });
  [['gbKeysCut', 'cut'], ['gbKeysLen', 'len'], ['gbKeysVol', 'vol']].forEach(function (a) { $(a[0]).addEventListener('input', function () { state.gb.keys[a[1]] = +this.value; save(); }); });
  $('gbSev').addEventListener('click', function () { state.gb.keys.sev = !state.gb.keys.sev; gbBuildGrids(); gbMarkCells(); save(); });
  $('gbMuteChords').addEventListener('click', function () { state.gb.keys.mute = !state.gb.keys.mute; gbMarkCells(); save(); });
  $('gbClearChords').addEventListener('click', function () { EP().chords = new Array(16).fill(-1); EP().name = ''; gbMarkCells(); save(); });
  $('gbShare').addEventListener('click', gbShare);
  $('gbCopy2').addEventListener('click', function () { copyText('gbShareUrl', 'gbCopyNote'); });
  $('gbShareUrl').addEventListener('focus', function () { this.select(); });
  $('gbKeepShared').addEventListener('click', function () { delete state.gbBackup; $('gbShared').hidden = true; save(); });
  $('gbBackMine').addEventListener('click', function () {
    var b = state.gbBackup; if (!b) return;
    if (gbPlaying) gbStop();
    state.gb = b.gb; Object.keys(b.levels || {}).forEach(function (id) { state.levels[id] = b.levels[id]; }); delete state.gbBackup;
    $('gbShared').hidden = true; save(); gbRender();
    GB_VOICES.forEach(function (id) { loadUserSample(id); }); gbMarkPads();
  });
  $('gbEcho').addEventListener('input', function () { state.gb.fx.echo = +this.value; applyGb(); save(); });
  $('gbVerb').addEventListener('input', function () { state.gb.fx.verb = +this.value; applyGb(); save(); });
  $('gbClearDrums').addEventListener('click', function () { var pt = EP(); GB_VOICES.forEach(function (id) { pt.drums[id] = new Array(16).fill(false); }); pt.accent = new Array(16).fill(false); pt.name = ''; gbMarkCells(); save(); });
  $('gbClearLine').addEventListener('click', function () { EP().bass = gbBlankBass(); EP().name = ''; gbMarkCells(); save(); });
  GB_LETTERS.forEach(function (L, i) {
    var b = el('button', 'chip pat', L); b.type = 'button';
    b.addEventListener('click', function () { gbPick(i); });
    $('gbPats').appendChild(b); gbPatEls.push(b);
    var o = el('option', '', 'Pattern ' + L); o.value = i; $('gbCopy').appendChild(o);
  });
  $('gbChain').addEventListener('click', function () { state.gb.chain = !state.gb.chain; gbMarkPats(); save(); });
  $('gbCopy').addEventListener('change', function () {
    var to = this.value; this.value = '';
    if (to === '' || +to === state.gb.edit) return;
    state.gb.pats[+to] = JSON.parse(JSON.stringify(EP())); gbMarkPats(); save();
    $('gbPatHint').textContent = 'Copied pattern ' + GB_LETTERS[state.gb.edit] + ' to ' + GB_LETTERS[+to] + '. Pick ' + GB_LETTERS[+to] + ' to change it.';
  });
  $('gbNewLine').addEventListener('click', gbNewLine);
  $('gbMuteBass').addEventListener('click', function () { state.gb.bassMute = !state.gb.bassMute; gbMarkCells(); save(); });
  $('gbToCompose').addEventListener('click', gbToCompose);
  $('gbWav').addEventListener('click', gbDownload);
})();
