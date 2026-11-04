/* Xem lại trận boss như phim, từ nhật ký trận (js/ghi_tran.js): dựng lại trong phòng boss bằng chính trình vẽ của game.
   - Mở: Cài đặt → Nhật ký trận boss → ▶ Xem, hoặc 📂 Mở file (file JSON đã tải về).
   - Điều khiển: Space tạm dừng / chạy tiếp, ← → lùi / tới 5 giây, , . lùi / tới 0,1 giây, phím 1-5 đổi tốc độ (¼× tới 4×),
     Esc thoát. Bấm vào thanh thời gian để nhảy tới đó. Vạch trên thanh: đỏ mất máu, vàng boss sơ hở, xanh lướt né, tím sang pha 2.
   - Trong lúc xem, game thật đứng yên: save được cất sang một bên, xem trên một bản sao, thoát ra thì trả lại đúng chỗ cũ
     (trong lúc xem không lưu gì).
   - File bản 1 (cũ) chụp 5 lần mỗi giây, không có đạn của boss: vẫn xem được, chỉ thô hơn. */
(function () {
  const D = HSX.DATA, W = HSX.World, P = HSX.Player, C = P.C, esc = HSX.esc;
  const TOC = [0.25, 0.5, 1, 2, 4];
  const TEN_TOC = ['¼×', '½×', '1×', '2×', '4×'];
  const KQ = { thang: 'Thắng', thua: 'Thua', roi: 'Rời phòng', bo: 'Bỏ dở' };
  const CHIEU = {
    idle: 'thủ thế', walk: 'đi tới', intro: 'mở màn', roar: 'gầm, sang pha 2', raise: 'giơ càng đập đất', ket: 'kẹt (sơ hở)',
    windup: 'lấy đà lao', charge: 'lao', stun: 'lật ngửa (sơ hở)', kep: 'kẹp càng', throw: 'ném túi', leap: 'nhảy đè',
    lun: 'lún cát (sơ hở)', choang: 'choáng (sơ hở)', no: 'phồng nổ túi', summon: 'gọi Slime', mua: 'mưa túi', quang: 'quăng lưới',
    lao: 'lao chéo', quan: 'tự quấn (sơ hở)', quay: 'quẫy lưới', sap: 'sập lưới', goi: 'gọi Lưới Ma nhỏ',
  };
  // Vạch trên thanh thời gian
  const MOC = { matMau: '#ff6b6b', soHo: '#ffd66e', luotNe: '#7fe3ff', pha2: '#c49bff', phanTrung: '#ffffff' };
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const ten = k => HSX.GhiTran.tenNguon(k || '?');
  // Câu kể cho từng sự kiện (dòng chữ dưới thanh thời gian)
  const KE = {
    matMau: d => `Mầm mất ${d.n || 1} lá vì ${ten(d.nguon)}, còn ${d.conLai}`,
    soHo: d => `Boss sơ hở ${d.giay} giây`,
    luotNe: d => `Lướt né ${ten(d.nguon)}${d.thuong === 0 ? ' (không thưởng)' : ''}: bất tử 0,4 giây`,
    pha2: () => 'Boss sang pha 2',
    phanLai: () => 'Chém phản túi / lưới',
    phanTrung: () => 'Phản đòn trúng boss',
    hoiMau: () => 'Hồi 1 lá máu',
    khienChan: d => `Khiên chặn ${ten(d.nguon)}`,
    biQuan: () => 'Mầm bị lưới quấn',
    thoatLuoi: () => 'Thoát lưới',
    trungBoss: d => `Trúng boss ${d.dmg}${d.kieu === 'soho' ? ' lúc sơ hở' : d.kieu === 'giap' ? ' vào giáp' : d.kieu === 'phan' ? ' (phản đòn)' : d.kieu === 'vo' ? ' (vỏ đỡ)' : ''}${d.batTu ? ', lúc đang bất tử' : ''}`,
    chieu: d => `Boss: ${CHIEU[d.ten] || d.ten}${d.giaVo ? ' (đòn giả, lấy đà lâu)' : ''}`,
  };

  const PL = HSX.PhatLai = {
    dang: false,

    // Bắt đầu xem trận x (một trận trong nhật ký)
    mo(x) {
      if (this.dang) return;
      const bo0 = W.boss;
      if (bo0 && bo0.active && !bo0.dead) { HSX.UI.toast('Đang đánh boss: xong trận rồi hãy xem lại.'); return; }
      if (W.mode !== 'play' || HSX.Truyen.active() || W.fadeTo) { HSX.UI.toast('Chưa xem lại được lúc này.'); return; }
      if (!x || !x.anh || !x.anh.dong || x.anh.dong.length < 2 || !D.bosses[x.boss] || !HSX.roomDef(x.phong)) {
        HSX.UI.toast('Nhật ký này không xem lại được (thiếu dữ liệu).');
        return;
      }
      HSX.UI.closeModal();
      // Cất game đang chơi; xem trên bản sao của save, không lưu gì trong lúc xem
      this.giu = { S: HSX.S, phong: W.room.id, x: P.b.x, y: P.b.y, face: P.face, saveGame: HSX.saveGame,
        huongDan: HSX.opt.huongDan, camChuot: HSX.opt.camChuot, buoc: HSX.HuongDan ? HSX.HuongDan.buoc : null };
      HSX.saveGame = () => true;
      HSX.opt.huongDan = false;
      HSX.opt.camChuot = 0;
      if (HSX.HuongDan) HSX.HuongDan.buoc = null;
      const S = HSX.S = JSON.parse(JSON.stringify(this.giu.S)), m = x.mam || {};
      S.bosses[x.boss] = false;
      Object.keys(HSX.CANH).forEach(k => { S.story[k] = true; });
      D.spiritOrder.forEach(id => { S.spirits[id] = (m.tinhLinh || []).includes(id); });
      S.charms = [0, 1, 2].map(i => (m.bua || [])[i] || null);
      S.charms.forEach(id => { if (id) S.owned[id] = S.owned[id] || { tier: 0 }; });
      const bac = D.tiers.findIndex(t => t.name === m.vot);
      if (bac >= 0) S.owned.vot.tier = bac;
      S.shards = Math.max(0, ((m.laToiDa || 5) - 5) * 4);
      if (m.na) S.owned.na_tai_che = S.owned.na_tai_che || { tier: 0 };

      W.load(x.phong, { start: true, im: true });
      // trận gọi bằng mã gian lận có thể ở phòng thường: tự đặt boss vào
      let bo = W.boss;
      if (!bo || bo.type !== x.boss) { bo = W.boss = HSX.Enemies.createBoss(x.boss, 0, 0); HSX.Assets.loadBoss(x.boss); }
      bo.active = true;
      W.enemies = [bo];
      Object.assign(W, { mode: 'play', fadeTo: null, fade: 0, victoryT: 0, bannerData: null, hitstop: 0, chamT: 0, prompt: null, tip: null,
        pickups: [], shots: [], corpses: [], fx: [], texts: [], loi: [], shake: 0, hurtT: 0 });
      Object.assign(P, { look: 0, trail: [], nam: 0, carry: null, atkT: 0, dashT: 0, banT: 0, inv: 0, hurtT: 0, slam: false });

      const cot = {};
      x.anh.cot.forEach((n, i) => { cot[n] = i; });
      Object.assign(this, {
        x, cot, dong: x.anh.dong, vat: x.anh.vat || null, v2: (x.phienBan || 1) >= 2, ev: x.suKien || [],
        dai: Math.max(x.giay || 0, x.anh.dong[x.anh.dong.length - 1][0]), t: 0, chay: true, toc: 1, iEv: -1, quai: {}, chet: false,
        dang: true, tCu: undefined, keCu: null,
      });
      this.taoThanh();
      this.apDung(0);
      HSX.Spirits.snap();
      W.camUpdate(0, true);
    },

    // Thoát: trả game về đúng như trước khi xem
    thoat() {
      if (!this.dang) return;
      this.dang = false;
      const g = this.giu;
      if (W.boss) W.boss.active = false;   // để W.load không tưởng là rời phòng giữa trận
      Object.assign(W, { enemies: [], shots: [], corpses: [], fx: [], texts: [], hurtT: 0, shake: 0, bannerData: null });
      HSX.S = g.S;
      HSX.saveGame = g.saveGame;
      HSX.opt.huongDan = g.huongDan;
      HSX.opt.camChuot = g.camChuot;
      W.load(g.phong, { start: true, im: true });
      P.place(g.x, g.y);
      Object.assign(P, { face: g.face, inv: 0.5, trail: [], atkT: 0, healT: 0, ngam: false, banT: 0, troi: 0, hurtT: 0, dashT: 0, shieldT: 0 });
      if (HSX.HuongDan) HSX.HuongDan.buoc = g.buoc;
      HSX.Spirits.snap();
      W.camUpdate(0, true);
      this.thanh.remove();
      removeEventListener('keydown', this.phim, true);
      HSX.Input.clear();
    },

    // Mỗi khung hình (main.js gọi thay cho World.update khi đang xem)
    capNhat(dt) {
      const truoc = this.t;
      if (this.chay) {
        this.t = Math.min(this.dai, this.t + dt * this.toc);
        if (this.t >= this.dai) { this.chay = false; this.veNut(); }
      }
      const di = this.t - truoc, dtx = di > 0 && di < 0.6 ? di : 0;   // thời gian trận vừa trôi (tua thì không tính)
      if (dtx) this.dienSuKien(truoc, this.t);
      this.apDung(this.t);
      // hiệu ứng, tinh linh, vệt lướt chạy theo thời gian trận (dừng thì đứng yên)
      W.updateFx(dtx);
      W.shake = Math.max(0, W.shake - dtx * 30);
      if (dtx) HSX.Spirits.update(dtx);
      P.trail.forEach(tr => { tr.a -= dtx * 2.5; });
      P.trail = P.trail.filter(tr => tr.a > 0);
      if (P.dashT > 0 && dtx) P.trail.push({ x: P.cx(), y: P.b.y + P.b.h, f: P.face, a: 0.5 });
      W.camUpdate(dt);
      this.veThoiGian();
    },

    // Nhảy tới giây t (bấm thanh thời gian, tua)
    toi(t) {
      this.t = Math.max(0, Math.min(this.dai, t));
      Object.assign(W, { fx: [], texts: [], flashes: [], ui: [], hurtT: 0, shake: 0, bannerData: null });
      P.trail = [];
      this.apDung(this.t);
      HSX.Spirits.snap();
      W.camUpdate(0, true);
      this.veThoiGian();
    },

    // ---------- Dựng lại trạng thái lúc t ----------
    // Dòng chụp cuối cùng có giờ <= t
    timDong(t) {
      const d = this.dong;
      let lo = 0, hi = d.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (d[mid][0] <= t) lo = mid; else hi = mid - 1; }
      return lo;
    },
    // Sự kiện gần nhất loại loai trong khoảng (t - xa, t]; bo: bỏ qua bao nhiêu cái gần nhất
    ganNhat(loai, t, xa, bo) {
      let can = bo || 0;
      for (let i = this.iEv; i >= 0; i--) {
        const e = this.ev[i];
        if (t - e[0] > xa) return null;
        if (e[1] === loai && can-- === 0) return e;
      }
      return null;
    },
    apDung(t) {
      const d = this.dong, c = this.cot, i = this.timDong(t), a = d[i], b = d[Math.min(d.length - 1, i + 1)];
      const dg = Math.max(0.01, b[0] - a[0]), k = b[0] > a[0] ? Math.min(1, Math.max(0, (t - a[0]) / dg)) : 0;
      const V = n => a[c[n]], L = n => a[c[n]] + (b[c[n]] - a[c[n]]) * k;
      // chỉ số sự kiện cuối cùng có giờ <= t
      const ev = this.ev;
      let lo = -1, hi = ev.length - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ev[mid][0] <= t) lo = mid; else hi = mid - 1; }
      this.iEv = lo;
      const S = HSX.S, pb = P.b, bo = W.boss;

      // --- Mầm ---
      pb.x = L('mamX') - pb.w / 2;
      pb.y = L('mamY') - pb.h;
      pb.vx = (b[c.mamX] - a[c.mamX]) / dg;
      if (this.v2) {
        const tt = V('mamTT'), g = V('ngamGoc');
        pb.ground = !!(tt & 1);
        pb.vy = L('mamVy');
        P.face = V('mamHuong') || P.face;
        P.healT = V('hoi') / 100;
        P.ngam = g !== null && g !== undefined;
        if (P.ngam) { P.banAng = g * Math.PI / 180; P.ngamT = V('ngamT') / 100; }
        P.troi = tt & 8 ? 1 : 0;
        P.shieldT = tt & 16 ? 0 : 5;
        P.slam = !!(tt & 64);
      } else {
        pb.vy = (b[c.mamY] - a[c.mamY]) / dg;
        pb.ground = Math.abs(pb.vy) < 40;
        if (Math.abs(pb.vx) > 30) P.face = pb.vx > 0 ? 1 : -1;
        P.healT = 0;
        P.ngam = false;
        const q = this.ganNhat('biQuan', t, 3), th = this.ganNhat('thoatLuoi', t, 3);
        P.troi = q && (!th || th[0] < q[0]) ? 1 : 0;
        const kh = this.ganNhat('khienChan', t, 20);
        P.shieldT = kh ? 20 - (t - kh[0]) : 0;
        P.slam = false;
      }
      const chem = this.ganNhat('chem', t, C.ATK_T), luot = this.ganNhat('luot', t, C.DASH_T), ban = this.ganNhat('banNa', t, 0.25);
      P.atkT = chem ? C.ATK_T - (t - chem[0]) : 0;
      if (chem) {
        P.atkDir = chem[2].huong || 'side';
        P.atkAng = chem[2].goc !== undefined ? chem[2].goc * Math.PI / 180
          : P.atkDir === 'up' ? -Math.PI / 2 : P.atkDir === 'down' ? Math.PI / 2 : P.face > 0 ? 0 : Math.PI;
      }
      P.dashT = luot ? C.DASH_T - (t - luot[0]) : 0;
      if (luot && luot[2] && luot[2].huong) P.face = luot[2].huong;
      P.banT = ban && !P.ngam ? 0.25 - (t - ban[0]) : 0;
      if (ban && !P.ngam) P.banAng = (ban[2].goc || 0) * Math.PI / 180;
      // bất tử: vừa trúng đòn (1,1 giây), vừa lướt né (0,4), khiên vừa chặn (0,6)
      const dau = this.ganNhat('matMau', t, C.INV), ne = this.ganNhat('luotNe', t, 0.4), kc = this.ganNhat('khienChan', t, 0.6);
      P.inv = Math.max(dau ? C.INV - (t - dau[0]) : 0, ne ? 0.4 - (t - ne[0]) : 0, kc ? 0.6 - (t - kc[0]) : 0);
      P.hurtT = dau ? C.HURT_T - (t - dau[0]) : 0;
      // đồng hồ hoạt ảnh (chạy, nhảy, đứng thở)
      const dtx = Math.max(0, Math.min(0.1, t - (this.tCu === undefined ? t : this.tCu)));
      this.tCu = t;
      P.anim += dtx;
      P.step += Math.abs(pb.vx) * dtx;
      if (pb.ground) { P.landT += dtx; P.airT = 0; } else { P.airT += dtx; P.landT = 0; }
      S.hp = V('mau');
      const mm = this.ganNhat('matMau', t, Infinity);   // mất máu sau lần chụp gần nhất: lấy số lá còn lại ghi trong sự kiện
      if (mm && mm[0] >= a[0]) S.hp = mm[2].conLai;
      S.energy = V('nangLuong');

      // --- Boss ---
      bo.x = L('bossX') - bo.w / 2;
      bo.y = L('bossY') - bo.h;
      const ch = this.ganNhat('chieu', t, Infinity), ch0 = this.ganNhat('chieu', t, Infinity, 1);
      bo.state = ch ? ch[2].ten : V('bossChieu');
      bo.stName = bo.state;
      bo.stT = ch ? t - ch[0] : 0;
      bo.prevState = ch0 ? ch0[2].ten : null;
      bo.gia = !!(ch && ch[2].giaVo);
      bo.hp = V('bossMau');
      bo.layers = V('bossLop');
      bo.open = V('soHo') ? 0.5 : 0;
      const tb = this.ganNhat('trungBoss', t, 0.12);
      bo.flash = tb ? 0.12 - (t - tb[0]) : 0;
      bo.ph = t;
      bo.active = true;
      if (this.v2) {
        const tt = V('bossTT'), ra = !!(tt & 4);
        bo.dir = V('bossHuong');
        bo.t = tt & 1 ? 0.3 : -1;
        bo.vy = tt & 2 ? -300 : 300;
        bo.no = bo.sap = bo.quay = bo.kep = bo.mua = ra;
        bo.nem = ra ? 1 : 0;
        bo.stagger = tt & 8 ? 0.2 : 0;
        bo.air = !!(tt & 32);
        bo.ground = !!(tt & 64);
        bo.phase = V('bossPha');
        bo.layerHp = V('bossLopMau');
      } else {
        bo.dir = P.cx() > bo.x + bo.w / 2 ? 1 : -1;
        bo.t = bo.stT < 0.45 ? 0.3 : -1;
        bo.vy = b[c.bossY] < a[c.bossY] ? -300 : 300;
        const ra = bo.stT > 0.5;
        bo.no = bo.sap = bo.quay = bo.kep = bo.mua = ra;
        bo.nem = ra ? 1 : 0;
        bo.stagger = 0;
        bo.phase = this.ganNhat('pha2', t, Infinity) ? 2 : 1;
        bo.layerHp = bo.def.layerHp || 0;
      }
      // hết trận mà thắng: boss gục ngã
      const thang = this.x.ketQua === 'thang' && t >= this.dai - 0.001;
      if (thang && !this.chet) {
        this.chet = true;
        bo.dead = true;
        W.corpses = [{ e: bo, t: 0, dur: 2.6 }];
        W.deathFx(bo.x + bo.w / 2, bo.y + bo.h / 2, bo.def.chip || [bo.def.color], Math.max(bo.w, bo.h));
      } else if (!thang && this.chet) {
        this.chet = false;
        W.corpses = [];
      }
      bo.dead = this.chet;

      // --- Đạn, quái con (chỉ có ở bản 2) ---
      if (!this.vat) return;
      const va = this.vat[i] || [], vb = this.vat[Math.min(this.vat.length - 1, i + 1)] || [], sau = {};
      vb.forEach(o => { sau[o[0]] = o; });
      const shots = [], quai = [];
      va.forEach(o => {
        const n = sau[o[0]], x = n ? o[2] + (n[2] - o[2]) * k : o[2], y = n ? o[3] + (n[3] - o[3]) * k : o[3];
        const w = n ? o[4] + (n[4] - o[4]) * k : o[4], h = n ? o[5] + (n[5] - o[5]) * k : o[5];
        if (o[1] === 'q') {
          if (!D.enemies[o[6]]) return;
          const e = this.quai[o[0]] || (this.quai[o[0]] = HSX.Enemies.create(o[6], 0, 0, -1, true));
          Object.assign(e, { x, y, dir: o[7], ph: t, state: 'patrol', flash: 0, dead: false, ground: true });
          quai.push(e);
          return;
        }
        const s = { x, y, w, h, t, life: 1, max: 1 };
        if (o[1] === 'b') s.type = 'bag';
        else if (o[1] === 'r') Object.assign(s, { type: 'bag', roi: true });
        else if (o[1] === 'n') s.type = 'net';
        else if (o[1] === 'w') s.type = 'wave';
        else if (o[1] === 'h') Object.assign(s, { type: 'hat', vx: n ? (n[2] - o[2]) / dg : 1, vy: n ? (n[3] - o[3]) / dg : 0 });
        else if (o[1] === 'o') Object.assign(s, { type: 'bao', life: (n ? o[6] + (n[6] - o[6]) * k : o[6]) / 100 });
        else if (o[1] === 'v') Object.assign(s, { type: 'vung', kieu: o[6], life: Math.max(0.01, (n ? o[7] + (n[7] - o[7]) * k : o[7]) / 100), dir: o[8] || 1 });
        else if (o[1] === 'p') Object.assign(s, { type: o[6], phan: true });
        else return;
        shots.push(s);
      });
      W.shots = shots;
      W.enemies = [bo].concat(quai);
    },

    // Hiệu ứng của các sự kiện xảy ra trong (t0, t1]: số sát thương, chớp đỏ khi mất máu, "Né!", "Sơ hở!"...
    dienSuKien(t0, t1) {
      const bo = W.boss, px = P.cx(), py = P.cy(), bx = bo.x + bo.w / 2, by = bo.y + bo.h / 2;
      this.ev.forEach(e => {
        if (e[0] <= t0 || e[0] > t1) return;
        const d = e[2] || {};
        switch (e[1]) {
          case 'trungBoss': {
            const hx = bx + Math.sign(px - bx) * bo.w * 0.3, hy = Math.max(bo.y + 20, Math.min(bo.y + bo.h - 20, py));
            if (d.kieu === 'giap') { W.spark(hx, hy, '#cfd3e0'); W.text(hx, bo.y - 8, `-${d.dmg}`, '#cfd3e0', 14); }
            else if (d.kieu === 'vo') { W.spark(hx, hy, '#ffffff'); W.text(hx, bo.y - 6, 'Keng!', '#e8edf2'); }
            else { W.hitFx(hx, hy, Math.atan2(hy - py, hx - px), '#ffd66e'); W.text(hx, bo.y - 12, `-${d.dmg}`, d.kieu === 'soho' ? '#ffd66e' : '#ffffff', 18); }
            if (d.batTu) W.text(px, P.b.y - 28, 'bất tử', '#bff5ff', 12);
            break;
          }
          case 'matMau':
            W.burst(px, py, '#ffffff', 12);
            W.ring(px, py, '#ff8080', 60, 0.3, 4);
            W.hurtT = 0.45;
            W.shake = 10;
            W.text(px, P.b.y - 14, `-1 🍃 ${ten(d.nguon)}`, '#ff9a8a', 15);
            break;
          case 'luotNe': W.text(px, P.b.y - 14, 'Né!', '#bff5ff', 18); W.ring(px, py, '#bff5ff', 70, 0.35, 3); break;
          case 'soHo': W.ring(bx, by, '#ffd66e', Math.max(bo.w, bo.h) * 0.75, 0.4, 5); W.text(bx, bo.y - 16, 'Sơ hở!', '#ffd66e', 17); break;
          case 'pha2': W.ring(bx, by, '#c49bff', 340, 1.0, 8); W.shake = 14; W.banner('Pha 2', '', 1.6); break;
          case 'phanLai': W.ring(px, py, '#fff6c8', 50, 0.25, 3); break;
          case 'phanTrung': W.text(bx, bo.y - 36, 'Phản đòn!', '#fff6c8', 19); break;
          case 'hoiMau': W.burst(px, P.b.y + 10, '#ff9cc8', 18); W.text(px, P.b.y - 10, '+1 🍃', '#9ff0b5'); break;
          case 'khienChan': W.burst(px, py, '#9fd3ff', 16); W.text(px, P.b.y - 12, 'Khiên chặn!', '#9fd3ff'); break;
          case 'nhay': W.dust(px, P.b.y + P.b.h, 4); break;
          case 'banNa': if (!this.vat) W.fxp({ k: 'glow', x: px, y: py - 6, life: 0.12, r: 22, color: 'rgba(232,244,255,0.7)', add: true }); break;
        }
      });
    },

    // ---------- Thanh điều khiển ----------
    taoThanh() {
      const x = this.x, el = this.thanh = document.createElement('div');
      el.id = 'phat-lai';
      const moc = this.ev.filter(e => MOC[e[1]]).map(e => `<i style="left:${(100 * e[0] / this.dai).toFixed(2)}%;background:${MOC[e[1]]}" title="${esc(fmt(e[0]) + ' · ' + KE[e[1]](e[2] || {}))}"></i>`).join('');
      el.innerHTML = `<div class="pl-tren"><b>▶ Xem lại: ${esc(x.tenBoss || x.boss)}</b><span class="pl-kq">${esc(KQ[x.ketQua] || x.ketQua || '')}</span>
          ${this.v2 ? '' : '<span class="pl-cu" title="File bản 1: chụp 5 lần mỗi giây, không có đạn của boss">file cũ, hình thô</span>'}
          <span class="pl-tg"></span><button class="btn small" data-pl="thoat" title="Esc">✕ Thoát</button></div>
        <div class="pl-thanh" title="Bấm để nhảy tới. Đỏ: mất máu · vàng: boss sơ hở · xanh: lướt né · tím: pha 2">${moc}<span class="pl-dau"></span></div>
        <div class="pl-duoi"><button class="btn small" data-pl="lui" title="←">⏪ 5 giây</button><button class="btn small pl-chay" data-pl="chay" title="Space"></button>
          <button class="btn small" data-pl="toi" title="→">5 giây ⏩</button>
          <span class="pl-toc">${TEN_TOC.map((n, i) => `<button class="btn small" data-pl="toc" data-i="${i}" title="phím ${i + 1}">${n}</button>`).join('')}</span></div>
        <div class="pl-ke"></div>`;
      document.body.appendChild(el);
      el.addEventListener('click', e => {
        const nut = e.target.closest('[data-pl]');
        if (nut) {
          const v = nut.dataset.pl;
          if (v === 'thoat') this.thoat();
          else if (v === 'chay') this.batTat();
          else if (v === 'lui') this.toi(this.t - 5);
          else if (v === 'toi') this.toi(this.t + 5);
          else if (v === 'toc') { this.toc = TOC[+nut.dataset.i]; this.veNut(); }
          nut.blur();
          return;
        }
        const th = e.target.closest('.pl-thanh');
        if (th) { const r = th.getBoundingClientRect(); this.toi((e.clientX - r.left) / r.width * this.dai); }
      });
      // Phím trong lúc xem: chặn ở pha bắt để game, menu không nhận
      this.phim = e => {
        if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        if (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.code)) return;   // phím của trình duyệt (F5, F12, Ctrl+...) để yên
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type !== 'keydown' || e.repeat && !/Arrow|Comma|Period/.test(e.code)) return;
        const so = /^Digit([1-5])$/.exec(e.code);
        if (e.code === 'Escape') this.thoat();
        else if (e.code === 'Space' || e.code === 'KeyK') this.batTat();
        else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') this.toi(this.t - 5);
        else if (e.code === 'ArrowRight' || e.code === 'KeyL') this.toi(this.t + 5);
        else if (e.code === 'Comma') { this.chay = false; this.veNut(); this.toi(this.t - 0.1); }
        else if (e.code === 'Period') { this.chay = false; this.veNut(); this.toi(this.t + 0.1); }
        else if (so) { this.toc = TOC[+so[1] - 1]; this.veNut(); }
      };
      addEventListener('keydown', this.phim, true);
      this.veNut();
      this.veThoiGian();
    },
    batTat() {
      if (!this.chay && this.t >= this.dai) this.toi(0);   // hết rồi thì xem lại từ đầu
      this.chay = !this.chay;
      this.veNut();
    },
    veNut() {
      if (!this.thanh) return;
      this.thanh.querySelector('.pl-chay').textContent = this.chay ? '⏸ Dừng' : '▶ Chạy';
      this.thanh.querySelectorAll('[data-pl="toc"]').forEach(b => b.classList.toggle('on', TOC[+b.dataset.i] === this.toc));
    },
    veThoiGian() {
      const el = this.thanh;
      if (!el) return;
      el.querySelector('.pl-tg').textContent = `${fmt(this.t)} / ${fmt(this.dai)}`;
      el.querySelector('.pl-dau').style.left = `${(100 * this.t / this.dai).toFixed(2)}%`;
      // ba sự kiện đáng kể gần nhất trước lúc đang xem
      const ds = [];
      for (let i = this.iEv; i >= 0 && ds.length < 3; i--) { const e = this.ev[i]; if (KE[e[1]] && this.t - e[0] < 6) ds.push(`${e[0].toFixed(1)}s · ${KE[e[1]](e[2] || {})}`); }
      const chu = ds.join('\n');
      if (chu !== this.keCu) { this.keCu = chu; el.querySelector('.pl-ke').textContent = chu; }
    },
  };
})();
