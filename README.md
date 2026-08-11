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

## Bước 3 — Build phần của riêng bạn

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
