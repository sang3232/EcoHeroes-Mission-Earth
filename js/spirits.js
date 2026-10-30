/* Tinh linh hỗ trợ: bay nối đuôi sau Mầm, tỏa sáng */
(function () {
  const D = HSX.DATA;

  HSX.Spirits = {
    list: [],

    // Đồng bộ với các tinh linh đã giải cứu; tinh linh mới xuất hiện ở vị trí cho trước (lồng vừa vỡ)
    sync(x, y) {
      const P = HSX.Player;
      D.spiritOrder.forEach(id => {
        if (!HSX.S.spirits[id] || this.list.some(s => s.id === id)) return;
        this.list.push({ id, x: x === undefined ? P.cx() : x, y: y === undefined ? P.b.y : y, t: Math.random() * 6 });
      });
      this.list = this.list.filter(s => HSX.S.spirits[s.id]);
    },

    // Đặt lại cạnh Mầm khi sang phòng mới
    snap() {
      const P = HSX.Player;
      this.list.forEach((s, i) => { s.x = P.cx() - P.face * (28 + i * 24); s.y = P.b.y - 14; });
    },

    update(dt) {
      const P = HSX.Player;
      let lx = P.cx(), ly = P.b.y + 4;
      this.list.forEach((s, i) => {
        s.t += dt;
        const tx = lx - P.face * (i === 0 ? 30 : 26);
        const ty = ly - 18 + Math.sin(s.t * 2.4 + i) * 6;
        const k = Math.min(1, dt * (5 - i * 0.6));
        s.x += (tx - s.x) * k;
        s.y += (ty - s.y) * k;
        lx = s.x;
        ly = s.y + 18;
      });
    },

    lights() {
      return this.list.map(s => ({ x: s.x, y: s.y, r: 85, glow: D.spirits[s.id].glow }));
    },
  };
})();
