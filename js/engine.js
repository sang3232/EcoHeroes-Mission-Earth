/* Lõi: đọc điều khiển (bàn phím, tay cầm, cảm ứng) và va chạm với lưới ô */
(function () {
  const T = HSX.T;
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash', KeyK: 'dash',
    KeyF: 'heal', KeyL: 'heal', KeyV: 'skill', KeyI: 'skill',
    KeyE: 'interact', Escape: 'menu', Tab: 'inventory', KeyM: 'map',
  };
  // Tay cầm chuẩn: A nhảy, X chém, RB/RT lướt, B hồi, Y phép, Start menu, Select bản đồ, D-pad
  const PAD = { 0: 'jump', 2: 'attack', 5: 'dash', 7: 'dash', 1: 'heal', 3: 'skill', 9: 'menu', 8: 'map', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };

  // hit: hành động vừa bấm, giữ tới hết bước vật lý kế tiếp để không lỡ cú bấm nhanh
  // mouse, aim: vị trí chuột trên khung nhìn 960×540 (aim là chỗ bấm chém gần nhất)
  // device: thiết bị dùng gần nhất ('pc' bàn phím/chuột, 'pad' tay cầm, 'touch' cảm ứng), để hướng dẫn hiện đúng nút
  HSX.Input = {
    hit: {}, key: {}, pad: {}, touch: {}, padPrev: {}, usingTouch: false, device: 'pc',
    mouse: { x: 0, y: 0, t: -1e9 }, aim: null,

    init() {
      const cv = document.getElementById('game');
      const view = e => {
        const r = cv.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width * HSX.VW, y: (e.clientY - r.top) / r.height * HSX.VH };
      };
      addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        Object.assign(this.mouse, view(e), { t: performance.now() });
        this.device = 'pc';
      });
      // Chuột ra khỏi màn chơi thì thôi lia camera theo nó
      cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.mouse.t = -1e9; });
      // Bấm chuột trái lên màn chơi: chém về phía con trỏ. Chạm màn chơi (cảm ứng): 'tap', dùng để qua lời thoại
      cv.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'mouse') { this.hit.tap = true; return; }
        if (e.button !== 0) return;
        e.preventDefault();
        this.aim = view(e);
        Object.assign(this.mouse, this.aim, { t: performance.now() });
        this.hit.attack = this.hit.mouseAtk = true;
        this.usingTouch = false;
      });
      addEventListener('keydown', e => {
        const a = KEYS[e.code];
        if (!a || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
        e.preventDefault();
        if (!this.key[e.code]) this.hit[a] = true;
        this.key[e.code] = a;
        this.usingTouch = false;
        this.device = 'pc';
      });
      addEventListener('keyup', e => { delete this.key[e.code]; });
      addEventListener('blur', () => this.clear());
    },

    down(a) {
      for (const c in this.key) if (this.key[c] === a) return true;
      return !!(this.pad[a] || this.touch[a]);
    },
    pressed(a) { return !!this.hit[a]; },
    consume(a) { delete this.hit[a]; },
    step() { this.hit = {}; },
    clear() { this.hit = {}; this.key = {}; this.touch = {}; },

    poll() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let p = null;
      for (const x of pads || []) if (x) { p = x; break; }
      const now = {};
      if (p) {
        p.buttons.forEach((b, i) => { if (b.pressed && PAD[i]) now[PAD[i]] = true; });
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (ax < -0.4) now.left = true;
        if (ax > 0.4) now.right = true;
        if (ay < -0.5) now.up = true;
        if (ay > 0.5) now.down = true;
        for (const a in now) if (!this.padPrev[a]) this.hit[a] = true;
        if (Object.keys(now).length) this.device = 'pad';
      }
      this.padPrev = now;
      this.pad = now;
    },

    setTouch(a, on) {
      if (on && !this.touch[a]) this.hit[a] = true;
      if (on) this.touch[a] = true; else delete this.touch[a];
      this.usingTouch = true;
      this.device = 'touch';
    },
  };

  // Vật thể: { x, y, w, h, vx, vy } (x, y là góc trên trái). room cung cấp solid(tx, ty) và oneWay(tx, ty, vật)
  HSX.Phys = {
    overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },

    // Đi trục X rồi trục Y, chặn bởi ô đặc. Bục nhảy xuyên chỉ chặn khi rơi xuống từ phía trên.
    move(b, room, dt) {
      b.ground = false;
      b.wallL = b.wallR = b.ceil = false;
      const dx = b.vx * dt;
      if (dx) {
        b.x += dx;
        const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
        const tx = dx > 0 ? Math.floor((b.x + b.w - 0.01) / T) : Math.floor(b.x / T);
        for (let ty = y0; ty <= y1; ty++) {
          if (!room.solid(tx, ty)) continue;
          if (dx > 0) { b.x = tx * T - b.w; b.wallR = true; } else { b.x = (tx + 1) * T; b.wallL = true; }
          b.vx = 0;
          break;
        }
      }
      const dy = b.vy * dt;
      if (dy) {
        const bottom0 = b.y + b.h;
        b.y += dy;
        const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
        if (dy > 0) {
          const ty = Math.floor((b.y + b.h - 0.01) / T);
          for (let tx = x0; tx <= x1; tx++) {
            const one = !b.drop && bottom0 <= ty * T + 1 && room.oneWay(tx, ty, b);
            if (room.solid(tx, ty) || one) { b.y = ty * T - b.h; b.vy = 0; b.ground = true; break; }
          }
        } else {
          const ty = Math.floor(b.y / T);
          for (let tx = x0; tx <= x1; tx++) {
            if (room.solid(tx, ty)) { b.y = (ty + 1) * T; b.vy = 0; b.ceil = true; break; }
          }
        }
      }
    },

    // Phía trước dưới chân có chỗ đứng không (quái quay đầu ở mép vực)
    groundAhead(b, room, dir) {
      const tx = Math.floor((dir > 0 ? b.x + b.w + 2 : b.x - 2) / T), ty = Math.floor((b.y + b.h + 2) / T);
      return room.solid(tx, ty) || room.oneWay(tx, ty, b);
    },
    wallAhead(b, room, dir) {
      const tx = Math.floor((dir > 0 ? b.x + b.w + 2 : b.x - 2) / T);
      return room.solid(tx, Math.floor((b.y + b.h - 6) / T)) || room.solid(tx, Math.floor((b.y + 6) / T));
    },

    // Gọi fn(tx, ty) cho mọi ô mà hình chữ nhật chạm vào
    eachTile(r, fn) {
      const x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 0.01) / T);
      const y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (fn(tx, ty) === true) return true;
      return false;
    },
  };
})();
