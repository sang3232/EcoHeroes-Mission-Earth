/* Mầm — nhân vật người chơi điều khiển */
(function () {
  const T = HSX.T, Phys = HSX.Phys, IN = HSX.Input, Calc = HSX.Calc;
  const KHOA = { pressed: () => false, down: () => false, aim: null };   // đang diễn cảnh truyện: không nhận phím
  const C = {
    ACC: 3400, AIR: 2600, GRAV: 2400, FALL: 900, JUMP: 800, CUT: 2.7,
    COYOTE: 0.1, BUF: 0.12,
    DASH: 880, DASH_T: 0.17, DASH_CD: 0.4,
    ATK_T: 0.26, ATK_CD: 0.34, POGO: 640,
    HURT_T: 0.25, INV: 1.1, HEAL_T: 0.9, SLAM: 1100,
  };
  const approach = (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d));

  const P = HSX.Player = {
    C,
    b: { x: 0, y: 0, w: 26, h: 44, vx: 0, vy: 0 },
    face: 1, coyote: 0, buf: 0, atkBuf: 0, dashT: 0, dashCd: 0, dashDir: 1, airDash: true,
    atkT: 0, atkCd: 0, atkDir: 'side', atkAng: 0, atkAim: null, atkDone: false, pogoT: 0,
    inv: 0, hurtT: 0, healT: 0, slam: false, carry: null, anim: 0,
    airT: 0, landT: 1, step: 0, dustT: 0,   // cho hoạt ảnh: thời gian trên không, từ lúc tiếp đất, quãng đường chạy, nhịp bụi chân
    safe: null, safeT: 0, lookT: 0, look: 0, shieldT: 0, trail: [],
    troi: 0,   // bị lưới quấn (giây còn lại): không chạy nhảy được, bấm chém / nhảy liên tục để thoát nhanh
    nam: 0,    // 1 = nằm (cảnh mở đầu), 0 = đứng

    cx() { return this.b.x + this.b.w / 2; },
    cy() { return this.b.y + this.b.h / 2; },

    place(x, y, vx, vy) {
      const b = this.b;
      b.x = x; b.y = y; b.vx = vx || 0; b.vy = vy || 0;
      b.ground = false;
      this.dashT = 0; this.atkT = 0; this.slam = false; this.healT = 0; this.carry = null; this.hurtT = 0; this.nudgeT = 0; this.troi = 0;
      this.safe = { x, y };
    },

    update(dt, room) {
      const b = this.b, S = HSX.S, W = HSX.World, I = HSX.Truyen && HSX.Truyen.active() ? KHOA : IN;
      this.anim += dt;
      if (b.ground) { this.coyote = C.COYOTE; this.airDash = true; } else this.coyote -= dt;
      this.buf -= dt; this.atkBuf -= dt; this.dashCd -= dt; this.atkCd -= dt; this.inv -= dt; this.hurtT -= dt; this.pogoT -= dt;
      if (Calc.charmOn('khien_lon')) this.shieldT -= dt;
      // Bị lưới quấn: vùng vẫy (chém, nhảy, lướt) để thoát nhanh hơn
      if (this.troi > 0) {
        this.troi -= dt;
        if (I.pressed('attack') || I.pressed('jump') || I.pressed('dash')) {
          this.troi -= 0.28;
          W.chips(this.cx(), this.cy(), ['#5f8f6a', '#9fd3a8', '#3d6b8a'], 3, 160);
        }
        if (this.troi <= 0) { this.troi = 0; W.burst(this.cx(), this.cy(), '#9fd3a8', 14); W.ring(this.cx(), this.cy(), '#bff5d6', 50, 0.3, 3); HSX.emit('thoat'); }
      } else {
        if (I.pressed('jump')) this.buf = C.BUF;
        if (I.pressed('attack')) { this.atkBuf = C.BUF; this.atkAim = I.pressed('mouseAtk') ? I.aim : null; }
      }
      b.boat = !!S.owned.xuong_phao;
      b.drop = Math.max(0, (b.drop || 0) - dt);

      const L = I.down('left'), R = I.down('right'), U = I.down('up'), Dn = I.down('down');
      const ctrl = this.hurtT <= 0 && !this.slam && this.troi <= 0 && this.nam <= 0;
      let mx = ctrl ? (R ? 1 : 0) - (L ? 1 : 0) : 0;

      // Hồi máu (Hoa Sen): đứng yên giữ nút Hồi
      const canHeal = S.spirits.sen && b.ground && this.atkT <= 0 && !this.carry && S.energy >= 33 && S.hp < Calc.maxHp();
      if (canHeal && ctrl && mx === 0 && I.down('heal')) {
        this.healT += dt;
        // cánh hoa sen xoáy vào người Mầm
        if (Math.random() < dt * 22) {
          const a = Math.random() * 6.283, r = 46 + Math.random() * 16;
          W.fxp({ k: 'leaf', x: this.cx() + Math.cos(a) * r, y: this.cy() + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.2, vy: -Math.sin(a) * r * 2.2,
            life: 0.45, r: 4 + Math.random() * 2, rot: a, vr: 9, color: Math.random() < 0.5 ? '#ff9cc8' : '#9ff0b5' });
        }
        if (this.healT >= C.HEAL_T) {
          this.healT = 0;
          S.energy -= 33;
          S.hp++;
          W.burst(this.cx(), b.y + 10, '#ff9cc8', 18);
          W.ring(this.cx(), this.cy(), '#ff9cc8', 70, 0.4, 4);
          W.flash(this.cx(), this.cy(), 200, '255,156,200', 0.4);
          W.text(this.cx(), b.y - 10, '+1 🍃', '#9ff0b5');
          HSX.emit('heal');
        }
      } else if (this.healT > 0) this.healT = 0;
      if (this.healT > 0) mx = 0;

      // Lướt (Gió)
      if (ctrl && I.pressed('dash') && S.spirits.gio && this.dashCd <= 0 && (b.ground || this.airDash) && !this.carry && this.healT <= 0) {
        this.dashT = C.DASH_T;
        this.dashCd = C.DASH_CD;
        if (!b.ground) this.airDash = false;
        this.dashDir = mx || this.face;
        this.face = this.dashDir;
        this.atkT = 0;
        // vệt gió phía sau
        for (let k = 0; k < 6; k++) {
          W.fxp({ k: 'streak', x: this.cx(), y: b.y + 6 + Math.random() * (b.h - 12), vx: -this.dashDir * (500 + Math.random() * 400), vy: 0,
            drag: 5, life: 0.22, r: 1.6, color: '#bff5d6', add: true });
        }
        HSX.emit('dash');
      }

      if (this.dashT > 0) {
        this.dashT -= dt;
        b.vx = this.dashDir * C.DASH;
        b.vy = 0;
        this.trail.push({ x: this.cx(), y: b.y + b.h, f: this.face, a: 0.5 });
      } else {
        this.nudgeT -= dt;
        if (this.hurtT <= 0 && !(this.nudgeT > 0 && mx === 0)) b.vx = approach(b.vx, mx * Calc.runSpeed(), (b.ground ? C.ACC : C.AIR) * dt);
        if (mx && this.atkT <= 0) this.face = mx;
        // Nhảy, hoặc ↓ + nhảy để xuống khỏi bục
        if (ctrl && this.buf > 0 && (b.ground || this.coyote > 0)) {
          this.buf = 0;
          this.coyote = 0;
          if (Dn && b.ground && room.onOneWay(b)) { b.drop = 0.25; b.y += 2; }
          else { b.vy = -C.JUMP; W.dust(this.cx(), b.y + b.h, 4); HSX.emit('jump'); }
        }
        if (this.slam) b.vy = C.SLAM;
        else {
          let g = C.GRAV;
          if (b.vy < 0 && !I.down('jump') && this.pogoT <= 0) g *= C.CUT;
          b.vy = Math.min(C.FALL, b.vy + g * dt);
        }
      }
      this.trail.forEach(t => { t.a -= dt * 2.5; });
      this.trail = this.trail.filter(t => t.a > 0);

      // Chém: ↑ chém lên, ↓ khi đang nhảy thì chém xuống (bật nảy). Bấm chuột thì chém về phía con trỏ.
      // Đang vác rác thì ném.
      if (ctrl && this.atkBuf > 0 && this.atkCd <= 0 && this.dashT <= 0 && this.healT <= 0) {
        this.atkBuf = 0;
        if (this.atkAim) this.aimAt(this.atkAim, W.cam);
        if (this.carry) W.throwCarry(this);
        else {
          this.atkT = C.ATK_T;
          this.atkCd = C.ATK_CD;
          if (!this.atkAim) {
            this.atkDir = U ? 'up' : Dn && !b.ground ? 'down' : 'side';
            this.atkAng = this.atkDir === 'up' ? -Math.PI / 2 : this.atkDir === 'down' ? Math.PI / 2 : this.face > 0 ? 0 : Math.PI;
          }
          this.atkDone = false;
          HSX.emit('attack', { dir: this.atkDir, chuot: !!this.atkAim });
        }
        this.atkAim = null;
      }
      if (this.atkT > 0) {
        this.atkT -= dt;
        if (!this.atkDone && this.atkT < C.ATK_T - 0.04) {
          this.atkDone = true;
          const res = W.attack(this.atkBox(), this.atkDir);
          if (res.pogo) { b.vy = -C.POGO; this.airDash = true; this.pogoT = 0.18; HSX.emit('pogo'); }
          else if (res.hit && this.atkDir === 'side') b.vx -= this.face * 150;
        }
      }

      // Đập xuống (Gấu)
      if (ctrl && I.pressed('skill') && !this.carry) {
        if (!S.spirits.gau) W.hint('skill', 'Chưa có kỹ năng. Hãy giải cứu tinh linh Gấu Rừng.');
        else if (S.energy < 33) W.hint('energy', 'Cần 33 năng lượng: chém trúng quái để tích năng lượng.');
        else {
          S.energy -= 33;
          if (b.ground) W.slamImpact(this);
          else { this.slam = true; b.vx = 0; this.dashT = 0; }
        }
      }

      const wasGround = b.ground, fallV = b.vy;
      Phys.move(b, room, dt);
      if (b.ground && !wasGround) {
        if (this.slam) { this.slam = false; W.slamImpact(this); }
        else if (fallV > 500) { W.dust(this.cx(), b.y + b.h, 6); if (fallV > 800) W.ring(this.cx(), b.y + b.h - 2, '#e8dcc0', 40, 0.25, 2); }
        if (fallV > 300) this.landT = 0;
      }
      this.landT += dt;
      this.airT = b.ground ? 0 : this.airT + dt;
      if (b.ground) this.step += Math.abs(b.vx) * dt;
      // bụi dưới chân khi chạy nhanh
      this.dustT -= dt;
      if (b.ground && Math.abs(b.vx) > 220 && this.dustT <= 0) { W.dust(this.cx() - this.face * 8, b.y + b.h, 1); this.dustT = 0.17; }

      // Chỗ đứng an toàn gần nhất để quay lại khi chạm gai / nước độc
      if (b.ground && !room.hazardNear(b)) {
        this.safeT += dt;
        if (this.safeT > 0.15) this.safe = { x: b.x, y: b.y };
      } else this.safeT = 0;

      // Giữ ↑ / ↓ khi đứng yên để nhìn lên / xuống
      if (b.ground && mx === 0 && (U || Dn) && this.atkT <= 0 && this.healT <= 0) this.lookT += dt; else this.lookT = 0;
      const want = this.lookT > 0.45 ? (U ? -150 : 150) : 0;
      this.look += (want - this.look) * Math.min(1, dt * 5);

      // Tương tác: ↑ hoặc E khi đứng trên mặt đất
      if (b.ground && this.atkT <= 0 && this.troi <= 0 && (I.pressed('interact') || (I.pressed('up') && !I.down('attack')))) W.interact();
    },

    // Hướng chém theo góc từ Mầm tới chỗ bấm chuột (toạ độ khung nhìn + camera).
    // Nón ±50° quanh phương thẳng đứng là chém lên / chém xuống (chém xuống chỉ khi đang nhảy), còn lại chém ngang.
    // Đòn vẫn nghiêng theo chuột trong giới hạn của từng hướng.
    aimAt(p, cam) {
      const dx = p.x + cam.x - this.cx(), dy = p.y + cam.y - (this.b.y + this.b.h / 2 - 4);
      const a = Math.atan2(dy, dx), cone = 0.87, tilt = 0.6;
      if (Math.abs(dx) > 4) this.face = dx > 0 ? 1 : -1;
      if (Math.abs(a + Math.PI / 2) < cone) {
        this.atkDir = 'up';
        this.atkAng = HSX.clamp(a, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
      } else if (Math.abs(a - Math.PI / 2) < cone && !this.b.ground) {
        this.atkDir = 'down';
        this.atkAng = HSX.clamp(a, Math.PI / 2 - 0.45, Math.PI / 2 + 0.45);
      } else {
        this.atkDir = 'side';
        const k = HSX.clamp(Math.atan2(dy, dx * this.face), -tilt, tilt);   // góc so với phương ngang phía trước
        this.atkAng = this.face > 0 ? k : Math.PI - k;
      }
    },

    // Hộp đòn chém: tâm nằm trên tia từ ngực Mầm theo góc chém, cỡ theo hướng
    atkBox() {
      const b = this.b, r = Calc.reach(), a = this.atkAng;
      const px = b.x + b.w / 2, py = b.y + b.h / 2 - 4;
      const [d, w, h] = this.atkDir === 'up' ? [38 * r + 13, 80, 76 * r + 10]
        : this.atkDir === 'down' ? [35 * r + 18, 72, 70 * r]
        : [39 * r + 9, 78 * r, b.h + 16];
      const cx = px + Math.cos(a) * d, cy = py + Math.sin(a) * d;
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    },

    // Trả về true nếu thật sự mất máu
    hurt(n, fromX, hazard) {
      const S = HSX.S, W = HSX.World, b = this.b;
      if (!hazard && (this.inv > 0 || HSX.DEBUG_GOD)) return false;
      if (!hazard && Calc.charmOn('khien_lon') && this.shieldT <= 0) {
        this.shieldT = 20;
        this.inv = 0.6;
        W.burst(this.cx(), this.cy(), '#9fd3ff', 16);
        W.text(this.cx(), b.y - 12, 'Khiên chặn!', '#9fd3ff');
        return false;
      }
      if (HSX.DEBUG_GOD) return false;
      S.hp -= n;
      this.inv = C.INV;
      this.hurtT = C.HURT_T;
      this.healT = 0;
      this.slam = false;
      this.dashT = 0;
      if (this.carry) W.dropCarry(this);
      const dir = this.cx() < fromX ? -1 : 1;
      b.vx = dir * 300;
      b.vy = -380;
      W.hitstop = 0.09;
      W.shake = 10;
      W.hurtT = 0.45;   // màn hình chớp đỏ ở viền
      W.kick.x += dir * 7;
      W.burst(this.cx(), this.cy(), '#ffffff', 12);
      W.ring(this.cx(), this.cy(), '#ff8080', 60, 0.3, 4);
      if (S.hp <= 0) W.die();
      return true;
    },
  };
})();
