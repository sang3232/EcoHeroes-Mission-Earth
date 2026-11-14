/* Trạng thái game (save v2), lưu/nạp và các hàm tiện ích */
window.HSX = window.HSX || {};

// Mỗi tài khoản một save riêng (xem js/kho_tai_khoan.js): '<khoá gốc>@<id tài khoản>'.
// Chơi khách dùng khoá gốc, nên tiến trình cũ trên máy không tự chuyển sang tài khoản nào.
HSX.SAVE_KEY_GOC = 'hoi-sinh-xanh-v2';
HSX.taiKhoan = (typeof window !== 'undefined' && window.HSXKho) ? window.HSXKho.tk() : null;
HSX.SAVE_KEY = HSX.taiKhoan ? HSX.SAVE_KEY_GOC + '@' + HSX.taiKhoan.id : HSX.SAVE_KEY_GOC;
HSX.OLD_SAVE_KEY = 'hoi-sinh-xanh-v1';

HSX.newState = function () {
  const D = HSX.DATA, L = HSX.LEVELS.m1;
  const known = {};
  D.recipes.forEach(r => { if (!r.hidden) known[r.id] = true; });
  return {
    v: 2,
    level: 'm1',
    bench: { room: L.start, x: null, y: null },   // x/y null: dùng ô '@' của phòng
    hp: 5, shards: 0, energy: 0,
    seeds: 0, inv: {},
    owned: { vot: { tier: 0 } },
    charms: [null, null, null],
    known, hints: {},
    spirits: {},                 // tinh linh đã giải cứu
    heaps: {}, dead: {}, picked: {}, broken: {},   // theo phòng: chỉ số vật đã phá / quái đã hạ / đồ đã nhặt / ô X đã vỡ
    bosses: {}, flags: { congRung: false, m2Best: 0 },
    quests: {},                   // { id: { state: 'moi' | 'dang' | 'xong', buoc } }
    puzzle: { solved: false, best: 0 },
    trees: {},                   // theo phòng: { chỉ số ô: { type, g } }
    species: {}, seen: {}, journals: {}, facts: {}, visited: {},
    dawn: false,
    stats: { time: 0, deaths: 0, kills: 0 },
    tut: {},                     // bước hướng dẫn đã xong
    quai: {},                    // Sổ quái vật: { loại: { seen, kills } }
    story: {},                   // cảnh truyện đã xem
    mo: { m1: true },            // màn đã mở trên bản đồ thế giới
    xong: {},                    // màn đã hạ boss cuối (Màn 1 còn ghi ở dawn)
    benches: {},                 // Trạm nghỉ gần nhất của từng màn, để đi lại giữa các màn
  };
};

// Phòng thuộc màn nào: id phòng không trùng giữa các màn, nên tìm được màn từ id phòng
HSX.roomLevel = id => Object.keys(HSX.LEVELS).find(lv => HSX.LEVELS[lv].rooms[id]) || 'm1';
HSX.roomDef = id => HSX.LEVELS[HSX.roomLevel(id)].rooms[id];

// Cài đặt theo máy, không theo save: camera theo chuột (0 = tắt), bật/tắt hướng dẫn,
// bộ phím ('chuot' bàn phím + chuột, 'phim' chỉ bàn phím, 'rieng' Tùy chỉnh với phím ở phimRieng, xem js/engine.js;
// boPhimChon: người chơi đã chọn, không tự đoán nữa), taiTran: tự tải file nhật ký sau mỗi trận boss
HSX.OPT_KEY = 'hoi-sinh-xanh-cai-dat';
HSX.opt = { camChuot: 0.3, huongDan: true, boPhim: 'chuot', boPhimChon: false, phimRieng: null, taiTran: false };
try { Object.assign(HSX.opt, JSON.parse(localStorage.getItem(HSX.OPT_KEY) || '{}')); } catch (e) { /* bỏ qua */ }
HSX.saveOpt = function () {
  try { localStorage.setItem(HSX.OPT_KEY, JSON.stringify(HSX.opt)); } catch (e) { /* bỏ qua */ }
};

// Sự kiện trong game (nhảy, chém, hạ quái...) cho hướng dẫn và Sổ quái vật nghe, không phải sửa chỗ phát.
// Một chỗ nghe lỗi thì bỏ qua chỗ đó, không làm hỏng cả bước cập nhật / cả màn hình.
HSX.ev = {};
HSX.on = (name, fn) => { (HSX.ev[name] = HSX.ev[name] || []).push(fn); };
HSX.emit = (name, data) => (HSX.ev[name] || []).forEach(fn => {
  try { fn(data); } catch (e) { console.error('HSX.emit(' + name + ')', e); }
});

// ---------- Đọc save ----------
// Save có thể hỏng (ghi dở khi tắt máy, sửa tay, bản cũ thiếu trường): đưa từng trường về đúng kiểu
// thay vì để game vỡ ở giữa chừng. Giá trị lạ thì dùng mặc định.
const laObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);
const laSo = (v, def, min, max) => {
  v = Number(v);
  if (!isFinite(v)) v = def;
  if (min !== undefined && v < min) v = min;
  if (max !== undefined && v > max) v = max;
  return v;
};

HSX.migrate = function (s) {
  const base = HSX.newState(), D = HSX.DATA;
  if (!laObj(s)) return base;   // không phải object: coi như chưa có save
  for (const k in base) if (s[k] === undefined) s[k] = base[k];
  s.v = 2;

  // Phòng đang đứng: phải có thật. Không thì về phòng đầu của màn đang chơi.
  if (!HSX.LEVELS[s.level]) s.level = 'm1';
  s.bench = laObj(s.bench) || {};
  const lvTheoPhong = Object.keys(HSX.LEVELS).find(lv => HSX.LEVELS[lv].rooms[s.bench.room]);
  if (lvTheoPhong) s.level = lvTheoPhong;
  const L = HSX.LEVELS[s.level];
  if (!L.rooms[s.bench.room]) s.bench = { room: L.start, x: null, y: null };
  s.bench.x = isFinite(s.bench.x) && s.bench.x !== null ? Number(s.bench.x) : null;
  s.bench.y = isFinite(s.bench.y) && s.bench.y !== null ? Number(s.bench.y) : null;

  // Số liệu: máu luôn còn ít nhất 1 để không chết ngay khi vừa nạp save.
  s.hp = Math.round(laSo(s.hp, 5, 1, 99));
  s.shards = Math.round(laSo(s.shards, 0, 0));
  s.energy = laSo(s.energy, 0, 0);
  s.seeds = laSo(s.seeds, 0, 0);
  s.dawn = !!s.dawn;
  s.stats = laObj(s.stats) || {};
  s.stats.time = laSo(s.stats.time, 0, 0);
  s.stats.deaths = Math.round(laSo(s.stats.deaths, 0, 0));
  s.stats.kills = Math.round(laSo(s.stats.kills, 0, 0));
  s.puzzle = laObj(s.puzzle) || {};
  s.puzzle.solved = !!s.puzzle.solved;
  s.puzzle.best = laSo(s.puzzle.best, 0, 0);

  // Các bảng tra theo id phòng / id vật phẩm
  ['inv', 'known', 'hints', 'spirits', 'heaps', 'dead', 'picked', 'broken', 'bosses', 'flags',
    'quests', 'trees', 'species', 'seen', 'journals', 'facts', 'visited', 'tut', 'quai', 'story', 'mo',
    'xong', 'benches'].forEach(k => { s[k] = laObj(s[k]) || {}; });
  s.flags.congRung = !!s.flags.congRung;
  s.flags.m2Best = laSo(s.flags.m2Best, 0, 0);
  // Nhiệm vụ: trạng thái phải hợp lệ, bước phải là số không âm
  for (const id in s.quests) {
    const q = laObj(s.quests[id]);
    if (!q || (q.state !== 'moi' && q.state !== 'dang' && q.state !== 'xong')) { delete s.quests[id]; continue; }
    q.buoc = Math.round(laSo(q.buoc, 0, 0));
    s.quests[id] = q;
  }
  // Giá trị của từng phòng phải là object (không thì ô / quái đã dọn bị hiểu sai)
  ['heaps', 'dead', 'picked', 'broken', 'trees'].forEach(k => {
    for (const id in s[k]) if (!laObj(s[k][id])) delete s[k][id];
  });
  // Trạm đã nghỉ của từng màn: phải trỏ tới phòng có thật
  for (const lv in s.benches) {
    const b = laObj(s.benches[lv]);
    if (!b || !HSX.LEVELS[lv] || !HSX.LEVELS[lv].rooms[b.room]) { delete s.benches[lv]; continue; }
    b.x = isFinite(b.x) && b.x !== null ? Number(b.x) : null;
    b.y = isFinite(b.y) && b.y !== null ? Number(b.y) : null;
    s.benches[lv] = b;
  }

  // Vợt và bùa: bậc vợt phải có trong bảng, bùa phải là vật phẩm có thật
  s.owned = laObj(s.owned) || {};
  s.owned.vot = laObj(s.owned.vot) || {};
  s.owned.vot.tier = Math.round(laSo(s.owned.vot.tier, 0, 0, D.tiers.length - 1));
  s.charms = (Array.isArray(s.charms) ? s.charms : []).slice(0, 3);
  while (s.charms.length < 3) s.charms.push(null);
  s.charms = s.charms.map(id => (typeof id === 'string' && D.items[id] ? id : null));

  // save trước khi có nhiều màn: đã hạ Vua Túi Nilon thì Màn 2 mở sẵn
  if (s.dawn) { s.mo.m2 = true; s.xong.m1 = true; }
  s.mo.m1 = true;
  if (!s.benches[s.level] && s.bench.room) s.benches[s.level] = s.bench;
  // công thức mới thêm sau (không phải công thức bí ẩn) thì biết sẵn
  D.recipes.forEach(r => { if (!r.hidden) s.known[r.id] = true; });
  return s;
};

HSX.loadSave = function () {
  let raw = null;
  try { raw = localStorage.getItem(HSX.SAVE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  try { return HSX.migrate(JSON.parse(raw)); }
  catch (e) {
    // Giữ bản hỏng lại để người chơi nhờ cứu được; lần tự lưu sau sẽ không ghi đè mất
    try { localStorage.setItem(HSX.SAVE_KEY + '-hong', raw); } catch (e2) { /* hết chỗ */ }
    console.warn('Save hỏng, đã sao lưu sang ' + HSX.SAVE_KEY + '-hong', e);
    return null;
  }
};

// Bản idle cũ đổi lối chơi hoàn toàn nên không chuyển save được, chỉ báo một lần
HSX.hadOldSave = function () {
  try { return !!localStorage.getItem(HSX.OLD_SAVE_KEY); } catch (e) { return false; }
};
HSX.dropOldSave = function () {
  try { localStorage.removeItem(HSX.OLD_SAVE_KEY); } catch (e) { /* bỏ qua */ }
};

// Trả về false khi trình duyệt chặn bộ nhớ / hết chỗ. Chỉ báo cho người chơi lần đầu để không spam
// (game tự lưu rất nhiều lần), nhưng vẫn trả false cho chỗ gọi tự xử lý.
HSX.saveGame = function () {
  try {
    localStorage.setItem(HSX.SAVE_KEY, JSON.stringify(HSX.S));
    HSX.saveWarning = false;
    return true;
  } catch (e) {
    if (!HSX.saveWarning) {
      HSX.saveWarning = true;
      if (HSX.UI && HSX.UI.toast) HSX.UI.toast('⚠️ Không lưu được tiến trình: trình duyệt đang chặn bộ nhớ hoặc đã hết chỗ.', 'fact', 7000);
    }
    return false;
  }
};

// ---------- Mã save gắn với tài khoản ----------
// Mã do tài khoản nào xuất thì chỉ nhập lại được vào đúng tài khoản đó (để chuyển sang máy khác);
// mã xuất khi chơi khách chỉ nhập được khi chơi khách. Nội dung được trộn bằng khoá suy ra từ id tài khoản
// và có mã kiểm tra, nên tài khoản khác không mở được, sửa tay sẽ hỏng. Đây là cách chống chia save trong lớp,
// không phải mã hoá an ninh cao: người đọc được mã nguồn và biết id tài khoản vẫn có thể giải.
// Dạng mã: HSX2.<chủ>.<nội dung đã trộn, base64url>.<mã kiểm tra>
(function () {
  const MUOI = 'HoiSinhXanh/ma-save/2';
  // băm cyrb53 (53 bit) ra chuỗi hex
  function bam(s, hat) {
    let h1 = 0xdeadbeef ^ hat, h2 = 0x41c6ce57 ^ hat;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
  }
  // dòng byte giả ngẫu nhiên (mulberry32) theo tài khoản
  function tron(byte, id) {
    let a = parseInt(bam(MUOI + '|khoa|' + id, 7).slice(-8), 16) | 0;
    const ra = new Uint8Array(byte.length);
    for (let i = 0; i < byte.length; i++) {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      ra[i] = byte[i] ^ (((t ^ (t >>> 14)) >>> 0) & 255);
    }
    return ra;
  }
  function sangB64(byte) {
    let s = '';
    for (let i = 0; i < byte.length; i += 0x8000) s += String.fromCharCode.apply(null, byte.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function tuB64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const b = atob(s), ra = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) ra[i] = b.charCodeAt(i);
    return ra;
  }
  function idChu() { return HSX.taiKhoan ? HSX.taiKhoan.id : 'khach'; }
  function nhanChu(id) { return id === 'khach' ? 'khach' : bam(MUOI + '|chu|' + id, 3).slice(-8); }
  function kiem(id, json) { return bam(MUOI + '|' + id + '|' + json, 11).slice(-12); }
  function loi(chu) { const e = new Error(chu); e.choNguoiChoi = true; return e; }

  HSX.exportSave = function () {
    const id = idChu(), json = JSON.stringify(HSX.S);
    return 'HSX2.' + nhanChu(id) + '.' + sangB64(tron(new TextEncoder().encode(json), id)) + '.' + kiem(id, json);
  };
  HSX.importSave = function (str) {
    str = String(str || '').replace(/\s+/g, '');
    const id = idChu();
    let o;
    if (str.indexOf('HSX2.') === 0) {
      const p = str.split('.');
      if (p.length !== 4) throw loi('Mã save bị thiếu hoặc thừa ký tự. Hãy sao chép lại toàn bộ mã.');
      if (p[1] !== nhanChu(id)) {
        throw loi(p[1] === 'khach'
          ? 'Đây là mã xuất khi chơi khách, không nhập được vào tài khoản. Mỗi tài khoản có tiến trình riêng.'
          : HSX.taiKhoan ? 'Mã save này của tài khoản khác. Mỗi tài khoản chỉ nhập được mã do chính mình xuất.'
            : 'Mã save này của một tài khoản lớp học. Hãy đăng nhập đúng tài khoản đó rồi nhập lại.');
      }
      let json;
      try { json = new TextDecoder().decode(tron(tuB64(p[2]), id)); } catch (e) { throw loi('Mã save bị hỏng.'); }
      if (kiem(id, json) !== p[3]) throw loi('Mã save bị hỏng hoặc đã bị sửa.');
      o = JSON.parse(json);
    } else {
      // Mã kiểu cũ (chưa gắn tài khoản): chỉ nhận khi chơi khách
      if (HSX.taiKhoan) throw loi('Mã save kiểu cũ không gắn với tài khoản nên chỉ nhập được khi chơi khách.');
      o = JSON.parse(decodeURIComponent(escape(atob(str))));
    }
    if (!laObj(o)) throw loi('Mã save không hợp lệ.');
    return HSX.migrate(o);
  };
})();

HSX.fmt = function (n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
};
HSX.pct = v => Math.round(v * 100) + '%';
HSX.fmtTime = function (sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h} giờ ${m} phút`;
  if (m) return s ? `${m} phút ${s} giây` : `${m} phút`;
  return `${s} giây`;
};
HSX.roll = c => Math.floor(c) + (Math.random() < c % 1 ? 1 : 0);
HSX.pick = arr => arr[Math.floor(Math.random() * arr.length)];
HSX.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
HSX.shuffle = function (arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};
HSX.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
