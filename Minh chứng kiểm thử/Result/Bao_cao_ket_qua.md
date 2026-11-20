# BÁO CÁO KẾT QUẢ KIỂM THỬ (bản tổng hợp)

**Sản phẩm:** Hồi Sinh Xanh (EcoHeroes) — bản web
**Đợt kiểm thử:** Màn 2 · Rừng Ngập Mặn · tính năng Đom đóm về & Cổng Rừng
**Ngày:** 18/11/2026, cập nhật 20/11/2026 (biểu đồ theo ngày) · **Commit:** `d69fa01` · **Môi trường:** Edge 157.0.4341.60 (headless), Windows 11 Pro

## 1. Kết quả

| Nội dung | Kết quả | Bằng chứng |
|---|---|---|
| 5 bước quy trình Màn 2 | **ĐẠT 5/5** | `Test/images/01..05`, `Test/video/quy-trinh-kiem-thu-man-2.webm` |
| Tính năng đặc biệt (đom đóm + cổng) | **ĐẠT** | `Test/video/tinh-nang-dac-biet-dom-dom-cong-rung.webm` |
| Hồi quy quests / đường đi / puzzle / đăng nhập–đăng ký | **ĐẠT 4/4** | `Result/thong-ke-kiem-thu.xlsx` sheet “Test cases” |
| Tính đúng đắn số liệu web — **20 bot do AI tạo, không phải HS thật** | **ĐẠT** (712 phép so khớp, 55 kiểm tra trên web thật, 0 lỗi) | `Bot_AI_20_HS_ao/` (bản 18/11), sheet “Kiem thu 20 bot AI” |
| Biểu đồ xu hướng **theo ngày** trên bảng thống kê giáo viên (20/11/2026) — 20 bot AI | **ĐẠT** (29 ngày, từng điểm khớp) | `Test/video/bang-thong-ke-theo-ngay-20-bot-ai.mp4`, `Test/images/06_bang_thong_ke_theo_ngay_20_bot_ai.png` |
| UX/UI 11 màn | **ĐẠT** (7 quan sát, 4 đề xuất cải thiện) | `UX-UI/`, `Bao_cao/Bao_cao_kiem_thu.md` mục 8 |
| Số liệu lớp học thực tế | **Đang thực hiện** | Cần có người dùng thật |

**Kết quả kiểm thử:** Không có lỗi chặn chơi. Sử dụng 20 bot AI để kiểm thử và tìm ra 1 lỗi hiển thị nhỏ (UX-7: tên lớp bị lặp
“Lớp Lớp…”), **đã sửa** và có kiểm tra tự động. Có 1 lỗi có sẵn từ trước, không liên quan
(`kiem_tra/thu_trong_trang.js` cần `window` trình duyệt nên không chạy được bằng Node).

## 2. Danh mục tệp bàn giao

| Tệp | Kích thước | Ghi chú |
|---|---|---|
| `Test/video/quy-trinh-kiem-thu-man-2.webm` | 7,0 MB | 26,2 giây · 1280×720 · VP9 |
| `Test/video/tinh-nang-dac-biet-dom-dom-cong-rung.webm` | 21,2 MB | 1 phút 13 giây · 1280×720 · VP9 |
| `Test/video/bang-thong-ke-theo-ngay-20-bot-ai.mp4` | 1,1 MB | 17,9 giây · 1280×720 · H.264 · bảng thống kê mới với 20 bot AI, có dải chữ đỏ |
| `Test/images/01..05_*.png` | ~0,7–1,0 MB/ảnh | 5 bước B1–B5 |
| `Test/images/06_bang_thong_ke_theo_ngay_20_bot_ai.png` | ~0,4 MB | Tab Phân tích với biểu đồ theo ngày, 20 bot AI |
| `UX-UI/01..11_*.png` | ~85 KB–2,2 MB/ảnh | Desktop 1280px + mobile 390px |
| `Result/thong-ke-kiem-thu.xlsx` | ~40 KB | 6 sheet: test cases, số liệu repo, nhật ký ghi hình, quan sát UX/UI, **20 bot AI kiểm thử**, đang thực hiện thu thập mẫu dữ liệu lớp thật |
| `Bot_AI_20_HS_ao/` | ~1,8 MB | 4 ảnh, file Excel + PDF do web xuất với dữ liệu bot, dữ liệu bot (JSON), kết quả chạy. **Bot do chúng em tự thiết kế và lập trình có sử dụng AI** |
| `User/Học sinh|Giáo viên/*.png` | ~0,8 MB | **Giao diện người dùng (Học sinh + Giáo viên)**, chưa người dùng thật |

## 3. Cam kết về tính xác thực

- Dữ liệu trung thực, minh bạch.
- Video/ảnh là **demo tự động** bằng Playwright trên bản chạy thật.
- Báo cáo nghiệm thu chưa có xác thực.
- Kiểm thử số liệu web dùng **20 học sinh ảo (bot) do chúng em tự thiết kế và lập trình bằng công nghệ  AI (Claude) tạo và chạy**; quy mô kiểm thử chỉ có
  20 bot. Kết quả dùng để mô phỏng và không được dùng làm số liệu lớp học thật.
