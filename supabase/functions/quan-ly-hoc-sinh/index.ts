// Giáo viên quản lý tài khoản học sinh trong lớp của mình.
// POST { hanh_dong: "them", lop_id, ds_ten: ["Nguyễn Văn An", ...] }      → [{ id, ho_ten, ten_dang_nhap, mat_khau }]
// POST { hanh_dong: "dat_lai_mat_khau", lop_id, hoc_sinh_id }              → { ten_dang_nhap, mat_khau }
// POST { hanh_dong: "xoa", lop_id, hoc_sinh_id }                           → { ok: true }
// Học sinh đăng nhập bằng email ảo <mã lớp>.<tên đăng nhập>@MIEN (không gửi thư nào tới địa chỉ này).
import { json, LoiYeuCau, quanTri, xacThucGiaoVien, xuLy } from "../_chung/chung.ts";

const MIEN = "hs.hoisinhxanh.example";   // phải giống js/web/cau_hinh.js (MIEN_HOC_SINH)
const TOI_DA_MOI_LAN = 60;

// "Nguyễn Văn An" → "an.nguyen" (tên trước, họ sau, bỏ dấu)
function taoTenDangNhap(hoTen: string): string {
  const khongDau = hoTen.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ").trim();
  const chu = khongDau.split(/\s+/).filter(Boolean);
  if (!chu.length) return "hocsinh";
  const ten = chu.length > 1 ? `${chu[chu.length - 1]}.${chu[0]}` : chu[0];
  return (ten.length < 2 ? "hs." + ten : ten).slice(0, 30);
}

function matKhauMoi(): string {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));   // 6 chữ số, dễ phát cho học sinh
}

const emailCua = (maLop: string, tenDn: string) => `${maLop.toLowerCase()}.${tenDn}@${MIEN}`;

Deno.serve(xuLy(async (req) => {
  const than = await req.json().catch(() => ({}));
  const hanhDong = String(than.hanh_dong || "");
  const admin = quanTri();
  const { lop } = await xacThucGiaoVien(req, admin, String(than.lop_id || "") || undefined);
  if (!lop) throw new LoiYeuCau(400, "Thiếu mã lớp.");

  if (hanhDong === "them") {
    const ds: string[] = (Array.isArray(than.ds_ten) ? than.ds_ten : [])
      .map((t: unknown) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, 80))
      .filter((t: string) => t.length > 0);
    if (!ds.length) throw new LoiYeuCau(400, "Danh sách tên đang trống.");
    if (ds.length > TOI_DA_MOI_LAN) throw new LoiYeuCau(400, `Mỗi lần thêm tối đa ${TOI_DA_MOI_LAN} học sinh.`);

    const { data: daCo } = await admin.from("ho_so").select("ten_dang_nhap").eq("lop_id", lop.id);
    const dung = new Set((daCo || []).map((r: { ten_dang_nhap: string }) => r.ten_dang_nhap));
    const ketQua: Array<Record<string, string>> = [];
    for (const hoTen of ds) {
      const goc = taoTenDangNhap(hoTen);
      let tenDn = goc, n = 1;
      while (dung.has(tenDn)) tenDn = `${goc}${++n}`;
      dung.add(tenDn);
      const matKhau = matKhauMoi();
      const { data: tao, error } = await admin.auth.admin.createUser({
        email: emailCua(lop.ma_lop, tenDn), password: matKhau, email_confirm: true,
        app_metadata: { vai_tro: "hoc_sinh" }, user_metadata: { ho_ten: hoTen },
      });
      if (error || !tao?.user) { ketQua.push({ ho_ten: hoTen, loi: "Không tạo được tài khoản: " + (error?.message || "") }); continue; }
      // upsert: dù trigger có lỡ tạo hồ sơ trước thì vẫn ghi đè đúng vai trò học sinh
      const { error: e2 } = await admin.from("ho_so").upsert({
        id: tao.user.id, vai_tro: "hoc_sinh", ho_ten: hoTen, ten_dang_nhap: tenDn, lop_id: lop.id,
      }, { onConflict: "id" });
      if (e2) {
        await admin.auth.admin.deleteUser(tao.user.id);
        ketQua.push({ ho_ten: hoTen, loi: "Không lưu được hồ sơ: " + e2.message });
        continue;
      }
      ketQua.push({ id: tao.user.id, ho_ten: hoTen, ten_dang_nhap: tenDn, mat_khau: matKhau });
    }
    return json({ ma_lop: lop.ma_lop, hoc_sinh: ketQua });
  }

  // Hai hành động còn lại cần học sinh thuộc đúng lớp này
  const hsId = String(than.hoc_sinh_id || "");
  const { data: hs } = await admin.from("ho_so").select("id, ten_dang_nhap, vai_tro, lop_id").eq("id", hsId).maybeSingle();
  if (!hs || hs.vai_tro !== "hoc_sinh" || hs.lop_id !== lop.id) throw new LoiYeuCau(404, "Học sinh không thuộc lớp này.");

  if (hanhDong === "dat_lai_mat_khau") {
    const matKhau = matKhauMoi();
    const { error } = await admin.auth.admin.updateUserById(hs.id, { password: matKhau });
    if (error) throw new LoiYeuCau(500, "Không đặt lại được mật khẩu.");
    return json({ ten_dang_nhap: hs.ten_dang_nhap, mat_khau: matKhau });
  }
  if (hanhDong === "xoa") {
    const { error } = await admin.auth.admin.deleteUser(hs.id);   // hồ sơ và kết quả tự xoá theo (on delete cascade)
    if (error) throw new LoiYeuCau(500, "Không xoá được tài khoản.");
    return json({ ok: true });
  }
  throw new LoiYeuCau(400, "Hành động không hợp lệ.");
}));
