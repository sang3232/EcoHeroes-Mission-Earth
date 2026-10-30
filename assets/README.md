# Ảnh cho game (sinh bằng Qwen Image)

Game tự tìm ảnh PNG theo đúng đường dẫn bên dưới. Thiếu ảnh nào thì game vẽ emoji thay cho ảnh đó, nên bạn có thể thêm dần từng ảnh.
Sau khi thêm ảnh, tải lại trang (F5) là thấy.

## Quy trình

1. Dán **STYLE_PREFIX** vào đầu mọi prompt, giữ nguyên từng chữ để các ảnh cùng một phong cách.
2. Sinh 3-4 ảnh mỗi prompt, chọn 1 ảnh.
3. Tách nền thành PNG trong suốt (rembg hoặc BiRefNet). Riêng nền màn (`bg/`) thì giữ nguyên, không tách.
4. Thu nhỏ: nhân vật/quái 256×256, vật phẩm 128×128, boss 512×512, nền 1920×800 (tỉ lệ 960:400).
5. Lưu đúng tên file trong bảng.

**STYLE_PREFIX**

```
2D game asset, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, cute slightly chibi proportions, bright friendly colors, subtle paper texture, centered, no text, no watermark
```

Hậu tố cho ảnh cần tách nền (nhân vật, quái, vật phẩm, cây, sinh vật):

```
, plain white background
```

Đồ màu xanh lá (cây, rong biển, Gió) nên dùng `plain light gray background` để tách nền dễ hơn.

## Nền màn: `bg/`

Kích thước sinh: 1664×928 (16:9) rồi cắt về tỉ lệ 960:400 (2.4:1). Giữ phần giữa và nửa dưới, vì nhân vật đứng ở mép dưới.

| File | Prompt (sau STYLE_PREFIX) |
|---|---|
| `bg/m1_clean.png` | `wide side-scrolling 2D game background, a beautiful clean tropical beach, clear turquoise sea in the middle band, golden sand in the lower third, blue sky with soft clouds, empty open sand foreground for characters` |
| `bg/m1_polluted.png` | Cách 1, có **Qwen-Image-Edit**: đưa ảnh sạch vào và dùng prompt `Make the same scene heavily polluted: gray toxic purple fog, piles of plastic trash, murky brown water, dim gray-purple sky. Keep the composition identical.` Cách 2, chỉ có Qwen Image: img2img từ ảnh sạch, denoise 0.5-0.7, prompt `polluted beach, gray toxic fog, plastic trash piles, murky brown water, dim purple sky`. |

Game sẽ chuyển dần từ ảnh ô nhiễm sang ảnh sạch theo % độ sạch. Hai ảnh phải cùng bố cục.

## Nhân vật và quái có hoạt ảnh

Nhân vật (`heroes/`) và quái (`enemies/`) làm bằng công cụ trong thư mục `qwen/`, có 4 khung mỗi con: `id.png`, `id_chop.png`, `id_danh.png`, `id_dau.png`. Xem [qwen/HUONG_DAN.md](../qwen/HUONG_DAN.md). Hai bảng dưới đây chỉ để tham khảo nếu bạn muốn tự sinh tay.

## Nhân vật: `heroes/` (256×256)

| File | Prompt |
|---|---|
| `heroes/gau.png` | `a sturdy friendly brown bear guardian, armor made of recycled materials, leaf emblem on chest, full body, front view, standing` |
| `heroes/gio.png` | `a nimble wind spirit kid with swirling green leaf hair and a leaf scarf, holding a trash-picking net, full body, front view` |
| `heroes/sen.png` | `a gentle healer girl with a pink lotus flower hat, holding a glowing lotus staff, full body, front view` |
| `heroes/taiche.png` | `a cheerful robot made of recycled cans and bottles with a blue recycling symbol on its chest, full body, front view` |

## Quái: `enemies/` (256×256, boss 512×512)

| File | Prompt |
|---|---|
| `enemies/chai_lan.png` | `a cute angry monster made of a crumpled plastic water bottle, rolling, small arms, toxic gray-purple glow, full body, side view facing left` |
| `enemies/slime_nilon.png` | `a slime monster made of crumpled plastic bags with angry eyes, toxic purple-gray glow, full body, facing left` |
| `enemies/cua_lon.png` | `a crab monster built from rusty aluminum cans, big claws, grumpy face, full body, facing left` |
| `enemies/luoi_ma.png` | `a ghostly floating monster made of tangled old fishing net, hollow glowing eyes, full body, facing left` |
| `enemies/vua_nilon.png` | `a giant king monster made of countless plastic bags wearing a crown of bottle caps, menacing but cartoonish, full body, facing left` |

## Vật phẩm: `items/` (128×128)

Hậu tố riêng cho vật phẩm: `, game item icon, single object, three-quarter view, plain white background`

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
| `items/rao_chan.png` | `a small fence built from ecobricks protecting sea turtle eggs in the sand` |
| `items/dan_tach_rac.png` | `a sorting station with three colorful recycling bins on a wooden frame` |

## Cây: `trees/` (256×256)

| File | Prompt |
|---|---|
| `trees/muong_bien.png` | `a patch of beach morning glory vine with pink flowers creeping on sand` |
| `trees/phi_lao.png` | `a young casuarina tree with needle-like leaves, on sand` |
| `trees/dua.png` | `a small coconut palm tree with coconuts, on sand` |

## Sinh vật: `species/` (256×256)

| File | Prompt |
|---|---|
| `species/cong_gio.png` | `a cute pale ghost crab on sand, side view` |
| `species/rua_bien.png` | `a cute hawksbill sea turtle crawling on sand, side view` |

## Lưu ý

- Đừng nhờ Qwen vẽ chữ trong ảnh. Chữ tiếng Việt do game tự hiển thị bằng font.
- Bậc chất lượng của trang bị (Thô / Sạch / Tinh khiết) do game tô màu, không cần sinh 3 ảnh.
- Kiểm tra giấy phép của bản model bạn dùng trước khi phát hành game công khai.
