/* Lõi: đọc điều khiển (bàn phím, tay cầm, cảm ứng) và va chạm với lưới ô */
(function () {
  const T = HSX.T;
  // Hai bộ phím sẵn và bộ Tùy chỉnh (Cài đặt → Điều khiển, lưu ở HSX.opt.boPhim):
  // 'chuot' bàn phím + chuột: A D chạy, W S nhìn, Space nhảy, chuột trái chém, chuột phải giữ ngắm thả bắn ná, Shift lướt,
  //         F giữ hồi máu, Q đập xuống, E tương tác.
  // 'phim'  chỉ bàn phím (kiểu Hollow Knight): phím mũi tên chạy / nhìn / chọn hướng, Z nhảy, X chém, C lướt,
  //         A giữ hồi máu, S đập xuống, D giữ ngắm thả bắn ná, ↑ tương tác.
  // 'rieng' tùy chỉnh: HSX.opt.phimRieng = { hành động: [ô 1, ô 2] }, mỗi ô là KeyboardEvent.code, hoặc 'Mouse0' (chuột trái),
  //         'Mouse1' (chuột giữa), 'Mouse2' (chuột phải); null là ô trống.
  // Hai bộ sẵn: phím mũi tên chạy / nhìn, chuột trái chém, chuột phải bắn. Tab, M, Esc cố định ở mọi bộ.
  // Nút chuột gán cho chém, bắn thì ngắm theo con trỏ.
  const CO_DINH = { Escape: 'menu', Tab: 'inventory', KeyM: 'map' };
  const MUI_TEN = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  const CHUOT = { Mouse0: 'attack', Mouse2: 'shoot' };
  const BO_PHIM = {
    chuot: { KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down', Space: 'jump', ShiftLeft: 'dash', ShiftRight: 'dash', KeyF: 'heal', KeyQ: 'skill', KeyE: 'interact' },
    phim: { KeyZ: 'jump', Space: 'jump', KeyX: 'attack', KeyC: 'dash', KeyA: 'heal', KeyS: 'skill', KeyD: 'shoot', KeyE: 'interact' },
  };
  // Hành động đổi phím được (thứ tự hiện trong Cài đặt) và tên gọi
  const DOI_DUOC = ['left', 'right', 'up', 'down', 'jump', 'attack', 'shoot', 'dash', 'heal', 'skill', 'interact'];
  const TEN_HD = { left: 'Chạy trái', right: 'Chạy phải', up: 'Lên', down: 'Xuống', jump: 'Nhảy', attack: 'Chém', shoot: 'Bắn ná',
    dash: 'Lướt', heal: 'Hồi máu', skill: 'Đập xuống', interact: 'Tương tác' };
  // Bảng phím → hành động của bộ bo (mặc định bộ đang dùng)
  function banPhim(bo) {
    bo = bo || HSX.opt.boPhim;
    if (bo === 'rieng' && HSX.opt.phimRieng) {
      const r = HSX.opt.phimRieng, m = {};
      DOI_DUOC.forEach(a => (r[a] || []).forEach(c => { if (c && !m[c]) m[c] = a; }));
      return m;
    }
    return Object.assign({}, BO_PHIM[bo] || BO_PHIM.chuot, CHUOT, MUI_TEN);
  }
  const hanhDong = code => CO_DINH[code] || banPhim()[code];
  // Chưa chọn bộ phím lần nào: phím đầu tiên chỉ một bộ có (Z X C, hoặc Shift F Q W, bấm chuột) quyết định bộ phím
  const DOAN = { KeyZ: 'phim', KeyX: 'phim', KeyC: 'phim', ShiftLeft: 'chuot', ShiftRight: 'chuot', KeyF: 'chuot', KeyQ: 'chuot', KeyW: 'chuot', chuot: 'chuot' };
  function doanBoPhim(code) {
    const bo = DOAN[code];
    if (HSX.opt.boPhimChon || !bo) return;
    HSX.opt.boPhimChon = true;
    if (bo !== HSX.opt.boPhim) {
      HSX.opt.boPhim = bo;
      if (HSX.UI) HSX.UI.toast(bo === 'phim' ? '⌨️ Bộ phím Chỉ bàn phím: ← → chạy, Z nhảy, X chém, C lướt, A hồi, S đập, D bắn. Đổi trong Cài đặt.' : '🖱️ Bộ phím Bàn phím + chuột. Đổi trong Cài đặt.', '', 6000);
    }
    HSX.saveOpt();
  }
  // Tay cầm chuẩn: A nhảy, X chém, RB/RT lướt, B hồi, Y đập xuống, LB/LT giữ ngắm thả bắn ná (cần phải chọn hướng),
  // Start menu, Select bản đồ, D-pad
  const PAD = { 0: 'jump', 2: 'attack', 5: 'dash', 7: 'dash', 1: 'heal', 3: 'skill', 4: 'shoot', 6: 'shoot', 9: 'menu', 8: 'map', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  // Tên phím để hiện trong hướng dẫn, mẹo, mô tả: chữ có {tên} được thay bằng phím của bộ / thiết bị đang dùng (HSX.phimChu)
  const TEN_PHIM = {
    chuot: { chay: 'A D', nhay: 'Space', chem: 'chuột trái', luot: 'Shift', hoi: 'F', dap: 'Q', ban: 'chuột phải', tuongTac: 'E', len: 'W', xuong: 'S' },
    phim: { chay: '← →', nhay: 'Z', chem: 'X', luot: 'C', hoi: 'A', dap: 'S', ban: 'D', tuongTac: '↑', len: '↑', xuong: '↓' },
    pad: { chay: 'cần trái', nhay: 'A', chem: 'X', luot: 'RB', hoi: 'B', dap: 'Y', ban: 'LB', tuongTac: '↑', len: '↑', xuong: '↓' },
    touch: { chay: '◀ ▶', nhay: 'Nhảy', chem: 'Chém', luot: 'Lướt', hoi: 'Hồi', dap: 'Phép', ban: 'Bắn', tuongTac: '▲', len: '▲', xuong: '▼' },
  };
  const ID_HD = { nhay: 'jump', chem: 'attack', luot: 'dash', hoi: 'heal', dap: 'skill', ban: 'shoot', tuongTac: 'interact', len: 'up', xuong: 'down' };
  HSX.phim = id => {
    const I = HSX.Input, bo = I.usingTouch ? 'touch' : I.device === 'pad' ? 'pad' : HSX.opt.boPhim;
    if (bo === 'rieng' && HSX.opt.phimRieng) {   // bộ Tùy chỉnh: tên phím đã gán
      if (id === 'chay') return `${Phim.tenHD('left')} ${Phim.tenHD('right')}`;
      return ID_HD[id] ? Phim.tenHD(ID_HD[id]) : id;
    }
    return (TEN_PHIM[bo] || TEN_PHIM.chuot)[id] || id;
  };
  HSX.phimChu = s => String(s).replace(/\{(\w+)\}/g, (m, id) => HSX.phim(id));

  // Tên một phím để hiện cho người chơi
  const TEN_MA = { Space: 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Shift', ShiftRight: 'Shift phải',
    ControlLeft: 'Ctrl', ControlRight: 'Ctrl phải', AltLeft: 'Alt', AltRight: 'Alt phải', MetaLeft: 'Win', MetaRight: 'Win phải',
    Enter: 'Enter', CapsLock: 'Caps Lock', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/?', Backslash: '\\',
    IntlBackslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', PageUp: 'PgUp', PageDown: 'PgDn',
    Mouse0: 'chuột trái', Mouse1: 'chuột giữa', Mouse2: 'chuột phải' };
  const tenMa = c => (!c ? '—' : TEN_MA[c] || c.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num '));

  // Đọc và đổi bộ phím (Cài đặt → Điều khiển)
  const Phim = HSX.Phim = {
    DOI_DUOC, TEN_HD, banPhim, tenMa,
    // Bộ Tùy chỉnh, đủ hai ô cho mọi hành động (save cũ, sửa tay thiếu hành động nào thì thêm ô trống)
    rieng() {
      const r = HSX.opt.phimRieng || (HSX.opt.phimRieng = {});
      DOI_DUOC.forEach(a => { if (!Array.isArray(r[a]) || r[a].length !== 2) r[a] = [0, 1].map(k => (r[a] && r[a][k]) || null); });
      return r;
    },
    // Phím của hành động a ở bộ bo (mặc định bộ đang dùng). Bộ Tùy chỉnh: đúng hai ô, kể cả ô trống
    cua(a, bo) {
      bo = bo || HSX.opt.boPhim;
      if (bo === 'rieng' && HSX.opt.phimRieng) return this.rieng()[a].slice();
      const m = banPhim(bo);
      return Object.keys(m).filter(c => m[c] === a);
    },
    // Tên phím đầu tiên của hành động a
    tenHD(a) { const c = this.cua(a).find(Boolean); return c ? tenMa(c) : '(chưa có phím)'; },
    // Bộ Tùy chỉnh lấy lại theo một bộ sẵn: mỗi hành động hai phím đầu
    chepTu(bo) {
      const r = {};
      DOI_DUOC.forEach(a => { const ds = this.cua(a, bo); r[a] = [ds[0] || null, ds[1] || null]; });
      HSX.opt.phimRieng = r;
      HSX.saveOpt();
    },
    // Gán phím code vào ô k (0, 1) của hành động a ở bộ Tùy chỉnh, code null là bỏ trống ô. Phím đang thuộc hành động khác
    // thì đổi chỗ: hành động kia nhận phím cũ của ô này. Trả về { bao } (câu báo kết quả) hoặc { loi }.
    gan(a, k, code) {
      if (code && CO_DINH[code]) return { loi: 'Tab, M, Esc dùng để mở túi đồ, bản đồ, menu nên không gán được.' };
      if (code && /^Mouse[3-9]/.test(code)) return { loi: 'Nút bên của chuột không dùng được: trình duyệt dùng nó để lùi, tiến trang.' };
      const r = this.rieng(), cu = r[a][k];
      let bao = `${TEN_HD[a]}: ${code ? tenMa(code) : `bỏ trống ô ${k + 1}`}`;
      if (code) DOI_DUOC.forEach(b => r[b].forEach((c, j) => {
        if (c !== code || (b === a && j === k)) return;
        r[b][j] = b === a ? null : cu;   // cùng hành động ở ô kia thì bỏ ô kia; hành động khác thì đổi chỗ
        if (b !== a) bao += cu ? ` · ${TEN_HD[b]} đổi sang ${tenMa(cu)}` : ` · ${TEN_HD[b]} không còn phím ${tenMa(code)}`;
      }));
      r[a][k] = code;
      HSX.saveOpt();
      return { bao };
    },
  };

  // hit: hành động vừa bấm, giữ tới hết bước vật lý kế tiếp để không lỡ cú bấm nhanh
  // mouse, aim: vị trí chuột trên khung nhìn 960×540 (aim là chỗ bấm chém gần nhất). stick: cần phải tay cầm (ngắm ná)
  // device: thiết bị dùng gần nhất ('pc' bàn phím/chuột, 'pad' tay cầm, 'touch' cảm ứng), để hướng dẫn hiện đúng nút
  HSX.Input = {
    hit: {}, key: {}, pad: {}, touch: {}, padPrev: {}, usingTouch: false, device: 'pc',
    mouse: { x: 0, y: 0, t: -1e9 }, aim: null, stick: { x: 0, y: 0 },

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
      // Nút chuột trên màn chơi tra theo bộ phím như một phím ('Mouse0' trái, 'Mouse1' giữa, 'Mouse2' phải). Nút chém thì chém
      // về phía con trỏ; nút bắn thì giữ để ngắm ná theo con trỏ, thả ra để bắn. Bấm chuột nào cũng qua được lời thoại ('tap').
      // Chạm màn chơi (cảm ứng): 'tap'. Trình duyệt còn giả thêm sự kiện chuột sau mỗi cú chạm: bỏ qua.
      let cham = -1e9;
      cv.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { this.hit.tap = true; cham = performance.now(); } });
      cv.addEventListener('mousedown', e => {
        if (e.button === 1) e.preventDefault();   // chuột giữa: không bật cuộn tự động
        if (performance.now() - cham < 1000) return;
        const code = 'Mouse' + e.button, a = hanhDong(code), p = view(e);
        Object.assign(this.mouse, p, { t: performance.now() });
        this.hit.tap = true;
        this.usingTouch = false;
        this.device = 'pc';
        doanBoPhim('chuot');
        if (!a) return;
        e.preventDefault();
        if (!this.key[code]) this.hit[a] = true;
        this.key[code] = a;
        if (a === 'attack') { this.aim = p; this.hit.mouseAtk = true; }
        if (a === 'shoot') this.hit.mouseShoot = true;
      });
      addEventListener('mouseup', e => { delete this.key['Mouse' + e.button]; });
      cv.addEventListener('contextmenu', e => e.preventDefault());
      addEventListener('keydown', e => {
        if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
        // Menu / hộp thoại đang mở: nhường Tab, Enter, Space và phím mũi tên cho trình duyệt
        // để người chơi điều hướng và bấm nút bằng bàn phím, không biến chúng thành thao tác game.
        if (HSX.UI && HSX.UI.blocking() &&
          (e.code === 'Tab' || e.code === 'Enter' || e.code === 'Space' || MUI_TEN[e.code])) return;
        if (!this.key[e.code]) doanBoPhim(e.code);
        const a = hanhDong(e.code);
        if (!a) return;
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

    // Tay cầm. Chỉ coi là đang chơi bằng tay cầm khi nó vừa được dùng thật (bấm nút mới, gạt cần), không phải chỉ vì đang cắm:
    // tay cầm lạ (không theo bố cục chuẩn), cần lái, cần ga... có trục nằm yên ở -1 / 1, nút kẹt sẵn; trước đây chúng làm game
    // tưởng người chơi dùng tay cầm nên chữ gợi ý hiện nút tay cầm, ná bắn bằng phím bị kéo lệch góc.
    // Mốc nghỉ lấy lúc mới thấy tay cầm (bố cục chuẩn thì mốc là 0); nút đang giữ lúc đó bỏ qua cho tới khi nhả ra.
    poll() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let p = null;
      for (const x of pads || []) if (x) { p = x; break; }
      const now = {};
      let dung = false;
      if (p) {
        const chuan = p.mapping === 'standard';
        if (this.padId !== p.index + ':' + p.id) {
          this.padId = p.index + ':' + p.id;
          this.nghi = p.axes.map(v => (chuan ? 0 : v));
          this.nutKet = new Set(p.buttons.map((b, i) => (b.pressed ? i : -1)).filter(i => i >= 0));
        }
        const truc = i => (p.axes[i] || 0) - (this.nghi[i] || 0);
        p.buttons.forEach((b, i) => {
          if (!b.pressed) { this.nutKet.delete(i); return; }
          if (PAD[i] && !this.nutKet.has(i)) now[PAD[i]] = true;
        });
        const ax = truc(0), ay = truc(1);
        this.stick = chuan ? { x: truc(2), y: truc(3) } : { x: 0, y: 0 };   // cần phải (ngắm ná) chỉ đọc ở bố cục chuẩn
        const gat = Math.hypot(this.stick.x, this.stick.y) > 0.5;
        if (gat && !this.gatTruoc) dung = true;
        this.gatTruoc = gat;
        if (ax < -0.4) now.left = true;
        if (ax > 0.4) now.right = true;
        if (ay < -0.5) now.up = true;
        if (ay > 0.5) now.down = true;
        for (const a in now) if (!this.padPrev[a]) { this.hit[a] = true; dung = true; }
      } else this.stick = { x: 0, y: 0 };
      if (dung) this.device = 'pad';
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
          const ch = room.tile(tx, ty);
          if (ch === '?') {
            // kinh_lup wall: check if kinh_lup is owned
            if (!HSX.S.owned.kinh_lup) {
              // Kinh_lup wall blocked without kinh_lup: trigger shake and hint
              if (HSX.World) { HSX.World.shake = Math.max(HSX.World.shake || 0, 8); }
              if (HSX.World && HSX.World.hint) { HSX.World.hint('kinh_lup', 'Cần 🔍 Kính Lúp Phân Loại để nhìn xuyên tường'); }
            }
          }
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
            const ch = room.tile(tx, ty);
            if (ch === '?' && !HSX.S.owned.kinh_lup) {
              // Kinh_lup wall blocked without kinh_lup: trigger shake and hint
              if (HSX.World) { HSX.World.shake = Math.max(HSX.World.shake || 0, 8); }
              if (HSX.World && HSX.World.hint) { HSX.World.hint('kinh_lup', 'Cần 🔍 Kính Lúp Phân Loại để nhìn xuyên tường'); }
            }
            const one = !b.drop && bottom0 <= ty * T + 1 && room.oneWay(tx, ty, b);
            if (room.solid(tx, ty) || one) { b.y = ty * T - b.h; b.vy = 0; b.ground = true; break; }
          }
        } else {
          const ty = Math.floor(b.y / T);
          for (let tx = x0; tx <= x1; tx++) {
            const ch = room.tile(tx, ty);
            if (ch === '?' && !HSX.S.owned.kinh_lup) {
              // Kinh_lup wall blocked without kinh_lup: trigger shake and hint
              if (HSX.World) { HSX.World.shake = Math.max(HSX.World.shake || 0, 8); }
              if (HSX.World && HSX.World.hint) { HSX.World.hint('kinh_lup', 'Cần 🔍 Kính Lúp Phân Loại để nhìn xuyên tường'); }
            }
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
