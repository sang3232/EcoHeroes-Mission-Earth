/* Ôn tập Flashcard: thẻ và câu hỏi lấy từ dữ liệu game (js/data.js → HSX.DATA).
   Kết quả kiểm tra ghi vào cùng kho 'hoi-sinh-xanh-hoc-tap' với game (js/thong_ke.js), loại 'quiz'. */
(function () {
  'use strict';
  var D = window.HSX && HSX.DATA;
  if (!D) return;
  var esc = window.HSXWeb ? HSXWeb.esc : function (s) { return String(s); };
  var KHOA = 'hoi-sinh-xanh-hoc-tap', KHOA_THUOC = 'hoi-sinh-xanh-the-da-thuoc';

  // ---------- Nhóm rác ----------
  var NHOM_LUAT = { nhua: 'Tái chế được', kimloai: 'Tái chế được', giaytt: 'Tái chế được', huuco: 'Rác thực phẩm (hữu cơ)', khac: 'Rác thải khác' };
  var NHOM_CON = {};
  D.puzzle.binsR2.forEach(function (b) { NHOM_CON[b.id] = b; });

  // ---------- Thẻ "Bạn có biết" có tiêu đề ----------
  var THE_FACT = {
    phan_loai: [
      ['luat3nhom', '⚖️', 'Luật BVMT 2020 chia rác thế nào?'], ['lon', '🥫', 'Lon nhôm tái chế được mấy lần?'],
      ['nhom', '⚡', 'Nhôm tái chế tiết kiệm bao nhiêu năng lượng?'], ['chai', '🧴', 'Bao nhiêu nhựa đã được tái chế?'],
      ['nilon', '🛍️', 'Vì sao túi nilon khó xử lý?'], ['motlan', '🥤', 'Rác nào hay gặp nhất ở bãi biển?'],
      ['xop', '🍱', 'Vì sao hộp xốp nguy hiểm?'], ['gach', '🧱', 'Gạch sinh thái (ecobrick) là gì?'],
    ],
    rung: [
      ['trumam', '🌱', 'Trụ mầm đước là gì?'], ['duoc', '🌳', 'Rễ cây đước có tác dụng gì?'],
      ['rungchan', '🌊', 'Rừng ngập mặn chắn sóng ra sao?'], ['tom', '🦐', 'Vì sao rừng ngập mặn bị chặt?'],
      ['trieu', '🌗', 'Rừng ngập mặn cần gì mỗi ngày?'], ['ban', '🌿', 'Cây bần mọc ở đâu?'],
      ['domdom', '✨', 'Vì sao đom đóm thưa dần?'], ['thoiloi', '🐟', 'Cá thòi lòi sống thế nào?'], ['co', '🕊️', 'Chim nào sống ở rừng ngập mặn?'],
    ],
    sinh_vat: [
      ['luoima', '🕸️', 'Lưới ma là gì?'], ['luoibo', '🎣', 'Lưới bỏ chiếm bao nhiêu rác giữa đại dương?'],
      ['rua', '🐢', 'Rùa biển đẻ trứng ở đâu?'], ['cong', '🦀', 'Hang còng gió cho biết điều gì?'],
      ['philao', '🌲', 'Vì sao trồng phi lao ven biển?'], ['muong', '🌺', 'Muống biển giúp gì cho bãi cát?'],
      ['rong', '🌿', 'Rong biển dạt bờ dùng làm gì?'], ['thuytinh', '💎', 'Thủy tinh biển là gì?'],
    ],
  };

  // ---------- Câu hỏi trắc nghiệm soạn sẵn (đáp án đúng luôn đứng đầu, khi hỏi sẽ xáo) ----------
  var CAU_HOI = {
    phan_loai: [
      ['Theo Luật Bảo vệ môi trường 2020, rác sinh hoạt được chia thành mấy nhóm?', ['3 nhóm', '2 nhóm', '4 nhóm', '5 nhóm'], 'luat3nhom'],
      ['Làm lon từ nhôm tái chế tiết kiệm khoảng bao nhiêu năng lượng so với luyện nhôm mới?', ['Khoảng 95%', 'Khoảng 10%', 'Khoảng 30%', 'Khoảng 50%'], 'nhom'],
      ['Một nghiên cứu năm 2017 ước tính bao nhiêu phần trăm nhựa từng thải ra đã được tái chế?', ['Khoảng 9%', 'Khoảng 30%', 'Khoảng 50%', 'Khoảng 75%'], 'chai'],
      ['Vì sao túi nilon mỏng xếp vào "rác thải khác"?', ['Rất khó tái chế và tồn tại hàng trăm năm', 'Vì nó nặng', 'Vì nó phân hủy trong vài ngày', 'Vì nó làm từ giấy'], 'nilon'],
      ['Gạch sinh thái (ecobrick) được làm như thế nào?', ['Nhồi chặt rác nhựa mềm vào chai nhựa', 'Nung đất sét với vỏ sò', 'Ép giấy báo cũ thành khối', 'Đổ xi măng vào lon nhôm'], 'gach'],
      ['Hộp xốp nguy hiểm cho môi trường chủ yếu vì...', ['Dễ vỡ thành hạt li ti, gần như không nhặt hết', 'Nó nặng và chìm xuống đáy', 'Nó tan ngay trong nước', 'Nó làm từ kim loại'], 'xop'],
    ],
    rung: [
      ['"Trụ mầm" của cây đước là gì?', ['Quả đã nảy mầm ngay trên cây, rụng xuống cắm vào bùn', 'Rễ phụ mọc từ cành', 'Hạt khô phải phơi nắng mới gieo', 'Bông hoa của cây đước'], 'trumam'],
      ['Bộ rễ chống hình vòm của cây đước giúp gì?', ['Giữ đất và làm yếu sức sóng', 'Hút nước ngọt từ sông', 'Thu hút ong tới thụ phấn', 'Làm cây lớn nhanh gấp đôi'], 'duoc'],
      ['Ở nhiều vùng ven biển Việt Nam, rừng ngập mặn bị chặt chủ yếu để...', ['Đào đầm nuôi tôm', 'Xây sân bay', 'Trồng lúa nương', 'Làm bãi đỗ xe'], 'tom'],
      ['Rừng ngập mặn cần điều gì diễn ra mỗi ngày?', ['Nước triều lên xuống', 'Mưa rào buổi chiều', 'Gió mùa đông bắc', 'Nắng gắt cả ngày'], 'trieu'],
      ['Ở miền Tây Nam Bộ, đom đóm hay tụ về đậu trên cây nào?', ['Cây bần', 'Cây phi lao', 'Cây dừa', 'Cây xoài'], 'ban'],
      ['Vì sao đom đóm thưa dần ở nơi nhiều đèn điện?', ['Ánh đèn quá sáng khiến chúng khó tìm nhau', 'Đèn làm nóng không khí', 'Đèn phát ra tiếng ồn', 'Đèn hút hết côn trùng khác'], 'domdom'],
      ['Cá thòi lòi ở bãi bùn rừng ngập mặn thở bằng cách nào?', ['Qua da và miệng', 'Chỉ bằng mang dưới nước', 'Bằng phổi như người', 'Không cần thở'], 'thoiloi'],
    ],
    sinh_vat: [
      ['"Lưới ma" là gì?', ['Lưới đánh cá bị bỏ lại, tiếp tục quấn chết sinh vật', 'Lưới dùng để bắt ma', 'Lưới che nắng cho thuyền', 'Lưới mới chưa dùng'], 'luoima'],
      ['Nghiên cứu năm 2018 ở vùng rác giữa Thái Bình Dương: lưới đánh cá chiếm bao nhiêu khối lượng rác nhựa trôi nổi?', ['Gần một nửa', 'Khoảng 1%', 'Khoảng 10%', 'Gần như toàn bộ'], 'luoibo'],
      ['Rùa biển cái thường đẻ trứng ở đâu?', ['Quay về vùng bãi biển nơi nó nở ra', 'Bất kỳ bãi cát gần nhất', 'Trên rạn san hô', 'Trong rừng ngập mặn'], 'rua'],
      ['Mật độ hang còng gió trên bãi cát thường dùng để đánh giá gì?', ['Sức khỏe của bãi biển', 'Độ mặn của nước biển', 'Số lượng khách du lịch', 'Nhiệt độ của cát'], 'cong'],
      ['Phi lao được trồng nhiều ven biển miền Trung để...', ['Chắn gió và chắn cát bay', 'Lấy quả ăn', 'Làm cảnh cho đẹp', 'Nuôi tằm'], 'philao'],
      ['Muống biển giúp bãi cát như thế nào?', ['Rễ giữ cát không bị gió và sóng cuốn đi', 'Làm cát trắng hơn', 'Làm nước biển trong hơn', 'Hút rác nhựa'], 'muong'],
      ['Rong biển dạt bờ có thể dùng để...', ['Ủ thành phân bón hữu cơ', 'Đốt lấy điện', 'Làm túi nilon', 'Bỏ vào thùng kim loại'], 'rong'],
    ],
  };

  var CHU_DE = [
    { id: 'phan_loai', ten: 'Phân loại rác' },
    { id: 'rung', ten: 'Rừng ngập mặn' },
    { id: 'sinh_vat', ten: 'Biển & sinh vật' },
    { id: 'tat_ca', ten: 'Tất cả' },
  ];

  function tron(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // ---------- Bộ thẻ theo chủ đề ----------
  function theCua(cd) {
    var ds = [];
    if (cd === 'phan_loai' || cd === 'tat_ca') {
      D.puzzle.items.forEach(function (it) {
        var con = NHOM_CON[it.cat];
        ds.push({ ma: 'rac:' + it.name, cd: 'phan_loai', emo: it.emoji, cau: it.name + ' bỏ vào thùng nào?',
          dap: NHOM_LUAT[it.cat] + (it.cat !== 'huuco' && it.cat !== 'khac' ? ' → ' + con.name : ''), giai: it.hint });
      });
    }
    Object.keys(THE_FACT).forEach(function (k) {
      if (cd !== k && cd !== 'tat_ca') return;
      THE_FACT[k].forEach(function (f) {
        if (D.facts[f[0]]) ds.push({ ma: 'fact:' + f[0], cd: k, emo: f[1], cau: f[2], dap: 'Bạn có biết?', giai: D.facts[f[0]] });
      });
    });
    if (cd === 'sinh_vat' || cd === 'tat_ca') {
      Object.keys(D.species).forEach(function (id) {
        var s = D.species[id], f = D.facts[s.fact];
        if (f) ds.push({ ma: 'loai:' + id, cd: 'sinh_vat', emo: s.emoji, cau: s.name, dap: 'Loài vật quay về trong game', giai: f });
      });
    }
    return ds;
  }

  // ---------- Câu hỏi kiểm tra ----------
  function cauHoiCua(cd) {
    var ds = [];
    function themSoan(k) {
      CAU_HOI[k].forEach(function (q) {
        ds.push({ cd: k, cau: q[0], dung: q[1][0], cacDap: tron(q[1]), giai: D.facts[q[2]] || '', ma: 'fact:' + q[2] });
      });
    }
    if (cd === 'phan_loai' || cd === 'tat_ca') {
      // món rác ngẫu nhiên: hỏi thùng chi tiết (vòng 2 của Cổng Phân Loại)
      tron(D.puzzle.items).slice(0, cd === 'tat_ca' ? 3 : 5).forEach(function (it) {
        var dung = NHOM_CON[it.cat].name;
        var khac = tron(D.puzzle.binsR2.filter(function (b) { return b.id !== it.cat; })).slice(0, 3).map(function (b) { return b.name; });
        ds.push({ cd: 'phan_loai', cau: it.emoji + ' "' + it.name + '" bỏ vào thùng nào?', dung: dung, cacDap: tron([dung].concat(khac)),
          giai: it.hint + '. Theo Luật BVMT 2020, món này thuộc nhóm: ' + NHOM_LUAT[it.cat] + '.', ma: 'rac:' + it.name, mon: it.name });
      });
    }
    Object.keys(CAU_HOI).forEach(function (k) { if (cd === k || cd === 'tat_ca') themSoan(k); });
    // giữ phần câu món rác, xáo phần còn lại, lấy tối đa 10
    return tron(ds).slice(0, 10);
  }

  // ---------- Lưu kết quả (cùng kho với game) ----------
  function luuKetQua(cd, cau) {
    var d;
    try { d = JSON.parse(localStorage.getItem(KHOA) || 'null'); } catch (e) { d = null; }
    if (!d || !d.tong) d = { hangCho: [], tong: { cong: { luot: 0, dung: 0, tong: 0, saoCao: 0, cacLuot: [] }, leu: { dung: 0, tong: 0 }, quiz: { luot: 0, dung: 0, tong: 0, cacLuot: [] }, monSai: {}, trong: 0, dao: 0 } };
    d.tong.quiz = d.tong.quiz || { luot: 0, dung: 0, tong: 0, cacLuot: [] };
    var dung = cau.filter(function (c) { return c.daDung; }).length;
    var ma = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
    var tk = window.HSXWeb ? HSXWeb.tkNho() : null;
    d.hangCho.push({ ma_su_kien: ma, loai: 'quiz', dung: dung, tong: cau.length, luc: new Date().toISOString(),
      nguoi: tk && tk.vai_tro === 'hoc_sinh' ? tk.id : null,
      du_lieu: { chu_de: cd, cac_cau: cau.map(function (c) { return { ma: c.ma, cd: c.cd, dung: !!c.daDung }; }) } });
    var q = d.tong.quiz;
    q.luot++; q.dung += dung; q.tong += cau.length;
    q.cacLuot.push({ luc: Date.now(), cd: cd, dung: dung, tong: cau.length });
    if (q.cacLuot.length > 50) q.cacLuot = q.cacLuot.slice(-50);
    q.saiTheo = q.saiTheo || {};
    cau.forEach(function (c) {
      if (!c.daDung) { q.saiTheo[c.ma] = (q.saiTheo[c.ma] || 0) + 1; if (c.mon) d.tong.monSai[c.mon] = (d.tong.monSai[c.mon] || 0) + 1; }
    });
    try { localStorage.setItem(KHOA, JSON.stringify(d)); } catch (e) { /* hết chỗ */ }
    if (window.HSXDongBo) window.HSXDongBo.gui();   // đã đăng nhập thì gửi luôn
    return dung;
  }

  // ---------- Giao diện ----------
  var $ = function (id) { return document.getElementById(id); };
  var thamSo = new URLSearchParams(location.search);
  var cd = CHU_DE.some(function (c) { return c.id === thamSo.get('chu_de'); }) ? thamSo.get('chu_de') : 'phan_loai';
  var cheDo = thamSo.get('che_do') === 'kiem_tra' ? 'kt' : 'lat';
  var chiSai = thamSo.get('on') === 'sai';

  function thuocDoc() { try { return JSON.parse(localStorage.getItem(KHOA_THUOC) || '{}'); } catch (e) { return {}; } }
  function thuocGhi(o) { try { localStorage.setItem(KHOA_THUOC, JSON.stringify(o)); } catch (e) { /* bỏ qua */ } }

  function veChuDe() {
    $('chu-de').innerHTML = CHU_DE.map(function (c) {
      return '<button type="button" data-cd="' + c.id + '" aria-pressed="' + (c.id === cd) + '">' + c.ten + '</button>';
    }).join('');
  }
  $('chu-de').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-cd]');
    if (!b) return;
    cd = b.getAttribute('data-cd');
    chiSai = false;
    veChuDe();
    batDauLat();
    if (cheDo === 'kt') batDauKt();
  });

  // Lật thẻ
  var bo = [], vi = 0;
  function batDauLat() {
    var thuoc = thuocDoc(), tatCa = theCua(cd);
    if (chiSai) {
      var sai = {};
      try { sai = (JSON.parse(localStorage.getItem(KHOA) || '{}').tong.quiz || {}).saiTheo || {}; } catch (e) { /* bỏ qua */ }
      var monSai = {};
      try { monSai = JSON.parse(localStorage.getItem(KHOA) || '{}').tong.monSai || {}; } catch (e) { /* bỏ qua */ }
      tatCa = tatCa.filter(function (t) { return sai[t.ma] || (t.ma.indexOf('rac:') === 0 && monSai[t.ma.slice(4)]); });
    }
    bo = tron(tatCa.filter(function (t) { return !thuoc[t.ma]; }));
    vi = 0;
    veThe();
  }
  function veThe() {
    var the = $('the-lat');
    the.classList.remove('lat');
    $('lat-trong').hidden = bo.length > 0;
    the.hidden = !bo.length;
    $('nut-thuoc').disabled = $('nut-on-lai').disabled = !bo.length;
    if (!bo.length) { $('lat-dem').textContent = ''; return; }
    var t = bo[vi % bo.length];
    $('lat-emo').textContent = t.emo;
    $('lat-cau').textContent = t.cau;
    $('lat-dap').textContent = t.dap;
    $('lat-giai').textContent = t.giai;
    $('lat-dem').textContent = 'Còn ' + bo.length + ' thẻ chưa thuộc' + (chiSai ? ' (đang ôn các thẻ hay sai)' : '');
  }
  function lat() { if (bo.length) $('the-lat').classList.toggle('lat'); }
  $('the-lat').addEventListener('click', lat);
  $('the-lat').addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); lat(); } });
  $('nut-thuoc').addEventListener('click', function () {
    if (!bo.length) return;
    var t = bo[vi % bo.length], th = thuocDoc();
    th[t.ma] = Date.now();
    thuocGhi(th);
    bo.splice(vi % bo.length, 1);
    veThe();
  });
  $('nut-on-lai').addEventListener('click', function () { vi++; veThe(); });
  $('nut-lam-lai').addEventListener('click', function () {
    var th = thuocDoc();
    theCua(cd).forEach(function (t) { delete th[t.ma]; });
    thuocGhi(th);
    chiSai = false;
    batDauLat();
  });

  // Kiểm tra
  var de = [], so = 0, diem = 0;
  function batDauKt() {
    de = cauHoiCua(cd);
    so = 0; diem = 0;
    $('kt-dang').hidden = false;
    $('kt-xong').hidden = true;
    veCau();
  }
  // Hàng hạt giống: câu đúng nảy mầm, câu sai héo, câu đang làm có viền
  function veHat() {
    $('kt-hat').innerHTML = de.map(function (c, i) {
      var lop = i < so || (i === so && c.daDung !== undefined) ? (c.daDung ? 'dung' : 'sai') : (i === so ? 'dang' : '');
      return '<li' + (lop ? ' class="' + lop + '"' : '') + '></li>';
    }).join('');
  }
  function veCau() {
    var c = de[so];
    $('kt-so').textContent = 'Câu ' + (so + 1) + '/' + de.length;
    $('kt-diem').textContent = 'Đúng ' + diem;
    veHat();
    $('kt-cau').textContent = c.cau;
    $('kt-dap').innerHTML = c.cacDap.map(function (d, i) {
      return '<button type="button" data-i="' + i + '"><b>' + 'ABCD'[i] + '.</b> ' + esc(d) + '</button>';
    }).join('');
    $('kt-giai').hidden = true;
    $('kt-tiep').hidden = true;
  }
  $('kt-dap').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (!b || b.disabled) return;
    var c = de[so], chon = c.cacDap[+b.getAttribute('data-i')];
    c.daDung = chon === c.dung;
    if (c.daDung) diem++;
    $('kt-dap').querySelectorAll('button').forEach(function (x) {
      x.disabled = true;
      var d = c.cacDap[+x.getAttribute('data-i')];
      if (d === c.dung) x.classList.add('dung');
      else if (x === b) x.classList.add('sai');
    });
    $('kt-diem').textContent = 'Đúng ' + diem;
    veHat();
    var g = $('kt-giai');
    g.className = 'bao ' + (c.daDung ? 'ok' : 'loi');
    g.innerHTML = (c.daDung ? '✔ Chính xác! ' : '✘ Đáp án đúng: <b>' + esc(c.dung) + '</b>. ') + esc(c.giai);
    g.hidden = false;
    $('kt-tiep').hidden = false;
    $('kt-tiep').textContent = so + 1 < de.length ? 'Câu tiếp' : 'Xem kết quả';
    $('kt-tiep').focus();
  });
  $('kt-tiep').addEventListener('click', function () {
    so++;
    if (so < de.length) { veCau(); return; }
    var dung = luuKetQua(cd, de), pt = Math.round(dung / de.length * 100);
    var sai = de.filter(function (c) { return !c.daDung; });
    $('kt-dang').hidden = true;
    var x = $('kt-xong');
    x.hidden = false;
    x.innerHTML = '<div class="the ket-qua-kt">' +
      '<ol class="hang-hat" aria-hidden="true" style="max-width:520px;margin:0 auto 18px">' + de.map(function (c) { return '<li class="' + (c.daDung ? 'dung' : 'sai') + '"></li>'; }).join('') + '</ol>' +
      '<div class="so-lon">' + dung + '/' + de.length + '</div>' +
      '<p class="loi-khen">' + (pt >= 90 ? 'Xuất sắc! Mầm tự hào về em.' : pt >= 70 ? 'Tốt lắm! Ôn thêm vài thẻ là thuộc hết.' : pt >= 50 ? 'Khá rồi, lật thẻ ôn lại các câu sai nhé.' : 'Đừng nản, ôn lại bằng thẻ rồi thử lần nữa.') + '</p>' +
      (sai.length ? '<div class="can-on"><b>Các câu cần ôn</b><ul>' + sai.map(function (c) {
        return '<li>' + esc(c.cau) + '<br><span>Đáp án: </span><b>' + esc(c.dung) + '</b></li>';
      }).join('') + '</ul></div>' : '') +
      '<div class="hang-nut" style="justify-content:center"><button class="nut chinh" type="button" id="kt-lai">Làm bài khác</button>' +
      '<a class="nut" href="on-tap.html?on=sai&chu_de=' + cd + '">Ôn thẻ hay sai</a>' +
      '<a class="nut" href="thong-ke.html">Xem thống kê</a></div>' +
      '<p class="trong" style="padding:14px 0 0">' + (window.HSXWeb && HSXWeb.tkNho() ? 'Kết quả đã lưu vào tài khoản của em.' : 'Kết quả lưu trên máy này. Đăng nhập bằng mã lớp để thầy cô xem được.') + '</p></div>';
    $('kt-lai').addEventListener('click', batDauKt);
    $('o-kt').scrollIntoView({ block: 'start' });
  });

  // Chuyển chế độ
  function chonCheDo(m) {
    cheDo = m;
    $('tab-lat').setAttribute('aria-selected', m === 'lat');
    $('tab-kt').setAttribute('aria-selected', m === 'kt');
    $('o-lat').hidden = m !== 'lat';
    $('o-kt').hidden = m !== 'kt';
    if (m === 'kt') batDauKt();
  }
  $('tab-lat').addEventListener('click', function () { chonCheDo('lat'); });
  $('tab-kt').addEventListener('click', function () { chonCheDo('kt'); });

  veChuDe();
  batDauLat();
  chonCheDo(cheDo);
})();
