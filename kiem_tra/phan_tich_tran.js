/* Đọc file nhật ký trận boss của game (js/ghi_tran.js) và in bản phân tích.
   Lấy file: trong game mở Cài đặt → Nhật ký trận boss → Tải (hoặc gõ mã "nhatky", "nhatky tatca").
   Chạy:  node kiem_tra/phan_tich_tran.js <file.json | thư mục> [--chitiet]
   - Một file là một trận hoặc mảng nhiều trận. Đưa thư mục thì đọc mọi file .json trong đó (trận trùng chỉ tính một lần).
   - Mỗi trận: trang bị, hành động của Mầm, sát thương theo kiểu đòn, mất máu vì đâu, boss ra chiêu gì, sơ hở có tận dụng
     không, diễn biến chính và gợi ý. Từ hai trận trở lên thì in thêm bảng gộp theo boss.
   - --chitiet: diễn biến in đủ mọi sự kiện (mặc định chỉ in các mốc chính). */
'use strict';
const fs = require('fs');
const path = require('path');

const thamSo = process.argv.slice(2);
const chiTiet = thamSo.includes('--chitiet');
const duongDan = thamSo.filter(a => !a.startsWith('--'));
if (!duongDan.length) {
  console.log('Cách dùng: node kiem_tra/phan_tich_tran.js <file.json | thư mục> [--chitiet]');
  process.exit(1);
}

const NGUON = {
  'dan:wave': 'sóng chấn', 'than:charge': 'cú lao', 'than:lao': 'cú lao chéo', 'than:leap': 'cú nhảy đè', 'dan:bag': 'túi bay',
  'dan:bag:roi': 'mưa túi', 'dan:net': 'lưới quăng', 'dan:vung:kep': 'càng kẹp', 'dan:vung:no': 'nổ túi', 'dan:vung:sap': 'lưới sập',
  'dan:vung:quay': 'lưới quẫy', 'quai:slime_nilon': 'Slime Nilon', 'quai:luoi_ma': 'Lưới Ma nhỏ', dia_hinh: 'gai, nước độc',
};
const tenNguon = k => NGUON[k] || (k.startsWith('than:') ? `chạm thân boss (${k.slice(5)})` : k);
const CHIEU = {
  sleep: 'ngủ', intro: 'mở màn', idle: 'thủ thế', walk: 'đi tới', roar: 'gầm, sang pha 2',
  raise: 'giơ càng đập đất', ket: 'kẹt (sơ hở)', windup: 'lấy đà lao', charge: 'lao', stun: 'lật ngửa (sơ hở)', kep: 'kẹp càng',
  throw: 'ném túi', leap: 'nhảy đè', lun: 'lún cát (sơ hở)', choang: 'choáng (sơ hở)', no: 'phồng nổ túi', summon: 'gọi Slime', mua: 'mưa túi',
  quang: 'quăng lưới', lao: 'lao chéo', quan: 'tự quấn (sơ hở)', quay: 'quẫy lưới', sap: 'sập lưới', goi: 'gọi Lưới Ma nhỏ',
};
const tenChieu = k => CHIEU[k] ? `${k} (${CHIEU[k]})` : k;
const KQ = { thang: 'THẮNG', thua: 'THUA', roi: 'RỜI PHÒNG', bo: 'BỎ DỞ' };
const KIEU = { soho: 'lúc sơ hở ×1,5', giap: 'vào giáp ×0,4', phan: 'phản đòn', vuongMien: 'vương miện', vo: 'vỏ đỡ' };
const CHUOI = { chem: 'chém', banNa: 'bắn ná', nhay: 'nhảy', luot: 'lướt', luotNe: 'lướt né', phanLai: 'phản lại', phanTrung: 'phản trúng boss',
  hoiMau: 'hồi máu', nayLen: 'chém nảy', dapXuong: 'đập xuống', biQuan: 'bị quấn', thoatLuoi: 'thoát lưới', khienChan: 'khiên chặn' };
const r1 = v => Math.round(v * 10) / 10;
const phanTram = (a, b) => (b ? Math.round(100 * a / b) : 0) + '%';
const giay = s => (s >= 60 ? `${Math.floor(s / 60)} phút ${Math.round(s % 60)} giây` : `${r1(s)} giây`);

// ---------- Đọc file ----------
function doc(p) {
  if (fs.statSync(p).isDirectory()) return fs.readdirSync(p).filter(f => f.endsWith('.json')).sort().flatMap(f => doc(path.join(p, f)));
  let d;
  try { d = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.error(`Bỏ qua ${p}: không đọc được JSON (${e.message})`); return []; }
  return (Array.isArray(d) ? d : [d]).filter(x => x && Array.isArray(x.suKien));
}
const daCo = new Set();
const ds = duongDan.flatMap(doc).filter(x => { const k = x.luc + x.boss; if (daCo.has(k)) return false; daCo.add(k); return true; })
  .sort((a, b) => (a.luc < b.luc ? -1 : 1));
if (!ds.length) { console.log('Không thấy trận nào trong file đã cho.'); process.exit(1); }

// ---------- Phân tích một trận ----------
function phanTich(x) {
  const sk = x.suKien, loai = l => sk.filter(e => e[1] === l), dem = l => loai(l).length;
  const trung = loai('trungBoss'), tong = trung.reduce((a, e) => a + e[2].dmg, 0);
  const sat = {};
  trung.forEach(e => { const k = e[2].kieu; sat[k] = sat[k] || { lan: 0, dmg: 0 }; sat[k].lan++; sat[k].dmg += e[2].dmg; });
  const matTheo = {};
  let matLa = 0;
  loai('matMau').forEach(e => { matTheo[e[2].nguon] = (matTheo[e[2].nguon] || 0) + e[2].n; matLa += e[2].n; });
  const tPha2 = (loai('pha2')[0] || [null])[0];
  const matPha2 = tPha2 === null ? 0 : loai('matMau').filter(e => e[0] >= tPha2).reduce((a, e) => a + e[2].n, 0);

  // Chiêu boss: số lần ra, số lần là đòn giả, thời gian ở chiêu đó, lá Mầm mất và sát thương Mầm gây ra trong lúc đó
  const chieu = {}, ch = loai('chieu');
  ch.forEach((e, i) => {
    const c = chieu[e[2].ten] = chieu[e[2].ten] || { lan: 0, gia: 0, giay: 0, matLa: 0, sat: 0 };
    c.lan++;
    if (e[2].giaVo) c.gia++;
    c.giay += (i + 1 < ch.length ? ch[i + 1][0] : x.giay) - e[0];
  });
  let dang = null;
  sk.forEach(e => {
    if (e[1] === 'chieu') dang = e[2].ten;
    else if (dang && e[1] === 'matMau') chieu[dang].matLa += e[2].n;
    else if (dang && e[1] === 'trungBoss') chieu[dang].sat += e[2].dmg;
  });

  // Sơ hở: có đánh trúng không, bao nhiêu đòn, phản xạ (từ lúc lộ sơ hở tới đòn trúng đầu tiên), Mầm đứng cách bao xa
  const A = x.anh || { cot: [], dong: [] }, cot = n => A.cot.indexOf(n);
  const anhLuc = t => { let r = null; for (const d of A.dong) { if (d[0] > t + 0.21) break; r = d; } return r; };
  const soHo = loai('soHo').map(e => ({ t: e[0], giay: e[2].giay, sat: 0, don: 0, phanXa: null, kc: null }));
  trung.filter(e => e[2].kieu === 'soho').forEach(e => {
    const o = soHo.filter(s => e[0] >= s.t - 0.05 && e[0] <= s.t + s.giay + 0.1).pop();
    if (!o) return;
    o.sat += e[2].dmg;
    o.don++;
    if (o.phanXa === null) o.phanXa = Math.max(0, e[0] - o.t);
  });
  soHo.forEach(o => { const d = anhLuc(o.t); if (d) o.kc = Math.abs(d[cot('mamX')] - d[cot('bossX')]); });
  const coDanh = soHo.filter(o => o.don > 0), tb = a => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);

  // Khoảng cách tới boss theo ảnh chụp
  const kc = A.dong.map(d => Math.abs(d[cot('mamX')] - d[cot('bossX')]));
  const chemTrung = trung.filter(e => ['side', 'up', 'down', 'slam'].includes(e[2].huong)).length;
  const naTrung = trung.filter(e => e[2].huong === 'ban').length;
  return {
    x, tong, sat, matLa, matTheo, matPha2, tPha2, chieu, soHo, coDanh,
    phanXa: tb(coDanh.map(o => o.phanXa)), kcSoHo: tb(soHo.filter(o => o.kc !== null).map(o => o.kc)),
    kcTb: tb(kc), ganTi: kc.length ? kc.filter(v => v < 160).length / kc.length : 0,
    mam: Object.fromEntries(Object.keys(CHUOI).map(k => [k, dem(k)])),
    chemTrung, naTrung, phanNe: loai('luotNe'),
    // lướt xuyên thân boss lúc nó không lao tới (đứng yên, thủ thế...); đòn trúng boss lúc Mầm đang bất tử sau lướt né.
    // File bản 2 đánh dấu sẵn (batTu); bản 1 thì tính gần đúng: đòn trúng trong 0,45 giây sau mỗi lần lướt né
    xuyenThan: loai('luotNe').filter(e => /^than:/.test(e[2].nguon) && !['charge', 'lao', 'leap'].includes(e[2].nguon.slice(5))).length,
    batTu: (x.phienBan || 1) >= 2 ? trung.filter(e => e[2].batTu)
      : trung.filter(e => loai('luotNe').some(n => e[0] >= n[0] && e[0] <= n[0] + 0.45)),
  };
}

// ---------- In một trận ----------
function inTran(a, so) {
  const x = a.x, m = x.mam || {}, out = [];
  const luc = new Date(x.luc).toLocaleString('vi-VN');
  out.push(`\n=== Trận ${so}: ${x.tenBoss} · ${KQ[x.ketQua] || x.ketQua} · ${giay(x.giay)} · ${luc} ===`);
  out.push(`Mầm: Vợt ${m.vot} (sát thương ${m.satThuong}), ${m.mauDau}/${m.laToiDa} lá, năng lượng ${m.nangLuong} · tinh linh: ${(m.tinhLinh || []).join(', ') || 'không'} · bùa: ${(m.bua || []).join(', ') || 'không'} · ná: ${m.na ? 'có' : 'không'} · ${m.thietBi}${m.thietBi === 'pc' ? ' (' + m.boPhim + ')' : ''}`);
  const bossCuoi = (x.anh && x.anh.dong.length) ? x.anh.dong[x.anh.dong.length - 1] : null;
  if (x.ketQua !== 'thang' && bossCuoi) out.push(`Boss còn: ${bossCuoi[x.anh.cot.indexOf('bossMau')]} máu${bossCuoi[x.anh.cot.indexOf('bossLop')] ? `, ${bossCuoi[x.anh.cot.indexOf('bossLop')]} lớp túi` : ''} (lúc đầu ${x.bossDau.mau}${x.bossDau.lop ? ` máu, ${x.bossDau.lop} lớp túi` : ''})`);

  out.push(`Hành động: ${Object.keys(CHUOI).filter(k => a.mam[k]).map(k => `${CHUOI[k]} ${a.mam[k]}`).join(' · ') || 'không có'}`);
  out.push(`Trúng boss: chém ${a.chemTrung}/${a.mam.chem} nhát (${phanTram(a.chemTrung, a.mam.chem)})${a.mam.banNa ? ` · ná ${a.naTrung}/${a.mam.banNa} hạt` : ''}`);
  out.push(`Sát thương: ${r1(a.tong)} = ${Object.keys(a.sat).map(k => `${KIEU[k] || k} ${r1(a.sat[k].dmg)} (${a.sat[k].lan} đòn)`).join(' · ') || 'không'}`);
  out.push(`  → ${phanTram(a.sat.soho ? a.sat.soho.dmg : 0, a.tong)} sát thương rơi vào lúc boss sơ hở`);
  const nguon = Object.keys(a.matTheo).sort((p, q) => a.matTheo[q] - a.matTheo[p]);
  out.push(`Mất ${a.matLa} lá${a.tPha2 !== null ? ` (pha 2 từ giây ${a.tPha2}: mất ${a.matPha2})` : ''}: ${nguon.map(k => `${tenNguon(k)} ${a.matTheo[k]}`).join(' · ') || 'không mất lá nào'}`);
  if (a.phanNe.length) {
    out.push(`Lướt né: ${a.phanNe.length} lần, né được ${[...new Set(a.phanNe.map(e => tenNguon(e[2].nguon)))].join(', ')}${a.xuyenThan ? ` (${a.xuyenThan} lần chỉ là lướt xuyên thân boss lúc nó không lao tới)` : ''}`);
    out.push(`  → trúng boss lúc đang bất tử: ${a.batTu.length} đòn, ${r1(a.batTu.reduce((s, e) => s + e[2].dmg, 0))} sát thương${(x.phienBan || 1) >= 2 ? '' : ' (file bản 1: tính gần đúng)'}`);
  }
  const sh = a.soHo;
  out.push(`Sơ hở: ${sh.length} lần (${r1(sh.reduce((s, o) => s + o.giay, 0))} giây), có đánh ${a.coDanh.length}, bỏ phí ${sh.length - a.coDanh.length}`
    + (a.coDanh.length ? ` · mỗi lần có đánh: ${r1(a.coDanh.reduce((s, o) => s + o.sat, 0) / a.coDanh.length)} sát thương, phản xạ ${r1(a.phanXa)} giây` : '')
    + (a.kcSoHo !== null ? ` · lúc lộ sơ hở Mầm đứng cách ${Math.round(a.kcSoHo)} px` : ''));
  if (a.kcTb !== null) out.push(`Khoảng cách tới boss: trung bình ${Math.round(a.kcTb)} px, ${phanTram(a.ganTi, 1)} thời gian đứng sát (< 160 px)`);

  out.push('Chiêu boss            lần  giả  giây  Mầm mất lá  Mầm gây sát thương');
  Object.keys(a.chieu).sort((p, q) => a.chieu[q].lan - a.chieu[p].lan).forEach(k => {
    const c = a.chieu[k];
    out.push(`  ${k.padEnd(10)}${(CHIEU[k] || '').slice(0, 9).padEnd(10)}${String(c.lan).padStart(4)}${String(c.gia || '').padStart(5)}${String(r1(c.giay)).padStart(6)}${String(c.matLa || '').padStart(12)}${String(r1(c.sat) || '').padStart(20)}`);
  });

  out.push(chiTiet ? 'Diễn biến (đủ mọi sự kiện):' : 'Diễn biến chính (đòn trúng boss gộp lại; --chitiet để xem hết):');
  out.push(...dienBien(x));

  const goiY = (x.tongKet && x.tongKet.goiY) || [];
  const them = nhanXet(a);
  if (goiY.length || them.length) {
    out.push('Gợi ý:');
    goiY.concat(them).forEach(g => out.push('  - ' + g));
  }
  console.log(out.join('\n'));
}

// Dòng diễn biến. Mặc định: chiêu tấn công của boss, mất máu, sơ hở, phản đòn, lướt né, đổi pha; đòn trúng boss gộp lại.
function dienBien(x) {
  const out = [], CHINH = ['matMau', 'soHo', 'phanLai', 'phanTrung', 'luotNe', 'pha2', 'hoiMau', 'biQuan', 'thoatLuoi', 'khienChan'];
  let gop = null;
  const xa = () => {
    if (!gop) return;
    const khoang = gop.t1 > gop.t ? ` (giây ${gop.t}–${gop.t1})` : '';
    out.push(`  ${String(gop.t).padStart(6)}  Mầm trúng boss ${gop.n} đòn${khoang}, ${r1(gop.dmg)} sát thương (${Object.keys(gop.kieu).map(k => `${k} ${gop.kieu[k]}`).join(', ')}) → boss còn ${gop.mau}${gop.lop ? `, ${gop.lop} lớp` : ''}`);
    gop = null;
  };
  const mo = e => {
    const d = e[2] || {};
    switch (e[1]) {
      case 'chieu': return `boss: ${tenChieu(d.ten)}${d.giaVo ? ' · ĐÒN GIẢ (lấy đà lâu)' : ''}`;
      case 'matMau': return `Mầm MẤT ${d.n} lá vì ${tenNguon(d.nguon)} → còn ${d.conLai}`;
      case 'soHo': return `boss SƠ HỞ ${d.giay} giây`;
      case 'luotNe': return `Mầm lướt né ${tenNguon(d.nguon)}${d.thuong ? '' : ' (không thưởng)'}`;
      case 'khienChan': return `khiên chặn ${tenNguon(d.nguon)}`;
      case 'pha2': return 'boss sang PHA 2';
      case 'trungBoss': return `trúng boss ${r1(d.dmg)} (${d.kieu}, ${d.huong}) → còn ${d.mauBoss}${d.lop ? `, ${d.lop} lớp` : ''}`;
      case 'banNa': return `bắn ná góc ${d.goc}°, lực ${d.luc}`;
      case 'chem': return `chém ${d.huong}${d.chuot ? ' (chuột)' : ''}`;
      default: return (CHUOI[e[1]] || e[1]) + (e[2] ? ' ' + JSON.stringify(e[2]) : '');
    }
  };
  x.suKien.forEach(e => {
    if (chiTiet) { out.push(`  ${String(e[0]).padStart(6)}  ${mo(e)}`); return; }
    if (e[1] === 'trungBoss') {
      const d = e[2];
      gop = gop || { t: e[0], n: 0, dmg: 0, kieu: {} };
      gop.n++; gop.dmg += d.dmg; gop.kieu[d.kieu] = (gop.kieu[d.kieu] || 0) + 1; gop.mau = d.mauBoss; gop.lop = d.lop; gop.t1 = e[0];
      return;
    }
    const chinh = CHINH.includes(e[1]) || (e[1] === 'chieu' && !['idle', 'walk', 'sleep', 'ket', 'stun', 'lun', 'choang', 'quan'].includes(e[2].ten));
    if (!chinh) return;
    xa();
    out.push(`  ${String(e[0]).padStart(6)}  ${mo(e)}`);
  });
  xa();
  out.push(`  ${String(x.giay).padStart(6)}  hết trận: ${KQ[x.ketQua] || x.ketQua}`);
  return out;
}

// Nhận xét thêm từ số liệu game chưa tính sẵn
function nhanXet(a) {
  const g = [];
  if (a.mam.chem >= 10 && a.chemTrung / a.mam.chem < 0.35) g.push(`Chỉ ${phanTram(a.chemTrung, a.mam.chem)} nhát chém trúng boss: chém lúc còn xa hoặc lúc boss bay cao. Áp sát khi boss sơ hở rồi hãy chém.`);
  if (a.phanXa !== null && a.phanXa > 0.6) g.push(`Phản xạ chậm: trung bình ${r1(a.phanXa)} giây sau khi boss lộ sơ hở mới đánh trúng. Đứng gần chỗ boss sẽ hụt đòn để kịp lao vào.`);
  if (a.kcSoHo !== null && a.kcSoHo > 320) g.push(`Lúc boss lộ sơ hở, Mầm thường đứng xa (${Math.round(a.kcSoHo)} px). Bắn ná để tận dụng, hoặc né gần hơn.`);
  const giapLan = a.sat.giap ? a.sat.giap.lan : 0, giapNa = a.x.suKien.filter(e => e[1] === 'trungBoss' && e[2].kieu === 'giap' && e[2].huong === 'ban').length;
  if (giapLan >= 8 && a.sat.giap.dmg > (a.sat.soho ? a.sat.soho.dmg : 0)) {
    g.push(giapNa > giapLan / 2
      ? `${giapLan} đòn vào giáp (${giapNa} là hạt ná bắn từ xa, chỉ ăn 40%) gây nhiều sát thương hơn đòn lúc sơ hở: đánh an toàn nhưng chậm. Đứng gần hơn để kịp lao vào lúc boss sơ hở.`
      : `${giapLan} đòn vào giáp (chỉ ăn 40%) gây nhiều sát thương hơn đòn lúc sơ hở: đang thắng nhờ chém bừa, chưa nhờ kỹ thuật.`);
  }
  if (a.ganTi > 0.6) g.push(`${phanTram(a.ganTi, 1)} thời gian đứng sát boss: boss sẽ kẹp / nổ / quẫy / sập lưới. Lùi ra khi nó thủ thế.`);
  return g;
}

// ---------- Bảng gộp theo boss ----------
function inGop(ts) {
  console.log(`\n=== Gộp ${ts.length} trận ===`);
  const theo = {};
  ts.forEach(a => (theo[a.x.tenBoss] = theo[a.x.tenBoss] || []).push(a));
  Object.keys(theo).forEach(ten => {
    const l = theo[ten], n = l.length, thang = l.filter(a => a.x.ketQua === 'thang').length, thua = l.filter(a => a.x.ketQua === 'thua').length;
    const tong = l.reduce((s, a) => s + a.tong, 0), soHo = l.reduce((s, a) => s + (a.sat.soho ? a.sat.soho.dmg : 0), 0);
    const nguon = {};
    l.forEach(a => Object.keys(a.matTheo).forEach(k => { nguon[k] = (nguon[k] || 0) + a.matTheo[k]; }));
    const shLan = l.reduce((s, a) => s + a.soHo.length, 0), shDanh = l.reduce((s, a) => s + a.coDanh.length, 0);
    console.log(`${ten}: ${n} trận, thắng ${thang}, thua ${thua}${n - thang - thua ? `, dở dang ${n - thang - thua}` : ''} · trung bình ${giay(l.reduce((s, a) => s + a.x.giay, 0) / n)}, mất ${r1(l.reduce((s, a) => s + a.matLa, 0) / n)} lá`);
    console.log(`  sát thương lúc sơ hở ${phanTram(soHo, tong)} · sơ hở có đánh ${shDanh}/${shLan} · mất lá nhiều nhất vì: ${Object.keys(nguon).sort((p, q) => nguon[q] - nguon[p]).slice(0, 3).map(k => `${tenNguon(k)} ${nguon[k]}`).join(', ') || 'không'}`);
  });
}

const ts = ds.map(phanTich);
ts.forEach((a, i) => inTran(a, i + 1));
if (ts.length > 1) inGop(ts);
