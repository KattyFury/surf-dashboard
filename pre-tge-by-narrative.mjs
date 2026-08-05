// Liệt kê các dự án Pre-TGE (chưa ra token), nhóm theo narrative và xếp theo số vốn raise.
// Nguồn: SURF API — `/search/airdrop` (danh sách ứng viên + total_raise dạng SỐ, sort được)
// rồi `/project/detail` từng dự án để lấy `tags` (narrative) + `tge_status` (pre/upcoming/post)
// + `funding.rounds` (round gần nhất, valuation, lead investor).
// Chạy: node pre-tge-by-narrative.mjs   → ghi ra Desktop (md + csv).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = readFileSync(join(__dirname, '.env.txt'), 'utf8').trim();
const BASE = 'https://api.asksurf.ai/gateway/v1';
const DESKTOP = join(homedir(), 'Desktop');

const CANDIDATE_POOL = 700; // pool airdrop tối đa (~700 là hết dữ liệu) trước khi lọc pre-TGE
const CONCURRENCY = 2;      // API trả 429 rất nhanh nếu bắn song song nhiều hơn
const GAP_MS = 250;         // khoảng cách tối thiểu giữa 2 request
const CACHE_PATH = join(__dirname, '.detail-cache.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

let lastCall = 0;
async function surfGet(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    const wait = lastCall + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (res.status === 429 && attempt < 6) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      await sleep(retryAfter || 1000 * 2 ** attempt);
      continue;
    }
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  }
}

// Cache theo project_id để chạy lại không phải gọi lại toàn bộ (và không đụng rate limit).
let cache = {};
try { cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8')); } catch {}
const saveCache = () => writeFileSync(CACHE_PATH, JSON.stringify(cache), 'utf8');

// Kéo danh sách ứng viên: airdrop đang ở phase active (POTENTIAL/CONFIRMED = chưa TGE)
// + claimable, sắp xếp sẵn theo total_raise giảm dần.
async function fetchCandidates() {
  const out = [];
  for (let offset = 0; offset < CANDIDATE_POOL; offset += 100) {
    const json = await surfGet('/search/airdrop', {
      phase: 'active,claimable',
      sort_by: 'total_raise',
      order: 'desc',
      limit: 100,
      offset,
    });
    const items = json.data || [];
    out.push(...items);
    if (!json.meta?.has_more) break;
  }
  const seen = new Set();
  // Bỏ luôn dự án không có số raise — báo cáo xếp theo vốn raise nên chúng vô dụng,
  // và bỏ ở đây tiết kiệm được vài trăm request /project/detail.
  return out.filter(it =>
    it.project_id && it.total_raise > 0 && !seen.has(it.project_id) && seen.add(it.project_id)
  );
}

async function fetchDetail(candidate) {
  if (cache[candidate.project_id]) return cache[candidate.project_id];
  try {
    const json = await surfGet('/project/detail', {
      id: candidate.project_id,
      fields: 'overview,funding,tge_status',
    });
    const d = json.data || {};
    const ov = d.overview || {};
    const fund = d.funding || {};
    const rounds = (fund.rounds || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const latest = rounds[0] || {};
    const valuation = rounds.find(r => r.valuation)?.valuation ?? null;
    const investors = [...new Set(rounds.flatMap(r => (r.investors || []).map(i => i.name)))];
    const out = {
      name: ov.name || candidate.project_name,
      symbol: ov.token_symbol || candidate.coin_symbol || '',
      tge_status: ov.tge_status ?? d.tge_status ?? null,
      tags: ov.tags || [],
      chains: ov.chains || [],
      total_raise: fund.total_raise ?? candidate.total_raise ?? 0,
      rounds_count: rounds.length,
      latest_round: latest.round_name || '',
      latest_round_date: latest.date || '',
      valuation,
      investors: investors.slice(0, 6),
      x_followers: ov.x_followers ?? 0,
      airdrop_status: candidate.status,
      website: ov.website || '',
      description: (ov.description || '').replace(/\s+/g, ' ').trim(),
    };
    cache[candidate.project_id] = out;
    return out;
  } catch (err) {
    console.warn(`  ! ${candidate.project_name}: ${err.message}`);
    return null;
  }
}

async function mapPool(items, fn, concurrency) {
  const results = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx]);
        if ((idx + 1) % 25 === 0) { console.log(`  ...${idx + 1}/${items.length}`); saveCache(); }
      }
    })
  );
  return results;
}

// Mô tả 1 dòng: lấy câu đầu tiên, cắt ngắn, bỏ ký tự phá bảng markdown.
const oneLine = (text, max = 130) => {
  if (!text) return '—';
  let s = text.split(/(?<=\.)\s+/)[0].trim();
  if (s.length > max) s = s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
  return s.replace(/\|/g, '/');
};

const usd = n => {
  if (!n) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
};

function buildMarkdown(byNarrative, projects, skipped) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const totalRaise = projects.reduce((s, p) => s + (p.total_raise || 0), 0);
  const L = [];
  L.push('# Dự án Pre-TGE — xếp theo narrative & số vốn raise');
  L.push('');
  L.push(`Nguồn: SURF API (\`/search/airdrop\` + \`/project/detail\`) — lấy lúc ${now} UTC.`);
  L.push(`Tiêu chí: dự án có \`tge_status\` = \`pre\` hoặc \`upcoming\` (chưa ra token), có số vốn raise xác định.`);
  L.push(`Tổng: **${projects.length} dự án** / **${byNarrative.length} narrative** / tổng vốn raise **${usd(totalRaise)}**.`);
  L.push('');
  L.push('## Tổng quan theo narrative');
  L.push('');
  L.push('| # | Narrative | Số dự án | Tổng raise | Dự án lớn nhất |');
  L.push('|---|---|---|---|---|');
  byNarrative.forEach(([tag, list], i) => {
    const sum = list.reduce((s, p) => s + p.total_raise, 0);
    L.push(`| ${i + 1} | ${tag} | ${list.length} | ${usd(sum)} | ${list[0].name} (${usd(list[0].total_raise)}) |`);
  });
  L.push('');
  L.push('## Chi tiết từng narrative');
  for (const [tag, list] of byNarrative) {
    const sum = list.reduce((s, p) => s + p.total_raise, 0);
    L.push('');
    L.push(`### ${tag} — ${list.length} dự án, tổng ${usd(sum)}`);
    L.push('');
    L.push('| Dự án | Mô tả | Raise | Valuation | Round gần nhất | Nhà đầu tư tiêu biểu |');
    L.push('|---|---|---|---|---|---|');
    for (const p of list) {
      const round = p.latest_round ? `${p.latest_round} (${p.latest_round_date || '?'})` : '—';
      const inv = p.investors.length ? p.investors.slice(0, 3).join(', ') : '—';
      L.push(`| **${p.name}**${p.symbol ? ` (${p.symbol})` : ''} | ${oneLine(p.description)} | ${usd(p.total_raise)} | ${usd(p.valuation)} | ${round} | ${inv} |`);
    }
  }
  L.push('');
  L.push('## Top 25 toàn bảng (bỏ qua narrative)');
  L.push('');
  L.push('| # | Dự án | Mô tả | Narrative | Raise | Valuation |');
  L.push('|---|---|---|---|---|---|');
  projects.slice(0, 25).forEach((p, i) => {
    L.push(`| ${i + 1} | ${p.name} | ${oneLine(p.description)} | ${p.tags.join(', ') || '—'} | ${usd(p.total_raise)} | ${usd(p.valuation)} |`);
  });
  L.push('');
  L.push('---');
  L.push('');
  L.push(`_Ghi chú: đã loại ${skipped.postTge} dự án đã TGE (\`post\`), ${skipped.noRaise} dự án không có số raise, ${skipped.failed} dự án lỗi khi gọi detail._`);
  return L.join('\n');
}

function buildCsv(projects) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['narrative', 'project', 'description', 'symbol', 'tge_status', 'total_raise_usd', 'valuation_usd', 'latest_round', 'latest_round_date', 'rounds', 'investors', 'chains', 'x_followers', 'airdrop_status', 'website']];
  for (const p of projects) {
    rows.push([
      p.tags[0] || 'Uncategorized', p.name, oneLine(p.description, 200), p.symbol, p.tge_status, p.total_raise, p.valuation ?? '',
      p.latest_round, p.latest_round_date, p.rounds_count, p.investors.join('; '),
      p.chains.join('; '), p.x_followers, p.airdrop_status, p.website,
    ]);
  }
  return '﻿' + rows.map(r => r.map(esc).join(',')).join('\n');
}

async function main() {
  console.log('1/3 Kéo danh sách ứng viên airdrop (sort theo total_raise)...');
  const candidates = await fetchCandidates();
  console.log(`  → ${candidates.length} dự án ứng viên`);

  console.log('2/3 Gọi /project/detail từng dự án để lấy narrative + tge_status...');
  const details = await mapPool(candidates, fetchDetail, CONCURRENCY);
  saveCache();

  const skipped = { failed: 0, postTge: 0, noRaise: 0 };
  const projects = [];
  for (const d of details) {
    if (!d) { skipped.failed++; continue; }
    if (d.tge_status !== 'pre' && d.tge_status !== 'upcoming') { skipped.postTge++; continue; }
    if (!d.total_raise) { skipped.noRaise++; continue; }
    projects.push(d);
  }
  projects.sort((a, b) => b.total_raise - a.total_raise);

  // Nhóm theo narrative: 1 dự án có nhiều tag thì xuất hiện ở mọi narrative của nó.
  const groups = new Map();
  for (const p of projects) {
    for (const tag of (p.tags.length ? p.tags : ['Uncategorized'])) {
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag).push(p);
    }
  }
  const byNarrative = [...groups.entries()]
    .map(([tag, list]) => [tag, list.sort((a, b) => b.total_raise - a.total_raise)])
    .sort((a, b) => {
      const sa = a[1].reduce((s, p) => s + p.total_raise, 0);
      const sb = b[1].reduce((s, p) => s + p.total_raise, 0);
      return sb - sa;
    });

  console.log('3/3 Ghi file ra Desktop...');
  const mdPath = join(DESKTOP, 'pre-tge-projects.md');
  const csvPath = join(DESKTOP, 'pre-tge-projects.csv');
  writeFileSync(mdPath, buildMarkdown(byNarrative, projects, skipped), 'utf8');
  writeFileSync(csvPath, buildCsv(projects), 'utf8');

  console.log(`\nXong: ${projects.length} dự án Pre-TGE / ${byNarrative.length} narrative`);
  console.log(`  ${mdPath}`);
  console.log(`  ${csvPath}`);
  console.log(`  Đã loại: post-TGE ${skipped.postTge}, không có raise ${skipped.noRaise}, lỗi ${skipped.failed}`);
  console.log('\nTop 10 narrative theo tổng vốn raise:');
  byNarrative.slice(0, 10).forEach(([tag, list], i) => {
    const sum = list.reduce((s, p) => s + p.total_raise, 0);
    console.log(`  ${i + 1}. ${tag} — ${list.length} dự án, ${usd(sum)} (top: ${list[0].name} ${usd(list[0].total_raise)})`);
  });
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
