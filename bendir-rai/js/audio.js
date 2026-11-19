// Bendir & Raï — The audio engine: mixer, sound packs, drum voices, the oud model, and melodic voices.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

// ---------- audio ----------
var ctx, master, drumBus, synthBus, delayNode, analyser, noise, bendSrc, trackOut = {}, trackSend = {};
var cutoffHz = function (s) { return 100 * Math.pow(2, s.cutoff / 100 * 7.2); };
var attackS = function (s) { return 0.003 + Math.pow(s.attack / 100, 2) * 1.5; };
var releaseS = function (s) { return 0.04 + Math.pow(s.release / 100, 2) * 2.5; };
var stepDurFor = function (p) { return 60 / state.bpm / (p.steps === 12 ? 3 : 4); };
var glideS = function (s) { return Math.pow(s.glide / 100, 2) * 0.6; };

// samples
// An instrument pack holds one recording per note, keyed by its name ("C4", "Eb3", "F#2" or "Fs2").
// Any set of notes works: each played note uses the nearest recording, shifted to the right pitch.
var NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }, noteLists = {};
function noteMidi(name) {
  var m = /^([A-G])(b|#|s)?(-?\d)$/.exec(name); if (!m) return null;
  return 12 * (+m[3] + 1) + NOTE_PC[m[1]] + (m[2] === 'b' ? -1 : m[2] ? 1 : 0);
}
var packs = {}, decoding = {}, bufs = {}, ready = {}, failed = {};
function fetchPack(name) {
  if (!packs[name]) packs[name] = fetch('s/' + name + '.json').then(function (r) { if (!r.ok) throw new Error('missing'); return r.json(); });
  return packs[name];
}
function loadPack(name) { // fetch now; decode once there is an audio context
  var p = fetchPack(name);
  if (!ctx) return p.catch(function () {});
  if (!decoding[name]) decoding[name] = p.then(function (obj) {
    noteLists[name] = Object.keys(obj).map(function (k) { return { name: k, midi: noteMidi(k) }; }).filter(function (n) { return n.midi != null; });
    return Promise.all(Object.keys(obj).map(function (k) {
      var bin = atob(obj[k]), u = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return ctx.decodeAudioData(u.buffer).then(function (b) { bufs[name + '/' + k] = b; });
    }));
  }).then(function () { ready[name] = true; document.documentElement.dataset.ready = Object.keys(ready).sort().join(' '); })
    .catch(function () { failed[name] = true; }); // then the built-in synthesized sounds are used
  return decoding[name];
}
function loadSounds() {
  var need = ['drums'];
  TRACKS.concat([{ id: 'solo' }]).forEach(function (t) { var i = state.tracks[t.id].inst; if (i && !MODELLED[i] && need.indexOf(i) < 0) need.push(i); });
  if (state.page === 'compose' && state.compose) state.compose.tracks.forEach(function (t) { var i = t.kind === 'mel' && SOUNDS[t.inst].inst; if (i && !MODELLED[i] && need.indexOf(i) < 0) need.push(i); });
  return Promise.all(need.map(loadPack));
}
function sampleFor(inst, midi) {
  var best = null, dist = 99;
  var list = noteLists[inst] || [];
  for (var i = 0; i < list.length; i++) {
    var d = Math.abs(list[i].midi - midi);
    if (d < dist && bufs[inst + '/' + list[i].name]) { dist = d; best = list[i]; }
  }
  return best && { buf: bufs[inst + '/' + best.name], midi: best.midi };
}

function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  var AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });
  buildGraph();
  applyMix(); loadSounds();
  requestAnimationFrame(frame);
}
// The mixer and effects. Built once for the live context, and again for each song rendered to a file.
function buildGraph() {
  master = ctx.createGain();
  var comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.15;
  analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
  master.connect(comp); comp.connect(analyser); analyser.connect(ctx.destination);
  drumBus = ctx.createGain(); drumBus.gain.value = 0.9; drumBus.connect(master);
  synthBus = ctx.createGain(); synthBus.gain.value = 0.8; synthBus.connect(master);
  delayNode = ctx.createDelay(2);
  var fb = ctx.createGain(); fb.gain.value = 0.35;
  var damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 3200;
  delayNode.connect(damp); damp.connect(fb); fb.connect(delayNode); damp.connect(master);
  TRACKS.concat([{ id: 'solo' }]).forEach(function (t) {
    trackOut[t.id] = ctx.createGain(); trackOut[t.id].connect(synthBus);
    trackSend[t.id] = ctx.createGain(); trackOut[t.id].connect(trackSend[t.id]); trackSend[t.id].connect(delayNode);
  });
  if (ctx.createConstantSource) { bendSrc = ctx.createConstantSource(); bendSrc.offset.value = 0; bendSrc.start(); }
  var buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), data = buf.getChannelData(0);
  for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noise = buf;
  gbBuild();
}
// wake the audio engine on the very first touch so the first tap already sounds right
['pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, ensureAudio, { capture: true, once: true }); });

function applyMix() {
  if (!ctx) return;
  var t = ctx.currentTime;
  master.gain.setTargetAtTime(Math.pow(state.vol / 100, 2) * 0.9, t, 0.02);
  TRACKS.concat([{ id: 'solo' }]).forEach(function (tr) {
    var s = state.tracks[tr.id];
    trackOut[tr.id].gain.setTargetAtTime(s.mute ? 0 : Math.pow(s.level / 100, 2), t, 0.02);
    trackSend[tr.id].gain.setTargetAtTime(s.delay / 100 * 0.7, t, 0.02);
  });
  delayNode.delayTime.setTargetAtTime(Math.min(1.9, stepDurFor(P()) * 3), t, 0.05);
}
function setBend(cents) { if (bendSrc) bendSrc.offset.setTargetAtTime(cents, ctx.currentTime, 0.025); }

// drum machine voices (synthesized, like an 80s drum machine) and fallbacks for the recordings
function osc(type, freq, t, stopAt) { var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.start(t); o.stop(stopAt); return o; }
function decayGain(t, peak, decay) { var g = ctx.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0008, t + decay); g.connect(drumDest || drumBus); return g; }
function noiseSrc(t, dur, type, freq, q) {
  var s = ctx.createBufferSource(); s.buffer = noise; s.loop = true;
  var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  s.connect(f); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05); return f;
}
// Drum-machine voices, synthesized like the classic analog machines. Tune (semitones) and decay
// come from the Drum machine page's "Shape a drum" settings.
// A sound you loaded onto a drum-machine pad replaces its built-in voice (tune and decay still apply).
var userBufs = {};
function playUser(id, t, v) {
  var b = userBufs[id], k = state.gb.kit[id], src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b; src.playbackRate.value = Math.pow(2, (k.tune || 0) / 12);
  var dur = Math.max(0.03, b.duration * Math.min(1, k.decay || 1) / src.playbackRate.value);
  g.gain.setValueAtTime(v * 0.9, t); g.gain.setTargetAtTime(0, t + Math.max(0.01, dur - 0.04), 0.012);
  src.connect(g); g.connect(drumDest || drumBus); src.start(t); src.stop(t + dur + 0.1);
}
function kp(id) { var k = state.gb && state.gb.kit && state.gb.kit[id]; return { tf: Math.pow(2, ((k && k.tune) || 0) / 12), dm: (k && k.decay) || 1 }; }
var HAT_HZ = [205.3, 304.4, 369.6, 522.7, 540, 800], ohatG = null;
function metal(t, v, tf, dur, band) { // six detuned square waves through filters: the metallic hiss of analog hats and cymbals
  var bp = ctx.createBiquadFilter(), hp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = Math.min(16000, band * tf); bp.Q.value = 0.8; hp.type = 'highpass'; hp.frequency.value = Math.min(14000, 7000 * tf);
  HAT_HZ.forEach(function (hz) { osc('square', hz * tf, t, t + dur + 0.05).connect(bp); });
  var g = decayGain(t, v, dur); bp.connect(hp); hp.connect(g); return g;
}
var MACHINE = {
  kick: function (t, v) {
    var k = kp('kick'), o = osc('sine', 155 * k.tf, t, t + 0.9 * k.dm + 0.1); o.frequency.exponentialRampToValueAtTime(46 * k.tf, t + 0.09);
    o.connect(decayGain(t, v * 1.15, 0.45 * k.dm));
    noiseSrc(t, 0.02, 'lowpass', 2500).connect(decayGain(t, v * 0.25, 0.02));
  },
  snare: function (t, v) {
    var k = kp('snare');
    noiseSrc(t, 0.3 * k.dm, 'highpass', 1400).connect(decayGain(t, v * 0.7, 0.18 * k.dm));
    var o = osc('triangle', 205 * k.tf, t, t + 0.2); o.frequency.exponentialRampToValueAtTime(150 * k.tf, t + 0.1);
    o.connect(decayGain(t, v * 0.55, 0.12 * k.dm));
  },
  mclap: function (t, v) {
    var k = kp('mclap');
    [0, 0.011, 0.022, 0.032].forEach(function (d) { noiseSrc(t + d, 0.02, 'bandpass', 1150 * k.tf, 1.3).connect(decayGain(t + d, v * 0.75, 0.012)); });
    noiseSrc(t + 0.032, 0.3 * k.dm, 'bandpass', 1150 * k.tf, 1.1).connect(decayGain(t + 0.032, v * 0.8, 0.2 * k.dm));
  },
  hat: function (t, v) {
    var k = kp('hat');
    if (ohatG) { try { ohatG.gain.cancelScheduledValues(t); ohatG.gain.setTargetAtTime(0, t, 0.006); } catch (e) {} ohatG = null; } // a closed hat cuts the open one
    metal(t, v * 0.55, k.tf, 0.05 * k.dm, 10000);
  },
  ohat: function (t, v) { var k = kp('ohat'); ohatG = metal(t, v * 0.5, k.tf, 0.35 * k.dm, 9000); },
  rim: function (t, v) {
    var k = kp('rim'), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1750 * k.tf; bp.Q.value = 3;
    osc('triangle', 1750 * k.tf, t, t + 0.05).connect(bp); osc('square', 520 * k.tf, t, t + 0.05).connect(bp);
    bp.connect(decayGain(t, v * 0.8, 0.03 * k.dm));
  },
  ltom: function (t, v) { var k = kp('ltom'), o = osc('sine', 115 * k.tf, t, t + 0.6 * k.dm); o.frequency.exponentialRampToValueAtTime(78 * k.tf, t + 0.25); o.connect(decayGain(t, v * 0.95, 0.32 * k.dm)); },
  htom: function (t, v) { var k = kp('htom'), o = osc('sine', 185 * k.tf, t, t + 0.5 * k.dm); o.frequency.exponentialRampToValueAtTime(130 * k.tf, t + 0.2); o.connect(decayGain(t, v * 0.9, 0.26 * k.dm)); },
  ride: function (t, v) { var k = kp('ride'); metal(t, v * 0.3, k.tf * 1.9, 0.9 * k.dm, 7000); osc('sine', 3300 * k.tf, t, t + 0.6).connect(decayGain(t, v * 0.05, 0.5 * k.dm)); },
  cow: function (t, v) {
    var k = kp('cow'), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800 * k.tf; bp.Q.value = 2.5;
    osc('square', 540 * k.tf, t, t + 0.4).connect(bp); osc('square', 800 * k.tf, t, t + 0.4).connect(bp);
    bp.connect(decayGain(t, v * 0.5, 0.25 * k.dm));
  }
};
function fallbackDrum(id, t, v) {
  if (id === 'dum' || id === 'bendir' || id === 'tbal') {
    var o = osc('sine', 150, t, t + 0.5); o.frequency.exponentialRampToValueAtTime(id === 'dum' ? 72 : 55, t + 0.08); o.connect(decayGain(t, v, 0.35));
  } else if (id === 'tak' || id === 'ka') {
    noiseSrc(t, 0.07, 'bandpass', id === 'tak' ? 2600 : 3400, 3).connect(decayGain(t, v, 0.05));
  } else noiseSrc(t, 0.12, 'highpass', id === 'clap' ? 1200 : 6000).connect(decayGain(t, v * 0.5, 0.1));
}

var flip = {}, rollLen = 0.12, drumDest = null; // drumDest: where drum hits go (a composer track can take them)
function sampleKey(id, soft) {
  if (id === 'dum' && soft) return 'dums';
  if (id === 'tak' && soft) id = 'ka';
  var key = id; if (ALT[id]) { flip[id] = !flip[id]; if (flip[id]) key = id + '2'; }
  return key;
}
function hit(id, t, vel) {
  var v = Math.pow(state.levels[id] / 100, 2) * 1.2 * vel * (0.9 + Math.random() * 0.1);
  if (v <= 0.001) return;
  if (userBufs[id]) { playUser(id, t, v); return; }
  if (MACHINE[id]) { MACHINE[id](t, v); return; }
  if (id === 'roll') { // four quick soft strokes, alternating hands
    for (var i = 0; i < 4; i++) playStroke(i % 2 ? 'ka' : 'tak', t + i * rollLen / 4, v * (0.55 + 0.12 * i), true);
    return;
  }
  playStroke(id, t, v, vel < 0.55);
}
function playStroke(id, t, v, soft, retried) {
  var b = bufs['drums/' + sampleKey(id, soft)];
  if (!b) {
    if (failed.drums || retried) fallbackDrum(id, t, v);
    else loadPack('drums').then(function () { playStroke(id, ctx.currentTime, v, soft, true); }); // first tap: wait for the recording
    return;
  }
  var src = ctx.createBufferSource(), g = ctx.createGain();
  src.buffer = b;
  src.playbackRate.value = (id === 'tbalt' ? 1.25 : 1) + (Math.random() - 0.5) * 0.03; // no two hits exactly alike
  g.gain.value = v * 0.9 * (soft && (id === 'dum' || id === 'tak') ? 1.5 : 1);
  src.connect(g); g.connect(drumDest || drumBus); src.start(t);
  if (id === 'bendir' || id === 'bendirt') noiseSrc(t, 0.3, 'bandpass', 420, 1.3).connect(decayGain(t, v * 0.22, id === 'bendir' ? 0.26 : 0.14)); // gut snares buzzing under the skin
}

// Oud model, tuned against measurements of real oud recordings (decay, brightness, body resonance).
function makeOud(midi, sr, rand) {
  rand = rand || Math.random;
  var f = 440 * Math.pow(2, (midi - 69) / 12), len = Math.floor(sr * 2.2), out = new Float32Array(len);
  var S = 0.15, A = 0.2, PICK = 0.2, DBS = 30;
  [[1, 0, 1], [Math.pow(2, 7 / 1200), Math.floor(sr * 0.006), 0.9]].forEach(function (c) { // a course: two strings, 7 cents and 6 ms apart
    var fr = f * c[0], per = sr / fr, D = per - S, g = Math.pow(10, -DBS / 20 / fr), y = new Float32Array(len);
    var exLen = Math.max(2, Math.round(per)), pick = Math.max(1, Math.round(per * PICK)), e = new Float32Array(exLen), lp = 0, n;
    for (n = 0; n < exLen; n++) { lp = (1 - A) * (rand() * 2 - 1) + A * lp; e[n] = lp; }
    var rd = function (x) { if (x < 0) return 0; var i0 = Math.floor(x), a = x - i0; return y[i0] * (1 - a) + (i0 + 1 < len ? y[i0 + 1] : 0) * a; };
    for (n = 0; n < len; n++) {
      var ex = n < exLen ? e[n] - (n >= pick ? e[n - pick] : 0) : 0;
      y[n] = ex + g * ((1 - S) * rd(n - D) + S * rd(n - D - 1));
      if (n + c[1] < len) out[n + c[1]] += y[n] * c[2];
    }
  });
  var biq = function (b0, b1, b2, a0, a1, a2) {
    var x1 = 0, x2 = 0, y1 = 0, y2 = 0; b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
    for (var i = 0; i < len; i++) { var x = out[i], v = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = v; out[i] = v; }
  };
  var w = 2 * Math.PI * 110 / sr, Ab = Math.pow(10, 18 / 40), al = Math.sin(w) / (2 * 0.8); // the deep bowl: a strong low resonance
  biq(1 + al * Ab, -2 * Math.cos(w), 1 - al * Ab, 1 + al / Ab, -2 * Math.cos(w), 1 - al / Ab);
  var fc = Math.min(4000, Math.max(450, 5 * f)); w = 2 * Math.PI * fc / sr; al = Math.sin(w) / (2 * 0.6); var cw = Math.cos(w); // dark, wooden tone
  biq((1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al);
  var pk = 0, i; for (i = 0; i < Math.floor(sr * 0.05); i++) pk = Math.max(pk, Math.abs(out[i]));
  var nb = Math.floor(sr * 0.005), lp2 = 0; // the feather plectrum's soft scrape
  for (i = 0; i < nb; i++) { var z = rand() * 2 - 1; lp2 = 0.25 * z + 0.75 * lp2; out[i] += (z - lp2) * Math.exp(-i / (nb / 3)) * 0.3 * pk; }
  pk = 0; for (i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
  for (i = 0; i < len; i++) out[i] *= 0.9 / (pk || 1);
  return out;
}
var oudCache = {};
function oudBuffer(midi) {
  if (oudCache[midi]) return oudCache[midi];
  var data = makeOud(midi, ctx.sampleRate), buf = ctx.createBuffer(1, data.length, ctx.sampleRate);
  buf.getChannelData(0).set(data);
  return (oudCache[midi] = buf);
}

var midiHz = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
function makeVoice(trId, midi, t, fromHz, live) {
  var s = state.tracks[trId] || compCache[trId], cut = cutoffHz(s), f = ctx.createBiquadFilter(), g = ctx.createGain();
  var hz = midiHz(midi), gl = glideS(s), from = gl > 0.005 && fromHz ? fromHz : hz, land = t + (from === hz ? 0 : gl);
  var smp = s.inst && !MODELLED[s.inst] && sampleFor(s.inst, midi), isBuf = !!smp || !!MODELLED[s.inst], parts, pitch = [], peak;
  f.type = 'lowpass';
  if (s.inst === 'acid') { // the acid bass voice, set up on the Drum machine page
    var av = acidVoice(t, midi, false, f, true); pitch.push(av.osc.detune); parts = [av.osc]; peak = 0.9;
    f.Q.value = 0.7; f.frequency.value = 18000; // the acid voice has its own filters
  } else if (MODELLED[s.inst]) {
    var os = ctx.createBufferSource();
    os.buffer = oudBuffer(midi); // the body and the plectrum are part of the model
    if (os.detune) pitch.push(os.detune);
    f.Q.value = 0.7; f.frequency.value = Math.min(18000, cut);
    os.connect(f); os.start(t); parts = [os]; peak = 1.5;
  } else if (smp) {
    var src = ctx.createBufferSource();
    src.buffer = smp.buf; src.playbackRate.value = Math.pow(2, (midi - smp.midi) / 12);
    if (src.detune) pitch.push(src.detune);
    f.Q.value = 0.7; f.frequency.value = Math.min(18000, cut);
    src.connect(f); src.start(t); parts = [src]; peak = 2.2;
  } else {
    f.Q.value = 4;
    f.frequency.setValueAtTime(Math.min(16000, cut * 1.5), t);
    f.frequency.exponentialRampToValueAtTime(Math.min(16000, cut), t + 0.22);
    parts = [-9, 9].map(function (det) {
      var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = det;
      pitch.push(o.detune); o.connect(f); o.start(t); return o;
    });
    peak = 0.3;
  }
  pitch.forEach(function (p, i) {
    var base = isBuf ? 0 : (i ? 9 : -9);
    if (from !== hz) {
      p.setValueAtTime(base + Math.max(-1200, Math.min(1200, 1200 * Math.log2(from / hz))), t);
      p.linearRampToValueAtTime(base, land);
    }
    if (s.orn) { p.setValueAtTime(base, land + 0.045); p.setValueAtTime(base + 100, land + 0.046); p.setValueAtTime(base, land + 0.092); }
    if (live && bendSrc) bendSrc.connect(p);
  });
  if (s.vibrato > 0 && pitch.length) {
    var lfo = ctx.createOscillator(), depth = ctx.createGain(); lfo.frequency.value = 5.8;
    depth.gain.setValueAtTime(0, t + 0.15); depth.gain.linearRampToValueAtTime(s.vibrato * 0.6, t + 0.45);
    lfo.connect(depth); pitch.forEach(function (p) { depth.connect(p); }); lfo.start(t); parts.push(lfo);
  }
  if (s.breath && noise) { // the air of an end-blown flute
    var br = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), bg = ctx.createGain();
    br.buffer = noise; br.loop = true; bf.type = 'bandpass'; bf.frequency.value = Math.min(9000, hz * 4); bf.Q.value = 0.9;
    bg.gain.value = s.breath / 100 * 0.35;
    br.connect(bf); bf.connect(bg); bg.connect(g); br.start(t, Math.random() * 0.5); parts.push(br);
  }
  f.connect(g); g.connect(trackOut[trId] || ensureOut(trId)); g.gain.setValueAtTime(0, t);
  return { g: g, oscs: parts, peak: peak, hz: hz, s: s, pitch: pitch, isBuf: isBuf };
}
function endVoice(v, t) {
  var r = releaseS(v.s);
  v.g.gain.setTargetAtTime(0, t, r / 3.5);
  v.oscs.forEach(function (o) { o.stop(t + r * 1.6 + 0.1); });
}
var seqHz = {};
function playNote(trId, midi, t, dur, legato, gain) {
  var v = makeVoice(trId, midi, t, legato ? seqHz[trId] : 0, false), a = Math.min(attackS(v.s), dur);
  seqHz[trId] = v.hz;
  v.g.gain.linearRampToValueAtTime(v.peak * (gain || 1), t + a);
  endVoice(v, t + dur);
}
function degMidi(trId, k) { // scale degree k (0 = key note) in this track's octave
  var sc = SCALES[state.scale], s = state.tracks[trId];
  return 12 * (s.octave + 1) + state.root + sc[k % 7] + 12 * Math.floor(k / 7);
}
function chordMidis(row) { return [row, row + 2, row + 4].map(function (k) { return degMidi('chords', k); }); }
function playChord(row, t, dur) { chordMidis(row).forEach(function (m) { playNote('chords', m, t, dur, false, 0.6); }); }
function chordName(row) {
  var sc = SCALES[state.scale], at = function (k) { return sc[k % 7] + 12 * Math.floor(k / 7); };
  var r = at(row), third = at(row + 2) - r, fifth = at(row + 4) - r;
  var q = third === 3 && fifth === 7 ? 'm' : third === 4 && fifth === 7 ? '' : third === 3 && fifth === 6 ? 'dim' : third === 4 && fifth === 8 ? '+' : ' neutral';
  return NOTE_NAMES[(state.root + Math.ceil(r)) % 12] + (r % 1 ? ' ½♭' : '') + q;
}

var held = {}, want = {}, liveHz = 0;
function noteOn(midi) {
  ensureAudio();
  want[midi] = true;
  if (held[midi]) return;
  var inst = T().inst;
  if (inst && !MODELLED[inst] && !ready[inst] && !failed[inst]) { loadPack(inst).then(function () { if (want[midi] && !held[midi]) startNote(midi); }); return; }
  startNote(midi);
}
function startNote(midi) {
  var t = ctx.currentTime, v = makeVoice(curTrack(), midi, t, Object.keys(held).length ? liveHz : 0, true);
  liveHz = v.hz;
  v.g.gain.linearRampToValueAtTime(v.peak, t + attackS(v.s));
  held[midi] = v;
  cRecNoteOn('k' + midi, midi);
}
function noteOff(midi) {
  delete want[midi];
  var v = held[midi]; if (!v) return; delete held[midi];
  releaseVoice(v);
  cRecNoteOff('k' + midi);
}
function releaseVoice(v) {
  var t = ctx.currentTime;
  if (v.g.gain.cancelAndHoldAtTime) v.g.gain.cancelAndHoldAtTime(t);
  else { var cur = v.g.gain.value; v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(cur, t); }
  endVoice(v, t);
}
// voices played by dragging (oud neck, flute holes): one per finger, and the pitch follows the finger
var sv = {};
function svStart(key, midi) {
  ensureAudio(); svStop(key);
  var inst = T().inst;
  function go() {
    var t = ctx.currentTime, v = makeVoice(curTrack(), midi, t, 0, true);
    v.g.gain.linearRampToValueAtTime(v.peak, t + attackS(v.s));
    v.midi0 = v.cur = midi; sv[key] = v;
    cRecNoteOn('s' + key, midi);
  }
  if (inst && !MODELLED[inst] && !ready[inst] && !failed[inst]) {
    sv[key] = { pending: midi };
    loadPack(inst).then(function () { var p = sv[key]; if (p && p.pending != null) { delete sv[key]; svStart(key, p.pending); } });
    return;
  }
  go();
}
function svSlide(key, midi, glide) {
  var v = sv[key]; if (!v) return;
  if (v.pending != null) { v.pending = midi; return; }
  if (v.cur === midi) return;
  v.cur = midi;
  var now = ctx.currentTime, c = 100 * (midi - v.midi0);
  v.pitch.forEach(function (p, i) {
    var b = v.isBuf ? 0 : (i ? 9 : -9);
    p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.linearRampToValueAtTime(b + c, now + Math.max(0.012, glide));
  });
}
function svStop(key) { var v = sv[key]; if (!v) return; delete sv[key]; if (v.pending == null) { releaseVoice(v); cRecNoteOff('s' + key); } }
