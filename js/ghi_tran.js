/* Nhật ký trận boss: ghi lại hành động của Mầm và của boss trong mỗi trận để xem lại, phân tích.
   - Ghi từ lúc boss bắt đầu đánh tới khi thắng, thua hoặc rời phòng. Giữ 10 trận gần nhất trong trình duyệt.
   - Tải file JSON: Cài đặt → Nhật ký trận boss (bật "Tự tải file sau mỗi trận" để trận nào xong cũng tự tải về).
   - Đọc file: node kiem_tra/phan_tich_tran.js <file hoặc thư mục>.
   - Xem lại như phim: Cài đặt → Nhật ký trận boss → ▶ Xem (js/phat_lai.js).
   Trong file (phienBan 2): suKien là [giây, loại, chi tiết] (chém kèm góc, nhảy, lướt, bắn ná, phản đòn, lướt né, hồi máu,
   mất máu kèm nguồn, trúng boss kèm kiểu giáp / sơ hở / phản đòn / vương miện, boss đổi chiêu, sơ hở...); đòn chém, đòn trúng
   có batTu: 1 nếu lúc đó Mầm đang bất tử (vừa lướt né, vừa trúng đòn). anh là trạng thái chụp mỗi 0,1 giây: anh.cot tên cột,
   anh.dong các dòng (vị trí, máu, dáng của Mầm và boss), anh.vat đạn và quái con cùng lúc với từng dòng. tongKet là thống kê
   và gợi ý tính sẵn. Bản 1 (file cũ) chụp mỗi 0,2 giây, ít cột hơn, không có anh.vat. */
(function () {
  const KEY = 'hoi-sinh-xanh-nhat-ky-tran', GIU = 10, NHIP = 0.1;
  const D = HSX.DATA, Calc = HSX.Calc, W = () => HSX.World, P = () => HSX.Player, S = () => HSX.S;
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
  // Cột của mỗi dòng chụp. mamTT, bossTT là cờ bit (xem chup), ngamGoc: góc ngắm ná (độ) hoặc null khi không ngắm
  const COT = ['giay', 'mamX', 'mamY', 'mau', 'nangLuong', 'bossX', 'bossY', 'bossMau', 'bossLop', 'bossChieu', 'soHo',
    'mamHuong', 'mamTT', 'mamVy', 'hoi', 'ngamGoc', 'ngamT', 'bossHuong', 'bossTT', 'bossPha', 'bossLopMau'];
  // Đạn trong anh.vat: [id, mã, x, y, w, h, ...]. b túi bay, r túi rơi (mưa túi), n lưới quăng, w sóng chấn, h hạt ná,
  // o bóng báo túi sắp rơi (+ % thời gian còn), v vùng đánh (+ kiểu, % còn, hướng), p túi / lưới bị phản lại (+ loại),
  // q quái con (+ loại, hướng)
  const MA_DAN = { bag: 'b', net: 'n', wave: 'w', hat: 'h', bao: 'o', vung: 'v' };
  let tran = null, soId = 0;   // trận đang ghi, số thứ tự cấp cho đạn / quái con để lúc xem lại nối được vị trí giữa hai lần chụp

  // Tên dễ đọc và cách né cho từng nguồn mất máu (World.nguonDau)
  const NGUON = {
    'dan:wave': ['sóng chấn', 'Nhảy qua sóng chấn khi boss đập đất (sóng chạy dọc mặt đất về hai bên).'],
    'than:charge': ['cú lao', 'Boss lấy đà là sắp lao: lướt xuyên qua (lướt né) hoặc nhảy qua.'],
    'than:lao': ['cú lao chéo của Lưới Ma', 'Lưới Ma rướn lên cao là sắp lao chéo xuống: lướt sang bên, hoặc lướt né đúng lúc.'],
    'than:leap': ['cú nhảy đè của Vua', 'Vua nhảy lên là sắp đè xuống: chạy khỏi chỗ nó sẽ rơi rồi nhảy qua sóng chấn.'],
    'dan:bag': ['túi bay', 'Túi bay đuổi theo: đợi nó tới sát rồi chém một nhát dứt khoát để phản lại.'],
    'dan:bag:roi': ['mưa túi', 'Mưa túi: đứng vào khe giữa các bóng tím dưới đất.'],
    'dan:net': ['lưới quăng', 'Lưới quăng tới: chạy khỏi chỗ nó rơi, hoặc chém đúng lúc để phản lại.'],
    'dan:vung:kep': ['càng kẹp', 'Cua giơ càng (vùng sáng trước mặt) là sắp kẹp: lùi ra, hoặc nhảy qua ra sau lưng nó.'],
    'dan:vung:no': ['nổ túi', 'Vua phồng lên (vòng nét đứt) là sắp nổ túi: lùi ra xa, đừng đứng sát nó quá lâu.'],
    'dan:vung:sap': ['lưới sập', 'Đứng dưới bụng Lưới Ma lâu là bị sập lưới (cột tím): đừng đứng ngay dưới nó.'],
    'dan:vung:quay': ['lưới quẫy', 'Chém dồn lúc Lưới Ma thủ thế là nó quẫy lưới (vòng nét đứt): đánh 1 - 2 nhát rồi lùi ra.'],
    'quai:slime_nilon': ['Slime Nilon', 'Slime do Vua nhả ra: hạ chúng trước khi bị vây.'],
    'quai:luoi_ma': ['Lưới Ma nhỏ', 'Lưới Ma nhỏ bay xuyên tường đuổi theo: quay lại chém trước.'],
    'dia_hinh': ['gai, nước độc', 'Coi chừng gai và nước độc dưới chân lúc né đòn.'],
  };
  const tenNguon = k => (NGUON[k] ? NGUON[k][0] : k.startsWith('than:') ? `chạm thân boss (${k.slice(5)})` : k);

  const G = HSX.GhiTran = {
    dangGhi: () => !!tran,
    dsTran() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } },
    luuDs(ds) {
      for (;;) {
        try { localStorage.setItem(KEY, JSON.stringify(ds)); return; } catch (e) { if (!ds.length) return; ds.shift(); }   // đầy bộ nhớ: bỏ trận cũ nhất
      }
    },

    batDau(b) {
      if (tran) this.ketThuc('bo');
      const s = S();
      tran = {
        phienBan: 2, boss: b.type, tenBoss: b.def.name, phong: W().room.id, luc: new Date().toISOString(),
        mam: {
          vot: D.tiers[s.owned.vot.tier].name, satThuong: Calc.weaponDmg(), laToiDa: Calc.maxHp(), mauDau: s.hp, nangLuong: s.energy,
          tinhLinh: Object.keys(s.spirits).filter(k => s.spirits[k]), bua: s.charms.filter(Boolean), na: !!s.owned.na_tai_che,
          boPhim: HSX.opt.boPhim, thietBi: HSX.Input.usingTouch ? 'touch' : HSX.Input.device,
        },
        bossDau: { mau: b.hp, lop: b.layers || 0, pha: b.phase },
        suKien: [],
        anh: { cot: COT, dong: [], vat: [] },
        t: 0, chup: 0, chieu: null, pha: b.phase,
      };
    },
    ghi(loai, du) { if (tran) tran.suKien.push(du === undefined ? [r2(tran.t), loai] : [r2(tran.t), loai, du]); },

    // Mỗi bước vật lý: boss đổi chiêu, đổi pha, chụp trạng thái
    buoc(dt) {
      const b = W().boss;
      if (!tran || !b || b.dead) return;
      tran.t += dt;
      if (b.state !== tran.chieu) { tran.chieu = b.state; this.ghi('chieu', { ten: b.state, giaVo: b.gia ? 1 : 0 }); }
      if (b.phase !== tran.pha) { tran.pha = b.phase; this.ghi('pha2'); }
      tran.chup -= dt;
      if (tran.chup > 1e-6) return;   // so với 1e-6: 0,1 trừ 6 lần 1/60 còn dư một chút do làm tròn số
      tran.chup += NHIP;
      this.chup(b);
    },
    // Một lần chụp: dòng trạng thái (theo COT) và đạn, quái con đang có
    chup(b) {
      const p = P(), s = S(), pb = p.b, R = Math.round, bit = ds => ds.reduce((a, v, i) => a | (v ? 1 << i : 0), 0);
      const mamTT = bit([pb.ground, Math.abs(pb.vx) > 40, p.inv > 0, p.troi > 0, Calc.charmOn('khien_lon') && p.shieldT <= 0, p.dashT > 0, p.slam]);
      const bossTT = bit([b.t > 0, b.vy < 0, b.no || b.nem > 0 || b.sap || b.quay || b.kep || b.mua, b.stagger > 0, b.gia, b.air, b.ground, b.flash > 0]);
      tran.anh.dong.push([r2(tran.t), R(p.cx()), R(pb.y + pb.h), s.hp, R(s.energy), R(b.x + b.w / 2), R(b.y + b.h), r1(b.hp), b.layers || 0,
        b.state, b.open > 0 ? 1 : 0, p.face, mamTT, R(pb.vy / 10) * 10, R(p.healT * 100), p.ngam ? R(p.banAng * 180 / Math.PI) : null,
        p.ngam ? R(p.ngamT * 100) : 0, b.dir, bossTT, b.phase, r1(b.layerHp || 0)]);
      const vat = [], id = o => o._gid || (o._gid = ++soId);
      W().shots.forEach(sh => {
        if (sh.huy) return;
        const o = [id(sh), sh.phan ? 'p' : sh.type === 'bag' && sh.roi ? 'r' : MA_DAN[sh.type] || '?', R(sh.x), R(sh.y), R(sh.w), R(sh.h)];
        if (sh.phan) o.push(sh.type);
        else if (sh.type === 'vung') o.push(sh.kieu, R(100 * sh.life / sh.max), sh.dir);
        else if (sh.type === 'bao') o.push(R(100 * sh.life / sh.max));
        vat.push(o);
      });
      W().enemies.forEach(e => { if (e.temp && !e.dead) vat.push([id(e), 'q', R(e.x), R(e.y), e.w, e.h, e.type, e.dir]); });
      tran.anh.vat.push(vat);
    },

    ketThuc(ketQua) {
      if (!tran) return;
      if (W().boss) this.chup(W().boss);   // dòng chụp cuối: chỗ đứng lúc hết trận
      const x = tran;
      tran = null;
      x.ketQua = ketQua;
      x.giay = r1(x.t);
      delete x.t; delete x.chup; delete x.chieu; delete x.pha;
      x.tongKet = tongKet(x);
      const ds = this.dsTran();
      ds.push(x);
      while (ds.length > GIU) ds.shift();
      this.luuDs(ds);
      if (HSX.opt.taiTran) this.tai(x);
      if (HSX.UI) HSX.UI.toast(HSX.opt.taiTran ? '📝 Đã tải file nhật ký trận boss' : '📝 Đã ghi nhật ký trận boss (Cài đặt → Nhật ký trận boss)', '', 3500);
    },

    // Tải file JSON: một trận (đối tượng trận) hoặc mảng nhiều trận
    tai(x) {
      const mot = !Array.isArray(x), d = new Date(mot ? x.luc : Date.now()), so = n => String(n).padStart(2, '0');
      const ngay = `${d.getFullYear()}${so(d.getMonth() + 1)}${so(d.getDate())}-${so(d.getHours())}${so(d.getMinutes())}${so(d.getSeconds())}`;
      const ten = mot ? `hsx-tran-${x.boss}-${ngay}.json` : `hsx-tran-tat-ca-${ngay}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(x, null, 1)], { type: 'application/json' }));
      a.download = ten;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
      return ten;
    },
    tenNguon,
  };

  // Thống kê một trận và gợi ý
  function tongKet(x) {
    const sk = x.suKien, dem = loai => sk.filter(e => e[1] === loai).length;
    const theoKieu = {};
    let tong = 0;
    sk.filter(e => e[1] === 'trungBoss').forEach(e => { theoKieu[e[2].kieu] = r1((theoKieu[e[2].kieu] || 0) + e[2].dmg); tong += e[2].dmg; });
    const matMau = {};
    let matLa = 0;
    sk.filter(e => e[1] === 'matMau').forEach(e => { matMau[e[2].nguon] = (matMau[e[2].nguon] || 0) + e[2].n; matLa += e[2].n; });
    // chiêu boss: số lần ra, số lá Mầm mất trong lúc boss đang ở chiêu đó
    const chieu = {};
    let dang = null;
    sk.forEach(e => {
      if (e[1] === 'chieu') { dang = e[2].ten; (chieu[dang] = chieu[dang] || { lan: 0, matLa: 0 }).lan++; }
      else if (e[1] === 'matMau' && dang) chieu[dang].matLa += e[2].n;
    });
    // từng lần sơ hở: có đánh trúng không, gây bao nhiêu sát thương
    const soHo = sk.filter(e => e[1] === 'soHo').map(e => ({ t: e[0], giay: e[2].giay, sat: 0 }));
    sk.filter(e => e[1] === 'trungBoss' && e[2].kieu === 'soho').forEach(e => {
      const o = soHo.filter(s => e[0] >= s.t - 0.05 && e[0] <= s.t + s.giay + 0.1).pop();
      if (o) o.sat += e[2].dmg;
    });
    const coDanh = soHo.filter(o => o.sat > 0).length, lucSoHo = tong ? Math.round(100 * (theoKieu.soho || 0) / tong) : 0;
    // Lướt né: né đòn thật (cú lao, đạn, vùng đánh) hay chỉ lướt xuyên thân boss lúc nó không lao tới; đòn trúng boss lúc Mầm bất tử
    const ne = sk.filter(e => e[1] === 'luotNe');
    const xuyenThan = ne.filter(e => /^than:/.test(e[2].nguon) && !['charge', 'lao', 'leap'].includes(e[2].nguon.slice(5))).length;
    const batTu = sk.filter(e => e[1] === 'trungBoss' && e[2].batTu);
    const tk = {
      ketQua: x.ketQua, giay: x.giay,
      mam: { chem: dem('chem'), banNa: dem('banNa'), nhay: dem('nhay'), luot: dem('luot'), luotNe: dem('luotNe'), phanLai: dem('phanLai'),
        phanTrung: dem('phanTrung'), hoiMau: dem('hoiMau'), biQuan: dem('biQuan'), khienChan: dem('khienChan'), matLa,
        luotNeXuyenThan: xuyenThan },
      batTu: { don: batTu.length, sat: r1(batTu.reduce((a, e) => a + e[2].dmg, 0)) },
      satThuong: { tong: r1(tong), theoKieu, phanTramLucSoHo: lucSoHo },
      matLaTheoNguon: matMau,
      soHo: { lan: soHo.length, tongGiay: r1(soHo.reduce((a, o) => a + o.giay, 0)), coDanh, boPhi: soHo.length - coDanh,
        satThuongMoiLan: coDanh ? r1(soHo.reduce((a, o) => a + o.sat, 0) / coDanh) : 0 },
      chieuBoss: chieu,
    };
    // Gợi ý
    const goiY = [];
    const nguon = Object.keys(matMau).sort((a, b) => matMau[b] - matMau[a]);
    nguon.slice(0, 2).forEach(k => { if (matMau[k] >= 2 && NGUON[k]) goiY.push(`Mất ${matMau[k]} lá vì ${NGUON[k][0]}. ${NGUON[k][1]}`); });
    if (nguon[0] && nguon[0].startsWith('than:') && !NGUON[nguon[0]] && matMau[nguon[0]] >= 2) goiY.push(`Mất ${matMau[nguon[0]]} lá vì chạm thân boss. Giữ khoảng cách lúc nó không sơ hở.`);
    if (soHo.length >= 2 && tk.soHo.boPhi / soHo.length > 0.4) goiY.push(`Bỏ phí ${tk.soHo.boPhi}/${soHo.length} lần boss sơ hở. Né xong thì áp sát đánh ngay: sơ hở chỉ kéo dài chừng 1 giây.`);
    if (tong > 0 && lucSoHo < 40) goiY.push(`Chỉ ${lucSoHo}% sát thương rơi vào lúc boss sơ hở. Đánh lúc boss thủ thế chỉ ăn 40% đòn: chờ sơ hở rồi hãy dồn đòn.`);
    if (x.giay < 15) { tk.goiY = goiY; return tk; }   // trận quá ngắn: chưa đủ để nói chưa né, chưa phản đòn
    if (!tk.mam.luotNe && x.mam.tinhLinh.includes('gio') && (chieu.charge || chieu.lao)) goiY.push('Chưa lướt né lần nào: lướt đúng lúc cú lao tới sát thì xuyên qua, không mất máu, được thêm năng lượng.');
    if (!tk.mam.phanLai && (x.boss === 'vua_nilon' || x.boss === 'luoi_ma_khong_lo')) goiY.push('Chưa phản đòn lần nào: chém túi / lưới đúng lúc nó tới sát thì nó bay ngược về boss, boss lộ sơ hở lớn.');
    tk.goiY = goiY;
    return tk;
  }

  // Nghe sự kiện trong game
  const nghe = (ev, loai, lay) => HSX.on(ev, d => G.ghi(loai, lay ? lay(d || {}) : undefined));
  const batTu = () => (P().inv > 0 ? 1 : 0);   // Mầm đang bất tử (vừa lướt né, vừa trúng đòn)
  nghe('attack', 'chem', d => ({ huong: d.dir, chuot: d.chuot ? 1 : 0, goc: Math.round(P().atkAng * 180 / Math.PI), batTu: batTu() }));
  nghe('jump', 'nhay');
  nghe('dash', 'luot', () => ({ huong: P().dashDir }));
  nghe('heal', 'hoiMau');
  nghe('pogo', 'nayLen');
  nghe('slam', 'dapXuong');
  nghe('ban', 'banNa', d => ({ goc: Math.round((d.goc || 0) * 180 / Math.PI), luc: r1(d.luc || 0) }));
  nghe('phan', 'phanLai');
  nghe('phandon', 'phanTrung');
  nghe('luotne', 'luotNe', d => ({ nguon: d.nguon || '?', thuong: d.thuong ? 1 : 0 }));
  nghe('khien', 'khienChan', d => ({ nguon: d.nguon || '?' }));
  nghe('quan', 'biQuan');
  nghe('thoat', 'thoatLuoi');
  nghe('soho', 'soHo', e => ({ giay: r1(e.open || 0) }));
  nghe('dau', 'matMau', d => ({ n: d.n || 1, nguon: d.nguon || '?', conLai: S().hp }));
  nghe('trungboss', 'trungBoss', d => ({ kieu: d.kieu, dmg: r1(d.dmg), huong: d.dir, mauBoss: r1(d.mau), lop: d.lop, batTu: batTu() }));
  HSX.on('trandau', b => G.batDau(b));
  HSX.on('hettran', d => G.ketThuc(d.ketQua));
})();
