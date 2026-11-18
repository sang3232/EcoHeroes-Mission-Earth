/* Thống kê học tập: nghe sự kiện trong game, ghi vào máy (không đụng save).
   - hangCho: các sự kiện chưa gửi lên lớp học (js/web/dong_bo.js gửi khi đã đăng nhập)
   - tong: số liệu cộng dồn trên máy này, trang thong-ke.html dùng cho người chơi khách
   Không ghi gì khi đang xem lại trận boss (HSX.PhatLai.dang). File này không gọi mạng.
   Kho này riêng cho tài khoản đã mở trang game (HSX.taiKhoan, cùng tài khoản với save), xem js/kho_tai_khoan.js. */
(function () {
  'use strict';
  var TK_GAME = HSX.taiKhoan || null;   // tài khoản lúc mở trang: save và kết quả đều thuộc người này
  var KHOA = window.HSXKho ? HSXKho.hocTap(TK_GAME) : 'hoi-sinh-xanh-hoc-tap';
  var TOI_DA_HANG_CHO = 600;

  function moi() {
    if (window.HSXKho) return HSXKho.khoMoi();
    return {
      hangCho: [],
      tong: {
        cong: { luot: 0, dung: 0, tong: 0, saoCao: 0, cacLuot: [] },   // Cổng Phân Loại
        leu: { dung: 0, tong: 0 },                                       // Lều ném rác
        quiz: { luot: 0, dung: 0, tong: 0, cacLuot: [] },               // on-tap.html ghi vào
        monSai: {},                                                      // tên món → số lần nhầm
        trong: 0, dao: 0,
      },
    };
  }
  function doc() {
    try {
      var d = JSON.parse(localStorage.getItem(KHOA) || 'null');
      if (d && Array.isArray(d.hangCho)) {
        if (!d.tong) d.tong = moi().tong;
        return d;
      }
    } catch (e) { /* hỏng thì làm lại */ }
    return moi();
  }
  function ghi(d) {
    if (d.hangCho.length > TOI_DA_HANG_CHO) d.hangCho = d.hangCho.slice(-TOI_DA_HANG_CHO);
    if (HSX.S && !dangXemLai()) d.tienDo = tienDo();   // trang thống kê (khách) đọc số cây từ đây
    try { localStorage.setItem(KHOA, JSON.stringify(d)); } catch (e) { /* hết chỗ: bỏ qua */ }
  }
  function maMoi() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // file:// không có randomUUID: tự tạo uuid v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function dangXemLai() { return !!(HSX.PhatLai && HSX.PhatLai.dang); }

  // Thêm một sự kiện vào hàng chờ. loai: cong_phan_loai | leu_nem_rac | trong_cay | dao_cay | quiz
  // nguoi: học sinh đã mở trang game (null = khách / giáo viên). dong_bo.js chỉ gửi kết quả của đúng người đó.
  function nguoiHienTai() {
    return TK_GAME && TK_GAME.vai_tro === 'hoc_sinh' ? TK_GAME.id : null;
  }
  function them(d, loai, dung, tong, duLieu) {
    d.hangCho.push({ ma_su_kien: maMoi(), loai: loai, dung: dung, tong: tong, du_lieu: duLieu || {}, luc: new Date().toISOString(), nguoi: nguoiHienTai() });
  }

  // Tổng số ô trồng cây của mọi màn (P và Y trên bản đồ), đếm một lần
  var soO = null;
  function demO() {
    if (soO !== null) return soO;
    soO = 0;
    var L = HSX.LEVELS || {};
    Object.keys(L).forEach(function (lv) {
      var rooms = L[lv].rooms || {};
      Object.keys(rooms).forEach(function (id) {
        (rooms[id].map || []).forEach(function (hang) {
          for (var i = 0; i < hang.length; i++) if (hang[i] === 'P' || hang[i] === 'Y') soO++;
        });
      });
    });
    return soO;
  }

  // Ảnh chụp tiến độ hiện tại từ save, gửi kèm khi đồng bộ (bảng tien_do)
  function tienDo() {
    var S = HSX.S || {}, tr = S.trees || {}, soCay = 0, lon = 0, loai = {};
    Object.keys(tr).forEach(function (r) {
      Object.keys(tr[r]).forEach(function (i) {
        var t = tr[r][i];
        soCay++;
        if (t.g >= 1) lon++;
        loai[t.type] = true;
      });
    });
    return {
      so_cay: soCay, so_o: demO(), so_cay_lon: lon, so_loai_cay: Object.keys(loai).length,
      sao_cong: (S.puzzle && S.puzzle.best) || 0,
      thoi_gian: Math.round((S.stats && S.stats.time) || 0),
      man: S.level || 'm1',
    };
  }

  // ---------- Cổng Phân Loại: gom từng món của một lượt, ghi một sự kiện khi xong hoặc khi bỏ dở ----------
  var luot = null;
  function ghiLuotCong(xong, sao) {
    if (!luot || !luot.length) { luot = null; return; }
    var d = doc(), dung = luot.filter(function (m) { return m.dung; }).length;
    them(d, 'cong_phan_loai', dung, luot.length, { xong: xong, sao: sao, cac_mon: luot });
    var c = d.tong.cong;
    c.luot++; c.dung += dung; c.tong += luot.length;
    if (xong && sao > c.saoCao) c.saoCao = sao;
    c.cacLuot.push({ luc: Date.now(), dung: dung, tong: luot.length, sao: xong ? sao : null });
    if (c.cacLuot.length > 50) c.cacLuot = c.cacLuot.slice(-50);
    luot.forEach(function (m) { if (!m.dung) d.tong.monSai[m.ten] = (d.tong.monSai[m.ten] || 0) + 1; });
    ghi(d);
    luot = null;
  }

  HSX.on('phanloai', function (e) {
    if (dangXemLai()) return;
    (luot = luot || []).push({ ten: e.ten, nhom: e.nhom, chon: e.chon, dung: !!e.dung, vong: e.vong, giay: e.giay });
  });
  HSX.on('phanloai_xong', function (e) {
    if (dangXemLai()) return;
    ghiLuotCong(true, e.sao);
  });
  // Đóng cổng giữa chừng: vẫn ghi phần đã làm
  if (HSX.Puzzle && HSX.Puzzle.close) {
    var dongGoc = HSX.Puzzle.close;
    HSX.Puzzle.close = function () {
      if (!this.done) ghiLuotCong(false, null);
      return dongGoc.apply(this, arguments);
    };
  }

  // ---------- Lều bỏ hoang: mỗi lần ném vào thùng là một sự kiện ----------
  HSX.on('nemrac', function (e) {
    if (dangXemLai()) return;
    var d = doc();
    them(d, 'leu_nem_rac', e.dung ? 1 : 0, 1, { ten: e.ten, thung: e.thung, dung_thung: e.dung_thung });
    d.tong.leu.tong++;
    if (e.dung) d.tong.leu.dung++;
    else d.tong.monSai[e.ten] = (d.tong.monSai[e.ten] || 0) + 1;
    ghi(d);
  });

  // ---------- Trồng / đào cây (bỏ qua cây đom đóm tự gieo) ----------
  HSX.on('trong', function (e) {
    if (dangXemLai() || e.tu === 'domdom') return;
    var d = doc();
    them(d, 'trong_cay', 1, 1, { phong: e.room, o: e.idx, cay: e.type });
    d.tong.trong++;
    ghi(d);
  });
  HSX.on('dao', function (e) {
    if (dangXemLai()) return;
    var d = doc();
    them(d, 'dao_cay', 0, 0, { phong: e.room, o: e.idx, cay: e.type });
    d.tong.dao++;
    ghi(d);
  });

  // ---------- Dòng tài khoản trong tab Cài đặt ----------
  function dongTaiKhoan() {
    var tk = TK_GAME;
    var cho = doc().hangCho.length;
    if (tk && tk.vai_tro === 'hoc_sinh') {
      return '<h3>Lớp học</h3><p class="small">Tiến trình game và kết quả đang lưu riêng cho <b>' + HSX.esc(tk.ten || '') + '</b>' +
        (tk.lop ? ' · ' + HSX.esc(HSXKho.tenLop(tk.lop, 'lớp')) : '') + '. ' +
        (cho ? cho + ' kết quả đang chờ gửi.' : 'Đã gửi hết kết quả.') +
        ' <a href="thong-ke.html" target="_self">Xem thống kê</a></p>';
    }
    if (tk) {
      return '<h3>Tài khoản</h3><p class="small">Tiến trình game đang lưu riêng cho tài khoản giáo viên <b>' + HSX.esc(tk.ten || '') + '</b>. ' +
        '<a href="thong-ke.html" target="_self">Bảng điều khiển lớp</a></p>';
    }
    return '<h3>Lớp học</h3><p class="small muted">Đang chơi khách: tiến trình chỉ lưu trên máy này và không chuyển sang tài khoản nào. ' +
      '<a href="dang-nhap.html" target="_self">Đăng nhập bằng mã lớp</a> để có tiến trình riêng và để thầy cô xem được tiến bộ. ' +
      '<a href="index.html" target="_self">Về trang Giới thiệu</a></p>';
  }

  // Đổi tài khoản ở tab khác (đăng nhập / đăng xuất): lưu nốt cho tài khoản cũ rồi mở lại game
  // để không ghi tiến trình của người này vào tài khoản người kia.
  addEventListener('storage', function (e) {
    if (e.key !== 'hoi-sinh-xanh-tai-khoan' && e.key !== null) return;
    var moiTk = window.HSXKho ? HSXKho.tk() : null;
    if ((moiTk && moiTk.id) === (TK_GAME && TK_GAME.id)) return;
    if (HSX.S && !dangXemLai()) HSX.saveGame();
    if (HSX.UI && HSX.UI.toast) HSX.UI.toast('Tài khoản vừa thay đổi ở tab khác. Đang mở tiến trình của tài khoản mới…', '', 3000);
    setTimeout(function () { location.reload(); }, 1500);
  });

  // Cây lớn dần theo thời gian: mỗi phút chụp lại tiến độ một lần
  setInterval(function () { if (!dangXemLai()) ghi(doc()); }, 60000);

  HSX.HocTap = {
    KHOA: KHOA,
    doc: doc,
    ghi: ghi,
    tienDo: tienDo,
    demO: demO,
    dongTaiKhoan: dongTaiKhoan,
    // dong_bo.js gọi sau khi gửi thành công: bỏ các sự kiện đã gửi khỏi hàng chờ
    boDaGui: function (cacMa) {
      var d = doc(), da = {};
      cacMa.forEach(function (m) { da[m] = true; });
      d.hangCho = d.hangCho.filter(function (e) { return !da[e.ma_su_kien]; });
      ghi(d);
    },
  };
})();
