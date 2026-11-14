/* Hồi Sinh Xanh — phần dùng chung cho các trang web: thanh menu, chân trang.
   Mỗi trang đặt <header id="dau-trang" data-trang="gioi-thieu|on-tap|thong-ke|dang-nhap"></header>
   và <footer id="chan-trang"></footer>, rồi nạp file này ngay sau hai thẻ đó. */
(function () {
  'use strict';
  var KHOA_TK = 'hoi-sinh-xanh-tai-khoan';   // bản nhớ tạm hồ sơ (tên, vai trò) để menu hiện ngay
  document.documentElement.classList.add('co-js');

  function tkNho() {
    try { return JSON.parse(localStorage.getItem(KHOA_TK) || 'null'); } catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var LOGO = '<a class="logo" href="index.html"><img src="assets/web/logo.png" alt="" width="42" height="42"><span>Hồi Sinh Xanh</span></a>';

  function dungMenu() {
    var dau = document.getElementById('dau-trang');
    if (!dau) return;
    var trang = dau.getAttribute('data-trang') || '';
    var cur = function (t) { return trang === t ? ' aria-current="page"' : ''; };
    var tk = tkNho();
    var nutTk = tk
      ? '<li class="nut-tk"><button class="mu" type="button" aria-haspopup="true">' + esc(tk.ten || 'Tài khoản') + '</button>' +
        '<ul class="con">' +
        '<li><a href="thong-ke.html">' + (tk.vai_tro === 'giao_vien' ? 'Bảng điều khiển lớp<small>Lớp học, phân tích, xuất file</small>' : 'Thống kê của em<small>Độ chính xác, cây đã trồng, điểm ôn tập</small>') + '</a></li>' +
        '<li><a href="#" data-dang-xuat>Đăng xuất</a></li></ul></li>'
      : '<li class="nut-tk"><a class="nut chinh nho" href="dang-nhap.html"' + cur('dang-nhap') + '>Đăng nhập</a></li>';
    dau.className = 'dau-trang';
    dau.innerHTML =
      '<div class="khung">' + LOGO +
      '<button class="nut-menu" type="button" aria-label="Mở menu" aria-expanded="false" aria-controls="menu-chinh">☰ Menu</button>' +
      '<ul class="menu" id="menu-chinh">' +
      '<li><a href="index.html"' + cur('gioi-thieu') + '>Giới thiệu</a></li>' +
      '<li><button class="mu" type="button" aria-haspopup="true"' + (trang === 'on-tap' ? ' aria-current="page"' : '') + '>Trò chơi</button>' +
      '<ul class="con">' +
      '<li><a href="hoi-sinh-xanh.html">Hồi Sinh Xanh<small>Game hành động 2D, chơi ngay</small></a></li>' +
      '<li><a href="on-tap.html"' + cur('on-tap') + '>Ôn tập Flashcard<small>Lật thẻ và kiểm tra 10 câu</small></a></li>' +
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
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        var mo = b.parentElement.classList.toggle('mo');
        b.setAttribute('aria-expanded', mo ? 'true' : 'false');
      });
    });
    document.addEventListener('click', function (e) {
      if (dau.contains(e.target)) return;
      dau.querySelectorAll('li.mo').forEach(function (li) { li.classList.remove('mo'); });
      dau.querySelectorAll('button.mu').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var dangMo = dau.querySelector('li.mo');
      if (dangMo) { dangMo.classList.remove('mo'); var b = dangMo.querySelector('button.mu'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }
      if (menu.classList.contains('mo')) { menu.classList.remove('mo'); nut.setAttribute('aria-expanded', 'false'); nut.focus(); }
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
      '<div>' + LOGO +
      '<p style="margin:14px 0 0;max-width:46ch">Game giáo dục môi trường cho học sinh 12–18 tuổi: phân loại rác đúng luật, trồng lại rừng ngập mặn ' +
      'và hiểu vì sao từng việc nhỏ đều quan trọng.</p></div>' +
      '<div><h4>Khám phá</h4><ul>' +
      '<li><a href="index.html#mo-dau">Câu chuyện mở đầu</a></li><li><a href="hoi-sinh-xanh.html">Chơi Hồi Sinh Xanh</a></li>' +
      '<li><a href="on-tap.html">Ôn tập Flashcard</a></li><li><a href="index.html#doc-truyen">Đọc truyện tranh</a></li></ul></div>' +
      '<div><h4>Lớp học</h4><ul>' +
      '<li><a href="index.html#giao-vien">Dành cho giáo viên</a></li><li><a href="thong-ke.html">Thống kê</a></li>' +
      '<li><a href="dang-nhap.html">Đăng nhập</a></li><li><a href="index.html#hoi-dap">Hỏi đáp</a></li></ul></div>' +
      '<div class="cuoi">© 2026 Nhóm Hồi Sinh Xanh, dự án của học sinh. Số liệu trong game chỉ phản ánh việc chơi, không dùng để đánh giá hay xếp loại học sinh.</div>' +
      '</div>';
    // vài con đom đóm trên nền đước
    var vt = [[6, 30], [14, 72], [23, 18], [38, 60], [47, 26], [58, 80], [66, 40], [74, 14], [83, 66], [91, 34], [96, 82], [31, 88]];
    vt.forEach(function (p, i) {
      var d = document.createElement('span');
      d.className = 'dom-dom';
      d.setAttribute('aria-hidden', 'true');
      d.style.left = p[0] + '%';
      d.style.top = p[1] + '%';
      d.style.animationDelay = (-i * 0.9) + 's';
      d.style.animationDuration = (3.6 + (i % 4) * 0.8) + 's';
      c.appendChild(d);
    });
  }

  window.HSXWeb = { esc: esc, tkNho: tkNho, KHOA_TK: KHOA_TK, dungMenu: dungMenu };
  dungMenu();
  dungChan();
})();
