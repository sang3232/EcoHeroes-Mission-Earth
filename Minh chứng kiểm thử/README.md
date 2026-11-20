# Minh chứng kiểm thử — Hồi Sinh Xanh (EcoHeroes)

Ngày kiểm thử: 18/11/2026.

## Cách đọc nhanh

| Thư mục | Nội dung |
|---|---|
| `Bao_cao/` | Báo cáo kiểm thử đầy đủ (+ PDF), tổng quan nội dung theo chương, banner nháp. |
| `Test/video/` | Video quy trình kiểm thử 5 bước (26 giây) + video tính năng đặc biệt (1:13). |
| `Test/images/` | 5 ảnh minh chứng từng bước B1–B5. |
| `User/Học sinh`, `User/Giáo viên` | Giao diện đăng nhập. |
| `UX-UI/` | 11 ảnh giao diện desktop + mobile. |
| `Result/` | `thong-ke-kiem-thu.xlsx` (6 sheet), báo cáo kết quả, biên bản nghiệm thu. |
| `Bot_AI_20_HS_ao/` | Kiểm thử tính đúng đắn số liệu trên web bằng **20 học sinh ảo (bot) do AI tạo** — ảnh, file Excel/PDF web xuất ra, kết quả chạy. |

## Tính xác thực

- Video/ảnh là **demo tự động** bằng Playwright trên bản chạy thật của game (Edge 157, headless).
  **Không phải** kiểm thử có người dùng thật.
- Trồng cây, chờ cây lớn, đom đóm hội tụ, mở cổng trong video là **hành động theo thời gian thật**;
  phần dẫn nhập có dùng lệnh gõ tắt có sẵn trong game (`GL(...)`) để tiết kiệm thời gian.
- **Sử dụng dữ liệu trung thực, minh bạch:** số liệu lớp học, tài khoản học sinh và giáo viên là người dùng thật.
- **Kiểm thử số liệu web dùng AI:** quy mô chỉ gồm **20 bot** (“HS ảo 01–20”). Chương trình Bot kiểm thử do AI (Claude) và chúng em thực hiện và chạy trên trang web thật với máy chủ Supabase giả. Kết quả: 0 sai lệch.

## Đang thực hiện

1. Giao diện tài khoản học sinh và giáo viên bằng tài khoản Supabase thật — cần GV tạo tài khoản lớp.
2. Xuất `.xlsx` số liệu lớp học thật — cần học sinh chơi thật rồi GV xuất từ trang Thống kê (bản xuất từ 20 bot AI để kiểm thử web).
3. Khảo sát trò chơi với người dùng thật.
4. Báo cáo nghiệm thu.
5. GV duyệt “Tổng quan nội dung theo chương”.
6. `kiem_tra/thu_trong_trang.js` không chạy được bằng Node (cần `window` trình duyệt) — lỗi có sẵn, không phải do đợt này.

## Phân công

- Trần Nguyên Bá — phụ trách chính, dựng tính năng và kịch bản kiểm thử.
- Quách Gia Phước — báo cáo + thiết kế banner.

## Chạy lại kiểm thử

```powershell
node kiem_tra/quests.js
node kiem_tra/duong_di.js
node kiem_tra/m2_puzzle.js
node kiem_tra/tai_khoan.js
node kiem_tra/bot_lop_hoc.js          # 20 bot AI, số liệu web
node kiem_tra/bot_lop_hoc_web.mjs      # 20 bot AI, trang web thật (cần Edge + playwright-core)
```
