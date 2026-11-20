/* Kiểm thử trên TRANG WEB THẬT với 20 HỌC SINH ẢO (bot) do AI tạo. KHÔNG phải học sinh thật.

   - Mở thong-ke.html thật bằng Microsoft Edge (Playwright). Mã web giữ nguyên; chỉ tệp supabase-js trên CDN
     được thay bằng kiem_tra/bot_lop_hoc/supabase_gia.js, nói chuyện với một cơ sở dữ liệu trong bộ nhớ ở
     máy chủ thử này. Mọi yêu cầu tới *.supabase.co bị chặn và đếm (phải bằng 0): không chạm máy chủ thật.
   - Bước 1: từng bot "đăng nhập" (phiên giả), hàng chờ kết quả nằm trong máy như sau khi chơi game,
     và chính js/web/dong_bo.js gửi lên. Thử thêm: gửi lại không bị trùng, không gửi nhầm kết quả của bạn khác.
   - Bước 2: mở trang Thống kê của từng học sinh, đọc số trên màn hình, so với số bot tự đếm.
   - Bước 3: giáo viên mở bảng điều khiển: tab Lớp học, tab Phân tích (ô số, bảng từng em, dữ liệu biểu đồ),
     bấm Tải Excel và Tải PDF, đọc lại file Excel và so từng ô.
   - Bảng tien_do (ảnh chụp tiến độ trồng cây) được nạp thẳng vào cơ sở dữ liệu giả, vì dong_bo.js chỉ gửi
     bảng này khi đang ở trang game.

   Cần: Microsoft Edge và playwright-core (npm i -D playwright-core, hoặc đặt HSX_PLAYWRIGHT=<thư mục playwright-core>).
   Chạy:  node kiem_tra/bot_lop_hoc_web.mjs [--seed 2027] [--ra "<thư mục lưu ảnh và file>"] [--hien] */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sinh, dapAnLop } = require('./bot_lop_hoc/sinh_du_lieu.js');

const ts = process.argv.slice(2);
const lay = (k) => { const i = ts.indexOf(k); return i >= 0 ? ts[i + 1] : null; };
const seed = +(lay('--seed') || 2027);
const RA = path.resolve(lay('--ra') || path.join(GOC, 'Minh chứng kiểm thử', 'Bot_AI_20_HS_ao'));
const HIEN = ts.includes('--hien');
fs.mkdirSync(RA, { recursive: true });

function napPlaywright() {
  for (const p of [process.env.HSX_PLAYWRIGHT, 'playwright-core', 'playwright'].filter(Boolean)) {
    try { return require(p); } catch (e) { /* thử đường khác */ }
  }
  throw new Error('Cần playwright-core: npm i -D playwright-core, hoặc đặt HSX_PLAYWRIGHT=<thư mục playwright-core>.');
}

// ---------------- Dữ liệu 20 bot ----------------
const bayGio = Date.now();
const du = sinh({ seed, bayGio });
const dap = dapAnLop(du, bayGio);
const pt = (x) => (x === null || x === undefined || Number.isNaN(x) ? '—' : Math.round(x * 100) + '%');
const ptSo = (x) => (x === null || x === undefined ? '' : Math.round(x * 100));

// ---------------- Cơ sở dữ liệu trong bộ nhớ ----------------
const db = {
  lop: [du.lop],
  ho_so: [{ id: du.giaoVien.id, vai_tro: 'giao_vien', ho_ten: du.giaoVien.ho_ten, ten_dang_nhap: null, lop_id: null, tao_luc: du.lop.tao_luc }]
    .concat(du.bots.map((b) => ({ id: b.hs.id, vai_tro: 'hoc_sinh', ho_ten: b.hs.ho_ten, ten_dang_nhap: b.hs.ten_dang_nhap, lop_id: du.lop.id, tao_luc: du.lop.tao_luc }))),
  su_kien: [],
  tien_do: du.bots.filter((b) => b.tienDo).map((b) => ({ ...b.tienDo })),
  tom_tat_ai: [],
};
let soSuKienId = 1;
const demYeuCau = {};

function tachCot(s) {
  const ra = []; let sau = 0, cur = '';
  for (const ch of s) { if (ch === '(') sau++; if (ch === ')') sau--; if (ch === ',' && !sau) { ra.push(cur.trim()); cur = ''; } else cur += ch; }
  if (cur.trim()) ra.push(cur.trim());
  return ra;
}
function chonCot(r, cot) {
  if (!cot || cot.trim() === '*') return { ...r };
  const o = {};
  for (const p of tachCot(cot)) {
    const m = p.match(/^(\w+):(\w+)\s*\(([^)]*)\)$/);   // nhúng bảng: lop:lop_id (ten, ma_lop)
    if (m) { const l = db.lop.find((x) => x.id === r[m[2]]); o[m[1]] = l ? Object.fromEntries(m[3].split(',').map((c) => c.trim()).map((c) => [c, l[c]])) : null; }
    else if (p === '*') Object.assign(o, r);
    else o[p] = r[p];
  }
  return o;
}
const khop = (r, loc) => loc.every(([k, c, v]) => (k === 'eq' ? r[c] === v : v.includes(r[c])));
const loiRls = { message: 'new row violates row-level security policy', code: '42501' };

function chenDong(bang, row, nguoi) {
  // Giống chính sách RLS trong supabase/schema.sql: học sinh chỉ ghi kết quả của chính mình
  if ((bang === 'su_kien' || bang === 'tien_do') && row.hoc_sinh_id !== nguoi) return loiRls;
  if (bang === 'su_kien') {
    if (db.su_kien.some((x) => x.ma_su_kien === row.ma_su_kien)) return { message: 'duplicate key value violates unique constraint "su_kien_ma_su_kien_key"', code: '23505' };
    row = { id: soSuKienId++, nhan_luc: new Date().toISOString(), ...row };
  }
  if (bang === 'lop') row = { id: crypto.randomUUID(), tao_luc: new Date().toISOString(), ...row };
  db[bang].push(row);
  return row;
}

function trungBinhLop(nguoi) {   // dịch sát hàm SQL public.trung_binh_lop() trong supabase/schema.sql
  const toi = db.ho_so.find((h) => h.id === nguoi);
  const hs = db.ho_so.filter((h) => toi && h.lop_id === toi.lop_id && h.vai_tro === 'hoc_sinh').map((h) => h.id);
  const tiLeTheo = (loai) => {
    const g = {};
    db.su_kien.filter((e) => hs.includes(e.hoc_sinh_id) && loai.includes(e.loai)).forEach((e) => { const x = g[e.hoc_sinh_id] = g[e.hoc_sinh_id] || [0, 0]; x[0] += e.dung; x[1] += e.tong; });
    return Object.values(g).map(([d, t]) => (t ? d / t : null));
  };
  const avg = (v) => { v = v.filter((x) => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  return {
    so_hoc_sinh: hs.length,
    chinh_xac: avg(tiLeTheo(['cong_phan_loai', 'leu_nem_rac'])),
    quiz: avg(tiLeTheo(['quiz'])),
    trong_cay: avg(db.tien_do.filter((t) => hs.includes(t.hoc_sinh_id)).map((t) => (t.so_o ? t.so_cay / t.so_o : null))),
  };
}

function xuLy(yc) {
  demYeuCau[yc.op + ' ' + (yc.bang || yc.ten)] = (demYeuCau[yc.op + ' ' + (yc.bang || yc.ten)] || 0) + 1;
  if (yc.op === 'rpc') return yc.ten === 'trung_binh_lop' ? { data: trungBinhLop(yc.nguoi), error: null } : { data: null, error: { message: 'Không có hàm ' + yc.ten } };
  const bang = db[yc.bang];
  if (!bang) return { data: null, error: { message: 'Không có bảng ' + yc.bang } };
  let ra = [];
  if (yc.op === 'select') {
    ra = bang.filter((r) => khop(r, yc.loc));
    for (const [c, tang] of yc.xep.slice().reverse()) ra.sort((a, b) => (a[c] === b[c] ? 0 : (a[c] < b[c]) === tang ? -1 : 1));
    if (yc.gioiHan) ra = ra.slice(0, yc.gioiHan);
  } else if (yc.op === 'insert' || yc.op === 'upsert') {
    const cot = (yc.trungCot || (yc.bang === 'su_kien' ? 'ma_su_kien' : yc.bang === 'tien_do' ? 'hoc_sinh_id' : 'id')).split(',').map((s) => s.trim());
    for (const dong of yc.dong) {
      const cu = yc.op === 'upsert' ? bang.find((r) => cot.every((c) => r[c] === dong[c])) : null;
      if (cu) {
        if (yc.boQuaTrung) continue;                       // ON CONFLICT DO NOTHING
        if (yc.bang === 'tien_do' && dong.hoc_sinh_id !== yc.nguoi) return { data: null, error: loiRls };
        Object.assign(cu, dong); ra.push(cu);
      } else {
        const r = chenDong(yc.bang, { ...dong }, yc.nguoi);
        if (r.message) return { data: null, error: r };
        ra.push(r);
      }
    }
    if (!yc.traVe) return { data: null, error: null };
  } else if (yc.op === 'update') {
    ra = bang.filter((r) => khop(r, yc.loc)); ra.forEach((r) => Object.assign(r, yc.gt));
    if (!yc.traVe) return { data: null, error: null };
  } else if (yc.op === 'delete') {
    db[yc.bang] = bang.filter((r) => !khop(r, yc.loc));
    return { data: null, error: null };
  }
  ra = ra.map((r) => chonCot(r, yc.cot));
  if (yc.mot === 'single') return ra.length === 1 ? { data: ra[0], error: null } : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } };
  if (yc.mot === 'maybe') return ra.length > 1 ? { data: null, error: { message: 'multiple rows' } } : { data: ra[0] || null, error: null };
  return { data: ra, error: null };
}

// ---------------- Máy chủ tĩnh + /__bot_db ----------------
const KIEU = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const mayChu = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__bot_db') {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => {
      let kq;
      try { kq = xuLy(JSON.parse(b)); } catch (e) { kq = { data: null, error: { message: String(e.message) } }; }
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(kq));
    });
    return;
  }
  const p = path.normalize(path.join(GOC, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])));
  if (!p.startsWith(GOC) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': KIEU[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((ok) => mayChu.listen(0, '127.0.0.1', ok));
const GOC_URL = 'http://127.0.0.1:' + mayChu.address().port;

// ---------------- Trình duyệt ----------------
const { chromium } = napPlaywright();
const trinh = await chromium.launch({ channel: 'msedge', headless: !HIEN });
const BAN_EDGE = trinh.version();
const SUPA_GIA = fs.readFileSync(path.join(GOC, 'kiem_tra', 'bot_lop_hoc', 'supabase_gia.js'), 'utf8');
let goiMayThat = 0;
const loiTrang = [];

async function nguCanh(kho) {
  const ctx = await trinh.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN', acceptDownloads: true });
  await ctx.route('**/@supabase/supabase-js@*/**', (r) => r.fulfill({ contentType: 'application/javascript', body: SUPA_GIA }));
  await ctx.route(/^https?:\/\/[^/]*supabase\.co\//, (r) => { goiMayThat++; return r.abort(); });
  await ctx.addInitScript((k) => {
    try {
      if (localStorage.getItem('__bot_da_nap')) return;
      Object.keys(k).forEach((x) => localStorage.setItem(x, JSON.stringify(k[x])));
      localStorage.setItem('__bot_da_nap', '1');
    } catch (e) { /* about:blank */ }
  }, kho);
  return ctx;
}
// Dải chữ đỏ in lên ẢNH CHỤP (lớp phủ của bài thử, không phải của web), để ảnh tách khỏi báo cáo vẫn rõ là bot
async function danNhan(p) {
  await p.evaluate(() => {
    if (document.getElementById('__nhan_bot')) return;
    const d = document.createElement('div');
    d.id = '__nhan_bot';
    d.textContent = 'ẢNH KIỂM THỬ TỰ ĐỘNG · 20 học sinh ảo (bot) do AI tạo và chạy · KHÔNG phải học sinh thật · máy chủ giả trong bộ nhớ';
    Object.assign(d.style, { position: 'relative', zIndex: 99999, background: '#b3261e', color: '#fff', font: '700 15px/1.4 system-ui, sans-serif', padding: '8px 16px', textAlign: 'center' });
    document.body.prepend(d);
  });
}
async function trang(ctx) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => loiTrang.push(String(e.message)));
  return p;
}
const hoSoHs = (b) => ({ id: b.hs.id, vai_tro: 'hoc_sinh', ten: b.hs.ho_ten, ten_dang_nhap: b.hs.ten_dang_nhap, lop_id: du.lop.id, lop: du.lop.ten, ma_lop: du.lop.ma_lop, email: null });
const phien = (id, email) => ({ user: { id, email }, access_token: 'bot', token_type: 'bearer' });
const khoRong = () => ({ cong: { luot: 0, dung: 0, tong: 0, saoCao: 0, cacLuot: [] }, leu: { dung: 0, tong: 0 }, quiz: { luot: 0, dung: 0, tong: 0, cacLuot: [] }, monSai: {}, trong: 0, dao: 0 });
const cho = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function doi(dk, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { if (await dk()) return true; await cho(150); } return false; }

let dat = 0, khong = 0;
const loi = [];
function kq(ok, mo) { if (ok) { dat++; } else { khong++; loi.push(mo); } return ok; }
function dong(ok, mo) { console.log('  ' + (ok ? '✓' : '✗') + ' ' + mo); }

console.log('Kiểm thử trên trang web thật — 20 HỌC SINH ẢO (bot do AI tạo, KHÔNG phải học sinh thật)');
console.log('Edge ' + BAN_EDGE + ' · máy chủ thử ' + GOC_URL + ' · hạt giống ' + seed + '\n');

// ---------------- Bước 1: bot gửi kết quả qua dong_bo.js thật ----------------
console.log('1) Bot gửi kết quả lên lớp bằng js/web/dong_bo.js');
const coChoi = du.bots.filter((b) => b.suKien.length);
for (const b of coChoi) {
  const khoa = 'hoi-sinh-xanh-hoc-tap@' + b.hs.id;
  const ctx = await nguCanh({ 'hoi-sinh-xanh-tai-khoan': hoSoHs(b), 'hoi-sinh-xanh-phien': phien(b.hs.id, b.hs.email), [khoa]: { hangCho: b.suKien, tong: khoRong() } });
  const p = await trang(ctx);
  await p.goto(GOC_URL + '/thong-ke.html');
  const daGui = () => db.su_kien.filter((e) => e.hoc_sinh_id === b.hs.id).length;
  await doi(async () => daGui() === b.suKien.length && (await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).hangCho.length, khoa)) === 0);
  const conCho = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).hangCho.length, khoa);
  kq(daGui() === b.suKien.length && conCho === 0, b.hs.ho_ten + ': gửi ' + daGui() + '/' + b.suKien.length + ', còn chờ ' + conCho);

  if (b === coChoi[0]) {   // gửi lại đúng các kết quả cũ: máy chủ phải bỏ qua, không nhân đôi
    const truoc = db.su_kien.length;
    await p.evaluate(([k, ev]) => { const d = JSON.parse(localStorage.getItem(k)); d.hangCho = ev; localStorage.setItem(k, JSON.stringify(d)); return window.HSXDongBo.gui(); }, [khoa, b.suKien]);
    const conLai = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).hangCho.length, khoa);
    dong(kq(db.su_kien.length === truoc && conLai === 0, 'gửi lại không trùng'), 'Gửi lại ' + b.suKien.length + ' kết quả cũ của ' + b.hs.ho_ten + ': máy chủ không nhân đôi (vẫn ' + truoc + ' dòng), hàng chờ được dọn');
  }
  if (b === coChoi[1]) {   // kết quả của bạn khác nằm trên cùng máy: không được gửi dưới tên mình
    const ban = coChoi[2];
    const la = { ma_su_kien: crypto.randomUUID(), loai: 'quiz', dung: 10, tong: 10, du_lieu: { chu_de: 'rung', cac_cau: [] }, luc: new Date().toISOString(), nguoi: ban.hs.id };
    await p.evaluate(([k, e]) => { const d = JSON.parse(localStorage.getItem(k)); d.hangCho.push(e); localStorage.setItem(k, JSON.stringify(d)); return window.HSXDongBo.gui(); }, [khoa, la]);
    const conLai = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).hangCho.length, khoa);
    dong(kq(!db.su_kien.some((e) => e.ma_su_kien === la.ma_su_kien) && conLai === 1, 'không gửi nhầm kết quả bạn khác'),
      'Kết quả của ' + ban.hs.ho_ten + ' nằm trên máy của ' + b.hs.ho_ten + ': KHÔNG bị gửi lên, vẫn chờ đúng chủ');
  }
  await ctx.close();
}
const tongSk = coChoi.reduce((s, b) => s + b.suKien.length, 0);
dong(db.su_kien.length === tongSk, coChoi.length + ' bot đã gửi đủ ' + db.su_kien.length + '/' + tongSk + ' kết quả; 2 bot không chơi không gửi gì');

// ---------------- Bước 2: trang Thống kê của từng học sinh ----------------
console.log('\n2) Trang Thống kê của từng học sinh (đọc số trên màn hình)');
async function oSo(p) {
  return p.$$eval('.o-so .the', (ds) => ds.map((d) => ({ ten: (d.querySelector('.ten') || {}).textContent, gia: (d.querySelector('.gia-tri') || {}).textContent, ghi: (d.querySelector('.ghi') || {}).textContent || '' })));
}
let soTrangHs = 0;
const lapChuLop = [];   // tên lớp bị ghép trùng chữ: "Lớp Lớp ..."
for (const [i, b] of du.bots.entries()) {
  const ctx = await nguCanh({ 'hoi-sinh-xanh-tai-khoan': hoSoHs(b), 'hoi-sinh-xanh-phien': phien(b.hs.id, b.hs.email) });
  const p = await trang(ctx);
  await p.goto(GOC_URL + '/thong-ke.html');
  const d = dap.hocSinh[i];
  if (!b.suKien.length) {
    await doi(async () => (await p.$('main')) && !(await p.textContent('main')).includes('Đang tải'), 8000);
    if (i === du.bots.length - 1) { await danNhan(p); await p.screenshot({ path: path.join(RA, 'hs_bot_khong_choi.png'), fullPage: true }); }
    await ctx.close();
    continue;
  }
  await p.waitForSelector('.o-so .the', { timeout: 15000 });
  const o = Object.fromEntries((await oSo(p)).map((x) => [x.ten, x]));
  if (/l(ớ|o)p\s+l(ớ|o)p/i.test(await p.textContent('body'))) lapChuLop.push(b.hs.ho_ten);
  const a = b.dapAn;
  const can = [
    ['Cổng Phân Loại', pt(d.chinhXacCong), a.cong.luot + ' lượt, ' + a.cong.dung + '/' + a.cong.tong + ' món đúng'],
    ['Lều ném rác', pt(d.chinhXacLeu), a.leu.dung + '/' + a.leu.tong + ' lần ném trúng thùng'],
    ['Tính chung', pt(d.chinhXacMinigame), null],
    ['Ô đất đã trồng', d.soO ? d.soCay + '/' + d.soO : '—', d.tiLeTrongCay !== null ? pt(d.tiLeTrongCay) + ' số ô trong game' : null],
    ['Cây đã trưởng thành', String(d.soCayLon), null],
    ['Số lần tự tay trồng', String(d.trongLan), null],
    ['Điểm trung bình', pt(d.diemQuiz), a.quiz.luot + ' bài, ' + a.quiz.dung + '/' + a.quiz.tong + ' câu đúng'],
  ];
  const sai = can.filter(([t, v, ghi]) => !o[t] || o[t].gia.trim() !== v || (ghi && !o[t].ghi.includes(ghi)))
    .map(([t, v, ghi]) => t + ' hiện "' + (o[t] ? o[t].gia + ' | ' + o[t].ghi : 'không có') + '", bot đếm "' + v + (ghi ? ' | ' + ghi : '') + '"');
  kq(!sai.length, b.hs.ho_ten + ': ' + sai.join('; '));
  if (sai.length) dong(false, b.hs.ho_ten + ': ' + sai.join('; '));
  soTrangHs++;
  if (b.hs.ten_dang_nhap === 'bot10') { await cho(600); await danNhan(p); await p.screenshot({ path: path.join(RA, 'hs_ao_10_trang_thong_ke.png'), fullPage: true }); }
  await ctx.close();
}
dong(kq(!lapChuLop.length, 'Lặp chữ "Lớp Lớp" ở trang: ' + lapChuLop.join(', ')), 'Tên lớp “' + du.lop.ten + '” không bị ghép thành “Lớp Lớp…” trên ' + soTrangHs + ' trang học sinh');
dong(!loi.some((x) => x.startsWith('HS ảo')), soTrangHs + ' trang học sinh × 7 ô số (Cổng, Lều, Tính chung, Ô đã trồng, Cây trưởng thành, Số lần trồng, Flashcard) và dòng chi tiết khớp số bot tự đếm');

// ---------------- Bước 3: bảng điều khiển giáo viên ----------------
console.log('\n3) Bảng điều khiển giáo viên');
const gv = { id: du.giaoVien.id, vai_tro: 'giao_vien', ten: du.giaoVien.ho_ten, ten_dang_nhap: null, lop_id: null, lop: null, ma_lop: null, email: du.giaoVien.email };
const ctxGv = await nguCanh({ 'hoi-sinh-xanh-tai-khoan': gv, 'hoi-sinh-xanh-phien': phien(gv.id, gv.email) });
const p = await trang(ctxGv);
await p.goto(GOC_URL + '/thong-ke.html');
await p.waitForSelector('table.bang tbody tr', { timeout: 20000 });
const hang = await p.$$eval('table.bang tbody tr', (tr) => tr.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent.trim())));
const theoTen = Object.fromEntries(hang.map((r) => [r[1], r]));
const saiLop = du.bots.filter((b) => !theoTen[b.hs.ho_ten] || theoTen[b.hs.ho_ten][2] !== b.hs.ten_dang_nhap || +theoTen[b.hs.ho_ten][4] !== b.suKien.length);
dong(kq(!/l(ớ|o)p\s+l(ớ|o)p/i.test(await p.textContent('#o-tab')), 'Tab Lớp học có "Lớp Lớp"'), 'Tab Lớp học: tên lớp hiện một chữ “Lớp”, không bị lặp');
dong(kq(hang.length === 20 && !saiLop.length, 'Tab Lớp học: ' + saiLop.map((b) => b.hs.ho_ten).join(', ')),
  'Tab Lớp học: đủ ' + hang.length + ' em, đúng tên đăng nhập và số "Kết quả đã gửi" của từng em');
await danNhan(p);
await p.screenshot({ path: path.join(RA, 'gv_tab_lop_hoc.png'), fullPage: true });

await p.click('[data-tab="phan_tich"]');
await p.waitForSelector('#bang-hs table', { timeout: 20000 });
await cho(1200);   // chờ biểu đồ vẽ xong
const o = Object.fromEntries((await oSo(p)).map((x) => [x.ten, x]));
const oDung = [
  ['Học sinh đã chơi', dap.soDaChoi + '/' + dap.soHocSinh, dap.soHoatDong7Ngay + ' em hoạt động'],
  ['Độ chính xác minigame', pt(dap.tbMinigame), 'Cổng Phân Loại ' + pt(dap.tbCong) + ', Lều ném rác ' + pt(dap.tbLeu)],
  ['Tỉ lệ trồng cây trung bình', pt(dap.tbTrongCay), null],
  ['Điểm Flashcard trung bình', pt(dap.tbQuiz), null],
];
for (const [t, v, ghi] of oDung) {
  const x = o[t];
  dong(kq(x && x.gia.trim() === v && (!ghi || x.ghi.includes(ghi)), 'Ô ' + t + ': ' + (x ? x.gia + ' | ' + x.ghi : 'không có')),
    'Ô "' + t + '": ' + (x ? x.gia : '?') + (ghi ? ' (' + ghi + ')' : '') + ' — bot đếm ' + v);
}
// Bảng từng học sinh
const bangHs = await p.$$eval('#bang-hs tbody tr', (tr) => tr.map((r) => [...r.querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim())));
const saiBang = [];
du.bots.forEach((b, i) => {
  const d = dap.hocSinh[i], r = bangHs.find((x) => x[0] === b.hs.ho_ten);
  if (!r) { saiBang.push(b.hs.ho_ten + ' thiếu'); return; }
  if (!r[1].startsWith(pt(d.chinhXacCong)) || !r[1].includes(d.soLuotCong + ' lượt')) saiBang.push(b.hs.ho_ten + ' Cổng: ' + r[1]);
  if (!r[2].startsWith(pt(d.chinhXacLeu))) saiBang.push(b.hs.ho_ten + ' Lều: ' + r[2]);
  if (!r[3].startsWith(pt(d.diemQuiz)) || !r[3].includes(d.soBaiQuiz + ' bài')) saiBang.push(b.hs.ho_ten + ' Flashcard: ' + r[3]);
  const trong = d.soO ? pt(d.tiLeTrongCay) + ' ' + d.soCay + '/' + d.soO + ' ô' : '—';
  if (r[4] !== trong) saiBang.push(b.hs.ho_ten + ' Trồng cây: "' + r[4] + '" ≠ "' + trong + '"');
});
dong(kq(bangHs.length === 20 && !saiBang.length, 'Bảng từng em: ' + saiBang.join('; ')), 'Bảng "Từng học sinh": 20 em × 4 cột (Cổng + số lượt, Lều, Flashcard + số bài, Trồng cây + số ô) khớp');
if (saiBang.length) saiBang.slice(0, 5).forEach((x) => console.log('      ' + x));

// Dữ liệu sau biểu đồ (Chart.js)
const bd = await p.evaluate(() => {
  const a = window.Chart && Chart.getChart('bd-ngay'), m = window.Chart && Chart.getChart('bd-mon');
  return { ngay: a ? { nhan: a.data.labels, mg: a.data.datasets[0].data, qz: a.data.datasets[1].data } : null, mon: m ? { nhan: m.data.labels, so: m.data.datasets[0].data } : null };
});
const ngayDung = bd.ngay && dap.cacNgay.length > 0 && bd.ngay.nhan.length === dap.cacNgay.length && dap.cacNgay.every((w, i) =>
  bd.ngay.nhan[i] === w.ngay.slice(8, 10) + '/' + w.ngay.slice(5, 7) && bd.ngay.mg[i] === (w.minigame === null ? null : Math.round(w.minigame * 100)) && bd.ngay.qz[i] === (w.quiz === null ? null : Math.round(w.quiz * 100)));
dong(kq(ngayDung, 'Biểu đồ ngày: ' + JSON.stringify(bd.ngay)), 'Biểu đồ "Xu hướng theo ngày": ' + (bd.ngay ? bd.ngay.nhan.length : 0) + ' ngày liền nhau, từng điểm minigame/Flashcard khớp');
const monDap = Object.entries(dap.monSai).sort((a, b) => b[1] - a[1]);
const nguong = monDap.length > 8 ? monDap[7][1] : 0;
const monDung = bd.mon && bd.mon.nhan.length === Math.min(8, monDap.length) &&
  bd.mon.nhan.every((t, i) => dap.monSai[t] === bd.mon.so[i] && (i === 0 || bd.mon.so[i - 1] >= bd.mon.so[i]) && bd.mon.so[i] >= nguong);
dong(kq(monDung, 'Biểu đồ món nhầm: ' + JSON.stringify(bd.mon)), 'Biểu đồ "Món rác cả lớp hay nhầm": 8 món nhầm nhiều nhất, đúng số lần, xếp giảm dần');
await p.screenshot({ path: path.join(RA, 'gv_tab_phan_tich.png'), fullPage: true });

// Xuất Excel rồi đọc lại
const [tai] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#xuat-xlsx')]);
const tepXlsx = path.join(RA, 'xuat_tu_web_bao_cao_lop_20_bot.xlsx');
await tai.saveAs(tepXlsx);
const sh = await p.evaluate((b64) => {
  const wb = XLSX.read(b64, { type: 'base64' });
  return Object.fromEntries(wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' })]));
}, fs.readFileSync(tepXlsx).toString('base64'));
const tongHop = Object.fromEntries((sh['Tổng hợp'] || []).filter((r) => r.length >= 2).map((r) => [r[0], r[1]]));
const thTong = [['Số học sinh', dap.soHocSinh], ['Học sinh đã chơi', dap.soDaChoi], ['Hoạt động trong 7 ngày', dap.soHoatDong7Ngay],
  ['Độ chính xác minigame TB (%)', ptSo(dap.tbMinigame)], ['Cổng Phân Loại TB (%)', ptSo(dap.tbCong)], ['Lều ném rác TB (%)', ptSo(dap.tbLeu)],
  ['Tỉ lệ trồng cây TB (%)', ptSo(dap.tbTrongCay)], ['Điểm Flashcard TB (%)', ptSo(dap.tbQuiz)]];
const saiTong = thTong.filter(([k, v]) => tongHop[k] !== v);
dong(kq(!saiTong.length, 'Excel Tổng hợp: ' + JSON.stringify(saiTong.map(([k, v]) => [k, tongHop[k], v]))), 'Excel sheet "Tổng hợp": 8 chỉ số khớp');
const [dau, ...dongHs] = sh['Từng học sinh'] || [[]];
const cot = (r, ten) => r[dau.indexOf(ten)];
const saiXlsx = [];
du.bots.forEach((b, i) => {
  const d = dap.hocSinh[i], r = dongHs.find((x) => cot(x, 'Họ tên') === b.hs.ho_ten);
  if (!r) { saiXlsx.push(b.hs.ho_ten + ' thiếu'); return; }
  const mong = { 'Tên đăng nhập': b.hs.ten_dang_nhap, 'Cổng Phân Loại (%)': ptSo(d.chinhXacCong), 'Số lượt cổng': d.soLuotCong, 'Sao cổng cao nhất': d.saoCong,
    'Lều ném rác (%)': ptSo(d.chinhXacLeu), 'Số lần ném': d.soLanNem, 'Minigame chung (%)': ptSo(d.chinhXacMinigame), 'Flashcard (%)': ptSo(d.diemQuiz),
    'Số bài Flashcard': d.soBaiQuiz, 'Ô đã trồng': d.soCay, 'Tổng số ô': d.soO, 'Tỉ lệ trồng cây (%)': ptSo(d.tiLeTrongCay), 'Cây trưởng thành': d.soCayLon,
    'Thời gian chơi (phút)': Math.round(d.thoiGian / 60) };
  Object.entries(mong).forEach(([k, v]) => { if (cot(r, k) !== v) saiXlsx.push(b.hs.ho_ten + ' ' + k + ': ' + cot(r, k) + ' ≠ ' + v); });
});
dong(kq(dongHs.length === 20 && !saiXlsx.length, 'Excel Từng học sinh: ' + saiXlsx.slice(0, 5).join('; ')), 'Excel sheet "Từng học sinh": 20 em × 14 cột = ' + 20 * 14 + ' ô khớp');
if (saiXlsx.length) saiXlsx.slice(0, 5).forEach((x) => console.log('      ' + x));
const luotChoi = (sh['Lượt chơi'] || []).length - 1;
dong(kq(luotChoi === tongSk, 'Excel Lượt chơi: ' + luotChoi), 'Excel sheet "Lượt chơi": ' + luotChoi + ' dòng = ' + tongSk + ' kết quả bot đã gửi');
const monXlsx = (sh['Món hay nhầm'] || []).slice(1).map((r) => [r[0], r[1]]);
const monXlsxDung = monXlsx.length === monDap.length && monXlsx.every(([t, n], i) => dap.monSai[t] === n && (i === 0 || monXlsx[i - 1][1] >= n));
dong(kq(monXlsxDung, 'Excel Món hay nhầm: ' + JSON.stringify(monXlsx)), 'Excel sheet "Món hay nhầm": đủ ' + monXlsx.length + ' món, đúng số lần, xếp giảm dần');

// Xuất PDF
const [taiPdf] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), p.click('#xuat-pdf')]);
const tepPdf = path.join(RA, 'xuat_tu_web_bao_cao_lop_20_bot.pdf');
await taiPdf.saveAs(tepPdf);
const pdf = fs.readFileSync(tepPdf);
const soTrangPdf = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
dong(kq(pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 20000, 'PDF'), 'Tải PDF: tạo được báo cáo ' + soTrangPdf + ' trang, ' + Math.round(pdf.length / 1024) + ' KB');
await ctxGv.close();

// ---------------- An toàn của bài thử ----------------
// --video <tệp.mp4>: quay video bảng thống kê giáo viên với dữ liệu 20 bot (dải chữ đỏ luôn hiện ở đáy khung hình).
// Quay bằng CDP Page.startScreencast rồi ghép bằng ffmpeg (đặt HSX_FFMPEG=<đường dẫn ffmpeg.exe>, mặc định lấy ffmpeg trong PATH).
const VIDEO = lay('--video');
if (VIDEO) {
  const ctxV = await trinh.newContext({ viewport: { width: 1280, height: 720 }, locale: 'vi-VN' });
  await ctxV.route('**/@supabase/supabase-js@*/**', (r) => r.fulfill({ contentType: 'application/javascript', body: SUPA_GIA }));
  await ctxV.route(/^https?:\/\/[^/]*supabase\.co\//, (r) => { goiMayThat++; return r.abort(); });
  await ctxV.addInitScript((k) => { try { Object.keys(k).forEach((x) => localStorage.setItem(x, JSON.stringify(k[x]))); } catch (e) { /* */ } },
    { 'hoi-sinh-xanh-tai-khoan': gv, 'hoi-sinh-xanh-phien': phien(gv.id, gv.email) });
  const v = await trang(ctxV);
  await v.goto(GOC_URL + '/thong-ke.html');
  await v.waitForSelector('[data-tab="phan_tich"]');
  const KHUNG = path.join(RA, '_video_tam');
  fs.rmSync(KHUNG, { recursive: true, force: true });
  fs.mkdirSync(KHUNG, { recursive: true });
  const cdp = await ctxV.newCDPSession(v), mocKhung = [];
  cdp.on('Page.screencastFrame', (f) => {
    fs.writeFileSync(path.join(KHUNG, 'k' + String(mocKhung.length).padStart(5, '0') + '.jpg'), Buffer.from(f.data, 'base64'));
    mocKhung.push(f.metadata.timestamp);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  await v.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = '<div id="__buoc" style="font:600 17px/1.35 system-ui,sans-serif;padding:7px 16px 3px"></div>' +
      '<div style="font:700 13px/1.35 system-ui,sans-serif;padding:0 16px 7px;opacity:.95">VIDEO KIỂM THỬ TỰ ĐỘNG · 20 học sinh ảo (bot) do AI tạo và chạy · KHÔNG phải học sinh thật · máy chủ giả trong bộ nhớ</div>';
    Object.assign(d.style, { position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(179,38,30,.94)', color: '#fff', textAlign: 'center', pointerEvents: 'none' });
    document.body.appendChild(d);
    const t = document.createElement('div');
    t.id = '__tro';
    t.innerHTML = '<svg width="26" height="31" viewBox="0 0 34 40"><path d="M3 2 L3 31 L11 24 L16.5 37 L22 34.5 L16.5 22 L27 22 Z" fill="#fff" stroke="#11312A" stroke-width="2.6" stroke-linejoin="round"/></svg>';
    Object.assign(t.style, { position: 'fixed', left: '-40px', top: '-40px', zIndex: 100000, pointerEvents: 'none', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))' });
    document.body.appendChild(t);
    addEventListener('mousemove', (e) => { t.style.left = e.clientX - 3 + 'px'; t.style.top = e.clientY - 2 + 'px'; }, true);
  });
  const buoc = (s) => v.evaluate((x) => { document.getElementById('__buoc').textContent = x; }, s);
  const cuon = (y) => v.evaluate((y) => new Promise((ok) => {
    const y0 = scrollY, t0 = performance.now(), ms = 900;
    const f = (t) => { const k = Math.min(1, (t - t0) / ms), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; scrollTo(0, y0 + (y - y0) * e); k < 1 ? requestAnimationFrame(f) : ok(); };
    requestAnimationFrame(f);
  }), y);
  const toaDo = (css) => v.evaluate((c) => { const r = document.querySelector(c).getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, top: r.top + scrollY }; }, css);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1280, maxHeight: 720 });
  await v.mouse.move(900, 500);
  await buoc('Bước 1/5 · Giáo viên mở trang Thống kê: tab Lớp học có 20 học sinh ảo');
  await cho(2200);
  const tab = await toaDo('[data-tab="phan_tich"]');
  await v.mouse.move(tab.x + tab.w / 2, tab.y + tab.h / 2, { steps: 20 });
  await cho(300);
  await v.click('[data-tab="phan_tich"]');
  await v.waitForSelector('#bd-ngay');
  await buoc('Bước 2/5 · Tab Phân tích dữ liệu: 4 ô số của cả lớp');
  await cho(2400);
  const bdN = await toaDo('#bd-ngay');
  await cuon(bdN.top - 150);
  await buoc('Bước 3/5 · Biểu đồ MỚI: xu hướng theo NGÀY (% đúng), rê chuột xem từng ngày');
  await cho(500);
  const n = await toaDo('#bd-ngay');
  for (const k of [0.08, 0.3, 0.52, 0.74, 0.95]) {
    await v.mouse.move(n.x + n.w * k, n.y + n.h * 0.45, { steps: 18 });
    await cho(850);
  }
  const m = await toaDo('#bd-mon');
  await buoc('Bước 4/5 · Món rác cả lớp hay nhầm, xếp từ nhiều tới ít');
  await v.mouse.move(m.x + m.w * 0.45, m.y + m.h * 0.22, { steps: 22 });
  await cho(1800);
  const bang = await toaDo('#bang-hs');
  await buoc('Bước 5/5 · Bảng từng học sinh và nút xuất Excel / PDF');
  await cuon(bang.top - 120);
  await cho(1600);
  const xuat = await toaDo('#xuat-xlsx');
  await cuon(xuat.top - 200);
  const x2 = await toaDo('#xuat-xlsx');
  await v.mouse.move(x2.x + x2.w / 2, x2.y + x2.h / 2, { steps: 20 });
  await cho(900);
  const p2 = await toaDo('#xuat-pdf');
  await v.mouse.move(p2.x + p2.w / 2, p2.y + p2.h / 2, { steps: 12 });
  await cho(1500);
  await cdp.send('Page.stopScreencast');
  await cho(300);
  await ctxV.close();
  // ghép theo mốc thời gian thật của từng khung, ra 30 khung/giây đều
  const ten = (i) => path.join(KHUNG, 'k' + String(i).padStart(5, '0') + '.jpg').split(path.sep).join('/');
  const ds = mocKhung.map((t, i) => "file '" + ten(i) + "'\nduration " + Math.max(0.001, (mocKhung[i + 1] ?? t + 0.5) - t).toFixed(4));
  ds.push("file '" + ten(mocKhung.length - 1) + "'");
  fs.writeFileSync(path.join(KHUNG, 'ds.txt'), ds.join('\n'));
  fs.mkdirSync(path.dirname(path.resolve(VIDEO)), { recursive: true });
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.env.HSX_FFMPEG || 'ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(KHUNG, 'ds.txt'),
    '-vf', 'scale=1280:720:flags=lanczos,fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', path.resolve(VIDEO)], { encoding: 'utf8' });
  fs.rmSync(KHUNG, { recursive: true, force: true });
  console.log(r.status === 0 ? '  Video: ' + path.resolve(VIDEO) + ' (' + mocKhung.length + ' khung, ' + (mocKhung[mocKhung.length - 1] - mocKhung[0]).toFixed(1) + ' giây)' : '  Không ghép được video: ' + (r.error ? r.error.message : r.stderr.slice(-300)));
}

console.log('\n4) Phạm vi của bài thử');
dong(kq(goiMayThat === 0, 'Có ' + goiMayThat + ' yêu cầu tới supabase.co'), 'Không có yêu cầu nào tới máy chủ Supabase thật (' + goiMayThat + ')');
dong(kq(loiTrang.length === 0, 'Lỗi JavaScript trên trang: ' + loiTrang.join(' | ')), 'Không có lỗi JavaScript trên trang (' + loiTrang.length + ')');

await trinh.close();
mayChu.close();

const ketQua = {
  ghi_chu: 'KIỂM THỬ BẰNG 20 HỌC SINH ẢO (bot) do AI (Claude) viết kịch bản và chạy. KHÔNG phải học sinh thật. Trang web là mã thật; máy chủ Supabase được thay bằng cơ sở dữ liệu giả trong bộ nhớ.',
  luc_chay: new Date(bayGio).toISOString(), hat_giong: seed, trinh_duyet: 'Microsoft Edge ' + BAN_EDGE + (HIEN ? '' : ' (headless)'),
  so_khop: dat, sai_lech: khong, loi, yeu_cau_may_chu_gia: demYeuCau, yeu_cau_supabase_that: goiMayThat,
  lop: { so_hoc_sinh: dap.soHocSinh, da_choi: dap.soDaChoi, hoat_dong_7_ngay: dap.soHoatDong7Ngay, tb_minigame: dap.tbMinigame, tb_cong: dap.tbCong, tb_leu: dap.tbLeu, tb_flashcard: dap.tbQuiz, tb_trong_cay: dap.tbTrongCay, so_ket_qua: tongSk },
  hoc_sinh: du.bots.map((b, i) => ({ ho_ten: b.hs.ho_ten, ten_dang_nhap: b.hs.ten_dang_nhap, nang_luc_mo_phong: b.hs.nang_luc, so_ket_qua: b.suKien.length, ...dap.hocSinh[i], monSai: undefined, quizTheoChuDe: undefined })),
  mon_hay_nham: monDap,
};
fs.writeFileSync(path.join(RA, 'ket_qua_web.json'), JSON.stringify(ketQua, null, 1));
console.log('\nTổng: ' + dat + ' kiểm tra đạt, ' + khong + ' không đạt.');
if (loi.length) loi.slice(0, 20).forEach((x) => console.log('  - ' + x));
console.log(khong ? 'CÓ LỖI.' : 'Trang web hiển thị và xuất file đúng với dữ liệu của 20 bot. Không có lỗi.');
console.log('Ảnh và file xuất: ' + RA);
process.exit(khong ? 1 : 0);
