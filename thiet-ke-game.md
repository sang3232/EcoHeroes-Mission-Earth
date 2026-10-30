# Hồi Sinh Xanh — Thiết kế v2: vật phẩm, liên kết, khám phá, art

> **Cập nhật:** game đã chuyển từ idle sang hành động kiểu Hollow Knight.
> - Người chơi điều khiển Mầm. Gấu Rừng, Gió, Hoa Sen, Tái Chế thành tinh linh hỗ trợ mở đường.
> - Không còn idle. Màn chơi tối dần sáng lên theo độ sạch.
> - Trang bị đổi thành bùa, bậc chất lượng thành cấp Vợt. Lưới bản đồ đổi thành 13 phòng nối nhau.
>
> Ba luật vật phẩm, kinh tế tuần hoàn, công thức bí ẩn, sinh vật và kế hoạch art bên dưới vẫn giữ. Xem [README.md](README.md) để biết lối chơi hiện tại.

Game idle 2D bảo vệ môi trường. Mỗi màn gồm: dọn dẹp tự động (idle) → cổng giải đố → boss → phục hồi môi trường.
Tài liệu này bổ sung hệ vật phẩm dùng được, các liên kết giữa đồ, cơ chế khám phá, và kế hoạch làm art bằng Qwen Image.

---

## 1. Ba luật cho mọi vật phẩm

> Không có rác, chỉ có tài nguyên đặt sai chỗ.

1. **Dùng được.** Mỗi vật phẩm có ít nhất 1 công dụng trong 4 trụ: **Chiến đấu / Giải đố / Khám phá / Phục hồi**. Không có đồ chỉ để ngắm; đồ sưu tầm cũng cho buff.
2. **Nối được.** Mỗi vật phẩm là đầu vào hoặc đầu ra của ít nhất 1 công thức khác, và có mặt ở từ 2 màn trở lên.
3. **Mở ra điều mới.** Mỗi công cụ mở một thứ cụ thể: ô bí ẩn, khu ẩn, công thức ẩn hoặc một loài vật.

## 2. Vòng tuần hoàn (kinh tế tuần hoàn)

```
Đánh quái ──► rơi Rác (nguyên liệu thô) ──► Xưởng Tái Chế ──► Vật phẩm dùng được
   ▲                                                              │
   │                                                              ▼
Mở khu mới ◄── Khám phá (đồ mở ô bí ẩn) ◄── Giải đố / Phục hồi (dùng đồ)
```

Idle hóa: xưởng có **hàng đợi chế tạo** chạy cả khi offline; đội phụ có thể **về màn cũ farm nguyên liệu nền**; trang bị có **quy tắc tự dùng** (ví dụ "dùng Thuốc lọc khi máu < 30%").

## 3. Nguyên liệu thô theo màn

Tám nhóm vật liệu (tag): **Nhựa, Kim loại, Thủy tinh, Giấy, Hữu cơ, Hóa chất, Điện tử, Sinh học**.

| Màn | Nguyên liệu rơi |
|---|---|
| 1. Bãi biển nhựa | Chai PET, túi nilon, lon nhôm, lưới cũ, vỏ sò, rong biển |
| 2. Sông chết | Bùn độc, cát, sỏi, can HDPE, ống nhựa, lục bình |
| 3. Rừng cháy | Than củi, cành khô, lá, hạt giống, nhựa thông, bào tử nấm |
| 4. Thành phố khói bụi | Pin cũ, dây đồng, mạch điện, kính vỡ, bìa giấy, bụi mịn |
| 5. Rạn san hô | Dầu thô, lưới ma, mảnh san hô, tảo cộng sinh, vi nhựa, xơ dừa |
| 6. Băng cực | Lõi băng, muội than, bình khí CO₂, kim loại lạnh |
| 7. Màn cuối | Phế liệu tổng hợp, lõi thải |

## 4. Xưởng Tái Chế và chất lượng

**4 trạm:** Máy nghiền (nhựa/kim loại → hạt, phôi) · Lò ủ phân (hữu cơ → compost, biogas) · Bàn lọc (bùn/dầu → than hoạt tính, nước sạch) · Bàn mạch (điện tử → linh kiện).

**Ba bậc chất lượng, không ngẫu nhiên:**

| Bậc | Cách đạt | Hệ số |
|---|---|---|
| Thô | Chế thẳng từ rác | ×1 |
| Sạch | Đi qua Bàn lọc (rửa) trước khi chế | ×1.5 |
| Tinh khiết | Rửa + xử lý thêm ở trạm thứ hai | ×2.5 |

Chất lượng phản ánh mức bạn xử lý rác cẩn thận đến đâu. Không có gacha, hợp với đối tượng học sinh.

## 5. Danh mục vật phẩm dùng được

### 5.1 Chiến đấu (trang bị, tự dùng khi idle)

| Vật phẩm | Công thức | Hiệu ứng | Mở ra / dùng với |
|---|---|---|---|
| Vợt Bắt Rác | 2 Ống nhựa + Lưới cũ (M1) | +50% sát thương lên quái Nhựa; +10% nguyên liệu rơi | Xé lớp túi của boss M1 |
| Khiên Lon | 3 Lon nhôm + Dây (M1) | Tanker: giảm sát thương, phản 10% | Bộ Tái Chế |
| Súng Nước Lọc | Ống nhựa + Than hoạt tính (M2) | Nước sạch làm quái Bùn mất giáp, hồi nhẹ đồng đội | Bộ Thủy Sinh |
| Lựu Phân Hữu Cơ | Rác hữu cơ + Chai (M3) | Nổ vùng, khóa quái Tro, mọc cây tại chỗ (ô buff) | Bộ Gieo Mầm |
| Pin Mặt Trời Mini | Lon nhôm + Dây đồng + Pin cũ (M4) | +% tốc độ đánh; cấp điện cho công cụ | Đèn Pin, Máy Dò |
| Khẩu Trang Lọc | Than hoạt tính (M2) + Hạt nhựa (M1) + Giấy (M4) | Miễn nhiễm Sương Đặc, giảm sát thương độc theo thời gian | Khu nhà máy bỏ hoang |
| Bó Hút Dầu | Xơ dừa + Lưới (M5) | Giảm giáp quái Dầu, dọn vệt dầu | Boss M5 |

### 5.2 Giải đố (dụng cụ)

| Vật phẩm | Công thức | Hiệu ứng |
|---|---|---|
| Kính Lúp Phân Loại | Thủy tinh + Khung nhựa (M1) | Hiện số nhựa/nhãn của rác khó phân loại |
| Máy Đo pH | Pin + Dây + Ống thủy tinh (M2) | Hiện chỉ số nước từng đoạn ống |
| Mối Nối Ống | Kim loại + HDPE (M2) | Thêm 1 đoạn ống trong puzzle nối ống |
| Sơ Đồ Gợi Ý | Giấy tái chế (M4) | Hiện 1 bước giải. Gợi ý chế được, không bắt trả tiền |

### 5.3 Khám phá (công cụ mở khóa)

| Vật phẩm | Công thức | Mở ra |
|---|---|---|
| Xuồng Phao | 4 Phao nhựa (M1) + Dây | Đảo Rác (M1), Đảo Bùn (M2), vùng biển M5 |
| Đèn Pin Mặt Trời | Pin Mặt Trời Mini + Kính | Hang Tối dưới sông, hầm tàu chìm |
| Dây & Móc Leo | Dây lưới + Kim loại | Vách đá, tầng thượng nhà máy |
| Máy Dò Kim Loại | Mạch + Cuộn dây (M4) | Biến ô Thường thành ô Kho (kho chôn vùi) |
| Ống Nhòm Sinh Học | Thủy tinh + Giấy + Nhựa | Thấy dấu vết loài vật, mở ô Sinh cảnh |

### 5.4 Phục hồi (công trình và vật tư)

| Vật phẩm | Công thức | Hiệu ứng idle |
|---|---|---|
| Hạt giống theo loài (Cói, Đước, Sen, Tràm...) | Nhặt/ươm | Trồng cây, mỗi loài một chỉ số khác nhau |
| Phân Compost | Hữu cơ + Lá | Cây lớn nhanh ×2 |
| Tổ Chim / Hộp Ong | Giấy ép + Nhựa | Là điều kiện để loài vật quay về |
| Bể Lọc 3 Tầng | Cát + Sỏi + Than hoạt tính (M2) | Tự biến nước bẩn thành nước sạch, +Nước sạch/phút |
| Máy Ủ Phân | Kim loại + Hữu cơ | Tự chuyển rác hữu cơ thành compost |
| Tấm Pin Mặt Trời Lớn | Nhiều Pin Mini | +Năng lượng xanh/giây, cấp điện cho công trình |
| Dàn Tách Rác | Phần thưởng puzzle phân loại M1 | Tự phân loại rác thô thành nguyên liệu |

## 6. Liên kết giữa các đồ

**6.1 Chuỗi xuyên màn (buộc phải quay lại màn cũ):**
- Chai PET (M1) → Hạt nhựa → Phao → **Xuồng Phao** → qua sông M2, mở Đảo Bùn, sau này mở biển M5.
- Cát + Sỏi + Than củi (M3) → **Bể Lọc** → Nước sạch + **Than hoạt tính** → dùng cho Khẩu Trang Lọc (M4).
- **Pin Mặt Trời Mini** (M4) + Kính → **Đèn Pin** → vào Hang Tối ở M2 (quay lại màn 2).
- Hữu cơ (M1/M3) → Compost → Cây giống cấp 2 → đủ cây thì Voọc (M3) quay về.

**6.2 Bộ trang bị (set bonus):**

| Bộ | Thành phần | 2 món | 3-4 món |
|---|---|---|---|
| Tái Chế | Vợt, Khiên Lon, Dàn Tách Rác | +20% nguyên liệu rơi | 15% chế tạo không tốn nguyên liệu |
| Thủy Sinh | Súng Nước, Bể Lọc, Máy pH, Xuồng | Nước sạch +25% | Quái Bùn bị giảm 30% sát thương |
| Quang Năng | Pin Mini, Đèn Pin, Tấm Pin Lớn | Năng lượng xanh +25% | Công cụ không tốn pin |
| Gieo Mầm | Hạt giống, Compost, Lựu Phân, Tổ Chim | Cây lớn +25% | Mỗi đợt dọn mọc thêm cây |

**6.3 Khắc chế quái:** Nhựa ← Vợt · Bùn ← nước sạch · Tro ← compost/cây · Khói ← lọc + pin mặt trời (giảm nguồn khói) · Dầu ← Bó Hút Dầu · Nhiệt ← cây + tấm phản quang.

**6.4 Đồ ↔ puzzle:** dụng cụ chỉ thay đổi *luật* puzzle (thêm đoạn ống, hiện nhãn, gợi ý), không giải thay. Puzzle thưởng lại công thức/công trình (ví dụ puzzle phân loại thưởng Dàn Tách Rác).

**6.5 Đồ ↔ sinh vật:** loài vật quay về khi đủ điều kiện sinh cảnh.

| Loài | Điều kiện | Buff idle |
|---|---|---|
| Rùa biển | Bãi cát sạch ≥80% + rào chắn ổ trứng | +% Hạt giống từ màn biển |
| Cò / Cá | Nước sạch + Sen | +% Nước sạch |
| Voọc | Đủ tán cây + cầu dây | +% sát thương hệ Rừng |
| Ong | Hoa + Hộp Ong | Cây lớn nhanh hơn |

## 7. Khám phá

- **Lưới sương mù.** Mỗi màn là lưới ~6×4 vùng bị Sương che. Dọn đủ % thì lộ vùng kế bên. Loại vùng: Thường · Kho · Bí ẩn (cần đồ) · Sinh cảnh · Tàn tích (lore + công thức) · Boss.
- **Phái thám hiểm (idle).** Chọn 1 hero phụ + 1-2 công cụ + một vùng đã lộ, chạy thời gian thực (10 phút đến 8 giờ). Công cụ quyết định kết quả: Máy Dò → ra Kho, Ống Nhòm → ra Sinh vật, Xuồng → tới đảo. Thất bại vẫn trả một ít nguyên liệu.
- **Khu ẩn cần dụng cụ.** Đi tiếp màn mới, nhưng đồ mới làm quay lại màn cũ mở thêm khu (kiểu metroidvania nhẹ).
- **Bàn thí nghiệm.** Thử ghép tự do 2-3 nguyên liệu. Khoảng 40% công thức là ẩn, phải tự tìm hoặc lượm gợi ý ở Tàn tích. Ghép sai cho "Phế liệu hỗn hợp" và trả lại ~50% nguyên liệu, không bao giờ mất trắng.
- **Ba cuốn sổ:** Sổ Phát Minh (công thức) · Sổ Sách Đỏ (loài vật thật) · Bản Đồ (% khám phá). Thưởng ở mốc 25/50/75/100%.
- **Lore.** Các trang *Nhật ký của Người Gác Cũ* rải ở Tàn tích, dần lộ ra Tập Đoàn Ô Nhiễm đứng sau Sương Độc.
- **Sự kiện ngẫu nhiên (tùy chọn).** Mưa axit (Bể Lọc sinh thêm nước), thủy triều (đẩy rác mới vào bãi biển), mùa khô (cây lớn chậm hơn, cần compost).
- **Tái Sinh (prestige) giữ lại:** mọi công thức đã phát hiện, ba cuốn sổ, và 1 vật phẩm "Di vật" tự chọn.

## 8. Màn 1 chi tiết (phạm vi prototype)

- **Rơi:** chai PET, túi nilon, lon nhôm, lưới cũ, vỏ sò, rong biển.
- **Chế được:** Vợt Bắt Rác, Khiên Lon, Kính Lúp, Phao → Xuồng Phao.
- **Puzzle:** phân loại rác vào 3 thùng, tăng dần lên 5 thùng. Kính Lúp hỗ trợ. Thưởng **Dàn Tách Rác**.
- **Boss Vua Túi Nilon:** miễn sát thương cho đến khi bị Vợt xé lớp túi; triệu hồi nilon bay che màn hình, người chơi chạm để dọn.
- **Bí mật:** Đảo Rác (cần Xuồng Phao) có Nhật ký #1 và công thức ẩn "Phao Quây Dầu" dùng ở M5.
- **Kết quả phục hồi:** nền chuyển từ xám sang xanh theo %, rùa biển về khi bãi sạch ≥80%.

## 9. Kiểm tra thiết kế (mỗi vật phẩm mới phải qua)

- [ ] Có công dụng thật ở ≥1 trong 4 trụ?
- [ ] Là đầu vào hoặc đầu ra của công thức khác?
- [ ] Có mặt ở ≥2 màn?
- [ ] Mở ra thứ gì cụ thể (ô, khu, công thức, loài)?
- [ ] Có "Bạn có biết?" gắn với thế giới thật?

---

## 10. Kế hoạch art với Qwen Image

### 10.1 Bảng phong cách (khóa trước khi sinh hàng loạt)
- Tay vẽ 2D hoạt hình, tô bóng mềm, viền đậm vừa, tỷ lệ hơi chibi, màu tươi thân thiện.
- **Quy tắc màu:** ô nhiễm = tím độc, xám, nâu bùn; hồi sinh = xanh lá, ngọc, vàng nắng. Cùng một cảnh phải đọc được trạng thái chỉ bằng màu.

**STYLE_PREFIX** (dán đầu mọi prompt, giữ nguyên chữ từng từ):

```
2D game asset, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, cute slightly chibi proportions, bright friendly colors, subtle paper texture, centered, no text, no watermark
```

### 10.2 Mẫu prompt (điền vào {…})

| Loại | Mẫu |
|---|---|
| Icon vật phẩm | `{STYLE_PREFIX}, game item icon of {object}, single object, three-quarter view, plain white background` |
| Nhân vật / quái | `{STYLE_PREFIX}, {character description}, full body, front view, plain white background` |
| Nền màn | `{STYLE_PREFIX}, wide side-scrolling 2D game background, {scene}, empty open foreground for characters, 16:9` |
| Công trình / trạm | `{STYLE_PREFIX}, {building}, side view, plain white background` |

### 10.3 Prompt mẫu cho màn 1

- **Vợt Bắt Rác:** `a long-handled litter-picking net made of a plastic pipe and fishing net, patched with tape`
- **Khiên Lon:** `a round shield made of flattened aluminum cans riveted together, colorful can labels`
- **Xuồng Phao:** `a small raft boat made of empty plastic bottles tied together with rope`
- **Slime nilon:** `a slime monster made of crumpled plastic bags with angry eyes, toxic purple-gray glow`
- **Boss Vua Túi Nilon:** `a giant king monster made of countless plastic bags wearing a crown of bottle caps, menacing but cartoonish`
- **Hero (Vệ Binh Xanh):** `a young eco guardian, green leaf scarf, armor made of recycled materials, holding a trash net`
- **Rùa biển:** `a cute hawksbill sea turtle, side view`
- **Nền sạch:** `a beautiful clean beach with palm trees, clear turquoise water, blue sky, soft clouds`

### 10.4 Hai trạng thái bản đồ (sạch / ô nhiễm)
1. Sinh ảnh nền **sạch** trước, chọn ảnh ưng ý.
2. Tạo bản **ô nhiễm** giữ nguyên bố cục:
   - Nếu có **Qwen-Image-Edit**: `Make the same scene heavily polluted: gray toxic fog, piles of trash, dead palms, murky brown water, dim purple sky. Keep the composition identical.`
   - Nếu chỉ có Qwen Image thường: dùng img2img với denoise thấp (khoảng 0.5-0.7) cùng prompt ô nhiễm.
3. Trong game, **crossfade** giữa hai ảnh theo % dọn dẹp (hoặc sinh thêm 25/50/75% nếu muốn mượt hơn). Một hiệu ứng rẻ mà rất "đã".

### 10.5 Quy trình sản xuất
1. Cố định STYLE_PREFIX, sinh thử 3-4 ảnh/prompt, chọn 1.
2. Dùng **nền trắng trơn**; riêng đồ màu xanh lá dùng nền xám đậm hoặc magenta để tách nền dễ hơn.
3. Tách nền (rembg hoặc BiRefNet) → ảnh PNG trong suốt.
4. Thu về 128/256 px, đóng gói atlas (free-tex-packer hoặc TexturePacker).
5. **Bậc chất lượng Thô/Sạch/Tinh khiết** làm bằng code (tint + viền sáng), không sinh 3 ảnh.
6. **Hoạt ảnh** làm bằng tween (nhún, co giãn, lắc) trên 1 sprite, không cần vẽ từng khung — hợp với idle.
7. **Chữ trong game** render bằng font, không nhờ Qwen vẽ chữ tiếng Việt (dấu dễ sai).

### 10.6 Số lượng asset ước tính (~110 ảnh)

| Nhóm | Số lượng |
|---|---|
| Vật phẩm và nguyên liệu | ~45 |
| Hero | 4 |
| Quái và boss | ~20 |
| Nền (sạch + ô nhiễm) | 7 × 2 |
| Sinh vật (Sách Đỏ) | ~10 |
| Công trình / trạm / UI | ~20 |

### 10.7 Lưu ý
- Kích thước thường dùng: 1328×1328 cho icon, 1664×928 cho nền 16:9 (xác nhận lại với bản bạn cài).
- Kiểm tra giấy phép của bản model bạn đang dùng trước khi đưa game ra công khai.
- Chưa rõ máy bạn chạy Qwen Image bằng gì (ComfyUI, Python/diffusers…) và VRAM bao nhiêu; cần biết để viết script sinh hàng loạt.
