/* Trang Giới thiệu:
   - Hero: kéo Mầm (thanh trượt) để hồi sinh bãi biển; chữ tiêu đề đổi màu đúng tại mép hồi sinh.
   - Mở đầu: đổi tranh theo đoạn đang đọc.
   - Số liệu 9%: lưới 100 chấm. Thử phân loại rác. Kệ truyện tranh và trình đọc. */
(function () {
  'use strict';
  var giam = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('co-js');
  function kep(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ================= Hero: kéo Mầm =================
  var canh = document.getElementById('canh');
  if (canh) (function () {
    var mam = canh.querySelector('.mam'), hinh = mam.querySelector('.hinh-mam'), bong = mam.querySelector('.bong-noi');
    var tach = canh.querySelectorAll('.tach'), moc = canh.querySelectorAll('.hoi-sinh .vat[data-x]');
    var SO_KHUNG = 12, DUNG = [0, 1, 2, 3], CHAY = [4, 5, 6, 7, 8, 9], HOI = [10, 11];
    var MIN = 0, MAX = 100, XUAT_PHAT = 4, DIEM_DUNG = 40;
    var x = XUAT_PHAT, dich = XUAT_PHAT, huong = 1, keo = false, lanDi = -1e9, hoiTu = -1e9;
    var moMan = false, daTuongTac = false, daXong = false, chay = false, thay = true, khungCu = -1;

    function noi(chu) { bong.textContent = chu || ''; bong.hidden = !chu; datBong(); }
    // giữ bóng thoại nằm trong khung cảnh
    function datBong() {
      if (bong.hidden) return;
      bong.style.setProperty('--lech', '0px');
      var b = bong.getBoundingClientRect(), r = canh.getBoundingClientRect(), d = 0;
      if (b.right > r.right - 10) d = r.right - 10 - b.right;
      if (b.left + d < r.left + 10) d = r.left + 10 - b.left;
      bong.style.setProperty('--lech', d.toFixed(1) + 'px');
    }
    function veKhung(i) {
      if (i === khungCu) return;
      khungCu = i;
      hinh.style.backgroundPosition = (i * 100 / (SO_KHUNG - 1)) + '% 0';
    }
    function capNhat() {
      canh.style.setProperty('--x', x.toFixed(2));
      var n = Math.round(x);
      mam.setAttribute('aria-valuenow', n);
      mam.setAttribute('aria-valuetext', n >= 96 ? 'Bãi biển đã hồi sinh hoàn toàn' : 'Đã hồi sinh ' + n + '% bãi biển');
      var r = canh.getBoundingClientRect(), mep = r.left + r.width * x / 100 + x * 1.12 - 56;   // khớp --mep trong CSS
      tach.forEach(function (el) { el.style.setProperty('--tach', (mep - el.getBoundingClientRect().left).toFixed(1) + 'px'); });
      moc.forEach(function (m) { m.classList.toggle('moc-len', x >= +m.getAttribute('data-x')); });
      mam.classList.toggle('ben-phai', x > 70);
      hinh.style.transform = huong < 0 ? 'scaleX(-1)' : '';
      datBong();
      if (x >= 96 && !daXong) {
        daXong = true;
        hoiTu = performance.now();
        noi('Sạch bong! Vào game giúp mình hồi sinh cả thế giới nhé.');
        if (giam) veKhung(HOI[1]);
      } else if (x < 88 && daXong) {
        daXong = false;
        if (giam) veKhung(0);
      }
    }
    function xTuChuot(e) { var r = canh.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; }

    // Vòng vẽ: Mầm đi tới đích, đổi khung đứng / chạy / hồi
    var truoc = 0;
    function vong(t) {
      var dt = Math.min(0.1, (t - (truoc || t)) / 1000);
      truoc = t;
      if (!keo && Math.abs(dich - x) > 0.05) {
        var buoc = (moMan ? 26 : 34) * dt;
        huong = dich >= x ? 1 : -1;
        x += kep(dich - x, -buoc, buoc);
        lanDi = t;
        capNhat();
      } else if (moMan) {
        moMan = false;
        if (!daTuongTac) noi('Kéo mình sang phải để dọn bãi biển nào!');
      }
      var ds, fps;
      if (t - hoiTu < 1800) { ds = HOI; fps = 7; } else if (t - lanDi < 150) { ds = CHAY; fps = 12; } else { ds = DUNG; fps = 5; }
      veKhung(ds[Math.floor(t / 1000 * fps) % ds.length]);
      if (thay) requestAnimationFrame(vong); else chay = false;
    }
    function batVong() { if (!chay && !giam) { chay = true; truoc = 0; requestAnimationFrame(vong); } }

    function diToi(v) {
      dich = kep(v, MIN, MAX);
      daTuongTac = true; moMan = false;
      if (giam) { huong = dich >= x ? 1 : -1; x = dich; capNhat(); } else batVong();
    }

    // Kéo bằng chuột / ngón tay
    mam.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      keo = true; daTuongTac = true; moMan = false;
      mam.classList.add('dang-keo');
      try { mam.setPointerCapture(e.pointerId); } catch (er) { /* bỏ qua */ }
      if (!daXong) noi('');
      e.preventDefault();
    });
    mam.addEventListener('pointermove', function (e) {
      if (!keo) return;
      var nx = kep(xTuChuot(e), MIN, MAX);
      if (Math.abs(nx - x) < 0.05) return;
      huong = nx >= x ? 1 : -1;
      x = dich = nx;
      lanDi = performance.now();
      capNhat();
    });
    function thaRa() { keo = false; mam.classList.remove('dang-keo'); }
    mam.addEventListener('pointerup', thaRa);
    mam.addEventListener('pointercancel', thaRa);
    mam.addEventListener('lostpointercapture', thaRa);

    // Bấm vào bãi biển: Mầm chạy tới chỗ đó
    canh.addEventListener('click', function (e) {
      if (e.target.closest('a, button, .hop-loi, .mam')) return;
      if (!daXong) noi('');
      diToi(xTuChuot(e));
    });

    // Bàn phím (vai trò thanh trượt)
    mam.addEventListener('keydown', function (e) {
      var k = e.key, v = null;
      if (k === 'ArrowRight' || k === 'ArrowUp') v = dich + 5;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') v = dich - 5;
      else if (k === 'PageUp') v = dich + 20;
      else if (k === 'PageDown') v = dich - 20;
      else if (k === 'Home') v = MIN;
      else if (k === 'End') v = MAX;
      if (v === null) return;
      e.preventDefault();
      if (!daXong) noi('');
      diToi(v);
    });
    mam.addEventListener('focus', function () { if (!daXong && mam.matches(':focus-visible')) noi('Dùng phím mũi tên để dẫn mình đi nhé.'); });
    mam.addEventListener('blur', function () { if (!daXong) noi(''); });

    // Chỉ chạy hoạt hình khi hero đang trên màn hình
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        thay = es[0].isIntersecting;
        if (thay) batVong();
      }).observe(canh);
    }
    addEventListener('resize', capNhat);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(capNhat);

    // Mở màn: Mầm tự đi một đoạn để người xem thấy bãi biển hồi sinh
    if (giam) {
      x = dich = DIEM_DUNG;
      veKhung(0);
      capNhat();
      noi('Kéo mình sang phải để dọn bãi biển nào!');
    } else {
      capNhat();
      veKhung(0);
      var batDau = function () { if (!daTuongTac && !keo) { moMan = true; dich = DIEM_DUNG; batVong(); } };
      var anhMam = new Image();
      anhMam.onload = function () { setTimeout(batDau, 350); };
      anhMam.onerror = batDau;
      anhMam.src = 'assets/web/mam_sheet.webp';
      batVong();
    }
  })();

  // ================= Mở đầu: đoạn nào giữa màn hình thì hiện tranh đó =================
  var anh = document.querySelectorAll('.mo-dau .tranh img');
  var buoc = document.querySelectorAll('.mo-dau .buoc');
  var tienDo = document.querySelector('.mo-dau .tien-do-truyen');
  if (tienDo) tienDo.innerHTML = Array.prototype.map.call(buoc, function () { return '<i></i>'; }).join('');
  function chon(i) {
    i = +i;
    anh.forEach(function (im) { im.classList.toggle('hien-anh', +im.getAttribute('data-buoc') === i); });
    buoc.forEach(function (b) { b.classList.toggle('dang', +b.getAttribute('data-buoc') === i); });
    if (tienDo) Array.prototype.forEach.call(tienDo.children, function (c, k) { c.className = k < i ? 'da' : k === i ? 'dang' : ''; });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) chon(e.target.getAttribute('data-buoc')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    buoc.forEach(function (b) { io.observe(b); });
  }
  chon(0);

  // ================= Số liệu: lưới 100 chấm, 9 chấm được tái chế =================
  var luoi100 = document.getElementById('luoi-100');
  if (luoi100) {
    var h = '';
    for (var c = 0; c < 100; c++) h += c < 9 ? '<i class="co"></i>' : '<i></i>';
    luoi100.innerHTML = h;
  }

  // ================= Thử phân loại (dữ liệu giống Cổng Phân Loại trong game) =================
  var thu = document.getElementById('thu-pl');
  if (thu) (function () {
    var MON = [
      { ten: 'Chai nước nhựa', emo: '🧴', nhom: 'taiche', goiY: 'Nhựa số 1 (PET): tái chế được.' },
      { ten: 'Vỏ chuối', emo: '🍌', nhom: 'huuco', goiY: 'Vỏ trái cây là rác thực phẩm, ủ thành phân được.' },
      { ten: 'Hộp xốp dính dầu', emo: '🍱', nhom: 'khac', goiY: 'Xốp bẩn không tái chế được.' },
      { ten: 'Lon nước ngọt', emo: '🥫', nhom: 'taiche', goiY: 'Nhôm tái chế gần như vô hạn lần.' },
      { ten: 'Ống hút nhựa', emo: '🥤', nhom: 'khac', goiY: 'Nhựa nhỏ và bẩn thường không tái chế được.' },
      { ten: 'Bã cà phê', emo: '☕', nhom: 'khac', goiY: 'Theo Hướng dẫn phân loại rác của Bộ TN&MT (2023), bã cà phê, bã trà thuộc rác thải khác.' },
      { ten: 'Báo cũ', emo: '📰', nhom: 'taiche', goiY: 'Giấy khô, sạch thì tái chế được.' },
      { ten: 'Khẩu trang đã dùng', emo: '😷', nhom: 'khac', goiY: 'Đồ vệ sinh cá nhân bỏ vào rác thải khác.' },
      { ten: 'Thùng các-tông', emo: '📦', nhom: 'taiche', goiY: 'Giấy bìa khô tái chế được.' },
      { ten: 'Lá khô', emo: '🍂', nhom: 'khac', goiY: 'Theo Hướng dẫn phân loại rác của Bộ TN&MT (2023), lá, cành cây nhỏ từ làm vườn thuộc rác thải khác.' },
    ];
    var TEN_NHOM = { taiche: 'Tái chế được', huuco: 'Rác thực phẩm', khac: 'Rác thải khác' };
    var $ = function (id) { return document.getElementById(id); };
    var nut = thu.querySelectorAll('.thung button'), ph = $('thu-ph'), tiep = $('thu-tiep');
    var thuTu = MON.map(function (m, i) { return i; }), vi = 0, dung = 0, tong = 0, daChon = false;
    for (var i = thuTu.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = thuTu[i]; thuTu[i] = thuTu[j]; thuTu[j] = t; }
    // món đầu luôn là chai nhựa cho dễ hiểu
    thuTu.splice(thuTu.indexOf(0), 1); thuTu.unshift(0);
    function ve() {
      var m = MON[thuTu[vi % thuTu.length]];
      $('thu-emo').textContent = m.emo;
      $('thu-ten').textContent = m.ten;
      ph.textContent = '';
      nut.forEach(function (b) { b.disabled = false; b.classList.remove('dung', 'sai'); });
      daChon = false;
      tiep.textContent = 'Bỏ qua';
    }
    nut.forEach(function (b) {
      b.addEventListener('click', function () {
        if (daChon) return;
        daChon = true;
        var m = MON[thuTu[vi % thuTu.length]], ok = b.getAttribute('data-nhom') === m.nhom;
        tong++; if (ok) dung++;
        nut.forEach(function (x) {
          x.disabled = true;
          if (x.getAttribute('data-nhom') === m.nhom) x.classList.add('dung');
          else if (x === b) x.classList.add('sai');
        });
        ph.innerHTML = ok ? '<b class="d">Đúng rồi!</b> ' + m.goiY
          : '<b class="s">Chưa đúng.</b> ' + m.ten + ' thuộc nhóm <b>' + TEN_NHOM[m.nhom] + '</b>. ' + m.goiY;
        $('thu-diem').textContent = 'Đúng ' + dung + '/' + tong;
        tiep.textContent = 'Món tiếp theo';
        tiep.focus({ preventScroll: true });
      });
    });
    tiep.addEventListener('click', function () { vi++; ve(); });
    ve();
  })();

  // ================= Kệ truyện tranh + trình đọc =================
  var SO_TRANG = 25;   // bìa + 24 trang
  var ke = document.getElementById('luoi-truyen');
  var doc = document.getElementById('doc');
  if (!ke || !doc) return;
  function tenTrang(i) { return 'assets/web/truyen/trang_' + (i < 10 ? '0' : '') + i; }
  var h2 = '';
  for (var t = 0; t < SO_TRANG; t++) {
    h2 += '<button type="button" role="listitem" data-trang="' + t + '" aria-label="' + (t === 0 ? 'Đọc từ bìa' : 'Đọc trang ' + t) + '">' +
      '<span class="bia-nho"><img src="' + tenTrang(t) + '_nho.webp" alt="" loading="lazy" width="300" height="424"></span>' +
      '<span class="so-tr">' + (t === 0 ? 'Bìa' : 'Trang ' + t) + '</span></button>';
  }
  ke.innerHTML = h2;

  // nút cuộn kệ
  var nutTrai = document.querySelector('.ke-truyen .cuon.trai'), nutPhai = document.querySelector('.ke-truyen .cuon.phai');
  function capNhatNut() {
    if (!nutTrai) return;
    nutTrai.disabled = ke.scrollLeft < 8;
    nutPhai.disabled = ke.scrollLeft + ke.clientWidth > ke.scrollWidth - 8;
  }
  if (nutTrai) {
    nutTrai.addEventListener('click', function () { ke.scrollBy({ left: -ke.clientWidth * 0.8, behavior: giam ? 'auto' : 'smooth' }); });
    nutPhai.addEventListener('click', function () { ke.scrollBy({ left: ke.clientWidth * 0.8, behavior: giam ? 'auto' : 'smooth' }); });
    ke.addEventListener('scroll', capNhatNut, { passive: true });
    addEventListener('resize', capNhatNut);
    capNhatNut();
  }

  var hinhDoc = doc.querySelector('img'), so = doc.querySelector('.so-trang'), dang = 0, truocDo = null;
  function mo(i) {
    dang = kep(i, 0, SO_TRANG - 1);
    hinhDoc.src = tenTrang(dang) + '.webp';
    hinhDoc.alt = dang === 0 ? 'Bìa truyện' : 'Trang ' + dang;
    so.textContent = (dang === 0 ? 'Bìa' : 'Trang ' + dang) + ' / ' + (SO_TRANG - 1);
    doc.querySelector('.truoc').disabled = dang === 0;
    doc.querySelector('.sau').disabled = dang === SO_TRANG - 1;
    if (dang + 1 < SO_TRANG) { var tr = new Image(); tr.src = tenTrang(dang + 1) + '.webp'; }
  }
  function moDoc(i) {
    truocDo = document.activeElement;
    doc.classList.add('mo');
    document.body.style.overflow = 'hidden';
    mo(i);
    doc.querySelector('.dong').focus();
  }
  function dong() {
    doc.classList.remove('mo');
    document.body.style.overflow = '';
    if (truocDo) truocDo.focus();
  }
  ke.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-trang]');
    if (b) moDoc(+b.getAttribute('data-trang'));
  });
  doc.querySelector('.dong').addEventListener('click', dong);
  doc.querySelector('.truoc').addEventListener('click', function () { mo(dang - 1); });
  doc.querySelector('.sau').addEventListener('click', function () { mo(dang + 1); });
  doc.addEventListener('click', function (e) { if (e.target === doc) dong(); });
  addEventListener('keydown', function (e) {
    if (!doc.classList.contains('mo')) return;
    if (e.key === 'Escape') dong();
    else if (e.key === 'ArrowRight') mo(dang + 1);
    else if (e.key === 'ArrowLeft') mo(dang - 1);
    else if (e.key === 'Tab') {   // giữ focus trong trình đọc
      var ds = Array.prototype.filter.call(doc.querySelectorAll('button'), function (b) { return !b.disabled; });
      var dau = ds[0], cuoi = ds[ds.length - 1];
      if (e.shiftKey && document.activeElement === dau) { e.preventDefault(); cuoi.focus(); }
      else if (!e.shiftKey && document.activeElement === cuoi) { e.preventDefault(); dau.focus(); }
    }
  });
  // vuốt trên điện thoại
  var x0 = null;
  doc.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  doc.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) mo(dang + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
