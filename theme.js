(function () {
const P = {
  cherry:   { bg:'#1c1020', surface:'#24142a', 'surface-hover':'#301a38', 'surface-active':'#3b2145', border:'#3a2243', 'border-light':'#4a2c55', text:'#fbe9f3', 'text-muted':'#b58aa8', 'text-dim':'#8a5f7e', accent:'#f08cbc' },
  midnight: { bg:'#0a0a0a', surface:'#0f0f0f', 'surface-hover':'#1a1a1a', 'surface-active':'#252525', border:'#1f1f1f', 'border-light':'#2a2a2a', text:'#e4e4e7', 'text-muted':'#71717a', 'text-dim':'#52525b', accent:'#ffffff' },
  ocean:    { bg:'#0b1622', surface:'#102030', 'surface-hover':'#17304a', 'surface-active':'#1d3d5e', border:'#1c3550', 'border-light':'#28476a', text:'#e6f1fb', 'text-muted':'#7fa3c4', 'text-dim':'#587a9a', accent:'#5ab4ff' },
  forest:   { bg:'#0c1710', surface:'#11211a', 'surface-hover':'#182f24', 'surface-active':'#1f3d2e', border:'#1d3a2b', 'border-light':'#2a4d3a', text:'#e8f5ec', 'text-muted':'#84b095', 'text-dim':'#5e8870', accent:'#6fdc8c' },
  lavender: { bg:'#141023', surface:'#1b1530', 'surface-hover':'#261d44', 'surface-active':'#302558', border:'#2d2350', 'border-light':'#3d3068', text:'#efe9fb', 'text-muted':'#a698cf', 'text-dim':'#7a6ca6', accent:'#b794f6' }
};
const ls = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch {} };
const idb = (m, ...a) => new Promise((ok, no) => { const r = indexedDB.open('lastra', 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onerror = no;
  r.onsuccess = () => { const q = r.result.transaction('k', m === 'get' ? 'readonly' : 'readwrite').objectStore('k')[m](...a); q.onsuccess = () => ok(q.result); q.onerror = no; }; });
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('lastra-theme') : null;
const tell = () => bc && bc.postMessage(1);
let box = null;

function apply() {
  const t = { ...(P[ls('theme')] || P.cherry) }, acc = ls('accent');
  if (acc) t.accent = acc;
  const n = parseInt(t.accent.slice(1), 16), rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  t['accent-dim'] = `rgba(${rgb},.85)`; t['accent-glow'] = `rgba(${rgb},.16)`;
  const st = document.documentElement.style;
  for (const k in t) st.setProperty('--' + k, t[k]);
  st.setProperty('--wp-dim', ls('wpDim') ?? '.25');
}

async function source() {
  const mode = ls('bwMode') || 'home';
  if (mode === 'none') return null;
  if (mode === 'file') { const f = await idb('get', 'bwp').catch(() => 0); if (f) return { src: URL.createObjectURL(f), video: f.type.startsWith('video') }; }
  if (mode === 'link') { const u = ls('bwLink'); if (u) return { src: u, video: /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u) }; }
  try { const s = JSON.parse(ls('lw') || 'null'); if (s) return { src: s[0], video: s[1] }; } catch {}
  const f = await idb('get', 'wp').catch(() => 0);
  if (f) return { src: URL.createObjectURL(f), video: f.type.startsWith('video') };
  try { const r = await fetch('wallpaper.mp4'); if (!r.ok) return null; return { src: URL.createObjectURL(new Blob([await r.blob()], { type: 'video/mp4' })), video: true }; } catch { return null; }
}

async function mount(el) {
  if (el) box = el;
  if (!box) return;
  box.replaceChildren();
  const s = await source();
  if (!s) return;
  const e = document.createElement(s.video ? 'video' : 'img');
  if (s.video) Object.assign(e, { muted: true, loop: true, autoplay: true, playsInline: true });
  e.src = s.src; box.append(e);
  if (s.video) e.play().catch(() => {});
}

function initSettings() {
  const $ = id => document.getElementById(id);
  const cur = ls('theme') || 'cherry', sw = $('theme-swatches');
  sw.innerHTML = '';
  for (const k in P) {
    const b = document.createElement('button');
    b.className = 'theme-swatch' + (cur === k ? ' active' : ''); b.title = k;
    b.style.background = `linear-gradient(135deg, ${P[k].bg} 50%, ${P[k].accent} 50%)`;
    b.onclick = () => { ls('theme', k); ls('accent', ''); apply(); tell(); initSettings(); };
    sw.append(b);
  }
  $('accent-input').value = ls('accent') || (P[cur] || P.cherry).accent;
  $('accent-input').oninput = e => { ls('accent', e.target.value); apply(); tell(); };
  $('reset-theme').onclick = () => { ls('theme', 'cherry'); ls('accent', ''); ls('wpDim', '.25'); apply(); tell(); initSettings(); };
  const mode = $('bw-mode');
  mode.value = ls('bwMode') || 'home';
  const sync = () => { $('bw-file-row').style.display = mode.value === 'file' ? 'flex' : 'none'; $('bw-link-row').style.display = mode.value === 'link' ? 'flex' : 'none'; };
  sync();
  mode.onchange = () => { ls('bwMode', mode.value); sync(); tell(); };
  $('bw-file-btn').onclick = () => $('bw-file').click();
  $('bw-file').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { await idb('put', f, 'bwp'); } catch {} ls('bwMode', 'file'); tell(); };
  $('bw-link').value = ls('bwLink') || '';
  $('bw-link-save').onclick = () => { const v = $('bw-link').value.trim(); if (/^https?:\/\//.test(v)) { ls('bwLink', v); ls('bwMode', 'link'); tell(); } };
  $('bw-dim').value = Math.round(parseFloat(ls('wpDim') ?? .25) * 100);
  $('bw-dim').oninput = e => { ls('wpDim', e.target.value / 100); apply(); tell(); };
}

if (bc) bc.onmessage = () => { apply(); mount(); };
apply();
window.LastraTheme = { apply, mount, initSettings };
})();
