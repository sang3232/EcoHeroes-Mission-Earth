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
    bosses: {}, flags: {},
    puzzle: { solved: false, best: 0 },
    trees: {},                   // theo phòng: { chỉ số ô: { type, g } }
    species: {}, seen: {}, journals: {}, facts: {}, visited: {},
    dawn: false,
    stats: { time: 0, deaths: 0, kills: 0 },
  };
};

HSX.migrate = function (s) {
  const base = HSX.newState();
  for (const k in base) if (s[k] === undefined) s[k] = base[k];
  return s;
};

HSX.loadSave = function () {
  let raw = null;
  try { raw = localStorage.getItem(HSX.SAVE_KEY); } catch (e) { return null; }
  if (!raw) return null;
  try { return HSX.migrate(JSON.parse(raw)); } catch (e) { return null; }
};

// Bản idle cũ đổi lối chơi hoàn toàn nên không chuyển save được, chỉ báo một lần
HSX.hadOldSave = function () {
  try { return !!localStorage.getItem(HSX.OLD_SAVE_KEY); } catch (e) { return false; }
};
HSX.dropOldSave = function () {
  try { localStorage.removeItem(HSX.OLD_SAVE_KEY); } catch (e) { /* bỏ qua */ }
};

HSX.saveGame = function () {
  try { localStorage.setItem(HSX.SAVE_KEY, JSON.stringify(HSX.S)); return true; } catch (e) { return false; }
};

HSX.exportSave = () => btoa(unescape(encodeURIComponent(JSON.stringify(HSX.S))));
HSX.importSave = str => HSX.migrate(JSON.parse(decodeURIComponent(escape(atob(str.trim())))));

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
