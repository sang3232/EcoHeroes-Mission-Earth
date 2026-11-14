/* Trang Giới thiệu: kể chuyện khi cuộn (đổi tranh theo đoạn đang đọc), đom đóm ở hero, trình đọc truyện tranh. */
(function () {
  'use strict';
  var giamChuyenDong = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Mở đầu: đoạn nào đang giữa màn hình thì hiện tranh của đoạn đó ----------
  var anh = document.querySelectorAll('.mo-dau .tranh img');
  var buoc = document.querySelectorAll('.mo-dau .buoc');
  function chon(i) {
    anh.forEach(function (im) { im.classList.toggle('hien-anh', im.getAttribute('data-buoc') === String(i)); });
    buoc.forEach(function (b) { b.classList.toggle('dang', b.getAttribute('data-buoc') === String(i)); });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) chon(e.target.getAttribute('data-buoc')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    buoc.forEach(function (b) { io.observe(b); });
  } else {
    chon(0);
  }
  chon(0);

  // ---------- Đom đóm bay lên ở hero ----------
  var hero = document.querySelector('.hero');
  if (hero && !giamChuyenDong) {
    for (var i = 0; i < 18; i++) {
      var d = document.createElement('span');
      d.className = 'dot-sang';
      d.style.left = (Math.random() * 100) + '%';
      d.style.top = (55 + Math.random() * 45) + '%';
      d.style.animationDelay = (Math.random() * 9) + 's';
      d.style.animationDuration = (7 + Math.random() * 6) + 's';
      hero.appendChild(d);
    }
  }

  // ---------- Đọc truyện tranh ----------
  var SO_TRANG = 25;   // bìa + 24 trang
  var luoi = document.getElementById('luoi-truyen');
  var doc = document.getElementById('doc');
  if (!luoi || !doc) return;
  function tenTrang(i) { return 'assets/web/truyen/trang_' + (i < 10 ? '0' : '') + i; }
  for (var t = 0; t < SO_TRANG; t++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('data-trang', t);
    b.setAttribute('aria-label', t === 0 ? 'Đọc từ bìa' : 'Đọc trang ' + t);
    b.innerHTML = '<img src="' + tenTrang(t) + '_nho.webp" alt="" loading="lazy" width="300" height="424"><span>' + (t === 0 ? 'Bìa' : 'Trang ' + t) + '</span>';
    luoi.appendChild(b);
  }
  var hinh = doc.querySelector('img'), so = doc.querySelector('.so-trang'), dang = 0, truocDo = null;
  function mo(i) {
    dang = Math.max(0, Math.min(SO_TRANG - 1, i));
    hinh.src = tenTrang(dang) + '.webp';
    hinh.alt = dang === 0 ? 'Bìa truyện' : 'Trang ' + dang;
    so.textContent = (dang === 0 ? 'Bìa' : 'Trang ' + dang) + ' / ' + (SO_TRANG - 1);
    // tải trước trang sau
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
  luoi.addEventListener('click', function (e) {
    var nut = e.target.closest('button[data-trang]');
    if (nut) moDoc(+nut.getAttribute('data-trang'));
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
