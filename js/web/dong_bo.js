/* Gửi kết quả học tập trong hàng chờ ('hoi-sinh-xanh-hoc-tap', do js/thong_ke.js và js/web/on_tap.js ghi)
   lên lớp học khi học sinh đã đăng nhập. Chỉ gửi kết quả ghi lúc chính tài khoản này đang đăng nhập
   (trường nguoi), để máy dùng chung không gửi nhầm kết quả của bạn khác. Gửi lại an toàn: trùng ma_su_kien thì bỏ qua. */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan;
  if (!TK || !TK.coMay) { window.HSXDongBo = { gui: function () { return Promise.resolve(0); } }; return; }
  var dangGui = false;

  // Kho học tập riêng của tài khoản (js/kho_tai_khoan.js)
  function khoa(tk) { return window.HSXKho ? HSXKho.hocTap(tk) : 'hoi-sinh-xanh-hoc-tap'; }
  function doc(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }

  async function gui() {
    var tk = TK.nhoTam();
    if (dangGui || !tk || tk.vai_tro !== 'hoc_sinh' || !navigator.onLine) return 0;
    dangGui = true;
    try {
      var KHOA = khoa(tk), d = doc(KHOA), da = 0;
      var cho = d ? d.hangCho.filter(function (e) { return e.nguoi === tk.id; }) : [];
      while (cho.length) {
        var lo = cho.splice(0, 100);
        var hang = lo.map(function (e) {
          return { hoc_sinh_id: tk.id, loai: e.loai, dung: e.dung, tong: e.tong, du_lieu: e.du_lieu, luc: e.luc, ma_su_kien: e.ma_su_kien };
        });
        var r = await TK.sb.from('su_kien').upsert(hang, { onConflict: 'ma_su_kien', ignoreDuplicates: true });
        if (r.error) throw r.error;
        // đọc lại kho rồi mới bỏ: trong lúc gửi có thể đã có kết quả mới
        var moi = doc(KHOA), boDi = {};
        lo.forEach(function (e) { boDi[e.ma_su_kien] = true; });
        if (moi) {
          moi.hangCho = moi.hangCho.filter(function (e) { return !boDi[e.ma_su_kien]; });
          localStorage.setItem(KHOA, JSON.stringify(moi));
        }
        da += lo.length;
      }
      // Ảnh chụp tiến độ trong save (chỉ có khi đang ở trang game, và save đó đúng là của tài khoản này)
      if (window.HSX && HSX.HocTap && HSX.S && HSX.taiKhoan && HSX.taiKhoan.id === tk.id) {
        var t = HSX.HocTap.tienDo();
        var r2 = await TK.sb.from('tien_do').upsert(Object.assign({ hoc_sinh_id: tk.id, cap_nhat: new Date().toISOString() }, t), { onConflict: 'hoc_sinh_id' });
        if (r2.error) throw r2.error;
      }
      return da;
    } catch (e) {
      console.warn('Chưa gửi được kết quả lên lớp học, sẽ thử lại sau.', e && e.message);
      return 0;
    } finally {
      dangGui = false;
    }
  }

  window.HSXDongBo = { gui: gui };
  // Gửi khi mở trang, định kỳ 30 giây, và khi rời trang / chuyển tab
  setTimeout(gui, 1500);
  setInterval(gui, 30000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') gui(); });
  addEventListener('online', gui);
})();
