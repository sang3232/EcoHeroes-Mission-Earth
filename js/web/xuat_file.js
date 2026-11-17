/* Xuất file cho giáo viên: Excel (.xlsx, SheetJS), PDF (jsPDF + autotable, phông Be Vietnam Pro có dấu tiếng Việt),
   danh sách đăng nhập và phiếu in cho học sinh. Thư viện chỉ tải khi bấm nút. */
(function () {
  'use strict';
  var SL = window.HSXSoLieu;
  var TV = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    autotable: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  };
  // Be Vietnam Pro (giấy phép OFL), bản TTF trong gói npm @expo-google-fonts, ghim phiên bản
  var PHONG = 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/be-vietnam-pro@0.4.0/';
  var daTai = {};

  function taiScript(url) {
    if (daTai[url]) return daTai[url];
    daTai[url] = new Promise(function (ok, loi) {
      var s = document.createElement('script');
      s.src = url; s.onload = ok;
      s.onerror = function () { delete daTai[url]; loi(new Error('Không tải được thư viện, kiểm tra kết nối mạng.')); };
      document.head.appendChild(s);
    });
    return daTai[url];
  }
  async function taiPhong(ten) {
    var r = await fetch(PHONG + ten);
    if (!r.ok) throw new Error('Không tải được phông chữ tiếng Việt.');
    var b = new Uint8Array(await r.arrayBuffer()), s = '';
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function tenFile(lop, duoi) {
    var t = String(lop.ten).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    var n = new Date();
    return 'HoiSinhXanh_' + (t || lop.ma_lop) + '_' + n.getFullYear() + String(n.getMonth() + 1).padStart(2, '0') + String(n.getDate()).padStart(2, '0') + '.' + duoi;
  }
  var pt = function (x) { return x === null || x === undefined ? '' : Math.round(x * 100); };

  // ---------- Excel ----------
  async function excelLop(tt, ai) {
    await taiScript(TV.xlsx);
    var s = tt.soLieu, wb = XLSX.utils.book_new(), ten = {};
    tt.hocSinh.forEach(function (h) { ten[h.id] = h.ho_ten; });
    var tongHop = [
      ['Báo cáo lớp', tt.lop.ten], ['Mã lớp', tt.lop.ma_lop], ['Ngày xuất', new Date().toLocaleString('vi-VN')], [],
      ['Chỉ số', 'Giá trị'],
      ['Số học sinh', s.soHocSinh], ['Học sinh đã chơi', s.soDaChoi], ['Hoạt động trong 7 ngày', s.soHoatDong7Ngay],
      ['Độ chính xác minigame TB (%)', pt(s.tbMinigame)], ['Cổng Phân Loại TB (%)', pt(s.tbCong)], ['Lều ném rác TB (%)', pt(s.tbLeu)],
      ['Tỉ lệ trồng cây TB (%)', pt(s.tbTrongCay)], ['Điểm Flashcard TB (%)', pt(s.tbQuiz)], [],
      ['Ghi chú', 'Số liệu chỉ phản ánh việc chơi game, không dùng để đánh giá hay xếp loại học sinh.'],
    ];
    var ws1 = XLSX.utils.aoa_to_sheet(tongHop);
    ws1['!cols'] = [{ wch: 32 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp');

    var tungHs = s.hocSinh.map(function (h) {
      return {
        'Họ tên': h.hoTen, 'Tên đăng nhập': h.tenDn,
        'Cổng Phân Loại (%)': pt(h.chinhXacCong), 'Số lượt cổng': h.cong.luot, 'Sao cổng cao nhất': h.saoCong,
        'Lều ném rác (%)': pt(h.chinhXacLeu), 'Số lần ném': h.leu.tong,
        'Minigame chung (%)': pt(h.chinhXacMinigame),
        'Flashcard (%)': pt(h.diemQuiz), 'Số bài Flashcard': h.quiz.luot,
        'Ô đã trồng': h.soCay, 'Tổng số ô': h.soO, 'Tỉ lệ trồng cây (%)': pt(h.tiLeTrongCay), 'Cây trưởng thành': h.soCayLon,
        'Thời gian chơi (phút)': Math.round((h.thoiGian || 0) / 60), 'Lần cuối': h.cuoi ? new Date(h.cuoi).toLocaleString('vi-VN') : '',
      };
    });
    var ws2 = XLSX.utils.json_to_sheet(tungHs);
    ws2['!cols'] = Object.keys(tungHs[0] || { a: 1 }).map(function (k) { return { wch: Math.max(12, k.length + 2) }; });
    XLSX.utils.book_append_sheet(wb, ws2, 'Từng học sinh');

    var luot = tt.suKien.map(function (e) {
      var dl = e.du_lieu || {}, ct = '';
      if (e.loai === 'cong_phan_loai') ct = (dl.xong === false ? 'Bỏ dở' : 'Hoàn thành, ' + (dl.sao || 0) + ' sao');
      else if (e.loai === 'leu_nem_rac') ct = (dl.ten || '');
      else if (e.loai === 'quiz') ct = SL.TEN_CHU_DE[dl.chu_de] || dl.chu_de || '';
      else if (e.loai === 'trong_cay' || e.loai === 'dao_cay') ct = (dl.cay || '') + ' · ' + (dl.phong || '');
      return { 'Thời điểm': new Date(e.luc).toLocaleString('vi-VN'), 'Họ tên': ten[e.hoc_sinh_id] || '', 'Loại': SL.TEN_LOAI[e.loai] || e.loai,
        'Đúng': e.dung, 'Tổng': e.tong, 'Tỉ lệ (%)': e.tong ? Math.round(e.dung / e.tong * 100) : '', 'Chi tiết': ct };
    });
    var ws3 = XLSX.utils.json_to_sheet(luot.length ? luot : [{ 'Thời điểm': 'Chưa có kết quả' }]);
    ws3['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 18 }, { wch: 7 }, { wch: 7 }, { wch: 10 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Lượt chơi');

    var ws4 = XLSX.utils.json_to_sheet(s.monSai.length ? s.monSai.map(function (m) { return { 'Món rác': m.ten, 'Số lần nhầm': m.lan }; }) : [{ 'Món rác': 'Chưa có' }]);
    ws4['!cols'] = [{ wch: 28 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws4, 'Món hay nhầm');

    var dongAi = ai ? [['Tóm tắt AI', new Date(ai.luc).toLocaleString('vi-VN') + ' · ' + (ai.moHinh || '')], []]
      .concat(ai.noiDung.split(/\r?\n/).map(function (d) { return [d.replace(/^#+\s*/, '').replace(/\*\*/g, '')]; }))
      : [['Chưa có bản tóm tắt AI. Bấm "Tạo bản tóm tắt mới" trong tab Phân tích dữ liệu.']];
    var ws5 = XLSX.utils.aoa_to_sheet(dongAi);
    ws5['!cols'] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(wb, ws5, 'Tóm tắt AI');

    XLSX.writeFile(wb, tenFile(tt.lop, 'xlsx'));
  }

  // ---------- PDF ----------
  async function pdfLop(tt, ai, cacAnh) {
    await taiScript(TV.jspdf);
    await taiScript(TV.autotable);
    var phong = await Promise.all([taiPhong('400Regular/BeVietnamPro_400Regular.ttf'), taiPhong('700Bold/BeVietnamPro_700Bold.ttf')]);
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.addFileToVFS('BVP-R.ttf', phong[0]); doc.addFont('BVP-R.ttf', 'BVP', 'normal');
    doc.addFileToVFS('BVP-B.ttf', phong[1]); doc.addFont('BVP-B.ttf', 'BVP', 'bold');
    var s = tt.soLieu, W = 210, LE = 14, y = 16;
    function chu(c, co, dam, mau) { doc.setFont('BVP', dam ? 'bold' : 'normal'); doc.setFontSize(co); doc.setTextColor.apply(doc, mau || [20, 32, 26]); doc.text(c, LE, y); }
    function canTrang(cao) { if (y + cao > 285) { doc.addPage(); y = 16; } }

    chu('Hồi Sinh Xanh · Báo cáo lớp ' + tt.lop.ten, 17, true, [17, 49, 42]); y += 7;
    chu('Mã lớp ' + tt.lop.ma_lop + ' · xuất ngày ' + new Date().toLocaleString('vi-VN'), 10, false, [90, 100, 95]); y += 8;

    // ô số liệu
    var o = [
      ['Học sinh đã chơi', s.soDaChoi + '/' + s.soHocSinh],
      ['Độ chính xác minigame', SL.phanTram(s.tbMinigame)],
      ['Tỉ lệ trồng cây TB', SL.phanTram(s.tbTrongCay)],
      ['Điểm Flashcard TB', SL.phanTram(s.tbQuiz)],
    ];
    var rong = (W - 2 * LE - 9) / 4;
    o.forEach(function (x, i) {
      var ox = LE + i * (rong + 3);
      doc.setFillColor(237, 247, 240); doc.setDrawColor(190, 220, 200); doc.roundedRect(ox, y, rong, 20, 2, 2, 'FD');
      doc.setFont('BVP', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 100, 95); doc.text(x[0], ox + 3, y + 6);
      doc.setFont('BVP', 'bold'); doc.setFontSize(15); doc.setTextColor(20, 32, 26); doc.text(String(x[1]), ox + 3, y + 15);
    });
    y += 27;

    // biểu đồ (nền trắng như trên web, viền mảnh)
    function veAnh(a, x, rong, cao) {
      doc.setFillColor(255, 255, 255); doc.setDrawColor(207, 224, 214); doc.roundedRect(x, y, rong, cao, 2, 2, 'FD');
      doc.addImage(a.anh, 'JPEG', x + 1.5, y + 1.5, rong - 3, cao - 3);
    }
    // Ảnh biểu đồ: phủ nền trắng, thu về tối đa 1200 px ngang, nén JPEG cho file nhẹ
    var anh = (cacAnh || []).map(function (a) {
      var k = Math.min(1, 1200 / a.rong), c = document.createElement('canvas');
      c.width = Math.round(a.rong * k); c.height = Math.round(a.cao * k);
      var g = c.getContext('2d');
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(a.img, 0, 0, c.width, c.height);
      return { anh: c.toDataURL('image/jpeg', 0.82), rong: c.width, cao: c.height };
    });
    if (anh.length >= 2) {   // hai biểu đồ đầu nằm cạnh nhau
      var nua = (W - 2 * LE - 4) / 2;
      var caoDoi = Math.min(70, Math.max(nua * anh[0].cao / anh[0].rong, nua * anh[1].cao / anh[1].rong));
      canTrang(caoDoi + 4);
      veAnh(anh[0], LE, nua, caoDoi);
      veAnh(anh[1], LE + nua + 4, nua, caoDoi);
      y += caoDoi + 4;
    }
    anh.slice(anh.length >= 2 ? 2 : 0).forEach(function (a) {
      var rong = W - 2 * LE, cao = Math.min(120, rong * a.cao / a.rong);
      canTrang(cao + 4);
      veAnh(a, LE, rong, cao);
      y += cao + 4;
    });

    // bảng từng học sinh
    canTrang(20);
    doc.autoTable({
      startY: y, margin: { left: LE, right: LE },
      head: [['Họ tên', 'Cổng PL', 'Lều', 'Flashcard', 'Trồng cây', 'Sao', 'Phút chơi', 'Lần cuối']],
      body: s.hocSinh.map(function (h) {
        return [h.hoTen, SL.phanTram(h.chinhXacCong), SL.phanTram(h.chinhXacLeu), SL.phanTram(h.diemQuiz),
          h.soO ? h.soCay + '/' + h.soO : '—', h.saoCong || '—', Math.round((h.thoiGian || 0) / 60), SL.ngay(h.cuoi)];
      }),
      styles: { font: 'BVP', fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { font: 'BVP', fontStyle: 'bold', fillColor: [17, 49, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 249, 246] },
    });
    y = doc.lastAutoTable.finalY + 8;

    // món hay nhầm
    if (s.monSai.length) {
      canTrang(16);
      chu('Món rác cả lớp hay nhầm', 12, true); y += 6;
      doc.setFont('BVP', 'normal'); doc.setFontSize(10); doc.setTextColor(20, 32, 26);
      doc.text(s.monSai.slice(0, 8).map(function (m) { return m.ten + ' (' + m.lan + ')'; }).join(' · '), LE, y, { maxWidth: W - 2 * LE });
      y += 12;
    }

    // tóm tắt AI
    canTrang(20);
    chu('AI tóm tắt và đánh giá xu hướng', 12, true); y += 6;
    var dong = ai ? ai.noiDung.split(/\r?\n/) : ['Chưa có bản tóm tắt AI.'];
    dong.forEach(function (d) {
      var tieuDe = /^#{1,4}\s+/.test(d);
      d = d.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').replace(/^\s*[-*]\s+/, '• ');
      doc.setFont('BVP', tieuDe ? 'bold' : 'normal'); doc.setFontSize(tieuDe ? 10.5 : 9.5);
      doc.setTextColor.apply(doc, tieuDe ? [31, 117, 67] : [30, 40, 35]);
      var cacDong = doc.splitTextToSize(d || ' ', W - 2 * LE);
      cacDong.forEach(function (x) { canTrang(6); doc.text(x, LE, y); y += tieuDe ? 5.6 : 4.8; });
      if (tieuDe) y += 0.6;
    });
    y += 4;
    canTrang(10);
    doc.setFont('BVP', 'normal'); doc.setFontSize(8); doc.setTextColor(120, 130, 125);
    doc.text('Số liệu chỉ phản ánh việc chơi game Hồi Sinh Xanh, không dùng để đánh giá, xếp loại hay kỷ luật học sinh.' +
      (ai ? ' Tóm tắt do AI viết (' + (ai.moHinh || '') + '), có thể chưa chính xác.' : ''), LE, y, { maxWidth: W - 2 * LE });
    doc.save(tenFile(tt.lop, 'pdf'));
  }

  // ---------- Danh sách đăng nhập (sau khi thêm học sinh) ----------
  async function danhSachDangNhap(lop, ds) {
    await taiScript(TV.xlsx);
    var ws = XLSX.utils.json_to_sheet(ds.map(function (x, i) {
      return { 'STT': i + 1, 'Họ tên': x.ho_ten, 'Mã lớp': lop.ma_lop, 'Tên đăng nhập': x.ten_dang_nhap, 'Mật khẩu': x.mat_khau };
    }));
    ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 10 }, { wch: 20 }, { wch: 12 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tài khoản');
    XLSX.writeFile(wb, tenFile(lop, 'xlsx').replace('HoiSinhXanh_', 'TaiKhoan_'));
  }

  // Phiếu đăng nhập cắt rời, mỗi em một phiếu (mở cửa sổ in)
  function inPhieu(lop, ds) {
    var esc = window.HSXWeb.esc, w = window.open('', '_blank');
    if (!w) { alert('Trình duyệt chặn cửa sổ in. Cho phép cửa sổ bật lên rồi bấm lại.'); return; }
    var trang = location.href.replace(/[^/]*$/, '') + 'dang-nhap.html';
    w.document.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu đăng nhập ' + esc(lop.ten) + '</title><style>' +
      'body{font-family:"Segoe UI",Arial,sans-serif;margin:12mm;color:#111}.luoi{display:grid;grid-template-columns:1fr 1fr;gap:6mm}' +
      '.p{border:1.5px dashed #555;border-radius:8px;padding:10px 14px;break-inside:avoid}.p h3{margin:0 0 6px;font-size:15px;color:#1b7a43}' +
      '.p b{font-family:Consolas,monospace;font-size:17px}.p small{color:#555}@media print{button{display:none}}</style></head><body>' +
      '<button onclick="print()" style="margin-bottom:10px;padding:8px 16px">🖨 In</button><div class="luoi">' +
      ds.map(function (x) {
        return '<div class="p"><h3>🌱 Hồi Sinh Xanh · ' + esc(x.ho_ten) + '</h3>' +
          'Mã lớp: <b>' + esc(lop.ma_lop) + '</b><br>Tên đăng nhập: <b>' + esc(x.ten_dang_nhap) + '</b><br>Mật khẩu: <b>' + esc(x.mat_khau) + '</b><br>' +
          '<small>Vào ' + esc(trang) + ', chọn "Học sinh". Giữ kín mật khẩu.</small></div>';
      }).join('') + '</div></body></html>');
    w.document.close();
  }

  window.HSXXuat = { excelLop: excelLop, pdfLop: pdfLop, danhSachDangNhap: danhSachDangNhap, inPhieu: inPhieu };
})();
