/* Tính số liệu học tập từ các sự kiện (bảng su_kien, hoặc hàng chờ trên máy) và ảnh chụp tiến độ.
   Dùng chung cho trang học sinh, bảng điều khiển giáo viên và phần xuất file. */
(function () {
  'use strict';
  var TEN_LOAI = { cong_phan_loai: 'Cổng Phân Loại', leu_nem_rac: 'Lều ném rác', trong_cay: 'Trồng cây', dao_cay: 'Đào cây', quiz: 'Flashcard Quiz' };
  var TEN_CHU_DE = { phan_loai: 'Phân loại rác', rung: 'Rừng ngập mặn', sinh_vat: 'Biển & sinh vật', tat_ca: 'Tất cả' };

  function tiLe(d, t) { return t > 0 ? d / t : null; }
  function phanTram(x) { return x === null || x === undefined || isNaN(x) ? '—' : Math.round(x * 100) + '%'; }

  // Thứ Hai đầu tuần (giờ máy) dạng YYYY-MM-DD
  function dauTuan(iso) {
    var d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Số liệu của MỘT học sinh từ danh sách sự kiện của em đó + tiến độ (có thể null)
  function motHocSinh(cacSuKien, tienDo) {
    var o = {
      cong: { luot: 0, dung: 0, tong: 0, cacLuot: [] },
      leu: { dung: 0, tong: 0 },
      quiz: { luot: 0, dung: 0, tong: 0, cacLuot: [], theoChuDe: {} },
      trongLan: 0, monSai: {}, cuoi: null, soSuKien: 0,
    };
    (cacSuKien || []).slice().sort(function (a, b) { return a.luc < b.luc ? -1 : 1; }).forEach(function (e) {
      o.soSuKien++;
      if (!o.cuoi || e.luc > o.cuoi) o.cuoi = e.luc;
      var dl = e.du_lieu || {};
      if (e.loai === 'cong_phan_loai') {
        o.cong.luot++; o.cong.dung += e.dung; o.cong.tong += e.tong;
        o.cong.cacLuot.push({ luc: e.luc, tiLe: tiLe(e.dung, e.tong), sao: dl.sao, xong: dl.xong !== false });
        (dl.cac_mon || []).forEach(function (m) { if (!m.dung) o.monSai[m.ten] = (o.monSai[m.ten] || 0) + 1; });
      } else if (e.loai === 'leu_nem_rac') {
        o.leu.dung += e.dung; o.leu.tong += e.tong;
        if (!e.dung && dl.ten) o.monSai[dl.ten] = (o.monSai[dl.ten] || 0) + 1;
      } else if (e.loai === 'quiz') {
        o.quiz.luot++; o.quiz.dung += e.dung; o.quiz.tong += e.tong;
        o.quiz.cacLuot.push({ luc: e.luc, tiLe: tiLe(e.dung, e.tong), chuDe: dl.chu_de });
        (dl.cac_cau || []).forEach(function (c) {
          var k = c.cd || 'khac', q = o.quiz.theoChuDe[k] = o.quiz.theoChuDe[k] || { dung: 0, tong: 0 };
          q.tong++; if (c.dung) q.dung++;
        });
      } else if (e.loai === 'trong_cay') {
        o.trongLan++;
      }
    });
    var t = tienDo || {};
    var mgD = o.cong.dung + o.leu.dung, mgT = o.cong.tong + o.leu.tong;
    return {
      cong: o.cong, leu: o.leu, quiz: o.quiz, monSai: o.monSai, cuoi: o.cuoi, soSuKien: o.soSuKien, trongLan: o.trongLan,
      chinhXacCong: tiLe(o.cong.dung, o.cong.tong),
      chinhXacLeu: tiLe(o.leu.dung, o.leu.tong),
      chinhXacMinigame: tiLe(mgD, mgT),
      diemQuiz: tiLe(o.quiz.dung, o.quiz.tong),
      soCay: t.so_cay || 0, soO: t.so_o || 0, soCayLon: t.so_cay_lon || 0, soLoaiCay: t.so_loai_cay || 0,
      tiLeTrongCay: t.so_o ? (t.so_cay || 0) / t.so_o : null,
      saoCong: t.sao_cong || 0, thoiGian: t.thoi_gian || 0,
    };
  }

  // Số liệu cả lớp: hocSinh = [{id, ho_ten, ten_dang_nhap}], suKien = mọi sự kiện, tienDo = mọi dòng tien_do
  function caLop(hocSinh, suKien, tienDo) {
    var theoHs = {}, td = {};
    (tienDo || []).forEach(function (r) { td[r.hoc_sinh_id] = r; });
    (suKien || []).forEach(function (e) { (theoHs[e.hoc_sinh_id] = theoHs[e.hoc_sinh_id] || []).push(e); });
    var ds = hocSinh.map(function (h) {
      return Object.assign({ id: h.id, hoTen: h.ho_ten, tenDn: h.ten_dang_nhap }, motHocSinh(theoHs[h.id], td[h.id]));
    });
    function tb(truong) {
      var v = ds.map(function (x) { return x[truong]; }).filter(function (x) { return x !== null && x !== undefined; });
      return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null;
    }
    // xu hướng theo tuần
    var tuan = {};
    (suKien || []).forEach(function (e) {
      if (e.loai !== 'cong_phan_loai' && e.loai !== 'leu_nem_rac' && e.loai !== 'quiz') return;
      var k = dauTuan(e.luc), w = tuan[k] = tuan[k] || { mgD: 0, mgT: 0, qzD: 0, qzT: 0 };
      if (e.loai === 'quiz') { w.qzD += e.dung; w.qzT += e.tong; } else { w.mgD += e.dung; w.mgT += e.tong; }
    });
    var cacTuan = Object.keys(tuan).sort().slice(-10).map(function (k) {
      return { tuan: k, minigame: tiLe(tuan[k].mgD, tuan[k].mgT), quiz: tiLe(tuan[k].qzD, tuan[k].qzT) };
    });
    var monSai = {};
    ds.forEach(function (x) { Object.keys(x.monSai).forEach(function (m) { monSai[m] = (monSai[m] || 0) + x.monSai[m]; }); });
    var bayGio = Date.now();
    return {
      hocSinh: ds,
      soHocSinh: ds.length,
      soHoatDong7Ngay: ds.filter(function (x) { return x.cuoi && bayGio - Date.parse(x.cuoi) < 7 * 86400000; }).length,
      soDaChoi: ds.filter(function (x) { return x.soSuKien > 0; }).length,
      tbMinigame: tb('chinhXacMinigame'), tbCong: tb('chinhXacCong'), tbLeu: tb('chinhXacLeu'),
      tbQuiz: tb('diemQuiz'), tbTrongCay: tb('tiLeTrongCay'),
      cacTuan: cacTuan,
      monSai: Object.keys(monSai).map(function (m) { return { ten: m, lan: monSai[m] }; }).sort(function (a, b) { return b.lan - a.lan; }),
    };
  }

  function ngay(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  function luc(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function phut(giay) { return giay ? Math.round(giay / 60) + ' phút' : '—'; }

  window.HSXSoLieu = { motHocSinh: motHocSinh, caLop: caLop, phanTram: phanTram, tiLe: tiLe, ngay: ngay, luc: luc, phut: phut,
    TEN_LOAI: TEN_LOAI, TEN_CHU_DE: TEN_CHU_DE, dauTuan: dauTuan };
})();
