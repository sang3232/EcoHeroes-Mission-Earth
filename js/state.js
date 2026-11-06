/* Trạng thái game (save v2), lưu/nạp và các hàm tiện ích */
window.HSX = window.HSX || {};

HSX.SAVE_KEY = 'hoi-sinh-xanh-v2';
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
    'trees', 'species', 'seen', 'journals', 'facts', 'visited', 'tut', 'quai', 'story', 'mo',
    'xong', 'benches'].forEach(k => { s[k] = laObj(s[k]) || {}; });
  s.flags.congRung = !!s.flags.congRung;
  s.flags.m2Best = laSo(s.flags.m2Best, 0, 0);
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

HSX.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(HSX.S))));
HSX.importSave = function (str) {
  const o = JSON.parse(decodeURIComponent(escape(atob(String(str || '').trim()))));
  if (!laObj(o)) throw new Error('Mã save không phải object');
  return HSX.migrate(o);
};

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
