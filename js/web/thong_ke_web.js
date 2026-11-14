/* Trang Thống kê: chọn giao diện theo vai trò.
   - Khách: số liệu trên máy này (hàng chờ 'hoi-sinh-xanh-hoc-tap').
   - Học sinh: số liệu trên lớp học (su_kien, tien_do) + kết quả chưa kịp gửi, so với trung bình lớp.
   - Giáo viên: bảng điều khiển lớp (js/web/lop_hoc.js, js/web/phan_tich.js). */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan, SL = window.HSXSoLieu, esc = HSXWeb.esc;
  var noiDung = document.getElementById('noi-dung');
  var KHOA = 'hoi-sinh-xanh-hoc-tap';

  // ---------- Trợ giúp vẽ ----------
  if (window.Chart) {
    Chart.defaults.color = '#9aaca2';
    Chart.defaults.borderColor = 'rgba(36,54,74,.7)';
    Chart.defaults.font.family = '"Be Vietnam Pro", "Segoe UI", sans-serif';
  }
  var cacBieuDo = [];
  function bieuDo(canvas, cauHinh) {
    if (!window.Chart || !canvas) return null;
    var c = new Chart(canvas, cauHinh);
    cacBieuDo.push(c);
    return c;
  }
  function xoaBieuDo() { cacBieuDo.forEach(function (c) { c.destroy(); }); cacBieuDo = []; }
  function oSo(ten, giaTri, ghi, thanh) {
    return '<div class="the"><div class="ten">' + ten + '</div><div class="gia-tri">' + giaTri + '</div>' +
      (thanh !== undefined && thanh !== null ? '<div class="thanh"><i style="width:' + Math.round(Math.min(1, thanh) * 100) + '%"></i></div>' : '') +
      (ghi ? '<div class="ghi" style="margin-top:6px">' + ghi + '</div>' : '') + '</div>';
  }

  // Gợi ý cho món rác hay nhầm (lấy từ dữ liệu game)
  var GOI_Y = {};
  if (window.HSX && HSX.DATA) {
    var NHOM = {};
    HSX.DATA.puzzle.binsR2.forEach(function (b) { NHOM[b.id] = b; });
    HSX.DATA.puzzle.items.forEach(function (it) { GOI_Y[it.name] = { emo: it.emoji, thung: NHOM[it.cat].emoji + ' ' + NHOM[it.cat].name, goiY: it.hint }; });
    HSX.DATA.sortItems.forEach(function (it) {
      if (!GOI_Y[it.name]) GOI_Y[it.name] = { emo: it.emoji, thung: HSX.DATA.bins[it.bin].emoji + ' ' + HSX.DATA.bins[it.bin].name, goiY: it.hint };
    });
  }

  // ---------- Giao diện học sinh / khách ----------
  function veHocSinh(s, tbLop, tk) {
    xoaBieuDo();
    var laKhach = !tk;
    var monSai = Object.keys(s.monSai).map(function (m) { return { ten: m, lan: s.monSai[m] }; })
      .sort(function (a, b) { return b.lan - a.lan; }).slice(0, 5);
    var soSanh = function (gt, tb) {
      if (tb === null || tb === undefined || gt === null) return '';
      return 'Trung bình lớp: ' + SL.phanTram(tb);
    };
    var chuaChoi = !s.soSuKien && !s.soCay;
    noiDung.innerHTML =
      '<div class="dau-muc"><span class="nhan">Thống kê</span>' +
      '<h2>' + (laKhach ? 'Tiến bộ trên máy này' : 'Tiến bộ của ' + esc(tk.ten)) + '</h2>' +
      '<p>' + (laKhach
        ? 'Em đang dùng chế độ khách: số liệu chỉ lưu trong trình duyệt này. <a href="dang-nhap.html">Đăng nhập bằng mã lớp</a> để lưu lâu dài và để thầy cô xem được.'
        : (tk.lop ? 'Lớp ' + esc(tk.lop) + '. ' : '') + 'Số liệu cập nhật mỗi khi em chơi hoặc làm bài ôn tập.') + '</p></div>' +
      (chuaChoi ? '<div class="bao tin">Chưa có kết quả nào. Hãy <a href="hoi-sinh-xanh.html">chơi Hồi Sinh Xanh</a> tới Cổng Phân Loại, hoặc <a href="on-tap.html">làm bài ôn tập</a>.</div>' : '') +

      '<h3 style="margin-top:8px">1. Độ chính xác minigame</h3>' +
      '<div class="o-so">' +
      oSo('♻️ Cổng Phân Loại', SL.phanTram(s.chinhXacCong), s.cong.luot + ' lượt · ' + s.cong.dung + '/' + s.cong.tong + ' món đúng · sao cao nhất ' + '★'.repeat(s.saoCong) + '☆'.repeat(3 - s.saoCong), s.chinhXacCong) +
      oSo('🚮 Lều ném rác', SL.phanTram(s.chinhXacLeu), s.leu.dung + '/' + s.leu.tong + ' lần ném trúng thùng', s.chinhXacLeu) +
      oSo('🎯 Chung', SL.phanTram(s.chinhXacMinigame), soSanh(s.chinhXacMinigame, tbLop && tbLop.chinh_xac), s.chinhXacMinigame) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the"><b>Độ chính xác từng lượt Cổng Phân Loại</b><div class="bieu-do"><canvas id="bd-cong" aria-label="Biểu đồ độ chính xác theo lượt"></canvas></div></div>' +
      '<div class="the"><b>Món em hay nhầm</b>' + (monSai.length ? '<ul style="padding-left:18px;margin:10px 0 0">' + monSai.map(function (m) {
        var g = GOI_Y[m.ten] || {};
        return '<li style="margin-bottom:8px">' + (g.emo || '') + ' <b>' + esc(m.ten) + '</b> · nhầm ' + m.lan + ' lần<br><small style="color:var(--mo)">Đúng: ' + esc(g.thung || '') + (g.goiY ? '. ' + esc(g.goiY) : '') + '</small></li>';
      }).join('') + '</ul><a class="nut nho" href="on-tap.html?on=sai&chu_de=phan_loai">🔁 Ôn lại các món này</a>' : '<p class="trong">Chưa nhầm món nào. Giỏi lắm!</p>') + '</div>' +
      '</div>' +

      '<h3 style="margin-top:32px">2. Tỉ lệ trồng cây</h3>' +
      '<div class="o-so">' +
      oSo('🌳 Ô đất đã trồng', s.soO ? s.soCay + '/' + s.soO : '—', s.tiLeTrongCay !== null ? SL.phanTram(s.tiLeTrongCay) + ' số ô trong game. ' + soSanh(s.tiLeTrongCay, tbLop && tbLop.trong_cay) : 'Vào game trồng cây để có số liệu.', s.tiLeTrongCay) +
      oSo('🌲 Cây đã trưởng thành', s.soCayLon || 0, (s.soLoaiCay || 0) + ' loài cây khác nhau') +
      oSo('🌱 Số lần tự tay trồng', s.trongLan, 'Không tính cây đom đóm tự gieo') +
      oSo('⏱️ Thời gian chơi', SL.phut(s.thoiGian), s.cuoi ? 'Lần gần nhất: ' + SL.luc(s.cuoi) : '') +
      '</div>' +

      '<h3 style="margin-top:32px">3. Flashcard Quiz</h3>' +
      '<div class="o-so">' +
      oSo('🃏 Điểm trung bình', SL.phanTram(s.diemQuiz), s.quiz.luot + ' bài · ' + s.quiz.dung + '/' + s.quiz.tong + ' câu đúng. ' + soSanh(s.diemQuiz, tbLop && tbLop.quiz), s.diemQuiz) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the"><b>Điểm theo chủ đề</b><div class="bieu-do" style="height:240px"><canvas id="bd-chu-de" aria-label="Biểu đồ điểm theo chủ đề"></canvas></div></div>' +
      '<div class="the"><b>Các bài gần đây</b>' + (s.quiz.cacLuot.length ? '<ul style="padding-left:18px;margin:10px 0">' +
        s.quiz.cacLuot.slice(-6).reverse().map(function (q) {
          return '<li>' + SL.luc(q.luc) + ' · ' + esc(SL.TEN_CHU_DE[q.chuDe] || q.chuDe || '') + ' · <b>' + SL.phanTram(q.tiLe) + '</b></li>';
        }).join('') + '</ul>' : '<p class="trong">Chưa làm bài nào.</p>') +
      '<div class="hang-nut"><a class="nut chinh nho" href="on-tap.html?che_do=kiem_tra">✏️ Làm bài mới</a><a class="nut nho" href="on-tap.html?on=sai">🔁 Ôn thẻ hay sai</a></div></div>' +
      '</div>';

    bieuDo(document.getElementById('bd-cong'), {
      type: 'line',
      data: {
        labels: s.cong.cacLuot.map(function (l, i) { return 'Lượt ' + (i + 1); }),
        datasets: [{ label: 'Độ chính xác (%)', data: s.cong.cacLuot.map(function (l) { return l.tiLe === null ? null : Math.round(l.tiLe * 100); }),
          borderColor: '#4cc27a', backgroundColor: 'rgba(76,194,122,.18)', fill: true, tension: .3, pointRadius: 4 }],
      },
      options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100, ticks: { callback: function (v) { return v + '%'; } } } }, plugins: { legend: { display: false } } },
    });
    var cd = Object.keys(s.quiz.theoChuDe);
    bieuDo(document.getElementById('bd-chu-de'), {
      type: 'bar',
      data: {
        labels: cd.map(function (k) { return SL.TEN_CHU_DE[k] || k; }),
        datasets: [{ label: 'Đúng (%)', data: cd.map(function (k) { var q = s.quiz.theoChuDe[k]; return Math.round(q.dung / q.tong * 100); }),
          backgroundColor: ['#4cc27a', '#4aa3e6', '#e6b84a', '#c77dff'], borderRadius: 8 }],
      },
      options: { maintainAspectRatio: false, indexAxis: 'y', scales: { x: { min: 0, max: 100 } }, plugins: { legend: { display: false } } },
    });
  }

  function khoMay() {
    try { return JSON.parse(localStorage.getItem(KHOA) || 'null') || { hangCho: [], tong: {} }; } catch (e) { return { hangCho: [], tong: {} }; }
  }

  // Khách: dùng các kết quả ghi lúc không đăng nhập
  function veKhach() {
    var d = khoMay();
    var s = SL.motHocSinh(d.hangCho.filter(function (e) { return !e.nguoi; }), d.tienDo);
    veHocSinh(s, null, null);
  }

  async function veHocSinhMay(tk) {
    await window.HSXDongBo.gui();
    var sb = TK.sb;
    var r1 = await sb.from('su_kien').select('loai, dung, tong, du_lieu, luc, ma_su_kien').eq('hoc_sinh_id', tk.id).order('luc').limit(5000);
    if (r1.error) throw r1.error;
    var r2 = await sb.from('tien_do').select('*').eq('hoc_sinh_id', tk.id).maybeSingle();
    var r3 = await sb.rpc('trung_binh_lop');
    // cộng thêm kết quả còn trên máy chưa gửi được (mất mạng)
    var daCo = {};
    r1.data.forEach(function (e) { daCo[e.ma_su_kien] = true; });
    var d = khoMay();
    var cho = d.hangCho.filter(function (e) { return e.nguoi === tk.id && !daCo[e.ma_su_kien]; });
    var td = r2.data || null;
    if (d.tienDo && (!td || (d.tienDo.so_cay || 0) > (td.so_cay || 0))) td = d.tienDo;
    veHocSinh(SL.motHocSinh(r1.data.concat(cho), td), r3.error ? null : r3.data, tk);
  }

  async function batDau() {
    var tk = TK && TK.coMay ? TK.nhoTam() : null;
    if (tk && TK.coMay) {
      try { tk = (await TK.taiHoSo()) || null; } catch (e) { /* mất mạng: dùng bản nhớ */ }
    }
    if (!tk) { veKhach(); return; }
    try {
      if (tk.vai_tro === 'giao_vien') await window.HSXGiaoVien.ve(noiDung, tk, { bieuDo: bieuDo, xoaBieuDo: xoaBieuDo, oSo: oSo });
      else await veHocSinhMay(tk);
    } catch (e) {
      noiDung.innerHTML = '<div class="bao loi">Không tải được số liệu: ' + esc(TK.loiTiengViet(e)) + '</div>';
    }
  }

  window.HSXThongKe = { veKhach: veKhach };
  batDau();
})();
