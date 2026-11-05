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
| Quái | `assets/enemies/` | Ảnh gốc: game tự lật hướng, co giãn, rung khi trúng đòn |
| Boss | `assets/enemies/` | Ảnh gốc và bảng khung cho từng động tác (xem mục bảng khung bên dưới) |
| Nhân vật phụ | `assets/npc/` | Ảnh gốc (Mẹ Đước). Game cho thở nhẹ, mặt dùng làm chân dung trong khung lời thoại |
| Đồ vật | `assets/props/` | Đống rác, Trạm Tái Chế, lồng, đèn lồng, giá nhật ký; Màn 2: đống rác đầm tôm, nhà sàn, cây đước |

Danh sách nhân vật ở `NHAN_VAT` trong `cong_cu.py`, nhân vật Màn 2 (`me_duoc`, `hop_xop`, `luoi_ma_khong_lo`) nằm sau dòng ghi chú `# Màn 2`. Chân dung trong khung lời thoại cắt tự động từ ảnh gốc (vùng có hình), riêng Mầm cắt theo `cat` trong `HSX.NGUOI` (`js/cot_truyen.js`).

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

   **Boss cũng dùng bảng khung:**
   ```
   PY qwen\cong_cu.py bang vua_nilon cua_khong_lo luoi_ma_khong_lo
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_bang.json qwen\ra_bang 24
   PY qwen\cong_cu.py xem bang
   PY qwen\cong_cu.py xem_dong vua_nilon cua_khong_lo luoi_ma_khong_lo
   ```
   - Vua Túi Nilon: `dung` (thở), `gam` (gầm: mở màn, sang pha 2, gọi Slime), `nem` (ném túi), `nhay` (nhảy đập đất), `lao`, `dau` (khựng lại khi bị xé lớp túi), `chet` (gục ngã).
   - Cua Lon Khổng Lồ (`cua_khong_lo`, dựa vào ảnh gốc của Cua Lon): `dung`, `di`, `dap` (giơ càng đập đất), `lao` (lấy đà rồi lao), `choang` (lật ngửa sau khi đâm tường), `chet`.
   - Lưới Ma Khổng Lồ (`luoi_ma_khong_lo`, Màn 2): `dung` (lơ lửng), `quang` (vung tay quăng lưới), `lao` (lao chéo xuống), `goi` (gầm, Lưới Ma nhỏ bứt ra), `dau`, `chet` (bung từng nút, cá cua thoát ra, còn lại đống lưới).
   - **Khung 1 của mọi bảng boss là dáng đứng bình thường.** Khi đóng gói, cả bảng được co để khung 1 cao bằng ảnh gốc, nên các động tác cùng cỡ với nhau. Mỗi khung căn đáy chạm dòng chân, tâm phần thân dưới ở giữa, rồi cắt sát cho nhẹ. Bỏ khung hỏng bằng `"bo"` như với Mầm (khung 1 vẫn được dùng làm chuẩn cỡ dù bị bỏ).
   - Ảnh ghi vào `assets/enemies/<boss>_<động tác>_<số>.png`, chỗ đặt từng khung trong khổ chung ghi vào `assets/enemies/khung.js` (`HSX.KHUNG_QUAI`, `HSX.KHUNG_QUAI_CO`). Đổi khổ chung (`TRUM_W`, `TRUM_H`, `TRUM_CHAN`, `TRUM_CAO`) thì game tự theo.
   - Game chọn khung theo trạng thái AI trong `bossFrame` (`js/render.js`), chỉ nạp ảnh khung khi vào phòng boss hoặc mở Sổ quái vật.
3. **Ảnh nền nhiều lớp và mẫu ô gạch:**
   ```
   PY qwen\cong_cu.py nen
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_nen.json qwen\ra_nen 24
   PY qwen\cong_cu.py xem nen
   ```
   Ghi vào `chon.json`: `"nen": {"bai_bien_xa": 2, "bai_bien_gan": 1, "hang_xa": 3, "dao_rac_xa": 1, "o_cat": 2, "o_da": 1}`.
   Màn 2 thêm `rung_xa` (rừng đước xa), `rung_gan` (lớp gần trong suốt: bóng rễ đước), `dam_xa` (đầm tôm bỏ hoang) và mẫu ô `o_bun` (bùn). Ô nào có `sang` (như `o_bun`, `sang=1.7`) thì khi đóng gói được làm sáng lên, vì bùn sinh ra quá tối, game phủ thêm lớp tối thì không còn thấy đất.
   Chỉ cần bản ban ngày: game tự nhuộm màu đêm của từng khu và phủ sương theo độ sạch của màn (xem mục "Không khí và ánh sáng" trong README).
   **Bản đồ thế giới** (`the_gioi`) sinh cùng lệnh `nen`: tranh bản đồ vẽ tay không có chữ, game đặt 8 mốc màn lên trên theo toạ độ phần trăm `x`, `y` trong `theGioi` (`js/data.js`). Đổi ảnh khác thì chỉnh lại các toạ độ này cho mốc nằm đúng chỗ.
4. **Đồ vật trong màn** (đống rác, Trạm Tái Chế, lồng tinh linh, đèn lồng, giá nhật ký), thay cho hình vẽ bằng code và emoji:
   ```
   PY qwen\cong_cu.py do_vat
   PY D:\Yuyuko_QwenImage\sinh_anh.py qwen\viec_do_vat.json qwen\ra_do_vat 24
   PY qwen\cong_cu.py xem do_vat
   ```
   Ghi vào `chon.json`: `"do_vat": {"dong_rac": [1, 3], "tram": 2, "long": 1, "den_long": 2, "nhat_ky": 3}`. Màn 2 thêm `dong_rac_dam` (rác đầm tôm: hộp xốp, bao cám, phao), `nha_san` (nhà Mẹ Đước), `cay_duoc` (cây đước đã lớn ở bãi bồi). Chọn nhiều phương án (dạng danh sách) thì game dùng xen kẽ, ví dụ các đống rác trông khác nhau. Ảnh ghi vào `assets/props/`, số kiểu của mỗi đồ vật ghi vào `assets/props/do_vat.js`. Đồ vật nào chưa có ảnh thì game vẫn vẽ bằng code.
5. **Đóng gói vào game:**
   ```
   PY qwen\cong_cu.py dong_goi
   node kiem_tra\tao_manifest.js
   ```
   Bước thứ hai ghi lại `assets/manifest.js`. Game chỉ tải ảnh có trong danh sách này (ảnh thiếu dùng emoji / code vẽ),
   nên quên bước đó thì ảnh vừa đóng gói sẽ không hiện.
   Mọi khung của một nhân vật được đưa về cùng khổ vuông, chân chạm đáy, trọng tâm ở giữa, cùng độ lớn, nên khi đổi khung nhân vật không bị nhảy vị trí.
   Riêng Mầm (`neo_mat`) căn theo **mặt nạ trắng** (cùng cỡ, cùng chỗ) và **đáy thân** (đã lọc bỏ cán vợt, vệt chém mảnh), khổ 480 px, dòng chân ở 400 px. Vì vậy vợt chĩa lên hay xuống không làm Mầm nhảy vị trí. Đổi các số này thì sửa cả `MAM_DRAW` trong `js/render.js`. Ảnh nền xa và bản đồ thế giới thu về cao 540 px. Lớp gần (`bai_bien_gan`, `rung_gan`) đã được cắt sát nội dung nên giữ tỉ lệ, rộng 1600 px, game đặt sát đáy màn hình (lớp rừng cao hơn nên game thu nhỏ cho không quá 300 px). Mẫu ô gạch về 192 px. Tải lại game là thấy.

Muốn làm lại riêng vài nhân vật: `PY qwen\cong_cu.py goc gio sen` (hoặc `dong_tac mam`) chỉ tạo việc cho các nhân vật đó. Đổi lời tả nhân vật thì phải sinh lại cả các khung của nhân vật đó để chúng khớp nhau.

## Tốc độ

Trên RTX 5080 Laptop ở chế độ Hiệu năng: ảnh 1024×1024 khoảng 40-90 giây, ảnh nền 1792×768 lâu hơn. Nếu thấy chậm bất thường (mỗi bước 7-12 giây), kiểm tra Lenovo Vantage đã để chế độ Hiệu năng chưa (Fn+Q).
