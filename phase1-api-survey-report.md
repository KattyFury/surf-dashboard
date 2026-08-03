# Surf Content Dashboard — Báo cáo Giai đoạn 1 (Khảo sát API)

## Đính chính: CLI `surf` có thật — đã tìm và cài xong

Lần khảo sát đầu mình kết luận sai là không có CLI `surf`. Sau khi bạn đưa docs `https://agents.asksurf.ai/docs`, mình tìm ra trang `/docs/cli/cli` — CLI `surf` **có thật**, cài bằng:
```
curl -fsSL https://downloads.asksurf.ai/cli/releases/install.sh | sh
```
(mã nguồn mở tại `github.com/asksurf-ai/surf-cli`, viết bằng Go). Đã cài phiên bản `1.0.9`, set key qua `SURF_API_KEY`, chạy đúng quy trình spec:
- `surf sync` → "API spec synced."
- `surf list-operations -g` → 136 operations
- Lọc domain, `surf <lệnh> --help`, chạy thật từng lệnh (`-o json -f body.data`)

Kết quả **khớp 100%** với lần khảo sát đầu (lúc đó mình dùng OpenAPI JSON (`https://api.asksurf.ai/gateway/openapi.json`) + `curl` trực tiếp thay cho CLI, cùng backend nên field/response giống hệt) — chỉ bổ sung thêm 1 chi tiết: `fund-detail.recent_researches[]` có schema con đầy đủ `{id, published_at, title, url}` mà lần đầu không thấy vì thiếu tên schema để tra.

Toàn bộ nội dung field/response mẫu bên dưới giữ nguyên, đã verify lại bằng CLI thật.

## Lọc domain (tương đương bước 3 của spec)

Từ 108 operations, lọc theo từ khóa `signal|fund|raise|heat|trend` → 10 kết quả, loại 1 false positive:

| Operation | Giữ/loại | Lý do |
|---|---|---|
| `exchange-funding-history` (`/exchange/funding-history`) | **Loại** | "Funding rate" của derivatives (phí giữ vị thế), không liên quan gọi vốn/VC |

9 lệnh còn lại khớp đúng 3 domain yêu cầu (Signal, Fund, Fundraising) — chi tiết bên dưới.

---

## Domain: Signal (Token of the Day/Week, Heat Score, Trending Projects)

> **Ghi chú ánh xạ**: Không có endpoint tên literal "Trending Projects". Endpoint `heatscore/projects` (Signal Projects) — trả về **toàn bộ project xếp hạng theo heat score, phân trang** — chính là cái đóng vai trò "Trending Projects" trong spec.

### 1. `GET /gateway/v1/heatscore/projects` — operationId: `signal-projects`

**Mục đích** (theo docs): "Returns a paginated ranked snapshot of project signal cards. Included fields: project identity, score, latest price, price-change percentages, core state, dimension scores, compact token signals, AI summaries, and supporting market metrics." Filter `time_range` (`24h`/`7d`), `limit`/`offset`.

**Params**: `time_range` (enum `24h`/`7d`, default `24h`), `limit` (1-100, default 20), `offset` (default 0).

**Field response** (object `SignalProject`, 32 field khai báo trong schema — response mẫu thật trả **26/32**, xem field thiếu ở cuối):

| Field | Kiểu | Có trong response mẫu? |
|---|---|---|
| rank | int | ✅ |
| project_id, token_id, project_slug | string (UUID/slug) | ✅ |
| symbol, name, logo | string | ✅ |
| metric, time_range | string | ✅ |
| computed_hour, updated_at | int (unix) | ✅ |
| score, heat_score, value | double | ✅ |
| price | double | ✅ |
| price_change_percent | object `{1h, 24h, 7d}` | ✅ |
| core_state | object `{priority, state, state_type, strength, driver, reason}` | ✅ |
| driver | string | ✅ |
| heat_dimensions | object `{movement, flow, derivative, social, derivative_components[]}` | ✅ |
| token_signals | object (map string→string, ví dụ `{"FR":"—","LiqL":"↑↑↑",...}`) | ✅ |
| ai_summary | object map ngôn ngữ → string (en, ja, ko, tr, vi, zh) | ✅ |
| volume_24h, volume_24h_change_percent | double | ✅ |
| open_interest | double | ✅ |
| liquidation_long_24h, liquidation_short_24h, liquidation_long_short_ratio_24h | double | ✅ |
| heat_score_by_range, heat_score_previous_by_range, heat_score_change_vs_previous_percent_by_range | object map `{24h, 7d}` → double | ✅ |
| evidence_score | double | ✅ |
| market_relevance | double | ✅ |
| **baseline** | double | ❌ không thấy |
| **change_percent** | double | ❌ không thấy |
| **change_vs_previous_percent** | double | ❌ không thấy |
| **points_used** | int | ❌ không thấy |
| **previous_value** | double | ❌ không thấy |
| **signed_z** | double | ❌ không thấy |

**Response mẫu thật (1 item, rút gọn — bỏ bớt các bản dịch ai_summary chỉ giữ `en`)**:
```json
{
  "rank": 1,
  "project_id": "33f68127-4631-4380-8e09-5634f8c41fd0",
  "project_slug": "koma-inu",
  "symbol": "KOMA", "name": "Koma Inu",
  "logo": "https://coin-images.coingecko.com/coins/images/50902/large/IMG_7580.jpeg?1729520086",
  "score": 99.57, "heat_score": 99.57, "price": 0.01497748,
  "price_change_percent": {"1h": -2.75, "24h": -46.74, "7d": 88.85},
  "core_state": {"priority":1,"state":"Long Liquidation Cascade","state_type":"confirmed","strength":"↑↑↑","driver":"Liquidation","reason":"P↓↓↓ / LiqL↑↑↑ / ΔOI↓↓↓ / PV↑↑↑"},
  "heat_dimensions": {"movement":99.97,"flow":98.49,"derivative":99.85,"social":100,
    "derivative_components":[{"metric":"oi_change","score":99.97,"used":true,"weight":0.65}, "..."]},
  "token_signals": {"FR":"—","LiqL":"↑↑↑","OI%":"↑↑↑","P":"↓↓↓","PV":"↑↑↑"},
  "ai_summary": {"en": "Koma Inu (KOMA) fell -43.3% as tweet-driven chatter circulated..."},
  "volume_24h": 28017256.2, "open_interest": 18650886,
  "liquidation_long_24h": 925583.18, "liquidation_short_24h": 554391.51,
  "evidence_score": 99.57, "market_relevance": 17.95
}
```
`meta`: `{"total":645,"limit":3,"offset":0,"credits_used":1,"cached":false}`

**Ghi chú field kỳ vọng nhưng không thấy**: `baseline`, `change_percent`, `change_vs_previous_percent`, `points_used`, `previous_value`, `signed_z` — có trong schema OpenAPI nhưng **không** xuất hiện ở bất kỳ response nào trong 3 endpoint Signal đã test (`signal-projects`, `token-of-the-day`, `token-of-week`, `signal-detail`). Có thể các field này dành cho use case khác của cùng schema dùng chung (`SignalProject`) mà domain heatscore không dùng tới. **Không nên dựng UI dựa vào các field này.**

---

### 2. `GET /gateway/v1/heatscore/token-of-the-day` — operationId: `signal-token-of-the-day`

**Mục đích**: "Returns the token-of-the-day project signal cards with latest price, price-change percentages, dimension scores, compact signals, and AI summaries."

**Params**: `limit` (1-100, default 20), `offset` (default 0). Không có filter `time_range` riêng (field `time_range` trong response mặc định `"24h"`).

**Field response**: **Giống hệt schema `SignalProject`** ở trên (cùng object). Response mẫu thật cũng chỉ thiếu đúng 6 field kể trên. Khác biệt duy nhất với `signal-projects`: `metric` = `"token_of_the_day"` (thay vì `"heat_score"`), và `value` khác `score`/`heat_score` (ví dụ mẫu: `score: 95.89`, `heat_score: 95.89`, nhưng `value: 83.51` — 3 field này **không phải lúc nào cũng bằng nhau**, cần xem lại ý nghĩa từng field trước khi chọn field hiển thị).

`meta`: `{"total":10,"limit":3,"offset":0,"credits_used":1,"cached":false}` → **luôn có đúng 10 token/ngày**.

---

### 3. `GET /gateway/v1/heatscore/token-of-week` — operationId: `signal-token-of-week`

**Mục đích**: Tương tự token-of-the-day nhưng cho tuần.

**Params**: `limit`, `offset` — giống hệt trên.

**Field response**: Cùng schema `SignalProject`, cùng pattern thiếu field như trên.

`meta`: `{"total":10,...}` → cũng cố định 10 token/tuần.

---

### 4. `GET /gateway/v1/heatscore/detail` — operationId: `signal-detail`

**Mục đích**: "Returns one project signal card." Lookup bằng `id` (UUID) HOẶC `project_slug` (chọn đúng 1 trong 2), `time_range` (`24h`/`7d`).

**Params**: `id` (string UUID), `project_slug` (string), `time_range` (enum, default `24h`).

**Field response**: Cùng schema `SignalProject` (object đơn, không phải mảng). Test với `project_slug=koma-inu` → trả đủ 30 key trong data (thiếu đúng 6 field như đã liệt kê ở mục 1). Không field nào bị `null`.

`meta` (dùng `ObjectResponseMeta`, khác các endpoint list ở trên): chỉ có `{"credits_used":1,"cached":false}` — **không có `total`/`limit`/`offset`** vì đây là response 1 object đơn, không phân trang.

---

## Domain: Fund/VC

### 5. `GET /gateway/v1/fund/detail` — operationId: `fund-detail`

**Mục đích**: "Returns a crypto VC fund's full profile: description, jurisdiction, portfolio count, social links, and team members with roles... Does NOT return the list of investments — use /fund/portfolio for that." Lookup bằng `id` (UUID, ưu tiên) hoặc `q` (fuzzy tên).

**Params**: `id` (string, ưu tiên), `q` (string, fuzzy search, maxLength 100).

**Field response** (`FundDetailItem`):

| Field | Kiểu | Có trong response mẫu (a16z)? |
|---|---|---|
| id, name, tier, type | string/int | ✅ |
| image | string (logo URL) | ✅ |
| jurisdiction | string | ✅ ("US") |
| invested_projects_count | int | ✅ (195) |
| links | array `FundLinkItem{type,value}` hoặc null | ⚠️ mảng **rỗng** `[]` (không null, nhưng cũng không có dữ liệu — a16z không có link nào dù có website/twitter thật) |
| x_accounts | array `FundXAccountItem{id,handle,display_name,followers_count,profile_image}` | ✅ (2 accounts, đầy đủ follower count) |
| members | array `FundMemberItem{name,roles[],avatar}` | ✅ (39 members, có avatar + roles) |
| recent_researches | array `FundResearchItem{id,published_at,title,url}` | ⚠️ mảng **rỗng** `[]` (a16z chưa có research nào ghi nhận) |
| **description** | string | ❌ **key không xuất hiện trong response** dù mô tả docs nói "returns... description" |

**Response mẫu thật (rút gọn, chỉ 2 members)**:
```json
{
  "id": "fa0f7a71-94de-419a-b36c-ae82a45478c1",
  "name": "Andreessen Horowitz (a16z)",
  "type": "Venture", "tier": 1,
  "image": "https://images.asksurf.ai/.../andreessen_horowitz_a16z_crypto....png",
  "jurisdiction": "US",
  "links": [],
  "x_accounts": [
    {"id":"1539681011696603137","handle":"a16zcrypto","display_name":"a16z crypto","profile_image":"https://images.asksurf.ai/...","followers_count":1133583},
    {"id":"64844802","handle":"a16z","display_name":"a16z","profile_image":"https://images.asksurf.ai/...","followers_count":1037773}
  ],
  "members": [
    {"name":"Noah Citron","roles":["Engineering Partner"],"avatar":"https://images.asksurf.ai/..."},
    {"name":"Marc Andreessen","roles":["Co-Founder"],"avatar":"https://images.asksurf.ai/..."}
  ],
  "recent_researches": [],
  "invested_projects_count": 195
}
```
`meta`: `{"credits_used":1,"cached":false}` (object response, không phân trang).

**Ghi chú field kỳ vọng nhưng không thấy**: `description` — docs nói rõ endpoint này trả description nhưng **key hoàn toàn vắng mặt** trong response thật (không phải null — field không tồn tại). Có thể do fund a16z chưa được điền description trong hệ thống Surf, cần test thêm fund khác trước khi kết luận field này luôn thiếu hay chỉ thiếu case này. **Không nên thiết kế layout phụ thuộc có description.**

---

### 6. `GET /gateway/v1/fund/portfolio` — operationId: `fund-portfolio`

**Mục đích**: "Returns investment rounds for a fund's portfolio, sorted by date (newest first). A project may appear multiple times if the fund participated in multiple rounds." Lookup `id`/`q`.

**Params**: `id`, `q`, `limit` (1-100, default 20), `offset`, `is_lead` (enum `"true"/"false"/""`), `invested_after`/`invested_before` (unix timestamp), `sort_by` (enum `invested_at`/`recent_raise`/`total_raise`, default `invested_at`), `order` (`asc`/`desc`, default `desc`).

**Field response** (`FundPortfolioItem`, mảng):

| Field | Kiểu | Có trong response mẫu? |
|---|---|---|
| project_id, project_name, project_slug | string | ✅ |
| project_logo | string | ✅ |
| invested_at | int (unix) | ✅ |
| recent_raise, total_raise | double (USD) | ✅ (cả 2 đều có số cụ thể) |
| is_lead | boolean | ✅ |

**Response mẫu thật (a16z, 2 item đầu)**:
```json
[
  {"project_id":"bfe17980-...","project_name":"Ornn","project_slug":"ornn",
   "project_logo":"https://images.asksurf.ai/...","invested_at":1782259200,
   "recent_raise":33000000,"total_raise":38700000,"is_lead":true},
  {"project_id":"5fe7446a-...","project_name":"Digital Asset","project_slug":"digital-asset",
   "invested_at":1781136000,"recent_raise":365000000,"total_raise":812200000,"is_lead":true}
]
```
`meta`: `{"total":294,"limit":3,"offset":0,...}` — a16z có 294 investment rounds tổng.

**Ghi chú**: Không thiếu field nào so với schema. Đây là endpoint có số liệu raise **sạch nhất, cấu trúc rõ ràng nhất** trong toàn bộ khảo sát (số USD thật, không phải text).

---

### 7. `GET /gateway/v1/fund/ranking` — operationId: `fund-ranking`

**Mục đích**: "Returns top crypto VC funds ranked by tier or portfolio count." Metric: `tier` (thấp hơn = tốt hơn) hoặc `portfolio_count`.

**Params**: `metric` (**bắt buộc**, enum `tier`/`portfolio_count`), `limit`, `offset`.

**Field response**: Dùng chung schema `FundSearchItem` (giống `search-fund` bên dưới) — gồm `top_projects[]` là `FundPortfolioItem` nhưng **rút gọn**.

| Field trong `top_projects[]` | Có trong mẫu? |
|---|---|
| project_id, project_name, project_slug, project_logo | ✅ |
| invested_at, is_lead | ✅ |
| recent_raise | ⚠️ **có item bị thiếu** (item đầu "Tenor Finance" của Coinbase Ventures không có field này) |
| **total_raise** | ❌ **không xuất hiện ở bất kỳ item nào** trong `top_projects` (dù có trong `/fund/portfolio` đầy đủ) |

**Response mẫu thật** (`metric=portfolio_count`, top 1 = Coinbase Ventures, 469 invested projects — rút gọn 2/5 top_projects):
```json
{
  "id": "ef3b6da9-...", "name": "Coinbase Ventures", "tier": 1, "type": "Venture",
  "invested_projects_count": 469,
  "top_projects": [
    {"project_id":"ebed2fa7-...","project_name":"Tenor Finance","project_slug":"tenor-finance",
     "invested_at":1784678400,"is_lead":false},
    {"project_id":"babe050f-...","project_name":"Cyclops","project_slug":"cyclops",
     "invested_at":1784073600,"recent_raise":20000000,"is_lead":false}
  ]
}
```

**Ghi chú field kỳ vọng nhưng không thấy**: `total_raise` trong `top_projects[]` của cả `fund-ranking` VÀ `search-fund` (xem mục 8) — hai endpoint này chỉ trả `recent_raise`, muốn `total_raise` phải gọi riêng `/fund/portfolio`.

---

### 8. `GET /gateway/v1/search/fund` — operationId: `search-fund`

**Mục đích**: "Searches funds by keyword. Included fields: name, tier, type, logo, top invested projects."

**Params**: `q` (**bắt buộc**, string, maxLength 100), `limit`, `offset`.

**Field response**: Giống hệt `fund-ranking` (cùng schema `FundSearchItem`). Cùng ghi chú thiếu `total_raise` trong `top_projects`.

**Response mẫu thật** (`q=a16z`) — trả 2 quỹ khớp: "Andreessen Horowitz (a16z)" (tier 1, 195 projects) và "a16z CSX" (tier 1, Incubator, 43 projects).

---

## Domain: Fundraising

### 9. `GET /gateway/v1/search/fundraising` — operationId: `search-fundraising`

**Mục đích** (nguyên văn docs — **quan trọng**): "Searches source-backed fundraising and token-sale events, or returns the latest fundraising timeline when q is omitted. **Results intentionally omit project or fundraiser identity because source context is not guaranteed to identify the organization raising funds.**"

**Params**: `q` (optional, 2-100 ký tự), `from`/`to` (unix/date/RFC3339), `source` (enum `social`/`news`), `lang` (enum `en`/`zh`/`ja`/`kr`, default `en`), `min_importance` (int 1-5), `sort_by` (enum `recency`/`relevance`/`importance`, default `recency`), `order`, `limit`, `offset` (offset+limit ≤ 10000).

**Field response** (`FundraisingSearchItem`):

| Field | Kiểu | Có trong mẫu? |
|---|---|---|
| id | string | ✅ |
| title, summary | string (localized, có fallback tiếng Anh) | ✅ |
| source | object `{type: "social"/"news", name?, url}` | ✅ (mẫu chỉ có `type`+`url`, **không có `name`**) |
| event_at, published_at | int (unix) | ✅ |
| importance | int 1-5 | ✅ |
| source_count | int | ✅ |
| **project_id / project_name / raise_amount (dạng số)** | — | ❌ **KHÔNG TỒN TẠI trong schema — đây là chủ ý thiết kế API, không phải lỗi khảo sát** |

**Response mẫu thật (3 item)**:
```json
[
  {"id":"22e1aac5-...","title":"Propr Announces $1.5M Seed Round at $17.5M FDV",
   "summary":"Propr launches $1.5M seed raise at $17.5M FDV, with 100% token unlock at TGE in August 2026.",
   "source":{"type":"social","url":"https://x.com/ProprXYZ/status/..."},
   "event_at":1785542400,"published_at":1772039868,"importance":4,"source_count":2},
  {"id":"19fcd1b4-...","title":"Moonbirds Launches Birbs Beyond Sale on Panini Blockchain",
   "summary":"Moonbirds' Birbs Beyond sale launches Friday at 11AM EST...",
   "source":{"type":"social","url":"https://x.com/moonbirds/status/..."},
   "event_at":1785513600,"published_at":1785348031,"importance":2,"source_count":1}
]
```
`meta`: `{"total":20450,...}` — kho dữ liệu rất lớn (20,450 sự kiện).

**⚠️ Ghi chú quan trọng cho Giai đoạn 2**: Endpoint này **KHÔNG có field số tiền raise dạng số** (không có `amount_usd` hay tương tự) và **KHÔNG có tên project/fund có cấu trúc** — chỉ có `title`/`summary` dạng text tự do (số tiền nằm trong câu chữ, ví dụ "$1.5M Seed Round"). Muốn làm rule "raise lớn nhất" như spec Giai đoạn 2 đề cập, **không thể dùng endpoint này trực tiếp** — phải:
- (a) parse số tiền từ text bằng regex (không đáng tin cậy, rủi ro sai), hoặc
- (b) dùng `/fund/portfolio` (có `recent_raise` dạng số thật) làm nguồn cho rule "raise lớn nhất", nhưng endpoint đó cần biết trước fund nào để query — không phải feed tổng hợp toàn thị trường.

Đây là điểm cần bạn (chủ dự án) quyết định trước khi bước sang Giai đoạn 2, vì ảnh hưởng trực tiếp tới cột "Fundraising" bên phải dashboard.

---

## Tổng kết nhanh cho quyết định Giai đoạn 2

| Nhu cầu dashboard (theo spec) | Endpoint dùng được | Field số thật để tính rule |
|---|---|---|
| Token of the Day | `heatscore/token-of-the-day` | `heat_score`, `price_change_percent.24h` |
| Token of the Week | `heatscore/token-of-week` | tương tự |
| Trending Projects (bảng xếp hạng) | `heatscore/projects` | `score`/`rank`, `heat_score_change_vs_previous_percent_by_range` |
| Heat Score chi tiết 1 token | `heatscore/detail` | toàn bộ `SignalProject` |
| Fund nổi bật / xuất hiện nhiều lần | `fund/ranking?metric=portfolio_count` | `invested_projects_count` |
| Fund detail (team, social) | `fund/detail` | `members`, `x_accounts` — **không có `description`** trong mẫu test |
| Portfolio 1 fund + raise amount thật | `fund/portfolio` | `recent_raise`, `total_raise` (số USD sạch) |
| Fundraising feed / raise lớn nhất | `search/fundraising` | ⚠️ **chỉ có text**, không có số tiền dạng field — cần bạn quyết cách xử lý (xem ghi chú trên) |

Chưa code UI, chưa quyết layout, chưa viết logic tổng hợp — chờ bạn review field thật ở trên rồi bổ sung tiếp Giai đoạn 2 theo đúng spec.
