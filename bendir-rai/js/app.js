// Bendir & Raï — Starts the app: instrument pages and routing (#compose, #oud ...), then the playhead and the scope drawing.
// Part of one app split over several files: they share one scope and load in order (see index.html).
'use strict';

// ---------- instrument pages (#darbuka, #oud ...) ----------
(function () {
  var a = el('a', 'chip', 'Studio'); a.href = '#'; a.dataset.page = ''; $('instNav').appendChild(a);
  Object.keys(PAGES).forEach(function (k) { var c = el('a', 'chip', PAGES[k].name); c.href = '#' + k; c.dataset.page = k; $('instNav').appendChild(c); });
})();
chipSet($('fBeats'), Object.keys(BEATS), function (n) { loadBeat(n); render(); save(); });
$('fPlay').addEventListener('click', toggle);
syncers.push(bind('fBpm', function () { return state.bpm; }, function (v) { state.bpm = v; }));
var pageTitle = document.title, lastPage = null;
function applyPage() {
  var g = PG();
  if (playing) stopStudio();
  if (cPlaying) cStop();
  if (gbPlaying) gbStop();
  Object.keys(sv).forEach(svStop); Object.keys(held).forEach(function (m) { noteOff(+m); }); holdsClear();
  document.body.classList.toggle('page', !!g);
  document.body.classList.toggle('page-perc', !!g && g.kind === 'perc');
  document.body.classList.toggle('page-mel', !!g && g.kind === 'mel');
  document.body.classList.toggle('page-sounds', !!g && !!g.sounds);
  $('focus').hidden = !g || g.kind === 'compose' || g.kind === 'groove';
  $('groove').hidden = !(g && g.kind === 'groove');
  document.body.classList.toggle('page-groove', !!g && g.kind === 'groove');
  $('composer').hidden = !(g && g.kind === 'compose');
  document.body.classList.toggle('page-compose', !!g && g.kind === 'compose');
  if (cRec) cRecSet(false);
  cPlayArea();
  Array.prototype.forEach.call($('instNav').children, function (c) { var on = c.dataset.page === state.page; c.classList.toggle('sel', on); if (on) c.setAttribute('aria-current', 'page'); else c.removeAttribute('aria-current'); });
  if (g) {
    $('fName').textContent = g.name;
    $('fAbout').innerHTML = g.about; // our own text, defined above
    if (g.kind === 'groove') gbRender();
    else if (g.kind === 'compose') { cRender(); $('cClick').classList.toggle('sel', !!state.cClick); $('cClick').setAttribute('aria-pressed', !!state.cClick); }
    else if (g.kind === 'perc') { state.perc = g.sim; renderSim(); }
    else {
      var solo = state.tracks.solo;
      if (g.sound && solo.sound !== g.sound) state.tracks.solo = trackFromSound(g.sound, 75);
      if (g.sounds && ['oud', 'gasba', 'zorna'].indexOf(solo.inst) >= 0) state.tracks.solo = trackFromSound('Raï lead', 75);
    }
    if (g.beat && state.page !== lastPage) loadBeat(g.beat); // each instrument starts with a rhythm that suits it
    document.title = g.name + ' · ' + pageTitle;
  } else { document.title = pageTitle; renderSim(); }
  lastPage = state.page;
  render(); applyMix();
}
function route() {
  var h = location.hash.replace('#', '');
  if (/^song=/.test(h)) { openShared(h.slice(5)); return; }
  if (/^beat=/.test(h)) { openBeat(h.slice(5)); return; }
  state.page = PAGES[h] ? h : ''; applyPage(); if (state.page) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

buildPiano();
renderChain();
if (!SIMS[state.perc]) state.perc = 'darbuka';
renderSim();
route();
setTimeout(audioTidy, 4000);

// ---------- playhead, pad flashes, scope ----------
var scope = $('scope'), g2 = scope.getContext('2d'), wave = new Uint8Array(1024), tick = 0, stroke = '#888';
function frame() {
  requestAnimationFrame(frame);
  if (playing) {
    var cur = null;
    while (queue.length && queue[0].time <= ctx.currentTime) {
      var q = queue.shift(); cur = q; q.ids.forEach(flash);
      if (state.guide) { var qp = patAt(q.pat), nx = (q.step + 1) % qp.steps; setCues(DRUMS.filter(function (d) { return qp.drums[d.id][nx]; }).map(function (d) { return d.id; })); }
      if (state.mode === 'song' && !state.page) {
        markChain(q.pos);
        if (q.pat !== state.cur) { state.cur = q.pat; render(); } // follow the song
      }
    }
    if (cur) showStep(cur.pat === (state.page ? -1 : state.cur) ? cur.step : -1);
  }
  if (cPlaying) cFrame();
  if (gbPlaying) gbFrame();
  if (!scope.offsetParent) return;
  if (tick++ % 60 === 0) stroke = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || stroke;
  analyser.getByteTimeDomainData(wave);
  var w = scope.width, h = scope.height;
  g2.clearRect(0, 0, w, h); g2.beginPath(); g2.lineWidth = 2; g2.strokeStyle = stroke;
  for (var x = 0; x < w; x += 2) { var y = h / 2 + (wave[Math.floor(x / w * 512)] - 128) / 128 * h * 0.9; x ? g2.lineTo(x, y) : g2.moveTo(x, y); }
  g2.stroke();
}
