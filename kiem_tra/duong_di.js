/* Kiểm tra Màn 1 đi được hết: duyệt các ô đứng được theo khả năng nhảy của Mầm,
   lần lượt thêm tinh linh / công cụ theo đúng thứ tự trong game, báo phòng và vật nào chưa tới được.
   Chạy: node kiem_tra/duong_di.js */
global.window = global;
global.HSX = {};
require('../js/levels/m1.js');
const L = HSX.LEVELS.m1, R = L.rooms;

// Khả năng nhảy (đo trong game): cao tối đa ~2,65 ô, xa ~4,4 ô cùng độ cao; lướt thêm ~3 ô
const JUMP_UP = 2, LEAP = 4, DASH = 3, BOOST_UP = 4;
const isDoor = c => c >= '1' && c <= '9';

function make(id, ab) {
  const m = R[id].map, h = m.length, w = m[0].length;
  const raw = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) {
      const e = m[Math.min(h - 1, Math.max(0, y))][Math.min(w - 1, Math.max(0, x))];
      return isDoor(e) ? e : '#';
    }
    return m[y][x];
  };
  const solid = (x, y) => {
    const c = raw(x, y);
    if (c === '#') return true;
    if (c === 'X') return !ab.slam;
    if (c === '?') return !ab.lens;
    if (c === 'G') return !ab.puzzle;
    if (c === 'D') return !ab.sorted;
    return false;
  };
  const hazard = (x, y) => { const c = raw(x, y); return c === '^' || (c === '~' && !ab.boat); };
  const surface = (x, y) => solid(x, y) || raw(x, y) === '=' || (raw(x, y) === '~' && ab.boat);
  const free = (x, y) => !solid(x, y) && !hazard(x, y);
  const stand = (x, y) => x >= 0 && x < w && y >= 0 && y < h && free(x, y) && surface(x, y + 1);
  return { id, m, w, h, raw, solid, hazard, surface, free, stand };
}

// Rơi thẳng từ (x, y): trả về ô đứng được, hoặc {door} nếu rơi ra cửa đáy, hoặc null nếu rơi vào gai/nước độc
function fall(r, x, y) {
  for (let yy = y; yy < r.h + 2; yy++) {
    if (yy >= r.h) { const d = r.raw(x, r.h - 1); return isDoor(d) ? { door: d } : null; }
    if (r.hazard(x, yy)) return null;
    if (r.solid(x, yy)) return null;
    if (r.stand(x, yy)) return { x, y: yy };
  }
  return null;
}

// Đường bay đơn giản: bật lên ở cột xuất phát, bay ngang ở đỉnh, đáp xuống cột đích
function arcClear(r, x0, y0, x1, y1) {
  const top = Math.max(0, Math.min(y0, y1)), s = Math.sign(x1 - x0) || 1;
  const open = (x, y) => r.free(x, y) || r.raw(x, y) === '=';
  for (let y = top; y < y0; y++) if (!open(x0, y)) return false;
  if (x1 !== x0) for (let x = x0 + s; x !== x1; x += s) for (let y = top; y <= Math.min(y0, y1); y++) if (!open(x, y)) return false;
  for (let y = top; y <= y1; y++) if (!open(x1, y)) return false;
  return true;
}

// Duyệt một phòng từ các ô xuất phát; trả về ô tới được và các cửa thoát ra được
function explore(r, starts, ab) {
  const seen = new Set(), exits = new Set(), q = [];
  const key = (x, y) => x + ',' + y;
  const add = p => { if (!p) return; if (p.door) { exits.add(p.door); return; } const k = key(p.x, p.y); if (!seen.has(k)) { seen.add(k); q.push(p); } };
  starts.forEach(add);
  const reach = LEAP + (ab.dash ? DASH : 0);
  while (q.length) {
    const { x, y } = q.shift();
    // cửa hai bên
    if ((x === 0 || x === r.w - 1) && isDoor(r.raw(x, y))) exits.add(r.raw(x, y));
    // cửa trên: đứng cách tối đa 2 ô bên dưới thì nhảy lên được
    for (let dx = -2; dx <= 2; dx++) for (let dy = 1; dy <= JUMP_UP + 1; dy++) {
      if (y - dy === 0 && isDoor(r.raw(x + dx, 0)) && arcClear(r, x, y, x + dx, 1)) exits.add(r.raw(x + dx, 0));
    }
    // đi ngang / rơi
    for (const s of [-1, 1]) {
      if (r.free(x + s, y)) add(r.stand(x + s, y) ? { x: x + s, y } : fall(r, x + s, y));
    }
    // xuống khỏi bục gỗ
    if (r.raw(x, y + 1) === '=' || (r.raw(x, y + 1) === '~' && ab.boat)) add(fall(r, x, y + 2 > r.h ? y + 1 : y + 2));
    // nhảy tới ô đứng được
    for (let dy = -JUMP_UP; dy <= 6; dy++) for (let dx = -(reach + Math.max(0, dy)); dx <= reach + Math.max(0, dy); dx++) {
      if (!dx && !dy) continue;
      const tx = x + dx, ty = y + dy;
      if (!r.stand(tx, ty)) continue;
      const limit = dy < 0 ? (dy === -JUMP_UP ? 2 : 3) + (ab.dash ? DASH : 0) : reach + Math.max(0, dy);
      if (Math.abs(dx) > limit) continue;
      if (arcClear(r, x, y, tx, ty)) add({ x: tx, y: ty });
    }
  }
  return { seen, exits };
}

// Ô xuất phát khi vào phòng qua cửa d
function entries(r, d) {
  const cells = [];
  r.m.forEach((row, y) => [...row].forEach((c, x) => { if (c === String(d)) cells.push([x, y]); }));
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (x0 === 0 || x1 === r.w - 1) return [{ x: x0 === 0 ? 0 : r.w - 1, y: y1 }].filter(p => r.stand(p.x, p.y)).concat([fall(r, x0 === 0 ? 1 : r.w - 2, y1)].filter(Boolean));
  if (y0 === 0) return [fall(r, x0, 0)].filter(p => p && !p.door);
  // vào từ đáy: bật lên tối đa 4 ô, trôi sang mép tối đa 3 ô
  const out = [];
  for (let x = x0 - 3; x <= x1 + 3; x++) for (let y = r.h - 2; y >= r.h - 2 - BOOST_UP; y--) if (r.stand(x, y)) out.push({ x, y });
  return out;
}

function run(ab) {
  const roomsSeen = {}, q = [];
  const visit = (id, starts) => {
    const r = make(id, ab), st = roomsSeen[id] = roomsSeen[id] || { r, cells: new Set() };
    const res = explore(r, starts, ab);
    let grew = false;
    res.seen.forEach(k => { if (!st.cells.has(k)) { st.cells.add(k); grew = true; } });
    if (grew || !st.done) { st.done = true; res.exits.forEach(d => q.push([id, d])); }
  };
  const start = make(L.start, ab);
  const at = [];
  start.m.forEach((row, y) => [...row].forEach((c, x) => { if (c === '@') at.push({ x, y }); }));
  visit(L.start, at);
  const used = new Set();
  while (q.length) {
    const [id, d] = q.shift();
    if (used.has(id + d)) continue;
    used.add(id + d);
    const [to, td] = R[id].doors[d];
    visit(to, entries(make(to, ab), td));
  }
  return roomsSeen;
}

// Vật thể có lấy / dùng được không: có ô đứng được gần đó (cùng ô hoặc trong tầm chém / nhảy)
function objectsReached(seen) {
  const out = {};
  for (const id in seen) {
    const { r, cells } = seen[id];
    r.m.forEach((row, y) => [...row].forEach((c, x) => {
      if (!'TPHJSBGRikcsKV'.includes(c)) return;
      let ok = false;
      for (const k of cells) {
        const [cx, cy] = k.split(',').map(Number);
        const dx = Math.abs(cx - x), dy = y - cy;
        if (c === 'H' ? (dx <= 1 && dy >= -3 && dy <= 0) : (dx <= 2 && dy >= -2 && dy <= 1)) { ok = true; break; }
      }
      (out[id] = out[id] || []).push({ c, x, y, ok });
    }));
  }
  return out;
}

const stages = [
  ['Bắt đầu (chưa có gì)', {}],
  ['+ Gió (lướt)', { dash: true }],
  ['+ Lều đã phân loại', { dash: true, sorted: true }],
  ['+ Kính Lúp', { dash: true, sorted: true, lens: true }],
  ['+ Xuồng Phao', { dash: true, sorted: true, lens: true, boat: true }],
  ['+ Gấu (đập nền nứt)', { dash: true, sorted: true, lens: true, boat: true, slam: true }],
  ['+ Giải Cổng Phân Loại', { dash: true, sorted: true, lens: true, boat: true, slam: true, puzzle: true }],
];
let prev = new Set();
let final = null;
stages.forEach(([name, ab]) => {
  const seen = run(ab), rooms = Object.keys(seen);
  const fresh = rooms.filter(r => !prev.has(r));
  console.log(`${name.padEnd(26)} ${rooms.length}/13 phòng${fresh.length ? '  mới: ' + fresh.map(r => R[r].name).join(', ') : ''}`);
  prev = new Set(rooms);
  final = seen;
});
const missing = Object.keys(R).filter(id => !final[id]);
console.log(missing.length ? 'CHƯA TỚI ĐƯỢC: ' + missing.join(', ') : 'Tới được cả 13 phòng.');
const objs = objectsReached(final), bad = [];
for (const id in objs) objs[id].forEach(o => { if (!o.ok) bad.push(`${id} '${o.c}' ô (${o.x},${o.y})`); });
console.log(bad.length ? 'VẬT CHƯA TỚI ĐƯỢC:\n  ' + bad.join('\n  ') : 'Mọi đống rác, ô cây, Mảnh Lá, nhật ký, lồng, Trạm, cổng, quái đều tới được.');
// Kiểm tra quay về: từ mỗi phòng có đường về Trạm Tái Chế đầu tiên không (không bị kẹt)
const ab = stages[stages.length - 1][1];
const stuck = [];
for (const id in R) {
  const seenBack = (function () {
    const rooms = {}, q = [[id, null]];
    const used = new Set();
    while (q.length) {
      const [rid, d] = q.shift();
      if (used.has(rid + d)) continue;
      used.add(rid + d);
      const r = make(rid, ab);
      let starts;
      if (d === null) { starts = []; r.m.forEach((row, y) => [...row].forEach((c, x) => { if (r.stand(x, y)) starts.push({ x, y }); })); starts = starts.slice(0, 1); }
      else starts = entries(r, d);
      const res = explore(r, starts, ab);
      rooms[rid] = true;
      res.exits.forEach(e => { const [to, td] = R[rid].doors[e]; q.push([to, td]); });
    }
    return rooms;
  })();
  if (!seenBack[L.start]) stuck.push(id);
}
console.log(stuck.length ? 'KẸT, không về được Bến thuyền từ: ' + stuck.join(', ') : 'Từ phòng nào cũng về được Bến thuyền.');
