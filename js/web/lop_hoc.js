/* Bảng điều khiển giáo viên: chọn / tạo lớp, tab "Lớp học" (thêm học sinh, danh sách, đặt lại mật khẩu, xoá)
   và tab "Phân tích dữ liệu" (js/web/phan_tich.js). */
(function () {
  'use strict';
  var TK = window.HSXTaiKhoan, SL = window.HSXSoLieu, esc = HSXWeb.esc;
  var CHU_MA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // bỏ chữ dễ nhầm: I, L, O, 0, 1
  var KHOA_LOP = 'hoi-sinh-xanh-lop-dang-xem';

  function maLopMoi() {
    var a = new Uint32Array(6), s = '';
    crypto.getRandomValues(a);
    for (var i = 0; i < 6; i++) s += CHU_MA[a[i] % CHU_MA.length];
    return s;
  }

  async function taoLop(tk, ten) {
    for (var lan = 0; lan < 5; lan++) {
      var r = await TK.sb.from('lop').insert({ giao_vien_id: tk.id, ten: ten, ma_lop: maLopMoi() }).select().single();
      if (!r.error) return r.data;
      if (!/duplicate|unique|23505/i.test(r.error.message + r.error.code)) throw r.error;
    }
    throw new Error('Không tạo được mã lớp, thử lại nhé.');
  }

  // Nạp toàn bộ số liệu của một lớp
  async function napLop(lop) {
    var sb = TK.sb;
    var r1 = await sb.from('ho_so').select('id, ho_ten, ten_dang_nhap, tao_luc').eq('lop_id', lop.id).eq('vai_tro', 'hoc_sinh').order('ten_dang_nhap');
    if (r1.error) throw r1.error;
    var ids = r1.data.map(function (h) { return h.id; }), suKien = [], tienDo = [];
    for (var i = 0; i < ids.length; i += 80) {   // chia nhỏ để URL không quá dài
      var phan = ids.slice(i, i + 80);
      var r2 = await sb.from('su_kien').select('hoc_sinh_id, loai, dung, tong, du_lieu, luc').in('hoc_sinh_id', phan).order('luc').limit(20000);
      if (r2.error) throw r2.error;
      suKien = suKien.concat(r2.data);
      var r3 = await sb.from('tien_do').select('*').in('hoc_sinh_id', phan);
      if (r3.error) throw r3.error;
      tienDo = tienDo.concat(r3.data);
    }
    return { lop: lop, hocSinh: r1.data, suKien: suKien, tienDo: tienDo, soLieu: SL.caLop(r1.data, suKien, tienDo) };
  }

  async function ve(noiDung, tk, tro) {
    var r = await TK.sb.from('lop').select('*').eq('giao_vien_id', tk.id).order('tao_luc');
    if (r.error) throw r.error;
    var cacLop = r.data, tab = 'lop', tt = null;

    function chonLopId() {
      var id = null;
      try { id = localStorage.getItem(KHOA_LOP); } catch (e) { /* bỏ qua */ }
      return cacLop.some(function (l) { return l.id === id; }) ? id : (cacLop[0] && cacLop[0].id);
    }

    function veKhung() {
      var lopId = chonLopId();
      noiDung.innerHTML =
        '<div class="dau-tk"><div><h2>Xin chào, ' + esc(tk.ten) + '</h2>' +
        '<p>Bảng điều khiển lớp: thêm học sinh, xem phân tích và xuất báo cáo.</p></div></div>' +
        '<div class="thanh-cong-cu">' +
        (cacLop.length ? '<div class="o-nhap" style="margin:0;min-width:240px"><label for="chon-lop">Lớp đang xem</label><select id="chon-lop">' +
          cacLop.map(function (l) { return '<option value="' + l.id + '"' + (l.id === lopId ? ' selected' : '') + '>' + esc(l.ten) + ' (' + l.ma_lop + ')</option>'; }).join('') +
          '</select></div>' : '') +
        '<span class="gian"></span>' +
        '<form id="f-tao-lop" class="thanh-cong-cu" style="margin:0"><div class="o-nhap" style="margin:0"><label for="ten-lop-moi">Tạo lớp mới</label>' +
        '<input id="ten-lop-moi" maxlength="80" placeholder="VD: 8A1 – THCS Kim Đồng" required style="min-width:min(300px,70vw)"></div>' +
        '<button class="nut chinh" type="submit" style="align-self:flex-end;min-height:48px">+ Tạo lớp</button></form></div>' +
        '<div id="bao-gv" role="status"></div>' +
        (cacLop.length
          ? '<div class="tab-trang" role="tablist" aria-label="Phần của bảng điều khiển"><button role="tab" data-tab="lop" aria-selected="' + (tab === 'lop') + '">Lớp học</button>' +
            '<button role="tab" data-tab="phan_tich" aria-selected="' + (tab === 'phan_tich') + '">Phân tích dữ liệu</button></div><div id="o-tab"><p class="trong">Đang tải lớp…</p></div>'
          : '<div class="the trong">Thầy cô chưa có lớp nào. Đặt tên lớp ở ô bên trên rồi bấm <b>+ Tạo lớp</b> để nhận mã lớp.</div>');

      var bao = document.getElementById('bao-gv');
      document.getElementById('f-tao-lop').addEventListener('submit', async function (e) {
        e.preventDefault();
        var o = document.getElementById('ten-lop-moi'), ten = o.value.trim();
        if (!ten) return;
        try {
          var l = await taoLop(tk, ten);
          cacLop.push(l);
          try { localStorage.setItem(KHOA_LOP, l.id); } catch (er) { /* bỏ qua */ }
          tab = 'lop';
          veKhung();
        } catch (er) { bao.innerHTML = '<div class="bao loi">' + esc(TK.loiTiengViet(er)) + '</div>'; }
      });
      var chon = document.getElementById('chon-lop');
      if (chon) chon.addEventListener('change', function () {
        try { localStorage.setItem(KHOA_LOP, chon.value); } catch (er) { /* bỏ qua */ }
        veKhung();
      });
      noiDung.querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); veKhung(); });
      });
      if (!lopId) return;
      var lop = cacLop.filter(function (l) { return l.id === lopId; })[0];
      napLop(lop).then(function (d) {
        tt = d;
        var o = document.getElementById('o-tab');
        if (!o) return;
        tro.xoaBieuDo();
        if (tab === 'lop') veTabLop(o, tt, tk);
        else window.HSXPhanTich.ve(o, tt, tro);
      }, function (er) {
        var o = document.getElementById('o-tab');
        if (o) o.innerHTML = '<div class="bao loi">Không tải được lớp: ' + esc(TK.loiTiengViet(er)) + '</div>';
      });
    }

    // ---------- Tab Lớp học ----------
    function veTabLop(o, tt) {
      var lop = tt.lop, s = tt.soLieu;
      o.innerHTML =
        '<div class="hai-cot">' +
        '<div class="the"><b>Mã lớp để học sinh đăng nhập</b><br>' +
        '<span class="ma-lop">' + lop.ma_lop + '</span>' +
        '<p style="color:var(--muc-2);margin:0">Lớp <b style="color:var(--duoc)">' + esc(lop.ten) + '</b>, ' + s.soHocSinh + ' học sinh, ' + s.soHoatDong7Ngay + ' em chơi trong 7 ngày qua.</p>' +
        '<div class="hang-nut" style="margin-top:16px"><button class="nut nho" type="button" id="doi-ten-lop">Đổi tên lớp</button><button class="nut nho do" type="button" id="xoa-lop">Xoá lớp</button></div></div>' +
        '<form class="the" id="f-them-hs"><b>Thêm học sinh</b><p style="color:var(--muc-2);margin:6px 0 12px;font-size:15px">Dán danh sách họ tên, mỗi dòng một em (tối đa 60 em mỗi lần). Hệ thống tự tạo tên đăng nhập và mật khẩu 6 số.</p>' +
        '<div class="o-nhap"><label for="ds-ten" class="an">Danh sách họ tên</label><textarea id="ds-ten" rows="6" placeholder="Nguyễn Văn An&#10;Trần Thị Bình&#10;..."></textarea></div>' +
        '<button class="nut chinh" type="submit">Tạo tài khoản</button></form>' +
        '</div>' +
        '<div id="ket-qua-them"></div>' +
        '<h3 style="margin-top:32px">Danh sách học sinh</h3>' +
        (tt.hocSinh.length ? '<div class="bang-cuon"><table class="bang"><thead><tr><th>#</th><th>Họ tên</th><th>Tên đăng nhập</th><th>Hoạt động gần nhất</th><th>Kết quả đã gửi</th><th></th></tr></thead><tbody>' +
          s.hocSinh.map(function (h, i) {
            return '<tr><td>' + (i + 1) + '</td><td>' + esc(h.hoTen) + '</td><td><code>' + esc(h.tenDn) + '</code></td><td>' + SL.luc(h.cuoi) + '</td><td class="so">' + h.soSuKien + '</td>' +
              '<td style="white-space:nowrap"><button class="nut nho" type="button" data-mk="' + h.id + '" aria-label="Tạo mật khẩu mới cho ' + esc(h.hoTen) + '">Mật khẩu mới</button> <button class="nut nho do" type="button" data-xoa="' + h.id + '" aria-label="Xoá tài khoản của ' + esc(h.hoTen) + '">Xoá</button></td></tr>';
          }).join('') + '</tbody></table></div>' : '<p class="trong">Lớp chưa có học sinh. Dán danh sách tên ở ô bên trên.</p>');

      var bao = document.getElementById('bao-gv');
      function baoLoi(e) { bao.innerHTML = '<div class="bao loi">' + esc(TK.loiTiengViet(e)) + '</div>'; }

      document.getElementById('f-them-hs').addEventListener('submit', async function (e) {
        e.preventDefault();
        var ds = document.getElementById('ds-ten').value.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
        if (!ds.length) return;
        var nut = this.querySelector('button');
        nut.disabled = true; nut.textContent = 'Đang tạo ' + ds.length + ' tài khoản…';
        try {
          var kq = await TK.goiHam('quan-ly-hoc-sinh', { hanh_dong: 'them', lop_id: lop.id, ds_ten: ds });
          var tot = kq.hoc_sinh.filter(function (x) { return x.mat_khau; }), loi = kq.hoc_sinh.filter(function (x) { return x.loi; });
          var kqO = document.getElementById('ket-qua-them');
          kqO.innerHTML = '<div class="the" style="margin-top:20px;border:2px solid var(--duoc);box-shadow:0 4px 0 var(--duoc)"><b>Đã tạo ' + tot.length + ' tài khoản.</b> ' +
            '<span class="bao tin" style="display:block;margin:10px 0 0">Mật khẩu chỉ hiện một lần: hãy in phiếu hoặc tải danh sách ngay.</span>' +
            (loi.length ? '<div class="bao loi" style="margin-top:10px">' + loi.map(function (x) { return esc(x.ho_ten) + ': ' + esc(x.loi); }).join('<br>') + '</div>' : '') +
            '<div class="hang-nut" style="margin:14px 0"><button class="nut chinh nho" type="button" id="in-phieu">In phiếu đăng nhập</button><button class="nut nho" type="button" id="tai-ds">Tải danh sách (.xlsx)</button></div>' +
            '<div class="bang-cuon"><table class="bang"><thead><tr><th>Họ tên</th><th>Mã lớp</th><th>Tên đăng nhập</th><th>Mật khẩu</th></tr></thead><tbody>' +
            tot.map(function (x) { return '<tr><td>' + esc(x.ho_ten) + '</td><td>' + lop.ma_lop + '</td><td><code>' + esc(x.ten_dang_nhap) + '</code></td><td><code>' + esc(x.mat_khau) + '</code></td></tr>'; }).join('') +
            '</tbody></table></div></div>';
          document.getElementById('in-phieu').addEventListener('click', function () { window.HSXXuat.inPhieu(lop, tot); });
          document.getElementById('tai-ds').addEventListener('click', function () { window.HSXXuat.danhSachDangNhap(lop, tot).catch(baoLoi); });
          document.getElementById('ds-ten').value = '';
          // làm mới danh sách bên dưới, giữ nguyên bảng mật khẩu vừa tạo
          var giu = kqO.innerHTML;
          tt = await napLop(lop);
          veTabLop(o, tt);
          var kq2 = document.getElementById('ket-qua-them');
          kq2.innerHTML = giu;
          kq2.querySelector('#in-phieu').addEventListener('click', function () { window.HSXXuat.inPhieu(lop, tot); });
          kq2.querySelector('#tai-ds').addEventListener('click', function () { window.HSXXuat.danhSachDangNhap(lop, tot).catch(baoLoi); });
        } catch (er) { baoLoi(er); nut.disabled = false; nut.textContent = 'Tạo tài khoản'; }
      });

      o.querySelectorAll('[data-mk]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var h = tt.hocSinh.filter(function (x) { return x.id === b.getAttribute('data-mk'); })[0];
          if (!confirm('Tạo mật khẩu mới cho ' + h.ho_ten + '? Mật khẩu cũ sẽ không dùng được nữa.')) return;
          try {
            var kq = await TK.goiHam('quan-ly-hoc-sinh', { hanh_dong: 'dat_lai_mat_khau', lop_id: lop.id, hoc_sinh_id: h.id });
            bao.innerHTML = '<div class="bao ok">Mật khẩu mới của <b>' + esc(h.ho_ten) + '</b> (mã lớp ' + lop.ma_lop + ', tên đăng nhập <code>' + esc(kq.ten_dang_nhap) + '</code>): <b style="font-size:20px">' + esc(kq.mat_khau) + '</b></div>';
            bao.scrollIntoView({ block: 'center' });
          } catch (er) { baoLoi(er); }
        });
      });
      o.querySelectorAll('[data-xoa]').forEach(function (b) {
        b.addEventListener('click', async function () {
          var h = tt.hocSinh.filter(function (x) { return x.id === b.getAttribute('data-xoa'); })[0];
          if (!confirm('Xoá tài khoản của ' + h.ho_ten + '?\nToàn bộ kết quả của em này cũng bị xoá và KHÔNG khôi phục được.')) return;
          try {
            await TK.goiHam('quan-ly-hoc-sinh', { hanh_dong: 'xoa', lop_id: lop.id, hoc_sinh_id: h.id });
            tt = await napLop(lop);
            veTabLop(o, tt);
            document.getElementById('bao-gv').innerHTML = '<div class="bao ok">Đã xoá tài khoản của ' + esc(h.ho_ten) + '.</div>';
          } catch (er) { baoLoi(er); }
        });
      });
      document.getElementById('doi-ten-lop').addEventListener('click', async function () {
        var ten = prompt('Tên lớp mới:', lop.ten);
        if (!ten || !ten.trim() || ten.trim() === lop.ten) return;
        var r2 = await TK.sb.from('lop').update({ ten: ten.trim().slice(0, 80) }).eq('id', lop.id).select().single();
        if (r2.error) { baoLoi(r2.error); return; }
        cacLop = cacLop.map(function (l) { return l.id === lop.id ? r2.data : l; });
        veKhung();
      });
      document.getElementById('xoa-lop').addEventListener('click', async function () {
        if (!confirm('Xoá lớp ' + lop.ten + '?\nTất cả ' + tt.hocSinh.length + ' tài khoản học sinh và kết quả của lớp sẽ bị xoá vĩnh viễn, KHÔNG khôi phục được.')) return;
        if (prompt('Gõ mã lớp ' + lop.ma_lop + ' để xác nhận xoá:') !== lop.ma_lop) return;
        try {
          for (var i = 0; i < tt.hocSinh.length; i++) {
            await TK.goiHam('quan-ly-hoc-sinh', { hanh_dong: 'xoa', lop_id: lop.id, hoc_sinh_id: tt.hocSinh[i].id });
          }
          var r3 = await TK.sb.from('lop').delete().eq('id', lop.id);
          if (r3.error) throw r3.error;
          cacLop = cacLop.filter(function (l) { return l.id !== lop.id; });
          veKhung();
        } catch (er) { baoLoi(er); }
      });
    }

    veKhung();
  }

  window.HSXGiaoVien = { ve: ve, napLop: napLop };
})();
