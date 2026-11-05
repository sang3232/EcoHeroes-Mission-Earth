# Ảnh cho game (sinh bằng Qwen Image)

Game **chỉ tải những ảnh có trong `assets/manifest.js`**. Ảnh nào chưa có thì dùng emoji / code vẽ thay,
nên không còn lỗi 404 và có thể thêm ảnh dần từng cái.

**Sau khi thêm, xoá hoặc đổi tên ảnh, chạy lại:**

```
node kiem_tra/tao_manifest.js
```

rồi tải lại trang (F5). Quên bước này thì ảnh mới sẽ không hiện (game coi như chưa có).

## Quy trình

1. Dán **STYLE_PREFIX** vào đầu mọi prompt, giữ nguyên từng chữ để các ảnh cùng một phong cách.
2. Sinh 3-4 ảnh mỗi prompt, chọn 1 ảnh.
3. Tách nền thành PNG trong suốt (rembg hoặc BiRefNet). Riêng nền màn (`bg/`) thì giữ nguyên, không tách.
4. Thu nhỏ: nhân vật/quái 256×256, vật phẩm 128×128, boss 512×512, nền 1260×540 (hoặc 960×400).
5. Lưu đúng tên file trong bảng dưới, rồi chạy `node kiem_tra/tao_manifest.js`.

**STYLE_PREFIX**

```
2D game asset, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, cute slightly chibi proportions, bright friendly colors, subtle paper texture, centered, no text, no watermark
```

Hậu tố cho ảnh cần tách nền (nhân vật, quái, vật phẩm, cây, sinh vật):

```
, plain white background
```

Đồ màu xanh lá (cây, rong biển, Gió) nên dùng `plain light gray background` để tách nền dễ hơn.

## Đang có gì

| Thư mục | Trạng thái | Ghi chú |
|---|---|---|
| `bg/` | ✅ đủ | 11 ảnh nền; các lớp xa không có trong suốt được lưu `.jpg` cho nhẹ |
| `player/` | ✅ đủ | khung Mầm + hoạt ảnh cắt từ bảng Qwen |
| `enemies/` | ✅ đủ | 5 quái + 2 boss kèm khung hoạt ảnh |
| `heroes/` | ✅ đủ | 4 tinh linh |
| `npc/`, `props/` | ✅ đủ | Mẹ Dược, đồ vật Qwen |
| `items/` | ⏳ **chưa có** | 22 vật phẩm, đang dùng emoji |
| `trees/` | ⏳ **chưa có** | 5 loài cây, đang dùng emoji |
| `species/` | ⏳ **chưa có** | 5 loài vật, đang dùng emoji |

## Nền màn: `bg/`

Ảnh nền rộng hơn khung nhìn để lia camera. Lớp xa (`*_xa`) và bản đồ thế giới (`the_gioi`) là ảnh đặc,
lưu JPEG; lớp gần (`*_gan`) có vùng trong suốt nên phải giữ PNG.

| File | Dùng cho |
|---|---|
| `bg/bai_bien_xa.jpg` | Bãi Biển Nhựa — lớp xa (Màn 1) |
| `bg/bai_bien_gan.png` | Bãi Biển Nhựa — lớp gần, có trong suốt |
| `bg/hang_xa.jpg` | Hang sau bãi biển |
| `bg/dao_rac_xa.jpg` | Đảo Rác |
| `bg/rung_xa.jpg` | Rừng Ngập Mặn — lớp xa (Màn 2) |
| `bg/rung_gan.png` | Rừng Ngập Mặn — lớp gần, có trong suốt |
| `bg/dam_xa.jpg` | Đầm tôm |
| `bg/the_gioi.jpg` | Bản đồ thế giới (8 màn) |
| `bg/o_cat.png` | Ô gạch nền cát (lặp lại) |
| `bg/o_da.png` | Ô gạch nền đá (lặp lại) |
| `bg/o_bun.png` | Ô gạch nền bùn (lặp lại) |

Prompt tham khảo cho cảnh sạch / ô nhiễm: dùng Qwen-Image-Edit với ảnh sạch và prompt
`Make the same scene heavily polluted: gray toxic purple fog, piles of plastic trash, murky brown water, dim gray-purple sky. Keep the composition identical.`
Hai ảnh phải cùng bố cục để game chuyển dần theo % độ sạch.

## Nhân vật và quái có hoạt ảnh

Nhân vật (`heroes/`) và quái (`enemies/`) làm bằng công cụ trong thư mục `qwen/`, có 4 khung mỗi con:
`id.png`, `id_chop.png`, `id_danh.png`, `id_dau.png`. Xem [qwen/HUONG_DAN.md](../qwen/HUONG_DAN.md).

## Vật phẩm còn thiếu: `items/` (128×128)

Hậu tố riêng: `, game item icon, single object, three-quarter view, plain white background`

| File | Prompt |
|---|---|
| `items/chai_pet.png` | `an empty crumpled plastic water bottle` |
| `items/tui_nilon.png` | `a crumpled thin plastic bag` |
| `items/lon_nhom.png` | `a dented aluminum soda can` |
| `items/luoi_cu.png` | `a bundle of tangled old green fishing net` |
| `items/vo_so.png` | `a pretty seashell` |
| `items/rong_bien.png` | `a clump of fresh green seaweed` |
| `items/manh_thuy_tinh.png` | `a few smooth frosted pieces of sea glass, aqua and green` |
| `items/hat_nhua.png` | `a small pile of colorful recycled plastic pellets` |
| `items/day_thung.png` | `a coiled rope braided from old fishing net` |
| `items/ong_nhua.png` | `a short recycled plastic pipe` |
| `items/phao_nhua.png` | `a float made of plastic bottles tied together with rope` |
| `items/gach_sinh_thai.png` | `an ecobrick: a plastic bottle tightly stuffed with colorful plastic bags` |
| `items/compost.png` | `a small sack of dark rich compost with leaves` |
| `items/vot.png` | `a long-handled litter-picking net made of a plastic pipe and fishing net, patched with tape` |
| `items/khien_lon.png` | `a round shield made of flattened aluminum cans riveted together, colorful can labels` |
| `items/chuong_gio.png` | `a wind chime made of seashells hanging from rope` |
| `items/phao_quay_dau.png` | `a floating boom barrier of plastic bottle floats linked with net and rope` |
| `items/kinh_lup.png` | `a magnifying glass with a frame made of recycled plastic and a sea glass lens` |
| `items/xuong_phao.png` | `a small raft boat made of empty plastic bottles tied together with rope` |
| `items/na_tai_che.png` | `a slingshot made of a Y-shaped driftwood branch and recycled rubber bands` |
| `items/rao_chan.png` | `a small fence built from ecobricks protecting sea turtle eggs in the sand` |
| `items/dan_tach_rac.png` | `a sorting station with three colorful recycling bins on a wooden frame` |

## Cây còn thiếu: `trees/` (256×256)

| File | Prompt |
|---|---|
| `trees/muong_bien.png` | `a patch of beach morning glory vine with pink flowers creeping on sand` |
| `trees/phi_lao.png` | `a young casuarina tree with needle-like leaves, on sand` |
| `trees/dua.png` | `a small coconut palm tree with coconuts, on sand` |
| `trees/duoc.png` | `a young mangrove tree with stilt roots rising above mud` |
| `trees/ban.png` | `a small mangrove apple tree with round leaves and white flowers, on mud` |

## Sinh vật còn thiếu: `species/` (256×256)

| File | Prompt |
|---|---|
| `species/cong_gio.png` | `a cute pale ghost crab on sand, side view` |
| `species/rua_bien.png` | `a cute hawksbill sea turtle crawling on sand, side view` |
| `species/ca_thoi_loi.png` | `a cute mudskipper fish with big eyes resting on mud, side view` |
| `species/dom_dom.png` | `a cute firefly with glowing yellow-green abdomen on a mangrove leaf, side view` |
| `species/co_trang.png` | `a cute white egret standing in shallow mangrove water, side view` |

## Lưu ý

- Đừng nhờ Qwen vẽ chữ trong ảnh. Chữ tiếng Việt do game tự hiển thị bằng font.
- Bậc chất lượng của trang bị (Thô / Sạch / Tinh khiết) do game tô màu, không cần sinh 3 ảnh.
- Ảnh nền lớn nên nén: PNG chỉ dùng khi cần trong suốt, còn lại lưu JPEG chất lượng 88-92.
- Kiểm tra giấy phép của bản model bạn dùng trước khi phát hành game công khai.
