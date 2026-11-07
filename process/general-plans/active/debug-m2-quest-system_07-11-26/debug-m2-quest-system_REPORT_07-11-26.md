# DEBUG: Hệ thống nhiệm vụ Mẹ Đước + vườn đom đóm Màn 2 — Báo cáo chuyển giao

## 1. Executive Summary

- **Issue:** Redesign mini-game Cổng Rừng thành vườn trồng cây bần trên map (không modal), cần xẻng mở khoá qua nhiệm vụ Mẹ Đước, plus lệnh debug reset vườn.
- **Impact:** Người chơi chưa thể hoàn thành Cổng Rừng nếu hệ thống quest/đom đóm/xẻng có lỗi.
- **Root cause:** Hai vấn đề: (1) `veban` debug chỉ xóa cây `ran_ban` còn bỏ sót cây cầu rễ ở `nha_me_duoc` → quest `bac_cau` vẫn `xong`; (2) `bac_cau` cấp xẻng tự động trong `khiXong` thay vì qua lời thoại Mẹ Được.
- **Status:** Đã khôi phục, all tests pass.
- **Fix:** Thêm `recvBacCau(s)` (cap xẻng qua lời thoại), `veban` xóa cả `nha_me_duoc` + `ran_ban` + cổng.

## 2. Technical Analysis

### Timeline (các commit liên quan)

| Commit | Mô tả |
|--------|-------|
| `704c2ee` | feat(m2): vườn đom đóm trên map + hệ nhiệm vụ Mẹ Đước (ban đầu) |
| `4ec07d7` | fix(quest): `bac_cau` chỉ cấp xẻng qua lời thoại Mẹ Đước, thêm `veban` |
| `558a05f` | fix(debug): `veban` chỉ xóa `ran_ban`, bỏ sót `nha_me_duoc` |
| `0ae4d1f` | fix(debug): `veban` xóa cả `nha_me_duoc` + `ran_ban` + reset cổng |

### Chuỗi dữ liệu (data flow)

```
người chơi cắm đước nha_me_duoc[0]
  → Sys.tickTrees() phát hiện g >= 1
  → Quests.tick(dt) nhận thấy bac_cau.xong() == true
  → hoanThanh('bac_cau') → khiXong() thưởng 6 hạt (KHÔNG cấp xẻng)
  → người chơi nói chuyện Mẹ Được (npc 'me_duoc')
  → cot_truyen.npc() gọi Q.recvBacCau(s) → HSX.Sys.grant('xeng', 1)
  → sau đó Quests.tick() nhận moKhi('dom_dom') = true → bắt đầu dom_dom
  → người chơi trồng 4 bần ở ô tối ran_ban
  → dom_dom.xong() = domDomDat().ok == true
  → khiXong('dom_dom') → congRung = true, +6 hạt
  → gateSolved() = true → cổng Rừng mở (walkable)
```

### Cấu hình bản đồ `ran_ban` (js/levels/m2.js)

```
plantSang: [0,0,0,0,2,2]   // 6 ô: 4 tối + 2 sáng (gần đèn ở x=21)
plantNeed: 4
6 ô P ở x = 5,8,12,16,20,23 (hàng 11)
Đèn L ở hàng 9 x=21
Cửa gap: hàng 13 x=18,19 (liên rung_chet door 3)
```

### Hàm `domDomDat(def, trees)` (js/quests.js)

```js
for (let i = 0; i < sang.length; i++) {
  const t = trees && trees[i];
  if (!t || t.type !== 'ban' || t.g < 1) continue;   // bỏ qua mầm / cây khác
  if (sang[i] >= 2) sai++;                            // bần lớn ở ô sáng
  else dat++;                                         // bần lớn ở ô tối
}
return { dat, can: need, sai, ok: dat >= need && sai === 0 };
```

- Không phụ thuộc `species.dom_dom` unlock (đã bỏ `if (!HSX.S.species.dom_dom) return;` trong render.js).
- Firefly visuals chỉ hiện ở mature ban + ô tối (sang < 2).

## 3. Findings (đã xác nhận)

### F1: `veban` debug cũ không xóa cây cầu rễ (nha_me_duoc) — CONFIRMED
**Tác động:** Veban reset quest `bac_cau` về `moi` nhưng cây đước ở `nha_me_duoc[0]` vẫn còn → quest vẫn tính `xong` → cổng vẫn mở → debug không làm được mục đích "làm lại".
**Nguyên nhân:** Code cũ chỉ làm `s.trees.ran_ban = {}`, không xóa `s.trees.nha_me_duoc`.
**Fix:** `0ae4d1f` — thêm `s.trees.nha_me_duoc = {}` + `s.flags.congRung = false`.

### F2: `bac_cau.khiXong` cấp xẻng tự động — CONFIRMED (đã đổi theo yêu cầu)
**Tác động:** Xẻng được có ngay khi quest xong, không cần đi gặp Mẹ Được, vi phạm yêu cầu "phải đến chỗ mẹ đước hoàn thành thì mới lấy xẻng".
**Fix:** `4ec07d7` — `khiXong('bac_cau')` chỉ thưởng 6 hạt, xẻng cấp qua `Q.recvBacCau(s)` trong `cot_truyen.npc('me_duoc')` nhánh `daXong('bac_cau')`.

### F3: `dom_dom` moKhi yêu cầu `owned.xeng` — CONFIRMED (không thay đổi)
**Lý do:** Đảm bảo người chơi phải qua `bac_cau` trước, nhận xẻng, mới bắt đầu trồng bần. Đây là thiết kế cố ý.

### F4: Puzzle2 giữ nguyên làm dead code — CONFIRMED
**Lý do:** Gate không còn gọi `HSX.Puzzle2.open()` cho m2, nhưng code/UI/test Puzzle2 vẫn tồn tại để hạn chế blast radius, dọn sau.

### F5: `species.dom_dom` cond `tree: { ban: 2 }` vẫn còn — KHÔNG phải bug
**Giải thích:** Điều kiện unlock specie vẫn là 2 cây bần lớn (cho buff), nhưng firefly visuals không còn đợi species unlock (đã tách riêng trong render.js). Không ảnh hưởng quest.

## 4. Evidence (kết quả kiểm chứng)

```
node kiem_tra/quests.js:
  ✓ Rặng Bần: 6 ô trồng = 4 ô tối + 2 ô sáng, cần 4 cây bần.
  ✓ domDomDat: đếm đúng cây bần lớn, bỏ qua mầm/cây khác, báo ô quá sáng.
  ✓ Bắc cầu: nhận → chờ rễ → hoàn thành → đi nhà bà nhận xẻng → mở nhiệm vụ đom đóm.
  ✓ Đom đóm: chặn ô sáng → đủ 4 cây tối → mở cổng, thưởng đúng một lần.
  => Hệ nhiệm vụ và vườn đom đóm chạy đúng. Không có lỗi.

node kiem_tra/duong_di.js:
  m1: 13/13 phòng, m2: 10/10 phòng => Không có lỗi.

node kiem_tra/m2_puzzle.js:
  => Cổng Rừng giải được ở cả hai bước. Không có lỗi. (Puzzle2 dead code)

node --check (tất cả file JS): sạch, không lỗi cú pháp.
```

Verified qua script node trực tiếp cho `veban`:
```
TRƯỚC veban: {"congRung":true,"bac_cau":"xong","dom_dom":"xong","nha_me_duoc":1,"ran_ban":4}
SAU veban:   {"congRung":false,"bac_cau":"moi","dom_dom":"moi","nha_me_duoc":0,"ran_ban":0}
SAU tick:    {"congRung":false,"bac_cau":"dang","dom_dom":"dang"}
```

## 5. Recommendations

### Immediate (P0)

- [ ] **Không còn cần fix P0** — toàn bộ critical path đã verify qua node test.
- [ ] Nếu user muốn publish harness: chạy `vc-publish` trước khi push.

### Short-term (P1)

- [ ] **Playtest thực tế trong browser:** Mở `index.html`, đi Màn 2, chạy chuỗi `bac_cau` → nhận xẻng → trồng bần → mở cổng. Kiểm tra toast, ánh sáng, firefly.
- [ ] **Thêm regression test UI:** Kiểm tra `findInteract` trả về `{kind:'dig', cau:true}` khi cây là cầu rễ, và `{kind:'dig', cau:false}` khi không phải.
- [ ] **Kiểm tra save/load:** Lưu game sau khi `dom_dom` xong, reload, đảm bảo `congRung` và `quests` vẫn giữ.

### Long-term (P2)

- [ ] **Dọn dead code Puzzle2:** Xóa `js/puzzle.js`, `kiem_tra/m2_puzzle.js`, các script tag liên quan khi không còn màn dùng.
- [ ] **Thêm bảng nhiệm vụ (quest log):** `Quests.list()` đã có sẵn, cần UI hiển thị.
- [ ] **Thêm biểu tượng xẻng trong túi đồ:** `D.items.xeng` đã có, cần UI liệt kê tool.

## 6. Unresolved Questions

- Người chơi có thể trồng bần ở `ran_ban` trước khi nhận xẻng (plot có sẵn) — domDomDat ok nhưng congRung vẫn false vì dom_dom chưa bắt đầu. Cổng vẫn khóa. Đây là thiết kế cố ý, nhưng có thể gây mờ-angle người chơi. Cân nhắc thêm toast hướng dẫn nếu có bần nhưng chưa có xẻng.
- `veban` không reset `owned.xeng` (để người chơi không mất xẻng khi làm lại quest). Có thể gây dom_dom bắt đầu ngay sau veban nếu `bac_cau` vẫn xong — nhưng `veban` reset `bac_cau` về `moi`, nên moKhi dom_dom (cần xeng) vẫn true. Tức sau veban, dom_dom có thể restart ngay. Mong muốn là OK vì đây là lệnh debug.

## 7. Files đã thay đổi (11 files, commit bd5e631)

| File | Thay đổi |
|------|----------|
| `js/quests.js` (mới) | Universal quest engine + `domDomDat` + `recvBacCau` |
| `js/data.js` | Item `xeng`, journal 4, quest defs `bac_cau`/`dom_dom` |
| `js/levels/m2.js` | `ran_ban`: 6 plots, plantSang/plantNeed, đèn/cửa dịch, tips |
| `js/world.js` | Parse `sang`, `dig` interact, gate → cảnh `c_ung_rung_m2`, firefly light filter |
| `js/systems.js` | `Sys.digUp`, quest tick trong `tickTrees`, pollinate guard ran_ban |
| `js/render.js` | Bright-plot marker, fireflies chỉ ở dark plot |
| `js/state.js` | `quests` field + migration normalization |
| `js/cot_truyen.js` | Cảnh `c_ung_rung_m2`, `recvBacCau`, fix `neu` steps cần `buoc:[]` |
| `js/gian_lan.js` | Lệnh debug `veban` |
| `kiem_tra/quests.js` (mới) | Headless test quest + garden |

### Lỗi đã gặp và fix trong quá trình phát triển

- **`b.buoc is not iterable`** tại `hoi_thoai.js`: các bước `{ neu: ... }` trong cảnh `c_ung_rung_m2` thiếu `buoc: []`. Khi `neu()` trả về `true`, `hoi_thoai.js` cố spread `...b.buoc` với `undefined`. Fix: thêm `buoc: []` cho mọi bước `neu` không có bước con (`bd5e631`).

### Branch & Git

- Branch: `feature/ecoheroes-fixes`
- Commit cuối: `bd5e631 fix(m2): c_ung_rung_m2 neu steps need buoc:[]`
- 17 commits ahead, **chưa push**
- Working tree: sạch

## 8. Handoff Notes (cho người tiếp nhận)

1. Chạy `node kiem_tra/quests.js` trước khi commit bất kỳ thay đổi nào về quest.
2. Nếu sửa `js/quests.js`, phải cập nhật `kiem_tra/quests.js` theo.
3. `veban` chỉ dùng để test (gian_lan.js), không ship vào build chính thức trừ khi giữ.
4. Gate M2 không còn dùng `HSX.Puzzle2` — xóa dead code sau khi chắc chắn không màn khác gọi.