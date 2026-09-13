const $ = (id) => document.getElementById(id);

let CONFIG = {};

function format(n) {
  return Number(n || 0).toLocaleString('zh-CN');
}

function text(key, fallback) {
  return (CONFIG.texts && CONFIG.texts[key]) || fallback;
}

function applyConfig(cfg) {
  CONFIG = cfg || {};
  if (CONFIG.font) {
    document.documentElement.style.setProperty('--font', CONFIG.font);
  } else {
    document.documentElement.style.removeProperty('--font');
  }
  if (CONFIG.numberFont) {
    document.documentElement.style.setProperty('--number-font', CONFIG.numberFont);
  } else {
    document.documentElement.style.removeProperty('--number-font');
  }
  if (CONFIG.showSideGradient === false) {
    document.documentElement.style.setProperty('--side-bg', '#0d0204');
  } else {
    document.documentElement.style.removeProperty('--side-bg');
  }
  document.title = text('documentTitle', '喜报 · 粉丝见证');
}

function render(data) {
  const offset = Number(CONFIG.offset || 0);
  const real = Number(data.follower || 0);
  const shown = Math.max(0, real + offset);

  $('upName').textContent = data.name || `UID ${data.uid || ''}`;
  $('follower').textContent = format(shown);

  const history = Array.isArray(data.history) ? data.history : [];
  const delta = $('delta');
  delta.hidden = true;
  if (history.length >= 2) {
    const prev = Number(history[history.length - 2].follower || 0);
    const diff = real - prev;
    if (diff !== 0) {
      const tpl = diff > 0 ? text('deltaUp', '较上次 +{n}') : text('deltaDown', '较上次 -{n}');
      delta.textContent = tpl.replace('{n}', format(Math.abs(diff)));
      delta.hidden = false;
    }
  }
}

let loading = false;
async function loadData() {
  if (loading) return;
  loading = true;
  try {
    const res = await fetch('data/followers.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (e) {
    $('upName').textContent = 'UP主';
    $('follower').textContent = '—';
  } finally {
    loading = false;
  }
}

async function loadConfig() {
  try {
    const res = await fetch('config.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    applyConfig(await res.json());
  } catch (e) {
    applyConfig({});
  }
}

async function boot() {
  await loadConfig();
  $('upName').textContent = text('loading', '加载中…');
  $('label').textContent = text('label', '哔哩哔哩粉丝数');
  $('unit').textContent = text('unit', '位');
  await loadData();
  const secs = Math.max(1, Number(CONFIG.refreshSeconds || 60));
  setInterval(loadData, secs * 1000);
}

boot();
