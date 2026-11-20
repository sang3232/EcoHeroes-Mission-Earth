/* Kiểm thử tính đúng đắn của số liệu lớp học với 20 HỌC SINH ẢO (bot) do AI tạo.
   KHÔNG phải học sinh thật. Không cần mạng, không tạo tài khoản thật.

   Cách làm:
   1. kiem_tra/bot_lop_hoc/sinh_du_lieu.js cho 20 bot chơi bằng dữ liệu thật của game (món rác, thùng,
      ô trồng, câu hỏi Flashcard) và ghi sự kiện đúng định dạng game. Mỗi bot tự đếm đúng/sai của nó.
   2. Đưa sự kiện qua đúng mã web dùng: js/web/tinh_so_lieu.js (motHocSinh, caLop), như khi trang
      Thống kê đọc bảng su_kien và tien_do.
   3. So từng chỉ số web tính ra với số bot tự đếm (đáp án độc lập), theo định nghĩa trong README.

   Chạy:  node kiem_tra/bot_lop_hoc.js            (hạt giống mặc định 2027)
          node kiem_tra/bot_lop_hoc.js --seed 7    (bộ dữ liệu khác)
          node kiem_tra/bot_lop_hoc.js --ghi <thư mục>   (ghi bộ dữ liệu và kết quả ra JSON) */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { sinh, dapAnLop } = require('./bot_lop_hoc/sinh_du_lieu.js');

const thamSo = process.argv.slice(2);
const lay = (k) => { const i = thamSo.indexOf(k); return i >= 0 ? thamSo[i + 1] : null; };
const seed = +(lay('--seed') || 2027);
const bayGio = Date.now();

const du = sinh({ seed, bayGio });

// Nạp mã web thật
const ctx = { console, Date };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'web', 'tinh_so_lieu.js'), 'utf8'), ctx);
const SL = ctx.HSXSoLieu;

// Dữ liệu như trang giáo viên đọc từ máy chủ (lop_hoc.js → napLop: chỉ các cột này)
const hocSinh = du.bots.map((b) => ({ id: b.hs.id, ho_ten: b.hs.ho_ten, ten_dang_nhap: b.hs.ten_dang_nhap }));
const suKien = [].concat(...du.bots.map((b) => b.suKien.map((e) => ({ hoc_sinh_id: b.hs.id, loai: e.loai, dung: e.dung, tong: e.tong, du_lieu: e.du_lieu, luc: e.luc }))))
  .sort((a, b) => (a.luc < b.luc ? -1 : 1));
const tienDo = du.bots.filter((b) => b.tienDo).map((b) => b.tienDo);

const web = SL.caLop(hocSinh, suKien, tienDo);
const dap = dapAnLop(du, bayGio);

let dat = 0, khong = 0;
const loi = [];
const bang = (x, y) => (typeof x === 'number' && typeof y === 'number' ? Math.abs(x - y) < 1e-12 : x === y);
function so(ten, x, y) { if (bang(x, y)) dat++; else { khong++; loi.push(ten + ': web ' + x + ' ≠ bot ' + y); } }

console.log('Kiểm thử số liệu lớp học — 20 HỌC SINH ẢO (bot do AI tạo, KHÔNG phải học sinh thật)');
console.log('Hạt giống ' + seed + ' · ' + suKien.length + ' sự kiện · ' + tienDo.length + ' ảnh chụp tiến độ · ' + du.soO + ' ô trồng trong game\n');

// 1) Từng học sinh: trang giáo viên (caLop) và trang học sinh (motHocSinh) phải khớp đáp án
console.log('1) Từng học sinh (20 em × 2 trang)');
du.bots.forEach((b, i) => {
  const w = web.hocSinh[i], d = dap.hocSinh[i];
  const hsTrang = SL.motHocSinh(suKien.filter((e) => e.hoc_sinh_id === b.hs.id), b.tienDo);
  const truocLoi = khong;
  for (const [ten, x] of [['GV', w], ['HS', hsTrang]]) {
    const p = b.hs.ho_ten + ' [' + ten + '] ';
    so(p + 'Cổng Phân Loại', x.chinhXacCong, d.chinhXacCong);
    so(p + 'Lều ném rác', x.chinhXacLeu, d.chinhXacLeu);
    so(p + 'Minigame chung', x.chinhXacMinigame, d.chinhXacMinigame);
    so(p + 'Flashcard', x.diemQuiz, d.diemQuiz);
    so(p + 'Tỉ lệ trồng cây', x.tiLeTrongCay, d.tiLeTrongCay);
    so(p + 'Số lượt cổng', x.cong.luot, d.soLuotCong);
    so(p + 'Số bài Flashcard', x.quiz.luot, d.soBaiQuiz);
    so(p + 'Số lần ném', x.leu.tong, d.soLanNem);
    so(p + 'Số lần tự trồng', x.trongLan, d.trongLan);
    so(p + 'Số sự kiện', x.soSuKien, d.soSuKien);
    so(p + 'Lần cuối', x.cuoi, d.cuoi);
    so(p + 'Sao cổng', x.saoCong, d.saoCong);
    so(p + 'Ô đã trồng', x.soCay, d.soCay);
    so(p + 'Món nhầm', JSON.stringify(Object.entries(x.monSai).sort()), JSON.stringify(Object.entries(d.monSai).sort()));
    so(p + 'Flashcard theo chủ đề', JSON.stringify(Object.entries(x.quiz.theoChuDe).sort()), JSON.stringify(Object.entries(d.quizTheoChuDe).sort()));
  }
  const ok = khong === truocLoi;
  console.log('  ' + (ok ? '✓' : '✗') + ' ' + b.hs.ho_ten + ' (năng lực ' + b.hs.nang_luc + ')' +
    '  minigame ' + SL.phanTram(d.chinhXacMinigame) + ' · Flashcard ' + SL.phanTram(d.diemQuiz) + ' · trồng ' + SL.phanTram(d.tiLeTrongCay) +
    (b.suKien.length ? '' : '  — bot không chơi'));
});

// 2) Cả lớp
console.log('\n2) Cả lớp');
const lop = [
  ['Số học sinh', web.soHocSinh, dap.soHocSinh, (x) => x],
  ['Học sinh đã chơi', web.soDaChoi, dap.soDaChoi, (x) => x],
  ['Hoạt động trong 7 ngày', web.soHoatDong7Ngay, dap.soHoatDong7Ngay, (x) => x],
  ['Độ chính xác minigame TB', web.tbMinigame, dap.tbMinigame, SL.phanTram],
  ['Cổng Phân Loại TB', web.tbCong, dap.tbCong, SL.phanTram],
  ['Lều ném rác TB', web.tbLeu, dap.tbLeu, SL.phanTram],
  ['Điểm Flashcard TB', web.tbQuiz, dap.tbQuiz, SL.phanTram],
  ['Tỉ lệ trồng cây TB', web.tbTrongCay, dap.tbTrongCay, SL.phanTram],
];
lop.forEach(([ten, x, y, f]) => { const t = khong; so('Lớp ' + ten, x, y); console.log('  ' + (khong === t ? '✓' : '✗') + ' ' + ten + ': ' + f(x)); });

// Món hay nhầm: cùng danh sách, cùng số lần, xếp từ nhiều tới ít
const monWeb = JSON.stringify(web.monSai.map((m) => [m.ten, m.lan]).sort());
const monDap = JSON.stringify(Object.entries(dap.monSai).sort());
let t0 = khong; so('Lớp món hay nhầm', monWeb, monDap);
const giam = web.monSai.every((m, i) => i === 0 || web.monSai[i - 1].lan >= m.lan);
if (giam) dat++; else { khong++; loi.push('Món hay nhầm không xếp giảm dần'); }
console.log('  ' + (khong === t0 ? '✓' : '✗') + ' Món hay nhầm: ' + web.monSai.slice(0, 4).map((m) => m.ten + ' (' + m.lan + ')').join(', ') + '…');

// Xu hướng theo ngày
t0 = khong;
so('Lớp số ngày', web.cacNgay.length, dap.cacNgay.length);
dap.cacNgay.forEach((w, i) => {
  const x = web.cacNgay[i] || {};
  so('Ngày ' + w.ngay, x.ngay, w.ngay);
  so('Ngày ' + w.ngay + ' minigame', x.minigame, w.minigame);
  so('Ngày ' + w.ngay + ' quiz', x.quiz, w.quiz);
});
const coSo = web.cacNgay.filter((w) => w.minigame !== null || w.quiz !== null);
console.log('  ' + (khong === t0 ? '✓' : '✗') + ' Xu hướng ' + web.cacNgay.length + ' ngày (' + coSo.length + ' ngày có người chơi): ' +
  (web.cacNgay[0] || {}).ngay + ' → ' + (web.cacNgay[web.cacNgay.length - 1] || {}).ngay);

// 3) Dữ liệu sai/lạ không làm hỏng số liệu
console.log('\n3) Trường hợp biên');
t0 = khong;
const trong = SL.caLop([], [], []);
so('Lớp rỗng: số HS', trong.soHocSinh, 0);
so('Lớp rỗng: TB minigame', trong.tbMinigame, null);
const khongChoi = SL.motHocSinh([], null);
so('Bot không chơi: minigame', khongChoi.chinhXacMinigame, null);
so('Bot không chơi: Flashcard', khongChoi.diemQuiz, null);
so('Bot không chơi: trồng cây', khongChoi.tiLeTrongCay, null);
console.log('  ' + (khong === t0 ? '✓' : '✗') + ' Lớp rỗng và bot không chơi cho "—" (null), không chia cho 0');
t0 = khong;
const daoLon = SL.motHocSinh(du.bots[0].suKien.slice().reverse(), du.bots[0].tienDo);
so('Đảo thứ tự sự kiện: minigame', daoLon.chinhXacMinigame, dap.hocSinh[0].chinhXacMinigame);
so('Đảo thứ tự sự kiện: lần cuối', daoLon.cuoi, dap.hocSinh[0].cuoi);
console.log('  ' + (khong === t0 ? '✓' : '✗') + ' Sự kiện tới không theo thứ tự thời gian vẫn tính đúng');
t0 = khong;
// Biểu đồ theo ngày: lớp chơi rải 45 ngày thì chỉ hiện 30 ngày cuối; chơi đúng 1 ngày thì hiện 1 điểm
const motBai = (ngay, dung) => ({ hoc_sinh_id: 'x', loai: 'leu_nem_rac', dung, tong: 1, du_lieu: {}, luc: new Date(2026, 8, ngay, 9).toISOString() });
const dai = SL.caLop([{ id: 'x' }], [motBai(1, 1), motBai(20, 0), motBai(20, 1), motBai(45, 1)], []).cacNgay;
so('45 ngày → số ngày hiện', dai.length, 30);
so('45 ngày → ngày đầu', dai[0].ngay, '2026-09-16');
so('45 ngày → ngày cuối', dai[29].ngay, '2026-10-15');
so('45 ngày → ngày 20/9 (1 đúng / 2)', dai[4].minigame, 0.5);
so('45 ngày → ngày không chơi để trống', dai[5].minigame, null);
const mot = SL.caLop([{ id: 'x' }], [motBai(3, 1)], []).cacNgay;
so('1 ngày → 1 điểm', mot.length, 1);
so('Lớp rỗng → không có ngày', trong.cacNgay.length, 0);
console.log('  ' + (khong === t0 ? '✓' : '✗') + ' Biểu đồ theo ngày: tối đa 30 ngày liền nhau, ngày không chơi để trống');

console.log('\nTổng: ' + dat + ' phép so khớp, ' + khong + ' sai lệch.');
if (loi.length) { console.log('Sai lệch:'); loi.slice(0, 30).forEach((x) => console.log('  - ' + x)); }
console.log(khong ? 'CÓ LỖI.' : 'Số liệu web tính ra khớp hoàn toàn với số bot tự đếm. Không có lỗi.');

const thuMuc = lay('--ghi');
if (thuMuc) {
  fs.mkdirSync(thuMuc, { recursive: true });
  fs.writeFileSync(path.join(thuMuc, 'du_lieu_20_bot.json'), JSON.stringify({
    ghi_chu: 'DỮ LIỆU MÔ PHỎNG: 20 học sinh ảo (bot) do AI tạo và chạy. KHÔNG phải học sinh thật.',
    hat_giong: seed, luc_chay: new Date(bayGio).toISOString(), lop: du.lop, giao_vien: du.giaoVien,
    hoc_sinh: du.bots.map((b) => ({ ...b.hs, so_su_kien: b.suKien.length })), su_kien: suKien, tien_do: tienDo,
  }, null, 1));
  fs.writeFileSync(path.join(thuMuc, 'ket_qua_node.json'), JSON.stringify({ hat_giong: seed, luc_chay: new Date(bayGio).toISOString(), so_khop: dat, sai_lech: khong, loi, web: { ...web, hocSinh: undefined }, dap_an: { ...dap, hocSinh: undefined } }, null, 1));
  console.log('Đã ghi ' + path.join(thuMuc, 'du_lieu_20_bot.json'));
}
process.exit(khong ? 1 : 0);
