/* Quái, mini-boss Cua Lon Khổng Lồ, boss Vua Túi Nilon (Màn 1) và mini-boss Lưới Ma Khổng Lồ (Màn 2).
   Boss có giáp: lúc thủ thế đòn đánh chỉ còn 40%, lúc sơ hở (e.open > 0, viền vàng) ăn đòn ×1,5. Sơ hở đến sau
   những chiêu hụt: lao đâm tường, đập đất xong bị kẹt, trúng chính túi / lưới của mình bị Mầm chém phản lại.
   Boss chọn chiêu theo chỗ Mầm đứng và việc Mầm đang làm (nhin, boc), có đòn giả rướn lâu hơn bình thường (da). */
(function () {
  const D = HSX.DATA, T = HSX.T, Phys = HSX.Phys;
  const GRAV = 2000;
  const sign = v => (v < 0 ? -1 : 1);
  const AI_TRUM = { cua_khong_lo: 'crabBoss', vua_nilon: 'kingBoss', luoi_ma_khong_lo: 'netBoss' };

  // Theo dõi Mầm: đứng sát quá lâu (ganT), đứng xa quá lâu (xaT, như khi chỉ bắn ná từ xa), đang hồi máu
  function nhin(e, P, dt) {
    const dx = P.cx() - (e.x + e.w / 2), dy = P.cy() - (e.y + e.h / 2), kc = Math.abs(dx);
    const gan = kc < e.w / 2 + 110 && Math.abs(dy) < e.h / 2 + 90;
    e.ganT = gan ? (e.ganT || 0) + dt : Math.max(0, (e.ganT || 0) - dt * 2);
    e.xaT = kc > 430 ? (e.xaT || 0) + dt : 0;
    return { dx, kc, gan, hoi: P.healT > 0 };
  }
  // Bốc thăm chiêu theo trọng số [[tên, trọng số]], không cho một chiêu ra quá 2 lần liền
  function boc(e, ds) {
    const lich = e.lich || (e.lich = []), n = lich.length;
    const ok = ds.filter(([ten, w]) => w > 0 && !(n >= 2 && lich[n - 1] === ten && lich[n - 2] === ten));
    if (!ok.length) return ds[0][0];
    let r = Math.random() * ok.reduce((a, x) => a + x[1], 0), ten = ok[0][0];
    for (const [t, w] of ok) { r -= w; if (r <= 0) { ten = t; break; } }
    lich.push(ten);
    if (lich.length > 3) lich.shift();
    return ten;
  }
  // Thời gian lấy đà: đôi khi rướn lâu hơn hẳn (đòn giả, boss rung người) để không né theo nhịp được
  function da(e, t) {
    e.gia = Math.random() < (e.phase === 2 ? 0.35 : 0.22);
    return e.gia ? t * 1.75 : t;
  }
  // Đòn cùng lúc (ngoài thân boss): mỗi boss chỉ có một đợt đòn tầm xa đang bay (túi ném, lưới quăng, mưa túi), đợt trước
  // hết mới ra đợt sau; tối đa 2 quái con; Cua không đập đất khi sóng chấn cũ còn chạy. Vua còn có trần chung: đạn + quái con
  // + sóng chấn không quá 5 (pha 1) / 6 (pha 2), chiêu nào làm vượt trần thì không chọn.
  // Nhiều nhất cùng lúc: Cua 2 sóng (pha 2: 4), Vua 5 / 6, Lưới Ma 1 lưới + 2 quái con (pha 2: 2 lưới + 2).
  const dangBay = () => HSX.World.shots.some(s => !s.phan && !s.huy && (s.type === 'bag' || s.type === 'net' || s.type === 'bao'));
  const quaiCon = () => HSX.World.enemies.filter(x => x.temp && !x.dead).length;
  const songChay = () => HSX.World.shots.filter(s => s.type === 'wave').length;
  const dangCo = () => HSX.World.shots.filter(s => !s.phan && !s.huy && ['bag', 'net', 'bao'].includes(s.type)).length + quaiCon() + songChay();

  // Bị chém dồn n nhát (Cua, Vua 3, Lưới Ma 2) lúc đang thủ thế (e.don, giảm dần theo thời gian) thì phản công ngay:
  // chém bừa không có lời
  function biDon(e, dt, n) {
    e.don = Math.max(0, (e.don || 0) - dt * 0.9);
    if (e.don < (n || 3)) return false;
    e.don = 0;
    return true;
  }
  // Mầm mất máu: chiêu boss đang ra đã trúng (e.trung, chiêu đó không để lộ sơ hở nữa) và sơ hở đang có cũng hết.
  // Đỡ đòn bằng thân rồi phản công không có lời: phải né được thì mới có lúc đánh mạnh.
  HSX.on('dau', () => { const b = HSX.World.boss; if (b && b.active && !b.dead) { b.trung = true; b.open = 0; } });

  const E = HSX.Enemies = {
    // Vùng lưới quẫy của Lưới Ma Khổng Lồ: bầu dục bán kính rx × ry, tâm thấp hơn tâm boss lech px (render.js vẽ báo trước theo số này)
    QUAY: { rx: 140, ry: 175, lech: 50 },

    create(type, tx, ty, idx, temp) {
      const d = D.enemies[type];
      return {
        kind: 'enemy', type, def: d, idx, temp: !!temp, img: d.img || type,
        x: tx * T + (T - d.w) / 2, y: (ty + 1) * T - d.h, w: d.w, h: d.h, vx: 0, vy: 0,
        hp: d.hp, dir: -1, state: 'patrol', t: Math.random() * 0.8, flash: 0, knock: 0, dead: false,
        homeX: tx * T + T / 2, homeY: ty * T, ph: Math.random() * 6, squash: 0,
      };
    },

    createBoss(id, tx, ty) {
      const d = D.bosses[id];
      return {
        kind: 'boss', type: id, def: d, img: d.img,
        x: tx * T + T / 2 - d.w / 2, y: (ty + 1) * T - d.h, w: d.w, h: d.h, vx: 0, vy: 0,
        hp: d.hp, maxHp: d.hp, layers: d.layers || 0, layerHp: d.layerHp || 0,
        dir: -1, state: 'sleep', t: 0, flash: 0, knock: 0, dead: false, active: false, phase: 1, act: 0, ph: 0, squash: 0, open: 0,
      };
    },

    update(e, dt, room, P) {
      if (e.dead) return;
      e.flash = Math.max(0, e.flash - dt);
      e.squash = Math.max(0, e.squash - dt * 3);
      e.ph += dt;
      if (e.open > 0) {   // đang sơ hở: lấp lánh vàng
        e.open -= dt;
        if (Math.random() < dt * 24) HSX.World.fxp({ x: e.x + Math.random() * e.w, y: e.y + e.h * (0.2 + Math.random() * 0.7), vy: -50, life: 0.5, r: 2.2, color: '#ffd66e', add: true });
      }
      if (e.stagger > 0) { e.stagger -= dt; e.vx = 0; if (e.def.fly) e.vy *= 0.9; }   // boss khựng lại khi bị xé một lớp túi
      else if (e.kind === 'boss') this[AI_TRUM[e.type]](e, dt, room, P);
      else if (e.knock > 0) e.knock -= dt;
      else this[e.def.ai](e, dt, room, P);
      if (e.def.fly) { e.x += e.vx * dt; e.y += e.vy * dt; }
      else { e.vy = Math.min(900, e.vy + GRAV * dt); Phys.move(e, room, dt); }
      // thời gian ở trạng thái hiện tại và trạng thái ngay trước, để chọn khung hoạt ảnh
      if (e.state !== e.stName) { e.prevState = e.stName; e.stName = e.state; e.stT = 0; } else e.stT += dt;
    },

    // Chai Lăn: tuần tra, thấy Mầm thì lấy đà rồi lăn lao tới
    roller(e, dt, room, P) {
      const d = e.def, dx = P.cx() - (e.x + e.w / 2), dy = P.cy() - (e.y + e.h / 2);
      e.t -= dt;
      if (e.state === 'patrol') {
        e.vx = e.dir * d.speed;
        if (e.ground && (!Phys.groundAhead(e, room, e.dir) || Phys.wallAhead(e, room, e.dir))) e.dir *= -1;
        if (Math.abs(dx) < d.sight && Math.abs(dy) < 70 && e.t <= 0) { e.dir = sign(dx); e.state = 'windup'; e.t = 0.45; }
      } else if (e.state === 'windup') {
        e.vx = 0;
        if (e.t <= 0) { e.state = 'rush'; e.t = 1.3; }
      } else if (e.state === 'rush') {
        e.vx = e.dir * d.rush;
        if (e.t <= 0 || e.wallL || e.wallR || (e.ground && !Phys.groundAhead(e, room, e.dir))) { e.state = 'rest'; e.t = 0.7; e.vx = 0; }
      } else { e.vx = 0; if (e.t <= 0) { e.state = 'patrol'; e.t = 0.6; } }
    },

    // Slime Nilon, Hộp Xốp: nhảy cóc về phía Mầm, không nhảy xuống nước hay gai
    hopper(e, dt, room, P) {
      const d = e.def, dx = P.cx() - (e.x + e.w / 2);
      if (!e.ground) return;
      e.vx *= 0.7;
      e.t -= dt;
      if (e.t <= 0) {
        e.dir = Math.abs(dx) < 420 ? sign(dx) : (Math.random() < 0.5 ? -1 : 1);
        const nguy = s => { const c = room.tile(Math.floor((e.x + e.w / 2 + s * d.hopX * 0.5) / T), Math.floor((e.y + e.h + 4) / T)); return c === 'w' || c === '^' || c === '~'; };
        if (nguy(e.dir)) e.dir = -e.dir;
        if (nguy(e.dir)) { e.t = d.every; return; }
        e.vx = e.dir * d.hopX;
        e.vy = -d.hopY;
        e.t = d.every;
        e.squash = 1;
      }
    },

    // Cua Lon: vỏ lon phía trước đỡ đòn, lao ngang rồi đứng thở (lúc đó đánh trước mặt cũng trúng)
    crab(e, dt, room, P) {
      const d = e.def, dx = P.cx() - (e.x + e.w / 2), dy = P.cy() - (e.y + e.h / 2);
      e.t -= dt;
      if (e.state === 'patrol') {
        e.vx = e.dir * d.speed;
        if (e.ground && (!Phys.groundAhead(e, room, e.dir) || Phys.wallAhead(e, room, e.dir))) e.dir *= -1;
        if (Math.abs(dx) < d.sight && Math.abs(dy) < 70 && e.t <= 0) { e.dir = sign(dx); e.state = 'windup'; e.t = 0.5; }
      } else if (e.state === 'windup') {
        e.vx = 0;
        if (e.t <= 0) { e.state = 'rush'; e.t = 1.1; }
      } else if (e.state === 'rush') {
        e.vx = e.dir * d.rush;
        if (e.t <= 0 || e.wallL || e.wallR || (e.ground && !Phys.groundAhead(e, room, e.dir))) { e.state = 'rest'; e.t = 1.1; e.vx = 0; }
      } else { e.vx = 0; if (e.t <= 0) { e.state = 'patrol'; e.t = 0.5; } }
    },

    // Lưới Ma: bay lượn quanh chỗ cũ, thấy Mầm thì đuổi theo, xuyên tường
    ghost(e, dt, room, P) {
      const d = e.def, ex = e.x + e.w / 2, ey = e.y + e.h / 2;
      const dx = P.cx() - ex, dy = P.cy() - ey, dist = Math.hypot(dx, dy);
      let tx, ty;
      if (dist < d.sight) { tx = dx / (dist || 1) * d.speed; ty = dy / (dist || 1) * d.speed + Math.sin(e.ph * 3) * 30; }
      else { tx = (e.homeX - ex) * 0.8 + Math.cos(e.ph) * 30; ty = (e.homeY - ey) * 0.8 + Math.sin(e.ph * 1.3) * 25; }
      e.vx += (tx - e.vx) * Math.min(1, dt * 2.2);
      e.vy += (ty - e.vy) * Math.min(1, dt * 2.2);
      if (Math.abs(e.vx) > 5) e.dir = sign(e.vx);
    },

    // Mini-boss Cua Lon Khổng Lồ: mai lon phía trước đỡ đòn chém ngang và hạt ná.
    // Đập càng: sóng chấn hai bên, càng kẹt xuống cát (sơ hở). Lấy đà lao ngang: đâm tường thì lật ngửa (sơ hở lớn).
    // Kẹp càng khi Mầm đứng sát quá lâu; bị đánh sau lưng 2 nhát thì quay ngoắt lại kẹp.
    // Còn nửa máu: nhanh hơn, lao dội tường rồi lao tiếp, đập hai nhịp.
    crabBoss(e, dt, room, P) {
      const W = HSX.World, v = nhin(e, P, dt), p2 = e.phase === 2;
      if (!e.active) { e.vx = 0; return; }
      e.t -= dt;
      switch (e.state) {
        case 'sleep': e.state = 'walk'; e.t = 1.2; break;
        case 'walk':
          e.dir = sign(v.dx);
          e.vx = e.dir * (p2 ? 105 : 85);
          if (biDon(e, dt)) { this.cuaRa(e, 'kep'); e.t = 0.2; e.gia = false; break; }
          if (v.gan && e.ganT > 0.9) { this.cuaRa(e, 'kep'); break; }
          if (e.t > 0) break;
          this.cuaRa(e, boc(e, [
            ['dap', songChay() ? 0 : v.kc < 220 ? 4 : 1],
            ['lao', v.kc > 300 || e.xaT > 1.2 || v.hoi ? 5 : 2],
            ['kep', v.kc < 160 ? 2 : 0],
          ]));
          break;
        case 'raise':   // giơ càng: sắp đập đất
          e.vx = 0;
          if (e.t > 0) break;
          W.shake = 10;
          W.wave(e.x + e.w / 2, e.y + e.h, -1, 340);
          W.wave(e.x + e.w / 2, e.y + e.h, 1, 340);
          if (--e.dap > 0) { e.t = 0.5; e.gia = false; }   // pha 2: giơ càng đập nhịp thứ hai
          else { e.state = 'ket'; e.t = 0.8; if (!e.trung) this.soHo(e, 0.8); }
          break;
        case 'ket': e.vx = 0; if (e.t <= 0) { e.state = 'walk'; e.t = 0.9; } break;   // càng kẹt dưới cát
        case 'windup': e.vx = 0; if (e.t <= 0) { e.state = 'charge'; e.t = 2.2; } break;
        case 'charge': {
          if (e.trung) { e.vx = 0; e.state = 'walk'; e.t = 0.7; break; }   // húc trúng Mầm: phanh lại kịp, không đâm tường
          e.vx = e.dir * (p2 ? 520 : 470);
          const tuong = e.wallL || e.wallR;
          if (!tuong && e.t > 0) break;
          e.vx = 0;
          W.shake = tuong ? 14 : 4;
          if (tuong) W.burst(e.x + (e.dir > 0 ? e.w : 0), e.y + e.h / 2, '#c9ccd1', 20);
          if (tuong && e.doi > 0) { e.doi--; e.dir = -e.dir; e.state = 'windup'; e.t = 0.4; e.gia = false; }   // pha 2: dội tường, lao tiếp
          else if (tuong) { e.state = 'stun'; e.t = p2 ? 1.5 : 1.8; this.soHo(e, e.t); }
          else { e.state = 'walk'; e.t = 0.8; }
          break;
        }
        case 'stun': e.vx = 0; if (e.t <= 0) { e.state = 'walk'; e.t = 1.3; } break;
        case 'kep':   // giơ càng trước mặt rồi kẹp mạnh
          e.vx = 0;
          if (e.t > 0) break;
          if (!e.kep) {
            e.kep = true; e.t = 0.45;
            W.zone(e.dir > 0 ? e.x + e.w - 20 : e.x - 90, e.y + e.h * 0.2, 110, e.h * 0.75, 0.15, 'kep', e.dir, e.x + e.w / 2);
            W.shake = 6;
          } else { e.kep = false; e.state = 'walk'; e.t = 0.8; e.ganT = 0; }
          break;
      }
    },
    cuaRa(e, ten) {
      e.vx = 0; e.kep = false; e.sauLung = 0; e.trung = false;
      if (ten === 'dap') { e.state = 'raise'; e.t = da(e, 0.5); e.dap = e.phase === 2 ? 2 : 1; }
      else if (ten === 'lao') { e.state = 'windup'; e.t = da(e, 0.65); e.doi = e.phase === 2 ? 1 : 0; }
      else { e.state = 'kep'; e.t = da(e, 0.32); }
    },

    // Boss Vua Túi Nilon: ném túi bay đuổi theo (chém trúng thì túi bay ngược lại: trúng Vua là xé ngay 1 lớp túi),
    // nhảy đập đất tạo sóng chấn rồi lún xuống cát (sơ hở), lấy đà lao ngang (đâm tường thì choáng: sơ hở), phồng lên
    // nổ túi khi Mầm đứng sát quá lâu. Chém xuống trúng vương miện thì giáp không chặn.
    // Pha 2 (xé hết 5 lớp túi): nhanh hơn, gọi Slime, túi rơi như mưa từ trần, nhảy đập xong có khi lao luôn.
    kingBoss(e, dt, room, P) {
      const W = HSX.World, v = nhin(e, P, dt), p2 = e.phase === 2, fast = p2 ? 1.25 : 1;
      if (!e.active) { e.vx = 0; return; }
      e.t -= dt;
      switch (e.state) {
        case 'sleep': e.state = 'intro'; e.t = 1.4; break;
        case 'intro': e.vx = 0; if (e.t <= 0) { e.state = 'idle'; e.t = 0.6; } break;
        case 'roar': e.vx = 0; if (e.t <= 0) { e.state = 'idle'; e.t = 0.4; } break;   // gầm lên khi sang pha 2
        case 'idle': {
          e.vx = 0;
          e.dir = sign(v.dx);
          if (biDon(e, dt)) { this.vuaRa(e, 'no'); e.t = 0.3; e.gia = false; break; }
          if (v.gan && e.ganT > 0.8) { this.vuaRa(e, 'no'); break; }
          if (e.t > 0) break;
          const bay = dangBay(), con = quaiCon(), co = dangCo(), duoc = them => co + them <= (p2 ? 6 : 5);
          this.vuaRa(e, boc(e, [
            ['throw', !bay && duoc(p2 ? 4 : 3) ? (v.kc > 220 ? 3 : 1) : 0],
            ['leap', duoc(2) ? (v.hoi || e.xaT > 1.2 ? 4 : 2) : 0],
            ['charge', v.hoi || v.kc > 320 ? 3 : 2],
            ['no', v.kc < 180 ? 3 : 0],
            ['summon', p2 && !con && duoc(2) ? 1 : 0],
            ['mua', p2 && !bay && duoc(6) ? 2 : 0],
          ]));
          break;
        }
        case 'throw':
          e.vx = 0;
          if (e.t <= 0) {
            const n = p2 ? 4 : 3;
            for (let k = 0; k < n; k++) W.bag(e.x + e.w / 2 + (k - (n - 1) / 2) * 30, e.y + 20);
            e.state = 'idle'; e.t = 1.3 / fast;
          }
          break;
        case 'leap':
          if (e.t > 0) { e.vx = 0; break; }
          if (e.ground && !e.air) { e.vx = HSX.clamp(v.dx / 0.9, -520, 520); e.vy = -1150; e.air = true; e.ground = false; }
          else if (e.air && e.ground) {
            e.air = false; e.vx = 0;
            W.shake = 14;
            W.wave(e.x + e.w / 2, e.y + e.h, -1, 380 * fast);
            W.wave(e.x + e.w / 2, e.y + e.h, 1, 380 * fast);
            if (e.trung) { e.state = 'idle'; e.t = 0.5; }   // đè trúng Mầm: đứng dậy ngay
            else { e.state = 'lun'; e.t = p2 ? 0.75 : 1.0; this.soHo(e, e.t); }
          }
          break;
        case 'lun':   // lún xuống cát sau cú nhảy đập
          e.vx = 0;
          if (e.t > 0) break;
          if (p2 && Math.random() < 0.4) { e.dir = sign(v.dx); e.state = 'charge'; e.t = 0.3; e.gia = false; e.trung = false; }   // pha 2: nhổm dậy lao luôn
          else { e.state = 'idle'; e.t = 0.6 / fast; }
          break;
        case 'charge':
          if (e.t > 0) { e.vx = 0; break; }
          if (e.trung) { e.vx = 0; e.state = 'idle'; e.t = 0.6; break; }   // húc trúng Mầm: phanh lại kịp, không đâm tường
          e.vx = e.dir * 520 * fast;
          if (e.wallL || e.wallR) {
            W.shake = 12; e.vx = 0;
            W.burst(e.x + (e.dir > 0 ? e.w : 0), e.y + e.h / 2, '#d8d0ff', 18);
            e.state = 'choang'; e.t = p2 ? 0.8 : 1.0; this.soHo(e, e.t);
          }
          break;
        case 'choang': e.vx = 0; if (e.t <= 0) { e.state = 'idle'; e.t = 0.5; } break;   // đâm tường, choáng
        case 'no':   // phồng lớp túi lên rồi nổ tung, hất Mầm ra xa
          e.vx = 0;
          if (e.t > 0) break;
          if (!e.no) {
            const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
            e.no = true; e.t = 0.55;
            W.zone(cx - 160, e.y - 30, 320, e.h + 30, 0.2, 'no', 1, cx);
            W.ring(cx, cy, '#e6d5ff', 180, 0.4, 8);
            W.burst(cx, cy, '#ecebf4', 26);
            W.chips(cx, cy, e.def.chip, 14, 460);
            W.shake = 10;
          } else { e.no = false; e.state = 'idle'; e.t = 0.6; e.ganT = 0; }
          break;
        case 'summon':   // pha 2: nuốt rác quanh mình rồi nhả ra Slime Nilon
          e.vx = 0;
          if (Math.random() < 0.7) W.hut(e.x + e.w / 2, e.y + e.h * 0.45);
          if (e.t <= 0) {
            const con = quaiCon();
            if (con < 2) W.spawnTemp('slime_nilon', e.x - 30, e.y + e.h - 40);
            if (con < 1) W.spawnTemp('slime_nilon', e.x + e.w + 10, e.y + e.h - 40);
            if (con < 2) W.burst(e.x + e.w / 2, e.y + e.h * 0.6, '#d8d0ff', 16);
            e.state = 'idle'; e.t = 0.8;
          }
          break;
        case 'mua':   // pha 2: gầm lên, túi rơi như mưa từ trần, bóng dưới đất báo chỗ rơi
          e.vx = 0;
          if (e.t > 0) break;
          if (!e.mua) { e.mua = true; e.t = 1.4; W.muaTui(); W.shake = 8; }
          else { e.mua = false; e.state = 'idle'; e.t = 0.5; }
          break;
      }
    },
    vuaRa(e, ten) {
      e.state = ten; e.vx = 0; e.no = false; e.mua = false; e.gia = false; e.trung = false;
      e.t = ten === 'leap' ? da(e, 0.4) : ten === 'charge' ? da(e, 0.6) : ten === 'no' ? da(e, 0.5) : ten === 'summon' ? 0.9 : ten === 'mua' ? 0.7 : 0.6;
    },

    // Mini-boss Lưới Ma Khổng Lồ: lượn trên đầu Mầm, quăng lưới (trúng thì bị quấn; chém trúng tấm lưới đang bay thì nó
    // bay ngược lại, trúng Lưới Ma là nó tự quấn mình rơi xuống đất: sơ hở lớn), lao chéo xuống (cắm xuống đất thì kẹt lại:
    // sơ hở), sập lưới xuống khi Mầm đứng dưới bụng nó quá lâu, gọi Lưới Ma nhỏ.
    // Còn nửa máu: nhanh hơn, quăng hai tấm lưới lệch nhịp (tấm sau đón đầu chỗ Mầm đang chạy tới).
    netBoss(e, dt, room, P) {
      const W = HSX.World, cx = e.x + e.w / 2, cy = e.y + e.h / 2, v = nhin(e, P, dt), dx = v.dx, p2 = e.phase === 2, fast = p2 ? 1.3 : 1;
      const day = (room.h - 2) * T;
      if (!e.active) { e.vx = e.vy = 0; return; }
      e.t -= dt;
      const luon = (tx, ty, k) => {   // lượn mềm về điểm (tx, ty)
        e.vx += ((tx - cx) * 2.4 - e.vx) * Math.min(1, dt * k);
        e.vy += ((ty - cy) * 2.4 - e.vy) * Math.min(1, dt * k);
      };
      const ham = k => { e.vx *= Math.exp(-k * dt); e.vy *= Math.exp(-k * dt); };
      const duoi = Math.abs(dx) < e.w / 2 + 20 && P.b.y > e.y + e.h * 0.5;   // Mầm đứng dưới bụng
      e.duoiT = duoi ? (e.duoiT || 0) + dt : Math.max(0, (e.duoiT || 0) - dt * 2);
      switch (e.state) {
        case 'sleep': e.state = 'intro'; e.t = 1.4; break;
        case 'intro': ham(6); if (e.t <= 0) { e.state = 'idle'; e.t = 0.6; } break;
        case 'roar': ham(6); if (e.t <= 0) { e.state = 'idle'; e.t = 0.5; } break;
        case 'idle': {
          const ben = cx < P.cx() ? -1 : 1;
          luon(P.cx() + ben * 190, P.b.y - 150 + Math.sin(e.ph * 1.7) * 30, 2.4);
          e.dir = sign(dx);
          if (biDon(e, dt, 2)) { e.state = 'quay'; e.t = 0.3; e.quay = false; e.gia = false; e.trung = false; break; }
          if (e.duoiT > 1.0) { e.state = 'sap'; e.t = da(e, 0.45); e.sap = false; break; }
          if (e.t > 0) break;
          e.gia = false; e.trung = false;
          e.state = boc(e, [
            ['quang', dangBay() ? 0 : v.kc > 160 ? 3 : 2],
            ['lao', v.hoi || e.xaT > 1.2 ? 5 : 2],
            ['goi', quaiCon() ? 0 : p2 ? 2 : 1],
          ]);
          e.t = e.state === 'lao' ? da(e, 0.55) : e.state === 'quang' ? da(e, 0.6) : 0.9;
          e.nem = 0;
          break;
        }
        case 'quang':   // rướn ra sau rồi tung lưới về phía Mầm; pha 2 tung thêm tấm thứ hai lệch nhịp
          ham(5);
          e.dir = sign(dx);
          if (e.t > 0) break;
          if (e.nem === 0 || (e.nem === 1 && p2)) {
            const don = e.nem === 1 ? sign(P.b.vx || dx) * 150 : 0;
            W.netShot(cx + e.dir * 40, cy, P.cx() + don, P.b.y + P.b.h - 20);
            e.nem++; e.t = 0.38; e.gia = false;
          } else { e.state = 'idle'; e.t = 1.25 / fast; }
          break;
        case 'lao':   // rướn lên lấy đà rồi lao chéo xuống qua chỗ Mầm đứng
          if (e.t > 0) { luon(cx - e.dir * 40, cy - 60, 3); e.lao = null; break; }
          if (!e.lao) {
            const tx = P.cx() - cx, ty = P.cy() - cy, d = Math.hypot(tx, ty) || 1;
            e.lao = { x: tx / d * 640 * fast, y: ty / d * 640 * fast, t: 1.05 };
            e.dir = sign(tx);
          }
          e.vx = e.lao.x; e.vy = e.lao.y; e.lao.t -= dt;
          if (e.trung) { e.lao = null; e.vy = -300; e.state = 'idle'; e.t = 0.9 / fast; break; }   // lao trúng Mầm: vút lên lại
          if (e.y + e.h >= day - 2) {   // cắm xuống đất: kẹt lại
            W.shake = 8; W.dust(cx, e.y + e.h, 10);
            e.lao = null; e.vx = e.vy = 0;
            e.state = 'ket'; e.t = p2 ? 0.8 : 1.0; this.soHo(e, e.t);
          } else if (e.lao.t <= 0) { e.lao = null; e.state = 'idle'; e.t = 1.0 / fast; }
          break;
        case 'ket': ham(12); if (e.t <= 0) { e.state = 'idle'; e.t = 0.6; } break;
        case 'quan':   // tự quấn trong lưới của mình: rơi xuống đất, giãy giụa
          e.vx *= Math.exp(-4 * dt);
          e.vy = Math.min(700, e.vy + 1400 * dt);
          if (e.t <= 0) {
            e.state = 'idle'; e.t = 0.7; e.vy = -220;
            W.chips(cx, cy, ['#5f8f6a', '#9fd3a8', '#3d6b8a'], 14, 320);
            W.ring(cx, cy, '#9fd3a8', 120, 0.35, 4);
          }
          break;
        case 'quay': {   // bị chém dồn: quẫy tung các sợi lưới quanh mình, rủ cả xuống dưới (đứng dưới chém lên cũng dính)
          ham(8);
          if (e.t > 0) break;
          const q = this.QUAY;
          if (!e.quay) {
            e.quay = true; e.t = 0.5;
            W.zone(cx - q.rx, cy + q.lech - q.ry, q.rx * 2, q.ry * 2, 0.2, 'quay', 1, cx);
            W.ring(cx, cy + q.lech, '#9fd3a8', 160, 0.35, 6);
            W.chips(cx, cy, ['#5f8f6a', '#9fd3a8', '#3d6b8a'], 16, 420);
            W.shake = 7;
          } else { e.quay = false; e.state = 'idle'; e.t = 0.7; }
          break;
        }
        case 'sap':   // Mầm đứng dưới bụng quá lâu: rũ lưới sập xuống
          ham(6);
          if (e.t > 0) break;
          if (!e.sap) {
            const y0 = e.y + e.h * 0.55;
            e.sap = true; e.t = 0.6;
            W.zone(cx - e.w * 0.42, y0, e.w * 0.84, Math.max(40, day - y0), 0.25, 'sap', 1, cx);
            W.shake = 6;
          } else { e.sap = false; e.state = 'idle'; e.t = 0.8; e.duoiT = 0; }
          break;
        case 'goi':   // gọi Lưới Ma nhỏ tách ra từ người
          ham(5);
          if (e.t <= 0) {
            const con = quaiCon();
            if (con < 2) W.spawnTemp('luoi_ma', cx - 70, cy);
            if (con < 1) W.spawnTemp('luoi_ma', cx + 70, cy);
            if (con < 2) W.burst(cx, cy, '#c49bff', 18);
            e.state = 'idle'; e.t = 0.9;
          }
          break;
      }
      // không bay ra khỏi phòng, không chui xuống đất
      const rw = room.w * T;
      if (e.x < T) { e.x = T; e.vx = Math.abs(e.vx) * 0.4; }
      if (e.x + e.w > rw - T) { e.x = rw - T - e.w; e.vx = -Math.abs(e.vx) * 0.4; }
      if (e.y < T * 0.5) { e.y = T * 0.5; e.vy = Math.abs(e.vy) * 0.4; }
      if (e.y + e.h > day) { e.y = day - e.h; if (e.vy > 0) e.vy = 0; }
    },

    // Boss lộ sơ hở t giây: viền vàng, ăn đòn ×1,5
    soHo(e, t) {
      const W = HSX.World;
      e.open = Math.max(e.open || 0, t);
      W.ring(e.x + e.w / 2, e.y + e.h / 2, '#ffd66e', Math.max(e.w, e.h) * 0.75, 0.4, 5);
      W.text(e.x + e.w / 2, e.y - 16, 'Sơ hở!', '#ffd66e', 17);
      HSX.emit('soho', e);
    },

    // Còn nửa máu: sang pha 2 (Vua Túi Nilon sang pha 2 khi hết lớp túi, xem xeLop)
    pha2(e) {
      const W = HSX.World, ex = e.x + e.w / 2;
      e.phase = 2;
      W.shake = 14;
      W.ring(ex, e.y + e.h / 2, '#c49bff', 340, 1.0, 8);
      W.flash(ex, e.y + e.h / 2, 400, '170,120,255', 0.8);
      if (e.type === 'luoi_ma_khong_lo') {
        e.state = 'roar'; e.t = 1.2; e.lao = null; e.gia = false;
        W.banner('Lưới Ma Khổng Lồ siết chặt!', 'Pha 2: nhanh hơn, hai tấm lưới lệch nhịp');
        W.say(e, 'Ta... không... buông!', 2.4);
      } else W.banner(`${e.def.name} nổi điên!`, 'Pha 2: lao dội tường rồi lao tiếp, đập càng hai nhịp');
    },

    // Vua Túi Nilon mất một lớp túi (chém đủ, hoặc trúng túi bị phản lại); hết lớp thì sang pha 2
    xeLop(e) {
      const W = HSX.World, ex = e.x + e.w / 2;
      e.layers--;
      e.layerHp = e.def.layerHp;
      e.stagger = 0.45;
      W.text(ex, e.y - 10, 'Xé 1 lớp túi!', '#fff27a', 20);
      W.burst(ex, e.y + e.h / 2, '#d8d0ff', 24);
      W.chips(ex, e.y + e.h / 2, e.def.chip, 18, 420);
      W.ring(ex, e.y + e.h / 2, '#e6d5ff', 140, 0.4, 5);
      if (e.layers) return;
      e.phase = 2;
      e.stagger = 0;
      e.open = 0;
      e.state = 'roar'; e.t = 1.2; e.air = false; e.gia = false;
      W.shake = 16;
      W.ring(ex, e.y + e.h / 2, '#c49bff', 360, 1.0, 9);
      W.flash(ex, e.y + e.h / 2, 420, '190,120,255', 0.8);
      W.banner('Vua Túi Nilon nổi giận!', 'Pha 2: nuốt rác nhả Slime, túi rơi như mưa');
      W.say(e, 'Rác ở khắp nơi... Ta còn nhiều lắm!', 2.6);
    },

    // Túi / lưới bị Mầm chém phản lại trúng quái. Vua: xé ngay 1 lớp túi. Lưới Ma: tự quấn mình, rơi xuống đất.
    phanDon(e, loai, P, srcX) {
      const W = HSX.World, dmg = HSX.Calc.weaponDmg() * 2;
      if (e.kind !== 'boss') return this.damage(e, dmg, P, 'phan', srcX);
      HSX.emit('phandon', e);
      W.text(e.x + e.w / 2, e.y - 36, 'Phản đòn!', '#fff6c8', 19);
      if (e.type === 'vua_nilon' && e.layers > 0) {
        e.flash = 0.12;
        this.xeLop(e);
        if (e.layers) this.soHo(e, 1.2);
        return 'hit';
      }
      if (e.type === 'luoi_ma_khong_lo' && loai === 'net') {
        e.state = 'quan'; e.t = 1.6; e.lao = null; e.nem = 0; e.vy = 120; e.sap = false; e.quay = false;
        this.soHo(e, 1.9);
      } else this.soHo(e, 1.0);
      return this.damage(e, dmg, P, 'phan', srcX);
    },

    // Kết quả: 'block' (vỏ đỡ), 'giap' (boss đang thủ thế: chỉ ăn 40% đòn), 'hit', 'dead'.
    // dir: 'side' | 'up' | 'down' | 'slam' | 'ban' (hạt ná) | 'phan' (túi, lưới bị chém phản lại: giáp không chặn).
    // srcX: chỗ đòn tới, để biết đánh trước mặt hay sau lưng (mặc định là chỗ Mầm đứng)
    damage(e, dmg, P, dir, srcX) {
      const W = HSX.World, ex = e.x + e.w / 2, from = sign((srcX === undefined ? P.cx() : srcX) - ex);
      const exposed = e.open > 0 || e.state === 'rest';
      // đòn trúng boss báo cho nhật ký trận (js/ghi_tran.js): kiểu 'vo' (vỏ đỡ) | 'giap' | 'soho' | 'vuongMien' | 'phan'
      const bao = (kieu, n) => { if (e.kind === 'boss') HSX.emit('trungboss', { kieu, dmg: n, dir, mau: Math.max(0, e.hp), lop: e.layers || 0 }); };
      if (e.def.shell && (dir === 'side' || dir === 'ban') && from === e.dir && !exposed) {
        e.flash = 0.06;
        W.spark(ex + from * e.w / 2, e.y + e.h / 2, '#ffffff');
        W.text(ex, e.y - 6, 'Keng!', '#e8edf2');
        if (dir === 'side') P.b.vx = -P.face * 280;
        bao('vo', 0);
        return 'block';
      }
      let ket = 'hit', kieu = 'phan';
      if (e.kind === 'boss' && dir !== 'phan') {
        const vuongMien = e.type === 'vua_nilon' && dir === 'down' && P.b.y + P.b.h < e.y + e.h * 0.4;
        if (e.open > 0) { dmg *= 1.5; kieu = 'soho'; }
        else if (vuongMien) { W.text(ex, e.y - 18, 'Trúng vương miện!', '#ffe08a', 16); kieu = 'vuongMien'; }
        else {
          dmg *= 0.4;
          ket = kieu = 'giap';
          e.don = (e.don || 0) + 1;
          const now = HSX.S.stats.time;
          if (!(now - e.giapLuc < 1.6)) { e.giapLuc = now; W.text(ex, e.y - 8, 'Giáp', '#cfd3e0', 14); }
          HSX.emit('giap', e);
        }
        // Cua Lon Khổng Lồ bị chém sau lưng 2 nhát (lúc không sơ hở): quay ngoắt lại kẹp
        if (e.type === 'cua_khong_lo' && from !== e.dir && e.open <= 0 && dir !== 'ban' && ['walk', 'raise', 'windup'].includes(e.state)) {
          e.sauLung = (e.sauLung || 0) + 1;
          if (e.sauLung >= 2) { e.dir = from; this.cuaRa(e, 'kep'); e.t = 0.22; e.gia = false; }
        }
      }
      e.flash = 0.12;
      // làm tròn sau mỗi đòn: 120 - 25 × 4,8 phải ra đúng 0 chứ không phải 0,00000000000001 (boss "còn 0 máu" mà chưa chết)
      const tru = (v, n) => Math.round((v - n) * 1e6) / 1e6;
      if (e.layers > 0) {
        e.layerHp = tru(e.layerHp, dmg);
        if (e.layerHp <= 0) this.xeLop(e);
        bao(kieu, dmg);
        return ket;
      }
      e.hp = tru(e.hp, dmg);
      bao(kieu, dmg);
      if (e.kind === 'boss' && e.phase === 1 && e.type !== 'vua_nilon' && e.hp > 0 && e.hp <= e.maxHp / 2) this.pha2(e);
      if (e.kind === 'enemy') {
        e.knock = 0.14;
        e.vx = -from * 240;
        if (e.def.fly) e.vy = -60;
      }
      if (e.hp <= 0) { W.killEnemy(e); return 'dead'; }
      return ket;
    },
  };
})();
