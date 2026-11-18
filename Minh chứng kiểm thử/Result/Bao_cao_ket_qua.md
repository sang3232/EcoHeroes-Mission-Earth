# BÁO CÁO KẾT QUẢ KIỂM THỬ (bản tổng hợp)

**Sản phẩm:** Hồi Sinh Xanh (EcoHeroes) — bản web
**Đợt kiểm thử:** Màn 2 · Rừng Ngập Mặn · tính năng Đom đóm về & Cổng Rừng
**Ngày:** 18/11/2026 · **Commit:** `d69fa01` · **Môi trường:** Edge 157.0.4341.60 (headless), Windows 11 Pro

## 1. Kết quả

| Nội dung | Kết quả | Bằng chứng |
|---|---|---|
| 5 bước quy trình Màn 2 | **ĐẠT 5/5** | `Test/images/01..05`, `Test/video/quy-trinh-kiem-thu-man-2.webm` |
| Tính năng đặc biệt (đom đóm + cổng) | **ĐẠT** | `Test/video/tinh-nang-dac-biet-dom-dom-cong-rung.webm` |
| Hồi quy quests / đường đi / puzzle | **ĐẠT 3/3** | `Result/thong-ke-kiem-thu.xlsx` sheet “Test cases” |
| UX/UI 11 màn | **ĐẠT** (6 quan sát, 3 đề xuất cải thiện) | `UX-UI/`, `Bao_cao/Bao_cao_kiem_thu.md` mục 7 |
| Số liệu lớp học + biên bản GV | **CHƯA CÓ** | Chờ giáo viên (không bịa số liệu) |

**Lỗi phát hiện trong đợt:** không có lỗi chặn chơi. Có 1 lỗi có sẵn từ trước, không liên quan
(`kiem_tra/thu_trong_trang.js` cần `window` trình duyệt nên không chạy được bằng Node).

## 2. Danh mục tệp bàn giao

| Tệp | Kích thước | Ghi chú |
|---|---|---|
| `Test/video/quy-trinh-kiem-thu-man-2.webm` | 7,0 MB | 26,2 giây · 1280×720 · VP9 |
| `Test/video/tinh-nang-dac-biet-dom-dom-cong-rung.webm` | 21,2 MB | 1 phút 13 giây · 1280×720 · VP9 |
| `Test/images/01..05_*.png` | ~0,7–1,0 MB/ảnh | 5 bước B1–B5 |
| `UX-UI/01..11_*.png` | ~85 KB–2,2 MB/ảnh | Desktop 1280px + mobile 390px |
| `Result/thong-ke-kiem-thu.xlsx` | 35 KB | 5 sheet: test cases, số liệu repo, nhật ký ghi hình, quan sát UX/UI, mẫu dữ liệu lớp (trống) |
| `User/Học sinh|Giáo viên/*.png` | ~0,8 MB | **Chỉ là màn đăng nhập**, chưa có tài khoản thật |

## 3. Cam kết về tính xác thực

- Không có số liệu nào trong gói này được tạo giả. Ô nào chưa có dữ liệu thật đều ghi rõ “chờ GV”.
- Video/ảnh là **demo tự động** bằng Playwright trên bản chạy thật; **không** gọi là “kiểm thử
  người dùng thật”.
- Biên bản nghiệm thu chưa có chữ ký và không được điền thay giáo viên.
