# BÁO CÁO MINH CHỨNG KIỂM THỬ — HỒI SINH XANH (ECO HEROES)

**Sản phẩm:** Game giáo dục môi trường “Hồi Sinh Xanh” (EcoHeroes), bản web HTML5
**Phạm vi đợt này:** Màn 2 — Rừng Ngập Mặn, trọng tâm là tính năng đặc biệt *Đom đóm về & Cổng Rừng*
**Ngày kiểm thử:** 18/11/2026
**Người phụ trách chính:** Trần Nguyên Bá
**Báo cáo & thiết kế banner:** Quách Gia Phước
**Giáo viên xác nhận (chờ ký):** Thầy Phi · Cô Hợp · Cô Sương

---

## 1. Kết luận nhanh

| Hạng mục | Kết quả |
|---|---|
| Quy trình 5 bước Màn 2 (B1–B5) | **ĐẠT 5/5** |
| Kiểm thử hồi quy tự động (quests, đường đi, puzzle M2, đăng nhập/đăng ký) | **ĐẠT 4/4** |
| Tính đúng đắn số liệu trên web — **20 bot do AI tạo, không phải học sinh thật** | **ĐẠT** (633 phép so khớp + 53 kiểm tra trên web thật, 0 lỗi — mục 7) |
| Video tính năng đặc biệt (đom đóm + cổng rừng) | **ĐẠT** (1:13, đúng 1–3 phút) |
| Video quy trình kiểm thử | **ĐẠT** (26s, đúng 10–30 giây) |
| Ảnh minh chứng UX/UI | **ĐẠT** (11 màn desktop + mobile) |
| Bảng thống kê `.xlsx` | **ĐÃ XUẤT** (5 sheet, số liệu repo/test thật) |
| Dữ liệu lớp học thật + biên bản GV | **CHƯA CÓ — chờ giáo viên** (xem mục 10) |

> **Tuyên bố trung thực:** Toàn bộ video và ảnh trong gói này được ghi bằng kịch bản tự động
> (Playwright điều khiển Microsoft Edge trên bản chạy thật của game). Đây là **demo tự động**,
> **không phải** buổi kiểm thử có người dùng thật. Các phần cần con người (tài khoản lớp học,
> số liệu lớp, nhận xét sư phạm và chữ ký giáo viên) **không được bịa** và đang để trống chờ xử lý.
>
> **Kiểm thử số liệu web dùng AI:** quy mô kiểm thử chỉ gồm **20 học sinh ảo (bot)**. Bot, kịch bản và
> phép so sánh đều do **AI (Claude)** viết và chạy; tên hiện là “HS ảo 01–20”, ảnh chụp có dải chữ đỏ ghi rõ.
> Đây **không** phải số liệu lớp học thật và không thay cho buổi thử với học sinh thật (mục 10).

---

## 2. Phạm vi kiểm thử

1. **Chức năng cốt lõi Màn 2:** vườn đom đóm 6 ô (4 tối + 2 sáng), điều kiện mở cổng, cảnh
   đom đóm hội tụ, cổng sáng rồi biến mất, đi qua cổng sang phòng mới.
2. **Hồi quy:** hệ nhiệm vụ, đường đi 10 phòng, hai bước giải Cổng Rừng.
3. **UX/UI:** trang chủ, đăng nhập học sinh/giáo viên, ôn tập, thống kê, HUD trong game,
   hội thoại, menu tạm dừng, giao diện mobile 390px.
4. **Minh chứng đa phương tiện:** 2 video + 5 ảnh quy trình + 11 ảnh UX/UI + 1 file `.xlsx`.
5. **Đăng nhập / đăng ký:** kiểm tra tự động mã `js/web/tai_khoan.js` (không tạo tài khoản thật).
6. **Tính đúng đắn số liệu trên web (20 bot AI):** bot gửi kết quả lên lớp, trang học sinh, bảng điều
   khiển giáo viên, file Excel/PDF xuất ra.

**Ngoài phạm vi (chưa làm được):** đăng nhập bằng tài khoản Supabase thật, xuất số liệu lớp học
thật, khảo sát người dùng thật, ký biên bản của giáo viên.

---

## 3. Môi trường kiểm thử

| Thành phần | Giá trị |
|---|---|
| Hệ điều hành | Windows 11 Pro |
| Trình duyệt | Microsoft Edge 157.0.4341.60 (headless) |
| Công cụ điều khiển | Playwright (playwright-core) |
| Máy chủ | Server tĩnh cục bộ phục vụ thư mục repo |
| Độ phân giải ghi hình | 1280 × 720, 25 fps, VP9 (webm) |
| Mã nguồn | Nhánh `main`, commit `d69fa01` — *feat(m2): đom đóm tụ về, cổng rừng sáng rồi biến mất* |

---

## 4. Phương pháp và giới hạn

**Đã làm (AI tự động hoá được):**

- Dựng kịch bản điều khiển game như người chơi: đi bộ bằng phím `A/D`, nhảy `Space`,
  tương tác `E`, bấm nút trong bảng trồng cây — **không gọi hàm nội bộ để “làm hộ” hành vi**.
- Ghi hình toàn bộ phiên chạy, chèn phụ đề mô tả bước bằng lớp phủ DOM (ghi rõ trong báo cáo).
- Chạy lại 3 bộ kiểm thử hồi quy bằng Node và ghi nhận nguyên văn kết quả.
- Trích xuất số liệu kỹ thuật thật từ repo (số tệp, số dòng, commit, môi trường).
- Viết và chạy **20 học sinh ảo (bot)** để kiểm tra trang web tính số liệu lớp học đúng (mục 7).
- Viết test đăng nhập / đăng ký chạy bằng Node, không cần mạng.

**Giới hạn phải nói rõ:**

- Video có dùng **lệnh gỡ lỗi sẵn có trong game** (`GL('man2')`, `GL('sach')`, `GL('toi ...')`)
  để rút ngắn phần dẫn nhập và đặt vị trí; riêng phần trồng cây, chờ cây lớn, hội tụ đom đóm
  và mở cổng là **diễn ra thật theo thời gian thật** (~25 giây mỗi cây bần).
- Video tính năng đặc biệt có đặt sẵn 40 hạt giống và đánh dấu nhiệm vụ “Bắc lối qua lạch” đã
  xong để không phải diễn lại 20 phút đầu Màn 2. Điều này **đã ghi trong phụ đề/báo cáo**.
- Phụ đề và slide tiêu đề/kết quả là **lớp phủ hậu kỳ**, không phải thành phần của game.
- Một số khung hình có toast của game (nhiệm vụ mới, sổ quái vật) chồng lên phụ đề — đây là
  hiện trạng thật của UI, được ghi nhận ở mục 8 (UX-3) chứ không phải lỗi dàn dựng.

---

## 5. Kết quả kiểm thử chức năng Màn 2

| Mã | Bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|
| B1 | Vào Màn 2 — Rặng Bần | 6 ô trồng: 4 ô tối + 2 ô dưới đèn | Đúng 6 ô, 4 tối bên trái, 2 sáng bên phải | ĐẠT |
| B2 | Mở cổng khi **chưa** đủ 4 cây bần | Cổng khóa, tinh linh nhắc điều kiện + số cây hiện có | Mầm: “Hiện có 0/4 cây bần đã lớn ở chỗ tối.”, Hoa Sen nhắc đom đóm sợ ánh đèn, Mầm nhắc “trồng đủ 4 cây ở ô tối” | ĐẠT |
| B3 | **Đủ** 4 cây bần lớn ở ô tối | Đom đóm tụ về, nhiệm vụ hoàn thành | Cảnh “Đom đóm đang tụ về kín rặng bần…”, toast hoàn thành nhiệm vụ, cộng 6 hạt giống | ĐẠT |
| B4 | Cổng sáng lên rồi biến mất | Hiệu ứng đom đóm hội tụ, cổng mờ dần, ghi nhớ đã xem cảnh | Hoa Sen: “Cổng sáng lên… rồi biến mất!”, `congRungDaXem = true`, cổng không còn chắn đường | ĐẠT |
| B5 | Đi qua Cổng Rừng | Sang phòng mới, đường thông | Vào Hang Lưới Ma, hiện banner “Khu vực mới” | ĐẠT |

**Điều kiện mở cổng (kiểm chứng trong mã và trong phiên chạy):**

```
gateSolved() = congRung && congRungDaXem
```

Cổng chỉ mở sau khi cảnh đom đóm ở Cửa Rừng chạy xong. Người chơi đứng ở cổng khi chưa đủ
điều kiện sẽ nhận hội thoại nhắc việc, không mở được. Đây là điểm sửa chính của đợt này
(trước đó cổng có thể mở ngay khi vừa đủ cây mà không cần cảnh).

---

## 6. Kiểm thử hồi quy tự động

| Lệnh | Nội dung | Kết quả nguyên văn (rút gọn) | Trạng thái |
|---|---|---|---|
| `node kiem_tra/quests.js` | Hệ nhiệm vụ + vườn đom đóm | 4/4 ✓ — “Hệ nhiệm vụ và vườn đom đóm chạy đúng. Không có lỗi.” | ĐẠT |
| `node kiem_tra/duong_di.js` | Đường đi 10 phòng | “Tới được cả 10 phòng… Từ phòng nào cũng về được Bến Đước. Không có lỗi.” | ĐẠT |
| `node kiem_tra/m2_puzzle.js` | Cống nước + Đom đóm + Cổng Rừng | “Cống nước: 300 lần xáo đều giải được… Cổng Rừng giải được ở cả hai bước. Không có lỗi.” | ĐẠT |
| `node kiem_tra/thu_trong_trang.js` | Bảng trồng cây | `ReferenceError: window is not defined` | KHÔNG CHẠY ĐƯỢC (lỗi có sẵn từ trước — tệp này cần môi trường trình duyệt, không liên quan thay đổi cổng rừng) |
| `node kiem_tra/tai_khoan.js` | Đăng nhập HS, đăng ký GV, quên / đổi mật khẩu, đăng xuất | 25/25 ✓ — “Đăng nhập / đăng ký chạy đúng. Không có lỗi.” | ĐẠT |
| `node kiem_tra/bot_lop_hoc.js` | Số liệu web với **20 bot AI** | “Tổng: 633 phép so khớp, 0 sai lệch.” | ĐẠT |
| `node kiem_tra/bot_lop_hoc_web.mjs` | Trang web thật với **20 bot AI** | “Tổng: 53 kiểm tra đạt, 0 không đạt.” | ĐẠT |

Ngoài ra `node --check` đã chạy sạch trên cả 6 tệp thay đổi của commit `d69fa01`.

---

## 7. Kiểm thử tính đúng đắn của dữ liệu trên web — 20 bot AI

> **Quy mô: 20 học sinh ảo (bot) do AI (Claude) tạo và chạy. Không có học sinh thật.**
> Mục đích là kiểm tra web **tính và hiển thị đúng** số liệu, không phải đo kết quả học tập.

**Cách làm**

1. `kiem_tra/bot_lop_hoc/sinh_du_lieu.js` tạo 20 bot “HS ảo 01–20” với năng lực khác nhau (0,41–0,96).
   18 bot chơi trong 4 tuần, 2 bot không chơi. Bot dùng dữ liệu thật của game: món rác và thùng đúng
   của Cổng Phân Loại và Lều ném rác, 18 ô trồng cây thật của Màn 1–2, ngân hàng câu hỏi Flashcard thật.
   Kết quả có đúng định dạng game ghi. Có hạt giống nên chạy lại ra đúng bộ dữ liệu.
2. Mỗi bot **tự đếm** câu đúng/sai của nó trong lúc chơi. Số này là đáp án độc lập để so với số web tính ra.
3. `kiem_tra/bot_lop_hoc.js` (Node): đưa 468 kết quả của bot qua đúng mã web dùng (`js/web/tinh_so_lieu.js`)
   rồi so từng chỉ số của từng em và cả lớp. Đã chạy thêm 4 hạt giống khác (1, 7, 99, 12345): đều 0 sai lệch.
   Đã thử cố ý làm sai một món và gửi trùng một bài: bài thử đều bắt được.
4. `kiem_tra/bot_lop_hoc_web.mjs`: mở **trang web thật** bằng Microsoft Edge (Playwright). Mã web giữ nguyên;
   chỉ máy chủ Supabase được thay bằng cơ sở dữ liệu giả trong máy. Mọi yêu cầu tới Supabase thật bị chặn
   và đếm: **0 yêu cầu**.

**Kết quả** (lần chạy 18/11/2026, Edge 157.0.4341.60 (headless))

| Kiểm tra | Kết quả |
|---|---|
| Số liệu web so với số bot tự đếm (20 em, cả lớp, xu hướng tuần, món hay nhầm) | 633 phép so khớp, **0 sai lệch** |
| Bot gửi kết quả bằng `js/web/dong_bo.js` | 18 bot gửi đủ 468/468 kết quả; gửi lại **không bị trùng**; kết quả của bạn khác trên cùng máy **không bị gửi nhầm** |
| Trang Thống kê của từng học sinh | 18 trang × 7 ô số khớp |
| Bảng điều khiển giáo viên: tab Lớp học, ô số, bảng từng em, 2 biểu đồ | Khớp |
| File Excel xuất từ web (Tổng hợp, Từng học sinh 280 ô, Lượt chơi 468 dòng, Món hay nhầm) | Khớp từng ô |
| File PDF xuất từ web | Tạo được, 2 trang |
| Lỗi JavaScript trên trang | 0 |
| **Tổng trên web thật** | **53 đạt, 0 không đạt** |

Số liệu cả lớp của 20 bot (chỉ để đối chiếu, **không phải số liệu học sinh thật**): 18/20 em đã chơi,
độ chính xác minigame 64%, Flashcard 73%, tỉ lệ trồng cây 52%.

**Giới hạn phải nói rõ**

- Bot không điều khiển nhân vật trong game; bot tạo kết quả đúng định dạng game ghi. Phần chơi game thật
  đã có ở mục 5 (video, ảnh).
- Không thử chính sách bảo vệ dữ liệu (RLS) của Supabase thật và không gọi AI tóm tắt, vì máy chủ là bản giả.
- Bảng tiến độ trồng cây (`tien_do`) được nạp thẳng vào máy chủ giả, vì `dong_bo.js` chỉ gửi bảng này
  khi đang ở trang game.
- Ảnh có dải chữ đỏ “20 học sinh ảo (bot) do AI tạo…” do bài thử in lên, không phải giao diện web.

Bằng chứng: thư mục `Bot_AI_20_HS_ao/` (4 ảnh, file Excel và PDF xuất từ web, dữ liệu bot `du_lieu_20_bot.json`,
kết quả `ket_qua_node.txt`, `ket_qua_web.txt`) và sheet “Kiem thu 20 bot AI” trong `Result/thong-ke-kiem-thu.xlsx`.

---

## 8. Đánh giá UX/UI (quan sát thật trong phiên kiểm thử)

| # | Vị trí | Quan sát | Loại | Đề xuất |
|---|---|---|---|---|
| UX-1 | Rặng Bần — lúc chờ cây lớn | Đứng chờ ~25 giây có thể bị Slime Nilon đánh, máu giảm thật (thấy trong video đặc biệt) | Quan sát thật | Cân nhắc vùng an toàn quanh vườn ươm hoặc giảm quái khi có cảnh chờ |
| UX-2 | Ô đã trồng cây | Gợi ý đổi thành “E Đào cây lên” — đúng logic nhưng dễ nhầm với trồng | Quan sát thật | Giữ nguyên; có thể đổi màu/biểu tượng gợi ý theo trạng thái ô |
| UX-3 | Toast trong game | Nhiều toast cùng lúc (nhiệm vụ mới + sổ quái vật + “Bạn có biết?”) chồng nhau ở đáy màn hình | Quan sát thật | Giới hạn 2 toast đồng thời hoặc xếp hàng chờ |
| UX-4 | Sau cảnh mở đầu | Hộp “Chọn độ khó” hiện đúng một lần, bấm ✕ giữ mức Thường | Hành vi thiết kế | Đã kiểm tra: OK |
| UX-5 | Mở khoá loài | Modal “Cô Trăng/Đom đóm đã quay về!” chặn mọi thao tác cho tới khi đóng | Hành vi thiết kế | Đúng ý đồ; nên nhắc trong hướng dẫn |
| UX-6 | Mobile 390 × 844 | Trang chủ và đăng nhập hiển thị đủ, không vỡ bố cục | Quan sát thật | OK |
| UX-7 | Trang Thống kê (học sinh) | Web ghép sẵn chữ “Lớp” trước tên lớp: lớp tên “Lớp ảo…” hiện thành “Lớp Lớp ảo…” (thấy khi chạy 20 bot AI) | Quan sát thật | Chỉ ghép “Lớp” khi tên lớp chưa có chữ này |

Ảnh tương ứng nằm trong `UX-UI/` (đánh số 01–11).

---

## 9. Số liệu kỹ thuật (trích xuất thật từ repo)

Đếm tại commit `d69fa01` (`git show d69fa01:<tệp>` rồi đếm dòng), soát lại ngày 18/11/2026. Bản đầu ghi
14.155 / 580 / 969 / 15.704 dòng, lệch 54 dòng so với mã đã commit.

| Chỉ số | Giá trị |
|---|---|
| Tệp JS/HTML/CSS | 56 |
| Dòng mã JS | 14.108 |
| Dòng HTML | 575 |
| Dòng CSS | 967 |
| Tổng | 15.650 dòng |
| Tệp thay đổi trong commit tính năng | 6 |
| Số phòng đã dựng | Màn 1: 13 phòng · Màn 2: 10 phòng |
| Số chương trong bản đồ thế giới | 8 (m1–m2 đã chơi được, m3–m8 “sắp ra mắt”) |

---

## 10. Việc chưa thể hoàn thành (chờ con người)

| # | Hạng mục | Vì sao chưa làm | Ai cần làm |
|---|---|---|---|
| 1 | Ảnh chụp tài khoản Học sinh/Giáo viên thật | Không có tài khoản Supabase của lớp; không được tạo tài khoản giả rồi gọi là minh chứng | GV tạo tài khoản trên trang Giáo viên rồi chụp |
| 2 | Xuất `.xlsx` số liệu lớp học thật | Trang Thống kê chỉ có dữ liệu thật khi có tài khoản thật và học sinh chơi thật. Đã có bản xuất từ **20 bot AI** để kiểm tra web (mục 7), không thay cho số liệu thật | GV xuất từ `thong-ke.html`, dán vào sheet “Du lieu lop hoc (cho GV)” |
| 3 | Khảo sát UX/UI với người dùng thật | Cần học sinh thật chơi và trả lời; video hiện tại là demo tự động | GV tổ chức 1 buổi, ghi phiếu |
| 4 | Biên bản nghiệm thu sản phẩm | Cần chữ ký và nhận xét sư phạm | Thầy Phi / Cô Hợp / Cô Sương ký `Result/Bien_ban_kiem_thu_san_pham.md` |
| 5 | Duyệt “Tổng quan nội dung theo chương” | Cần GV đối chiếu kiến thức SGK/Khí hậu | GV duyệt `Bao_cao/Tong_quan_noi_dung_theo_chuong.md` |
| 6 | Test `thu_trong_trang.js` trong Node | Tệp cần `window` của trình duyệt (lỗi có sẵn) | Nhóm phát triển (không thuộc phạm vi đợt này) |

---

## 11. Phụ lục A — Cấu trúc gói minh chứng

```
Minh chứng kiểm thử/
├── README.md                      (mục lục + ghi chú)
├── Bao_cao/
│   ├── Bao_cao_kiem_thu.md/.pdf
│   ├── Tong_quan_noi_dung_theo_chuong.md   (chờ GV duyệt)
│   └── banner_nhap.png            (bản nháp thiết kế)
├── Test/
│   ├── images/01..05_*.png        (5 bước quy trình)
│   └── video/
│       ├── quy-trinh-kiem-thu-man-2.webm          (26,2 giây)
│       └── tinh-nang-dac-biet-dom-dom-cong-rung.webm (1 phút 13 giây)
├── User/
│   ├── Học sinh/01_dang_nhap_hoc_sinh.png   (màn đăng nhập — CHƯA có tài khoản thật)
│   └── Giáo viên/01_dang_nhap_giao_vien.png (màn đăng nhập — CHƯA có tài khoản thật)
├── UX-UI/01..11_*.png             (11 màn desktop + mobile)
├── Bot_AI_20_HS_ao/              (kiểm thử số liệu web bằng 20 bot AI — KHÔNG phải HS thật)
│   ├── gv_tab_lop_hoc.png, gv_tab_phan_tich.png, hs_ao_10_trang_thong_ke.png, hs_bot_khong_choi.png
│   ├── xuat_tu_web_bao_cao_lop_20_bot.xlsx/.pdf   (file web xuất ra với dữ liệu bot)
│   ├── du_lieu_20_bot.json        (dữ liệu bot)
│   └── ket_qua_node.txt/.json, ket_qua_web.txt/.json
└── Result/
    ├── thong-ke-kiem-thu.xlsx     (6 sheet, có sheet “Kiem thu 20 bot AI”)
    ├── Bao_cao_ket_qua.md/.pdf
    └── Bien_ban_kiem_thu_san_pham.md  (mẫu — chờ ký)
```

## 12. Phụ lục B — Cách chạy lại

```powershell
# Kiểm thử hồi quy (không cần trình duyệt)
node kiem_tra/quests.js
node kiem_tra/duong_di.js
node kiem_tra/m2_puzzle.js
node kiem_tra/tai_khoan.js

# Số liệu web với 20 bot AI (không cần trình duyệt)
node kiem_tra/bot_lop_hoc.js

# Trang web thật với 20 bot AI (cần Microsoft Edge và playwright-core)
npm i -D playwright-core
node kiem_tra/bot_lop_hoc_web.mjs

# Mở game để tự kiểm tra bằng tay
# Dùng một server tĩnh bất kỳ tại thư mục repo, ví dụ:
npx serve .        # rồi mở http://localhost:3000/hoi-sinh-xanh.html
```

Điều khiển: `A/D` di chuyển, `Space` nhảy, `X` tấn công, `E` tương tác, `Esc` bỏ qua cảnh/mở menu.
