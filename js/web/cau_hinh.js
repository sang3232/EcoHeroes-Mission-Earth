/* Cấu hình kết nối lớp học (Supabase).
   SUPABASE_URL và SUPABASE_KEY (publishable / anon key) là giá trị CÔNG KHAI: dữ liệu được bảo vệ bằng RLS
   trong supabase/schema.sql. KHÔNG BAO GIỜ đặt service_role key hay khoá OpenRouter vào file này.
   Để trống thì web vẫn chạy ở chế độ khách (không đăng nhập, số liệu chỉ lưu trên máy). */
window.HSX_CAU_HINH = {
  SUPABASE_URL: 'https://ytrjicvywsmhuaiclujh.supabase.co',
  SUPABASE_KEY: 'sb_publishable_rO_QyUcp-Vz6KqjXnPE81g_d4HDSsUw',
  // Email ảo của học sinh: <mã lớp>.<tên đăng nhập>@MIEN_HOC_SINH. Phải giống supabase/functions/quan-ly-hoc-sinh.
  MIEN_HOC_SINH: 'hs.hoisinhxanh.example',
};
