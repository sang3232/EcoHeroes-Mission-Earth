# Hồi Sinh Xanh

Game hành động 2D kiểu Hollow Knight về bảo vệ môi trường. Bạn điều khiển **Mầm**, Vệ Binh Xanh cuối cùng, dọn rác và giải cứu bốn tinh linh để mang ánh sáng trở lại **Màn 1: Bãi biển nhựa**.

## Chạy game

Bấm đúp `index.html` để mở bằng Chrome hoặc Edge, không cần cài gì thêm. Game tự lưu trong trình duyệt khi bạn ngồi ở Trạm Tái Chế, khi sang phòng mới và khi nhặt đồ quan trọng.

Điện thoại: mở bằng trình duyệt rồi xoay ngang máy, nút cảm ứng sẽ tự hiện.

## Điều khiển

| Hành động | Bàn phím | Tay cầm |
|---|---|---|
| Chạy | ← → hoặc A D | Cần trái / D-pad |
| Nhảy (giữ lâu nhảy cao) | Space hoặc Z | A |
| Chém (kèm ↑ để chém lên, kèm ↓ khi đang nhảy để chém xuống bật nảy) | X hoặc J | X |
| Chém về phía con trỏ: trỏ trên đầu là chém lên, dưới chân (khi đang nhảy) là chém xuống, còn lại chém ngang và nghiêng theo chuột | Chuột trái | |
| Lướt (khi có tinh linh Gió) | C, Shift hoặc K | RB |
| Hồi máu, giữ nút (khi có Hoa Sen) | F hoặc L | B |
| Đập xuống (khi có Gấu Rừng) | V hoặc I | Y |
| Ngồi Trạm, đọc, trồng cây, nhặt rác | ↑ hoặc E | ↑ |
| Xuống khỏi bục gỗ | ↓ + Nhảy | |
| Túi đồ / Bản đồ / Tạm dừng | Tab / M / Esc | Start |

## Có gì trong Màn 1

- **13 phòng nối nhau**, ban đầu tối nhất. Phá đống rác, giải cứu tinh linh và trồng cây thì bãi biển sáng dần. Hạ boss thì bình minh lên. Phòng boss luôn tối.
- **4 tinh linh mở đường**:
  - Hoa Sen: hồi máu.
  - Gió: lướt qua vực gai.
  - Gấu Rừng: đập vỡ nền rác nứt.
  - Tái Chế: hút nguyên liệu.
- **Trạm Tái Chế** (giống ghế ngồi trong Hollow Knight): lưu game, hồi máu, đổi bùa, chế đồ ở Xưởng, nâng cấp Vợt ở Bàn lọc, tìm công thức bí ẩn ở Bàn thí nghiệm.
- **Công cụ mở khu ẩn:** Kính Lúp đi xuyên tường giả, Xuồng Phao đi trên nước độc tới Đảo Rác.
- **Giải đố:**
  - Cổng Phân Loại: phân loại rác theo Luật Bảo vệ môi trường 2020.
  - Lều bỏ hoang: nhặt rác rồi ném vào đúng thùng.
- **Quái:** Chai Lăn, Slime Nilon, Cua Lon (vỏ đỡ đòn phía trước), Lưới Ma. Mini-boss Cua Lon Khổng Lồ, boss Vua Túi Nilon 2 pha.
- **4 Mảnh Lá** giấu trong các phòng, đủ 4 mảnh thì thêm 1 lá máu. Có Nhật ký, Sách Đỏ, thẻ "Bạn có biết?".
- **Trồng cây** ở phòng đã sạch, đủ điều kiện thì Còng gió và Rùa biển quay về.

## Cấu trúc

| File | Nội dung |
|---|---|
| `js/data.js` | Vật phẩm, công thức, tinh linh, quái, boss, puzzle, kiến thức. Cân bằng game sửa ở đây |
| `js/levels/m1.js` | 13 phòng Màn 1 vẽ bằng ký tự (ghi chú ký hiệu ở đầu file). Sửa màn không cần đụng code |
| `js/engine.js` | Bàn phím, tay cầm, cảm ứng; va chạm với lưới ô |
| `js/player.js` | Mầm: chạy, nhảy, lướt, chém, hồi máu, đập xuống |
| `js/enemies.js` | Quái, mini-boss, boss |
| `js/spirits.js` | Tinh linh bay theo |
| `js/world.js` | Phòng, chuyển phòng, đồ rơi, Trạm, lồng, cổng, ánh sáng, camera |
| `js/render.js` | Vẽ nền, ô gạch, nhân vật, ánh sáng và không khí (xem bên dưới), HUD |
| `js/systems.js` | Chế tạo, bùa, nâng Vợt, thí nghiệm, cây, sinh vật |
| `js/ui.js` | Menu tạm dừng, menu Trạm, bản đồ, hộp thoại, nút cảm ứng |
| `js/puzzle.js` | Puzzle Cổng Phân Loại |
| `js/gian_lan.js` | Mã gian lận để thử nhanh, gỡ được (xem bên dưới) |
| `qwen/` | Công cụ sinh ảnh bằng Qwen Image, xem `qwen/HUONG_DAN.md` |
| `kiem_tra/` | Công cụ kiểm tra màn chơi (xem bên dưới) |

## Kiểm tra

- `node kiem_tra/duong_di.js`: kiểm tra Màn 1 đi được hết theo đúng thứ tự nhận khả năng, mọi vật đều tới được, không phòng nào bị kẹt. Chạy lại mỗi khi sửa `js/levels/m1.js`.
- `kiem_tra/thu_trong_trang.js`: bộ thử chạy trong trang game (mô phỏng từng bước vật lý). Hướng dẫn nạp ở đầu file. Nếu đang bật mã gian lận thì gõ `tat` trước khi chạy.

## Mã gian lận (để thử nhanh)

Mở ô gõ mã:
- **Máy tính:** nhấn phím **`** (cạnh số 1), gõ mã rồi Enter. Esc để đóng. Game tạm dừng khi ô đang mở.
- **Điện thoại:** chạm nhanh 5 lần vào góc trên bên trái màn chơi (chỗ quả cầu năng lượng).
- **Console** của trình duyệt: `GL('battu')`, `GL('toi hang vua')`, `GL('?')`.
- Mở `index.html?thu=1` để hiện thêm **bảng nút bấm** ở đầu màn hình: chọn phòng để tới, đủ tinh linh, công cụ, nguyên liệu, sạch 100%, bất tử, bay, hộp va chạm, hạ boss.

Gõ có dấu hay không dấu, có cách hay không đều được: "bất tử", "bat tu", "battu" là một.

| Mã | Tác dụng |
|---|---|
| `battu` | Bật/tắt bất tử: quái, gai, nước độc không làm mất máu |
| `bay` | Bật/tắt bay xuyên tường: phím hướng để bay, giữ Lướt để bay nhanh, không mất máu |
| `mau` | Đầy máu |
| `themla` | Thêm 1 lá máu tối đa |
| `nangluong` | Bật/tắt năng lượng luôn đầy |
| `tinhlinh` | Có đủ 4 tinh linh |
| `congcu` | Có Kính Lúp, Xuồng Phao, Rào Chắn và 3 bùa (đeo bùa ở Trạm) |
| `giau` | +20 mỗi nguyên liệu, +30 hạt giống, đầy năng lượng |
| `tatca` | Gộp `tinhlinh`, `congcu`, `giau`, `mau` |
| `sach` | Phá hết đống rác cả màn (độ sạch 100%) |
| `toi <tên phòng>` | Dịch chuyển, ví dụ `toi hang vua`, `toi dao rac`. Gõ `toi` để xem tên các phòng |
| `hetquai` | Hạ hết quái trong phòng (không tính boss) |
| `boss` | Hạ boss của phòng đang đứng |
| `binhminh` | Coi như đã hạ Vua Túi Nilon, bình minh lên |
| `sang <0-100>` | Ép độ sáng để xem không khí, ví dụ `sang 0` (tối nhất), `sang 100`. Gõ `sang` để trả về bình thường |
| `cham` | Bật/tắt quay chậm ×¼, để xem kỹ hoạt ảnh và đòn đánh |
| `nhanh` | Bật/tắt chạy nhanh gấp đôi |
| `hop` | Bật/tắt hiện hộp va chạm: Mầm (xanh), vùng chém (vàng), quái (đỏ), đạn (cam), hướng chuột (trắng) |
| `xoaluu` | Xoá save, chơi lại từ đầu (có hỏi lại) |
| `tat` | Tắt mọi mã đang bật |
| `?` | Xem danh sách mã |

Mã nào đang bật thì hiện ở góc dưới bên trái (🧪). Các mã bật/tắt được nhớ trong thẻ trình duyệt đang mở, tải lại trang vẫn còn. Đóng thẻ thì mất.

**Gỡ khỏi game** (trước khi phát hành): xoá file `js/gian_lan.js` và dòng `<script src="js/gian_lan.js">` ở cuối `index.html`. Không cần sửa gì khác: file này tự móc vào game từ bên ngoài, game không gọi tới nó. Gỡ xong thì phím `, chạm 5 lần, `GL()` và `?thu=1` đều không còn tác dụng. Còn sót một biến `HSX.DEBUG_GOD` trong `js/player.js`, giữ lại vì bộ thử trong `kiem_tra/` dùng nó, và nó không làm gì khi không ai bật.

## Không khí và ánh sáng

Mỗi khung hình vẽ theo lớp, từ xa tới gần:

1. **Nền xa** (ảnh Qwen ban ngày) nhân với màu đêm của khu, phủ sương nhẹ ở đường chân trời và một dải sương trôi chậm.
2. **Cảnh** (đất, vật, quái, Mầm) vẽ lên lớp riêng rồi **nhân với bản đồ sáng**: màu bóng tối của khu (xanh đêm ở bãi biển, xanh lục lam trong hang, tím ở Đảo Rác và phòng boss) cộng các nguồn sáng có màu (đèn lồng vàng, Trạm xanh lá, lồng giam tím...). Vì là phép nhân nên chỗ tối vẫn giữ màu và chi tiết, và đất đá tối hơn nền nên nổi thành khối. Lòng đất càng sâu càng tối, mép trên có vệt sáng.
3. **Viền**: Mầm có viền xanh nhạt, quái có viền tím, cùng ánh trăng hắt lên mép trên. Viền vẽ sau ánh sáng nên luôn thấy rõ trong bóng tối. Vệt chém cũng vẽ sau ánh sáng.
4. **Quầng sáng** quanh nguồn sáng, **tia sáng** chéo từ trên (trăng xanh khi tối, nắng vàng khi sáng), **sương gần** sát đáy, **bụi lấp lánh** (sáng hơn khi bay gần nguồn sáng), **tiền cảnh** (bóng cỏ, đá, rác sát đáy phòng, thạch nhũ trên trần hang), **viền tối mép màn hình**.

Màn càng sạch thì các màu này càng tiến về ban ngày. Màu từng khu nằm ở `MOOD` đầu `js/render.js`, màu viền ở `RIM`.

## Ảnh

Mầm (37 khung hoạt ảnh cắt từ bảng khung), tinh linh, quái, boss, ảnh nền và mẫu ô gạch đã sinh bằng Qwen. Thiếu ảnh nào thì game tự vẽ thay (Mầm vẽ bằng code, vật phẩm dùng emoji). Muốn đổi hoặc sinh thêm ảnh, xem [qwen/HUONG_DAN.md](qwen/HUONG_DAN.md).

Ảnh trong game sinh bằng Qwen-Image-2.1, model này chỉ được dùng **phi thương mại**. Muốn bán game hoặc kiếm tiền từ game thì phải đổi model hoặc xin giấy phép thương mại.
