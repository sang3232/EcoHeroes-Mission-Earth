/* Kiểm tra các màn đi được hết: duyệt các ô đứng được theo khả năng nhảy của Mầm,
   lần lượt thêm tinh linh / công cụ / việc mở đường theo đúng thứ tự trong game, báo phòng và vật nào chưa tới được.
   Kiểm thêm: bản đồ mỗi phòng đủ hàng đủ cột, cửa hai phòng nối khớp nhau.
   Chạy: node kiem_tra/duong_di.js        (mọi màn)
         node kiem_tra/duong_di.js m2     (một màn) */
global.window = global;
global.HSX = {};
require('../js/levels/m1.js');
require('../js/levels/m2.js');

// Khả năng nhảy (đo trong game): cao tối đa ~2,65 ô, xa ~4,4 ô cùng độ cao; lướt thêm ~3 ô
const JUMP_UP = 2, LEAP = 4, DASH = 3, BOOST_UP = 4;
const isDoor = c => c >= '1' && c <= '9';

// Thứ tự mở đường của từng màn. Màn 2 bắt đầu khi đã có đủ 4 tinh linh của Màn 1 (lướt, đập xuống).
const MAN = {
  m1: [
    ['Bắt đầu (chưa có gì)', {}],
    ['+ Gió (lướt)', { dash: true }],
    ['+ Lều đã phân loại', { dash: true, sorted: true }],
    ['+ Kính Lúp', { dash: true, sorted: true, lens: true }],
    ['+ Xuồng Phao', { dash: true, sorted: true, lens: true, boat: true }],
    ['+ Gấu (đập nền nứt)', { dash: true, sorted: true, lens: true, boat: true, slam: true }],
    ['+ Giải Cổng Phân Loại', { dash: true, sorted: true, lens: true, boat: true, slam: true, puzzle: true }],
  ],
  m2: [
    ['Bắt đầu Màn 2 (lướt, đập)', { dash: true, slam: true }],
    ['+ Mẹ Đước dạy trồng đước', { dash: true, slam: true, roots: true }],
    ['+ Phá cống, nước lạch rút', { dash: true, slam: true, roots: true, drained: true }],
    ['+ Giải Cổng Rừng', { dash: true, slam: true, roots: true, drained: true, puzzle: true }],
  ],
};

let loi = 0;
const bao = s => { console.log(s); loi++; };

function make(R, id, ab) {
  const m = R[id].map, h = m.length, w = m[0].length;
  const raw = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) {
      const e = m[Math.min(h - 1, Math.max(0, y))][Math.min(w - 1, Math.max(0, x))];
      return isDoor(e) ? e : '#';
    }
    return m[y][x];
  };
  // lưới ma (n) chém đứt được nên coi như đi qua được
  const solid = (x, y) => {
    const c = raw(x, y);
    if (c === '#') return true;
    if (c === 'X') return !ab.slam;
    if (c === '?') return !ab.lens;
    if (c === 'G') return !ab.puzzle;
    if (c === 'D') return !ab.sorted;
    return false;
  };
  const hazard = (x, y) => { const c = raw(x, y); return c === '^' || (c === '~' && !ab.boat) || (c === 'w' && !ab.drained); };
  const plat = (x, y) => { const c = raw(x, y); return c === '=' || (c === '~' && ab.boat) || (c === 'r' && ab.roots); };
  const surface = (x, y) => solid(x, y) || plat(x, y);
  const free = (x, y) => !solid(x, y) && !hazard(x, y);
  const stand = (x, y) => x >= 0 && x < w && y >= 0 && y < h && free(x, y) && surface(x, y + 1);
  return { id, m, w, h, raw, solid, hazard, plat, surface, free, stand };
}

// Rơi thẳng từ (x, y): trả về ô đứng được, hoặc {door} nếu rơi ra cửa đáy, hoặc null nếu rơi vào gai/nước
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
  const open = (x, y) => r.free(x, y) || r.plat(x, y) || r.raw(x, y) === 'r';
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
    if ((x === 0 || x === r.w - 1) && isDoor(r.raw(x, y))) exits.add(r.raw(x, y));
    // Cửa trên trần: game chuyển phòng khi tâm Mầm lên khỏi mép trên phòng. Đứng ở hàng y thì tâm cách mép (y + 1) ô - 22 px,
    // nhảy cao ~127 px nên chỉ ra được từ hàng 1, 2 (JUMP_UP), hàng 3 là thiếu
    for (let dx = -2; dx <= 2; dx++) for (let dy = 1; dy <= JUMP_UP; dy++) {
      if (y - dy === 0 && isDoor(r.raw(x + dx, 0)) && arcClear(r, x, y, x + dx, 1)) exits.add(r.raw(x + dx, 0));
    }
    for (const s of [-1, 1]) {
      if (r.free(x + s, y)) add(r.stand(x + s, y) ? { x: x + s, y } : fall(r, x + s, y));
    }
    if (r.plat(x, y + 1)) add(fall(r, x, y + 2 > r.h ? y + 1 : y + 2));
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

function run(L, ab) {
  const R = L.rooms, roomsSeen = {}, q = [];
  const visit = (id, starts) => {
    const r = make(R, id, ab), st = roomsSeen[id] = roomsSeen[id] || { r, cells: new Set() };
    const res = explore(r, starts, ab);
    let grew = false;
    res.seen.forEach(k => { if (!st.cells.has(k)) { st.cells.add(k); grew = true; } });
    if (grew || !st.done) { st.done = true; res.exits.forEach(d => q.push([id, d])); }
  };
  const start = make(R, L.start, ab);
  const at = [];
  start.m.forEach((row, y) => [...row].forEach((c, x) => { if (c === '@') at.push({ x, y }); }));
  visit(L.start, at);
  const used = new Set();
  while (q.length) {
    const [id, d] = q.shift();
    if (used.has(id + d)) continue;
    used.add(id + d);
    const [to, td] = R[id].doors[d];
    visit(to, entries(make(R, to, ab), td));
  }
  return roomsSeen;
}

// Vật thể có lấy / dùng được không: có ô đứng được gần đó (cùng ô hoặc trong tầm chém / nhảy)
function objectsReached(seen) {
  const out = {};
  for (const id in seen) {
    const { r, cells } = seen[id];
    r.m.forEach((row, y) => [...row].forEach((c, x) => {
      if (!'TPHJSBGRikcsKVYMNf'.includes(c)) return;
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

// Nền nứt / đống rác bịt cống (X): mỗi cụm X liền nhau chỉ cần một ô có chỗ đứng ngay trên (hoặc chéo một ô) để đập.
// seen phải lấy từ lần duyệt mà X còn nguyên (chưa đập).
function xReached(seen) {
  const bad = [];
  for (const id in seen) {
    const { r, cells } = seen[id], done = new Set();
    r.m.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== 'X' || done.has(x + ',' + y)) return;
      const cum = [], q = [[x, y]];
      done.add(x + ',' + y);
      while (q.length) {
        const [a, b] = q.pop();
        cum.push([a, b]);
        [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].forEach(([u, v]) => {
          if (r.raw(u, v) === 'X' && !done.has(u + ',' + v) && u >= 0 && v >= 0 && u < r.w && v < r.h) { done.add(u + ',' + v); q.push([u, v]); }
        });
      }
      const ok = cum.some(([a, b]) => [-1, 0, 1].some(d => cells.has((a + d) + ',' + (b - 1))));
      if (!ok) bad.push(`${id} cụm 'X' ở (${x},${y})`);
    }));
  }
  return bad;
}

// Bản đồ đủ hàng đủ cột; cửa nối hai chiều khớp nhau; mỗi cửa có ô trên bản đồ
function kiemBanDo(lv, L) {
  const R = L.rooms;
  for (const id in R) {
    const m = R[id].map, w = m[0].length;
    m.forEach((row, y) => { if (row.length !== w) bao(`  ${lv}/${id}: hàng ${y} dài ${row.length}, các hàng khác ${w}`); });
    for (const d in R[id].doors) {
      const [to, td] = R[id].doors[d];
      if (!R[to]) { bao(`  ${lv}/${id}: cửa ${d} nối tới phòng không có: ${to}`); continue; }
      if (!m.some(row => row.includes(d))) bao(`  ${lv}/${id}: cửa ${d} không có ô nào trên bản đồ`);
      const back = R[to].doors[td];
      if (!back || back[0] !== id || String(back[1]) !== String(d)) bao(`  ${lv}/${id}: cửa ${d} → ${to}:${td} nhưng ${to}:${td} không nối ngược lại`);
    }
  }
}

function kiemTra(lv) {
  const L = HSX.LEVELS[lv], R = L.rooms, stages = MAN[lv], total = Object.keys(R).length;
  console.log(`\n=== ${lv}: ${L.name} (${total} phòng) ===`);
  kiemBanDo(lv, L);
  let prev = new Set(), final = null;
  stages.forEach(([name, ab]) => {
    const seen = run(L, ab), rooms = Object.keys(seen);
    const fresh = rooms.filter(r => !prev.has(r));
    console.log(`${name.padEnd(30)} ${rooms.length}/${total} phòng${fresh.length ? '  mới: ' + fresh.map(r => R[r].name).join(', ') : ''}`);
    prev = new Set(rooms);
    final = seen;
  });
  const missing = Object.keys(R).filter(id => !final[id]);
  if (missing.length) bao('CHƯA TỚI ĐƯỢC: ' + missing.join(', '));
  else console.log(`Tới được cả ${total} phòng.`);
  const objs = objectsReached(final), bad = [];
  for (const id in objs) objs[id].forEach(o => { if (!o.ok) bad.push(`${id} '${o.c}' ô (${o.x},${o.y})`); });
  const last = stages[stages.length - 1][1];
  bad.push(...xReached(run(L, Object.assign({}, last, { slam: false, drained: false }))));
  if (bad.length) bao('VẬT CHƯA TỚI ĐƯỢC:\n  ' + bad.join('\n  '));
  else console.log('Mọi đống rác, ô cây, bãi bồi, Mảnh Lá, nhật ký, lồng, Trạm, cổng, nhân vật, quái đều tới được.');
  // Quay về: từ mỗi phòng có đường về phòng đầu màn không (không bị kẹt)
  const ab = stages[stages.length - 1][1], stuck = [];
  for (const id in R) {
    const rooms = {}, q = [[id, null]], used = new Set();
    while (q.length) {
      const [rid, d] = q.shift();
      if (used.has(rid + d)) continue;
      used.add(rid + d);
      const r = make(R, rid, ab);
      let starts;
      if (d === null) { starts = []; r.m.forEach((row, y) => [...row].forEach((c, x) => { if (r.stand(x, y)) starts.push({ x, y }); })); starts = starts.slice(0, 1); }
      else starts = entries(r, d);
      const res = explore(r, starts, ab);
      rooms[rid] = true;
      res.exits.forEach(e => { const [to, td] = R[rid].doors[e]; q.push([to, td]); });
    }
    if (!rooms[L.start]) stuck.push(id);
  }
  if (stuck.length) bao(`KẸT, không về được ${R[L.start].name} từ: ` + stuck.join(', '));
  else console.log(`Từ phòng nào cũng về được ${R[L.start].name}.`);
}

const chon = process.argv[2];
(chon ? [chon] : Object.keys(MAN)).forEach(kiemTra);
// Id phòng không được trùng giữa các màn (save lưu theo id phòng)
const ids = {};
for (const lv in HSX.LEVELS) for (const id in HSX.LEVELS[lv].rooms) { if (ids[id]) bao(`Trùng id phòng ${id} ở ${ids[id]} và ${lv}`); ids[id] = lv; }
console.log(loi ? `\n${loi} lỗi.` : '\nKhông có lỗi.');
process.exitCode = loi ? 1 : 0;
