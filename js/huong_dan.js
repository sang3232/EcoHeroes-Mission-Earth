/* Hướng dẫn: dạy từng thao tác ngay trong lúc chơi.
   - Bảng nhỏ giữa phía trên màn hình hiện phím cần bấm (đổi theo bàn phím/chuột, tay cầm hay cảm ứng), tự qua bước khi làm đúng.
   - Bài cơ bản (CO_BAN) chạy ở đầu game. Các mẹo khác (TINH_HUONG) hiện khi gặp tình huống lần đầu: thấy quái, thấy đống rác,
     có tinh linh mới...
   - Có mũi tên chỉ chỗ cần tới trong màn chơi; trên điện thoại thì nút cảm ứng cần bấm sáng lên.
   - Tiến trình lưu trong save (S.tut). Bật/tắt và xem lại trong Cài đặt (HSX.opt.huongDan). */
(function () {
  const T = HSX.T, VW = HSX.VW;
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
  const W = () => HSX.World, P = () => HSX.Player, S = () => HSX.S;

  // Phím theo thiết bị. '/' và '+' là chữ nối; 'chuot', 'chuot_len', 'chuot_xuong' vẽ hình con chuột.
  const PHIM = {
    chay: { pc: ['A', 'D', '/', '←', '→'], pad: ['Cần trái'], touch: ['◀', '▶'] },
    nhay: { pc: ['Space'], pad: ['A'], touch: ['Nhảy'] },
    chem: { pc: ['X', '/', 'chuot'], pad: ['X'], touch: ['Chém'] },
    chemLen: { pc: ['chuot_len', '/', '↑', '+', 'X'], pad: ['↑', '+', 'X'], touch: ['▲', '+', 'Chém'] },
    chemXuong: { pc: ['chuot_xuong', '/', '↓', '+', 'X'], pad: ['↓', '+', 'X'], touch: ['▼', '+', 'Chém'] },
    tuongTac: { pc: ['↑', '/', 'E'], pad: ['↑'], touch: ['▲'] },
    hoi: { pc: ['giữ F'], pad: ['giữ B'], touch: ['giữ Hồi'] },
    luot: { pc: ['C', '/', 'Shift'], pad: ['RB'], touch: ['Lướt'] },
    dap: { pc: ['V'], pad: ['Y'], touch: ['Phép'] },
    menu: { pc: ['M', 'Tab', 'Esc'], pad: ['Select', 'Start'], touch: ['☰'] },
    nhin: { pc: ['chuot'] },
  };
  // Nút cảm ứng sáng lên theo từng bước
  const NUT = {
    chay: ['left', 'right'], nhay: ['jump'], nhaycao: ['jump'], chem: ['attack'], chemlen: ['up', 'attack'], tram: ['up'],
    long: ['attack'], quai: ['attack'], dongrac: ['attack'], hoimau: ['heal'], luot: ['dash'], chemxuong: ['down', 'attack'],
    dap: ['skill'], menu: ['menu'],
  };

  const gan = (o, r) => o && Math.abs(o.x + (o.w || T) / 2 - P().cx()) < r && Math.abs(o.y - P().b.y) < r;
  const obj = type => W().room.objs.find(o => o.type === type);
  const tam = o => o && { x: o.x + T / 2, y: o.y - 10 };

  // Bài cơ bản theo thứ tự. su: sự kiện làm xong bước (HSX.emit), loc: lọc thêm theo dữ liệu sự kiện,
  // xong: điều kiện tự kiểm tra mỗi bước vật lý, boQua: đã có từ trước thì coi như xong, dich: chỗ đặt mũi tên chỉ đường.
  const CO_BAN = [
    { id: 'chay', ten: 'Chạy', phim: PHIM.chay, chu: 'Chạy sang hai bên', xong: hd => hd.quang >= 160 },
    { id: 'nhay', ten: 'Nhảy', phim: PHIM.nhay, chu: 'Nhấn để nhảy', su: 'jump' },
    { id: 'nhaycao', ten: 'Nhảy cao', phim: PHIM.nhay, chu: 'Giữ lâu để nhảy cao, lên bục gỗ phía trước',
      xong: () => P().b.ground && W().room.onOneWay(P().b), dich: () => bucGo() },
    { id: 'tram', ten: 'Trạm Tái Chế', phim: PHIM.tuongTac, chu: 'Ngồi nghỉ ở Trạm: lưu game, hồi đầy máu, chế đồ', su: 'rest',
      phong: 'ben_thuyen', dich: () => tam(obj('bench')) },
    { id: 'chem', ten: 'Chém', phim: PHIM.chem, chu: 'Chém bằng Vợt Bắt Rác', su: 'attack' },
    { id: 'chemlen', ten: 'Chém lên', phim: PHIM.chemLen,
      chu: () => (HSX.Input.device === 'pc' ? 'Trỏ chuột lên trên đầu Mầm rồi bấm (hoặc giữ ↑ + X)' : 'Giữ ↑ rồi chém'),
      su: 'attack', loc: d => d.dir === 'up', ngam: -1 },
    { id: 'long', ten: 'Giải cứu tinh linh', phim: PHIM.chem, chu: 'Chém vỡ lồng giam để cứu Hoa Sen', su: 'rescue',
      phong: 'ben_thuyen', boQua: () => S().spirits.sen, dich: () => tam(obj('cage')) },
  ];
  // Mẹo theo tình huống: khi = lúc bắt đầu hiện, het = tự tắt sau ngần ấy giây nếu chưa làm
  const TINH_HUONG = [
    { id: 'quai', ten: 'Quái ô nhiễm', phim: PHIM.chem, chu: 'Chạm vào quái là mất 1 lá máu. Chém để hạ chúng', su: 'kill', het: 14,
      khi: () => W().enemies.some(e => !e.dead && e.kind === 'enemy' && gan(e, 320)), dich: () => quaiGan() },
    { id: 'dongrac', ten: 'Đống rác', phim: PHIM.chem, chu: 'Chém vỡ đống rác. Dọn sạch phòng thì bãi biển sáng lên', su: 'heap', het: 16,
      khi: () => W().room.objs.some(o => o.type === 'heap' && gan(o, 260)), dich: () => tam(W().room.objs.find(o => o.type === 'heap' && gan(o, 400))) },
    { id: 'nangluong', ten: 'Năng lượng', chu: 'Chém trúng quái, rác để tích năng lượng vào quả cầu này', het: 6, chiQuaCau: true,
      khi: () => S().energy > 0 },
    { id: 'hoimau', ten: 'Hồi máu', phim: PHIM.hoi, chu: 'Đứng yên, giữ nút để hồi 1 lá máu (tốn 33 năng lượng)', su: 'heal', het: 20,
      khi: () => S().spirits.sen && S().energy >= 33 && S().hp < HSX.Calc.maxHp() },
    { id: 'luot', ten: 'Lướt', phim: PHIM.luot, chu: 'Lướt nhanh, cả khi đang nhảy: qua được vực gai rộng', su: 'dash', het: 25,
      khi: () => S().spirits.gio },
    { id: 'chemxuong', ten: 'Chém xuống', phim: PHIM.chemXuong, chu: 'Đang nhảy mà chém xuống trúng quái hoặc gai thì bật nảy lên',
      su: 'pogo', het: 20, ngam: 1, khi: () => !P().b.ground && duoiChan() },
    { id: 'dap', ten: 'Đập xuống', phim: PHIM.dap, chu: 'Đang nhảy bấm để đập xuống, phá nền rác nứt (tốn 33 năng lượng)', su: 'slam', het: 25,
      khi: () => S().spirits.gau },
    { id: 'menu', ten: 'Bản đồ, túi đồ, Sổ quái vật', phim: PHIM.menu, chu: 'Mở bản đồ, túi đồ và Sổ ghi các loài quái đã gặp', su: 'menu', het: 10,
      khi: () => Object.keys(S().visited).length >= 2 },
    { id: 'nhin', ten: 'Nhìn quanh', phim: PHIM.nhin, chu: 'Rê chuột ra phía mép màn hình: khung nhìn lia theo', het: 12,
      xong: () => Math.abs(W().aimX) > 90 || Math.abs(W().aimY) > 60,
      khi: () => HSX.Input.device === 'pc' && HSX.opt.camChuot > 0 && performance.now() - HSX.Input.mouse.t < 800 && S().tut.long },
    // Màn 2
    { id: 'catluoi', ten: 'Lưới ma giăng', phim: PHIM.chem, chu: 'Lưới chắn lối: chém 3 nhát để cắt đứt cả tấm', su: 'luoi', het: 18,
      khi: () => gan(oLuoi(), 200), dich: () => oLuoi() && { x: oLuoi().x + T / 2, y: oLuoi().y } },
    { id: 'trongduoc', ten: 'Cắm trụ mầm đước', phim: PHIM.tuongTac, chu: 'Đứng ở bãi bồi, cắm trụ mầm. Đước lớn lên, rễ sẽ bắc thành cầu', su: 'trong', het: 25,
      khi: () => S().flags.trongDuoc && !!baiBoi(), dich: () => tam(baiBoi()) },
    { id: 'thoatluoi', ten: 'Bị lưới quấn', phim: PHIM.chem, chu: 'Bấm chém (hoặc nhảy) liên tục để vùng ra khỏi lưới', su: 'thoat', het: 4, trongTran: true,
      khi: () => P().troi > 0 },
  ];

  function bucGo() {
    const r = W().room, px = P().cx() / T;
    let best = null;
    r.grid.forEach((row, y) => row.forEach((c, x) => {
      if (c !== '=' || (row[x - 1] === '=')) return;   // đầu trái của mỗi bục
      const d = Math.abs(x + 1.5 - px) + Math.abs(y - P().b.y / T) * 2;
      if (!best || d < best.d) best = { d, x: (x + 1.5) * T, y: y * T - 8 };
    }));
    return best;
  }
  // ô lưới ma gần Mầm nhất (trong phòng), bãi bồi chưa trồng gần nhất
  function oLuoi() {
    const r = W().room, px = P().cx() / T, py = P().b.y / T;
    let best = null, bd = 1e9;
    r.grid.forEach((row, y) => row.forEach((c, x) => {
      if (c !== 'n') return;
      const d = Math.abs(x + 0.5 - px) + Math.abs(y - py);
      if (d < bd) { bd = d; best = { x: x * T, y: y * T, w: T }; }
    }));
    return best;
  }
  function baiBoi() {
    const r = W().room, trees = S().trees[r.id] || {};
    return r.objs.find(o => o.type === 'plant' && o.dat === 'boi' && !trees[o.idx] && gan(o, 300));
  }
  function quaiGan() {
    const e = W().enemies.filter(e => !e.dead && e.kind === 'enemy').sort((a, b) => Math.abs(a.x - P().cx()) - Math.abs(b.x - P().cx()))[0];
    return e && { x: e.x + e.w / 2, y: e.y - 6 };
  }
  // dưới chân Mầm (trong 4 ô) có quái hoặc gai: lúc thích hợp để dạy chém xuống
  function duoiChan() {
    const b = P().b, r = W().room, tx = Math.floor(P().cx() / T), ty = Math.floor((b.y + b.h) / T);
    for (let y = ty; y < ty + 4; y++) if (r.tile(tx, y) === '^') return true;
    return W().enemies.some(e => !e.dead && Math.abs(e.x + e.w / 2 - P().cx()) < 50 && e.y > b.y + b.h && e.y - (b.y + b.h) < 4 * T);
  }

  const HD = HSX.HuongDan = {
    buoc: null, quang: 0, lastX: null, nutSang: '',

    init() {
      ['jump', 'attack', 'rest', 'rescue', 'kill', 'heap', 'heal', 'dash', 'pogo', 'slam', 'menu', 'luoi', 'trong', 'thoat'].forEach(n => HSX.on(n, d => this.ev(n, d)));
    },
    active() { return !!(this.buoc && HSX.opt.huongDan); },

    update(dt) {
      const s = S();
      if (!HSX.opt.huongDan) { this.buoc = null; this.sangNut(); return; }
      // save cũ đã qua phòng đầu: bỏ qua bài cơ bản
      if (!s.tut._v) { s.tut._v = 1; if (s.spirits.sen) CO_BAN.forEach(d => { s.tut[d.id] = true; }); }
      const p = P();
      if (p.b.ground && this.lastX !== null) this.quang += Math.abs(p.cx() - this.lastX);
      this.lastX = p.cx();
      const b = this.buoc;
      if (b) {
        b.t += dt;
        if (b.xongT !== undefined) { b.xongT += dt; if (b.xongT > 0.9) this.buoc = null; }
        else if (b.def.xong && b.def.xong(this)) this.hoanThanh();
        else if (b.def.het && b.t > b.def.het) this.hoanThanh(true);
        else if (b.def.phong && W().room.id !== b.def.phong) this.buoc = null;   // rời phòng: để dành lần sau
      } else {
        CO_BAN.forEach(d => { if (!s.tut[d.id] && d.boQua && d.boQua()) s.tut[d.id] = true; });
        const bo = W().boss, danhBoss = bo && bo.active && !bo.dead;   // đang đánh boss thì không hiện mẹo mới
        const d = CO_BAN.find(x => !s.tut[x.id] && (!x.phong || W().room.id === x.phong))
          || (s.tut.long ? TINH_HUONG.find(x => !s.tut[x.id] && (!danhBoss || x.trongTran) && x.khi()) : null);
        if (d) { this.buoc = { def: d, t: 0 }; this.quang = 0; }
      }
      this.sangNut();
    },

    ev(name, data) {
      const b = this.buoc;
      if (b && b.xongT === undefined && b.def.su === name && (!b.def.loc || b.def.loc(data || {}))) this.hoanThanh();
    },

    hoanThanh(hetGio) {
      const b = this.buoc;
      S().tut[b.def.id] = true;
      b.xongT = 0;
      if (hetGio) return;
      const p = P();
      W().ring(p.cx(), p.cy(), '#9ff0b5', 50, 0.4, 3);
      if (b.def.id === CO_BAN[CO_BAN.length - 1].id) W().banner('Đã học xong thao tác cơ bản', 'Mẹo khác sẽ hiện khi bạn gặp tình huống mới', 2.6);
    },

    // Xem lại từ đầu (nút trong Cài đặt)
    lamLai() { S().tut = { _v: 1 }; this.buoc = null; HSX.opt.huongDan = true; HSX.saveOpt(); },

    // Nút cảm ứng của bước đang dạy sáng lên
    sangNut() {
      const b = this.buoc, ds = b && b.xongT === undefined ? (NUT[b.def.id] || []) : [], key = ds.join();
      if (key === this.nutSang) return;
      this.nutSang = key;
      document.querySelectorAll('#touch [data-a]').forEach(el => el.classList.toggle('hd-sang', ds.includes(el.dataset.a)));
    },

    // ---------- Vẽ ----------
    // Mũi tên chỉ chỗ cần tới, vòng ngắm cho bài chém theo chuột (toạ độ màn chơi)
    drawWorld(c, t) {
      const b = this.buoc;
      if (!b || !HSX.opt.huongDan || b.xongT !== undefined || W().mode !== 'play') return;
      const a = Math.min(1, b.t / 0.3), p = P();
      const dich = b.def.dich && b.def.dich();
      if (dich) {
        const y = dich.y - 18 - Math.abs(Math.sin(t * 4)) * 10;
        c.save();
        c.globalAlpha = a;
        c.translate(dich.x, y);
        c.fillStyle = '#9ff0b5';
        c.strokeStyle = 'rgba(8,20,14,0.8)';
        c.lineWidth = 3;
        c.beginPath(); c.moveTo(-11, -12); c.lineTo(0, 0); c.lineTo(11, -12); c.lineTo(5, -12); c.lineTo(0, -6); c.lineTo(-5, -12); c.closePath();
        c.stroke(); c.fill();
        c.restore();
      }
      if (b.def.ngam && HSX.Input.device === 'pc') {
        // vòng ngắm: trỏ chuột vào đây rồi bấm
        const x = p.cx(), y = b.def.ngam < 0 ? p.b.y - 54 : p.b.y + p.b.h + 44, r = 12 + Math.sin(t * 5) * 2;
        c.save();
        c.globalAlpha = a * 0.9;
        c.strokeStyle = '#fff6c8';
        c.lineWidth = 2;
        c.setLineDash([4, 4]);
        c.beginPath(); c.arc(x, y, r, 0, 6.283); c.stroke();
        c.setLineDash([]);
        c.beginPath(); c.moveTo(x - r - 5, y); c.lineTo(x - r + 4, y); c.moveTo(x + r - 4, y); c.lineTo(x + r + 5, y);
        c.moveTo(x, y - r - 5); c.lineTo(x, y - r + 4); c.moveTo(x, y + r - 4); c.lineTo(x, y + r + 5); c.stroke();
        c.restore();
      }
    },

    // Bảng hướng dẫn giữa phía trên màn hình (toạ độ màn hình)
    draw(c, t) {
      const b = this.buoc;
      if (!b || !HSX.opt.huongDan || W().mode !== 'play') return;
      const d = b.def, dev = HSX.Input.device, keys = d.phim ? (d.phim[dev] || d.phim.pc) : [];
      const chu = typeof d.chu === 'function' ? d.chu() : d.chu, xong = b.xongT !== undefined;
      const vao = Math.min(1, b.t / 0.25), ra = xong ? Math.max(0, 1 - Math.max(0, b.xongT - 0.5) / 0.4) : 1;
      const so = CO_BAN.indexOf(d);
      c.save();
      c.globalAlpha = vao * ra;
      c.textBaseline = 'middle';
      c.font = `bold 15px ${FONT}`;
      const wTen = c.measureText(d.ten).width;
      let wPhim = 0;
      keys.forEach(k => { wPhim += this.keyCap(c, 0, 0, k, true) + 6; });
      c.font = `13px ${FONT}`;
      const wChu = c.measureText(chu).width;
      const wCham = so >= 0 ? CO_BAN.length * 9 + 12 : 0;   // chỗ cho chấm tiến độ ở góc phải
      const w = Math.max(wTen + wPhim + 70 + wCham, wChu + 40, 260), h = 64, x = VW / 2 - w / 2, y = 12 - (1 - vao) * 16;
      c.fillStyle = 'rgba(8,16,14,0.84)';
      c.strokeStyle = xong ? 'rgba(159,240,181,0.95)' : 'rgba(160,230,180,0.45)';
      c.lineWidth = xong ? 2 : 1;
      c.beginPath(); c.roundRect(x, y, w, h, 10); c.fill(); c.stroke();
      // dấu tick khi xong, số bước với bài cơ bản
      let cx = x + 16;
      if (xong) {
        c.strokeStyle = '#9ff0b5'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx, y + 22); c.lineTo(cx + 5, y + 27); c.lineTo(cx + 14, y + 16); c.stroke();
        cx += 22;
      } else if (so >= 0) {
        c.font = `bold 12px ${FONT}`;
        c.fillStyle = '#9ff0b5';
        c.textAlign = 'left';
        c.fillText(`${so + 1}/${CO_BAN.length}`, cx, y + 22);
        cx += 30;
      } else {
        c.font = `15px ${FONT}`;
        c.textAlign = 'left';
        c.fillStyle = '#ffe08a';
        c.fillText('💡', cx - 2, y + 22);
        cx += 24;
      }
      c.font = `bold 15px ${FONT}`;
      c.textAlign = 'left';
      c.fillStyle = '#f2f7f0';
      c.fillText(d.ten, cx, y + 22);
      let kx = cx + wTen + 14;
      keys.forEach(k => { kx += this.keyCap(c, kx, y + 22, k) + 6; });
      c.font = `13px ${FONT}`;
      c.fillStyle = '#bfe6c8';
      c.fillText(chu, x + 16, y + 47);
      // chấm tiến độ bài cơ bản
      if (so >= 0) {
        CO_BAN.forEach((s2, i) => {
          c.fillStyle = S().tut[s2.id] || i < so ? '#9ff0b5' : i === so ? '#fff6c8' : 'rgba(255,255,255,0.2)';
          c.beginPath(); c.arc(x + w - 14 - (CO_BAN.length - 1 - i) * 9, y + 10, 2.5, 0, 6.283); c.fill();
        });
      }
      c.restore();
      // mũi tên chỉ quả cầu năng lượng
      if (d.chiQuaCau && !xong) {
        const bx = 100 + Math.abs(Math.sin(t * 4)) * 8;
        c.save();
        c.globalAlpha = vao;
        c.fillStyle = '#9ff0b5';
        c.beginPath(); c.moveTo(bx, 56); c.lineTo(bx + 14, 46); c.lineTo(bx + 14, 66); c.closePath(); c.fill();
        c.restore();
      }
    },

    // Một phím (ô bo góc có chữ) hoặc con chuột. Trả về bề rộng; chiDo = chỉ đo không vẽ.
    keyCap(c, x, y, k, chiDo) {
      if (k === '/' || k === '+') {
        c.font = `13px ${FONT}`;
        const w = c.measureText(k).width;
        if (!chiDo) { c.fillStyle = '#8fb59a'; c.textAlign = 'left'; c.fillText(k, x, y); }
        return w;
      }
      if (k.startsWith('chuot')) {
        if (chiDo) return 18 + (k === 'chuot' ? 0 : 12);
        c.fillStyle = '#1c2a24';
        c.strokeStyle = '#9ff0b5';
        c.lineWidth = 1.5;
        c.beginPath(); c.roundRect(x, y - 12, 16, 24, 8); c.fill(); c.stroke();
        c.fillStyle = '#9ff0b5';
        c.beginPath(); c.roundRect(x + 1.5, y - 10.5, 6, 9, [6, 1, 1, 1]); c.fill();   // nút trái
        c.beginPath(); c.moveTo(x + 8, y - 12); c.lineTo(x + 8, y - 2); c.stroke();
        if (k !== 'chuot') {
          const up = k === 'chuot_len', ax = x + 23;
          c.strokeStyle = '#fff6c8';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(ax, y + (up ? 8 : -8)); c.lineTo(ax, y + (up ? -8 : 8));
          c.moveTo(ax - 4, y + (up ? -4 : 4)); c.lineTo(ax, y + (up ? -8 : 8)); c.lineTo(ax + 4, y + (up ? -4 : 4));
          c.stroke();
        }
        return 18 + (k === 'chuot' ? 0 : 12);
      }
      c.font = `bold 12px ${FONT}`;
      const w = Math.max(24, c.measureText(k).width + 14);
      if (chiDo) return w;
      c.fillStyle = '#1c2a24';
      c.strokeStyle = '#9ff0b5';
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(x, y - 12, w, 24, 5); c.fill(); c.stroke();
      c.fillStyle = 'rgba(159,240,181,0.25)';
      c.fillRect(x + 2, y + 8, w - 4, 2);
      c.fillStyle = '#ffffff';
      c.textAlign = 'center';
      c.fillText(k, x + w / 2, y + 1);
      c.textAlign = 'left';
      return w;
    },
  };
  HD.init();
})();
