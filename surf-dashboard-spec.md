# Surf Content Dashboard — Spec (2 giai đoạn)

## Giai đoạn 1 — Khảo sát API (Claude Code làm trước, báo cáo lại, CHƯA build gì)

### Việc cần làm
1. Chạy `surf sync` để cập nhật spec API mới nhất.
2. Chạy `surf list-operations` — liệt kê toàn bộ lệnh có sẵn.
3. Lọc riêng các domain liên quan đến mục tiêu dashboard này:
   - `surf list-operations | grep signal` — domain Signal (Token of the Day/Week, Heat Score, Trending Projects)
   - `surf list-operations | grep fund` — domain Fund/VC
   - `surf list-operations | grep fundraising` (hoặc lệnh `search-fundraising`) — raise/gọi vốn
4. Với mỗi lệnh tìm được ở bước 3, chạy `surf <lệnh> --help` để lấy: mô tả, tham số (tên, kiểu, bắt buộc/optional, enum), và **schema response đầy đủ** (field nào API thật sự trả về).
5. Chạy thử thật mỗi lệnh (1 lần, tham số mặc định hoặc tối thiểu) để lấy **1 response mẫu thật** — không phải chỉ đọc schema mà phải thấy data thật trông như nào (có null nhiều không, có logo/ảnh không, số format sao, v.v.)

### Output bắt buộc của giai đoạn này
Một báo cáo (file `.md` hoặc in ra terminal đều được), liệt kê cho từng lệnh:
- Tên lệnh chính xác
- Mục đích (theo mô tả trong `--help`)
- Danh sách field trong response (tên field, kiểu dữ liệu, có hay bị null/thiếu trong response mẫu)
- 1 đoạn response mẫu thật (rút gọn, không cần full nếu quá dài)
- Ghi chú nếu field nào kỳ vọng có (theo tên miêu tả chung chung trong docs) nhưng thực tế không thấy trong response

**Không code UI, không quyết layout, không viết logic tổng hợp ở giai đoạn này.** Chỉ khảo sát và báo cáo lại để chủ dự án (mình) tự quyết dashboard hiển thị gì dựa trên field thật.

## Giai đoạn 2 — Build dashboard (chờ giai đoạn 1 xong, review field thật rồi mới viết tiếp)

Phần này sẽ được viết bổ sung sau khi có báo cáo field thật từ Giai đoạn 1. Khung sườn đã thống nhất trước (có thể đổi nếu field thật không cho phép):

- Layout: header (72px) + 2 cột 50/50 (Signal trái, Fundraising phải), mỗi cột 10+ mục cuộn riêng, bên dưới là box tổng hợp 3-5 bullet + nút xuất ảnh
- Theme: dark mode, tông xanh navy/cyan theo Surf
- Auto-fetch qua cache backend (cron), không gọi API trực tiếp mỗi lượt xem trang public, key giấu ở server
- Logic tổng hợp: rule cố định tính từ data thật (ví dụ token heat cao nhất, raise lớn nhất, fund xuất hiện nhiều lần nhất) — **cụ thể field nào dùng để tính từng rule sẽ điền sau khi biết field thật ở Giai đoạn 1**

## Lưu ý cho Claude Code
- Không được đoán field không thấy trong response thật rồi tự bịa vào báo cáo.
- Nếu 1 domain không có lệnh nào khớp mô tả (ví dụ không tìm thấy lệnh nào cho "Heat Score"), ghi rõ trong báo cáo là không tìm thấy, không thay bằng lệnh gần giống mà không nói rõ.
