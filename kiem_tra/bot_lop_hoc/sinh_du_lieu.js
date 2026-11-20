/* Sinh dữ liệu lớp học của 20 HỌC SINH ẢO (bot). Bot và kịch bản do AI (Claude) viết.
   KHÔNG phải học sinh thật: tên hiện là "HS ảo 01..20", tên đăng nhập bot01..bot20.

   - Bot chơi bằng dữ liệu thật của game: món rác + thùng đúng của Cổng Phân Loại (js/data.js → puzzle),
     món rác của Lều ném rác (sortItems), loại cây, số ô trồng thật của các màn (js/levels), và ngân hàng
     câu hỏi Flashcard thật (CAU_HOI trong js/web/on_tap.js).
   - Sự kiện có đúng định dạng game ghi vào hàng chờ (js/thong_ke.js, js/web/on_tap.js).
   - Trong lúc chơi, mỗi bot tự đếm số câu đúng/sai của chính nó (dapAn). Đây là đáp án độc lập để
     so với số liệu web tính ra; không đọc lại sự kiện để đếm.
   - Có hạt giống (seed) nên chạy lại cho đúng cùng một bộ dữ liệu. Thời gian tính lùi từ lúc chạy. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const GOC = path.join(__dirname, '..', '..');

// ---------- Dữ liệu thật của game ----------
function napGame() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of ['js/data.js', ...fs.readdirSync(path.join(GOC, 'js/levels')).filter((x) => x.endsWith('.js')).map((x) => 'js/levels/' + x)]) {
    vm.runInContext(fs.readFileSync(path.join(GOC, f), 'utf8'), ctx, { filename: f });
  }
  const D = ctx.HSX.DATA, L = ctx.HSX.LEVELS || {};
  // Số ô trồng được (P, Y) của mọi màn: giống demO() trong js/thong_ke.js
  let soO = 0;
  const phongTrong = [];
  for (const lv of Object.keys(L)) for (const id of Object.keys(L[lv].rooms || {})) {
    let n = 0;
    for (const hang of L[lv].rooms[id].map || []) for (const ch of hang) if (ch === 'P' || ch === 'Y') phongTrong.push({ phong: id, o: n++ });
    soO += n;
  }
  // Ngân hàng câu hỏi Flashcard thật: tách khối "var CAU_HOI = {...}" trong on_tap.js
  const src = fs.readFileSync(path.join(GOC, 'js/web/on_tap.js'), 'utf8');
  const bd = src.indexOf('{', src.indexOf('var CAU_HOI'));
  let sau = 0, kt = bd;
  for (; kt < src.length; kt++) { if (src[kt] === '{') sau++; else if (src[kt] === '}' && --sau === 0) break; }
  const CAU_HOI = vm.runInNewContext('(' + src.slice(bd, kt + 1) + ')');
  return { D, soO, phongTrong, CAU_HOI };
}

// ---------- Ngẫu nhiên có hạt giống ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sinh(opts) {
  const o = Object.assign({ seed: 2027, soBot: 20, bayGio: Date.now() }, opts || {});
  const { D, soO, phongTrong, CAU_HOI } = napGame();
  const r = mulberry32(o.seed);
  const chon = (a) => a[Math.floor(r() * a.length)];
  const tron = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const v = Math.floor(r() * 16); return (c === 'x' ? v : (v & 3) | 8).toString(16); });
  const NGAY = 86400000;

  const R1 = { nhua: 'taiche', kimloai: 'taiche', giaytt: 'taiche', huuco: 'huuco', khac: 'khac' };   // giống js/puzzle.js
  const binsR1 = D.puzzle.binsR1.map((b) => b.id), binsR2 = D.puzzle.binsR2.map((b) => b.id);
  const binLeu = Object.keys(D.bins);
  // Món "dễ nhầm" theo Hướng dẫn 9368/BTNMT (2023): bot hay sai hơn ở các món này
  const KHO = { 'Bã cà phê': 0.30, 'Lá khô': 0.30, 'Túi nilon bẩn': 0.12, 'Hộp xốp dính dầu': 0.12, 'Chai thủy tinh': 0.08 };
  const loaiCay = Object.keys(D.trees);

  const MA_LOP = 'BOT20A';
  const MIEN = 'hs.hoisinhxanh.example';
  const giaoVien = { id: uuid(), email: 'giao.vien.ao@bot.hoisinhxanh.example', ho_ten: 'Giáo viên ảo (bot AI)' };
  const lop = { id: uuid(), giao_vien_id: giaoVien.id, ten: 'Lớp ảo: 20 bot AI kiểm thử', ma_lop: MA_LOP, tao_luc: new Date(o.bayGio - 30 * NGAY).toISOString() };

  const bots = [];
  for (let i = 0; i < o.soBot; i++) {
    const so = String(i + 1).padStart(2, '0');
    const id = uuid();
    const tenDn = 'bot' + so;
    // Năng lực trải từ 0,42 tới 0,96. Hai bot cuối không chơi; hai bot trước đó chơi xong rồi nghỉ hơn 7 ngày.
    const nangLuc = 0.42 + (0.54 * i) / (o.soBot - 1) + (r() - 0.5) * 0.04;
    const khongChoi = i >= o.soBot - 2;
    const nghiLau = !khongChoi && i >= o.soBot - 4;
    const hs = { id, ho_ten: 'HS ảo ' + so, ten_dang_nhap: tenDn, email: MA_LOP.toLowerCase() + '.' + tenDn + '@' + MIEN, nang_luc: Math.round(nangLuc * 100) / 100 };
    const ev = [];
    const da = { cong: { luot: 0, dung: 0, tong: 0 }, leu: { dung: 0, tong: 0 }, quiz: { luot: 0, dung: 0, tong: 0, theoChuDe: {} },
      trongLan: 0, daoLan: 0, monSai: {}, cuoi: null, soSuKien: 0, saoCao: 0, theoNgay: [] };
    const ghi = (loai, dung, tong, du, luc) => {
      ev.push({ ma_su_kien: uuid(), loai, dung, tong, du_lieu: du, luc: new Date(luc).toISOString(), nguoi: id });
      da.soSuKien++;
      const iso = new Date(luc).toISOString();
      if (!da.cuoi || iso > da.cuoi) da.cuoi = iso;
      if (loai === 'cong_phan_loai' || loai === 'leu_nem_rac' || loai === 'quiz') da.theoNgay.push({ luc: iso, quiz: loai === 'quiz', dung, tong });
    };
    const sai = (ten) => { da.monSai[ten] = (da.monSai[ten] || 0) + 1; };

    let tienDo = null;
    if (!khongChoi) {
      // Các buổi chơi trong 4 tuần; bot nghỉ lâu thì buổi cuối cách đây 9–20 ngày
      const soBuoi = 2 + Math.floor(r() * 4);
      const cuoiCung = nghiLau ? (9 + r() * 11) * NGAY : r() * 5 * NGAY;
      const buoi = [];
      for (let b = 0; b < soBuoi; b++) buoi.push(o.bayGio - cuoiCung - (soBuoi - 1 - b) * (2 + r() * 5) * NGAY - r() * 3600000);
      let hoc = 0;   // tiến bộ dần qua từng buổi
      const caySave = {};
      buoi.forEach((t0, b) => {
        let t = t0;
        const p = Math.min(0.98, nangLuc + hoc);
        // Cổng Phân Loại: 0–2 lượt mỗi buổi, vòng 1 (8 món, 3 thùng), vòng 2 (10 món, 5 thùng)
        const soLuot = b === 0 ? 1 : Math.floor(r() * 3);
        for (let l = 0; l < soLuot; l++) {
          const luot = [];
          const boDo = r() < 0.15;
          const dungLai = boDo ? 3 + Math.floor(r() * 10) : Infinity;
          [[binsR1, 8, (c) => R1[c], 1], [binsR2, 10, (c) => c, 2]].forEach(([bins, n, dap, vong]) => {
            tron(D.puzzle.items).slice(0, n).forEach((it) => {
              if (luot.length >= dungLai) return;
              const nhom = dap(it.cat);
              const dung = r() < p - (KHO[it.name] || 0);
              const chonThung = dung ? nhom : chon(bins.filter((x) => x !== nhom));
              luot.push({ ten: it.name, nhom, chon: chonThung, dung, vong, giay: Math.round(r() * 50) / 10 });
            });
          });
          const nDung = luot.filter((m) => m.dung).length, nSai = luot.length - nDung;
          const xong = !boDo;
          const sao = xong ? (nSai <= 1 ? 3 : nSai <= 3 ? 2 : nSai <= 6 ? 1 : 0) : null;   // giống stars() trong js/puzzle.js
          da.cong.luot++; da.cong.dung += nDung; da.cong.tong += luot.length;
          luot.forEach((m) => { if (!m.dung) sai(m.ten); });
          if (xong && sao > da.saoCao) da.saoCao = sao;
          t += (60 + r() * 120) * 1000;
          ghi('cong_phan_loai', nDung, luot.length, { xong, sao, cac_mon: luot }, t);
        }
        // Lều ném rác: mỗi lần ném là một sự kiện
        const soNem = Math.floor(r() * 6);
        for (let k = 0; k < soNem; k++) {
          const it = chon(D.sortItems);
          const dung = r() < p - (KHO[it.name] || 0);
          const thung = dung ? it.bin : chon(binLeu.filter((x) => x !== it.bin));
          da.leu.tong++; if (dung) da.leu.dung++; else sai(it.name);
          t += (5 + r() * 20) * 1000;
          ghi('leu_nem_rac', dung ? 1 : 0, 1, { ten: it.name, thung, dung_thung: it.bin }, t);
        }
        // Trồng / đào cây
        const soTrong = 1 + Math.floor(r() * 8);
        for (let k = 0; k < soTrong; k++) {
          const cay = chon(loaiCay), { phong, o: o2 } = chon(phongTrong);
          const khoaO = phong + ':' + o2;
          if (caySave[khoaO]) continue;
          caySave[khoaO] = { cay, lon: r() < 0.6 };
          da.trongLan++;
          t += (20 + r() * 40) * 1000;
          ghi('trong_cay', 1, 1, { phong, o: o2, cay }, t);
        }
        if (r() < 0.25) {
          const k = chon(Object.keys(caySave));
          if (k) {
            const [phong, o2] = k.split(':');
            da.daoLan++;
            t += 30000;
            ghi('dao_cay', 0, 0, { phong, o: +o2, cay: caySave[k].cay }, t);
            delete caySave[k];
          }
        }
        // Flashcard: bài 10 câu, giống cauHoiCua() trong on_tap.js
        if (r() < 0.6) {
          const cd = chon(['phan_loai', 'rung', 'sinh_vat', 'tat_ca']);
          let ds = [];
          if (cd === 'phan_loai' || cd === 'tat_ca') tron(D.puzzle.items).slice(0, cd === 'tat_ca' ? 3 : 5).forEach((it) => ds.push({ ma: 'rac:' + it.name, cd: 'phan_loai', mon: it.name }));
          Object.keys(CAU_HOI).forEach((k) => { if (cd === k || cd === 'tat_ca') CAU_HOI[k].forEach((q) => ds.push({ ma: 'fact:' + q[2], cd: k })); });
          ds = tron(ds).slice(0, 10);
          const cau = ds.map((c) => ({ ma: c.ma, cd: c.cd, dung: r() < p - (c.mon ? KHO[c.mon] || 0 : 0) }));
          const nDung = cau.filter((c) => c.dung).length;
          da.quiz.luot++; da.quiz.dung += nDung; da.quiz.tong += cau.length;
          cau.forEach((c) => { const q = da.quiz.theoChuDe[c.cd] = da.quiz.theoChuDe[c.cd] || { dung: 0, tong: 0 }; q.tong++; if (c.dung) q.dung++; });
          t += (90 + r() * 120) * 1000;
          ghi('quiz', nDung, cau.length, { chu_de: cd, cac_cau: cau }, t);
        }
        hoc += 0.02 + r() * 0.03;
      });
      // Ảnh chụp tiến độ trong save (bảng tien_do): cây đang có, cây đã lớn, số loài
      const conLai = Object.values(caySave);
      tienDo = {
        hoc_sinh_id: id,
        so_cay: conLai.length, so_o: soO, so_cay_lon: conLai.filter((x) => x.lon).length,
        so_loai_cay: new Set(conLai.map((x) => x.cay)).size,
        sao_cong: da.saoCao, thoi_gian: Math.round(600 + r() * 5400), man: da.cong.luot > 2 ? 'm2' : 'm1',
        cap_nhat: da.cuoi,
      };
    }
    da.tienDo = tienDo;
    bots.push({ hs, suKien: ev, tienDo, dapAn: da });
  }
  return { bayGio: o.bayGio, seed: o.seed, soO, giaoVien, lop, bots };
}

// ---------- Đáp án cả lớp, tính theo định nghĩa trong README ("Cách diễn giải các chỉ số") ----------
function tiLe(d, t) { return t > 0 ? d / t : null; }
const SO_NGAY = 30;   // README: biểu đồ xu hướng hiện tối đa 30 ngày liền nhau, tính tới ngày lớp chơi gần nhất
function ngayDocLap(d) {   // ngày theo giờ máy, viết lại độc lập với js/web/tinh_so_lieu.js
  d = new Date(d);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function dapAnHocSinh(b) {
  const a = b.dapAn, t = a.tienDo || {};
  return {
    chinhXacCong: tiLe(a.cong.dung, a.cong.tong), chinhXacLeu: tiLe(a.leu.dung, a.leu.tong),
    chinhXacMinigame: tiLe(a.cong.dung + a.leu.dung, a.cong.tong + a.leu.tong),
    diemQuiz: tiLe(a.quiz.dung, a.quiz.tong),
    tiLeTrongCay: t.so_o ? (t.so_cay || 0) / t.so_o : null,
    soLuotCong: a.cong.luot, soBaiQuiz: a.quiz.luot, soLanNem: a.leu.tong, trongLan: a.trongLan,
    soSuKien: a.soSuKien, cuoi: a.cuoi, saoCong: t.sao_cong || 0, soCay: t.so_cay || 0, soO: t.so_o || 0,
    soCayLon: t.so_cay_lon || 0, thoiGian: t.thoi_gian || 0, monSai: a.monSai, quizTheoChuDe: a.quiz.theoChuDe,
  };
}
function dapAnLop(du, bayGio) {
  const hs = du.bots.map(dapAnHocSinh);
  const tb = (k) => { const v = hs.map((x) => x[k]).filter((x) => x !== null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const monSai = {};
  hs.forEach((x) => Object.entries(x.monSai).forEach(([m, n]) => { monSai[m] = (monSai[m] || 0) + n; }));
  const ngay = {};
  du.bots.forEach((b) => b.dapAn.theoNgay.forEach((e) => {
    const w = ngay[ngayDocLap(e.luc)] = ngay[ngayDocLap(e.luc)] || { mgD: 0, mgT: 0, qzD: 0, qzT: 0 };
    if (e.quiz) { w.qzD += e.dung; w.qzT += e.tong; } else { w.mgD += e.dung; w.mgT += e.tong; }
  }));
  // dãy ngày liền nhau: lùi từng ngày từ ngày chơi gần nhất, dừng ở ngày chơi đầu tiên hoặc đủ 30 ngày
  const co = Object.keys(ngay).sort(), cacNgay = [];
  if (co.length) {
    const [y, m, d] = co[co.length - 1].split('-').map(Number);
    for (let i = 0; i < SO_NGAY; i++) {
      const k = ngayDocLap(new Date(y, m - 1, d - i, 12));
      if (k < co[0]) break;
      const w = ngay[k] || { mgD: 0, mgT: 0, qzD: 0, qzT: 0 };
      cacNgay.unshift({ ngay: k, minigame: tiLe(w.mgD, w.mgT), quiz: tiLe(w.qzD, w.qzT) });
    }
  }
  return {
    hocSinh: hs,
    soHocSinh: hs.length,
    soDaChoi: hs.filter((x) => x.soSuKien > 0).length,
    soHoatDong7Ngay: hs.filter((x) => x.cuoi && (bayGio || Date.now()) - Date.parse(x.cuoi) < 7 * 86400000).length,
    tbMinigame: tb('chinhXacMinigame'), tbCong: tb('chinhXacCong'), tbLeu: tb('chinhXacLeu'), tbQuiz: tb('diemQuiz'), tbTrongCay: tb('tiLeTrongCay'),
    monSai,
    cacNgay,
  };
}

module.exports = { sinh, dapAnHocSinh, dapAnLop, napGame };
