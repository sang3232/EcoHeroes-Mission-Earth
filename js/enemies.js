/* Quái, mini-boss Cua Lon Khổng Lồ và boss Vua Túi Nilon */
(function () {
  const D = HSX.DATA, T = HSX.T, Phys = HSX.Phys;
  const GRAV = 2000;
  const sign = v => (v < 0 ? -1 : 1);

  const E = HSX.Enemies = {
    create(type, tx, ty, idx, temp) {
      const d = D.enemies[type];
      return {
        kind: 'enemy', type, def: d, idx, temp: !!temp, img: type,
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
        dir: -1, state: 'sleep', t: 0, flash: 0, knock: 0, dead: false, active: false, phase: 1, act: 0, ph: 0, squash: 0,
      };
    },

    update(e, dt, room, P) {
      if (e.dead) return;
      e.flash = Math.max(0, e.flash - dt);
      e.squash = Math.max(0, e.squash - dt * 3);
      e.ph += dt;
      if (e.kind === 'boss') { if (e.type === 'cua_khong_lo') this.crabBoss(e, dt, room, P); else this.kingBoss(e, dt, room, P); }
      else if (e.knock > 0) e.knock -= dt;
      else this[e.def.ai](e, dt, room, P);
      if (e.def.fly) { e.x += e.vx * dt; e.y += e.vy * dt; }
      else { e.vy = Math.min(900, e.vy + GRAV * dt); Phys.move(e, room, dt); }
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

    // Slime Nilon: nhảy cóc về phía Mầm
    hopper(e, dt, room, P) {
      const d = e.def, dx = P.cx() - (e.x + e.w / 2);
      if (!e.ground) return;
      e.vx *= 0.7;
      e.t -= dt;
      if (e.t <= 0) {
        e.dir = Math.abs(dx) < 420 ? sign(dx) : (Math.random() < 0.5 ? -1 : 1);
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

    // Mini-boss: đi tới, giơ càng đập (sóng chấn), hoặc lấy đà lao ngang; đâm tường thì choáng, lộ bụng
    crabBoss(e, dt, room, P) {
      const W = HSX.World, dx = P.cx() - (e.x + e.w / 2);
      if (!e.active) { e.vx = 0; return; }
      e.t -= dt;
      switch (e.state) {
        case 'sleep': e.state = 'walk'; e.t = 1.2; break;
        case 'walk':
          e.dir = sign(dx);
          e.vx = e.dir * 85;
          if (Math.abs(dx) < 150 && e.t < 0.9) { e.state = 'raise'; e.t = 0.5; e.vx = 0; }
          else if (e.t <= 0) { e.state = 'windup'; e.t = 0.65; e.vx = 0; }
          break;
        case 'raise':
          e.vx = 0;
          if (e.t <= 0) {
            W.shake = 10;
            W.wave(e.x + e.w / 2, e.y + e.h, -1, 340);
            W.wave(e.x + e.w / 2, e.y + e.h, 1, 340);
            e.state = 'walk'; e.t = 1.6;
          }
          break;
        case 'windup': e.vx = 0; if (e.t <= 0) { e.state = 'charge'; e.t = 2.2; } break;
        case 'charge':
          e.vx = e.dir * 470;
          if (e.wallL || e.wallR || e.t <= 0) { W.shake = 14; e.state = 'stun'; e.t = 1.8; e.vx = 0; W.burst(e.x + (e.dir > 0 ? e.w : 0), e.y + e.h / 2, '#c9ccd1', 20); }
          break;
        case 'stun': e.vx = 0; if (e.t <= 0) { e.state = 'walk'; e.t = 1.6; } break;
      }
    },

    // Boss: ném túi bay đuổi theo, nhảy đập đất tạo sóng chấn, lao ngang. Pha 2 nhanh hơn và gọi Slime.
    kingBoss(e, dt, room, P) {
      const W = HSX.World, dx = P.cx() - (e.x + e.w / 2), fast = e.phase === 2 ? 1.3 : 1;
      if (!e.active) { e.vx = 0; return; }
      e.t -= dt;
      switch (e.state) {
        case 'sleep': e.state = 'intro'; e.t = 1.4; break;
        case 'intro': e.vx = 0; if (e.t <= 0) { e.state = 'idle'; e.t = 0.6; } break;
        case 'idle': {
          e.vx = 0;
          e.dir = sign(dx);
          if (e.t > 0) break;
          const acts = e.phase === 2 ? ['throw', 'leap', 'charge', 'summon'] : ['throw', 'leap', 'charge'];
          e.state = acts[e.act++ % acts.length];
          e.t = e.state === 'leap' ? 0.35 : 0.6;
          break;
        }
        case 'throw':
          e.vx = 0;
          if (e.t <= 0) {
            const n = e.phase === 2 ? 4 : 3;
            for (let k = 0; k < n; k++) W.bag(e.x + e.w / 2 + (k - (n - 1) / 2) * 30, e.y + 20);
            e.state = 'idle'; e.t = 1.3 / fast;
          }
          break;
        case 'leap':
          if (e.t > 0) { e.vx = 0; break; }
          if (e.ground && !e.air) { e.vx = HSX.clamp(dx / 0.9, -520, 520); e.vy = -1150; e.air = true; e.ground = false; }
          else if (e.air && e.ground) {
            e.air = false; e.vx = 0;
            W.shake = 14;
            W.wave(e.x + e.w / 2, e.y + e.h, -1, 380 * fast);
            W.wave(e.x + e.w / 2, e.y + e.h, 1, 380 * fast);
            e.state = 'idle'; e.t = 1.1 / fast;
          }
          break;
        case 'charge':
          if (e.t > 0) { e.vx = 0; break; }
          e.vx = e.dir * 520 * fast;
          if (e.wallL || e.wallR) { W.shake = 10; e.vx = 0; e.state = 'idle'; e.t = 1.0 / fast; }
          break;
        case 'summon':
          e.vx = 0;
          if (e.t <= 0) {
            if (W.enemies.filter(x => x.temp && !x.dead).length < 3) {
              W.spawnTemp('slime_nilon', e.x - 30, e.y + e.h - 40);
              W.spawnTemp('slime_nilon', e.x + e.w + 10, e.y + e.h - 40);
            }
            e.state = 'idle'; e.t = 0.8;
          }
          break;
      }
    },

    // Kết quả: 'block' (vỏ đỡ), 'hit', 'dead'
    damage(e, dmg, P, dir) {
      const W = HSX.World, ex = e.x + e.w / 2, from = sign(P.cx() - ex);
      const exposed = e.state === 'rest' || e.state === 'stun' || e.state === 'raise';
      if (e.def.shell && dir === 'side' && from === e.dir && !exposed) {
        e.flash = 0.06;
        W.spark(ex + from * e.w / 2, e.y + e.h / 2, '#ffffff');
        W.text(ex, e.y - 6, 'Keng!', '#e8edf2');
        P.b.vx = -P.face * 280;
        return 'block';
      }
      e.flash = 0.12;
      if (e.layers > 0) {
        e.layerHp -= dmg;
        if (e.layerHp <= 0) {
          e.layers--;
          e.layerHp = e.def.layerHp;
          W.text(ex, e.y - 10, 'Xé 1 lớp túi!', '#fff27a', 20);
          W.burst(ex, e.y + e.h / 2, '#d8d0ff', 24);
          if (!e.layers) { e.phase = 2; W.banner('Vua Túi Nilon nổi giận!', 'Pha 2'); }
        }
        return 'hit';
      }
      e.hp -= dmg;
      if (e.kind === 'enemy') {
        e.knock = 0.14;
        e.vx = -from * 240;
        if (e.def.fly) e.vy = -60;
      }
      if (e.hp <= 0) { W.killEnemy(e); return 'dead'; }
      return 'hit';
    },
  };
})();
