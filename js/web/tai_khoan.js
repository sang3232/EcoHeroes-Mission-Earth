/* Tài khoản: đăng nhập học sinh (mã lớp + tên đăng nhập + mật khẩu) và giáo viên (email), dùng supabase-js.
   Cần nạp trước: supabase-js (CDN), js/web/cau_hinh.js. Hồ sơ rút gọn được nhớ ở localStorage
   'hoi-sinh-xanh-tai-khoan' để menu và game hiện tên ngay, không phải chờ mạng. */
(function () {
  'use strict';
  var CH = window.HSX_CAU_HINH || {};
  var KHOA_TK = 'hoi-sinh-xanh-tai-khoan';
  var coMay = !!(CH.SUPABASE_URL && CH.SUPABASE_KEY && window.supabase && window.supabase.createClient);
  var sb = coMay ? window.supabase.createClient(CH.SUPABASE_URL, CH.SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'hoi-sinh-xanh-phien', detectSessionInUrl: true },
  }) : null;

  function nho(hs) {
    try {
      if (hs) localStorage.setItem(KHOA_TK, JSON.stringify(hs));
      else localStorage.removeItem(KHOA_TK);
    } catch (e) { /* bỏ qua */ }
  }
  function canMay() {
    if (!sb) throw new Error('Web chưa được kết nối máy chủ lớp học. Hãy báo thầy cô hoặc nhóm phát triển.');
  }
  function loiTiengViet(e) {
    var m = String((e && e.message) || e || '');
    if (/Invalid login credentials/i.test(m)) return 'Sai thông tin đăng nhập. Kiểm tra lại mã lớp, tên đăng nhập và mật khẩu.';
    if (/Email not confirmed/i.test(m)) return 'Email chưa được xác nhận. Mở hộp thư và bấm vào liên kết xác nhận.';
    if (/already registered|already been registered/i.test(m)) return 'Email này đã có tài khoản. Hãy đăng nhập.';
    if (/Password should be/i.test(m)) return 'Mật khẩu cần ít nhất 6 ký tự.';
    if (/rate limit|too many/i.test(m)) return 'Thử quá nhiều lần. Đợi một chút rồi thử lại.';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
    return m || 'Có lỗi xảy ra, thử lại nhé.';
  }

  // Đọc hồ sơ đầy đủ của người đang đăng nhập rồi nhớ bản rút gọn
  async function taiHoSo() {
    canMay();
    var p = await sb.auth.getUser();
    var u = p.data && p.data.user;
    if (!u) { nho(null); return null; }
    var r = await sb.from('ho_so').select('id, vai_tro, ho_ten, ten_dang_nhap, lop_id, lop:lop_id (ten, ma_lop)').eq('id', u.id).maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) { nho(null); return null; }
    var h = r.data;
    var gon = { id: h.id, vai_tro: h.vai_tro, ten: h.ho_ten || h.ten_dang_nhap || u.email, ten_dang_nhap: h.ten_dang_nhap,
      lop_id: h.lop_id, lop: h.lop ? h.lop.ten : null, ma_lop: h.lop ? h.lop.ma_lop : null, email: h.vai_tro === 'giao_vien' ? u.email : null };
    nho(gon);
    return gon;
  }

  window.HSXTaiKhoan = {
    coMay: coMay,
    sb: sb,
    nhoTam: function () { try { return JSON.parse(localStorage.getItem(KHOA_TK) || 'null'); } catch (e) { return null; } },
    taiHoSo: taiHoSo,
    loiTiengViet: loiTiengViet,

    emailHocSinh: function (maLop, tenDn) {
      return String(maLop).trim().toLowerCase() + '.' + String(tenDn).trim().toLowerCase() + '@' + CH.MIEN_HOC_SINH;
    },
    dangNhapHocSinh: async function (maLop, tenDn, matKhau) {
      canMay();
      maLop = String(maLop || '').trim().toUpperCase();
      tenDn = String(tenDn || '').trim().toLowerCase();
      if (!/^[A-Z0-9]{6}$/.test(maLop)) throw new Error('Mã lớp gồm 6 chữ hoặc số, ví dụ K7P2QA.');
      if (!/^[a-z0-9.]{2,40}$/.test(tenDn)) throw new Error('Tên đăng nhập chỉ gồm chữ thường không dấu, số và dấu chấm, ví dụ an.nguyen.');
      var r = await sb.auth.signInWithPassword({ email: this.emailHocSinh(maLop, tenDn), password: String(matKhau || '') });
      if (r.error) throw new Error(loiTiengViet(r.error));
      return taiHoSo();
    },
    dangNhapGiaoVien: async function (email, matKhau) {
      canMay();
      var r = await sb.auth.signInWithPassword({ email: String(email || '').trim(), password: String(matKhau || '') });
      if (r.error) throw new Error(loiTiengViet(r.error));
      var h = await taiHoSo();
      if (h && h.vai_tro !== 'giao_vien') { await this.dangXuat(); throw new Error('Đây là tài khoản học sinh. Hãy dùng tab Học sinh.'); }
      return h;
    },
    dangKyGiaoVien: async function (hoTen, email, matKhau) {
      canMay();
      var r = await sb.auth.signUp({ email: String(email || '').trim(), password: String(matKhau || ''),
        options: { data: { ho_ten: String(hoTen || '').trim() }, emailRedirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'dang-nhap.html' } });
      if (r.error) throw new Error(loiTiengViet(r.error));
      if (!r.data.session) return { canXacNhan: true };
      return taiHoSo();
    },
    quenMatKhau: async function (email) {
      canMay();
      var r = await sb.auth.resetPasswordForEmail(String(email || '').trim(), {
        redirectTo: location.origin + location.pathname.replace(/[^/]*$/, '') + 'dang-nhap.html',
      });
      if (r.error) throw new Error(loiTiengViet(r.error));
    },
    doiMatKhau: async function (matKhauMoi) {
      canMay();
      var r = await sb.auth.updateUser({ password: String(matKhauMoi || '') });
      if (r.error) throw new Error(loiTiengViet(r.error));
    },
    dangXuat: async function () {
      nho(null);
      if (sb) await sb.auth.signOut();
    },
    // Gọi hàm máy chủ (Edge Function) kèm phiên đăng nhập
    goiHam: async function (ten, than) {
      canMay();
      var r = await sb.functions.invoke(ten, { body: than });
      if (r.error) {
        var loi = r.error.message;
        try { var d = await r.error.context.json(); if (d && d.loi) loi = d.loi; } catch (e) { /* bỏ qua */ }
        throw new Error(loiTiengViet(loi));
      }
      return r.data;
    },
  };

  // Phiên hết hạn / đăng xuất ở tab khác: xoá bản nhớ tạm
  if (sb) sb.auth.onAuthStateChange(function (su_kien) {
    if (su_kien === 'SIGNED_OUT') nho(null);
  });
})();
