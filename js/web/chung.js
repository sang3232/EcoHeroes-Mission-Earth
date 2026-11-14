/* Hồi Sinh Xanh — phần dùng chung cho các trang web: thanh menu, chân trang, hiện dần khi cuộn.
   Mỗi trang đặt <header id="dau-trang" data-trang="gioi-thieu|on-tap|thong-ke|dang-nhap"></header>
   và <footer id="chan-trang"></footer>, rồi nạp file này ngay sau hai thẻ đó. */
(function () {
  'use strict';
  var KHOA_TK = 'hoi-sinh-xanh-tai-khoan';   // bản nhớ tạm hồ sơ (tên, vai trò) để menu hiện ngay

  function tkNho() {
    try { return JSON.parse(localStorage.getItem(KHOA_TK) || 'null'); } catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dungMenu() {
    var dau = document.getElementById('dau-trang');
    if (!dau) return;
    var trang = dau.getAttribute('data-trang') || '';
    var cur = function (t) { return trang === t ? ' aria-current="page"' : ''; };
    var tk = tkNho();
    var nutTk = tk
      ? '<li class="nut-tk"><button class="mu" type="button" aria-haspopup="true">👤 ' + esc(tk.ten || 'Tài khoản') + ' ▾</button>' +
        '<ul class="con">' +
        '<li><a href="thong-ke.html">' + (tk.vai_tro === 'giao_vien' ? '📊 Bảng điều khiển lớp' : '📈 Thống kê của em') + '</a></li>' +
        '<li><a href="#" data-dang-xuat>🚪 Đăng xuất</a></li></ul></li>'
      : '<li class="nut-tk"><a class="nut chinh nho" href="dang-nhap.html"' + cur('dang-nhap') + '>Đăng nhập</a></li>';
    dau.className = 'dau-trang';
    dau.innerHTML =
      '<div class="khung">' +
      '<a class="logo" href="index.html"><img src="assets/web/logo.png" alt=""><span>Hồi Sinh <b>Xanh</b></span></a>' +
      '<button class="nut-menu" type="button" aria-label="Mở menu" aria-expanded="false">☰</button>' +
      '<ul class="menu" id="menu-chinh">' +
      '<li><a href="index.html"' + cur('gioi-thieu') + '>Giới thiệu</a></li>' +
      '<li><button class="mu" type="button" aria-haspopup="true"' + (trang === 'on-tap' ? ' aria-current="page"' : '') + '>Trò chơi ▾</button>' +
      '<ul class="con">' +
      '<li><a href="hoi-sinh-xanh.html">🌱 Hồi Sinh Xanh<small>Game hành động 2D</small></a></li>' +
      '<li><a href="on-tap.html"' + cur('on-tap') + '>🃏 Ôn tập Flashcard<small>Lật thẻ và kiểm tra nhanh</small></a></li>' +
      '</ul></li>' +
      '<li><a href="thong-ke.html"' + cur('thong-ke') + '>Thống kê</a></li>' +
      nutTk + '</ul></div>';

    var nut = dau.querySelector('.nut-menu'), menu = dau.querySelector('.menu');
    nut.addEventListener('click', function () {
      var mo = menu.classList.toggle('mo');
      nut.setAttribute('aria-expanded', mo ? 'true' : 'false');
    });
    // menu con: bấm để mở trên màn cảm ứng
    dau.querySelectorAll('button.mu').forEach(function (b) {
      b.addEventListener('click', function () { b.parentElement.classList.toggle('mo'); });
    });
    document.addEventListener('click', function (e) {
      if (!dau.contains(e.target)) dau.querySelectorAll('li.mo').forEach(function (li) { li.classList.remove('mo'); });
    });
    var dx = dau.querySelector('[data-dang-xuat]');
    if (dx) dx.addEventListener('click', function (e) {
      e.preventDefault();
      var xong = function () { try { localStorage.removeItem(KHOA_TK); localStorage.removeItem('hoi-sinh-xanh-phien'); } catch (er) { /* bỏ qua */ } location.href = 'index.html'; };
      if (window.HSXTaiKhoan) window.HSXTaiKhoan.dangXuat().then(xong, xong); else xong();
    });
  }

  function dungChan() {
    var c = document.getElementById('chan-trang');
    if (!c) return;
    c.className = 'chan-trang';
    c.innerHTML =
      '<div class="khung">' +
      '<div><a class="logo" href="index.html"><img src="assets/web/logo.png" alt=""><span>Hồi Sinh <b>Xanh</b></span></a>' +
      '<p style="margin-top:12px">Game giáo dục môi trường cho học sinh 12–18 tuổi: phân loại rác đúng luật, trồng lại rừng ngập mặn, ' +
      'và hiểu vì sao từng việc nhỏ đều quan trọng.</p></div>' +
      '<div><h4>Khám phá</h4><ul>' +
      '<li><a href="index.html#mo-dau">Mở đầu câu chuyện</a></li><li><a href="hoi-sinh-xanh.html">Chơi Hồi Sinh Xanh</a></li>' +
      '<li><a href="on-tap.html">Ôn tập Flashcard</a></li><li><a href="index.html#doc-truyen">Đọc truyện tranh</a></li></ul></div>' +
      '<div><h4>Lớp học</h4><ul>' +
      '<li><a href="index.html#giao-vien">Dành cho giáo viên</a></li><li><a href="thong-ke.html">Thống kê</a></li>' +
      '<li><a href="dang-nhap.html">Đăng nhập</a></li><li><a href="index.html#hoi-dap">Hỏi đáp</a></li></ul></div>' +
      '<div class="cuoi">© 2026 Nhóm Hồi Sinh Xanh · Dự án học sinh. Số liệu trong game chỉ phản ánh việc chơi, không dùng để đánh giá hay xếp loại học sinh.</div>' +
      '</div>';
  }

  // Hiện dần khi cuộn: phần tử có class "hien"
  function hienDan() {
    var ds = document.querySelectorAll('.hien');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ds.forEach(function (el) { el.classList.add('da-hien'); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('da-hien'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    ds.forEach(function (el) { io.observe(el); });
  }

  // Parallax nhẹ: đưa vị trí cuộn vào biến CSS --cuon
  function parallax() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cho = false;
    addEventListener('scroll', function () {
      if (cho) return;
      cho = true;
      requestAnimationFrame(function () {
        document.documentElement.style.setProperty('--cuon', String(Math.min(scrollY, 1600)));
        cho = false;
      });
    }, { passive: true });
  }

  window.HSXWeb = { esc: esc, tkNho: tkNho, KHOA_TK: KHOA_TK, dungMenu: dungMenu };
  dungMenu();
  dungChan();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { hienDan(); parallax(); });
  else { hienDan(); parallax(); }
})();
