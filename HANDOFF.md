# Surf Content Dashboard — HANDOFF

## Trạng thái hiện tại (2026-08-03)

**Giai đoạn 1 (khảo sát API) — XONG, đã được chủ dự án xác nhận đúng/chuẩn.**
Chi tiết field thật + response mẫu: `phase1-api-survey-report.md`. Danh sách đầy đủ 136 operations: `surf-api-full-list.md`.

**Giai đoạn 2 (build) — CHƯA bắt đầu code.** Spec gốc (`surf-dashboard-spec.md`) hình dung 1 dashboard riêng (dark navy/cyan, 2 cột Signal/Fundraising) để chủ dự án tự xem rồi tay chọn nội dung đăng X.

Chủ dự án vừa đổi hướng: thay vì (hoặc thêm vào) dashboard riêng, muốn thêm **3 box mới vào thẳng trang Valuation của `cv` (0xhieu.xyz)**, kích thước tương đồng box "Recent TGE multiples" hiện có (xem `D:\Files\Claude\build_for_me\cv\index.html`, class `.val-analysis.val-boxes`), nội dung lấy từ SURF API, mục tiêu: đủ hữu ích để mỗi tuần đăng được 2 bài X.

## Trạng thái (2026-08-03, session 2) — ĐÃ BUILD, RỒI BỊ GỠ KHỎI `cv`

Đã chốt qua `EnterPlanMode` + build thật (không dùng research_airdrop_bot/VPS/Sheet — xem quyết định bên dưới), verify layout/data đúng bằng headless screenshot. Nhưng **chủ dự án xem xong thấy 3 box không mang lại giá trị, yêu cầu gỡ hẳn** — đã revert sạch khỏi `cv` (HTML/CSS/JS + file `surf-content.json`, xem `cv/HANDOFF.md` mục Failed Approaches, entry 2026-08-03). `cv` hiện **không còn dùng gì từ `surf-dashboard` nữa**.

**`fetch-content.mjs`** (cùng thư mục) — script Node thuần vẫn còn ở đây, đọc key từ `.env.txt`, gọi 3 nhóm SURF endpoint (Token of the Week / VC watchlist 5 quỹ / Fundraising importance≥4), ghi ra `../../cv/surf-content.json`. **Không còn ai tiêu thụ output của nó** — chạy lại sẽ chỉ tạo ra 1 file JSON không được `cv` render nữa. Giữ lại làm tham khảo (biết cách gọi SURF API), không xoá, nhưng coi như tạm dừng cho tới khi có hướng nội dung khác thật sự hữu ích.

## Decisions Log

- 2026-08-03: Giai đoạn 1 report được xác nhận đúng, không cần khảo sát lại.
- 2026-08-03: **Đổi hướng khỏi spec gốc** (dashboard riêng dark navy/cyan) — thay vào đó gắn thẳng 3 box vào `cv` (Valuation), lấp đúng 3 slot trống có sẵn trong grid 3×2 của box. Lý do: mục tiêu thực dụng hơn — có content sẵn để đăng X, không cần mở thêm 1 tool riêng để xem.
- 2026-08-03: **Không dùng VPS/cron, không dùng Google Sheet** — user chỉ muốn refresh thủ công ~2 lần/tuần. `research_airdrop_bot` (nơi có sẵn hạ tầng ghi Sheet) hoá ra **không tồn tại trên máy local** (chỉ chạy trên VPS) — thử explore agent tìm repo đó ra kết quả "not found", xác nhận không nên dựa vào nó. Chốt: ghi thẳng `cv/surf-content.json` (file tĩnh, không phải secret), publish bằng `git push` như code bình thường.
- 2026-08-03: Watchlist quỹ cho box "Recent VC Investments" dùng list mặc định top-tier assistant đề xuất (a16z, Coinbase Ventures, Paradigm, Multicoin Capital, Framework Ventures), user duyệt thẳng không đổi. Cả 5 quỹ resolve đúng tên qua `search/fund` (không bị nhầm, vd "a16z" không match nhầm "a16z CSX").

## Failed Approaches

- 2026-08-03: Build 3 box (Token of the Week/Recent VC Investments/Notable Fundraising) gắn vào `cv` → chủ dự án thấy không hữu ích, gỡ hẳn ngay sau khi xem bản thật. Bài học: nội dung cụ thể (không phải chỉ "field thật, có data") vẫn cần review bằng ví dụ trước khi build full UI.

## Việc còn treo

- Repo này **chưa có git remote** — theo quy tắc global "mọi project phải push GitHub", cần `git init` + tạo remote + push khi có dịp. Nhớ thêm `.gitignore` loại trừ `.env.txt` TRƯỚC khi push (chứa key SURF thật).
