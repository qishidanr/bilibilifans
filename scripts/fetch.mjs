// 从 B 站公开接口抓取 UP 主粉丝数，写入 data/followers.json
// 监控的 uid 从项目根目录 config.json 读取；也可本地手动运行：node scripts/fetch.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, '..', 'data', 'followers.json');
const CONFIG_FILE = path.join(__dirname, '..', 'config.json');
const DEFAULT_UID = 9434166;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadUid() {
  try {
    const cfg = JSON.parse(await readFile(CONFIG_FILE, 'utf8'));
    const uid = Number(cfg.uid);
    if (Number.isInteger(uid) && uid > 0) return uid;
  } catch {}
  return DEFAULT_UID;
}

// 抓取用户卡片信息，失败自动重试 3 次（应对偶发的 -412 风控 / 网络抖动）
async function fetchCard(uid) {
  const url = `https://api.bilibili.com/x/web-interface/card?mid=${uid}`;
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://www.bilibili.com/',
          Accept: 'application/json',
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.code === 0 && json.data?.card) return json.data.card;
      lastErr = new Error(`code=${json.code} message=${json.message}`);
    } catch (e) {
      lastErr = e;
    }
    await sleep(1500 * (i + 1));
  }
  throw lastErr || new Error('fetch failed');
}

function loadData() {
  return readFile(DATA_FILE, 'utf8')
    .then((s) => JSON.parse(s))
    .catch(() => ({ uid: 0, name: '', follower: 0, history: [] }));
}

async function main() {
  const uid = await loadUid();
  const card = await fetchCard(uid);
  const follower = Number(card.fans ?? card.follower ?? 0);

  const data = await loadData();
  const now = new Date();
  const last = data.history[data.history.length - 1];

  // 10 分钟内重复运行时只更新最后一个点，避免手动重跑产生重复记录
  if (last && now.getTime() - new Date(last.t).getTime() < 10 * 60 * 1000) {
    last.follower = follower;
  } else {
    data.history.push({ t: now.toISOString(), follower });
    if (data.history.length > 2000) data.history = data.history.slice(-2000);
  }

  data.uid = uid;
  data.name = card.name || data.name || `UID ${uid}`;
  data.follower = follower;
  data.updatedAt = now.toISOString();

  await writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`[ok] ${data.name} 粉丝数 ${follower} (uid=${uid}, ${now.toISOString()})`);
}

main().catch((e) => {
  console.error('[error]', e?.message || e);
  process.exit(1);
});
