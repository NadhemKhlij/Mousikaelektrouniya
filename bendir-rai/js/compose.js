// Bendir & Raï — The Compose page: timeline, clips, mixer, editors, recording (instruments and voice), undo, download and share links.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

// ---------- audio kept in this browser (voice recordings and sounds you load) ----------
// Too big for the normal saved data, so it goes into IndexedDB. If that is not available (some private
// windows), it is kept in memory until the page is closed.
var idbP = null, memAudio = {}, audioKept = true;
function idb() {
  if (!idbP) idbP = new Promise(function (res, rej) {
    try { var r = indexedDB.open('bendir-rai', 1); r.onupgradeneeded = function () { r.result.createObjectStore('audio'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); }
  });
  return idbP;
}
function idbReq(mode, fn) {
  return idb().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction('audio', mode), r = fn(tx.objectStore('audio')); tx.oncomplete = function () { res(r && r.result); }; tx.onerror = tx.onabort = function () { rej(tx.error); }; }); });
}
function audioPut(key, val) { memAudio[key] = val; return idbReq('readwrite', function (st) { return st.put(val, key); }).then(function () { return true; }, function () { audioKept = false; return false; }); }
function audioGet(key) { if (memAudio[key]) return Promise.resolve(memAudio[key]); return idbReq('readonly', function (st) { return st.get(key); }).catch(function () { return null; }); }
function audioDel(key) { delete memAudio[key]; return idbReq('readwrite', function (st) { return st.delete(key); }).catch(function () {}); }
function audioTidy() { // remove recordings and sounds nothing uses any more
  var used = {};
  [state.gb, state.gbBackup && state.gbBackup.gb].forEach(function (g) { if (g && g.kit) GB_VOICES.forEach(function (id) { var k = g.kit[id]; if (k && k.sample) used[k.sample.key] = 1; }); });
  [state.compose, state.composeBackup && state.composeBackup.song].forEach(function (c) { if (c) c.tracks.forEach(function (t) { if (t.kind === 'voice') t.clips.forEach(function (k) { used[k.audio] = 1; }); }); });
  idbReq('readonly', function (st) { return st.getAllKeys(); }).then(function (keys) { (keys || []).forEach(function (k) { if (!used[k]) audioDel(k); }); }).catch(function () {});
}

// ---------- composer: instruments on a timeline ----------
var KITS = {
  darbuka: { name: 'Darbuka', strokes: ['dum', 'tak', 'ka', 'slap', 'roll'] },
  bendir: { name: 'Bendir', strokes: ['bendir', 'bendirt'] },
  tar: { name: 'Tar', strokes: ['tar', 'tarj'] },
  tbal: { name: 'Tbal', strokes: ['tbal', 'tbalt'] },
  shq: { name: 'Shqashiq', strokes: ['shq'] },
  clap: { name: 'Clap', strokes: ['clap'] },
  machine: { name: 'Drum machine', strokes: ['kick', 'snare', 'hat', 'ohat', 'mclap', 'rim', 'ltom', 'htom', 'ride', 'cow'] } // new strokes go at the end: shared links rely on this order
};
var C, compCache = {}, cSel = null, cKeysSel = null;
function cTrack(id) { return C.tracks.filter(function (t) { return t.id === id; })[0]; }
function cNew(prefix) { C.nid = (C.nid || 0) + 1; return prefix + C.nid; }
function validCompose(c) {
  try {
    if (!c || !Array.isArray(c.tracks) || !c.bars) return false;
    return c.tracks.every(function (t) {
      if (t.kind === 'voice') return Array.isArray(t.clips) && t.clips.every(function (k) { return k.len >= 1 && typeof k.audio === 'string'; });
      if (t.kind === 'perc' ? !KITS[t.inst] : !SOUNDS[t.inst]) return false;
      return Array.isArray(t.clips) && t.clips.every(function (k) { return k.len >= 1 && (t.kind === 'perc' ? k.steps : Array.isArray(k.notes)); });
    });
  } catch (e) { return false; }
}
function cNormalize(c) {
  if (!c) return;
  c.tracks.forEach(function (t) { if (t.kind === 'perc') t.clips.forEach(function (k) { KITS[t.inst].strokes.forEach(function (id) { if (!k.steps[id]) k.steps[id] = new Array(k.len * 16).fill(false); }); }); });
}
function percClip(kit, start, len) { var st = {}; KITS[kit].strokes.forEach(function (id) { st[id] = new Array(len * 16).fill(false); }); return { start: start, len: len, steps: st }; }
function fillRhythm(clip, kit, beat) {
  var b = BEATS[beat] || GB_PRESETS[beat];
  KITS[kit].strokes.forEach(function (id) {
    var pat = b.d[id]; clip.steps[id] = new Array(clip.len * 16).fill(false);
    if (pat) for (var i = 0; i < clip.len * 16; i++) clip.steps[id][i] = pat[i % 16] === 'x';
  });
}
function demoCompose() {
  // an original example: 8 bars in D Nahawand at 100 BPM
  var c = { bpm: 100, bars: 8, loop: true, tracks: [], nid: 0 };
  C = c;
  function add(kind, inst, vol, octave) { var t = { id: cNew('t'), kind: kind, inst: inst, vol: vol, mute: false, solo: false, octave: octave, clips: [] }; c.tracks.push(t); return t; }
  function clip(t, k) { k.id = cNew('c'); t.clips.push(k); return k; }
  var dar = add('perc', 'darbuka', 85), k = clip(dar, percClip('darbuka', 0, 8));
  fillRhythm(k, 'darbuka', 'Raï'); [124, 125, 126, 127].forEach(function (i) { k.steps.roll[i] = true; k.steps.dum[i] = k.steps.tak[i] = k.steps.ka[i] = false; });
  var mac = add('perc', 'machine', 70), m = clip(mac, percClip('machine', 2, 6)); fillRhythm(m, 'machine', 'Raï 80s machine');
  var bass = add('mel', 'Bass', 75, 2), bn = [];
  [0, 2, 4, 6].forEach(function (bar) {
    var o = bar * 16;
    [[0, 0, 3], [3, 0, 2], [6, 7, 2], [8, 0, 2], [11, 0, 2], [14, 4, 2], [16, 5, 3], [19, 5, 2], [22, 12, 2], [24, 6, 3], [27, 6, 2], [30, 13, 2]].forEach(function (n) { bn.push({ s: o + n[0], r: n[1], l: n[2] }); });
  });
  clip(bass, { start: 0, len: 8, notes: bn });
  var str = add('mel', 'Strings', 40, 3), sn = [];
  [0, 2, 4, 6].forEach(function (bar) { [0, 2, 4].forEach(function (d) { sn.push({ s: bar * 16, r: d, l: 16 }); sn.push({ s: bar * 16 + 16, r: d + 5, l: 16 }); }); });
  clip(str, { start: 0, len: 8, notes: sn });
  var oud = add('mel', 'Oud', 80, 3), on = [];
  [0, 32].forEach(function (o) {
    [[0, 7, 2], [2, 9, 2], [4, 10, 2], [6, 9, 2], [8, 7, 2], [10, 6, 2], [12, 7, 4], [16, 5, 2], [18, 6, 2], [20, 7, 2], [22, 6, 2], [24, 5, 2], [26, 4, 2], [28, 5, 4]].forEach(function (n) { on.push({ s: o + n[0], r: n[1], l: n[2] }); });
  });
  clip(oud, { start: 0, len: 4, notes: on });
  var lead = add('mel', 'Raï lead', 92, 4);
  clip(lead, { start: 4, len: 4, notes: [[0, 4, 3], [3, 5, 1], [4, 4, 2], [6, 3, 2], [8, 2, 4], [12, 1, 2], [14, 2, 2], [16, 0, 6], [24, 2, 2], [26, 3, 2], [28, 4, 4],
    [32, 7, 3], [35, 6, 1], [36, 5, 2], [38, 4, 2], [40, 3, 4], [44, 4, 2], [46, 3, 2], [48, 2, 2], [50, 1, 2], [52, 0, 8]].map(function (n) { return { s: n[0], r: n[1], l: n[2] }; }) });
  return c;
}
function compTS(tr) { // sound settings for a melodic composer track
  var c = compCache[tr.id];
  if (!c || c.sound !== tr.inst) c = compCache[tr.id] = trackFromSound(tr.inst, tr.vol);
  c.octave = tr.octave; c.level = tr.vol; c.mute = false;
  return c;
}
function ensureOut(id) {
  if (!ctx) return null;
  if (trackOut[id]) return trackOut[id];
  var tr = C && cTrack(id), o = ctx.createGain();
  if (tr && tr.kind === 'perc') o.connect(drumBus);
  else { o.connect(synthBus); var snd = ctx.createGain(); o.connect(snd); snd.connect(delayNode); trackSend[id] = snd; snd.gain.value = (tr && tr.kind === 'voice' ? tr.echo || 0 : compCache[id] ? compCache[id].delay : 10) / 100 * 0.7; }
  trackOut[id] = o; cMix(); return o;
}
function cMix() {
  if (!ctx || !C) return;
  var anySolo = C.tracks.some(function (t) { return t.solo; });
  C.tracks.forEach(function (t) {
    if (!trackOut[t.id]) return;
    var on = !t.mute && (!anySolo || t.solo);
    trackOut[t.id].gain.setTargetAtTime(on ? Math.pow(t.vol / 100, 2) : 0, ctx.currentTime, 0.02);
  });
}

// ---------- download the song as a WAV file ----------
function songEnd() { // the bar after the last clip that is heard
  var anySolo = C.tracks.some(function (t) { return t.solo; }), end = 0;
  C.tracks.forEach(function (t) { if (t.mute || (anySolo && !t.solo)) return; t.clips.forEach(function (k) { end = Math.max(end, k.start + k.len); }); });
  return Math.min(end, C.bars);
}
// Play something into an offline audio context (faster than real time) with its own copy of the mixer.
function renderOffline(seconds, lead, schedule) {
  var sr = ctx.sampleRate, off = new OfflineAudioContext(2, Math.ceil((lead + seconds) * sr), sr);
  var live = { ctx: ctx, master: master, drumBus: drumBus, synthBus: synthBus, delayNode: delayNode, analyser: analyser, noise: noise, bendSrc: bendSrc, trackOut: trackOut, trackSend: trackSend, GBN: GBN, ohatG: ohatG, acidV: acidV };
  try {
    ctx = off; trackOut = {}; trackSend = {}; ohatG = null; acidV = null;
    buildGraph(); applyMix(); applyGb();
    schedule();
  } finally { // put the live engine back before anything else can play
    ctx = live.ctx; master = live.master; drumBus = live.drumBus; synthBus = live.synthBus; delayNode = live.delayNode; analyser = live.analyser;
    noise = live.noise; bendSrc = live.bendSrc; trackOut = live.trackOut; trackSend = live.trackSend; GBN = live.GBN; ohatG = live.ohatG; acidV = live.acidV;
  }
  return off.startRendering().then(function (buf) { return { buf: buf, skip: lead - 0.05 }; });
}
function renderSong() {
  ensureAudio();
  return loadSounds().then(function () {
    var sd = 60 / C.bpm / 4, bars = songEnd(), anySolo = C.tracks.some(function (t) { return t.solo; });
    return renderOffline(bars * 16 * sd + 2.5, 0.3, function () {
      C.tracks.forEach(function (t) { if (t.kind === 'mel') compTS(t); ensureOut(t.id); });
      for (var i = 0; i < bars * 16; i++) cStepAt(i, 0.3 + i * sd, sd, anySolo, i === 0);
    });
  });
}

function wavBlob(buf, skip) {
  var sr = buf.sampleRate, from = Math.max(0, Math.floor(skip * sr)), n = buf.length - from, chans = [buf.getChannelData(0), buf.getChannelData(1)];
  var peak = 0, i, c;
  for (c = 0; c < 2; c++) for (i = from; i < buf.length; i++) peak = Math.max(peak, Math.abs(chans[c][i]));
  var gain = peak > 0.001 ? 0.891 / peak : 1; // the loudest moment lands just under full scale (-1 dB)
  var out = new DataView(new ArrayBuffer(44 + n * 4)), w = function (o, str) { for (var k = 0; k < str.length; k++) out.setUint8(o + k, str.charCodeAt(k)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true);
  out.setUint16(22, 2, true); out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * 4, true);
  for (i = 0; i < n; i++) for (c = 0; c < 2; c++) {
    var v = Math.max(-1, Math.min(1, chans[c][from + i] * gain));
    out.setInt16(44 + (i * 2 + c) * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([out], { type: 'audio/wav' });
}
function fileName(ext) { // plain letters only: some browsers drop names with accents or other scripts
  var n = (C.title || 'my song').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return (n || 'bendir-rai-song') + '.' + ext;
}
function downloadSong() {
  var b = $('cWav'), note = $('cExportNote');
  if (!songEnd()) { note.textContent = 'Add a clip first: there is nothing to save yet.'; return; }
  b.disabled = true; b.textContent = 'Preparing the file…'; note.textContent = '';
  renderSong().then(function (r) {
    var blob = wavBlob(r.buf, r.skip), url = URL.createObjectURL(blob), a = el('a');
    a.href = url; a.download = fileName('wav'); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    note.textContent = 'Saved ' + a.download + ' (' + Math.round(r.buf.duration - r.skip) + ' seconds). If nothing downloaded, your browser may have blocked it: try the live site.';
  }).catch(function () {
    note.textContent = 'The file could not be made in this browser. Try the latest Chrome, Firefox or Safari.';
  }).then(function () { b.disabled = false; b.textContent = '⤓ Download audio'; });
}

// ---------- share a song as a link ----------
// The whole song travels inside the link (after #song=), compressed, so no server is needed.
function b64url(bytes) { var s2 = ''; for (var i = 0; i < bytes.length; i++) s2 += String.fromCharCode(bytes[i]); return btoa(s2).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64url(str) { var b = atob(str.replace(/-/g, '+').replace(/_/g, '/')), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function streamBytes(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (ab) { return new Uint8Array(ab); }); }
function bitsHex(a, n) { var h = ''; for (var i = 0; i < n; i += 4) h += ((a[i] ? 8 : 0) | (a[i + 1] ? 4 : 0) | (a[i + 2] ? 2 : 0) | (a[i + 3] ? 1 : 0)).toString(16); return h.replace(/0+$/, ''); }
function hexBits(h, n) { var a = new Array(n).fill(false); for (var i = 0; i < h.length && i * 4 < n; i++) { var d = parseInt(h[i], 16) || 0; for (var j = 0; j < 4; j++) if (i * 4 + j < n) a[i * 4 + j] = !!(d & (8 >> j)); } return a; }
function packSong() {
  return JSON.stringify({ v: 1, tt: C.title || '', b: C.bpm, n: C.bars, l: C.loop ? 1 : 0, k: state.root, m: state.scale, t: C.tracks.filter(function (tr) { return tr.kind !== 'voice'; }).map(function (tr) {
    var o = { k: tr.kind === 'perc' ? 0 : 1, i: tr.inst, v: tr.vol, o: tr.octave || 0, c: tr.clips.map(function (c) {
      return [c.start, c.len, tr.kind === 'perc' ? KITS[tr.inst].strokes.map(function (id) { return bitsHex(c.steps[id] || [], c.len * 16); })
        : [].concat.apply([], c.notes.map(function (n) { return [n.s, n.r, n.l]; }))];
    }) };
    if (tr.mute) o.x = 1; if (tr.solo) o.y = 1;
    return o;
  }) });
}
function int(v, lo, hi) { v = Math.round(+v); if (!isFinite(v) || v < lo || v > hi) throw new Error('out of range'); return v; }
function unpackSong(json) { // checks everything, since a link can contain anything
  var o = JSON.parse(json), saved = C;
  if (o.v !== 1 || !Array.isArray(o.t) || o.t.length > 12 || !SCALES[o.m]) throw new Error('not a song');
  var c = { bpm: int(o.b, 50, 180), bars: [8, 16, 32].indexOf(+o.n) >= 0 ? +o.n : 8, loop: !!o.l, title: String(o.tt || '').slice(0, 60), tracks: [], nid: 0 };
  C = c;
  try {
    o.t.forEach(function (t) {
      var perc = t.k === 0;
      if (perc ? !KITS[t.i] : !SOUNDS[t.i]) throw new Error('unknown instrument');
      var tr = { id: cNew('t'), kind: perc ? 'perc' : 'mel', inst: t.i, vol: int(t.v, 0, 100), mute: !!t.x, solo: !!t.y, octave: perc ? 0 : int(t.o, 1, 6), clips: [] };
      (t.c || []).forEach(function (a) {
        var start = int(a[0], 0, c.bars - 1), len = int(a[1], 1, c.bars - start), cols = len * 16, k = { id: cNew('c'), start: start, len: len };
        if (!fits(tr, null, start, len)) return;
        if (perc) { k.steps = {}; KITS[t.i].strokes.forEach(function (id, j) { k.steps[id] = hexBits(String((a[2] || [])[j] || '').replace(/[^0-9a-f]/gi, ''), cols); }); }
        else { var f = a[2] || [], notes = []; for (var j = 0; j + 2 < f.length && notes.length < 2000; j += 3) notes.push({ s: int(f[j], 0, cols - 1), r: int(f[j + 1], 0, 14), l: int(f[j + 2], 1, cols) }); k.notes = notes; }
        tr.clips.push(k);
      });
      c.tracks.push(tr);
    });
  } finally { C = saved; }
  return { song: c, root: int(o.k, 0, 11), scale: o.m };
}
function songLink() {
  var json = packSong(), base = location.href.split('#')[0];
  var done = function (code) { return base + '#song=' + code; };
  if (window.CompressionStream) return streamBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw')).then(function (z) { return done('z' + b64url(z)); });
  return Promise.resolve(done('j' + b64url(new TextEncoder().encode(json))));
}
function readLink(code) {
  var kind = code[0], bytes = unb64url(code.slice(1));
  if (kind === 'z') {
    if (!window.DecompressionStream) return Promise.reject(new Error('This browser cannot open compressed links.'));
    return streamBytes(bytes, new DecompressionStream('deflate-raw')).then(function (u) { return new TextDecoder().decode(u); });
  }
  if (kind === 'j') return Promise.resolve(new TextDecoder().decode(bytes));
  return Promise.reject(new Error('unknown link'));
}
function shareSong() {
  var box = $('cShareBox'), inp = $('cShareUrl'), note = $('cExportNote');
  note.textContent = '';
  songLink().then(function (url) {
    box.hidden = false; inp.value = url;
    if (C.tracks.some(function (t) { return t.kind === 'voice'; })) $('cExportNote').textContent = 'Voice recordings are too big for a link, so the link has everything except them. To share your voice too, use Download audio.';
    if (navigator.share && matchMedia('(pointer: coarse)').matches) { // phones: open the share sheet (WhatsApp, Messages ...)
      navigator.share({ title: C.title || 'My song', text: 'Listen to my song, made with Bendir & Raï', url: url }).catch(function () {});
      return;
    }
    copyLink();
  }).catch(function () { note.textContent = 'The link could not be made in this browser.'; });
}
function copyLink() {
  var inp = $('cShareUrl'), st = $('cCopyNote');
  var fallback = function () { inp.focus(); inp.select(); st.textContent = 'The link is selected: copy it with Ctrl+C (⌘+C on a Mac), or your phone\'s Copy option.'; };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(inp.value).then(function () { st.textContent = 'Link copied. Paste it anywhere to share your song.'; }, fallback);
  else fallback();
}
function openShared(code) {
  readLink(code).then(unpackSong).then(function (r) {
    if (!state.composeBackup) state.composeBackup = { song: state.compose, root: state.root, scale: state.scale };
    state.compose = C = r.song; state.root = r.root; state.scale = r.scale; autoQt();
    cSel = null; cKeysSel = null; cStart = 0; save(); histReset();
    $('cShared').hidden = false; $('cSharedNote').textContent = (r.song.title ? '“' + r.song.title + '” is' : 'This is') + ' a song someone shared with you. Press Play to hear it. Your own song is kept safe.';
  }).catch(function () {
    $('cShared').hidden = false; $('cSharedNote').textContent = 'This song link is incomplete or damaged, so it could not be opened. Ask for the link again, and make sure all of it was copied.';
    $('cKeepShared').hidden = true; $('cBackMine').hidden = true;
  }).then(function () {
    history.replaceState(null, '', location.pathname + location.search + '#compose');
    state.page = 'compose'; applyPage(); window.scrollTo(0, 0);
  });
}
function cMidi(tr, r) { var sc = SCALES[state.scale]; return 12 * (tr.octave + 1) + state.root + sc[r % 7] + 12 * Math.floor(r / 7); }
function cKeysTrack() { var t = cKeysSel && C && cTrack(cKeysSel); if (t && t.kind === 'mel') { compTS(t); return t.id; } return 'solo'; }
function clipAt(tr, bar) { return tr.clips.filter(function (k) { return bar >= k.start && bar < k.start + k.len; })[0]; }
function fits(tr, clip, start, len) {
  if (start < 0 || start + len > C.bars) return false;
  return tr.clips.every(function (k) { return k === clip || start + len <= k.start || start >= k.start + k.len; });
}
function setLen(tr, clip, len) {
  clip.len = len;
  if (tr.kind === 'perc') KITS[tr.inst].strokes.forEach(function (id) { var a = clip.steps[id] || []; while (a.length < len * 16) a.push(false); clip.steps[id] = a; });
}

// playback
var cPlaying = false, cTimer = null, cStep = 0, cBase = 0, cQ = [], cStart = 0, cEndAt = 0, cLast = null;
function cSched() {
  var sd = 60 / C.bpm / 4, total = C.bars * 16, anySolo = C.tracks.some(function (t) { return t.solo; });
  while (cBase < ctx.currentTime + 0.12) {
    if (cStep >= total && mic) setTimeout(function () { if (cRec) cRecSet(false); }, Math.max(0, (cBase - ctx.currentTime) * 1000)); // a voice take ends with the song
    if (cStep >= total) { if (C.loop) cStep = 0; else { cEndAt = cBase; clearInterval(cTimer); cTimer = null; return; } }
    cStepAt(cStep, cBase, sd, anySolo, cFirst); cFirst = false;
    if (state.cClick && cStep % 4 === 0) cClickAt(cBase, cStep % 16 === 0);
    cQ.push({ step: cStep, time: cBase, sd: sd });
    cStep++; cBase += sd;
  }
}
function cStepAt(step, t, sd, anySolo, first) {
  var bar = Math.floor(step / 16), st = step % 16, vel = st % 4 === 0 ? 1 : 0.8;
  C.tracks.forEach(function (tr) {
    if (tr.mute || (anySolo && !tr.solo)) return;
    var clip = clipAt(tr, bar); if (!clip) return;
    var ls = (bar - clip.start) * 16 + st;
    if (tr.kind === 'voice') { if (ls === 0 || first) playVoice(tr, clip, t, ls, sd); return; } // a recording starts at its clip, or wherever playing starts
    if (tr.kind === 'perc') {
      drumDest = ensureOut(tr.id); rollLen = sd;
      KITS[tr.inst].strokes.forEach(function (id) { if (clip.steps[id] && clip.steps[id][ls]) hit(id, t, vel); });
      drumDest = null;
    } else {
      compTS(tr); ensureOut(tr.id);
      clip.notes.forEach(function (n) { if (n.s === ls) playNote(tr.id, cMidi(tr, n.r), t, Math.min(n.l, clip.len * 16 - n.s) * sd * 0.95, false, 0.85); });
    }
  });
}
function cPlay() {
  ensureAudio();
  if (playing) stopStudio();
  Promise.race([loadSounds(), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {
    if (cPlaying) return;
    cPlaying = true; cFirst = true; cStep = Math.min(cStart, C.bars - 1) * 16; cBase = ctx.currentTime + 0.06; cQ = []; cEndAt = 0; cLast = null;
    cMix(); cSched(); cTimer = setInterval(cSched, 25);
    $('cPlay').textContent = '■ Stop'; $('cPlay').classList.add('playing');
  });
}
function cClickAt(t, accent) { // the click track: a short beep on each beat, higher on the first beat of the bar
  var o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = accent ? 1760 : 1320; g.gain.setValueAtTime(accent ? 0.22 : 0.13, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.06);
}
function cStop() {
  if (cRec) cRecSet(false);
  voiceSrcs.forEach(function (v) { try { v.stop(); } catch (e) {} }); voiceSrcs = [];
  cPlaying = false; clearInterval(cTimer); cTimer = null; cQ = [];
  $('cPlay').textContent = '▶ Play'; $('cPlay').classList.remove('playing');
  cPlayhead(cStart * 16);
}
function cToggle() { cPlaying ? cStop() : cPlay(); }
var playheadEl = null;
function cPlayhead(step) { if (playheadEl) playheadEl.style.left = 'calc(var(--hw) + var(--bw) * ' + (step / 16) + ')'; }
function cFrame() {
  var now = ctx.currentTime;
  while (cQ.length && cQ[0].time <= now) cLast = cQ.shift();
  if (cLast) cPlayhead(cLast.step + Math.min(1, (now - cLast.time) / cLast.sd));
  if (cEndAt && now >= cEndAt) cStop();
}

// timeline
function clipSVG(tr, clip) {
  var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), cols = clip.len * 16, rows;
  svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  var rect = function (x, y, w, h) { var r = document.createElementNS(ns, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', h); r.setAttribute('fill', 'currentColor'); svg.appendChild(r); };
  if (tr.kind === 'voice') { // the waveform of the recording
    rows = 2; var b = voiceBufs[clip.audio], sd = 60 / C.bpm / 4;
    if (b) {
      var d = b.getChannelData(0), n = cols * 2, peak = 0.0001, vals = [];
      for (var q = 0; q < n; q++) {
        var t0 = (clip.off || 0) + (clip.nudge || 0) + q / n * cols * sd, i0 = Math.max(0, Math.floor(t0 * b.sampleRate)), i1 = Math.min(d.length, Math.floor((t0 + cols * sd / n) * b.sampleRate)), m = 0;
        for (var j = i0; j < i1; j += 16) m = Math.max(m, Math.abs(d[j])); vals.push(m); peak = Math.max(peak, m);
      }
      vals.forEach(function (m, q) { var h = Math.max(0.03, m / peak); rect(q / 2, 1 - h, 0.5, 2 * h); });
    }
  } else if (tr.kind === 'perc') {
    var ids = KITS[tr.inst].strokes; rows = ids.length;
    ids.forEach(function (id, ri) { (clip.steps[id] || []).forEach(function (on, i) { if (on && i < cols) rect(i + 0.15, ri + 0.15, 0.7, 0.7); }); });
  } else {
    rows = 15;
    clip.notes.forEach(function (n) { if (n.s < cols) rect(n.s, 14 - n.r + 0.1, Math.min(n.l, cols - n.s), 0.8); });
  }
  svg.setAttribute('viewBox', '0 0 ' + cols + ' ' + rows);
  return svg;
}
function trackName(tr) { return tr.kind === 'perc' ? KITS[tr.inst].name : tr.kind === 'voice' ? 'Voice' : tr.inst; }
function clipEl(tr, clip) {
  var e = el('div', 'clip ' + tr.kind + (cSel && cSel.c === clip.id ? ' sel' : ''));
  if (tr.kind === 'voice' && !voiceBufs[clip.audio]) loadVoice(clip.audio).then(function (b) { if (b) refreshClip(tr, clip); });
  e.dataset.c = clip.id; e.style.left = 'calc(var(--bw) * ' + clip.start + ')'; e.style.width = 'calc(var(--bw) * ' + clip.len + ' - 2px)';
  e.appendChild(el('span', 'cname', trackName(tr))); e.appendChild(clipSVG(tr, clip)); e.appendChild(el('span', 'grip'));
  e.setAttribute('role', 'button'); e.setAttribute('aria-label', trackName(tr) + ' clip, bars ' + (clip.start + 1) + ' to ' + (clip.start + clip.len));
  return e;
}
function cRender() {
  var tl = $('tl'); tl.textContent = ''; tl.style.setProperty('--bars', C.bars);
  var ruler = el('div', 'tl-row ruler'), rh = el('div', 'tl-head', 'Bars'), rl = el('div', 'tl-lane');
  for (var b = 0; b < C.bars; b++) { var n = el('span', '', String(b + 1)); n.style.left = 'calc(var(--bw) * ' + b + ')'; rl.appendChild(n); }
  var sm = el('span', 'startmark'); sm.style.left = 'calc(var(--bw) * ' + cStart + ')'; rl.appendChild(sm);
  rl.title = 'Click a bar to start playing from there';
  rl.addEventListener('click', function (e) { var r = rl.getBoundingClientRect(); cStart = Math.max(0, Math.min(C.bars - 1, Math.floor((e.clientX - r.left) / (r.width / C.bars)))); if (cPlaying) { cStop(); cPlay(); } cRender(); });
  ruler.appendChild(rh); ruler.appendChild(rl); tl.appendChild(ruler);
  C.tracks.forEach(function (tr) {
    var row = el('div', 'tl-row' + (cKeysSel === tr.id ? ' sel' : '')), head = el('div', 'tl-head'), lane = el('div', 'tl-lane');
    var top = el('div', 'hrow'), bot = el('div', 'hrow');
    if (tr.kind === 'mel') {
      var sel = el('select'); sel.setAttribute('aria-label', 'Sound of this track');
      Object.keys(SOUNDS).forEach(function (k) { var o = el('option', '', k); o.value = k; sel.appendChild(o); });
      sel.value = tr.inst;
      sel.addEventListener('change', function () { tr.inst = sel.value; tr.octave = SOUNDS[tr.inst].octave; delete compCache[tr.id]; compTS(tr); loadSounds(); cRender(); save(); });
      top.appendChild(sel);
    } else top.appendChild(el('span', 'tname', trackName(tr)));
    var del = el('button', 'del', '×'); del.type = 'button'; del.setAttribute('aria-label', 'Remove the ' + trackName(tr) + ' track');
    del.addEventListener('click', function () { C.tracks = C.tracks.filter(function (t) { return t !== tr; }); if (cSel && cSel.t === tr.id) cSel = null; cRender(); save(); });
    top.appendChild(del);
    [['M', 'mute', 'Mute'], ['S', 'solo', 'Solo']].forEach(function (b) {
      var x = el('button', 'ms ' + b[0].toLowerCase() + (tr[b[1]] ? ' on' : ''), b[0]); x.type = 'button'; x.title = b[2]; x.setAttribute('aria-pressed', !!tr[b[1]]); x.setAttribute('aria-label', b[2] + ' ' + trackName(tr));
      x.addEventListener('click', function () { tr[b[1]] = !tr[b[1]]; x.classList.toggle('on', tr[b[1]]); x.setAttribute('aria-pressed', tr[b[1]]); cMix(); save(); });
      bot.appendChild(x);
    });
    var vol = el('input'); vol.type = 'range'; vol.min = 0; vol.max = 100; vol.value = tr.vol; vol.setAttribute('aria-label', trackName(tr) + ' volume');
    vol.addEventListener('input', function () { tr.vol = +vol.value; cMix(); save(); });
    bot.appendChild(vol);
    head.appendChild(top); head.appendChild(bot);
    head.title = 'Play ' + trackName(tr) + ' below';
    head.addEventListener('click', function (e) { if (e.target.closest('select, button, input')) return; cKeysSel = tr.id; markSel(); });
    tr.clips.forEach(function (k) { lane.appendChild(clipEl(tr, k)); });
    wireLane(lane, tr);
    row.appendChild(head); row.appendChild(lane); tl.appendChild(row);
  });
  playheadEl = el('div', 'playhead'); tl.appendChild(playheadEl); cPlayhead(cPlaying && cLast ? cLast.step : cStart * 16);
  if (document.activeElement !== $('cTitle')) $('cTitle').value = C.title || '';
  $('cBpmOut').textContent = C.bpm; $('cBpm').value = C.bpm; $('cBars').value = C.bars; $('cRoot').value = state.root; $('cScale').value = state.scale;
  $('cLoop').classList.toggle('sel', C.loop); $('cLoop').setAttribute('aria-pressed', C.loop);
  cEditor(); cPlayArea(); markHist();
}
function wireLane(lane, tr) {
  var drag = null;
  lane.addEventListener('pointerdown', function (e) {
    var r = lane.getBoundingClientRect(), bw = r.width / C.bars, bar = Math.floor((e.clientX - r.left) / bw), ce = e.target.closest('.clip');
    if (ce) {
      var clip = tr.clips.filter(function (k) { return k.id === ce.dataset.c; })[0];
      e.preventDefault(); try { lane.setPointerCapture(e.pointerId); } catch (x) {}
      drag = { clip: clip, el: ce, mode: e.target.classList.contains('grip') ? 'resize' : 'move', x0: e.clientX, s0: clip.start, l0: clip.len, bw: bw, moved: false };
      if (!cSel || cSel.c !== clip.id) { cSel = { t: tr.id, c: clip.id }; cKeysSel = tr.id; markSel(); cEditor(); }
      return;
    }
    if (bar < 0 || bar >= C.bars || clipAt(tr, bar)) return;
    var len = tr.kind === 'perc' ? 1 : 2; while (len > 1 && !fits(tr, null, bar, len)) len--;
    if (!fits(tr, null, bar, len)) return;
    var k = tr.kind === 'perc' ? percClip(tr.inst, bar, len) : { start: bar, len: len, notes: [] };
    k.id = cNew('c'); tr.clips.push(k); cSel = { t: tr.id, c: k.id }; cKeysSel = tr.id; cRender(); save();
  });
  lane.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x0, d = Math.round(dx / drag.bw);
    if (Math.abs(dx) > 4) drag.moved = true;
    if (drag.mode === 'move') { var ns = drag.s0 + d; if (ns !== drag.clip.start && fits(tr, drag.clip, ns, drag.clip.len)) { drag.clip.start = ns; drag.el.style.left = 'calc(var(--bw) * ' + ns + ')'; } }
    else { var nl = Math.max(1, drag.l0 + d); if (nl !== drag.clip.len && fits(tr, drag.clip, drag.clip.start, nl)) { setLen(tr, drag.clip, nl); drag.el.style.width = 'calc(var(--bw) * ' + nl + ' - 2px)'; } }
  });
  function end() { if (!drag) return; var changed = drag.clip.start !== drag.s0 || drag.clip.len !== drag.l0; drag = null; if (changed) { cRender(); save(); } }
  lane.addEventListener('pointerup', end); lane.addEventListener('pointercancel', end);
}
function markSel() {
  Array.prototype.forEach.call($('tl').querySelectorAll('.clip'), function (e) { e.classList.toggle('sel', !!cSel && e.dataset.c === cSel.c); });
  Array.prototype.forEach.call($('tl').querySelectorAll('.tl-row'), function (r, i) { var t = C.tracks[i - 1]; r.classList.toggle('sel', !!t && t.id === cKeysSel); });
  cPlayArea();
}
function refreshClip(tr, clip) {
  var e = $('tl').querySelector('.clip[data-c="' + clip.id + '"]'); if (!e) return;
  e.replaceChild(clipSVG(tr, clip), e.querySelector('svg'));
}

// clip editor
function cEditor() {
  var box = $('cEditor'); box.textContent = '';
  var tr = cSel && cTrack(cSel.t), clip = tr && tr.clips.filter(function (k) { return k.id === cSel.c; })[0];
  if (!clip) { cSel = null; box.appendChild(el('p', 'ced-empty', 'Pick a clip to edit its notes, or click an empty bar in a row to make a new one.')); return; }
  var head = el('div', 'ced-head');
  head.appendChild(el('h3', '', trackName(tr) + ' · bars ' + (clip.start + 1) + (clip.len > 1 ? '–' + (clip.start + clip.len) : '')));
  function btn(label, fn, title) { var b = el('button', 'chip', label); b.type = 'button'; if (title) b.title = title; b.addEventListener('click', fn); head.appendChild(b); return b; }
  btn('− Shorter', function () { if (clip.len > 1) { setLen(tr, clip, clip.len - 1); cRender(); save(); } }).disabled = clip.len <= 1;
  btn('+ Longer', function () { if (fits(tr, clip, clip.start, clip.len + 1)) { setLen(tr, clip, clip.len + 1); cRender(); save(); } }).disabled = !fits(tr, clip, clip.start, clip.len + 1);
  btn('Duplicate', function () {
    for (var s = clip.start + clip.len; s + clip.len <= C.bars; s++) if (fits(tr, null, s, clip.len)) {
      var k = JSON.parse(JSON.stringify(clip)); k.start = s; k.id = cNew('c'); tr.clips.push(k); cSel = { t: tr.id, c: k.id }; cRender(); save(); return;
    }
    dupBtn.textContent = 'No room after this clip';
    setTimeout(function () { dupBtn.textContent = 'Duplicate'; }, 1600);
  }, 'Copy this clip into the next free bars');
  var dupBtn = head.lastChild;
  if (tr.kind === 'mel') {
    btn('Octave −', function () { tr.octave = Math.max(1, tr.octave - 1); compTS(tr); cEditor(); save(); });
    btn('Octave +', function () { tr.octave = Math.min(6, tr.octave + 1); compTS(tr); cEditor(); save(); });
  }
  if (tr.kind !== 'voice') btn('Clear', function () { if (tr.kind === 'perc') KITS[tr.inst].strokes.forEach(function (id) { clip.steps[id] = new Array(clip.len * 16).fill(false); }); else clip.notes = []; refreshClip(tr, clip); cEditor(); save(); });
  btn('Delete clip', function () { tr.clips = tr.clips.filter(function (k) { return k !== clip; }); cSel = null; cRender(); save(); });
  box.appendChild(head);
  box.style.setProperty('--accent', tr.kind === 'perc' ? 'var(--drum)' : 'var(--synth)');
  if (tr.kind === 'perc') percEditor(box, tr, clip); else if (tr.kind === 'voice') voiceEditor(box, tr, clip); else rollEditor(box, tr, clip);
}
function percEditor(box, tr, clip) {
  var kit = KITS[tr.inst], cols = clip.len * 16;
  var fills = Object.keys(BEATS).filter(function (b) { return BEATS[b].steps === 16 && kit.strokes.some(function (id) { return BEATS[b].d[id]; }); });
  if (tr.inst === 'machine') fills = Object.keys(GB_PRESETS).concat(fills.filter(function (b) { return !GB_PRESETS[b]; }));
  if (fills.length) {
    var fr = el('div', 'ctl'), ch = el('div', 'chips'); fr.appendChild(el('span', 'lbl', 'Fill with a rhythm'));
    fills.forEach(function (b) { var x = el('button', 'chip', b); x.type = 'button'; x.addEventListener('click', function () { fillRhythm(clip, tr.inst, b); refreshClip(tr, clip); cEditor(); save(); }); ch.appendChild(x); });
    fr.appendChild(ch); box.appendChild(fr);
  }
  var sc = el('div', 'ced-scroll'), g = el('div', 'pgrid'); g.style.setProperty('--cols', cols);
  var paintV = null;
  kit.strokes.forEach(function (id) {
    g.appendChild(el('span', 'lab', DRUM_BY[id].name));
    for (var i = 0; i < cols; i++) (function (i) {
      var b = el('button', 'cell' + (Math.floor(i / 4) % 2 === 0 ? ' alt' : '') + (i % 16 === 0 && i > 0 ? ' bar' : '')); b.type = 'button';
      b.setAttribute('aria-label', DRUM_BY[id].name + ', bar ' + (clip.start + Math.floor(i / 16) + 1) + ', step ' + (i % 16 + 1));
      var set = function (v) {
        if (clip.steps[id][i] === v) return;
        clip.steps[id][i] = v; setCell(b, v); refreshClip(tr, clip); save();
        if (v && !cPlaying) { ensureAudio(); drumDest = ensureOut(tr.id); hit(id, ctx.currentTime, 1); drumDest = null; }
      };
      setCell(b, !!clip.steps[id][i]);
      b.addEventListener('pointerdown', function (e) { if (e.pointerType === 'mouse' && e.button === 0) { e.preventDefault(); paintV = !clip.steps[id][i]; set(paintV); b._p = true; } });
      b.addEventListener('pointerenter', function () { if (paintV !== null) set(paintV); });
      b.addEventListener('click', function () { if (b._p) { b._p = false; return; } set(!clip.steps[id][i]); });
      g.appendChild(b);
    })(i);
  });
  window.addEventListener('pointerup', function () { paintV = null; }, { once: true });
  g.addEventListener('pointerup', function () { paintV = null; });
  sc.appendChild(g); box.appendChild(sc);
  box.appendChild(el('p', 'hint', 'Click a square to add a hit, or drag across squares to paint several.'));
}
var lastLen = 2;
function rollEditor(box, tr, clip) {
  var cols = clip.len * 16, sc = el('div', 'ced-scroll'), roll = el('div', 'roll'), keys = el('div', 'keys'), area = el('div', 'area'), sca = SCALES[state.scale];
  area.style.setProperty('--cols', cols); area.setAttribute('role', 'group'); area.setAttribute('aria-label', 'Notes of this clip');
  for (var r = 14; r >= 0; r--) {
    var d = sca[r % 7], pc = (state.root + d) % 12, oct = tr.octave + Math.floor((state.root + d + 12 * Math.floor(r / 7)) / 12);
    keys.appendChild(el('div', r % 7 === 0 ? 'root' : '', pcName(pc) + ' ' + oct));
    if (r % 7 === 0) { var band = el('span', 'band'); band.style.top = ((14 - r) * 23) + 'px'; area.appendChild(band); }
  }
  function noteEl(n) {
    var e = el('div', 'note'); e.style.left = (n.s * 24) + 'px'; e.style.width = (Math.min(n.l, cols - n.s) * 24 - 2) + 'px'; e.style.top = ((14 - n.r) * 23) + 'px';
    e.appendChild(el('span', 'ne')); e._n = n; return e;
  }
  clip.notes.forEach(function (n) { if (n.s < cols) area.appendChild(noteEl(n)); });
  var drag = null;
  function pos(e) { var r = area.getBoundingClientRect(); return { c: Math.max(0, Math.min(cols - 1, Math.floor((e.clientX - r.left) / 24))), r: Math.max(0, Math.min(14, 14 - Math.floor((e.clientY - r.top) / 23))) }; }
  function audition(r) { ensureAudio(); compTS(tr); ensureOut(tr.id); playNote(tr.id, cMidi(tr, r), ctx.currentTime, 0.35, false, 0.85); }
  area.addEventListener('pointerdown', function (e) {
    e.preventDefault(); try { area.setPointerCapture(e.pointerId); } catch (x) {}
    var ne = e.target.closest('.note'), q = pos(e);
    if (ne) { drag = { n: ne._n, e: ne, mode: e.target.classList.contains('ne') ? 'len' : 'move', c0: q.c, r0: q.r, s0: ne._n.s, rr0: ne._n.r, l0: ne._n.l, moved: false }; return; }
    var n = { s: q.c, r: q.r, l: Math.min(lastLen, cols - q.c) };
    clip.notes.push(n); var e2 = noteEl(n); area.appendChild(e2); audition(n.r);
    drag = { n: n, e: e2, mode: 'len', c0: q.c, l0: n.l, created: true, moved: false };
    refreshClip(tr, clip);
  });
  area.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var q = pos(e), n = drag.n;
    if (drag.mode === 'len') {
      var l = drag.created ? Math.max(drag.l0, q.c - n.s + 1) : Math.max(1, drag.l0 + q.c - drag.c0);
      l = Math.min(l, cols - n.s);
      if (l !== n.l) { n.l = l; drag.moved = true; drag.e.style.width = (n.l * 24 - 2) + 'px'; }
    }
    else { var s2 = Math.max(0, Math.min(cols - n.l, drag.s0 + q.c - drag.c0)), r2 = Math.max(0, Math.min(14, drag.rr0 + q.r - drag.r0)); if (s2 !== n.s || r2 !== n.r) { var rc = r2 !== n.r; n.s = s2; n.r = r2; drag.moved = true; drag.e.style.left = (n.s * 24) + 'px'; drag.e.style.top = ((14 - n.r) * 23) + 'px'; if (rc) audition(n.r); } }
  });
  function end() {
    if (!drag) return;
    if (drag.mode === 'move' && !drag.moved) { clip.notes = clip.notes.filter(function (x) { return x !== drag.n; }); drag.e.remove(); } // a tap on a note removes it
    else lastLen = drag.n.l;
    drag = null; refreshClip(tr, clip); save();
  }
  area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
  roll.appendChild(keys); roll.appendChild(area); sc.appendChild(roll); box.appendChild(sc);
  box.appendChild(el('p', 'hint', 'Click to add a note and drag right to make it longer. Drag a note to move it, drag its right edge to resize it, and tap it to remove it. The rows follow the key and maqam; the shaded rows are the key note. While this clip is picked, the computer keys play ' + tr.inst.toLowerCase() + '.'));
}

// ---------- playing a track and recording into it ----------
// The panel of the picked track's instrument appears under the editor. With Record on, what you play
// is written into that track at the bar that is playing (a clip is made there if there is none).
var cRec = false, recOpen = {};
function cPlayArea() {
  var on = state.page === 'compose', t = on && cKeysSel && C && cTrack(cKeysSel);
  document.body.classList.toggle('play-perc', !!t && t.kind === 'perc');
  document.body.classList.toggle('play-mel', !!t && t.kind === 'mel');
  if (!on) return;
  if (t && t.kind === 'voice') {
    $('cPlayTitle').textContent = cRec ? 'Recording your voice' : 'Record your voice';
    $('cPlayHint').textContent = 'Press ● Record: the song plays from the start marker (▼ above bar ' + (cStart + 1) + ') and the microphone records until you press Record again or the song ends. Use headphones, so the music is not recorded too. Recordings stay in this browser' + (audioKept ? '' : ' until you close the page') + '.';
    return;
  }
  if (!t) {
    $('cPlayTitle').textContent = 'Play an instrument';
    $('cPlayHint').textContent = 'Pick a track (click its name or one of its clips) to play it here. Turn on Record while the song plays to write what you play into that track.';
    return;
  }
  $('cPlayTitle').textContent = 'Play the ' + trackName(t).replace(/^Raï/, 'raï') + (cRec ? ': recording' : '');
  $('cPlayHint').textContent = (t.kind === 'perc' ? 'Tap the drum below or use the computer keys.' : 'Play the instrument below or the computer keys. Notes land on the nearest note of the key and maqam.') +
    ' With ● Record on, what you play is written into this track while the song plays, and loops add on top of each other.';
  if (t.kind === 'perc') { if (state.perc !== t.inst) { state.perc = t.inst; renderSim(); } }
  else { compTS(t); render(true); }
}
function cPos() { // where the song is now, in steps, allowing for the delay before sound reaches the speakers
  var sd = 60 / C.bpm / 4, now = ctx.currentTime - (ctx.outputLatency || 0);
  return cStep - (cBase - now) / sd;
}
function cWrap(step) { var n = C.bars * 16; return ((Math.round(step) % n) + n) % n; }
function cRecTrack(kind) { var t = cRec && cPlaying && cKeysSel && cTrack(cKeysSel); return t && t.kind === kind ? t : null; }
function clipFor(tr, bar) { // the clip at this bar, or a new one-bar clip if there is room
  var k = clipAt(tr, bar); if (k) return k;
  if (!fits(tr, null, bar, 1)) return null;
  k = tr.kind === 'perc' ? percClip(tr.inst, bar, 1) : { start: bar, len: 1, notes: [] };
  k.id = cNew('c'); tr.clips.push(k); cRender();
  return k;
}
function recShow(tr, clip) { refreshClip(tr, clip); if (cSel && cSel.c === clip.id) cEditor(); save(); }
function cRecordHit(id) {
  var tr = cRecTrack('perc'); if (!tr || KITS[tr.inst].strokes.indexOf(id) < 0) return;
  var step = cWrap(cPos()), bar = Math.floor(step / 16), clip = clipFor(tr, bar); if (!clip) return;
  var ls = (bar - clip.start) * 16 + step % 16;
  if (!clip.steps[id][ls]) { clip.steps[id][ls] = true; recShow(tr, clip); }
}
function cRecNoteOn(key, midi) {
  var tr = cRecTrack('mel'); if (!tr) return;
  recOpen[key] = { tr: tr, pos: cPos(), midi: midi };
}
function cRecNoteOff(key) {
  var r = recOpen[key]; if (!r) return; delete recOpen[key];
  if (!cPlaying) return;
  var tr = r.tr, s = cWrap(r.pos), len = Math.max(1, Math.round(cPos() - r.pos)), bar = Math.floor(s / 16), clip = clipFor(tr, bar); if (!clip) return;
  var best = 0; for (var i = 1; i <= 14; i++) if (Math.abs(cMidi(tr, i) - r.midi) < Math.abs(cMidi(tr, best) - r.midi)) best = i;
  var ls = (bar - clip.start) * 16 + s % 16;
  while (ls + len > clip.len * 16 && fits(tr, clip, clip.start, clip.len + 1)) setLen(tr, clip, clip.len + 1); // a long note makes its clip longer
  len = Math.min(len, clip.len * 16 - ls);
  if (clip.notes.some(function (n) { return n.s === ls && n.r === best; })) return; // already there from an earlier pass
  clip.notes.push({ s: ls, r: best, l: len }); recShow(tr, clip);
}
function cRecSet(on) {
  cRec = on;
  if (!on && mic) micStop();
  if (!on) { Object.keys(recOpen).forEach(cRecNoteOff); histPause(false); }
  else histPause(true); // a whole take is one step in the undo history
  $('cRec').classList.toggle('sel', on); $('cRec').setAttribute('aria-pressed', on); $('cRec').textContent = on ? '● Recording' : '● Record';
  markHist(); cPlayArea();
}
$('cRec').addEventListener('click', function () {
  if (cRec) { cRecSet(false); return; }
  if (!cKeysSel) { var first = C.tracks[0]; if (first) cKeysSel = first.id; markSel(); }
  var vt = cTrack(cKeysSel);
  if (vt && vt.kind === 'voice') { // the microphone first, so the take starts with the music
    var b = this; b.disabled = true;
    micStart().then(function () { cRecSet(true); if (cPlaying) { cStop(); } cPlay(); }, cMicError).then(function () { b.disabled = false; });
    return;
  }
  cRecSet(true); if (!cPlaying) cPlay();
});
$('cClick').addEventListener('click', function () { state.cClick = !state.cClick; this.classList.toggle('sel', state.cClick); this.setAttribute('aria-pressed', state.cClick); save(); });

// ---------- voice recordings ----------
var voiceBufs = {}, voiceSrcs = [], mic = null, recModuleP = null, cFirst = false;
function pcmToBuffer(v) {
  var i16 = new Int16Array(v.pcm), b = new AudioBuffer({ length: Math.max(1, i16.length), sampleRate: v.sr, numberOfChannels: 1 }), d = b.getChannelData(0);
  for (var i = 0; i < i16.length; i++) d[i] = i16[i] / 32768;
  return b;
}
function loadVoice(key) {
  if (voiceBufs[key]) return Promise.resolve(voiceBufs[key]);
  return audioGet(key).then(function (v) { if (v && v.pcm) voiceBufs[key] = pcmToBuffer(v); return voiceBufs[key]; });
}
function playVoice(tr, clip, t, ls, sd) {
  var b = voiceBufs[clip.audio]; if (!b) return;
  var from = (clip.off || 0) + (clip.nudge || 0) + ls * sd, dur = (clip.len * 16 - ls) * sd, delay = 0;
  if (from < 0) { delay = -from; from = 0; dur -= delay; }
  if (from >= b.duration || dur <= 0.01) return;
  var src = ctx.createBufferSource(), g = ctx.createGain(), end = t + delay + Math.min(dur, b.duration - from);
  src.buffer = b;
  g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(1, t + delay + 0.006);
  g.gain.setValueAtTime(1, Math.max(t + delay + 0.007, end - 0.012)); g.gain.linearRampToValueAtTime(0, end);
  src.connect(g); g.connect(ensureOut(tr.id)); src.start(t + delay, from); src.stop(end + 0.02);
  if (!(ctx instanceof OfflineAudioContext)) voiceSrcs.push(src);
}
function cPosAt(T) { var sd = 60 / C.bpm / 4; return cStep - (cBase - T) / sd; }
// The microphone is read sample by sample (an audio worklet), so every piece knows exactly when it was heard.
var REC_CODE = "class R extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(4096);this.n=0;this.t=0}" +
  "process(i){var c=i[0]&&i[0][0];if(!c)return true;if(this.n===0)this.t=currentTime;var m=Math.min(c.length,4096-this.n);this.b.set(c.subarray(0,m),this.n);this.n+=m;" +
  "if(this.n===4096){this.port.postMessage({d:this.b.slice(0),t:this.t});this.n=0}return true}}registerProcessor('bendir-rec',R);";
function recNode(onChunk) {
  if (ctx.audioWorklet && window.AudioWorkletNode) {
    if (!recModuleP) recModuleP = ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([REC_CODE], { type: 'application/javascript' })));
    return recModuleP.then(function () { var n = new AudioWorkletNode(ctx, 'bendir-rec'); n.port.onmessage = function (e) { onChunk(e.data.d, e.data.t); }; return n; });
  }
  var sp = ctx.createScriptProcessor(4096, 1, 1); // older browsers
  sp.onaudioprocess = function (e) { onChunk(new Float32Array(e.inputBuffer.getChannelData(0)), ctx.currentTime - 4096 / ctx.sampleRate); };
  return Promise.resolve(sp);
}
function micStart() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error('nomic'));
  ensureAudio();
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (stream) {
    var src = ctx.createMediaStreamSource(stream), sink = ctx.createGain(), set = stream.getAudioTracks()[0].getSettings ? stream.getAudioTracks()[0].getSettings() : {};
    sink.gain.value = 0; sink.connect(ctx.destination);
    var m = { stream: stream, src: src, sink: sink, chunks: [], firstT: null, firstPos: 0, inLat: set.latency || 0.01 };
    return recNode(function (data, t) {
      if (!cPlaying || !cRec || mic !== m) return;
      if (m.firstT == null) { m.firstT = t; m.firstPos = cPosAt(t); }
      m.chunks.push(data);
    }).then(function (node) { src.connect(node); node.connect(sink); m.node = node; mic = m; });
  });
}
function micStop() {
  var m = mic; mic = null; if (!m) return;
  try { m.stream.getTracks().forEach(function (t) { t.stop(); }); m.src.disconnect(); m.node.disconnect(); m.sink.disconnect(); } catch (e) {}
  var tr = cTrack(cKeysSel); if (!tr || tr.kind !== 'voice' || !m.chunks.length) return;
  var sd = 60 / C.bpm / 4, sr = ctx.sampleRate, total = m.chunks.reduce(function (a, c) { return a + c.length; }, 0);
  var data = new Float32Array(total), o = 0; m.chunks.forEach(function (c) { data.set(c, o); o += c.length; });
  // The singer hears the music late (output delay) and the microphone hears them late (input delay): move the take earlier by both.
  var lat = (ctx.outputLatency || ctx.baseLatency || 0) + m.inLat, startPos = m.firstPos - lat / sd;
  var bar = Math.max(0, Math.floor(startPos / 16)), lead = (startPos - bar * 16) * sd;
  var len = Math.max(1, Math.min(C.bars - bar, Math.ceil((lead + total / sr) / (16 * sd))));
  var key = 'voice-' + Date.now().toString(36), i16 = new Int16Array(total);
  for (var i = 0; i < total; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(data[i] * 32767)));
  var buf = new AudioBuffer({ length: total, sampleRate: sr, numberOfChannels: 1 }); buf.getChannelData(0).set(data); voiceBufs[key] = buf;
  tr.clips = tr.clips.filter(function (k) { return k.start + k.len <= bar || k.start >= bar + len; }); // a new take replaces what it covers
  var clip = { id: cNew('c'), start: bar, len: len, audio: key, off: -lead };
  tr.clips.push(clip); cSel = { t: tr.id, c: clip.id };
  audioPut(key, { sr: sr, pcm: i16.buffer }).then(function () { save(); });
  cRender(); save();
}
function cMicError(e) {
  var h = $('cPlayHint');
  h.textContent = e && e.name === 'NotAllowedError' ? 'The microphone is blocked. Allow it for this site in your browser (usually the icon at the left of the address bar), then press ● Record again.'
    : e && e.name === 'NotFoundError' ? 'No microphone was found. Connect one, then press ● Record again.'
    : 'The microphone cannot be used here. Open the app on its own site (nadhemkhlij.github.io) in Chrome, Firefox or Safari.';
}
function voiceEditor(box, tr, clip) {
  var sd = 60 / C.bpm / 4, b = voiceBufs[clip.audio];
  var wave = el('div', 'voice-wave'); wave.appendChild(clipSVG(tr, clip)); box.appendChild(wave);
  if (!b) { box.appendChild(el('p', 'hint', 'This recording is not stored in this browser, so it cannot play here. Recordings stay on the device they were made on.')); return; }
  var row = el('div', 'knobs');
  var ec = el('div', 'ctl'), el1 = el('label', '', 'Echo'), ei = el('input'); el1.setAttribute('for', 'cVoiceEcho'); ei.id = 'cVoiceEcho'; ei.type = 'range'; ei.min = 0; ei.max = 100; ei.value = tr.echo || 0;
  ei.addEventListener('input', function () { tr.echo = +ei.value; if (trackSend[tr.id]) trackSend[tr.id].gain.setTargetAtTime(tr.echo / 100 * 0.7, ctx.currentTime, 0.02); save(); });
  ec.appendChild(el1); ec.appendChild(ei); row.appendChild(ec);
  var nd = el('div', 'ctl'), shift = el('span', 'lbl'), chips = el('div', 'chips');
  var showShift = function () { var ms = Math.round((clip.nudge || 0) * 1000); shift.textContent = 'Timing: ' + (ms > 0 ? ms + ' ms earlier' : ms < 0 ? -ms + ' ms later' : 'as recorded'); };
  [['◀ 10 ms earlier', 0.01], ['10 ms later ▶', -0.01]].forEach(function (a) {
    var x = el('button', 'chip', a[0]); x.type = 'button';
    x.addEventListener('click', function () { clip.nudge = Math.round(((clip.nudge || 0) + a[1]) * 1000) / 1000; showShift(); refreshClip(tr, clip); save(); });
    chips.appendChild(x);
  });
  showShift(); nd.appendChild(shift); nd.appendChild(chips); row.appendChild(nd); box.appendChild(row);
  box.appendChild(el('p', 'hint', 'A take of ' + b.duration.toFixed(1) + ' seconds. If your voice sounds a little behind or ahead of the beat, move it 10 ms at a time. Drag the clip to move it by bars, or record again over it to replace it.'));
}

// ---------- undo and redo ----------
// Changes made within half a second of each other (a drag, a paint stroke) are one step.
var hist = { undo: [], redo: [], last: null, timer: null, paused: false };
function histSnap() { return JSON.stringify({ song: state.compose, root: state.root, scale: state.scale }); }
function histReset() { hist.undo = []; hist.redo = []; hist.last = histSnap(); markHist(); }
function histCommit() {
  clearTimeout(hist.timer);
  if (hist.paused || hist.last == null) return;
  var now = histSnap(); if (now === hist.last) return;
  hist.undo.push(hist.last); if (hist.undo.length > 100) hist.undo.shift();
  hist.redo = []; hist.last = now; markHist();
}
function histSoon() { clearTimeout(hist.timer); hist.timer = setTimeout(histCommit, 500); }
function histPause(on) { if (on) { histCommit(); hist.paused = true; } else { hist.paused = false; histCommit(); } }
function histApply(snap) {
  var o = JSON.parse(snap);
  if (cPlaying) cStop();
  state.compose = C = o.song; state.root = o.root; state.scale = o.scale; autoQt();
  if (cSel && !cTrack(cSel.t)) cSel = null;
  if (cKeysSel && !cTrack(cKeysSel)) cKeysSel = null;
  hist.last = snap; cRender(); render(true); save(); markHist();
}
function undo() { histCommit(); if (!hist.undo.length || cRec) return; hist.redo.push(hist.last); histApply(hist.undo.pop()); }
function redo() { histCommit(); if (!hist.redo.length || cRec) return; hist.undo.push(hist.last); histApply(hist.redo.pop()); }
function markHist() { $('cUndo').disabled = cRec || !hist.undo.length; $('cRedo').disabled = cRec || !hist.redo.length; }
$('cUndo').addEventListener('click', undo);
$('cRedo').addEventListener('click', redo);

// controls
NOTE_NAMES.forEach(function (n, i) { var o = el('option', '', n); o.value = i; $('cRoot').appendChild(o); });
Array.prototype.forEach.call($('scale').options, function (o) { $('cScale').appendChild(o.cloneNode(true)); });
$('cRoot').addEventListener('change', function () { state.root = +this.value; autoQt(); cRender(); render(true); save(); });
$('cScale').addEventListener('change', function () { state.scale = this.value; autoQt(); cRender(); render(true); save(); });
$('cBpm').addEventListener('input', function () { C.bpm = +this.value; $('cBpmOut').textContent = C.bpm; save(); });
$('cBars').addEventListener('change', function () { C.bars = +this.value; cStart = Math.min(cStart, C.bars - 1); cRender(); save(); });
$('cLoop').addEventListener('click', function () { C.loop = !C.loop; cRender(); save(); });
$('cPlay').addEventListener('click', cToggle);
$('cWav').addEventListener('click', downloadSong);
$('cShare').addEventListener('click', shareSong);
$('cCopy').addEventListener('click', copyLink);
$('cShareUrl').addEventListener('focus', function () { this.select(); });
$('cTitle').addEventListener('input', function () { C.title = this.value.slice(0, 60); $('cShareBox').hidden = true; save(); });
$('cKeepShared').addEventListener('click', function () { delete state.composeBackup; $('cShared').hidden = true; save(); });
$('cBackMine').addEventListener('click', function () {
  var b = state.composeBackup; if (!b) return;
  if (cPlaying) cStop();
  state.compose = C = b.song; state.root = b.root; state.scale = b.scale; autoQt(); delete state.composeBackup;
  $('cShared').hidden = true; cSel = null; cKeysSel = null; save(); cRender(); render(true); histReset();
});
$('cHome').addEventListener('click', function () { cStart = 0; if (cPlaying) { cStop(); cPlay(); } else cRender(); });
(function () {
  var add = $('cAdd'), o = el('option', '', 'Choose…'); o.value = ''; add.appendChild(o);
  var g1 = el('optgroup'); g1.label = 'Percussion'; Object.keys(KITS).forEach(function (k) { var x = el('option', '', KITS[k].name); x.value = 'perc:' + k; g1.appendChild(x); }); add.appendChild(g1);
  var g2 = el('optgroup'); g2.label = 'Melody'; Object.keys(SOUNDS).forEach(function (k) { var x = el('option', '', k); x.value = 'mel:' + k; g2.appendChild(x); }); add.appendChild(g2);
  var g3 = el('optgroup'); g3.label = 'Voice'; var xv = el('option', '', 'Voice (record with a microphone)'); xv.value = 'voice:Voice'; g3.appendChild(xv); add.appendChild(g3);
  add.addEventListener('change', function () {
    var v = add.value; add.value = ''; if (!v) return;
    if (C.tracks.length >= 12) return;
    var kind = v.split(':')[0], inst = v.slice(kind.length + 1);
    var t = { id: cNew('t'), kind: kind, inst: inst, vol: kind === 'voice' ? 85 : 75, mute: false, solo: false, octave: kind === 'mel' ? SOUNDS[inst].octave : 0, clips: [] };
    if (kind === 'voice') { t.echo = 15; cKeysSel = t.id; }
    C.tracks.push(t); loadSounds(); cRender(); save();
    $('tlWrap').scrollIntoView({ block: 'nearest' });
  });
})();

if (!validCompose(state.compose)) state.compose = demoCompose();
cNormalize(state.compose); if (state.composeBackup) cNormalize(state.composeBackup.song);
if (state.composeBackup && !validCompose(state.composeBackup.song)) delete state.composeBackup;
C = state.compose;
histReset();
