# Kế hoạch: Web Hồi Sinh Xanh: Giới thiệu, Trò chơi, Thống kê, tài khoản HS/GV

## Bối cảnh

Hiện tại web chỉ có game: `index.html` mở thẳng canvas, chưa có trang giới thiệu, tài khoản hay số liệu học tập.

Nhóm cần một web giống bản web-novel của nhóm (SchoolShield, repo henryba16/Web-novel), làm đẹp hơn, gồm:
- **Trang Giới thiệu** có phần mở đầu kể vì sao Mầm thức dậy giữa thế giới tàn lụi.
- **Tài khoản học sinh:** xem thống kê độ chính xác minigame, tỉ lệ trồng cây, và làm Flashcard Quiz.
- **Tài khoản giáo viên:** quản lý lớp, xem phân tích, đọc bản AI tóm tắt và đánh giá xu hướng bằng tiếng Việt, xuất file `.pdf` và `.xlsx`.

Các lựa chọn bạn đã chốt:
- Dùng **Supabase**, web vẫn ở **GitHub Pages**.
- **GV tạo tài khoản hộ HS**; HS đăng nhập bằng **mã lớp**.
- AI dùng **mô hình miễn phí trên OpenRouter trước**, hết thì chuyển sang mô hình rẻ trả phí.
- **Trang chủ là Giới thiệu.** Game chuyển sang một địa chỉ mang tên game: `hoi-sinh-xanh.html`.

Học từ web-novel: Supabase với RLS, mã lớp, prompt AI tiếng Việt có ràng buộc "không chẩn đoán, không xếp loại", chuỗi mô hình miễn phí có dự phòng, xuất file.

## Kiến trúc

```
GitHub Pages (tĩnh, không build)                 Supabase (miễn phí)
index.html        Giới thiệu + mở đầu      ┌──▶  Auth: GV dùng email; HS dùng email ảo <mãlớp>.<tên>@hs.hoisinhxanh.app
hoi-sinh-xanh.html  game (chơi khách vẫn được) │    Postgres + RLS: ho_so, lop, su_kien, tien_do, tom_tat_ai
on-tap.html       Flashcard Quiz            ──┤    Edge Functions (Deno):
thong-ke.html     HS: của mình / GV: dashboard │      quan-ly-hoc-sinh  (tạo HS, đặt lại mật khẩu, xoá; dùng service key có sẵn)
dang-nhap.html    HS: mã lớp / GV: email     └──▶    tom-tat-lop       (OpenRouter: miễn phí → trả phí; key để trong Secrets)
```

- Không có bước build. Thư viện tải qua CDN, ghi rõ phiên bản:
  - `@supabase/supabase-js@2` (jsdelivr)
  - Chart.js 4.4 (cdnjs)
  - SheetJS `xlsx` 0.18.5 (cdnjs)
  - jsPDF 2.5 và jspdf-autotable (cdnjs)
- Phông chữ PDF tiếng Việt: Noto Sans TTF (giấy phép OFL) để trong `assets/fonts/`.
- Game vẫn chạy offline bằng `file://` ở chế độ khách. CDN không tải được thì game vẫn chạy, chỉ không đồng bộ.

## Các bước

### 0. Chuẩn bị
- Cập nhật `main` local lên `origin/main` (đang chậm 23 commit, chỉ fast-forward).
- Tạo nhánh `web-tai-khoan-thong-ke`.
- Ghi kế hoạch theo quy ước của nhóm vào `process/general-plans/active/web-tai-khoan-thong-ke_PLAN_14-11-2026.md`.

### 1. Khung web và trang Giới thiệu (chưa cần Supabase)
- Đổi tên `index.html` thành `hoi-sinh-xanh.html`, giữ nguyên nội dung game.
- Trang `index.html` mới làm trang Giới thiệu.
- `css/web.css`: style riêng cho web, không đụng `css/style.css` của game.
  - Màu lấy từ game: `--green #4cc27a`, `--gold #e6b84a`, nền xanh đen.
  - Phông Be Vietnam Pro và Baloo 2 (Google Fonts, có tiếng Việt).
  - Thanh menu dính đầu trang, kiểu kính mờ.
  - Hiện dần khi cuộn (IntersectionObserver), parallax bằng nền game `assets/bg/*.png`. Tắt hiệu ứng khi máy bật `prefers-reduced-motion`.
  - Chạy tốt trên điện thoại.
- Menu: **Giới thiệu · Trò chơi ▾ (Hồi Sinh Xanh, Ôn tập Flashcard) · Thống kê · Đăng nhập / tên người dùng**.
- Các mục của trang Giới thiệu, theo thứ tự:
  1. **Hero:** ảnh bìa truyện, tên game, câu giới thiệu; các nút "Chơi ngay", "Đọc truyện", "Đăng nhập".
  2. **Mở đầu (kể khi cuộn):** vì sao Mầm ở hoàn cảnh này.
     - Dùng khung tranh không chữ của truyện, trang 1–2 (11 khung), nén sang WebP rồi để ở `assets/web/truyen/`.
     - Lời dẫn lấy từ kịch bản truyện, ghép với lore có sẵn trong game (`cot_truyen.js` cảnh `mo_dau`: thế giới Xanh Lam, Màn Sương Độc, các Vệ Binh Xanh biến mất dần, Mầm là hạt giống cuối cùng).
  3. **Vấn đề:** 3 thẻ số liệu có nguồn, lấy từ kịch bản YTAC.
  4. **Trò chơi:** thẻ tính năng (Cổng Phân Loại, Lều phân loại, trồng rừng ngập mặn, đánh boss, Flashcard).
  5. **Dành cho giáo viên:** dashboard làm được gì, kèm tiết học mẫu 4 bước.
  6. **Đọc truyện:** trình xem 24 trang truyện tranh.
  7. **Hỏi đáp và chân trang:** nguồn số liệu, công cụ AI đã dùng (Claude, Antigravity, GPT Sunburst, Lyria).

### 2. Ghi số liệu trong game (`js/thong_ke.js`, file mới)
Gắn theo kiểu `gian_lan.js`: dùng bus có sẵn `HSX.on/emit` (`js/state.js:52`).

Thêm 3 dòng emit vào code của henry. Duyệt kế hoạch này nghĩa là đồng ý sửa:
- `js/puzzle.js` `choose()` (~dòng 61–65): `HSX.emit('phanloai', {ten, nhom, chon, dung, vong, giay})`; `finish()` emit `phanloai_xong {sao, sai}`.
- `js/world.js` `updateSortItems` (~dòng 1006 nhánh đúng và nhánh sai): `HSX.emit('nemrac', {ten, thung, dung})`.
- `js/systems.js` `pollinate` (~dòng 272): thêm `tu: 'domdom'` vào sự kiện `'trong'`, để tách cây người chơi tự trồng với cây đom đóm thụ phấn.

`thong_ke.js` lắng nghe `phanloai`, `phanloai_xong`, `nemrac`, `trong`, `dao` và thời gian chơi:
- Bỏ qua khi đang xem lại trận (`HSX.PhatLai.dang`).
- Ghi vào hàng chờ riêng `hoi-sinh-xanh-hang-cho-thong-ke`, không dùng save. Mỗi sự kiện có `ma_su_kien` (uuid) để không bị ghi trùng.
- Nếu đã đăng nhập: cứ 30 giây, hoặc khi rời trang, đẩy lên `su_kien` và upsert `tien_do`.
  - `tien_do` gồm số ô đã trồng, tổng số ô, số cây trưởng thành, số sao Cổng Phân Loại cao nhất, thời gian chơi.
  - Tổng số ô = 18, đếm `P`/`Y` từ bản đồ bằng cách quét có sẵn ở `world.js:34-52`.
- Trong game có huy hiệu nhỏ "Đang lưu cho: Tên – Lớp", đặt trong tab Cài đặt (`ui.js tab_caidat`).

### 3. Flashcard Quiz (`on-tap.html`, `js/web/on_tap.js`)
- Bộ thẻ lấy từ dữ liệu game qua `js/data.js` (tự đứng được, không cần file khác):
  - `puzzle.items`: 17 món rác, kèm nhóm và gợi ý theo Luật BVMT 2020.
  - `facts`: 26 thẻ "Bạn có biết".
  - `species`: loài trong Sách Đỏ.
  - `trees`: các loài cây.
- Có 3 chủ đề: **Phân loại rác**, **Rừng ngập mặn**, **Sinh vật**.
- Hai chế độ:
  - **Lật thẻ:** học, có nút "Đã thuộc / Ôn lại".
  - **Kiểm tra:** 10 câu trắc nghiệm 4 đáp án, đáp án nhiễu lấy từ chính bộ dữ liệu. Có điểm, xem lại câu sai, và ghi `su_kien` loại `quiz` với kết quả từng câu.

### 4. Supabase: cơ sở dữ liệu, đăng nhập, hàm máy chủ (`supabase/` trong repo)
- `supabase/schema.sql` (bạn dán vào SQL Editor, chạy một lần):
  - `ho_so(id → auth.users, vai_tro 'giao_vien'|'hoc_sinh', ho_ten, ten_dang_nhap, lop_id)`
  - `lop(id, giao_vien_id, ten, ma_lop UNIQUE 6 ký tự dễ đọc)`
  - `su_kien(id, hoc_sinh_id, loai, du_lieu jsonb, dung, tong, luc, ma_su_kien UNIQUE)`
  - `tien_do(hoc_sinh_id PK, so_cay, so_o, so_cay_lon, sao_cong, thoi_gian, cap_nhat)`
  - `tom_tat_ai(id, lop_id, noi_dung, mo_hinh, tao_luc)`
- RLS:
  - HS chỉ đọc và ghi dữ liệu của chính mình.
  - GV đọc được dữ liệu HS thuộc các lớp mình dạy, qua hàm `la_gv_cua(hs)` (security definer).
  - GV toàn quyền với lớp của mình.
- Trigger tạo `ho_so` khi đăng ký GV.
- `supabase/functions/quan-ly-hoc-sinh` (chỉ GV gọi được, kiểm tra JWT và quyền sở hữu lớp):
  - `them`: dán danh sách tên → tạo tên đăng nhập kiểu `an.nguyen` (trùng thì thêm số) và mật khẩu 6 số → trả về danh sách một lần duy nhất để in phiếu.
  - `dat_lai_mat_khau`, `xoa`.
- `supabase/functions/tom-tat-lop`:
  - Kiểm tra GV, gom số liệu lớp, đổi tên HS thành mã HS01… trước khi gửi AI (bảo vệ riêng tư).
  - Gửi prompt tiếng Việt có cấu trúc: Tổng quan / Xu hướng / HS cần quan tâm / Gợi ý hoạt động / Giới hạn dữ liệu, kèm ràng buộc không chẩn đoán, không xếp loại.
  - Gọi chuỗi mô hình miễn phí đã kiểm tra trên `/models`; nếu tất cả lỗi 429/5xx thì dùng một mô hình rẻ trả phí, giới hạn `max_tokens`.
  - Lưu kết quả vào `tom_tat_ai`.
- `dang-nhap.html`:
  - Tab **Học sinh:** Mã lớp + Tên đăng nhập + Mật khẩu.
  - Tab **Giáo viên:** email và mật khẩu, có đăng ký và quên mật khẩu.
  - Đăng nhập xong: HS vào `thong-ke.html`, GV vào dashboard.
- `js/web/cau_hinh.js`: URL và publishable key của Supabase (là giá trị công khai, RLS bảo vệ dữ liệu). Không bao giờ để service key hay key OpenRouter trong web.

### 5. Trang Thống kê (`thong-ke.html`, nội dung theo vai trò)
- **Khách:** thống kê trên máy này, lấy từ hàng chờ local, kèm lời mời đăng nhập để lưu và xem lâu dài.
- **Học sinh:**
  1. **Độ chính xác minigame:** % đúng của Cổng Phân Loại và Lều ném rác, biểu đồ theo từng lượt, sao cao nhất, "món hay nhầm".
  2. **Tỉ lệ trồng cây:** số ô đã trồng / 18 ô, so với trung bình lớp; số cây trưởng thành, số loài.
  3. **Flashcard Quiz:** điểm trung bình, điểm theo chủ đề, nút ôn lại thẻ hay sai.
- **Giáo viên:**
  1. **Lớp học:**
     - Tạo lớp để lấy mã lớp.
     - Thêm HS bằng cách dán danh sách tên; in phiếu đăng nhập, hoặc tải `.xlsx`.
     - Danh sách HS có lần hoạt động gần nhất; đặt lại mật khẩu, xoá HS.
  2. **Phân tích dữ liệu:**
     - Ô số liệu: số HS đang hoạt động, độ chính xác trung bình, tỉ lệ trồng cây trung bình, điểm quiz trung bình.
     - Biểu đồ Chart.js: xu hướng theo tuần, phân bố theo HS, món rác lớp hay nhầm.
     - Bảng từng HS, sắp xếp được.
     - Nút **"AI tóm tắt & đánh giá xu hướng"** cho kết quả tiếng Việt, có dòng "chỉ phản ánh dữ liệu trong game".
     - **Xuất file:**
       - `.xlsx` gồm các sheet: Tổng hợp, Từng HS, Lượt chơi, Món hay nhầm, Tóm tắt AI.
       - `.pdf` gồm tiêu đề lớp, các ô số, ảnh biểu đồ, bảng và đoạn AI, dùng phông Noto Sans nên hiển thị đủ dấu.

## Phần bạn cần làm (khoảng 10 phút, tôi hướng dẫn từng bước khi tới)
Đây là việc tạo tài khoản và nhập key, tôi không làm thay được:
1. Tạo project Supabase miễn phí, rồi gửi tôi **Project URL** và **publishable key** (hai giá trị công khai).
2. Dán `supabase/schema.sql` vào SQL Editor rồi bấm Run.
3. Vào Auth → tắt "Confirm email" (HS dùng email ảo nên không thể xác nhận).
4. Vào Edge Functions → Secrets → thêm `OPENROUTER_API_KEY`.
5. Chạy `npx supabase login` trong terminal. Sau đó tôi deploy 2 hàm; trước khi deploy tôi sẽ hỏi lại.

Các bước 1–3 của kế hoạch làm được trước, không phải chờ Supabase.

## File chính
- **Mới:**
  - `index.html` (Giới thiệu), `hoi-sinh-xanh.html` (game, đổi tên từ `index.html`), `dang-nhap.html`, `thong-ke.html`, `on-tap.html`
  - `css/web.css`
  - `js/web/{cau_hinh,tai_khoan,dong_bo,thong_ke_web,lop_hoc,phan_tich,xuat_file,on_tap,gioi_thieu}.js`
  - `js/thong_ke.js`
  - `supabase/schema.sql`, `supabase/functions/{quan-ly-hoc-sinh,tom-tat-lop}/index.ts`
  - `assets/web/truyen/*.webp`, `assets/fonts/NotoSans-*.ttf`
- **Sửa nhỏ:**
  - `js/puzzle.js`, `js/world.js`, `js/systems.js`: chỉ thêm emit.
  - `js/ui.js`: huy hiệu tài khoản trong tab Cài đặt.
  - `README.md`: đổi hướng dẫn mở game sang `hoi-sinh-xanh.html` và gỡ `gian_lan.js` ở file mới.

## Kiểm tra
- **Kiểm tra cú pháp và bộ thử sẵn có:**
  - `node --check` mọi file JS đã sửa hoặc thêm.
  - Chạy lại `node kiem_tra/quests.js`, `m2_puzzle.js`, `thu_boss.js`, `duong_di.js`; tất cả phải vẫn đạt.
- **Thử trên server** `hoi-sinh-xanh-thu` (127.0.0.1:8767, không đụng tab 8765 của bạn), bằng trình duyệt trong app:
  - Trang Giới thiệu: hiệu ứng cuộn, khổ điện thoại 375px, chế độ giảm chuyển động.
  - Game: mở bằng `file://`, chơi khách offline vẫn chạy.
  - Cổng Phân Loại, Lều, trồng cây: hàng chờ ghi đúng số đúng/tổng; không ghi trong lúc xem lại trận.
- **Thử trọn luồng với Supabase**, bằng tài khoản thử tôi tạo và ghi lại trong `supabase/tai_khoan_thu.md`:
  - GV tạo lớp, thêm 3 HS.
  - HS đăng nhập bằng mã lớp, chơi minigame và làm quiz.
  - Số liệu hiện ở cả trang HS lẫn dashboard GV.
  - HS A không đọc được dữ liệu HS B (thử RLS trực tiếp qua REST).
  - Bấm AI tóm tắt ra kết quả tiếng Việt.
  - File `.xlsx` mở được bằng Excel; `.pdf` hiển thị đủ dấu tiếng Việt.
- Commit hay push chỉ làm khi bạn bảo. Khi xong sẽ mở PR vào `main`.
