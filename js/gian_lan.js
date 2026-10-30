/* Mã gian lận để thử nhanh. Mọi thứ nằm trong file này, game không phụ thuộc vào nó.
   GỠ RA: xoá file này và dòng <script src="js/gian_lan.js"> ở cuối index.html. Không cần sửa gì khác.

   Cách dùng:
   - Máy tính: nhấn phím ` (cạnh số 1) để mở ô gõ mã, Enter để chạy, Esc để đóng. Gõ ? để xem danh sách mã.
   - Điện thoại: chạm nhanh 5 lần vào góc trên bên trái màn chơi (chỗ quả cầu năng lượng).
   - Console: GL('battu'), GL('toi hang vua')...
   - Thêm ?thu=1 vào địa chỉ để hiện bảng nút bấm ở đầu màn hình.
   Mã gõ có dấu hay không dấu, có cách hay không đều được ("bất tử" = "battu").
   Các mã bật/tắt được nhớ trong thẻ trình duyệt đang mở (tải lại trang vẫn còn), gõ "tat" để tắt hết. */
(function () {
  const W = HSX.World, P = HSX.Player, I = HSX.Input, D = HSX.DATA, Calc = HSX.Calc, Sys = HSX.Sys, R = HSX.Render, T = HSX.T;
  const MEM = 'hoi-sinh-xanh-gian-lan';
  const on = { bay: false, nangluong: false, cham: false, nhanh: false, hop: false, sang: null };
  const TEN = { bay: 'bay', nangluong: 'năng lượng ∞', cham: 'chậm ×¼', nhanh: 'nhanh ×2', hop: 'hộp va chạm' };
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();

  // ---------- Móc vào game (bọc hàm gốc, không sửa file nào khác) ----------
  // Bay: bỏ va chạm của Mầm, phím hướng để bay (giữ Lướt để bay nhanh). Không mất máu, không dính gai, nước độc.
  const move = HSX.Phys.move;
  HSX.Phys.move = function (b, room, dt) {
    if (!on.bay || b !== P.b) return move.call(this, b, room, dt);
    const sp = I.down('dash') ? 950 : 430;
    b.vx = ((I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0)) * sp;
    b.vy = ((I.down('down') ? 1 : 0) - (I.down('up') || I.down('jump') ? 1 : 0)) * sp;
    const rw = room.w * T, rh = room.h * T;
    b.x = HSX.clamp(b.x + b.vx * dt, -b.w / 2 - 2, rw - b.w / 2 + 2);   // tâm được ra quá mép 2 px để đi qua cửa
    b.y = HSX.clamp(b.y + b.vy * dt, -b.h / 2 - 2, rh - b.h / 2 + 2);
    b.ground = b.wallL = b.wallR = b.ceil = false;
  };
  const hurt = P.hurt;
  P.hurt = function () { return on.bay ? false : hurt.apply(this, arguments); };
  const RoomProto = Object.getPrototypeOf(W.room), hazardAt = RoomProto.hazardAt;
  RoomProto.hazardAt = function (b) { return on.bay && b === P.b ? false : hazardAt.call(this, b); };

  const update = W.update;
  W.update = function (dt) {
    update.call(this, on.cham ? dt / 4 : dt);
    if (on.nangluong) HSX.S.energy = 99;
  };
  const runSpeed = Calc.runSpeed;
  Calc.runSpeed = function () { return runSpeed.call(this) * (on.nhanh ? 2 : 1); };
  const ambient = W.ambient;
  W.ambient = function () { return on.sang === null ? ambient.call(this) : on.sang; };

  // Hộp va chạm: Mầm (xanh), đòn chém (vàng), quái (đỏ), đạn (cam), hướng chuột (trắng)
  const draw = R.draw;
  R.draw = function () {
    draw.call(this);
    if (!on.hop || !W.room) return;
    const c = this.ctx, cam = this.cam, box = (r, col) => { c.strokeStyle = col; c.strokeRect(r.x, r.y, r.w, r.h); };
    c.save();
    c.setTransform(this.k, 0, 0, this.k, 0, 0);
    c.translate(-cam.x, -cam.y);
    c.lineWidth = 1.5;
    box(P.b, '#5cff8a');
    if (P.atkT > 0) box(P.atkBox(), '#ffe14d');
    W.enemies.forEach(e => { if (!e.dead) box(e, '#ff5c5c'); });
    W.shots.forEach(s => box(s, '#ffa040'));
    if (performance.now() - I.mouse.t < 3000) {
      c.strokeStyle = 'rgba(255,255,255,0.6)';
      c.setLineDash([5, 5]);
      c.beginPath(); c.moveTo(P.cx(), P.b.y + P.b.h / 2 - 4); c.lineTo(I.mouse.x + cam.x, I.mouse.y + cam.y); c.stroke();
    }
    c.restore();
  };

  // ---------- Các mã ----------
  const L = () => HSX.LEVELS[HSX.S.level];
  const MOC = { kinh_lup: 1, xuong_phao: 1, khien_lon: 1, chuong_gio: 1, phao_quay_dau: 1, rao_chan: 1 };
  function giu(fn) {   // làm việc gì đó với phòng hiện tại rồi nạp lại phòng, giữ nguyên chỗ đứng
    const x = P.b.x, y = P.b.y;
    fn();
    W.load(W.room.id, { start: true });
    P.place(x, y);
    W.camUpdate(0, true);
  }
  function timPhong(q) {
    const rooms = L().rooms, k = norm(q).replace(/\s+/g, '');
    if (!k) return null;
    return Object.keys(rooms).find(id => id === k || id.replace(/_/g, '') === k || norm(rooms[id].name).replace(/\s+/g, '') === k)
      || Object.keys(rooms).find(id => id.replace(/_/g, '').includes(k) || norm(rooms[id].name).replace(/\s+/g, '').includes(k));
  }
  const bat = (k, v) => { on[k] = v === undefined ? !on[k] : v; return `${TEN[k]}: ${on[k] ? 'BẬT' : 'tắt'}`; };

  const MA = {
    battu: ['Bật/tắt bất tử: quái, gai, nước độc không làm mất máu', () => { HSX.DEBUG_GOD = !HSX.DEBUG_GOD; return `bất tử: ${HSX.DEBUG_GOD ? 'BẬT' : 'tắt'}`; }],
    bay: ['Bật/tắt bay xuyên tường: phím hướng để bay, giữ Lướt bay nhanh', () => bat('bay')],
    mau: ['Đầy máu', () => { HSX.S.hp = Calc.maxHp(); return `máu ${HSX.S.hp}/${Calc.maxHp()}`; }],
    themla: ['Thêm 1 lá máu tối đa (như ghép đủ 4 Mảnh Lá)', () => { HSX.S.shards += 4; HSX.S.hp = Calc.maxHp(); return `máu tối đa ${Calc.maxHp()}`; }],
    nangluong: ['Bật/tắt năng lượng luôn đầy', () => bat('nangluong')],
    tinhlinh: ['Có đủ 4 tinh linh (hồi máu, lướt, đập xuống, hút đồ)', () => { D.spiritOrder.forEach(id => { HSX.S.spirits[id] = true; }); HSX.Spirits.sync(); return 'đủ 4 tinh linh'; }],
    congcu: ['Có Kính Lúp, Xuồng Phao, Rào Chắn và 3 bùa (đeo bùa ở Trạm)', () => { Object.keys(MOC).forEach(id => Sys.grant(id, 1)); R.tilesDirty = true; return 'đủ công cụ và bùa'; }],
    giau: ['+20 mỗi nguyên liệu, +30 hạt giống, đầy năng lượng', () => {
      Object.keys(D.items).forEach(id => { if (D.items[id].kind === 'material' || D.items[id].kind === 'consumable') Sys.addItem(id, 20); });
      HSX.S.seeds += 30; HSX.S.energy = 99;
      return '+20 nguyên liệu mỗi loại, +30 hạt giống';
    }],
    tatca: ['tinhlinh + congcu + giau + đầy máu', () => { ['tinhlinh', 'congcu', 'giau', 'mau'].forEach(k => MA[k][1]()); return 'đủ tinh linh, công cụ, bùa, nguyên liệu'; }],
    sach: ['Phá hết đống rác cả màn (độ sạch 100%)', () => {
      giu(() => Object.keys(L().rooms).forEach(id => { const h = HSX.S.heaps[id] = HSX.S.heaps[id] || {}; for (let i = 0; i < Calc.roomHeaps(id); i++) h[i] = true; }));
      Sys.checkSpecies();
      return 'độ sạch 100%';
    }],
    toi: ['toi <tên phòng>: dịch chuyển, ví dụ "toi hang vua". Gõ "toi" để xem tên phòng', arg => {
      const id = timPhong(arg || '');
      if (!id) return { loi: 'Phòng: ' + Object.keys(L().rooms).map(k => `${L().rooms[k].name} (${k})`).join(', ') };
      W.fadeTo = null; W.fade = 0; W.mode = 'play';
      W.load(id, { start: true });
      return `tới ${L().rooms[id].name}`;
    }],
    hetquai: ['Hạ hết quái trong phòng (không tính boss)', () => {
      let n = 0;
      W.enemies.forEach(e => { if (!e.dead && e !== W.boss) { HSX.Enemies.damage(e, 9999, P, 'down'); n++; } });
      return `hạ ${n} quái`;
    }],
    boss: ['Hạ boss của phòng này', () => {
      const b = W.boss;
      if (!b || b.dead) return { loi: 'Phòng này không có boss' };
      b.active = true; b.layers = 0;
      HSX.Enemies.damage(b, 9999, P, 'down');
      return `hạ ${b.def.name}`;
    }],
    binhminh: ['Coi như đã hạ Vua Túi Nilon: bình minh lên', () => { HSX.S.bosses.vua_nilon = true; HSX.S.dawn = true; W.dawnT = 0; HSX.saveGame(); return 'bình minh'; }],
    sang: ['sang <0-100>: ép độ sáng để xem không khí. Gõ "sang" để trả về bình thường', arg => {
      const v = parseFloat(arg);
      on.sang = isNaN(v) ? null : HSX.clamp(v / 100, 0, 1);
      return on.sang === null ? 'độ sáng: tự nhiên' : `độ sáng ép ${Math.round(on.sang * 100)}%`;
    }],
    cham: ['Bật/tắt quay chậm ×¼ (xem hoạt ảnh, đòn đánh)', () => bat('cham')],
    nhanh: ['Bật/tắt chạy nhanh gấp đôi', () => bat('nhanh')],
    hop: ['Bật/tắt hiện hộp va chạm, vùng chém và hướng chuột', () => bat('hop')],
    xoaluu: ['Xoá save, chơi lại từ đầu (có hỏi lại)', () => {
      if (!confirm('Xoá save và chơi lại từ đầu?')) return { loi: 'Đã huỷ' };
      HSX.saveGame = () => true;   // không để lúc tải lại trang lưu đè save cũ
      localStorage.removeItem(HSX.SAVE_KEY);
      location.reload();
      return 'đã xoá save';
    }],
    tat: ['Tắt mọi mã đang bật', () => {
      Object.assign(on, { bay: false, nangluong: false, cham: false, nhanh: false, hop: false, sang: null });
      HSX.DEBUG_GOD = false;
      return 'đã tắt hết';
    }],
  };
  // Tên khác (gõ có cách, gõ bằng bộ gõ Telex hay bị nuốt chữ)
  const KHAC = { bos: 'boss', hitbox: 'hop', hitbo: 'hop', hopvacham: 'hop', god: 'battu', noclip: 'bay', fly: 'bay', nl: 'nangluong', tele: 'toi', di: 'toi', help: '?', trogiup: '?' };

  function GL(text) {
    const s = norm(text);
    if (!s) return '';
    let code = s.replace(/\s+/g, ''), arg = '';
    if (!MA[code] && !MA[KHAC[code]] && code !== '?') { const m = s.match(/^(\S+)\s*(.*)$/); code = m[1]; arg = m[2]; }
    code = KHAC[code] || code;
    if (code === '?') return { help: true };
    if (!MA[code]) return { loi: `Không có mã "${text}". Gõ ? để xem danh sách.` };
    const r = MA[code][1](arg);
    luu();
    hienNhan();
    return r;
  }
  window.GL = t => { const r = GL(t); if (r && r.help) return Object.keys(MA).map(k => `${k}: ${MA[k][0]}`).join('\n'); return r && r.loi ? 'Lỗi: ' + r.loi : r; };

  // ---------- Ghi nhớ trong thẻ đang mở ----------
  function luu() {
    try { sessionStorage.setItem(MEM, JSON.stringify(Object.assign({ battu: !!HSX.DEBUG_GOD }, on))); } catch (e) { /* bỏ qua */ }
  }
  try {
    const m = JSON.parse(sessionStorage.getItem(MEM) || 'null');
    if (m) { Object.keys(on).forEach(k => { if (m[k] !== undefined) on[k] = m[k]; }); HSX.DEBUG_GOD = !!m.battu; }
  } catch (e) { /* bỏ qua */ }

  // ---------- Giao diện: ô gõ mã, nhãn mã đang bật, bảng nút (?thu=1) ----------
  const css = document.createElement('style');
  css.textContent = `
    #gl-box { position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 80; width: min(520px, calc(100vw - 32px));
      background: rgba(6, 12, 10, .94); border: 1px solid #3f8f5a; border-radius: 10px; padding: 8px; font: 13px/1.4 "Segoe UI", system-ui, sans-serif; color: #e8f5ea; }
    #gl-box input { width: 100%; box-sizing: border-box; font: 15px Consolas, monospace; background: #0d1a14; color: #e8f5ea; border: 1px solid #2e5a3e; border-radius: 6px; padding: 6px 8px; outline: none; }
    #gl-box .out { margin-top: 6px; max-height: 50vh; overflow: auto; white-space: pre-wrap; color: #bfe6c8; }
    #gl-box .out b { color: #fff; font-family: Consolas, monospace; }
    #gl-box .loi { color: #ffb4b4; }
    #gl-tag { position: fixed; left: 10px; bottom: 10px; z-index: 65; pointer-events: none; font: 12px "Segoe UI", system-ui, sans-serif; color: #ffe08a;
      background: rgba(0, 0, 0, .55); border: 1px solid rgba(255, 224, 138, .4); border-radius: 8px; padding: 3px 8px; }
    #debug { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); z-index: 70; background: rgba(0, 0, 0, .75); border: 1px solid #555; border-radius: 10px; padding: 6px 8px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; font-size: 12px; max-width: 96vw; }
    #debug button, #debug select { font-size: 12px; background: #222; color: #eee; border: 1px solid #555; border-radius: 6px; padding: 3px 7px; cursor: pointer; }
    #debug button.on { background: #2b5a3a; border-color: #5cff8a; }`;
  document.head.appendChild(css);

  const tag = document.createElement('div');
  tag.id = 'gl-tag';
  document.body.appendChild(tag);
  function hienNhan() {
    const ds = (HSX.DEBUG_GOD ? ['bất tử'] : []).concat(Object.keys(TEN).filter(k => on[k]).map(k => TEN[k]));
    if (on.sang !== null) ds.push(`sáng ${Math.round(on.sang * 100)}%`);
    tag.textContent = '🧪 ' + ds.join(' · ');
    tag.hidden = !ds.length;
    document.querySelectorAll('#debug [data-ma]').forEach(b => {
      const k = b.dataset.ma;
      b.classList.toggle('on', k === 'battu' ? !!HSX.DEBUG_GOD : !!on[k]);
    });
  }

  let box = null;
  function moO() {
    if (box) { box.querySelector('input').focus(); return; }
    box = document.createElement('div');
    box.id = 'gl-box';
    box.innerHTML = '<input type="text" placeholder="Gõ mã rồi Enter · ? xem danh sách · Esc đóng" autocomplete="off" spellcheck="false"><div class="out"></div>';
    document.body.appendChild(box);
    const inp = box.querySelector('input'), out = box.querySelector('.out');
    inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.code === 'Escape' || e.code === 'Backquote') { e.preventDefault(); dongO(); return; }
      if (e.key !== 'Enter') return;
      const r = GL(inp.value);
      if (r && r.help) {
        out.innerHTML = Object.keys(MA).map(k => `<b>${k}</b> · ${MA[k][0]}`).join('\n');
        inp.value = '';
      } else if (r && r.loi) out.innerHTML = `<span class="loi">${HSX.esc(r.loi)}</span>`;
      else if (r) { HSX.UI.toast('🧪 ' + HSX.esc(r)); dongO(); }
    });
    inp.focus();
  }
  function dongO() {
    if (!box) return;
    box.remove();
    box = null;
    I.clear();
  }
  // Ô gõ mã đang mở thì game tạm dừng
  const blocking = HSX.UI.blocking;
  HSX.UI.blocking = function () { return !!box || blocking.call(this); };

  addEventListener('keydown', e => {
    if (e.code !== 'Backquote' || (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
    e.preventDefault();
    if (box) dongO(); else moO();
  });
  // Điện thoại: chạm 5 lần trong 2 giây vào góc trên trái màn chơi
  const cv = document.getElementById('game');
  let cham = [];
  cv.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const r = cv.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width * HSX.VW > 140 || (e.clientY - r.top) / r.height * HSX.VH > 110) return;
    const now = performance.now();
    cham = cham.filter(t => now - t < 2000).concat(now);
    if (cham.length >= 5) { cham = []; moO(); }
  });

  // Bảng nút ở đầu màn hình khi mở game với ?thu=1
  if (/[?&]thu=1/.test(location.search)) {
    const rooms = L().rooms, el = document.createElement('div');
    el.id = 'debug';
    el.innerHTML = `<b>Chế độ thử</b>
      <select id="dbg-room">${Object.keys(rooms).map(id => `<option value="${id}">${rooms[id].name}</option>`).join('')}</select>
      <button data-go="1">Tới phòng</button>
      <button data-ma="tinhlinh">Đủ tinh linh</button><button data-ma="congcu">Công cụ + bùa</button><button data-ma="giau">+ Nguyên liệu</button>
      <button data-ma="sach">Sạch 100%</button><button data-ma="battu">Bất tử</button><button data-ma="bay">Bay</button>
      <button data-ma="hop">Hộp va chạm</button><button data-ma="boss">Hạ boss</button><button data-o="1">Gõ mã (\`)</button>`;
    document.body.appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      let r;
      if (b.dataset.go) r = GL('toi ' + document.getElementById('dbg-room').value);
      else if (b.dataset.o) moO();
      else r = GL(b.dataset.ma);
      if (r && !r.help) HSX.UI.toast('🧪 ' + HSX.esc(r.loi || r));
      b.blur();
    });
  }

  hienNhan();
  console.info('Hồi Sinh Xanh: mã gian lận đang bật. Nhấn ` trong game hoặc gõ GL("?") ở đây. Gỡ: xoá js/gian_lan.js và dòng nạp nó trong index.html.');
})();
