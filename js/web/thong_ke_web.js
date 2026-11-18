/* Trang Thống kê: chọn giao diện theo vai trò.
   - Khách: số liệu trên máy này (hàng chờ 'hoi-sinh-xanh-hoc-tap').
   - Học sinh: số liệu trên lớp học (su_kien, tien_do) + kết quả chưa kịp gửi, so với trung bình lớp.
   - Giáo viên: bảng điều khiển lớp (js/web/lop_hoc.js, js/web/phan_tich.js).
   Biểu đồ nền sáng: một chuỗi một màu, đường 2px, chấm có viền trắng, thanh <= 24px bo 4px ở đầu,
   giá trị ghi ở đầu thanh, chú giải chỉ khi có từ 2 chuỗi. */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan, SL = window.HSXSoLieu, esc = HSXWeb.esc;
  var noiDung = document.getElementById('noi-dung');
  var KHOA = 'hoi-sinh-xanh-hoc-tap';
  var MAU = { la: '#2E9E5B', lam: '#2F7FC1', chu: '#11312A', chu2: '#44605A', luoi: '#E3EEE8', truc: '#CFE0D6' };

  // ---------- Cấu hình chung Chart.js ----------
  if (window.Chart) {
    var D = Chart.defaults;
    D.color = MAU.chu2;
    D.borderColor = MAU.luoi;
    D.font.family = '"Be Vietnam Pro", "Segoe UI", sans-serif';
    D.font.size = 13;
    D.maintainAspectRatio = false;
    D.elements.line.borderWidth = 2;
    D.elements.line.borderCapStyle = 'round';
    D.elements.line.borderJoinStyle = 'round';
    D.elements.line.tension = 0.25;
    D.elements.point.radius = 4;
    D.elements.point.hoverRadius = 6;
    D.elements.point.borderWidth = 2;
    D.elements.point.borderColor = '#FFFFFF';
    D.elements.point.hitRadius = 14;
    D.elements.bar.borderRadius = 4;
    D.elements.bar.borderSkipped = 'start';
    D.scale.grid.color = MAU.luoi;
    D.scale.border.color = MAU.truc;
    D.plugins.legend.display = false;
    var tt = D.plugins.tooltip;
    tt.backgroundColor = '#FFFFFF';
    tt.titleColor = MAU.chu2;
    tt.bodyColor = MAU.chu;
    tt.borderColor = MAU.truc;
    tt.borderWidth = 1;
    tt.padding = 10;
    tt.cornerRadius = 10;
    tt.boxWidth = 14;
    tt.boxHeight = 3;
    tt.titleFont = { weight: '600', size: 12 };
    tt.bodyFont = { weight: '700', size: 13 };
  }

  // Đường dọc theo điểm đang trỏ (biểu đồ đường)
  var duongDoc = {
    id: 'duongDoc',
    afterDatasetsDraw: function (c) {
      var a = c.tooltip && c.tooltip.getActiveElements ? c.tooltip.getActiveElements() : [];
      if (!a.length || c.config.type !== 'line') return;
      var x = a[0].element.x, g = c.ctx;
      g.save();
      g.strokeStyle = MAU.truc;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, c.chartArea.top); g.lineTo(x, c.chartArea.bottom); g.stroke();
      g.restore();
    },
  };
  // Ghi giá trị ở đầu thanh (biểu đồ thanh ngang)
  var nhanDauThanh = {
    id: 'nhanDauThanh',
    afterDatasetsDraw: function (c, args, tuyChon) {
      if (c.config.type !== 'bar' || c.options.indexAxis !== 'y') return;
      var g = c.ctx, duoi = (tuyChon && tuyChon.duoi) || '';
      g.save();
      g.font = '700 12.5px "Be Vietnam Pro", "Segoe UI", sans-serif';
      g.fillStyle = MAU.chu;
      g.textBaseline = 'middle';
      c.getDatasetMeta(0).data.forEach(function (el, i) {
        var v = c.data.datasets[0].data[i];
        if (v === null || v === undefined) return;
        g.fillText(v + duoi, el.x + 8, el.y);
      });
      g.restore();
    },
  };

  var cacBieuDo = [];
  function bieuDo(canvas, cauHinh) {
    if (!window.Chart || !canvas) return null;
    cauHinh.plugins = (cauHinh.plugins || []).concat([duongDoc, nhanDauThanh]);
    var c = new Chart(canvas, cauHinh);
    cacBieuDo.push(c);
    return c;
  }
  function xoaBieuDo() { cacBieuDo.forEach(function (c) { c.destroy(); }); cacBieuDo = []; }
  function oSo(ten, giaTri, ghi, thanh) {
    return '<div class="the"><div class="ten">' + ten + '</div><div class="gia-tri">' + giaTri + '</div>' +
      (thanh !== undefined && thanh !== null ? '<div class="thanh" role="presentation"><i style="width:' + Math.round(Math.max(0, Math.min(1, thanh)) * 100) + '%"></i></div>' : '') +
      (ghi ? '<div class="ghi" style="margin-top:8px">' + ghi + '</div>' : '') + '</div>';
  }
  function chuGiai(ds) {
    return '<ul class="chu-giai">' + ds.map(function (d) { return '<li><i style="--mau:' + d[1] + '"></i>' + d[0] + '</li>'; }).join('') + '</ul>';
  }

  // Gợi ý cho món rác hay nhầm (lấy từ dữ liệu game)
  var GOI_Y = {};
  if (window.HSX && HSX.DATA) {
    var NHOM = {};
    HSX.DATA.puzzle.binsR2.forEach(function (b) { NHOM[b.id] = b; });
    HSX.DATA.puzzle.items.forEach(function (it) { GOI_Y[it.name] = { emo: it.emoji, thung: NHOM[it.cat].name, goiY: it.hint }; });
    HSX.DATA.sortItems.forEach(function (it) {
      if (!GOI_Y[it.name]) GOI_Y[it.name] = { emo: it.emoji, thung: HSX.DATA.bins[it.bin].name, goiY: it.hint };
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
    var sao = function (n) { return '★'.repeat(n) + '☆'.repeat(3 - n); };
    var chuaChoi = !s.soSuKien && !s.soCay;
    var coCong = s.cong.cacLuot.length > 0, cd = Object.keys(s.quiz.theoChuDe);
    noiDung.innerHTML =
      '<div class="dau-tk"><div>' +
      '<h2>' + (laKhach ? 'Tiến bộ trên máy này' : 'Tiến bộ của ' + esc(tk.ten)) + '</h2>' +
      '<p>' + (laKhach
        ? 'Em đang dùng chế độ khách: số liệu chỉ lưu trong trình duyệt này. <a href="dang-nhap.html">Đăng nhập bằng mã lớp</a> để lưu lâu dài và để thầy cô xem được.'
        : (tk.lop ? esc(HSXKho.tenLop(tk.lop)) + '. ' : '') + 'Số liệu cập nhật mỗi khi em chơi hoặc làm bài ôn tập.') + '</p></div>' +
      '<div class="hang-nut" style="margin:0"><a class="nut chinh" href="hoi-sinh-xanh.html">Chơi tiếp</a><a class="nut" href="on-tap.html">Ôn tập</a></div></div>' +
      (chuaChoi ? '<div class="bao tin">Chưa có kết quả nào. Hãy <a href="hoi-sinh-xanh.html">chơi Hồi Sinh Xanh</a> tới Cổng Phân Loại, hoặc <a href="on-tap.html">làm bài ôn tập</a>.</div>' : '') +

      '<section class="muc-tk"><h3><span class="so-muc">1</span>Độ chính xác minigame</h3>' +
      '<div class="o-so">' +
      oSo('Cổng Phân Loại', SL.phanTram(s.chinhXacCong), s.cong.luot + ' lượt, ' + s.cong.dung + '/' + s.cong.tong + ' món đúng. Sao cao nhất <span aria-label="' + s.saoCong + ' trên 3 sao">' + sao(s.saoCong) + '</span>', s.chinhXacCong) +
      oSo('Lều ném rác', SL.phanTram(s.chinhXacLeu), s.leu.dung + '/' + s.leu.tong + ' lần ném trúng thùng', s.chinhXacLeu) +
      oSo('Tính chung', SL.phanTram(s.chinhXacMinigame), soSanh(s.chinhXacMinigame, tbLop && tbLop.chinh_xac), s.chinhXacMinigame) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the the-bd"><div class="tieu-bd"><b>Độ chính xác từng lượt Cổng Phân Loại</b></div>' +
      (coCong ? '<div class="bieu-do"><canvas id="bd-cong" role="img" aria-label="Biểu đồ độ chính xác theo từng lượt chơi Cổng Phân Loại"></canvas></div>' : '<p class="trong">Chưa chơi lượt nào.</p>') + '</div>' +
      '<div class="the"><b>Món em hay nhầm</b>' + (monSai.length ? '<ul class="ds-sai">' + monSai.map(function (m) {
        var g = GOI_Y[m.ten] || {};
        return '<li><span class="emo" aria-hidden="true">' + (g.emo || '') + '</span><div><b>' + esc(m.ten) + '</b><small>Đúng: ' + esc(g.thung || '') + (g.goiY ? '. ' + esc(g.goiY) : '') + '</small></div><span class="lan">' + m.lan + ' lần</span></li>';
      }).join('') + '</ul><a class="nut nho" href="on-tap.html?on=sai&chu_de=phan_loai">Ôn lại các món này</a>' : '<p class="trong">Chưa nhầm món nào. Giỏi lắm!</p>') + '</div>' +
      '</div></section>' +

      '<section class="muc-tk"><h3><span class="so-muc">2</span>Tỉ lệ trồng cây</h3>' +
      '<div class="o-so">' +
      oSo('Ô đất đã trồng', s.soO ? s.soCay + '/' + s.soO : '—', s.tiLeTrongCay !== null ? SL.phanTram(s.tiLeTrongCay) + ' số ô trong game. ' + soSanh(s.tiLeTrongCay, tbLop && tbLop.trong_cay) : 'Vào game trồng cây để có số liệu.', s.tiLeTrongCay) +
      oSo('Cây đã trưởng thành', s.soCayLon || 0, (s.soLoaiCay || 0) + ' loài cây khác nhau') +
      oSo('Số lần tự tay trồng', s.trongLan, 'Không tính cây đom đóm tự gieo') +
      oSo('Thời gian chơi', SL.phut(s.thoiGian), s.cuoi ? 'Lần gần nhất: ' + SL.luc(s.cuoi) : '') +
      '</div></section>' +

      '<section class="muc-tk"><h3><span class="so-muc">3</span>Flashcard Quiz</h3>' +
      '<div class="o-so">' +
      oSo('Điểm trung bình', SL.phanTram(s.diemQuiz), s.quiz.luot + ' bài, ' + s.quiz.dung + '/' + s.quiz.tong + ' câu đúng. ' + soSanh(s.diemQuiz, tbLop && tbLop.quiz), s.diemQuiz) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the the-bd"><div class="tieu-bd"><b>Tỉ lệ đúng theo chủ đề</b></div>' +
      (cd.length ? '<div class="bieu-do" style="height:' + Math.max(150, cd.length * 52 + 50) + 'px"><canvas id="bd-chu-de" role="img" aria-label="Biểu đồ tỉ lệ trả lời đúng theo chủ đề"></canvas></div>' : '<p class="trong">Chưa làm bài nào.</p>') + '</div>' +
      '<div class="the"><b>Các bài gần đây</b>' + (s.quiz.cacLuot.length ? '<ul class="ds-gan">' +
        s.quiz.cacLuot.slice(-6).reverse().map(function (q) {
          return '<li><span>' + SL.luc(q.luc) + ', ' + esc(SL.TEN_CHU_DE[q.chuDe] || q.chuDe || '') + '</span><b>' + SL.phanTram(q.tiLe) + '</b></li>';
        }).join('') + '</ul>' : '<p class="trong">Chưa làm bài nào.</p>') +
      '<div class="hang-nut" style="margin-top:6px"><a class="nut chinh nho" href="on-tap.html?che_do=kiem_tra">Làm bài mới</a><a class="nut nho" href="on-tap.html?on=sai">Ôn thẻ hay sai</a></div></div>' +
      '</div></section>';

    if (coCong) bieuDo(document.getElementById('bd-cong'), {
      type: 'line',
      data: {
        labels: s.cong.cacLuot.map(function (l, i) { return 'Lượt ' + (i + 1); }),
        datasets: [{ label: 'Độ chính xác', data: s.cong.cacLuot.map(function (l) { return l.tiLe === null ? null : Math.round(l.tiLe * 100); }),
          borderColor: MAU.la, backgroundColor: 'rgba(46,158,91,.10)', pointBackgroundColor: MAU.la, fill: true, spanGaps: true, clip: 8 }],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { y: { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } } }, x: { grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: function (c) { return ' ' + c.parsed.y + '% đúng'; } } } },
      },
    });
    if (cd.length) bieuDo(document.getElementById('bd-chu-de'), {
      type: 'bar',
      data: {
        labels: cd.map(function (k) { return SL.TEN_CHU_DE[k] || k; }),
        datasets: [{ label: 'Tỉ lệ đúng', data: cd.map(function (k) { var q = s.quiz.theoChuDe[k]; return Math.round(q.dung / q.tong * 100); }),
          backgroundColor: MAU.la, hoverBackgroundColor: '#3DB46C', maxBarThickness: 24 }],
      },
      options: {
        indexAxis: 'y', layout: { padding: { right: 44 } },
        scales: { x: { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } } }, y: { grid: { display: false } } },
        plugins: { nhanDauThanh: { duoi: '%' }, tooltip: { callbacks: { label: function (c) { return ' ' + c.parsed.x + '% câu đúng'; } } } },
      },
    });
  }

  // Kho học tập trên máy này của đúng tài khoản tk (null = khách), xem js/kho_tai_khoan.js
  function khoMay(tk) {
    var k = window.HSXKho ? HSXKho.hocTap(tk || null) : KHOA;
    try { return JSON.parse(localStorage.getItem(k) || 'null') || { hangCho: [], tong: {} }; } catch (e) { return { hangCho: [], tong: {} }; }
  }

  // Khách: dùng các kết quả ghi lúc không đăng nhập
  function veKhach() {
    var d = khoMay(null);
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
    var d = khoMay(tk);
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
      if (tk.vai_tro === 'giao_vien') await window.HSXGiaoVien.ve(noiDung, tk, { bieuDo: bieuDo, xoaBieuDo: xoaBieuDo, oSo: oSo, chuGiai: chuGiai, MAU: MAU });
      else await veHocSinhMay(tk);
    } catch (e) {
      noiDung.innerHTML = '<div class="bao loi">Không tải được số liệu: ' + esc(TK.loiTiengViet(e)) + '</div>';
    }
  }

  window.HSXThongKe = { veKhach: veKhach, veHocSinh: veHocSinh };
  batDau();
})();
