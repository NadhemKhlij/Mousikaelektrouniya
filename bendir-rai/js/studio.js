// Bendir & Raï — The studio: sequencer, percussion simulators, step grids, song bar, tracks, keyboard, oud neck and flute.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

// ---------- sequencer ----------
var playing = false, timer = null, stepIdx = 0, baseTime = 0, queue = [], shown = -1, skip = {};
var playPat = 0, chainPos = 0, prevHad = {};
function schedule() {
  while (baseTime < ctx.currentTime + 0.12) {
    var p = patAt(playPat), n = p.steps;
    if (stepIdx >= n) stepIdx = 0;
    var sd = stepDurFor(p), g = n === 12 ? 3 : 4;
    var t = baseTime + (stepIdx % 2 && n === 16 ? state.swing / 100 * sd * 0.66 : 0);
    var vel = stepIdx % g === 0 ? 1 : 0.8, ids = [];
    rollLen = sd;
    DRUMS.forEach(function (d) { if (p.drums[d.id][stepIdx] && !(skip[d.id] > t)) { hit(d.id, t, vel); ids.push(d.id); } });
    TRACKS.forEach(function (tr) {
      var grid = p.notes[tr.id], had = false;
      for (var r = 0; r < ROWS; r++) {
        if (!grid[r][stepIdx]) continue;
        had = true;
        if (tr.id === 'chords') {
          if (stepIdx > 0 && grid[r][stepIdx - 1]) continue; // already sounding: this step holds it
          var len = 1; while (stepIdx + len < n && grid[r][stepIdx + len]) len++;
          playChord(r, t, len * sd * 0.96);
        } else playNote(tr.id, degMidi(tr.id, r), t, sd * 0.92, prevHad[tr.id]);
      }
      prevHad[tr.id] = had;
    });
    queue.push({ step: stepIdx, time: t, ids: ids, pat: playPat, pos: chainPos });
    stepIdx++; baseTime += sd;
    if (stepIdx >= n) { // end of the bar: decide what plays next
      stepIdx = 0;
      if (state.page) playPat = -1;
      else if (state.mode === 'song' && state.chain.length) { chainPos = (chainPos + 1) % state.chain.length; playPat = state.chain[chainPos]; }
      else playPat = state.cur;
    }
  }
}
var warm = false;
function start() {
  ensureAudio();
  if (!warm) { warm = true; Promise.race([loadSounds(), new Promise(function (r) { setTimeout(r, 1500); })]).then(begin); return; }
  begin();
}
function begin() {
  if (playing) return;
  chainPos = 0;
  playPat = state.page ? -1 : state.mode === 'song' && state.chain.length ? state.chain[0] : state.cur;
  playing = true; stepIdx = 0; baseTime = ctx.currentTime + 0.06; queue = []; prevHad = {};
  schedule(); timer = setInterval(schedule, 25);
  $('play').textContent = '■ Stop'; $('play').classList.add('playing');
  $('fPlay').textContent = '■ Stop'; $('fPlay').classList.add('playing');
}
function stopStudio() {
  playing = false; clearInterval(timer); queue = []; showStep(-1); markChain(-1); setCues([]);
  $('play').textContent = '▶ Play'; $('play').classList.remove('playing');
  $('fPlay').textContent = '▶ Play a rhythm'; $('fPlay').classList.remove('playing');
}
function toggle() { if (state.page === 'compose') { cToggle(); return; } if (state.page === 'drum-machine') { gbToggle(); return; } playing ? stopStudio() : start(); }

// ---------- percussion simulators ----------
var drumRow = {}, DRUM_BY = {};
DRUMS.forEach(function (d) { DRUM_BY[d.id] = d; });
function touchVel() { return state.touch / 100; }
function record(id) {
  if (state.page === 'compose') { cRecordHit(id); return; }
  if (state.page === 'drum-machine') { gbRecordHit(id); return; }
  if (!playing || !state.rec) return;
  var p = patAt(playPat), sd = stepDurFor(p), n = p.steps, now = ctx.currentTime - (ctx.outputLatency || 0);
  var step = ((Math.round(stepIdx - (baseTime - now) / sd) % n) + n) % n;
  skip[id] = ctx.currentTime + sd * 0.7; // do not replay the tap the player just made
  if (!p.drums[id][step]) {
    p.drums[id][step] = true; p.beat = '';
    if (playPat === state.cur && drumRow[id]) setCell(drumRow[id][step], true);
    markChips(); markPats(); save();
  }
}
function tap(id, vel) {
  ensureAudio();
  if (state.page === 'drum-machine') drumDest = GBN && GBN.input; // through the drum machine's effects
  hit(id, ctx.currentTime, vel == null ? (DRUM_BY[id].machine ? 1 : touchVel()) : vel); flash(id);
  drumDest = null; gbFlash(id);
  record(id);
}

// Each simulator is drawn from its zones. Round drums: zones are rings (r = inner/outer radius, 0 to 1),
// optionally split into left (side -1) and right (side 1). Split drums: left and right halves. Pads: big buttons.
var SIMS = {
  darbuka: { name: 'Darbuka', shape: 'round', zones: [
    { id: 'dum', label: 'Dum', key: 'B', r: [0, 0.45], color: 'center', big: true },
    { id: 'slap', label: 'Slap', key: 'V', r: [0.45, 0.68], color: 'ring' },
    { id: 'ka', label: 'Ka', key: 'M', r: [0.68, 1], side: -1, color: 'rimL', hold: 'roll' },
    { id: 'tak', label: 'Tak', key: 'N', r: [0.68, 1], side: 1, color: 'rimR', hold: 'roll' }],
    help: 'The darbuka is the goblet drum at the heart of Tunisian and raï rhythms. Hit the middle for the deep <b>Dum</b>, the ring for a <b>Slap</b>, the left edge for <b>Ka</b> and the right edge for <b>Tak</b>. Hold a finger on an edge to <b>roll</b>.' },
  bendir: { name: 'Bendir', shape: 'round', zones: [
    { id: 'bendir', label: 'Dum', key: '4', r: [0, 0.62], color: 'center', big: true },
    { id: 'bendirt', label: 'Tak', sub: 'edge', r: [0.62, 1], color: 'rimR' }],
    help: 'The bendir is a big frame drum with gut snares stretched under the skin, so every hit buzzes. Hit the middle for the deep <b>Dum</b> and the edge for the sharp <b>Tak</b>.' },
  tar: { name: 'Tar', shape: 'round', jingles: true, zones: [
    { id: 'tar', label: 'Skin', key: '5', r: [0, 0.62], color: 'center', big: true },
    { id: 'tarj', label: 'Jingles', r: [0.62, 1], color: 'ring', hold: 'shake' }],
    help: 'The tar is a small frame drum with metal jingles in its rim. Tap the <b>skin</b> to hit it and the <b>jingles</b> to shake them. Hold on the jingles to keep shaking.' },
  tbal: { name: 'Tbal', shape: 'split', zones: [
    { id: 'tbal', label: 'Big stick', key: '7', side: -1, color: 'center' },
    { id: 'tbalt', label: 'Thin stick', side: 1, color: 'rimR' }],
    help: 'The tbal is a large double-sided drum played with two sticks: a heavy curved one on the deep side and a thin one on the other. The left half is the <b>big stick</b>, the right half the <b>thin stick</b>.' },
  shq: { name: 'Shqashiq', shape: 'pads', zones: [
    { id: 'shq', label: 'Left hand', key: '6', hand: 0.8, color: 'rimR', hold: 'gallop' },
    { id: 'shq', label: 'Right hand', hand: 1, color: 'rimR', hold: 'gallop' }],
    help: 'Shqashiq (krakeb) are pairs of iron castanets, one pair in each hand, used in stambeli. Alternate hands, or hold one down for the galloping pattern.' },
  clap: { name: 'Clap', shape: 'pads', zones: [{ id: 'clap', label: 'Clap', key: '8', color: 'ring' }],
    help: 'Hand claps, as in a wedding or a raï chorus.' },
  machine: { name: 'Drum machine', shape: 'pads', machine: true, zones: [
    { id: 'kick', label: 'Kick', key: '9' }, { id: 'snare', label: 'Snare', key: '0' }, { id: 'hat', label: 'Hat', key: '-' }, { id: 'ohat', label: 'Open hat', key: '=' },
    { id: 'mclap', label: 'Clap' }, { id: 'rim', label: 'Rim' }, { id: 'ltom', label: 'Low tom' }, { id: 'htom', label: 'High tom' }, { id: 'ride', label: 'Ride' }, { id: 'cow', label: 'Cowbell' }],
    help: 'An analog-style drum machine, like the ones that came into raï studios in the early 1980s and drive techno and house.' }
};
function lvl(id) { return Math.pow(state.levels[id] / 100, 2) * 1.2 * touchVel(); }
var HOLDS = { // what happens while a finger stays down
  roll: { every: 65, rec: 'roll', play: function (n) { var side = n % 2 ? 'ka' : 'tak'; playStroke(side, ctx.currentTime, lvl('roll') * (0.5 + Math.random() * 0.15), true); flash(side); } },
  shake: { every: 115, play: function (n) { playStroke('tarj', ctx.currentTime, lvl('tarj') * (n % 2 ? 0.5 : 0.75), false); flash('tarj'); } },
  gallop: { every: 100, play: function (n) { playStroke('shq', ctx.currentTime, lvl('shq') * (n % 3 === 0 ? 0.95 : 0.5), false); flash('shq'); } }
};
var holds = {}, holdTimers = {};
function holdStart(key, kind) {
  ensureAudio();
  if (holds[key]) return;
  var h = HOLDS[kind], n = 0;
  if (h.rec) record(h.rec);
  holds[key] = setInterval(function () { h.play(n++); }, h.every);
}
function holdStop(key) { clearInterval(holds[key]); delete holds[key]; clearTimeout(holdTimers[key]); delete holdTimers[key]; }

var simBox = $('sim'), simEls = {}, cueEls = [];
function flash(id) {
  (simEls[id] || []).forEach(function (e) {
    e.classList.add('hit'); clearTimeout(e._t); e._t = setTimeout(function () { e.classList.remove('hit'); }, 90);
  });
}
function setCues(ids) {
  cueEls.forEach(function (e) { e.classList.remove('cue'); }); cueEls = [];
  ids.forEach(function (id) { (simEls[id] || []).forEach(function (e) { e.classList.add('cue'); cueEls.push(e); }); });
}
function labelEl(z) {
  var l = el('span', 'zl' + (z.big ? ' big' : ''), z.label);
  if (z.sub || z.key) l.appendChild(el('small', '', [z.sub, z.key].filter(Boolean).join(' · ')));
  return l;
}
function addZoneEl(z, e) { (simEls[z.id] = simEls[z.id] || []).push(e); }
function renderSim() {
  var sim = SIMS[state.perc], buttons = sim.shape === 'pads' || state.percView === 'buttons';
  holdsClear(); simBox.textContent = ''; simEls = {}; cueEls = [];
  simBox.setAttribute('aria-label', sim.name);
  if (buttons) {
    simBox.className = 'sim bpads' + (sim.machine ? ' machine' : '') + (sim.zones.length === 1 ? ' one' : '');
    sim.zones.forEach(function (z, i) {
      var b = el('button', 'bpad zc-' + (z.color || 'center')); b.type = 'button'; b.dataset.zi = i;
      b.appendChild(el('span', '', z.label));
      if (z.sub || z.key) b.appendChild(el('small', '', [z.sub, z.key].filter(Boolean).join(' · ')));
      simBox.appendChild(b); addZoneEl(z, b);
    });
  } else {
    simBox.className = 'sim drum';
    if (sim.shape === 'split') {
      sim.zones.forEach(function (z) { var h = el('span', 'half zc-' + z.color + (z.side < 0 ? ' l' : ' r')); simBox.appendChild(h); });
      simBox.appendChild(el('span', 'divide'));
    } else {
      var rim = sim.zones.filter(function (z) { return z.r[1] === 1; });
      if (rim.length === 2) {
        rim.forEach(function (z) { simBox.appendChild(el('span', 'half zc-' + z.color + (z.side < 0 ? ' l' : ' r'))); });
        simBox.appendChild(el('span', 'divide'));
      } else simBox.appendChild(el('span', 'half l zc-' + rim[0].color)), simBox.appendChild(el('span', 'half r zc-' + rim[0].color));
      if (sim.jingles) for (var j = 0; j < 10; j++) {
        var a = j / 10 * Math.PI * 2, jn = el('span', 'jingle');
        jn.style.left = (50 + Math.cos(a) * 41) + '%'; jn.style.top = (50 + Math.sin(a) * 41) + '%'; simBox.appendChild(jn);
      }
      sim.zones.filter(function (z) { return z.r[1] < 1; }).sort(function (a, b) { return b.r[1] - a.r[1]; }).forEach(function (z) {
        var c = el('span', 'zone zc-' + z.color); c.style.width = c.style.height = (z.r[1] * 100) + '%'; simBox.appendChild(c);
      });
    }
    sim.zones.forEach(function (z) {
      var l = labelEl(z), x = 50, y = 50;
      if (sim.shape === 'split') x = 50 + z.side * 25;
      else if (z.r[0] > 0) {
        var m = (z.r[0] + z.r[1]) / 2 * 50;
        if (z.side) x = 50 + z.side * m; else y = 50 - m;
      }
      l.style.left = x + '%'; l.style.top = y + '%';
      simBox.appendChild(l); addZoneEl(z, l);
    });
  }
  $('simHelp').innerHTML = sim.help; // our own text, defined above
  $('simViewRow').hidden = sim.shape === 'pads';
  $('viewReal').classList.toggle('sel', state.percView !== 'buttons'); $('viewButtons').classList.toggle('sel', state.percView === 'buttons');
  Array.prototype.forEach.call($('percTabs').children, function (b) { var on = b.dataset.sim === state.perc; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); });
}
function zoneAt(sim, e) {
  var r = simBox.getBoundingClientRect(), b = parseFloat(getComputedStyle(simBox).borderLeftWidth) || 0, R = r.width / 2 - b;
  var x = (e.clientX - r.left - r.width / 2) / R, y = (e.clientY - r.top - r.height / 2) / R, d = Math.sqrt(x * x + y * y), side = x < 0 ? -1 : 1;
  if (d > 1.1) return null;
  for (var i = 0; i < sim.zones.length; i++) {
    var z = sim.zones[i];
    if (sim.shape === 'split') { if (z.side === side) return z; continue; }
    if (d >= z.r[0] && (d < z.r[1] || z.r[1] === 1) && (!z.side || z.side === side)) return z;
  }
  return null;
}
function ripple(x, y) { var rp = el('span', 'ripple'); rp.style.left = x + 'px'; rp.style.top = y + 'px'; simBox.appendChild(rp); setTimeout(function () { rp.remove(); }, 500); }
function strike(z, e, key) {
  var sim = SIMS[state.perc];
  var vel = sim.machine ? 1 : (e && e.pointerType !== 'mouse' && e.pressure > 0 && e.pressure !== 0.5 ? 0.3 + 0.7 * e.pressure : touchVel()) * (z.hand || 1);
  tap(z.id, vel);
  if (z.hold && e) holdTimers[key] = setTimeout(function () { holdStart(key, z.hold); }, 220); // only a finger or mouse can hold
}
simBox.addEventListener('pointerdown', function (e) {
  var sim = SIMS[state.perc], z, b = e.target.closest && e.target.closest('.bpad');
  if (simBox.classList.contains('bpads')) { if (!b) return; z = sim.zones[+b.dataset.zi]; }
  else z = zoneAt(sim, e);
  if (!z) return;
  e.preventDefault();
  try { simBox.setPointerCapture(e.pointerId); } catch (x) {}
  strike(z, e, e.pointerId);
  if (!b) { var r = simBox.getBoundingClientRect(), bw = parseFloat(getComputedStyle(simBox).borderLeftWidth) || 0; ripple(e.clientX - r.left - bw, e.clientY - r.top - bw); }
});
['pointerup', 'pointercancel'].forEach(function (ev) { simBox.addEventListener(ev, function (e) { holdStop(e.pointerId); }); });
simBox.addEventListener('keydown', function (e) {
  var b = e.target.closest && e.target.closest('.bpad');
  if (!b || e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault(); e.stopPropagation(); strike(SIMS[state.perc].zones[+b.dataset.zi], null, 'kb');
});
function holdsClear() { Object.keys(holds).concat(Object.keys(holdTimers)).forEach(holdStop); }
Object.keys(SIMS).forEach(function (k) {
  var b = el('button', 'chip', SIMS[k].name); b.type = 'button'; b.dataset.sim = k; b.setAttribute('role', 'tab');
  b.addEventListener('click', function () { state.perc = k; renderSim(); save(); });
  $('percTabs').appendChild(b);
});
$('viewReal').addEventListener('click', function () { state.percView = 'real'; renderSim(); save(); });
$('viewButtons').addEventListener('click', function () { state.percView = 'buttons'; renderSim(); save(); });
$('guide').addEventListener('click', function () { state.guide = !state.guide; if (!state.guide) setCues([]); render(true); save(); });

// ---------- step grids ----------
var cols = []; for (var c = 0; c < STEPS; c++) cols.push([]);
var stepRows = [], rulers = [], melCells = [], melNames = [];
function showStep(n) {
  if (n === shown) return;
  if (shown >= 0) cols[shown].forEach(function (e) { e.classList.remove('now'); });
  if (n >= 0) cols[n].forEach(function (e) { e.classList.add('now'); });
  shown = n;
}
function setCell(b, v) { b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); }
var paint = null, skipClick = null;
window.addEventListener('pointerup', function () { paint = null; setTimeout(function () { skipClick = null; }, 0); });

function buildRow(grid, label, get, set, audition, cls) {
  var row = el('div', 'row' + (cls ? ' ' + cls : '')), name = el('span', 'name', label), steps = el('div', 'steps'), cells = [];
  for (var i = 0; i < STEPS; i++) (function (i) {
    var b = el('button', 'cell'); b.type = 'button';
    function apply(v) {
      if (get(i) === v) return;
      set(i, v); setCell(b, v); markChips(); markPats(); if (grid === $('melGrid')) markTies(); save();
      if (v && !playing) { ensureAudio(); audition(); }
    }
    b.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button === 0) { e.preventDefault(); skipClick = b; paint = !get(i); apply(paint); b.focus(); }
    });
    b.addEventListener('pointerenter', function () { if (paint !== null) apply(paint); });
    b.addEventListener('click', function () { if (skipClick !== b) apply(!get(i)); });
    steps.appendChild(b); cells.push(b); cols[i].push(b);
  })(i);
  row.appendChild(name); row.appendChild(steps); grid.appendChild(row);
  stepRows.push({ box: steps, els: cells, name: name });
  return { row: row, name: name, cells: cells };
}
function ruler(grid) {
  var row = el('div', 'row ruler'), steps = el('div', 'steps'), spans = [];
  for (var i = 0; i < STEPS; i++) { var sp = el('span'); steps.appendChild(sp); spans.push(sp); }
  stepRows.push({ box: steps, els: spans }); rulers.push(spans);
  row.appendChild(el('span')); row.appendChild(steps); row.appendChild(el('span', 'spacer')); grid.appendChild(row);
}
ruler($('drumGrid'));
var levelInputs = {};
DRUMS.forEach(function (d) {
  if (d.extra) return; // played on the Drum machine page and in Compose
  var r = buildRow($('drumGrid'), d.name,
    function (i) { return P().drums[d.id][i]; },
    function (i, v) { P().drums[d.id][i] = v; P().beat = ''; },
    function () { hit(d.id, ctx.currentTime, d.head ? touchVel() : 1); },
    d.id === 'kick' ? 'split' : '');
  var lv = el('input'); lv.type = 'range'; lv.min = 0; lv.max = 100; lv.id = 'lv-' + d.id;
  lv.setAttribute('aria-label', d.name + ' level'); lv.title = d.name + ' level';
  lv.addEventListener('input', function () { state.levels[d.id] = +lv.value; save(); });
  r.row.appendChild(lv); levelInputs[d.id] = lv; drumRow[d.id] = r.cells;
});
ruler($('melGrid'));
for (var rr = ROWS - 1; rr >= 0; rr--) (function (r) {
  var row = buildRow($('melGrid'), '',
    function (i) { return P().notes[state.sel][r][i]; },
    function (i, v) { P().notes[state.sel][r][i] = v; },
    function () {
      if (state.sel === 'chords') playChord(r, ctx.currentTime, 0.5);
      else playNote(state.sel, degMidi(state.sel, r), ctx.currentTime, 0.3, false);
    });
  row.row.appendChild(el('span', 'spacer'));
  melCells[r] = row.cells; melNames[r] = row.name;
})(rr);
function markTies() {
  var grid = P().notes[state.sel], chords = state.sel === 'chords';
  for (var r = 0; r < ROWS; r++) melCells[r].forEach(function (b, i) { b.classList.toggle('tie', chords && i > 0 && grid[r][i] && grid[r][i - 1]); });
}

function applyMeter() {
  var n = P().steps, g = n === 12 ? 3 : 4;
  stepRows.forEach(function (r) {
    r.box.style.setProperty('--n', n);
    r.els.forEach(function (e, i) {
      e.hidden = i >= n;
      e.classList.toggle('alt', Math.floor(i / g) % 2 === 0 && e.classList.contains('cell'));
      e.classList.toggle('gs', i > 0 && i % g === 0);
      if (e.classList.contains('cell')) e.setAttribute('aria-label', (r.name.textContent || 'note') + ', step ' + (i + 1));
    });
  });
  rulers.forEach(function (sp) { sp.forEach(function (e, i) { e.textContent = i % g === 0 ? String(i / g + 1) : ''; }); });
  $('swing').disabled = n === 12;
}

// ---------- song bar ----------
var patBtns = LETTERS.map(function (L, i) {
  var b = el('button', 'chip pat', L); b.type = 'button'; b.setAttribute('aria-label', 'Edit pattern ' + L);
  b.addEventListener('click', function () { state.cur = i; render(); save(); });
  $('pats').appendChild(b);
  var o = el('option', '', 'Pattern ' + L); o.value = i; $('copyTo').appendChild(o);
  var add = el('button', 'chip', '+ ' + L); add.type = 'button'; add.setAttribute('aria-label', 'Add pattern ' + L + ' to the song');
  add.addEventListener('click', function () { if (state.chain.length < 32) { state.chain.push(i); renderChain(); save(); } });
  $('chainAdd').appendChild(add);
  return b;
});
(function () {
  var undo = el('button', 'chip', 'Remove last'); undo.type = 'button'; undo.id = 'chainUndo';
  undo.addEventListener('click', function () { state.chain.pop(); renderChain(); save(); });
  var clr = el('button', 'chip', 'Clear song'); clr.type = 'button'; clr.id = 'chainClear';
  clr.addEventListener('click', function () { state.chain = []; if (state.mode === 'song') state.mode = 'loop'; renderChain(); render(true); save(); });
  $('chainAdd').appendChild(undo); $('chainAdd').appendChild(clr);
})();
var chainSlots = [];
function renderChain() {
  var box = $('chain'); box.textContent = ''; chainSlots = [];
  if (!state.chain.length) box.appendChild(el('span', 'empty-note', 'Empty. Add patterns below in the order they should play.'));
  state.chain.forEach(function (pi, i) {
    var s = el('span', 'slot', LETTERS[pi]); s.title = (i + 1) + ': pattern ' + LETTERS[pi];
    box.appendChild(s); chainSlots.push(s);
  });
  $('chainUndo').disabled = $('chainClear').disabled = !state.chain.length;
  $('modeSong').disabled = !state.chain.length;
}
function markChain(pos) { chainSlots.forEach(function (s, i) { s.classList.toggle('now', i === pos); }); }
function markPats() {
  patBtns.forEach(function (b, i) { b.classList.toggle('sel', i === state.cur); b.classList.toggle('empty', patternEmpty(state.patterns[i])); });
}
$('copyTo').addEventListener('change', function () {
  var to = this.value; this.value = '';
  if (to === '' || +to === state.cur) return;
  state.patterns[+to] = JSON.parse(JSON.stringify(P()));
  markPats(); save();
});
$('modeLoop').addEventListener('click', function () { state.mode = 'loop'; render(true); save(); });
$('modeSong').addEventListener('click', function () { if (!state.chain.length) return; state.mode = 'song'; render(true); save(); if (playing) { stopStudio(); start(); } });

// ---------- tracks ----------
var trackEls = {};
TRACKS.forEach(function (t) {
  var box = el('div', 'track'), topRow = el('div', 'top-row'), pick = el('button', 'pick'), mute = el('button', 'mute', 'Mute');
  pick.type = 'button'; mute.type = 'button';
  pick.appendChild(el('b', '', t.name)); var snd = el('span'); pick.appendChild(snd);
  pick.addEventListener('click', function () { state.sel = t.id; render(); save(); });
  mute.addEventListener('click', function () { var s = state.tracks[t.id]; s.mute = !s.mute; render(true); applyMix(); save(); });
  var lv = el('input'); lv.type = 'range'; lv.min = 0; lv.max = 100; lv.id = 'tl-' + t.id; lv.setAttribute('aria-label', t.name + ' level');
  lv.addEventListener('input', function () { state.tracks[t.id].level = +lv.value; applyMix(); save(); });
  topRow.appendChild(pick); topRow.appendChild(mute); box.appendChild(topRow); box.appendChild(lv);
  $('tracks').appendChild(box);
  trackEls[t.id] = { box: box, snd: snd, mute: mute, lv: lv };
});

// ---------- chips ----------
function chipSet(holder, names, onPick) {
  names.forEach(function (n) {
    var b = el('button', 'chip', n); b.type = 'button'; b.dataset.name = n;
    b.addEventListener('click', function () { onPick(n); });
    holder.appendChild(b);
  });
}
chipSet($('beats'), Object.keys(BEATS), function (n) { loadBeat(n); render(); save(); });
chipSet($('sounds'), Object.keys(SOUNDS), function (n) { loadSound(n); render(); save(); });
function markChips() {
  Array.prototype.forEach.call($('fBeats').children, function (b) { b.classList.toggle('sel', b.dataset.name === P().beat); });
  Array.prototype.forEach.call($('beats').children, function (b) { b.classList.toggle('sel', b.dataset.name === P().beat); });
  Array.prototype.forEach.call($('sounds').children, function (b) { b.classList.toggle('sel', b.dataset.name === T().sound); });
}
NOTE_NAMES.forEach(function (n, i) { var o = el('option', '', n); o.value = i; $('root').appendChild(o); });
var qtChips = NOTE_NAMES.map(function (n, i) {
  var b = el('button', 'chip', n); b.type = 'button';
  b.addEventListener('click', function () { state.qt[i] = !state.qt[i]; render(true); save(); });
  $('qt').appendChild(b); return b;
});

// ---------- keyboard ----------
var ALL_WHITE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24];
var KEYMAP = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14, p: 15, ';': 16 };
var keyLabel = {}; Object.keys(KEYMAP).forEach(function (k) { keyLabel[KEYMAP[k]] = k.toUpperCase(); });
var pianoKeys = {}, pointers = {}, downOff = {};
var narrow = window.matchMedia('(max-width: 720px)');
function buildPiano() {
  var p = $('piano'), white = narrow.matches ? ALL_WHITE.slice(0, 8) : ALL_WHITE, top = white[white.length - 1];
  Object.keys(downOff).forEach(function (o) { keyUp(+o); });
  p.textContent = ''; pianoKeys = {};
  white.forEach(function (off) { var k = el('div', 'wk', keyLabel[off] || ''); k.dataset.off = off; p.appendChild(k); pianoKeys[off] = k; });
  var bw = 100 / white.length * 0.62;
  white.forEach(function (off, i) {
    var sem = off % 12;
    if (off === top || sem === 4 || sem === 11) return;
    var k = el('div', 'bk', keyLabel[off + 1] || ''); k.dataset.off = off + 1;
    k.style.width = bw + '%'; k.style.left = ((i + 1) * 100 / white.length - bw / 2) + '%';
    p.appendChild(k); pianoKeys[off + 1] = k;
  });
  markQt();
}
function markQt() { Object.keys(pianoKeys).forEach(function (o) { pianoKeys[o].classList.toggle('qt', state.qt[o % 12]); }); }
(function wirePiano() {
  var p = $('piano');
  function at(e) { var t = document.elementFromPoint(e.clientX, e.clientY); return t && t.dataset && t.dataset.off != null && p.contains(t) ? +t.dataset.off : null; }
  function move(e) {
    var prev = pointers[e.pointerId], cur = at(e);
    if (prev === cur) return;
    if (cur != null) keyDown(cur); // new key first, so sliding between keys glides
    if (prev != null) keyUp(prev);
    pointers[e.pointerId] = cur;
  }
  p.addEventListener('pointerdown', function (e) { e.preventDefault(); try { p.setPointerCapture(e.pointerId); } catch (x) {} pointers[e.pointerId] = null; move(e); });
  p.addEventListener('pointermove', function (e) { if (e.pointerId in pointers) move(e); });
  function end(e) { var prev = pointers[e.pointerId]; if (prev != null) keyUp(prev); delete pointers[e.pointerId]; }
  p.addEventListener('pointerup', end); p.addEventListener('pointercancel', end);
})();
function keyDown(off) {
  if (off in downOff) return;
  var m = 12 * (T().octave + 1) + off; if (state.qt[off % 12]) m -= 0.5;
  downOff[off] = m; noteOn(m);
  if (pianoKeys[off]) pianoKeys[off].classList.add('down');
}
function keyUp(off) {
  if (!(off in downOff)) return;
  noteOff(downOff[off]); delete downOff[off];
  if (pianoKeys[off]) pianoKeys[off].classList.remove('down');
}
function setOctave(o) { T().octave = Math.max(1, Math.min(6, o)); render(true); save(); }

// ---------- oud neck and flute holes ----------
var SURFACES = { auto: 'Matches the sound', piano: 'Piano keys', oud: 'Oud neck', pipe: 'Flute holes' };
function surfaceNow() {
  var g = PG(); if (g && g.surface) return g.surface;
  if (state.surface !== 'auto') return state.surface;
  var i = T().inst; return i === 'oud' ? 'oud' : i === 'gasba' || i === 'zorna' ? 'pipe' : 'piano';
}
Object.keys(SURFACES).forEach(function (k) {
  var b = el('button', 'chip', SURFACES[k]); b.type = 'button'; b.dataset.surf = k;
  b.addEventListener('click', function () { state.surface = k; render(true); save(); });
  $('surfaces').appendChild(b);
});
var DEGKEYS = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7, l: 8, ';': 9 }, degDownKeys = {};
function pcName(pc) { return NOTE_NAMES[Math.ceil(pc - 1e-9) % 12] + (pc % 1 ? ' ½♭' : ''); }
function degDown(k) {
  if (degDownKeys[k]) return;
  degDownKeys[k] = true;
  var d = DEGKEYS[k], m = degMidi(curTrack(), d);
  if (surfaceNow() === 'oud' && state.oudTrem) tremStart('k' + k, m); else svStart('k' + k, m);
  if (holes[d]) holes[d].classList.add('down');
}
function degUp(k) {
  if (!degDownKeys[k]) return;
  delete degDownKeys[k]; tremStop('k' + k); svStop('k' + k);
  var d = DEGKEYS[k]; if (holes[d]) holes[d].classList.remove('down');
}

// Oud: six courses, tuned C F A D G C from low to high (a common Arabic tuning), drawn high string on top.
var OUD_OPEN = [36, 41, 45, 50, 55, 60], NECK_SEMIS = 13, neck = $('neck'), neckPtr = {}, neckSig = '';
function oudBase() { return (T().octave - 3) * 12; }
function maqamOffsets(open) { // positions on one string (in semitones from the nut) that are notes of the maqam
  var out = [];
  SCALES[state.scale].forEach(function (d, i) {
    var pc = (state.root + d) % 12, s = ((pc - open) % 12 + 12) % 12;
    for (; s <= NECK_SEMIS; s += 12) out.push({ s: s, root: i === 0 });
  });
  return out.sort(function (a, b) { return a.s - b.s; });
}
function buildNeck() {
  var sig = [state.root, state.scale, T().octave].join();
  if (sig === neckSig) return; neckSig = sig;
  neck.textContent = '';
  OUD_OPEN.slice().reverse().forEach(function (open, row) {
    var c = el('div', 'course'); c.style.top = (row / 6 * 100) + '%'; c.style.height = (100 / 6) + '%';
    c.style.setProperty('--th', (1.5 + (5 - row) * 0.45) + 'px');
    c.appendChild(el('span', 'open', NOTE_NAMES[open % 12].replace('♯', '')));
    maqamOffsets(open).forEach(function (m) { var k = el('span', 'mk' + (m.root ? ' root' : '')); k.style.left = (m.s / NECK_SEMIS * 100) + '%'; c.appendChild(k); });
    neck.appendChild(c);
  });
}
function neckNote(e, row) {
  var r = neck.getBoundingClientRect(), b = parseFloat(getComputedStyle(neck).borderLeftWidth) || 0;
  var x = Math.max(0, Math.min(1, (e.clientX - r.left - b) / (r.width - b))), semis = x * NECK_SEMIS, open = OUD_OPEN[5 - row];
  if (state.oudSnap) {
    var best = null; maqamOffsets(open).forEach(function (m) { if (!best || Math.abs(m.s - semis) < Math.abs(best.s - semis)) best = m; });
    semis = best ? best.s : semis;
  }
  return { midi: open + semis + oudBase(), x: semis / NECK_SEMIS * 100, pc: (open + semis) % 12 };
}
var trem = {};
function tremStart(key, midi) {
  ensureAudio(); tremStop(key);
  var t = trem[key] = { midi: midi, n: 0 };
  var pluck = function () { svStart(key, t.midi); };
  pluck(); t.timer = setInterval(pluck, 95);
}
function tremStop(key) { if (trem[key]) { clearInterval(trem[key].timer); delete trem[key]; } }
neck.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  try { neck.setPointerCapture(e.pointerId); } catch (x) {}
  var r = neck.getBoundingClientRect(), row = Math.max(0, Math.min(5, Math.floor((e.clientY - r.top) / r.height * 6)));
  var n = neckNote(e, row), f = el('span', 'finger'); f.appendChild(el('span', '', pcName(n.pc)));
  f.style.left = 'calc(' + n.x + '% )'; f.style.top = ((row + 0.5) / 6 * 100) + '%';
  neck.appendChild(f);
  neckPtr[e.pointerId] = { row: row, f: f, midi: n.midi };
  if (state.oudTrem) tremStart('n' + e.pointerId, n.midi); else svStart('n' + e.pointerId, n.midi);
});
neck.addEventListener('pointermove', function (e) {
  var p = neckPtr[e.pointerId]; if (!p) return;
  var n = neckNote(e, p.row);
  if (n.midi === p.midi) return;
  p.midi = n.midi; p.f.style.left = n.x + '%'; p.f.firstChild.textContent = pcName(n.pc);
  if (trem['n' + e.pointerId]) trem['n' + e.pointerId].midi = n.midi;
  svSlide('n' + e.pointerId, n.midi, state.oudSnap ? 0.03 : 0.012); // the finger slides along the string
});
function neckEnd(e) { var p = neckPtr[e.pointerId]; if (!p) return; delete neckPtr[e.pointerId]; p.f.remove(); tremStop('n' + e.pointerId); svStop('n' + e.pointerId); }
neck.addEventListener('pointerup', neckEnd); neck.addEventListener('pointercancel', neckEnd);
$('oudSnap').addEventListener('click', function () { state.oudSnap = !state.oudSnap; render(true); save(); });
$('oudTrem').addEventListener('click', function () { state.oudTrem = !state.oudTrem; render(true); save(); });

// Flute (gasba, zorna): eight holes for the eight notes of the maqam, low to high. Slide between holes to glide.
var pipe = $('pipe'), holes = [], pipePtr = {};
for (var hi = 0; hi < 8; hi++) { var hole = el('span', 'hole', 'ASDFGHJK'[hi]); hole.style.gridColumn = String(hi + 2); pipe.appendChild(hole); holes.push(hole); }
function holeAt(e) {
  var best = -1, dist = 1e9;
  holes.forEach(function (h, i) { var r = h.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2)); if (d < dist) { dist = d; best = i; } });
  return best;
}
pipe.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  try { pipe.setPointerCapture(e.pointerId); } catch (x) {}
  var i = holeAt(e); pipePtr[e.pointerId] = i; holes[i].classList.add('down');
  svStart('p' + e.pointerId, degMidi(curTrack(), i));
});
pipe.addEventListener('pointermove', function (e) {
  if (!(e.pointerId in pipePtr)) return;
  var i = holeAt(e), prev = pipePtr[e.pointerId];
  if (i === prev) return;
  holes[prev].classList.remove('down'); holes[i].classList.add('down'); pipePtr[e.pointerId] = i;
  svSlide('p' + e.pointerId, degMidi(curTrack(), i), Math.max(0.05, glideS(T())));
});
function pipeEnd(e) { if (!(e.pointerId in pipePtr)) return; holes[pipePtr[e.pointerId]].classList.remove('down'); delete pipePtr[e.pointerId]; svStop('p' + e.pointerId); }
pipe.addEventListener('pointerup', pipeEnd); pipe.addEventListener('pointercancel', pipeEnd);
function renderPipeNames() {
  var box = $('pipeNames'), sc = SCALES[state.scale]; box.textContent = '';
  for (var i = 0; i < 8; i++) box.appendChild(el('span', '', pcName((state.root + sc[i % 7]) % 12 + 0)));
}
var SURF_HINT = {
  piano: 'Computer keys: <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> <kbd>F</kbd> … white keys, <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> black keys, <kbd>Z</kbd> / <kbd>X</kbd> octave. Hold <kbd>←</kbd> <kbd>→</kbd> to bend a semitone, <kbd>↓</kbd> <kbd>↑</kbd> a quarter tone. <kbd>Space</kbd> plays or stops.',
  oud: 'The oud has no frets, so you choose the pitch by where your finger lands. Touch a string to pluck it and slide along it to change the note. The dots mark the notes of the maqam (bigger dots are the key note). With <b>Snap to the maqam</b> on, every touch lands on one of them; turn it off to play freely between them. Keys <kbd>A</kbd> to <kbd>;</kbd> play the maqam notes.',
  pipe: 'Press a hole to blow that note; holes go from low (left) to high (right) and follow the maqam. Slide your finger to the next hole to glide into it, like a gasba player. Keys <kbd>A</kbd> to <kbd>K</kbd> play the holes; <kbd>Z</kbd> / <kbd>X</kbd> change octave.'
};
function renderSurface() {
  var s = surfaceNow();
  $('surfPiano').hidden = s !== 'piano'; $('surfOud').hidden = s !== 'oud'; $('surfPipe').hidden = s !== 'pipe';
  $('surfHint').innerHTML = SURF_HINT[s]; // our own text, defined above
  Array.prototype.forEach.call($('surfaces').children, function (b) { b.classList.toggle('sel', b.dataset.surf === state.surface); });
  $('oudSnap').classList.toggle('sel', state.oudSnap); $('oudSnap').setAttribute('aria-pressed', state.oudSnap);
  $('oudTrem').classList.toggle('sel', state.oudTrem); $('oudTrem').setAttribute('aria-pressed', state.oudTrem);
  if (s === 'oud') buildNeck();
  if (s === 'pipe') renderPipeNames();
}
narrow.addEventListener('change', buildPiano);

// bend strip and keys
var bendEl = $('bend');
bendEl.addEventListener('input', function () { ensureAudio(); setBend(+bendEl.value); });
function bendHome() { bendEl.value = 0; if (ctx) setBend(0); }
['pointerup', 'pointercancel', 'change', 'blur'].forEach(function (ev) { bendEl.addEventListener(ev, bendHome); });
var BEND_KEYS = { ArrowLeft: -100, ArrowRight: 100, ArrowDown: -50, ArrowUp: 50 }, bendKey = null;

var DRUM_KEYS = { '1': 'dum', '2': 'tak', '3': 'ka' };
DRUMS.forEach(function (d) { if (d.key && d.id !== 'roll') DRUM_KEYS[d.key.toLowerCase()] = d.id; });
function typing(e) { var t = e.target; return t && (t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && t.type !== 'range')); }
window.addEventListener('keydown', function (e) {
  if (state.page === 'compose' && (e.ctrlKey || e.metaKey) && !e.altKey && !typing(e)) {
    var kk = e.key.toLowerCase();
    if (kk === 'z' || kk === 'y') { e.preventDefault(); if (kk === 'y' || e.shiftKey) redo(); else undo(); return; }
  }
  if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return;
  if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) toggle(); return; }
  if (e.key in BEND_KEYS && !(e.target && e.target.tagName === 'INPUT')) {
    e.preventDefault(); if (!e.repeat) { ensureAudio(); bendKey = e.key; bendEl.value = BEND_KEYS[e.key]; setBend(BEND_KEYS[e.key]); } return;
  }
  if (e.repeat) return;
  var k = e.key.toLowerCase();
  if (k === 'z') setOctave(T().octave - 1);
  else if (k === 'x') setOctave(T().octave + 1);
  else if (k === 'r') holdStart('key', 'roll');
  else if (k in DRUM_KEYS) tap(DRUM_KEYS[k]);
  else if (surfaceNow() !== 'piano') { if (k in DEGKEYS) degDown(k); }
  else if (k in KEYMAP) keyDown(KEYMAP[k]);
});
window.addEventListener('keyup', function (e) {
  if (e.code === 'Space' && !typing(e)) { e.preventDefault(); return; }
  if (e.key === bendKey) { bendKey = null; bendHome(); return; }
  var k = e.key.toLowerCase();
  if (k === 'r') holdStop('key');
  if (k in DEGKEYS) degUp(k);
  if (k in KEYMAP) keyUp(KEYMAP[k]);
});
window.addEventListener('blur', function () { Object.keys(downOff).forEach(function (o) { keyUp(+o); }); holdsClear(); Object.keys(sv).forEach(svStop); Object.keys(degDownKeys).forEach(degUp); bendHome(); });

// ---------- controls ----------
function bind(id, get, set) {
  var i = $(id);
  i.addEventListener('input', function () { set(i.tagName === 'SELECT' && isNaN(+i.value) ? i.value : +i.value); render(true); applyMix(); save(); });
  return function () { i.value = get(); };
}
var syncers = [
  bind('bpm', function () { return state.bpm; }, function (v) { state.bpm = v; }),
  bind('swing', function () { return state.swing; }, function (v) { state.swing = v; }),
  bind('vol', function () { return state.vol; }, function (v) { state.vol = v; }),
  bind('touch', function () { return state.touch; }, function (v) { state.touch = v; }),
  bind('root', function () { return state.root; }, function (v) { state.root = v; autoQt(); renderLabels(); }),
  bind('scale', function () { return state.scale; }, function (v) { state.scale = v; autoQt(); renderLabels(); }),
  bind('meter', function () { return P().steps; }, function (v) { P().steps = v; P().beat = ''; applyMeter(); })
];
['cutoff', 'attack', 'release', 'delay', 'glide', 'vibrato'].forEach(function (k) {
  syncers.push(bind(k, function () { return T()[k]; }, function (v) { T()[k] = v; T().sound = ''; }));
});
$('play').addEventListener('click', toggle);
$('rec').addEventListener('click', function () { state.rec = !state.rec; render(true); if (state.rec && !playing) start(); });
$('orn').addEventListener('click', function () { T().orn = !T().orn; render(true); save(); });
$('octDown').addEventListener('click', function () { setOctave(T().octave - 1); });
$('octUp').addEventListener('click', function () { setOctave(T().octave + 1); });
$('clearDrums').addEventListener('click', function () { P().drums = blankDrums(); P().beat = ''; render(); save(); });
$('clearNotes').addEventListener('click', function () { P().notes[state.sel] = blankGrid(); render(); save(); });

function renderLabels() {
  var sc = SCALES[state.scale];
  for (var r = 0; r < ROWS; r++) {
    if (state.sel === 'chords') { melNames[r].textContent = chordName(r); continue; }
    var d = sc[r % sc.length];
    melNames[r].textContent = NOTE_NAMES[(state.root + Math.ceil(d)) % 12] + (d % 1 ? ' ½♭' : '') + (r >= sc.length ? ' ↑' : '');
  }
}
function render(light) {
  var L = LETTERS[state.cur], tdef = TRACKS.filter(function (t) { return t.id === state.sel; })[0];
  $('bpmOut').textContent = state.bpm; $('fBpmOut').textContent = state.bpm; $('swingOut').textContent = state.swing; $('octOut').textContent = T().octave;
  $('touchOut').textContent = state.touch < 40 ? 'Soft' : state.touch < 55 ? 'Medium' : 'Hard';
  $('guide').classList.toggle('sel', state.guide); $('guide').setAttribute('aria-pressed', state.guide);
  renderSurface();
  $('drumPatLbl').textContent = 'Pattern ' + L;
  $('notesSummary').textContent = tdef.name + ' notes in pattern ' + L;
  $('notesHint').textContent = tdef.name + ': ' + tdef.what;
  $('soundLbl').textContent = tdef.name + ' sound';
  $('shapeSummary').textContent = 'Shape the ' + (PG() && PG().kind === 'mel' ? PG().name.replace('Raï ', '') : tdef.name).toLowerCase() + ' sound';
  renderLabels();
  qtChips.forEach(function (b, i) { b.classList.toggle('sel', state.qt[i]); b.setAttribute('aria-pressed', state.qt[i]); });
  markQt();
  $('orn').classList.toggle('sel', T().orn); $('orn').setAttribute('aria-pressed', T().orn);
  $('rec').classList.toggle('sel', state.rec); $('rec').setAttribute('aria-pressed', state.rec);
  $('rec').textContent = state.rec ? '● Recording taps' : '● Record my taps';
  $('modeLoop').classList.toggle('sel', state.mode === 'loop'); $('modeSong').classList.toggle('sel', state.mode === 'song');
  TRACKS.forEach(function (t) {
    var s = state.tracks[t.id], e = trackEls[t.id];
    e.box.classList.toggle('sel', t.id === state.sel); e.box.classList.toggle('muted', s.mute);
    e.snd.textContent = s.sound || 'Custom sound';
    e.mute.classList.toggle('on', s.mute); e.mute.setAttribute('aria-pressed', s.mute);
    e.lv.value = s.level;
  });
  markChips(); markPats(); loadSounds();
  if (light) return;
  applyMeter();
  syncers.forEach(function (f) { f(); });
  DRUMS.forEach(function (d) {
    if (!drumRow[d.id]) return;
    levelInputs[d.id].value = state.levels[d.id];
    drumRow[d.id].forEach(function (b, i) { setCell(b, P().drums[d.id][i]); });
  });
  var grid = P().notes[state.sel];
  for (var r = 0; r < ROWS; r++) melCells[r].forEach(function (b, i) { setCell(b, grid[r][i]); });
  markTies();
  applyMix();
}
