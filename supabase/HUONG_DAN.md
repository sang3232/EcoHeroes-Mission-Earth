# Dựng máy chủ lớp học (Supabase)

Làm một lần, khoảng 10 phút. Gói miễn phí của Supabase đủ cho vài lớp học.

## 1. Tạo project

1. Vào <https://supabase.com>, đăng nhập rồi bấm **New project**.
2. Đặt tên (ví dụ `hoi-sinh-xanh`), chọn vùng **Southeast Asia (Singapore)**, đặt mật khẩu cơ sở dữ liệu và cất kỹ.
3. Mở **Project Settings → API**, rồi chép hai giá trị vào `js/web/cau_hinh.js`:
   - **Project URL** → `SUPABASE_URL`
   - **Publishable key** (hoặc `anon public`) → `SUPABASE_KEY`

   Đây là giá trị công khai, dữ liệu được RLS bảo vệ. **Không** chép `service_role` / secret key vào web.

## 2. Tạo bảng và quyền

Vào **SQL Editor → New query**, dán toàn bộ `supabase/schema.sql`, rồi bấm **Run**. Chạy lại nhiều lần vẫn an toàn.

## 3. Cài đặt đăng nhập

Vào **Authentication → Sign In / Providers → Email**:
- Tắt **Confirm email**: học sinh dùng email ảo nên không xác nhận được.
- Giữ **Allow new users to sign up** ở trạng thái bật: giáo viên tự đăng ký.

Vào **Authentication → URL Configuration**:
- **Site URL**: địa chỉ GitHub Pages, ví dụ `https://sang3232.github.io/EcoHeroes-Mission-Earth/`.
- **Redirect URLs**: thêm `https://sang3232.github.io/EcoHeroes-Mission-Earth/dang-nhap.html`. Dòng này dùng cho liên kết quên mật khẩu.

## 4. Khoá AI

Vào **Edge Functions → Secrets**, thêm `OPENROUTER_API_KEY` = khoá OpenRouter.

Mô hình mặc định là `z-ai/glm-5.3-flash`: suy nghĩ ở mức thấp, chỉ đi qua nhà cung cấp không lưu dữ liệu. Một lần tóm tắt mất khoảng 10 giây và tốn chưa tới 0,001 USD. GLM lỗi thì hàm thử tiếp chuỗi mô hình miễn phí.

Không bắt buộc:
- `MO_HINH_CHINH`: đổi mô hình chính.
- `MO_HINH_MIEN_PHI`: danh sách mô hình miễn phí dự phòng, ngăn bằng dấu phẩy.

## 5. Đưa hai hàm máy chủ lên

Mở terminal tại thư mục repo:

```bash
npx supabase login
```

```bash
npx supabase functions deploy quan-ly-hoc-sinh --project-ref <mã project>
```

```bash
npx supabase functions deploy tom-tat-lop --project-ref <mã project>
```

Mã project là đoạn chữ trong Project URL: `https://<mã project>.supabase.co`.

## 6. Thử

1. Mở `dang-nhap.html` → **Giáo viên** → **Tạo tài khoản giáo viên**.
2. Vào **Thống kê** → tạo lớp, dán vài tên học sinh, rồi in phiếu.
3. Mở cửa sổ ẩn danh, đăng nhập bằng phiếu học sinh, chơi tới Cổng Phân Loại hoặc làm bài ôn tập.
4. Quay lại tài khoản giáo viên → **Phân tích dữ liệu** → bấm **Tạo bản tóm tắt mới**.

## Ghi chú

- Học sinh đăng nhập bằng email ảo `<mã lớp>.<tên đăng nhập>@hs.hoisinhxanh.example`. Hệ thống không gửi thư nào tới địa chỉ này. Học sinh quên mật khẩu thì giáo viên bấm **🔑 Mật khẩu mới**.
- Xoá học sinh hoặc xoá lớp là xoá vĩnh viễn tài khoản và kết quả, không khôi phục được.
- AI chỉ nhận mã HS01, HS02…, không nhận tên học sinh.
