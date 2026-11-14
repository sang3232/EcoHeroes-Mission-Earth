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
      if (/^\s*[-*•]\s+/.test(d)) return '<div style="padding-left:18px;text-indent:-12px">• ' + d.replace(/^\s*[-*•]\s+/, '') + '</div>';
      return d ? '<div>' + d + '</div>' : '';
    }).join('');
  }

  async function ve(o, tt, tro) {
    var s = tt.soLieu, sapXep = { cot: 'hoTen', tang: true };
    var r = await TK.sb.from('tom_tat_ai').select('noi_dung, mo_hinh, bang_ma, tao_luc').eq('lop_id', tt.lop.id).order('tao_luc', { ascending: false }).limit(1);
    var tomTat = r.data && r.data[0] ? r.data[0] : null;

    o.innerHTML =
      '<div class="thanh-cong-cu"><span style="color:var(--mo)">Số liệu ' + tt.suKien.length + ' kết quả của ' + s.soDaChoi + '/' + s.soHocSinh + ' học sinh. Chỉ phản ánh việc chơi game, không dùng để xếp loại.</span><span class="gian"></span>' +
      '<button class="nut nho" type="button" id="xuat-xlsx">⬇ Excel (.xlsx)</button><button class="nut nho" type="button" id="xuat-pdf">⬇ PDF</button></div>' +
      '<div class="o-so">' +
      tro.oSo('👥 Học sinh đã chơi', s.soDaChoi + '/' + s.soHocSinh, s.soHoatDong7Ngay + ' em hoạt động trong 7 ngày qua', s.soHocSinh ? s.soDaChoi / s.soHocSinh : null) +
      tro.oSo('🎯 Độ chính xác minigame', SL.phanTram(s.tbMinigame), 'Cổng ' + SL.phanTram(s.tbCong) + ' · Lều ' + SL.phanTram(s.tbLeu), s.tbMinigame) +
      tro.oSo('🌳 Tỉ lệ trồng cây TB', SL.phanTram(s.tbTrongCay), 'Số ô đã trồng / tổng số ô trong game', s.tbTrongCay) +
      tro.oSo('🃏 Điểm Flashcard TB', SL.phanTram(s.tbQuiz), 'Trung bình các bài kiểm tra', s.tbQuiz) +
      '</div>' +
      '<div class="hai-cot">' +
      '<div class="the"><b>Xu hướng theo tuần</b><div class="bieu-do"><canvas id="bd-tuan" aria-label="Biểu đồ xu hướng theo tuần"></canvas></div></div>' +
      '<div class="the"><b>Món rác cả lớp hay nhầm</b><div class="bieu-do"><canvas id="bd-mon" aria-label="Biểu đồ món rác hay nhầm"></canvas></div></div>' +
      '</div>' +
      '<div class="the" style="margin-top:20px"><b>Độ chính xác minigame và điểm quiz của từng học sinh</b><div class="bieu-do" style="height:' + Math.max(260, s.hocSinh.length * 26) + 'px"><canvas id="bd-hs" aria-label="Biểu đồ từng học sinh"></canvas></div></div>' +
      '<h3 style="margin-top:28px">Bảng từng học sinh</h3><div class="bang-cuon" id="bang-hs"></div>' +
      '<h3 style="margin-top:28px">🤖 AI tóm tắt &amp; đánh giá xu hướng</h3>' +
      '<div class="the"><div class="thanh-cong-cu"><span style="color:var(--mo)" id="ai-tt">' +
      (tomTat ? 'Bản gần nhất: ' + SL.luc(tomTat.tao_luc) + ' · mô hình ' + esc(tomTat.mo_hinh || '') : 'Chưa có bản tóm tắt nào.') + '</span><span class="gian"></span>' +
      '<button class="nut vang nho" type="button" id="ai-tao">✨ Tạo bản tóm tắt mới</button></div>' +
      '<div class="ai-ket-qua" id="ai-nd">' + (tomTat ? mdHtml(doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh)) : '<p class="trong">Bấm nút để AI đọc số liệu của lớp và viết nhận xét bằng tiếng Việt. Tên học sinh được đổi thành mã trước khi gửi đi.</p>') + '</div>' +
      '<p style="color:var(--mo);font-size:13px;margin:12px 0 0">AI có thể sai. Nhận xét chỉ dựa trên dữ liệu chơi game, thầy cô nên đối chiếu với quan sát trên lớp.</p></div>';

    // Biểu đồ
    tro.bieuDo(document.getElementById('bd-tuan'), {
      type: 'line',
      data: {
        labels: s.cacTuan.map(function (w) { return 'Tuần ' + w.tuan.slice(8, 10) + '/' + w.tuan.slice(5, 7); }),
        datasets: [
          { label: 'Minigame (%)', data: s.cacTuan.map(function (w) { return w.minigame === null ? null : Math.round(w.minigame * 100); }), borderColor: '#4cc27a', backgroundColor: 'rgba(76,194,122,.15)', fill: true, tension: .3, spanGaps: true },
          { label: 'Flashcard (%)', data: s.cacTuan.map(function (w) { return w.quiz === null ? null : Math.round(w.quiz * 100); }), borderColor: '#e6b84a', backgroundColor: 'rgba(230,184,74,.1)', tension: .3, spanGaps: true },
        ],
      },
      options: { maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } },
    });
    var mon = s.monSai.slice(0, 8);
    tro.bieuDo(document.getElementById('bd-mon'), {
      type: 'bar',
      data: { labels: mon.map(function (m) { return m.ten; }), datasets: [{ label: 'Số lần nhầm', data: mon.map(function (m) { return m.lan; }), backgroundColor: '#e05a5a', borderRadius: 6 }] },
      options: { maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { precision: 0 } } } },
    });
    tro.bieuDo(document.getElementById('bd-hs'), {
      type: 'bar',
      data: {
        labels: s.hocSinh.map(function (h) { return h.hoTen; }),
        datasets: [
          { label: 'Minigame (%)', data: s.hocSinh.map(function (h) { return h.chinhXacMinigame === null ? 0 : Math.round(h.chinhXacMinigame * 100); }), backgroundColor: '#4cc27a', borderRadius: 4 },
          { label: 'Flashcard (%)', data: s.hocSinh.map(function (h) { return h.diemQuiz === null ? 0 : Math.round(h.diemQuiz * 100); }), backgroundColor: '#e6b84a', borderRadius: 4 },
        ],
      },
      options: { maintainAspectRatio: false, indexAxis: 'y', scales: { x: { min: 0, max: 100 } } },
    });

    // Bảng sắp xếp được
    var COT = [
      ['hoTen', 'Họ tên', function (h) { return esc(h.hoTen); }],
      ['chinhXacCong', 'Cổng Phân Loại', function (h) { return SL.phanTram(h.chinhXacCong) + ' <small style="color:var(--mo)">(' + h.cong.luot + ' lượt)</small>'; }],
      ['chinhXacLeu', 'Lều ném rác', function (h) { return SL.phanTram(h.chinhXacLeu); }],
      ['diemQuiz', 'Flashcard', function (h) { return SL.phanTram(h.diemQuiz) + ' <small style="color:var(--mo)">(' + h.quiz.luot + ' bài)</small>'; }],
      ['tiLeTrongCay', 'Trồng cây', function (h) { return h.soO ? h.soCay + '/' + h.soO + ' (' + SL.phanTram(h.tiLeTrongCay) + ')' : '—'; }],
      ['saoCong', 'Sao cổng', function (h) { return h.saoCong ? '★'.repeat(h.saoCong) : '—'; }],
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
        return '<th data-cot="' + c[0] + '" aria-sort="' + (mui ? (sapXep.tang ? 'ascending' : 'descending') : 'none') + '">' + c[1] + mui + '</th>';
      }).join('') + '</tr></thead><tbody>' + ds.map(function (h) {
        return '<tr>' + COT.map(function (c, i) { return '<td' + (i ? ' class="so"' : '') + '>' + c[2](h) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
      document.querySelectorAll('#bang-hs th').forEach(function (th) {
        th.addEventListener('click', function () {
          var c = th.getAttribute('data-cot');
          sapXep = { cot: c, tang: sapXep.cot === c ? !sapXep.tang : c === 'hoTen' };
          veBang();
        });
      });
    }
    veBang();

    // AI
    document.getElementById('ai-tao').addEventListener('click', async function () {
      var nut = this, nd = document.getElementById('ai-nd');
      nut.disabled = true;
      nut.textContent = '⏳ AI đang đọc số liệu…';
      nd.innerHTML = '<p class="trong">Đang tạo bản tóm tắt, thường mất 10–40 giây…</p>';
      try {
        tomTat = await TK.goiHam('tom-tat-lop', { lop_id: tt.lop.id });
        nd.innerHTML = mdHtml(doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh));
        document.getElementById('ai-tt').textContent = 'Bản mới: ' + SL.luc(tomTat.tao_luc) + ' · mô hình ' + (tomTat.mo_hinh || '');
      } catch (e) {
        nd.innerHTML = '<div class="bao loi">' + esc(e.message) + '</div>';
      } finally {
        nut.disabled = false;
        nut.textContent = '✨ Tạo bản tóm tắt mới';
      }
    });

    // Xuất file
    function aiChu() { return tomTat ? { noiDung: doiMa(tomTat.noi_dung, tomTat.bang_ma, s.hocSinh), luc: tomTat.tao_luc, moHinh: tomTat.mo_hinh } : null; }
    function xuat(nut, viec) {
      var cu = nut.textContent;
      nut.disabled = true; nut.textContent = '⏳ Đang tạo file…';
      viec().catch(function (e) { alert('Không xuất được file: ' + (e && e.message)); })
        .then(function () { nut.disabled = false; nut.textContent = cu; });
    }
    document.getElementById('xuat-xlsx').addEventListener('click', function () { xuat(this, function () { return window.HSXXuat.excelLop(tt, aiChu()); }); });
    document.getElementById('xuat-pdf').addEventListener('click', function () {
      var anh = ['bd-tuan', 'bd-mon', 'bd-hs'].map(function (id) {
        var c = document.getElementById(id);
        return c ? { img: c, rong: c.width, cao: c.height } : null;
      }).filter(Boolean);
      xuat(this, function () { return window.HSXXuat.pdfLop(tt, aiChu(), anh); });
    });
  }

  window.HSXPhanTich = { ve: ve, doiMa: doiMa };
})();
