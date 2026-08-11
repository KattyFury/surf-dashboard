// Ví dụ: fetch Token of the Week / VC watchlist / Fundraising headlines từ SURF API,
// ghi ra surf-content.json cùng thư mục. Chạy thủ công: `node fetch-content.mjs`
// (không cron/VPS — refresh khi nào cần, ví dụ vài lần/tuần).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN = readFileSync(join(__dirname, '.env.txt'), 'utf8').trim();
const BASE = 'https://api.asksurf.ai/gateway/v1';
const OUT_PATH = join(__dirname, 'surf-content.json');

const FUND_WATCHLIST = ['a16z', 'Coinbase Ventures', 'Paradigm', 'Multicoin Capital', 'Framework Ventures'];

async function surfGet(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json = await res.json();
  return json.body?.data ?? json.data ?? json;
}

async function fetchTokensOfWeek() {
  const data = await surfGet('/heatscore/token-of-week', { limit: 5 });
  const items = Array.isArray(data) ? data : data.items || [];
  return items.map(t => ({
    symbol: t.symbol,
    name: t.name,
    heat_score: t.heat_score,
    change_7d: t.price_change_percent?.['7d'] ?? null,
  }));
}

async function resolveFundId(name) {
  const data = await surfGet('/search/fund', { q: name, limit: 1 });
  const items = Array.isArray(data) ? data : data.items || [];
  const top = items[0];
  if (!top) return null;
  console.log(`  "${name}" -> resolved: "${top.name}" (id ${top.id})`);
  return { id: top.id, name: top.name };
}

async function fetchVcRecent() {
  const out = [];
  for (const fundName of FUND_WATCHLIST) {
    const fund = await resolveFundId(fundName);
    if (!fund) { console.warn(`  ! Không resolve được quỹ: ${fundName}`); continue; }
    const data = await surfGet('/fund/portfolio', {
      id: fund.id, sort_by: 'invested_at', order: 'desc', limit: 3,
    });
    const items = Array.isArray(data) ? data : data.items || [];
    for (const it of items) {
      out.push({
        fund: fund.name,
        project: it.project_name,
        recent_raise: it.recent_raise ?? null,
        invested_at: it.invested_at,
        is_lead: !!it.is_lead,
      });
    }
  }
  out.sort((a, b) => (b.invested_at || 0) - (a.invested_at || 0));
  return out.slice(0, 6);
}

async function fetchFundraisingHeadlines() {
  const data = await surfGet('/search/fundraising', { min_importance: 4, sort_by: 'importance', limit: 6 });
  const items = Array.isArray(data) ? data : data.items || [];
  return items.map(it => ({
    title: it.title,
    summary: it.summary,
    importance: it.importance,
    event_at: it.event_at,
    url: it.source?.url ?? null,
  }));
}

async function main() {
  console.log('Fetching Token of the Week...');
  const tokens_of_week = await fetchTokensOfWeek();

  console.log('Resolving + fetching VC watchlist...');
  const vc_recent = await fetchVcRecent();

  console.log('Fetching Fundraising headlines...');
  const fundraising_headlines = await fetchFundraisingHeadlines();

  const out = {
    generated_at: new Date().toISOString(),
    tokens_of_week,
    vc_recent,
    fundraising_headlines,
  };

  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`\nGhi xong: ${OUT_PATH}`);
  console.log(`  tokens_of_week: ${tokens_of_week.length}, vc_recent: ${vc_recent.length}, fundraising_headlines: ${fundraising_headlines.length}`);
}

main().catch(err => {
  console.error('Lỗi:', err.message);
  process.exit(1);
});
