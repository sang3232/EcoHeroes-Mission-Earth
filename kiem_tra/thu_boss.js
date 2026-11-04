/* Thử độ khó boss bằng bot, chạy ngay trong trang game: mô phỏng từng bước vật lý 1/60 giây, bấm phím giả.
   Nạp từ console:  const s = document.createElement('script'); s.src = 'kiem_tra/thu_boss.js'; document.body.appendChild(s);
   Rồi gọi:  THU_BOSS.tatCa()                     (mỗi boss 3 trận, Vợt Thô, 5 lá máu)
             THU_BOSS.dungChem('vua_nilon', 2, 4) (boss, bậc Vợt 0-2, số lá máu thêm)
   Bot "đứng sát chém": chạy tới sát boss, chém liên tục (boss bay cao thì nhảy chém lên), đủ năng lượng thì đứng hồi máu,
   không bao giờ né. Boss có chiều sâu thì bot này phải thua, hoặc thắng rất chật vật.
   Thử xong thì tải lại trang: bot ghi đè save của trang đang mở. Không dùng trong game thật. */
window.THU_BOSS = (function () {
  const T = HSX.T, W = HSX.World, P = HSX.Player, I = HSX.Input, Calc = HSX.Calc;
  const PHONG = { cua_khong_lo: ['ghenh_da', 10], vua_nilon: ['hang_vua', 8], luoi_ma_khong_lo: ['hang_luoi', 8] };
  const NUT = ['left', 'right', 'up', 'down', 'attack', 'heal', 'jump', 'dash', 'skill', 'shoot'];
  const bam = a => I.setTouch(a, true);
  const thaHet = () => NUT.forEach(a => I.setTouch(a, false));
  function dongHet() { while (HSX.UI.blocking()) { if (HSX.Puzzle.active) HSX.Puzzle.close(); else HSX.UI.closeModal(); } }

  // Save mới: đủ tinh linh, Vợt bậc vot, thêm `them` lá máu, coi như đã xem hết cảnh truyện. Đặt Mầm trong phòng boss.
  function chuanBi(id, vot, them) {
    HSX.S = HSX.newState();
    const S = HSX.S;
    Object.assign(S.spirits, { sen: true, gio: true, gau: true, taiche: true });
    S.owned.vot.tier = vot || 0;
    S.shards = 4 * (them || 0);
    S.hp = Calc.maxHp();
    S.flags.sorted = true;
    S.puzzle.solved = true;
    S.tut._v = 1;
    HSX.opt.huongDan = false;
    Object.keys(HSX.CANH).forEach(k => { S.story[k] = true; });
    HSX.DEBUG_GOD = false;
    W.mode = 'play'; W.fadeTo = null; W.fade = 0; W.victoryT = 0; W.hitstop = 0; W.shake = 0; W.chamT = 0;
    dongHet();
    const [phong, tx] = PHONG[id];
    W.load(phong, { start: true });
    P.place(tx * T, (W.room.h - 2) * T - P.b.h);
    P.inv = 0;
  }

  function dungChem(id, vot, them, maxGiay) {
    chuanBi(id, vot, them);
    const S = HSX.S, b = W.boss, max = maxGiay || 240;
    let t = 0, mat = 0, hp0 = S.hp;
    while (t < max) {
      dongHet();
      if (W.mode === 'dead' || b.dead) break;
      thaHet();
      const dx = b.x + b.w / 2 - P.cx(), tren = b.y + b.h < P.b.y + 10;
      if (S.energy >= 33 && S.hp < Calc.maxHp() && P.b.ground && P.healT >= 0 && !(tren && Math.abs(dx) < 60)) bam('heal');
      else {
        if (Math.abs(dx) > b.w / 2 + 34) bam(dx > 0 ? 'right' : 'left');
        else if (P.atkT <= 0) P.face = dx > 0 ? 1 : -1;
        if (tren) { bam('up'); if (P.b.ground && Math.abs(dx) < 140) bam('jump'); }
        if (P.atkCd <= 0) bam('attack');
      }
      W.update(1 / 60);
      I.step();
      if (S.hp < hp0) mat += hp0 - S.hp;
      hp0 = S.hp;
      t += 1 / 60;
    }
    thaHet();
    const con = b.layers > 0 ? `${b.layers} lớp túi + ${b.hp} máu` : `${Math.max(0, Math.round(b.hp))}/${b.maxHp} máu`;
    return { boss: id, ketQua: b.dead ? 'THẮNG' : W.mode === 'dead' ? 'THUA' : 'HẾT GIỜ', giay: Math.round(t), matLa: mat, bossCon: b.dead ? 0 : con };
  }

  // Mỗi boss n trận (mặc định 3), trả về bảng kết quả. kieu: dungChem (mặc định) hoặc kheo
  function tatCa(vot, them, n, kieu) {
    const out = [];
    Object.keys(PHONG).forEach(id => { for (let k = 0; k < (n || 3); k++) out.push((kieu || dungChem)(id, vot, them)); });
    return out;
  }

  // Bot "chơi khéo": giữ khoảng cách khi boss thủ thế, nhảy qua sóng chấn, lướt xuyên cú lao, tránh vùng boss sắp đánh,
  // đứng vào khe giữa mưa túi, chém túi / lưới khi chúng tới sát để phản đòn, chỉ dồn đòn (và bắn ná) khi boss sơ hở,
  // hồi máu lúc an toàn. Dùng để xem người chơi biết né có thắng được bằng Vợt Thô không.
  function kheo(id, vot, them, maxGiay) {
    chuanBi(id, vot, them);
    HSX.S.owned.na_tai_che = { tier: 0 };
    const S = HSX.S, b = W.boss, r = W.room, max = maxGiay || 240, rw = r.w * T;
    let t = 0, mat = 0, hp0 = S.hp, phan = 0, ne = 0;
    HSX.on('phandon', () => { phan++; });
    HSX.on('luotne', () => { ne++; });
    const chemVe = (x, y) => { I.aim = { x: x - W.cam.x, y: y - W.cam.y }; I.hit.attack = I.hit.mouseAtk = true; };
    // bắn ná đủ lực theo đường vòng cung thấp trúng (x, y); không với tới thì thôi
    const banVe = (x, y) => {
      const v = P.tocBan(1), g = P.C.BAN_G, d0 = P.diemBan(x > P.cx() ? 0 : Math.PI), dx = Math.abs(x - d0.x), dy = d0.y - y;
      const k = v ** 4 - g * (g * dx * dx + 2 * dy * v * v);
      if (k < 0 || dx < 1) return;
      const th = Math.atan((v * v - Math.sqrt(k)) / (g * dx));
      P.ban(x > P.cx() ? -th : Math.PI + th, 1);
    };
    while (t < max) {
      dongHet();
      if (W.mode === 'dead' || b.dead) break;
      thaHet();
      const px = P.cx(), bx = b.x + b.w / 2, by = b.y + b.h / 2, dx = bx - px, ben = dx > 0 ? -1 : 1;   // ben: phía Mầm so với boss
      const mep = Math.abs(dx) - b.w / 2, toc = Math.hypot(b.vx, b.vy);
      const laoToi = toc > 380 && b.vx * -dx + b.vy * (P.cy() - by) > 0;   // boss đang lao về phía Mầm
      let di = 0, nhay = false, luot = false, chem = false, hoi = false;
      // 1. lướt xuyên cú lao đang tới sát
      if (laoToi && mep < 110 && P.dashCd <= 0) { luot = true; P.face = dx > 0 ? 1 : -1; }
      // 2. sóng chấn đang chạy tới: nhảy
      if (W.shots.some(s => s.type === 'wave' && Math.abs(s.x + s.w / 2 - px) < 120 && (s.x + s.w / 2 - px) * s.vx < 0)) nhay = true;
      // 3. túi / lưới tới sát: chém đúng lúc để phản lại
      const dan = W.shots.find(s => (s.type === 'bag' || s.type === 'net') && !s.phan && !s.huy && Math.hypot(s.x + s.w / 2 - px, s.y + s.h / 2 - P.cy()) < 40 + s.w / 2);
      if (dan && P.atkCd <= 0 && P.anim - P.chemLuc >= 0.46) { chemVe(dan.x + dan.w / 2, dan.y + dan.h / 2); chem = true; }
      // 4. mưa túi: đứng vào khe giữa các bóng
      const bao = W.shots.filter(s => s.type === 'bao' || (s.type === 'bag' && s.roi));
      const duoiBao = bao.find(s => Math.abs(s.x + s.w / 2 - px) < 34);
      // 4b. quái nhỏ boss gọi ra (Slime, Lưới Ma nhỏ) tới gần: quay lại chém nó trước
      const nho = W.enemies.filter(e => e.temp && !e.dead).sort((a, c) => Math.abs(a.x - px) - Math.abs(c.x - px))[0];
      if (nho && !chem && P.atkCd <= 0 && Math.hypot(nho.x + nho.w / 2 - px, nho.y + nho.h / 2 - P.cy()) < 95) { chemVe(nho.x + nho.w / 2, nho.y + nho.h / 2); chem = true; }
      // 5. di chuyển: sơ hở thì áp sát, không thì giữ khoảng cách; tránh vùng boss sắp đánh
      const sapDanh = (['kep', 'no', 'sap'].includes(b.state) && b.t > 0) || (b.state === 'leap' && b.air) || (b.def.fly && b.state === 'idle' && Math.abs(dx) < 90);
      if (duoiBao) {
        const trai = bao.every(s => Math.abs(s.x + s.w / 2 - (px - 50)) > 34), phai = bao.every(s => Math.abs(s.x + s.w / 2 - (px + 50)) > 34);
        di = trai && px > 2 * T ? -1 : phai ? 1 : -1;
      } else if (b.open > 0 && !sapDanh) {
        if (mep > 26) di = dx > 0 ? 1 : -1;
        else { P.face = dx > 0 ? 1 : -1; if (P.atkCd <= 0 && !chem) { chemVe(bx, Math.min(by, P.cy())); chem = true; } }
        if (mep > 140 && P.banCd <= 0) banVe(bx, by);
      } else {
        const muon = sapDanh ? 300 : 230;   // khoảng cách muốn giữ tới tâm boss
        if (Math.abs(dx) < muon) di = ben;
        else if (Math.abs(dx) > muon + 120) di = -ben;
        // bị dồn vào góc: lướt xuyên qua boss sang bên kia
        if (di === ben && (px < 2 * T || px > rw - 2 * T) && P.dashCd <= 0 && mep < 160) { luot = true; P.face = dx > 0 ? 1 : -1; di = 0; }
        if (!sapDanh && !laoToi && Math.abs(dx) > 200 && S.energy >= 33 && S.hp < Calc.maxHp() && P.b.ground && !dan && !bao.length) { hoi = true; di = 0; }
      }
      if (hoi) bam('heal');
      else {
        if (di) bam(di > 0 ? 'right' : 'left');
        if (nhay) bam('jump');
        if (luot) { bam('dash'); bam(P.face > 0 ? 'right' : 'left'); }
      }
      W.update(1 / 60);
      I.step();
      if (S.hp < hp0) mat += hp0 - S.hp;
      hp0 = S.hp;
      t += 1 / 60;
    }
    thaHet();
    HSX.ev.phandon.pop(); HSX.ev.luotne.pop();
    const con = b.layers > 0 ? `${b.layers} lớp túi + ${b.hp} máu` : `${Math.max(0, Math.round(b.hp))}/${b.maxHp} máu`;
    return { boss: id, ketQua: b.dead ? 'THẮNG' : W.mode === 'dead' ? 'THUA' : 'HẾT GIỜ', giay: Math.round(t), matLa: mat, phanDon: phan, luotNe: ne, bossCon: b.dead ? 0 : con };
  }

  return { dungChem, kheo, tatCa, chuanBi };
})();
