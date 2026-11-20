/* Tab "Phân tích dữ liệu" của giáo viên: ô số liệu, biểu đồ, bảng từng học sinh, AI tóm tắt (tiếng Việt), xuất .xlsx / .pdf. */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan, SL = window.HSXSoLieu, esc = HSXWeb.esc;

  // Bản tóm tắt AI dùng mã HS01…; đổi lại thành họ tên cho giáo viên đọc
  function doiMa(noiDung, bangMa, hocSinh) {
    var ten = {};
    hocSinh.forEach(function (h) { ten[h.id] = h.hoTen; });
    return String(noiDung || '').replace(/\bHS(\d{2,3})\b/g, function (m) {
      var id = bangMa && bangMa[m];
      return id && ten[id] ? ten[id] + ' (' + m + ')' : m;
    });
  }
  // Markdown rất gọn (## tiêu đề, - gạch đầu dòng, **đậm**) → HTML an toàn
  function mdHtml(s) {
    return esc(s).split(/\r?\n/).map(function (d) {
      d = d.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      if (/^#{1,4}\s+/.test(d)) return '<h4>' + d.replace(/^#{1,4}\s+/, '') + '</h4>';
      if (/^\s*[-*•]\s+/.test(d)) return '<div class="dong-ds">• ' + d.replace(/^\s*[-*•]\s+/, '') + '</div>';
      return d ? '<div>' + d + '</div>' : '';
    }).join('');
  }

  async function ve(o, tt, tro) {
    var s = tt.soLieu, sapXep = { cot: 'hoTen', tang: true };
    var r = await TK.sb.from('tom_tat_ai').select('noi_dung, mo_hinh, bang_ma, tao_luc').eq('lop_id', tt.lop.id).order('tao_luc', { ascending: false }).limit(1);
    var tomTat = r.data && r.data[0] ? r.data[0] : null;

    var cot2 = [['Minigame', tro.MAU.la], ['Flashcard', tro.MAU.lam]];
    o.innerHTML =
      '<div class="thanh-cong-cu"><span class="ghi-cc">Số liệu từ ' + tt.suKien.length + ' kết quả của ' + s.soDaChoi + '/' + s.soHocSinh + ' học sinh. Chỉ phản ánh việc chơi game, không dùng để xếp loại.</span><span class="gian"></span>' +
      '<button class="nut nho" type="button" id="xuat-xlsx">Tải Excel (.xlsx)</button><button class="nut nho" type="button" id="xuat-pdf">Tải PDF</button></div>' +
      '<div class="o-so">' +
      tro.oSo('Học sinh đã chơi', s.soDaChoi + '/' + s.soHocSinh, s.soHoatDong7Ngay + ' em hoạt động trong 7 ngày qua', s.soHocSinh ? s.soDaChoi / s.soHocSinh : null) +
      tro.oSo('Độ chính xác minigame', SL.phanTram(s.tbMinigame), 'Cổng Phân Loại ' + SL.phanTram(s.tbCong) + ', Lều ném rác ' + SL.phanTram(s.tbLeu), s.tbMinigame) +
      tro.oSo('Tỉ lệ trồng cây trung bình', SL.phanTram(s.tbTrongCay), 'Số ô đã trồng / tổng số ô trong game', s.tbTrongCay) +
      tro.oSo('Điểm Flashcard trung bình', SL.phanTram(s.tbQuiz), 'Trung bình các bài kiểm tra 10 câu', s.tbQuiz) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the the-bd"><div class="tieu-bd"><b>Xu hướng theo ngày (% đúng)</b>' + tro.chuGiai(cot2) + '</div>' +
      (s.cacNgay.length ? '<div class="bieu-do"><canvas id="bd-ngay" role="img" aria-label="Biểu đồ đường: tỉ lệ đúng minigame và Flashcard của lớp theo từng ngày, ' + s.cacNgay.length + ' ngày gần nhất"></canvas></div>' +
        '<p class="ghi-bd">' + s.cacNgay.length + ' ngày, tính tới ngày lớp chơi gần nhất (' + s.cacNgay[s.cacNgay.length - 1].ngay.slice(8, 10) + '/' + s.cacNgay[s.cacNgay.length - 1].ngay.slice(5, 7) + ')' + (s.cacNgay.length >= SL.SO_NGAY_XU_HUONG ? ', tối đa ' + SL.SO_NGAY_XU_HUONG + ' ngày' : '') + '. Ngày không ai chơi để trống.</p>' : '<p class="trong">Chưa có số liệu theo ngày.</p>') + '</div>' +
      '<div class="the the-bd"><div class="tieu-bd"><b>Món rác cả lớp hay nhầm (số lần)</b></div>' +
      (s.monSai.length ? '<div class="bieu-do" style="height:' + Math.max(180, Math.min(8, s.monSai.length) * 34 + 40) + 'px"><canvas id="bd-mon" role="img" aria-label="Biểu đồ thanh: các món rác cả lớp hay phân loại nhầm, xếp từ nhiều tới ít"></canvas></div>' : '<p class="trong">Lớp chưa nhầm món nào.</p>') + '</div>' +
      '</div>' +
      '<h3 style="margin-top:32px">Từng học sinh</h3><p style="color:var(--muc-2);margin:-6px 0 12px;font-size:15px">Bấm vào tên cột để sắp xếp.</p><div class="bang-cuon" id="bang-hs"></div>' +
      '<h3 style="margin-top:32px">AI tóm tắt và đánh giá xu hướng</h3>' +
      '<div class="the"><div class="thanh-cong-cu"><span class="ghi-cc" id="ai-tt">' +
      (tomTat ? 'Bản gần nhất: ' + SL.luc(tomTat.tao_luc) + ', mô hình ' + esc(tomTat.mo_hinh || '') : 'Chưa có bản tóm tắt nào.') + '</span><span class="gian"></span>' +
      '<button class="nut chinh nho" type="button" id="ai-tao">Tạo bản tóm tắt mới</button></div>' +
      '<div class="ai-ket-qua" id="ai-nd" aria-live="polite">' + (tomTat ? mdHtml(doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh)) : '<p class="trong">Bấm nút để AI đọc số liệu của lớp và viết nhận xét bằng tiếng Việt. Tên học sinh được đổi thành mã trước khi gửi đi.</p>') + '</div>' +
      '<p style="color:var(--muc-2);font-size:13.5px;margin:14px 0 0">AI có thể sai. Nhận xét chỉ dựa trên dữ liệu chơi game, thầy cô nên đối chiếu với quan sát trên lớp.</p></div>';

    // Biểu đồ
    var phanTramTruc = { min: 0, max: 100, ticks: { stepSize: 25, callback: function (v) { return v + '%'; } } };
    if (s.cacNgay.length) tro.bieuDo(document.getElementById('bd-ngay'), {
      type: 'line',
      data: {
        labels: s.cacNgay.map(function (w) { return w.ngay.slice(8, 10) + '/' + w.ngay.slice(5, 7); }),
        datasets: [
          { label: 'Minigame', data: s.cacNgay.map(function (w) { return w.minigame === null ? null : Math.round(w.minigame * 100); }),
            borderColor: tro.MAU.la, backgroundColor: tro.MAU.la, pointBackgroundColor: tro.MAU.la, pointRadius: 3, spanGaps: true, clip: 8 },
          { label: 'Flashcard', data: s.cacNgay.map(function (w) { return w.quiz === null ? null : Math.round(w.quiz * 100); }),
            borderColor: tro.MAU.lam, backgroundColor: tro.MAU.lam, pointBackgroundColor: tro.MAU.lam, pointRadius: 3, spanGaps: true, clip: 8 },
        ],
      },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { y: phanTramTruc, x: { grid: { display: false }, ticks: { autoSkip: true, maxTicksLimit: 10, maxRotation: 0 } } },
        plugins: { tooltip: { callbacks: {
          title: function (c) { var k = s.cacNgay[c[0].dataIndex].ngay; return 'Ngày ' + k.slice(8, 10) + '/' + k.slice(5, 7) + '/' + k.slice(0, 4); },
          label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.y + '%'; } } } },
      },
    });
    var mon = s.monSai.slice(0, 8);
    if (mon.length) tro.bieuDo(document.getElementById('bd-mon'), {
      type: 'bar',
      data: { labels: mon.map(function (m) { return m.ten; }), datasets: [{ label: 'Số lần nhầm', data: mon.map(function (m) { return m.lan; }), backgroundColor: tro.MAU.la, hoverBackgroundColor: '#3DB46C', maxBarThickness: 24 }] },
      options: {
        indexAxis: 'y', layout: { padding: { right: 36 } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } }, y: { grid: { display: false } } },
        plugins: { tooltip: { callbacks: { label: function (c) { return ' Nhầm ' + c.parsed.x + ' lần'; } } } },
      },
    });

    // Bảng sắp xếp được
    function met(x, them) {
      if (x === null || x === undefined) return '<span class="o-met trong-o"><span>—</span><i class="met"></i></span>' + (them || '');
      return '<span class="o-met"><span>' + SL.phanTram(x) + '</span><i class="met"><i style="width:' + Math.round(x * 100) + '%"></i></i></span>' + (them || '');
    }
    var COT = [
      ['hoTen', 'Họ tên', function (h) { return esc(h.hoTen); }],
      ['chinhXacCong', 'Cổng Phân Loại', function (h) { return met(h.chinhXacCong, ' <small>' + h.cong.luot + ' lượt</small>'); }],
      ['chinhXacLeu', 'Lều ném rác', function (h) { return met(h.chinhXacLeu); }],
      ['diemQuiz', 'Flashcard', function (h) { return met(h.diemQuiz, ' <small>' + h.quiz.luot + ' bài</small>'); }],
      ['tiLeTrongCay', 'Trồng cây', function (h) { return h.soO ? met(h.tiLeTrongCay, ' <small>' + h.soCay + '/' + h.soO + ' ô</small>') : '—'; }],
      ['saoCong', 'Sao cổng', function (h) { return h.saoCong ? '<span aria-label="' + h.saoCong + ' sao">' + '★'.repeat(h.saoCong) + '</span>' : '—'; }],
      ['thoiGian', 'Thời gian', function (h) { return SL.phut(h.thoiGian); }],
      ['cuoi', 'Lần cuối', function (h) { return SL.ngay(h.cuoi); }],
    ];
    function veBang() {
      var ds = s.hocSinh.slice().sort(function (a, b) {
        var x = a[sapXep.cot], y = b[sapXep.cot];
        if (x === null || x === undefined) return 1;
        if (y === null || y === undefined) return -1;
        var k = typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y;
        return sapXep.tang ? k : -k;
      });
      document.getElementById('bang-hs').innerHTML = '<table class="bang"><thead><tr>' + COT.map(function (c) {
        var mui = sapXep.cot === c[0] ? (sapXep.tang ? ' ▲' : ' ▼') : '';
        return '<th data-cot="' + c[0] + '" tabindex="0" aria-sort="' + (mui ? (sapXep.tang ? 'ascending' : 'descending') : 'none') + '">' + c[1] + '<span aria-hidden="true">' + mui + '</span></th>';
      }).join('') + '</tr></thead><tbody>' + ds.map(function (h) {
        return '<tr>' + COT.map(function (c, i) { return '<td' + (i ? ' class="so"' : '') + '>' + c[2](h) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
      document.querySelectorAll('#bang-hs th').forEach(function (th) {
        function sap() {
          var c = th.getAttribute('data-cot');
          sapXep = { cot: c, tang: sapXep.cot === c ? !sapXep.tang : c === 'hoTen' };
          veBang();
          var moi = document.querySelector('#bang-hs th[data-cot="' + c + '"]');
          if (moi) moi.focus();
        }
        th.addEventListener('click', sap);
        th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sap(); } });
      });
    }
    veBang();

    // AI
    document.getElementById('ai-tao').addEventListener('click', async function () {
      var nut = this, nd = document.getElementById('ai-nd');
      nut.disabled = true;
      nut.textContent = 'AI đang đọc số liệu…';
      nd.innerHTML = '<p class="trong">Đang tạo bản tóm tắt, thường mất 10–40 giây…</p>';
      try {
        tomTat = await TK.goiHam('tom-tat-lop', { lop_id: tt.lop.id });
        nd.innerHTML = mdHtml(doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh));
        document.getElementById('ai-tt').textContent = 'Bản mới: ' + SL.luc(tomTat.tao_luc) + ', mô hình ' + (tomTat.mo_hinh || '');
      } catch (e) {
        nd.innerHTML = '<div class="bao loi">' + esc(e.message) + '</div>';
      } finally {
        nut.disabled = false;
        nut.textContent = 'Tạo bản tóm tắt mới';
      }
    });

    // Xuất file
    function aiChu() { return tomTat ? { noiDung: doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh), luc: tomTat.tao_luc, moHinh: tomTat.mo_hinh } : null; }
    function xuat(nut, viec) {
      var cu = nut.textContent;
      nut.disabled = true; nut.textContent = 'Đang tạo file…';
      viec().catch(function (e) { alert('Không xuất được file: ' + (e && e.message)); })
        .then(function () { nut.disabled = false; nut.textContent = cu; });
    }
    document.getElementById('xuat-xlsx').addEventListener('click', function () { xuat(this, function () { return window.HSXXuat.excelLop(tt, aiChu()); }); });
    document.getElementById('xuat-pdf').addEventListener('click', function () {
      var anh = ['bd-ngay', 'bd-mon'].map(function (id) {
        var c = document.getElementById(id);
        return c ? { img: c, rong: c.width, cao: c.height } : null;
      }).filter(Boolean);
      xuat(this, function () { return window.HSXXuat.pdfLop(tt, aiChu(), anh); });
    });
  }

  window.HSXPhanTich = { ve: ve, doiMa: doiMa };
})();
