# Surf Dashboard — hướng dẫn tự khai thác SURF API để cày role SURF

Repo này ghi lại cách mình khảo sát và dùng [SURF](https://asksurf.ai) API/CLI để lấy dữ liệu on-chain/crypto research (heat score, VC/fund, fundraising, pre-TGE...), phục vụ mục tiêu: **tự build 1 dashboard/report nhỏ, đăng cập nhật hằng tuần lên X** — vừa có content đều, vừa cày role SURF trong cộng đồng.

Đây **không phải** một dashboard đóng gói sẵn để bạn `git clone` rồi chạy ra y hệt của mình. SURF có **136 operations** (endpoint) — quá nhiều để 1 dashboard dùng hết, và mỗi người quan tâm 1 góc khác nhau (trader nhìn signal, người săn airdrop nhìn pre-TGE, người theo dõi VC nhìn fund...). Mục đích của repo là chỉ đường **cách tự đi khảo sát** và đưa vài ví dụ thật mình đã chạy, để bạn tự chọn API phù hợp và build ra bản của riêng mình.

## SURF là gì, role SURF là gì

SURF là 1 nền tảng aggregator dữ liệu crypto (signal/heat score, VC & fund, fundraising, airdrop...), có API/CLI cho developer khai thác. Cộng đồng SURF khuyến khích thành viên tự làm tool/dashboard/report từ data của họ rồi chia sẻ công khai (thường là thread X) — đây là cách phổ biến để cày role/ghi nhận đóng góp trong Discord của họ. Chi tiết chương trình role cụ thể, xem thông báo chính thức từ SURF (thay đổi theo thời gian, repo này không track).

## Bước 1 — Cài CLI, lấy key

```bash
curl -fsSL https://downloads.asksurf.ai/cli/releases/install.sh | sh
```

CLI `surf` mã nguồn mở tại [github.com/asksurf-ai/surf-cli](https://github.com/asksurf-ai/surf-cli) (viết bằng Go). Xin API key từ SURF (qua Discord/docs của họ), rồi set:

```bash
export SURF_API_KEY=xxxxx     # hoặc set biến môi trường tương ứng trên Windows
surf sync                     # đồng bộ spec API mới nhất — chạy lại mỗi khi bắt đầu 1 đợt khảo sát mới
```

Docs đầy đủ: https://agents.asksurf.ai/docs

## Credit & giới hạn — đọc trước khi bắn API

SURF **không còn free thoải mái như trước** — hiện tại mỗi IP chỉ được **30 credit miễn phí/ngày**, reset lúc 00:00 UTC, không cần đăng ký để thử (nguồn: [docs.asksurf.ai/docs/pricing](https://docs.asksurf.ai/docs/pricing)). Muốn dùng nhiều hơn phải top-up (tối thiểu $20, ~$0.006/credit).

Chi phí mỗi loại call:
- **Data API** (hầu hết endpoint bạn sẽ dùng): Light = 1 credit, Standard = 2 credit, Heavy = 4 credit. Gọi lặp lại cùng endpoint/tham số trong vòng 3 phút thì **miễn phí** (cache).
- **Chat API** (`surf-2.0`, nếu bạn dùng AI summary có sẵn của SURF): 20–200 credit/lần tùy `reasoning.effort`.

**Ý nghĩa thực tế khi build**: 30 credit/ngày đủ cho vài chục lệnh `--help`/thử nghiệm hoặc 1 dashboard nhẹ (kiểu `fetch-content.mjs`, ~10-15 call). Nhưng script nào phải quét **hàng trăm** dự án qua `/project/detail` như `pre-tge-by-narrative.mjs` (486–700 call) thì **chắc chắn vượt free tier** — phải có key đã top-up, và vẫn nên giữ cache + concurrency thấp như đã làm (xem Bước 4) để không đốt credit vô ích khi chạy thử đi thử lại.

> ⚠️ **Cảnh báo thật, đã tốn tiền thật**: chạy `pre-tge-by-narrative.mjs` **1 lần từ đầu** (không có cache) gọi tới **~486–700 lần `/project/detail`** + vài lần `/search/airdrop` phân trang — bản thân mình từng tốn **~600 credit trong 1 lần chạy**. Đây không phải lỗi/bug, đó là chi phí thật của việc quét gần 500-700 dự án. Trước khi chạy script này:
> - **Đừng chạy trên free tier (30 credit/ngày)** — sẽ hết ngay sau vài chục request đầu, phần còn lại lỗi 429/hết quota.
> - **Đừng xoá `.detail-cache.json`** — script cache theo `project_id`, xoá cache = chạy lại từ đầu = tốn credit lần nữa cho những dự án đã fetch rồi.
> - Muốn test nhẹ trước khi chạy full, giảm tạm `CANDIDATE_POOL` trong file (dòng khai báo hằng số) xuống vài chục thay vì 700, xem thử output ra sao rồi mới chạy full.

## Bước 2 — Tự khảo sát, đừng đọc docs suông

136 operations là quá nhiều để đọc hết. Cách hiệu quả hơn: lọc theo từ khóa liên quan tới thứ bạn quan tâm, rồi chạy thử thật từng lệnh để xem **response thật** — không phải chỉ đọc schema, vì có field trong schema nhưng thực tế API không bao giờ trả (mình gặp vài trường hợp như vậy, xem `phase1-api-survey-report.md`).

```bash
surf list-operations -g                       # liệt kê toàn bộ operations
surf list-operations | grep signal            # ví dụ: lọc domain signal/heat score
surf list-operations | grep fund              # domain VC/fund
surf <tên-lệnh> --help                        # xem tham số + schema response đầy đủ
surf <tên-lệnh> -o json -f body.data          # chạy thật, lấy 1 response mẫu
```

Vài từ khóa gợi ý để bắt đầu lọc theo hướng bạn quan tâm: `signal`, `heat`, `trend`, `fund`, `raise`, `airdrop`, `token`, `project`.

**Ghi lại field thật khi khảo sát** — tên field, kiểu dữ liệu, field nào null/thiếu trong response mẫu. Việc này giúp bạn (hoặc AI hỗ trợ bạn code) không bịa ra field không tồn tại khi build. Ví dụ đầy đủ cách mình làm: [`phase1-api-survey-report.md`](phase1-api-survey-report.md).

## Bước 3 — Chọn hướng: content dễ ra hàng ngày, hay đào sâu tìm insight

136 endpoint chia đại khái thành 2 nhóm, độ khó khác hẳn nhau. Chọn 1 trong 2 (hoặc cả 2) tùy bạn muốn đầu tư bao nhiêu công sức mỗi tuần.

### Nhóm dễ — Signal / Heat Score (ra bài gần như không cần suy luận)

API đã **tính sẵn điểm và lý do** cho bạn, việc của bạn chỉ là chọn ngưỡng và trình bày đẹp:

- `heatscore/token-of-the-day`, `heatscore/token-of-week` — top 10 token nóng nhất ngày/tuần, có sẵn `heat_score`, `price_change_percent`.
- `heatscore/projects` — bảng xếp hạng đầy đủ, lọc `time_range=24h/7d`, sort theo `score`/`rank`.
- Field ăn tiền nhất: `core_state.reason` — 1 câu giải thích **vì sao** nó nóng (ví dụ `"P↓↓↓ / LiqL↑↑↑ / ΔOI↓↓↓ / PV↑↑↑"` = long liquidation cascade). Đây gần như là caption có sẵn cho bài đăng.

Công thức 1 bài/tuần: gọi `token-of-week`, lấy top 5, mỗi token 1 dòng gồm symbol + `heat_score` + `core_state.reason` dịch sang lời thường. Không cần join thêm nguồn nào khác.

### Nhóm khó hơn — Fund / VC / Fundraising / Valuation (phải tự ghép mới ra insight)

Đây là hướng mình (chủ repo) chọn, vì field ở nhóm này **rời rạc, không có sẵn "điểm số"** như Signal — API chỉ đưa dữ liệu thô (ai đầu tư gì, bao nhiêu tiền, lúc nào), còn "cái gì đáng nói" thì bạn phải tự đặt câu hỏi rồi lắp field lại. Bù lại nếu ra được thì insight độc hơn hẳn, ít người trùng content.

Vài "công thức" cụ thể để bắt đầu (đều dùng field thật, xem chi tiết trong `phase1-api-survey-report.md`):

1. **Narrative nào đang hút vốn nhất tuần này** — gọi `/search/airdrop?phase=active,claimable&sort_by=total_raise` lấy danh sách ứng viên, rồi `/project/detail?fields=overview,funding` từng dự án lấy `overview.tags` (narrative) + `funding.rounds[].valuation`. Gom theo tag, cộng `total_raise` mỗi nhóm. → chính là cách `pre-tge-by-narrative.mjs` làm, copy logic `buildMarkdown`/nhóm `groups` mà dùng.
2. **Quỹ nào đang gom nhiều nhất** — `/fund/ranking?metric=portfolio_count` cho biết quỹ active nhất theo tổng số dự án, nhưng muốn biết *tuần này* quỹ nào mới xuống tiền thì phải gọi `/fund/portfolio?id=<fund_id>&sort_by=invested_at&order=desc&invested_after=<7 ngày trước, unix>` cho từng quỹ trong watchlist của bạn (xem `resolveFundId` + `fetchVcRecent` trong `fetch-content.mjs`).
3. **Lead investor nào hay dẫn dắt deal lớn** — trong response `/fund/portfolio`, lọc `is_lead === true`, sort theo `recent_raise` giảm dần — quỹ nào lead nhiều deal to là tín hiệu họ đang tin vào 1 sector.
4. **Định giá vòng gọi vốn có xứng với traction hiện tại không** (khó nhất, phải join 2 domain khác nhau) — lấy `funding.rounds[].valuation` từ `/project/detail` của 1 dự án, rồi tra `heat_score`/`volume_24h` cùng `project_id` đó qua `heatscore/detail?id=<project_id>`. Valuation cao nhưng heat score/volume thấp = thị trường đang định giá thấp hơn kỳ vọng gọi vốn, hoặc ngược lại — đây là kiểu nhận xét không API nào tự đưa ra sẵn, bạn phải tự so 2 con số.

Lưu ý field bị thiếu khi dùng nhóm này: `search/fundraising` (feed tin tức gọi vốn) **không có** số tiền dạng field số — chỉ có trong text `title`/`summary`, muốn số sạch để tính toán phải lấy qua `/fund/portfolio` hoặc `/search/airdrop` như trên.

## Bước 4 — Build phần của riêng bạn

Không có công thức chung ở bước này — tuỳ bạn muốn kể câu chuyện gì mỗi tuần. Hai ví dụ thật mình đã chạy, để tham khảo cách gọi API + xử lý dữ liệu, **không phải để bạn copy y nguyên**:

- [`fetch-content.mjs`](fetch-content.mjs) — gọi 3 nhóm endpoint (Token of the Week, watchlist vài quỹ VC cố định qua `/fund/portfolio`, fundraising importance cao qua `/search/fundraising`), ghi ra 1 file JSON.
- [`pre-tge-by-narrative.mjs`](pre-tge-by-narrative.mjs) — liệt kê dự án **chưa TGE** xếp theo narrative + số vốn đã raise, kết hợp `/search/airdrop` (danh sách + `total_raise` dạng số) và `/project/detail` (narrative, `tge_status`, funding rounds). Xuất ra Markdown + CSV.

Cả 2 đều là Node script thuần (`node <file>.mjs`), đọc API key từ file `.env.txt` (không commit — xem `.gitignore`), không có backend/cron gì phức tạp. Chạy thủ công khi nào muốn cập nhật số liệu để đăng bài.

Vài điều đáng lưu ý rút ra khi build (chi tiết ở [`HANDOFF.md`](HANDOFF.md)):

- **Rate limit gắt** nếu bắn request song song — nên giới hạn concurrency thấp (2 luồng) + gap giữa các request + cache lại response theo id để chạy lại không tốn quota.
- Không phải endpoint nào cũng có field bạn kỳ vọng — ví dụ `search/fundraising` không có field số tiền raise dạng số (chỉ có trong text `title`/`summary`), muốn số sạch phải lấy qua `/fund/portfolio` hoặc `/search/airdrop`.
- Build xong 1 bản demo cụ thể rồi tự đánh giá xem có thật sự hữu ích trước khi đầu tư làm UI hoàn chỉnh — mình từng build rồi gỡ bỏ vì thấy nội dung chưa đủ giá trị (xem "Failed Approaches" trong HANDOFF.md).

## Cấu trúc repo

| File | Nội dung |
|---|---|
| `phase1-api-survey-report.md` | Báo cáo khảo sát field thật của 9 endpoint domain Signal/Fund/Fundraising |
| `surf-dashboard-spec.md` | Spec gốc (tham khảo cách lên kế hoạch 1 đợt khảo sát API có mục tiêu rõ) |
| `fetch-content.mjs` | Script ví dụ: Token of Week + VC watchlist + fundraising headlines |
| `pre-tge-by-narrative.mjs` | Script ví dụ: dự án Pre-TGE xếp theo narrative + vốn raise |
| `HANDOFF.md` | Nhật ký quá trình build thật — quyết định, giới hạn, hướng đã thử và bỏ |

## Setup để chạy script

```bash
echo "YOUR_SURF_API_KEY" > .env.txt
node fetch-content.mjs
node pre-tge-by-narrative.mjs
```

---

Đây là ghi chú cá nhân trong quá trình tự học SURF API, không phải tài liệu chính thức của SURF — thông tin field/endpoint có thể đã thay đổi kể từ lúc khảo sát. Luôn `surf sync` + `--help` để lấy schema mới nhất trước khi build.
