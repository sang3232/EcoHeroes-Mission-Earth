/* Tạo assets/manifest.js: danh sách ảnh có thật trong assets/.
   Chạy lại sau khi thêm hoặc xoá ảnh: node kiem_tra/tao_manifest.js */
const fs = require('fs');
const path = require('path');

const GOC = path.join(__dirname, '..', 'assets');
const DUOI = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const ds = [];

(function quet(dir) {
  for (const ten of fs.readdirSync(dir)) {
    const p = path.join(dir, ten);
    if (fs.statSync(p).isDirectory()) { quet(p); continue; }
    const duoi = path.extname(ten).toLowerCase();
    if (!DUOI.has(duoi)) continue;
    const khoa = path.relative(GOC, p).slice(0, -duoi.length).split(path.sep).join('/');
    ds.push([khoa, duoi.slice(1)]);
  }
})(GOC);

ds.sort((a, b) => a[0].localeCompare(b[0], 'vi'));

const dong = ds.map(([k, d]) => `  ${JSON.stringify(k)}: ${JSON.stringify(d)},`).join('\n');
const dau = '/* Danh sách ảnh có thật trong assets/ (khoá không đuôi → đuôi file).\n'
  + '   Tạo lại sau khi thêm hoặc xoá ảnh: node kiem_tra/tao_manifest.js\n'
  + '   Game chỉ tải ảnh có trong danh sách này; ảnh thiếu dùng emoji / code vẽ thay. */\n'
  + 'window.HSX_ASSET_FILES = {\n';

fs.writeFileSync(path.join(GOC, 'manifest.js'), dau + dong + '\n};\n', 'utf8');
console.log(`Đã ghi assets/manifest.js: ${ds.length} ảnh`);
