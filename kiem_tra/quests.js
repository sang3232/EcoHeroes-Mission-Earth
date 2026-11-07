/* Kiểm tra hệ nhiệm vụ dùng chung và vườn đom đóm ở Rặng Bần.
   Chạy: node kiem_tra/quests.js */
global.window = global;
global.HSX = {};

require('../js/levels/m1.js');
require('../js/levels/m2.js');
require('../js/data.js');
require('../js/quests.js');

// Không có DOM: thay các chỗ thông báo / lưu bằng hàm rỗng
HSX.UI = { toast() {} };
HSX.saveGame = () => {};
HSX.emit = () => {};

const Q = HSX.Quests;
const DEF = HSX.LEVELS.m2.rooms.ran_ban;
let loi = 0;
const bao = s => { console.log('  ✘ ' + s); loi++; };
const ok = s => console.log('  ✓ ' + s);

// ---------- Dữ liệu bản đồ ----------
const soO = (DEF.map.join('').match(/P/g) || []).length;
if (soO !== DEF.plantSang.length) bao(`Rặng Bần có ${soO} ô P nhưng plantSang có ${DEF.plantSang.length} phần tử.`);
const toi = DEF.plantSang.filter(s => s < 2).length, sang = DEF.plantSang.filter(s => s >= 2).length;
if (toi !== 4 || sang !== 2) bao(`Cần 4 ô tối + 2 ô sáng, đang có ${toi} + ${sang}.`);
if (DEF.plantNeed !== 4) bao(`plantNeed phải là 4, đang là ${DEF.plantNeed}.`);
if (!loi) ok('Rặng Bần: 6 ô trồng = 4 ô tối + 2 ô sáng, cần 4 cây bần.');

// ---------- Hàm thuần domDomDat ----------
const cay = (idxs, g) => {
  const t = {};
  idxs.forEach(i => { t[i] = { type: 'ban', g }; });
  return t;
};
let r = Q.domDomDat(DEF, {});
if (r.ok || r.dat !== 0) bao('Vườn trống không được tính là đạt.');

r = Q.domDomDat(DEF, cay([0, 1, 2, 3], 1));
if (!r.ok || r.dat !== 4 || r.sai !== 0) bao('4 bần lớn ở ô tối phải đạt.');

r = Q.domDomDat(DEF, cay([0, 1, 2], 1));
if (r.ok || r.dat !== 3) bao('3 bần lớn ở ô tối không được tính là đạt.');

r = Q.domDomDat(DEF, Object.assign(cay([0, 1, 2, 3], 1), cay([4], 1)));
if (r.ok || r.sai !== 1) bao('Có bần lớn ở ô sáng thì không được đạt (phải báo sai = 1).');

r = Q.domDomDat(DEF, Object.assign(cay([0, 1, 2, 3], 1), cay([4], 0.4)));
if (!r.ok || r.sai !== 0) bao('Mầm bần ở ô sáng chưa lớn thì chưa tính là sai.');

r = Q.domDomDat(DEF, { 0: { type: 'duoc', g: 1 }, 1: { type: 'ban', g: 1 } });
if (r.ok || r.dat !== 1) bao('Cây không phải bần không được đếm.');
if (!loi) ok('domDomDat: đếm đúng cây bần lớn, bỏ qua mầm/cây khác, báo ô quá sáng.');

// ---------- Máy nhiệm vụ ----------
const S = HSX.S = {
  flags: { gapMeDuoc: true, trongDuoc: true, congRung: false },
  owned: {}, seeds: 0, quests: {},
  trees: { nha_me_duoc: { 0: { type: 'duoc', g: 0 } }, ran_ban: {} },
};

if (Q.trangThai('bac_cau') !== 'moi') bao('Nhiệm vụ bắc cầu phải bắt đầu ở trạng thái mới.');
if (!Q.batDau('bac_cau')) bao('Không nhận được nhiệm vụ bắc cầu.');
if (!Q.dangLam('bac_cau') || Q.buoc('bac_cau') !== 0) bao('Sau khi nhận, bắc cầu phải đang làm ở bước 0.');
Q.tick(1);
if (Q.buoc('bac_cau') !== 1) bao('Đã có trụ mầm đước nhưng chưa chuyển sang bước chờ rễ lớn.');
S.trees.nha_me_duoc[0].g = 1;
Q.tick(1);
if (!Q.daXong('bac_cau')) bao('Rễ đước lớn mà nhiệm vụ bắc cầu chưa xong.');
// Xẻng không tự động cấp: chỉ khi người chơi ghé nhà Mẹ Đước (mô phỏng bằng Q.recvBacCau).
if (S.owned.xeng) bao('Hoàn thành bắc cầu không được tự động cấp xẻng — phải đi tới nhà bà.');
Q.recvBacCau(S);
if (!S.owned.xeng) bao('Gọi recvBacCau (tiếng nói mẹ) phải mở khóa xẻng.');
Q.tick(1); // tick để moKhi dom_dom được đánh giá
if (!Q.dangLam('dom_dom')) bao('Có xẻng rồi phải tự nhận nhiệm vụ đom đóm.');
if (!loi) ok('Bắc cầu: nhận → chờ rễ → hoàn thành → đi nhà bà nhận xẻng → mở nhiệm vụ đom đóm.');

const truoc = S.seeds;
S.trees.ran_ban = Object.assign(cay([0, 1, 2, 3], 1), { 4: { type: 'ban', g: 1 } });
Q.tick(1);
if (Q.daXong('dom_dom')) bao('Còn một bần lớn ở ô sáng mà nhiệm vụ đom đóm đã xong.');
if (!Q.dangLam('dom_dom')) bao('Nhiệm vụ đom đóm bị mất trạng thái đang làm.');

delete S.trees.ran_ban[4];
Q.tick(1);
if (!Q.daXong('dom_dom')) bao('Đủ 4 bần lớn ở ô tối mà nhiệm vụ đom đóm chưa xong.');
if (!S.flags.congRung) bao('Hoàn thành đom đóm phải mở Cổng Rừng.');
if (S.seeds !== truoc + 6) bao(`Hoàn thành đom đóm phải thưởng 6 hạt giống (đang ${S.seeds - truoc}).`);

const sau = S.seeds;
Q.tick(1);
if (S.seeds !== sau) bao('Nhiệm vụ đã xong vẫn thưởng thêm hạt giống.');
if (!loi) ok('Đom đóm: chắn ô sáng → đủ 4 cây tối → mở cổng, thưởng đúng một lần.');

// ---------- Trạng thái lưu ----------
if (!Q.list().length) bao('list() phải trả về danh sách nhiệm vụ.');
if (Q.list().some(q => q.state !== 'xong')) bao('Cả hai nhiệm vụ phải ở trạng thái xong sau khi chạy.');

if (loi) {
  console.log(`\n${loi} lỗi.`);
  process.exitCode = 1;
} else {
  console.log('\nHệ nhiệm vụ và vườn đom đóm chạy đúng. Không có lỗi.');
}