# Sinh ảnh bằng Qwen

Dùng bộ có sẵn ở `D:\Yuyuko_QwenImage` (Qwen-Image-2.1, `sinh_anh.py`). Thư mục này chỉ chứa danh sách việc và ảnh ra, không sửa gì bên D:.

> Qwen-Image-2.1 chỉ được dùng **phi thương mại**. Nếu sau này bán game hoặc kiếm tiền từ game, phải đổi model hoặc xin giấy phép thương mại.

Ảnh thô (`qwen/ra_*`) và ảnh xem thử (`qwen/xem`) không đưa lên repo vì nặng. Ảnh game dùng đã nằm trong `assets/`. Muốn chạy lại `dong_goi` hay `xem` trên máy mới thì sinh lại ảnh thô theo các bước dưới.

Đặt `PY=D:\Yuyuko_QwenImage\env\Scripts\python.exe` và chạy từ thư mục game. Mọi danh sách nhân vật, dáng và ảnh nền nằm ở đầu [cong_cu.py](cong_cu.py).

## Nhân vật

| Nhân vật | Thư mục trong game | Khung |
|---|---|---|
| Mầm (người chơi) | `assets/player/` | `mam` (đứng) và 11 khung: `chay1-3`, `nhay`, `roi`, `chem`, `chem_len`, `chem_xuong`, `luot`, `dau`, `hoi` |
| 4 tinh linh | `assets/heroes/` | Chỉ cần ảnh gốc: game cho bay, nhấp nhô, tỏa sáng |
| Quái, boss | `assets/enemies/` | Ảnh gốc: game tự lật hướng, co giãn, rung khi trúng đòn |

Game chọn khung của Mầm theo trạng thái (chạy, nhảy, chém...). Thiếu khung nào thì dùng ảnh đứng thay. Chưa có ảnh `mam.png` thì game vẽ Mầm bằng code.

## Quy trình

1. **Ảnh gốc**, 3 phương án mỗi nhân vật:
   ```
   PY qwen\cong_cu.py goc mam
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_goc.json qwen\ra_goc 24
   PY qwen\cong_cu.py xem goc
   ```
   Xem `qwen\xem\goc_*.jpg`, ghi số phương án chọn vào `qwen\chon.json`, ví dụ `"mam": {"goc": 2}`.
2. **Khung hoạt ảnh**, dựa vào ảnh gốc đã chọn để giữ đúng nhân vật:
   ```
   PY qwen\cong_cu.py dong_tac mam
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_dong_tac.json qwen\ra_dong_tac 24
   PY qwen\cong_cu.py xem dong_tac
   ```
   Ghi phương án từng khung vào `chon.json`: `"mam": {"goc": 2, "chay1": 1, "chem": 3, ...}`.
   Khung nào quay ngược hướng thì thêm `"lat": ["chem"]`.
   **Cách tốt hơn: bảng khung (sprite sheet).** Sinh từng khung riêng lẻ thì Qwen hay vẽ các khung gần giống nhau (2 khung chạy giống nhau 94%), nên hoạt ảnh trông như chỉ có 2 hình. Bảng khung cho Qwen vẽ cả chuỗi động tác trong **một ảnh**, các khung xếp một hàng từ trái sang phải, rồi cắt ra:
   ```
   PY qwen\cong_cu.py bang mam            (hoặc bang mam:chay để làm riêng một động tác)
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_bang.json qwen\ra_bang 24
   PY qwen\cong_cu.py xem bang
   ```
   Mỗi động tác có một bảng `qwen\xem\bang_mam_<động tác>.jpg`, 3 phương án xếp dọc, vạch đỏ là chỗ sẽ cắt. Ghi vào `chon.json`:
   `"mam": {"goc": 2, "bang": {"chay": 1, "nhay": 3, ...}, "bo": {"chay": [4]}}` (`bo`: bỏ khung hỏng, đếm từ 1).
   Danh sách động tác và tả từng khung nằm ở `BANG` trong `cong_cu.py`. Khi đóng gói, số khung mỗi động tác được ghi vào `assets/player/khung.js`, game đọc file này và cho mỗi động tác chạy theo tiến độ (chạy theo quãng đường, chém theo thời gian đòn chém...). Động tác nào chưa có bảng thì game dùng khung lẻ ở trên.
3. **Ảnh nền nhiều lớp và mẫu ô gạch:**
   ```
   PY qwen\cong_cu.py nen
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_nen.json qwen\ra_nen 24
   PY qwen\cong_cu.py xem nen
   ```
   Ghi vào `chon.json`: `"nen": {"bai_bien_xa": 2, "bai_bien_gan": 1, "hang_xa": 3, "dao_rac_xa": 1, "o_cat": 2, "o_da": 1}`.
   Chỉ cần bản ban ngày: game tự nhuộm màu đêm của từng khu và phủ sương theo độ sạch của màn (xem mục "Không khí và ánh sáng" trong README).
4. **Đóng gói vào game:**
   ```
   PY qwen\cong_cu.py dong_goi
   ```
   Mọi khung của một nhân vật được đưa về cùng khổ vuông, chân chạm đáy, trọng tâm ở giữa, cùng độ lớn, nên khi đổi khung nhân vật không bị nhảy vị trí.
   Riêng Mầm (`neo_mat`) căn theo **mặt nạ trắng** (cùng cỡ, cùng chỗ) và **đáy thân** (đã lọc bỏ cán vợt, vệt chém mảnh), khổ 480 px, dòng chân ở 400 px. Vì vậy vợt chĩa lên hay xuống không làm Mầm nhảy vị trí. Đổi các số này thì sửa cả `MAM_DRAW` trong `js/render.js`. Ảnh nền xa thu về cao 540 px. Lớp gần (`bai_bien_gan`) đã được cắt sát nội dung nên giữ tỉ lệ, rộng 1600 px, game đặt sát đáy màn hình. Mẫu ô gạch về 192 px. Tải lại game là thấy.

Muốn làm lại riêng vài nhân vật: `PY qwen\cong_cu.py goc gio sen` (hoặc `dong_tac mam`) chỉ tạo việc cho các nhân vật đó. Đổi lời tả nhân vật thì phải sinh lại cả các khung của nhân vật đó để chúng khớp nhau.

## Tốc độ

Trên RTX 5080 Laptop ở chế độ Hiệu năng: ảnh 1024×1024 khoảng 40-90 giây, ảnh nền 1792×768 lâu hơn. Nếu thấy chậm bất thường (mỗi bước 7-12 giây), kiểm tra Lenovo Vantage đã để chế độ Hiệu năng chưa (Fn+Q).
