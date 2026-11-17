/* Trang Đăng nhập: tab Học sinh / Giáo viên, đăng ký, quên và đặt lại mật khẩu giáo viên. */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan;
  var $ = function (id) { return document.getElementById(id); };
  var bao = $('bao');

  function thongBao(loai, chu) {
    bao.className = 'bao ' + loai;
    bao.textContent = chu;
    bao.hidden = !chu;
  }
  function chonTab(gv) {
    $('tab-hs').setAttribute('aria-selected', !gv);
    $('tab-gv').setAttribute('aria-selected', gv);
    $('o-hs').hidden = gv;
    $('o-gv').hidden = !gv;
    thongBao('', '');
  }
  function chonGv(form) {
    ['gv-dn', 'gv-dk', 'gv-quen', 'gv-moi'].forEach(function (id) { $(id).hidden = id !== form; });
    thongBao('', '');
  }
  $('tab-hs').addEventListener('click', function () { chonTab(false); });
  $('tab-gv').addEventListener('click', function () { chonTab(true); });
  document.querySelectorAll('[data-gv]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); chonGv('gv-' + a.getAttribute('data-gv')); });
  });
  if (location.hash === '#giao-vien') chonTab(true);

  if (!TK || !TK.coMay) {
    thongBao('tin', 'Web chưa được kết nối máy chủ lớp học, nên chưa đăng nhập được. Em vẫn chơi và ôn tập được ở chế độ khách.');
    document.querySelectorAll('form button[type=submit]').forEach(function (b) { b.disabled = true; });
    return;
  }

  // Đang đăng nhập sẵn thì vào thẳng trang thống kê
  var tk = TK.nhoTam();
  if (tk) thongBao('ok', 'Em đang đăng nhập với tên ' + tk.ten + '. Vào trang Thống kê hoặc đăng xuất ở menu.');

  async function chay(form, viec) {
    var nut = form.querySelector('button[type=submit]');
    nut.disabled = true;
    thongBao('', '');
    try { await viec(); } catch (e) { thongBao('loi', e.message || String(e)); } finally { nut.disabled = false; }
  }
  function vao() { location.href = 'thong-ke.html'; }

  $('o-hs').addEventListener('submit', function (e) {
    e.preventDefault();
    chay(this, async function () {
      await TK.dangNhapHocSinh($('hs-lop').value, $('hs-ten').value, $('hs-mk').value);
      vao();
    });
  });
  $('gv-dn').addEventListener('submit', function (e) {
    e.preventDefault();
    chay(this, async function () {
      await TK.dangNhapGiaoVien($('gv-email').value, $('gv-mk').value);
      vao();
    });
  });
  $('gv-dk').addEventListener('submit', function (e) {
    e.preventDefault();
    var ten = $('dk-ten').value.trim(), mk = $('dk-mk').value;
    if (!ten) { thongBao('loi', 'Hãy nhập họ tên.'); return; }
    if (mk.length < 8) { thongBao('loi', 'Mật khẩu giáo viên cần ít nhất 8 ký tự.'); return; }
    chay(this, async function () {
      var r = await TK.dangKyGiaoVien(ten, $('dk-email').value, mk);
      if (r && r.canXacNhan) { chonGv('gv-dn'); thongBao('ok', 'Đã tạo tài khoản. Mở email và bấm liên kết xác nhận, rồi đăng nhập.'); return; }
      vao();
    });
  });
  $('gv-quen').addEventListener('submit', function (e) {
    e.preventDefault();
    chay(this, async function () {
      await TK.quenMatKhau($('quen-email').value);
      thongBao('ok', 'Nếu email này có tài khoản, liên kết đặt lại mật khẩu đã được gửi. Kiểm tra cả hộp thư rác.');
    });
  });
  $('gv-moi').addEventListener('submit', function (e) {
    e.preventDefault();
    var mk = $('moi-mk').value;
    if (mk.length < 8) { thongBao('loi', 'Mật khẩu cần ít nhất 8 ký tự.'); return; }
    chay(this, async function () {
      await TK.doiMatKhau(mk);
      await TK.taiHoSo();
      vao();
    });
  });
  // Mở từ liên kết đặt lại mật khẩu trong email
  TK.sb.auth.onAuthStateChange(function (su_kien) {
    if (su_kien === 'PASSWORD_RECOVERY') { chonTab(true); chonGv('gv-moi'); }
  });
})();
