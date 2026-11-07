/* Kiểm tra Cổng Rừng (Màn 2) giải được: cống nước nối được, bàn đom đóm có lời giải và cần đúng số cây.
   Chạy: node kiem_tra/m2_puzzle.js */
const path = require('path');

// Nạp js/puzzle.js mà không cần DOM: chỉ cần HSX.DATA ở thời điểm nạp
global.HSX = { DATA: {} };
require(path.join(__dirname, '..', 'js', 'puzzle.js'));

const P = HSX.Puzzle2;
let loi = 0;
const bao = s => { console.log('  ✘ ' + s); loi++; };

// ---------- Bước 1: cống nước ----------
const base = P._baseA();
if (!P._solvedA(base)) bao('Bàn cống gốc phải nối được từ nguồn tới cửa xả.');

let minPar = Infinity, maxPar = 0;
for (let i = 0; i < 300; i++) {
  const s = P._scramble();
  if (P._solvedA(s.cells)) bao(`Lần xáo ${i}: bàn đã "giải sẵn" ngay từ đầu.`);
  if (!(s.par > 0)) bao(`Lần xáo ${i}: par phải > 0 (đang là ${s.par}).`);
  minPar = Math.min(minPar, s.par);
  maxPar = Math.max(maxPar, s.par);
  // xoay đúng par lần clockwise phải về trạng thái giải được
  const cells = s.cells.map(c => (c ? { mask: c.mask, base: c.base, fixed: c.fixed } : c));
  let need = s.par;
  for (let k = 0; k < 64 && need > 0; k++) {
    let moved = false;
    for (const c of cells) {
      if (!c || c.fixed) continue;
      // xoay ô này tới khi khớp base (tối đa 3 lần)
      for (let r = 1; r <= 3 && c.mask !== c.base; r++) {
        c.mask = ((c.mask << 1) | (c.mask >> 3)) & 15;
        need--;
        moved = true;
      }
      if (need <= 0) break;
    }
    if (!moved) break;
  }
  if (!P._solvedA(cells)) bao(`Lần xáo ${i}: xoay các mảnh về đúng vị trí vẫn không nối được.`);
}
console.log(`  Cống nước: 300 lần xáo đều giải được (par ${minPar}–${maxPar}).`);

// ---------- Bước 2: đom đóm ----------
const MAP = P._mapB, K = P._k;
const ok3 = P._solveB(MAP, K, false);
if (!ok3) bao(`Bàn đom đóm không có lời giải với ${K} cây bần.`);
else if (ok3.length !== K) bao(`Lời giải dùng ${ok3.length} cây, đáng lẽ đúng ${K}.`);

if (P._solveB(MAP, K - 1, false)) bao(`Bàn đom đóm giải được chỉ với ${K - 1} cây — quá dễ.`);
if (!P._solveB(MAP, K, true)) { /* đúng: đèn bật thì không thể */ }
else bao('Bàn đom đóm vẫn giải được khi đèn còn bật — mất ý nghĩa "rừng cần bóng tối".');

// Bật đèn đúng như bàn thật rồi tắt hết, phải thắng với lời giải tìm được
if (ok3) {
  const cells = [];
  for (let y = 0; y < MAP.length; y++) for (let x = 0; x < MAP[y].length; x++) {
    const t = MAP[y][x];
    cells.push({ x, y, t, sapling: false, lampOn: t === 'L' });
  }
  const at = (x, y) => cells[y * MAP[0].length + x];
  ok3.forEach(c => { at(c.x, c.y).sapling = true; });
  if (P._doneB(cells)) bao('Khi đèn còn bật mà đã tính là thắng.');
  cells.filter(c => c.t === 'L').forEach(c => { c.lampOn = false; });
  if (!P._doneB(cells)) bao('Tắt hết đèn + đặt đúng cây nhưng vẫn chưa thắng.');
}

if (loi) {
  console.log(`\n${loi} lỗi.`);
  process.exitCode = 1;
} else {
  console.log('  Đom đóm: cần đúng ' + K + ' cây bần và phải tắt đèn chắn tổ. OK');
  console.log('\nCổng Rừng giải được ở cả hai bước. Không có lỗi.');
}
