/* Kho riêng cho từng tài khoản trên máy dùng chung (phòng máy trường học).
   Mỗi tài khoản (học sinh hay giáo viên) có save game, nhật ký trận, kết quả học tập và thẻ đã thuộc riêng,
   lưu ở khoá '<khoá gốc>@<id tài khoản>'. Chơi khách dùng khoá gốc, nên tiến trình chơi trước khi có
   tài khoản vẫn còn nguyên ở chế độ khách và không tự chuyển sang tài khoản nào.
   Nạp file này trước js/state.js (trang game) và trước các file web đọc kho học tập. Không gọi mạng. */
(function () {
  'use strict';
  var KHOA_TK = 'hoi-sinh-xanh-tai-khoan';     // hồ sơ nhớ tạm do trang đăng nhập ghi
  var KHOA_HOC_TAP = 'hoi-sinh-xanh-hoc-tap';  // hàng chờ kết quả + số liệu cộng dồn

  // Tài khoản đang đăng nhập trên máy này (theo hồ sơ nhớ tạm), hoặc null khi chơi khách
  function tk() {
    try {
      var t = JSON.parse(localStorage.getItem(KHOA_TK) || 'null');
      return t && t.id ? t : null;
    } catch (e) { return null; }
  }
  // Khoá riêng của tài khoản t (bỏ trống = tài khoản hiện tại, null = khách)
  function khoa(goc, t) {
    if (t === undefined) t = tk();
    return t && t.id ? goc + '@' + t.id : goc;
  }
  function khoMoi() {
    return {
      hangCho: [],
      tong: {
        cong: { luot: 0, dung: 0, tong: 0, saoCao: 0, cacLuot: [] },
        leu: { dung: 0, tong: 0 },
        quiz: { luot: 0, dung: 0, tong: 0, cacLuot: [] },
        monSai: {}, trong: 0, dao: 0,
      },
    };
  }

  // Bản trước đây dùng một hàng chờ chung cho mọi tài khoản (trường nguoi ghi ai làm). Chuyển kết quả của
  // từng tài khoản sang kho riêng của tài khoản đó để vẫn được gửi lên lớp; kết quả khách ở lại kho gốc.
  function tachHangChoCu() {
    var goc;
    try { goc = JSON.parse(localStorage.getItem(KHOA_HOC_TAP) || 'null'); } catch (e) { return; }
    if (!goc || !Array.isArray(goc.hangCho) || !goc.hangCho.some(function (e) { return e && e.nguoi; })) return;
    var theo = {};
    goc.hangCho = goc.hangCho.filter(function (e) {
      if (!e || !e.nguoi) return true;
      (theo[e.nguoi] = theo[e.nguoi] || []).push(e);
      return false;
    });
    try {
      Object.keys(theo).forEach(function (id) {
        var k = KHOA_HOC_TAP + '@' + id, d = null;
        try { d = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { d = null; }
        if (!d || !Array.isArray(d.hangCho)) d = khoMoi();
        if (!d.tong) d.tong = khoMoi().tong;
        var co = {};
        d.hangCho.forEach(function (e) { co[e.ma_su_kien] = true; });
        theo[id].forEach(function (e) { if (!co[e.ma_su_kien]) d.hangCho.push(e); });
        localStorage.setItem(k, JSON.stringify(d));
      });
      localStorage.setItem(KHOA_HOC_TAP, JSON.stringify(goc));
    } catch (e) { /* hết chỗ: để lần sau */ }
  }
  tachHangChoCu();

  window.HSXKho = {
    KHOA_TK: KHOA_TK,
    tk: tk,
    khoa: khoa,
    khoMoi: khoMoi,
    hocTap: function (t) { return khoa(KHOA_HOC_TAP, t); },
  };
})();
