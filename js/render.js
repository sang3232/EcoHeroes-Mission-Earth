/* Vẽ: nền nhiều lớp, ô gạch, vật thể, nhân vật, ánh sáng, HUD */
(function () {
  const T = HSX.T, VW = HSX.VW, VH = HSX.VH, D = HSX.DATA, A = HSX.Assets;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
  const PAL = {
    bai_bien: { top: '#e9d39a', body: '#b88a52', dark: '#7d5a32', edge: '#5c4024', plank: '#8b5a2b', tuft: '#7fae5a' },
    hang:     { top: '#8a93a6', body: '#4a5262', dark: '#30364a', edge: '#1d2233', plank: '#6b4a2b', tuft: '#5f8d8a' },
    dao_rac:  { top: '#8c8466', body: '#5e5a48', dark: '#3e3b2f', edge: '#2a281f', plank: '#6b5a3b', tuft: '#7c6b9c' },
    boss:     { top: '#6a5a86', body: '#3a2f48', dark: '#271f33', edge: '#160f20', plank: '#4b3a5b', tuft: '#8e6bc4' },
  };
  const TEX = { bai_bien: 'bg/o_cat', dao_rac: 'bg/o_cat', hang: 'bg/o_da', boss: 'bg/o_da' };
  const MAM_DRAW = 114, MAM_DX = 6;   // cỡ vẽ khung Mầm (thân cao ~61 px), dịch tới trước cho thân (không phải mặt nạ) ở giữa hộp va chạm
  const SOLIDISH = c => c === '#' || c === 'X' || (c === '?' && !HSX.S.owned.kinh_lup);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const lerp = (a, b, t) => a + (b - a) * t;
  function mix(c1, c2, t) {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    return `rgb(${Math.round(lerp(a >> 16, b >> 16, t))},${Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t))},${Math.round(lerp(a & 255, b & 255, t))})`;
  }
  const mixA = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const rgba = (a, al) => `rgba(${a[0]},${a[1]},${a[2]},${al === undefined ? 1 : al})`;
  const hex = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };

  // Không khí từng khu lúc tối nhất. Cảnh được NHÂN với màu amb (giữ màu, chi tiết), nền xa nhân với bg (sáng hơn cảnh
  // để đất đá nổi thành bóng), sương phủ kiểu screen, bụi lấp lánh, tia sáng, vig là màu viền tối mép màn hình.
  // Màn sạch dần thì mọi màu tiến về DAY (ban ngày).
  const MOOD = {
    bai_bien: { sky: true, amb: [36, 50, 92], bg: [50, 68, 116], fog: [52, 82, 136], dust: [190, 225, 255], ray: [160, 200, 255], vig: '3,8,22' },
    hang:     { sky: false, amb: [26, 40, 60], bg: [38, 58, 84], fog: [36, 72, 102], dust: [130, 210, 255], ray: [120, 185, 235], vig: '2,6,14' },
    dao_rac:  { sky: true, amb: [44, 32, 64], bg: [62, 48, 86], fog: [80, 56, 108], dust: [205, 175, 255], ray: [190, 160, 255], vig: '10,4,18' },
    boss:     { sky: false, amb: [30, 18, 48], bg: [48, 28, 72], fog: [74, 36, 112], dust: [210, 145, 255], ray: null, vig: '8,2,16' },
  };
  const DAY = { amb: [255, 255, 255], bg: [255, 255, 255], fog: [170, 165, 155], dust: [255, 226, 150], ray: [255, 226, 165] };
  // Viền nhân vật: vòng sáng mảnh bao quanh (line) và ánh trăng hắt lên mép trên (top)
  const RIM = {
    mam:  { line: 'rgba(160,255,195,0.5)', top: 'rgba(230,255,238,0.9)' },
    quai: { line: 'rgba(205,150,255,0.55)', top: 'rgba(205,220,255,0.75)' },
  };
  const RIM_PAD = 6;

  const R = HSX.Render = {
    tilesDirty: true, k: 1, cam: { x: 0, y: 0 }, rimQ: null,

    init(cv) {
      this.cv = cv;
      this.ctx = cv.getContext('2d');
      const off = (w, h) => { const x = document.createElement('canvas'); if (w) { x.width = w; x.height = h; } return x; };
      this.light = off(VW / 2, VH / 2);   // bản đồ sáng, nửa độ phân giải
      this.lctx = this.light.getContext('2d');
      this.worldCv = off();               // lớp cảnh (đất, vật, quái, Mầm), chiếu sáng riêng với nền
      this.wctx = this.worldCv.getContext('2d');
      this.maskCv = off();                // bản sao độ trong suốt của lớp cảnh
      this.mctx = this.maskCv.getContext('2d');
      this.motes = Array.from({ length: 70 }, () => ({
        x: Math.random() * 2000, y: Math.random() * 1200, z: 0.5 + Math.random() * 0.95, r: 0.7 + Math.random() * 1.4,
        ph: Math.random() * 6.283, vx: (Math.random() - 0.5) * 10, vy: -4 - Math.random() * 10,
      }));
      this.resize();
      addEventListener('resize', () => this.resize());
    },
    resize() {
      this.k = Math.min(2, window.devicePixelRatio || 1);
      [this.cv, this.worldCv, this.maskCv].forEach(x => { x.width = VW * this.k; x.height = VH * this.k; });
    },

    mood(area, amb) {
      const m = MOOD[area] || MOOD.bai_bien, t = HSX.clamp(amb, 0, 1);
      const o = { sky: m.sky, vig: m.vig, dark: 1 - t };
      ['amb', 'bg', 'fog', 'dust'].forEach(n => { o[n] = mixA(m[n], DAY[n], t); });
      o.ray = m.ray && mixA(m.ray, DAY.ray, t);
      return o;
    },

    // ---------- Khung hình ----------
    draw() {
      const W = HSX.World, r = W.room, c = this.ctx;
      if (!r) return;
      if (this.tilesDirty || this.tileRoom !== r) this.buildTiles(r);
      c.setTransform(this.k, 0, 0, this.k, 0, 0);
      c.imageSmoothingEnabled = true;
      const amb = W.ambient(), m = this.mood(r.def.area, amb), t = performance.now() / 1000;
      const sh = W.shake;
      const cam = this.cam = { x: Math.round(W.cam.x + (Math.random() - 0.5) * sh), y: Math.round(W.cam.y + (Math.random() - 0.5) * sh) };
      // 1. Nền xa (đã nhuộm màu đêm) và sương xa
      this.drawBg(r, cam, amb, m);
      this.drawFog(m, cam, t, false);

      // 2. Cảnh vẽ lên lớp riêng để chiếu sáng mà không làm tối nền
      const wc = this.wctx;
      wc.setTransform(1, 0, 0, 1, 0, 0);
      wc.clearRect(0, 0, this.worldCv.width, this.worldCv.height);
      wc.setTransform(this.k, 0, 0, this.k, 0, 0);
      wc.imageSmoothingEnabled = true;
      this.ctx = wc;
      this.rimQ = [];
      wc.save();
      wc.translate(-cam.x, -cam.y);
      wc.drawImage(this.tileCv, 0, 0);
      this.drawDynamicTiles(r, cam);
      r.objs.forEach(o => this.drawObj(o, r));
      this.drawCritters(r);
      W.pickups.forEach(p => this.emoji(p.id === 'seed' ? '🌱' : D.items[p.id].emoji, p.x + 8, p.y + 15, 16));
      W.shots.forEach(s => this.drawShot(s));
      W.enemies.forEach(e => { if (!e.dead) this.drawEnemy(e); });
      this.drawSpirits();
      this.drawPlayer();
      W.fx.forEach(p => { wc.globalAlpha = Math.max(0, p.life / p.max); wc.fillStyle = p.color; wc.beginPath(); wc.arc(p.x, p.y, p.r, 0, 6.283); wc.fill(); });
      wc.globalAlpha = 1;
      wc.restore();
      this.ctx = c;

      // 3. Ánh sáng, viền nhân vật, quầng sáng, tia sáng, sương gần, bụi, tiền cảnh, viền tối mép màn hình
      const lights = W.lights();
      this.lightWorld(m, cam, lights);
      c.drawImage(this.worldCv, 0, 0, VW, VH);
      this.drawRims(m);
      this.rimQ = null;
      if (HSX.Player.atkT > 0) {   // vệt chém vẽ sau ánh sáng: luôn sáng rõ
        c.save();
        c.translate(-cam.x, -cam.y);
        this.slash(HSX.Player);
        c.restore();
      }
      this.drawGlow(m, cam, lights);
      this.drawRays(m, cam, t);
      this.drawFog(m, cam, t, true);
      this.drawMotes(m, cam, t, lights);
      this.drawFg(r, m, cam);
      this.drawVignette(m);

      c.save();
      c.translate(-cam.x, -cam.y);
      this.drawTipPrompt(W);
      W.texts.forEach(t => this.label(t.s, t.x, t.y, t.size, t.color, Math.min(1, t.life / t.max * 2)));
      c.restore();

      this.drawHud(W);
      if (W.bannerData) this.drawBanner(W.bannerData);
      if (HSX.S.dawn && W.dawnT < 7) {
        const k = Math.sin(Math.min(1, W.dawnT / 7) * Math.PI) * 0.35;
        const g = c.createLinearGradient(0, 0, 0, VH);
        g.addColorStop(0, `rgba(255,190,120,${k})`);
        g.addColorStop(1, `rgba(255,240,200,${k * 0.4})`);
        c.fillStyle = g;
        c.fillRect(0, 0, VW, VH);
      }
      if (W.fade > 0) { c.fillStyle = `rgba(0,0,0,${W.fade})`; c.fillRect(0, 0, VW, VH); }
      if (W.mode === 'dead') {
        c.fillStyle = `rgba(0,0,0,${Math.min(0.7, (1.1 - W.deadT) * 0.8)})`;
        c.fillRect(0, 0, VW, VH);
      }
    },

    // ---------- Nền ----------
    // Ảnh nền Qwen là cảnh ban ngày: nhân với màu không khí (nhớ sẵn, chỉ tính lại khi độ sáng đổi), rồi phủ sương
    drawBg(r, cam, amb, m) {
      const c = this.ctx, area = r.def.area, far = A.get('bg/' + area + '_xa');
      if (far) {
        const img = this.tinted(far, m.bg), s = VH / far.height, w = far.width * s, off = -((cam.x * 0.2) % w), oy = -cam.y * 0.08;
        for (let x = off - (off > 0 ? w : 0); x < VW; x += w) c.drawImage(img, x, oy, w, VH + 40);
        this.haze(m, 0.6);
      } else if (area === 'bai_bien') this.bgBeach(cam, amb);
      else if (area === 'hang') this.bgCave(cam, amb, '#05070c', '#151b28');
      else if (area === 'dao_rac') this.bgIsland(cam, amb);
      else this.bgCave(cam, amb, '#06030b', '#1d1030');
      const near = area === 'bai_bien' && A.get('bg/bai_bien_gan');
      if (near) {
        // dải cây, đá sát đáy màn hình, trôi nhanh hơn lớp xa, tối hơn lớp xa một chút vì ở gần
        const img = this.tinted(near, mixA(m.bg, [0, 0, 0], 0.18));
        const w = near.width, off = -((cam.x * 0.45) % w), y = VH - near.height + 30 - cam.y * 0.2;
        for (let x = off - (off > 0 ? w : 0); x < VW; x += w) c.drawImage(img, x, y);
        this.haze(m, 0.25);
      }
    },
    // Bản nhân màu của một ảnh (giữ độ trong suốt). Mỗi ảnh nhớ một bản theo màu gần nhất.
    tinted(img, col) {
      const key = col.join(','), memo = img._tint;
      if (memo && memo.key === key) return memo.cv;
      const cv = memo ? memo.cv : document.createElement('canvas');
      cv.width = img.width;
      cv.height = img.height;
      const g = cv.getContext('2d');
      g.drawImage(img, 0, 0);
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = rgba(col);
      g.fillRect(0, 0, cv.width, cv.height);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(img, 0, 0);
      img._tint = { key, cv };
      return cv;
    },
    // Khí quyển: xa thì mờ sương, đậm nhất gần đường chân trời
    haze(m, a) {
      const c = this.ctx, g = c.createLinearGradient(0, 0, 0, VH), k = a * (0.2 + 0.25 * m.dark);
      g.addColorStop(0, rgba(m.fog, k * 0.25));
      g.addColorStop(0.55, rgba(m.fog, k));
      g.addColorStop(1, rgba(m.fog, k * 0.35));
      c.globalCompositeOperation = 'screen';
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      c.globalCompositeOperation = 'source-over';
    },
    // Dải sương mù trôi chậm: sau cảnh (xa, ngang chân trời) và trước cảnh (gần, sát đáy màn hình)
    fogTex() {
      if (this._fog) return this._fog;
      const cv = document.createElement('canvas'), g = cv.getContext('2d');
      cv.width = 1024;
      cv.height = 256;
      let s = 7;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 80; i++) {
        const x = rnd() * 1024, y = 100 + rnd() * 56, rr = 30 + rnd() * 60, a = 0.06 + rnd() * 0.14;
        [x - 1024, x, x + 1024].forEach(xx => {
          const gr = g.createRadialGradient(xx, y, 0, xx, y, rr);
          gr.addColorStop(0, `rgba(255,255,255,${a})`);
          gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr;
          g.fillRect(xx - rr, y - rr, rr * 2, rr * 2);
        });
      }
      return (this._fog = cv);
    },
    drawFog(m, cam, t, front) {
      const c = this.ctx, tex = this.tinted(this.fogTex(), m.fog), w = 1700, h = front ? 360 : 460;
      const par = front ? 1.2 : 0.3, drift = t * (front ? 16 : 7);
      const y = front ? VH - h * 0.6 - cam.y * 0.03 : VH * 0.22 - cam.y * 0.1;
      const off = -((((cam.x * par + drift) % w) + w) % w);
      c.globalCompositeOperation = 'screen';
      c.globalAlpha = front ? 0.1 + 0.14 * m.dark : 0.2 + 0.45 * m.dark;
      for (let x = off; x < VW; x += w) c.drawImage(tex, x, y, w, h);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    },
    bgBeach(cam, k) {
      const c = this.ctx, t = performance.now() / 1000;
      const g = c.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, mix('#060a1a', '#5fb4ea', k));
      g.addColorStop(0.6, mix('#18224a', '#bfe6f5', k));
      g.addColorStop(1, mix('#2a2a4a', '#ffe2b8', k));
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      if (k < 0.6) {
        c.fillStyle = '#ffffff';
        for (let i = 0; i < 70; i++) {
          c.globalAlpha = (1 - k / 0.6) * (0.4 + 0.6 * hash(i, 3)) * (0.7 + 0.3 * Math.sin(t * 2 + i));
          c.fillRect((hash(i, 1) * 1400 - cam.x * 0.03) % VW, hash(i, 2) * 260, 2, 2);
        }
        c.globalAlpha = 1;
      }
      const sy = lerp(110, 70, k);
      c.fillStyle = k < 0.55 ? 'rgba(235,240,255,0.9)' : 'rgba(255,230,140,0.95)';
      c.beginPath(); c.arc(780 - cam.x * 0.03, sy - cam.y * 0.04, k < 0.55 ? 26 : 34, 0, 6.283); c.fill();
      const seaY = 300 - cam.y * 0.12;
      c.fillStyle = mix('#0b1428', '#2aa7c0', k);
      c.fillRect(0, seaY, VW, VH - seaY);
      c.strokeStyle = mix('#1b2a4a', '#bff3ff', k);
      c.lineWidth = 2;
      for (let row = 0; row < 3; row++) {
        c.beginPath();
        for (let x = 0; x <= VW; x += 24) {
          const y = seaY + 14 + row * 20 + Math.sin(x / 45 + t * 1.6 + row) * 3;
          if (x) c.lineTo(x, y); else c.moveTo(x, y);
        }
        c.stroke();
      }
      c.fillStyle = mix('#070b16', '#5f8a5a', k * 0.9);
      c.beginPath();
      c.moveTo(0, VH);
      for (let x = 0; x <= VW + 40; x += 40) {
        const wx = x + cam.x * 0.35;
        c.lineTo(x, seaY + 40 + Math.sin(wx / 160) * 18 - hash(Math.floor(wx / 40), 7) * 12 - cam.y * 0.05);
      }
      c.lineTo(VW, VH);
      c.fill();
      for (let i = 0; i < 6; i++) {
        const x = ((i * 230 - cam.x * 0.35) % (VW + 200) + VW + 200) % (VW + 200) - 100;
        this.pineSilhouette(x, seaY + 46 - cam.y * 0.05, 60 + hash(i, 9) * 50);
      }
    },
    pineSilhouette(x, y, h) {
      const c = this.ctx;
      c.beginPath();
      c.moveTo(x, y - h);
      c.lineTo(x + h * 0.22, y);
      c.lineTo(x - h * 0.22, y);
      c.closePath();
      c.fill();
    },
    bgCave(cam, k, c1, c2) {
      const c = this.ctx, t = performance.now() / 1000;
      const g = c.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, mix(c1, '#3a4660', k * 0.6));
      g.addColorStop(1, mix(c2, '#56627a', k * 0.6));
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      c.fillStyle = mix('#020306', '#2a3244', k * 0.6);
      for (let i = 0; i < 14; i++) {
        const x = ((i * 90 - cam.x * 0.3) % (VW + 120) + VW + 120) % (VW + 120) - 60;
        const h = 40 + hash(i, 4) * 90;
        c.beginPath(); c.moveTo(x - 22, -cam.y * 0.1); c.lineTo(x, h - cam.y * 0.1); c.lineTo(x + 22, -cam.y * 0.1); c.fill();
      }
      for (let i = 0; i < 10; i++) {
        c.globalAlpha = 0.25 + 0.2 * Math.sin(t * 1.5 + i);
        c.fillStyle = i % 2 ? '#7cc8ff' : '#b89cff';
        const x = ((hash(i, 11) * 1600 - cam.x * 0.3) % VW + VW) % VW;
        c.beginPath(); c.arc(x, 120 + hash(i, 12) * 340 - cam.y * 0.1, 2 + hash(i, 13) * 2, 0, 6.283); c.fill();
      }
      c.globalAlpha = 1;
    },
    bgIsland(cam, k) {
      const c = this.ctx, t = performance.now() / 1000;
      const g = c.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, mix('#0d0716', '#6a7fa8', k));
      g.addColorStop(1, mix('#2a1a36', '#c9b8a8', k));
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      if (k < 0.5 && Math.sin(t * 0.7) > 0.995) { c.fillStyle = 'rgba(220,200,255,0.35)'; c.fillRect(0, 0, VW, VH); }
      c.fillStyle = mix('#08040e', '#4a4a3a', k);
      for (let i = 0; i < 5; i++) {
        const x = ((i * 260 - cam.x * 0.3) % (VW + 300) + VW + 300) % (VW + 300) - 150;
        c.beginPath();
        c.ellipse(x, 360 - cam.y * 0.1, 150 + hash(i, 5) * 80, 70 + hash(i, 6) * 60, 0, Math.PI, 0);
        c.fill();
      }
    },

    // ---------- Ô gạch (vẽ sẵn một lần cho cả phòng) ----------
    buildTiles(r) {
      const cv = this.tileCv && this.tileCv.width === r.w * T && this.tileCv.height === r.h * T ? this.tileCv : document.createElement('canvas');
      cv.width = r.w * T;
      cv.height = r.h * T;
      const g = cv.getContext('2d'), pal = PAL[r.def.area] || PAL.bai_bien;
      const tex = A.get(TEX[r.def.area]), pat = tex && g.createPattern(tex, 'repeat');
      g.clearRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
        const ch = r.grid[y][x], px = x * T, py = y * T;
        if (SOLIDISH(ch)) {
          g.fillStyle = pat || pal.body;
          g.fillRect(px, py, T, T);
          if (pat) { g.fillStyle = 'rgba(40,25,10,0.25)'; g.fillRect(px, py, T, T); }
          const up = r.tile(x, y - 1), dn = r.tile(x, y + 1);
          if (!SOLIDISH(dn)) {
            g.fillStyle = pal.dark; g.fillRect(px, py + T - 8, T, 8);
            g.fillStyle = pal.edge; g.fillRect(px, py + T - 2, T, 2);
            this.underDeco(g, r.def.area, pal, x, y, px, py + T);
          }
          if (hash(x, y) > 0.6) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(px + hash(x, y + 1) * 36, py + 10 + hash(x + 1, y) * 26, 6, 4); }
          if (hash(x, y + 5) > 0.7) { g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(px + hash(x + 2, y) * 34, py + 14 + hash(x, y + 2) * 24, 8, 3); }
          if (!SOLIDISH(up) && y > 0) {
            const edgeY = i => py + 8 + Math.sin((x * 4 + i) * 1.7) * 3;
            // bóng dưới lớp mặt đất, lớp mặt, rồi vệt sáng mảnh ở mép trên
            const sg = g.createLinearGradient(0, py + 6, 0, py + 22);
            sg.addColorStop(0, 'rgba(0,0,0,0.3)');
            sg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = sg;
            g.fillRect(px, py + 6, T, 16);
            g.fillStyle = pal.top;
            g.beginPath();
            g.moveTo(px, py + 10);
            for (let i = 0; i <= 4; i++) g.lineTo(px + i * 12, edgeY(i));
            g.lineTo(px + T, py);
            g.lineTo(px, py);
            g.fill();
            g.strokeStyle = 'rgba(255,255,255,0.28)';
            g.lineWidth = 1.5;
            g.beginPath(); g.moveTo(px, py + 0.75); g.lineTo(px + T, py + 0.75); g.stroke();
            this.topDeco(g, r.def.area, pal, x, y, px, py);
          }
          if (!SOLIDISH(r.tile(x - 1, y))) { g.fillStyle = pal.edge; g.fillRect(px, py, 3, T); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(px + 3, py, 2, T); }
          if (!SOLIDISH(r.tile(x + 1, y))) { g.fillStyle = pal.edge; g.fillRect(px + T - 3, py, 3, T); }
          if (ch === 'X') {
            g.fillStyle = 'rgba(60,45,30,0.55)';
            g.fillRect(px, py, T, T);
            g.strokeStyle = '#1e140c';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(px + 6, py + 4); g.lineTo(px + 20, py + 22); g.lineTo(px + 14, py + 40);
            g.moveTo(px + 20, py + 22); g.lineTo(px + 40, py + 16);
            g.stroke();
            g.font = `16px ${EMOJI}`;
            g.textAlign = 'center';
            g.fillText(hash(x, y) > 0.5 ? '🥫' : '🧴', px + 32, py + 40);
          }
        } else if (ch === '=') {
          g.fillStyle = pal.plank;
          g.fillRect(px, py, T, 12);
          g.fillStyle = 'rgba(255,255,255,0.18)';
          g.fillRect(px, py, T, 3);
          g.fillStyle = 'rgba(0,0,0,0.3)';
          g.fillRect(px + T - 2, py, 2, 12);
          g.fillRect(px + 8, py + 12, 4, 8);
          g.fillRect(px + T - 12, py + 12, 4, 8);
        } else if (ch === '^') {
          g.fillStyle = '#7b3fa0';
          for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(px + i * 12, py + T);
            g.lineTo(px + i * 12 + 6, py + 14 + hash(x + i, y) * 10);
            g.lineTo(px + i * 12 + 12, py + T);
            g.fill();
          }
          g.fillStyle = '#c38be0';
          for (let i = 0; i < 4; i++) g.fillRect(px + i * 12 + 5, py + 18 + hash(x + i, y) * 10, 2, 6);
        }
      }
      this.depthShade(g, r, pal);
      this.tileCv = cv;
      this.tileRoom = r;
      this.tilesDirty = false;
    },

    // Đất càng xa khoảng trống càng tối, trong lòng gần như đen: mặt đất nổi thành khối có mép sáng như Hollow Knight.
    // Mỗi ô một điểm ảnh (độ đậm theo khoảng cách tới ô trống), phóng to mượt lên cả phòng, chỉ phủ lên chỗ có đất.
    depthShade(g, r, pal) {
      const w = r.w, h = r.h, dist = new Int16Array(w * h).fill(999), q = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!SOLIDISH(r.grid[y][x])) { dist[y * w + x] = 0; q.push(x, y); }
      for (let i = 0; i < q.length; i += 2) {
        const x = q[i], y = q[i + 1], d = dist[y * w + x] + 1;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || dist[ny * w + nx] <= d) continue;
          dist[ny * w + nx] = d;
          q.push(nx, ny);
        }
      }
      const cv = document.createElement('canvas');
      cv.width = w;
      cv.height = h;
      const dg = cv.getContext('2d'), im = dg.createImageData(w, h), col = mixA(hex(pal.edge), [0, 0, 0], 0.55);
      for (let i = 0; i < w * h; i++) {
        const d = dist[i];
        im.data[i * 4] = col[0]; im.data[i * 4 + 1] = col[1]; im.data[i * 4 + 2] = col[2];
        im.data[i * 4 + 3] = d <= 0 ? 0 : Math.round(255 * Math.min(0.92, 0.08 + (d - 1) * 0.34));
      }
      dg.putImageData(im, 0, 0);
      g.save();
      g.globalCompositeOperation = 'source-atop';
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = 'high';
      g.drawImage(cv, 0, 0, w * T, h * T);
      g.restore();
    },

    // Chi tiết trên mặt đất: cỏ, vỏ sò, sỏi, mảnh nhựa (bãi biển, đảo rác), rêu và tinh thể nhỏ (hang)
    topDeco(g, area, pal, x, y, px, py) {
      const h = n => hash(x * 3 + n, y * 7 + n);
      if (h(1) > 0.45) {   // cỏ: 2-4 lá cong
        g.strokeStyle = pal.tuft;
        g.lineWidth = 1.6;
        const tx = px + 6 + h(2) * 34, n = 2 + Math.floor(h(3) * 3);
        g.beginPath();
        for (let i = 0; i < n; i++) {
          const bx = tx + i * 3, len = 6 + h(4 + i) * 9, lean = (h(8 + i) - 0.5) * 8;
          g.moveTo(bx, py + 3);
          g.quadraticCurveTo(bx + lean * 0.3, py - len * 0.6, bx + lean, py - len);
        }
        g.stroke();
      }
      if (area === 'hang' || area === 'boss') {
        if (h(5) > 0.5) {   // rêu
          g.fillStyle = area === 'hang' ? 'rgba(80,140,130,0.7)' : 'rgba(120,90,170,0.7)';
          g.beginPath(); g.ellipse(px + h(6) * T, py + 3, 6 + h(7) * 8, 3, 0, 0, 6.283); g.fill();
        }
        if (h(9) > 0.82) {   // tinh thể
          const cx = px + 8 + h(10) * 30;
          g.fillStyle = area === 'hang' ? '#7fd6ff' : '#c49bff';
          g.beginPath(); g.moveTo(cx - 3, py + 2); g.lineTo(cx, py - 9 - h(11) * 6); g.lineTo(cx + 3, py + 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.6)';
          g.fillRect(cx - 0.5, py - 5, 1, 5);
        }
        return;
      }
      if (h(12) > 0.72) {   // sỏi
        g.fillStyle = 'rgba(70,55,40,0.55)';
        g.beginPath(); g.ellipse(px + h(13) * T, py + 4, 3, 2, 0, 0, 6.283); g.ellipse(px + h(14) * T, py + 5, 2, 1.5, 0, 0, 6.283); g.fill();
      }
      if (area === 'bai_bien' && h(15) > 0.8) {   // vỏ sò
        const cx = px + 6 + h(16) * 36;
        g.fillStyle = '#f3e3cf';
        g.beginPath(); g.arc(cx, py + 4, 3.5, Math.PI, 0); g.fill();
        g.strokeStyle = 'rgba(150,110,80,0.6)';
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(cx, py + 4); g.lineTo(cx, py + 1); g.moveTo(cx - 2, py + 4); g.lineTo(cx - 2.5, py + 2); g.moveTo(cx + 2, py + 4); g.lineTo(cx + 2.5, py + 2); g.stroke();
      }
      if (h(17) > (area === 'dao_rac' ? 0.55 : 0.86)) {   // mảnh nhựa, nắp chai
        g.save();
        g.translate(px + 6 + h(18) * 36, py + 3);
        g.rotate((h(19) - 0.5) * 1.2);
        g.fillStyle = ['#e05a5a', '#4a90d9', '#f2f2f2', '#f2c14e', '#5cc48a'][Math.floor(h(20) * 5)];
        if (h(21) > 0.5) g.fillRect(-4, -1.5, 8, 3);
        else { g.beginPath(); g.arc(0, 0, 2.5, 0, 6.283); g.fill(); }
        g.restore();
      }
    },

    // Dưới gầm đất: rễ cây rủ (bãi biển), thạch nhũ (hang), dải nilon rách (đảo rác, phòng boss)
    underDeco(g, area, pal, x, y, px, by) {
      const h = n => hash(x * 5 + n, y * 3 + n);
      if (area === 'hang') {
        if (h(1) > 0.45) {
          const cx = px + 6 + h(2) * 34, len = 8 + h(3) * 18, w = 4 + h(4) * 5;
          g.fillStyle = pal.dark;
          g.beginPath(); g.moveTo(cx - w, by); g.lineTo(cx, by + len); g.lineTo(cx + w, by); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.12)';
          g.beginPath(); g.moveTo(cx - w * 0.5, by); g.lineTo(cx, by + len * 0.8); g.lineTo(cx - w * 0.1, by); g.fill();
        }
        return;
      }
      const n = Math.floor(h(5) * 3);
      for (let i = 0; i < n; i++) {
        const sx = px + 6 + h(6 + i) * 36, len = 8 + h(9 + i) * 16, sw = (h(12 + i) - 0.5) * 10;
        if (area === 'bai_bien') {
          g.strokeStyle = pal.edge;
          g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(sx, by - 1); g.quadraticCurveTo(sx + sw, by + len * 0.5, sx + sw * 0.4, by + len); g.stroke();
        } else {
          g.fillStyle = area === 'boss' ? 'rgba(170,150,210,0.45)' : 'rgba(200,200,190,0.4)';
          g.beginPath();
          g.moveTo(sx - 2.5, by);
          g.quadraticCurveTo(sx + sw, by + len * 0.5, sx + sw * 0.3, by + len);
          g.quadraticCurveTo(sx + sw * 0.6 + 2, by + len * 0.5, sx + 2.5, by);
          g.fill();
        }
      }
    },

    drawDynamicTiles(r, cam) {
      const c = this.ctx, S = HSX.S, t = performance.now() / 1000;
      const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(r.w - 1, x0 + Math.ceil(VW / T) + 2);
      const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(r.h - 1, y0 + Math.ceil(VH / T) + 2);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const ch = r.grid[y][x], px = x * T, py = y * T;
        if (ch === '~') {
          const surf = r.tile(x, y - 1) !== '~';
          c.fillStyle = S.owned.xuong_phao ? 'rgba(90,60,140,0.75)' : 'rgba(110,50,150,0.82)';
          c.fillRect(px, py + (surf ? 8 : 0), T, T - (surf ? 8 : 0));
          if (surf) {
            c.strokeStyle = S.owned.xuong_phao ? '#cfe8ff' : '#c58cff';
            c.lineWidth = 3;
            c.beginPath();
            for (let i = 0; i <= 6; i++) { const yy = py + 8 + Math.sin(t * 3 + x + i) * 2.5; if (i) c.lineTo(px + i * 8, yy); else c.moveTo(px, yy); }
            c.stroke();
            if (hash(x, Math.floor(t)) > 0.8) { c.fillStyle = '#d6a8ff'; c.beginPath(); c.arc(px + hash(x, y) * T, py + 12 + (t % 1) * 10, 3, 0, 6.283); c.fill(); }
          }
        } else if (ch === 'G' && !S.puzzle.solved) {
          c.fillStyle = '#2b3a4a';
          c.fillRect(px + 8, py, T - 16, T);
          c.fillStyle = '#7cc8ff';
          for (let i = 0; i < 3; i++) c.fillRect(px + 12 + i * 9, py, 4, T);
          if (r.tile(x, y - 1) !== 'G') { c.font = `22px ${EMOJI}`; c.textAlign = 'center'; c.fillText('♻️', px + T / 2, py + 30); }
        } else if (ch === 'D' && !S.flags.sorted) {
          c.fillStyle = '#5b3a1e';
          c.fillRect(px + 10, py, T - 20, T);
          c.fillStyle = '#8b5a2b';
          for (let i = 0; i < 3; i++) c.fillRect(px + 10, py + 6 + i * 15, T - 20, 5);
        } else if (ch === '?' && S.owned.kinh_lup) {
          c.fillStyle = 'rgba(140,200,255,0.18)';
          c.fillRect(px, py, T, T);
          c.strokeStyle = `rgba(160,220,255,${0.4 + 0.3 * Math.sin(t * 3)})`;
          c.setLineDash([6, 5]);
          c.strokeRect(px + 2, py + 2, T - 4, T - 4);
          c.setLineDash([]);
        } else if (ch >= '1' && ch <= '9' && r.locked) {
          c.fillStyle = `rgba(150,80,220,${0.45 + 0.2 * Math.sin(t * 6)})`;
          c.fillRect(px + 6, py, T - 12, T);
        }
      }
    },

    // ---------- Vật thể ----------
    drawObj(o, r) {
      const c = this.ctx, S = HSX.S, t = performance.now() / 1000;
      const cx = o.x + T / 2, by = o.y + T, sx = o.shake ? Math.sin(t * 80) * 4 : 0;
      switch (o.type) {
        case 'bench':
          c.fillStyle = '#6b4424';
          c.fillRect(cx - 34, by - 20, 68, 8);
          c.fillRect(cx - 30, by - 12, 6, 12);
          c.fillRect(cx + 24, by - 12, 6, 12);
          c.fillRect(cx - 34, by - 46, 68, 6);
          c.fillRect(cx - 32, by - 46, 5, 28);
          c.fillRect(cx + 27, by - 46, 5, 28);
          c.fillStyle = `rgba(150,255,180,${0.6 + 0.3 * Math.sin(t * 2)})`;
          c.beginPath(); c.arc(cx, by - 62, 13, 0, 6.283); c.fill();
          this.emoji('♻️', cx, by - 54, 18);
          break;
        case 'heap':
          c.fillStyle = '#5d4630';
          c.beginPath(); c.ellipse(cx + sx, by - 4, 24, 20, 0, Math.PI, 0); c.fill();
          c.fillStyle = '#7a5f42';
          c.beginPath(); c.ellipse(cx + sx - 4, by - 12, 14, 10, 0, Math.PI, 0); c.fill();
          this.emoji('🧴', cx + sx - 10, by - 12, 16);
          this.emoji('🛍️', cx + sx + 8, by - 16, 16);
          this.emoji('🥫', cx + sx + 1, by - 26, 14);
          if (o.hp < 3) { c.strokeStyle = '#1e140c'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 14, by - 6); c.lineTo(cx - 4, by - 18); c.lineTo(cx + 6, by - 8); c.stroke(); }
          break;
        case 'cage': {
          const img = A.get('heroes/' + o.spirit);
          c.globalAlpha = 0.55;
          if (img) c.drawImage(img, cx - 26 + sx, by - 66, 52, 52);
          else this.emoji(D.spirits[o.spirit].emoji, cx + sx, by - 24, 30);
          c.globalAlpha = 1;
          c.strokeStyle = '#8a4fc0';
          c.lineWidth = 4;
          for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(cx - 24 + i * 12 + sx, by); c.lineTo(cx - 24 + i * 12 + sx, by - 72); c.stroke(); }
          c.fillStyle = '#5e2f86';
          c.fillRect(cx - 28 + sx, by - 78, 56, 8);
          c.fillRect(cx - 28 + sx, by - 6, 56, 6);
          if (!HSX.World.cageOpen()) this.emoji('🔒', cx + sx, by - 30, 16);
          break;
        }
        case 'plant': {
          const tr = (S.trees[r.id] || {})[o.idx];
          c.fillStyle = '#4a3220';
          c.beginPath(); c.ellipse(cx, by - 2, 20, 7, 0, Math.PI, 0); c.fill();
          if (!tr) { c.fillStyle = 'rgba(160,230,150,0.5)'; c.fillRect(cx - 1, by - 12, 2, 8); break; }
          const d = D.trees[tr.type], img = A.get('trees/' + tr.type), size = 26 + 50 * tr.g;
          if (img) c.drawImage(img, cx - size / 2, by - size - 2, size, size);
          else this.emoji(tr.g >= 1 ? d.emoji : '🌱', cx, by - 4, tr.g >= 1 ? 58 : size * 0.6);
          break;
        }
        case 'shard': {
          const y = o.y + T / 2 + Math.sin(t * 2.5) * 5;
          c.save(); c.translate(cx, y); c.rotate(Math.sin(t * 2) * 0.3);
          c.fillStyle = '#7be08f'; c.strokeStyle = '#e8ffe9'; c.lineWidth = 2;
          c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(12, 0, 0, 14); c.quadraticCurveTo(-12, 0, 0, -14); c.fill(); c.stroke();
          c.restore();
          break;
        }
        case 'journal':
          c.fillStyle = '#5b3a1e';
          c.fillRect(cx - 4, by - 26, 8, 26);
          c.fillStyle = '#f0e2c0';
          c.fillRect(cx - 18, by - 38, 36, 14);
          c.fillStyle = '#7a5a3a';
          c.fillRect(cx - 1, by - 38, 2, 14);
          break;
        case 'lantern':
          c.strokeStyle = '#3a2a1a'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(cx, o.y - 4); c.lineTo(cx, o.y + 10); c.stroke();
          c.fillStyle = `rgba(255,200,120,${0.8 + 0.2 * Math.sin(t * 5)})`;
          c.fillRect(cx - 9, o.y + 10, 18, 22);
          c.strokeStyle = '#3a2a1a'; c.strokeRect(cx - 9, o.y + 10, 18, 22);
          break;
        case 'nest':
          c.fillStyle = '#c9a66b';
          c.beginPath(); c.ellipse(cx, by - 2, 26, 9, 0, Math.PI, 0); c.fill();
          c.fillStyle = '#fff6e6';
          [[-8, -8], [0, -10], [8, -7]].forEach(([dx, dy]) => { c.beginPath(); c.ellipse(cx + dx, by + dy, 5, 6, 0, 0, 6.283); c.fill(); });
          if (S.owned.rao_chan) {
            for (let i = -2; i <= 2; i++) {
              c.fillStyle = ['#2f80ed', '#27ae60', '#e67e22', '#9b51e0', '#eb5757'][i + 2];
              c.fillRect(cx + i * 16 - 5, by - 30, 10, 28);
              c.fillStyle = 'rgba(255,255,255,0.35)';
              c.fillRect(cx + i * 16 - 5, by - 30, 10, 5);
            }
          }
          break;
        case 'bin': {
          const b = D.bins[o.bin];
          c.fillStyle = b.color;
          c.fillRect(cx - 20, by - 40, 40, 40);
          c.fillStyle = 'rgba(0,0,0,0.25)';
          c.fillRect(cx - 22, by - 44, 44, 6);
          this.emoji(b.emoji, cx, by - 12, 20);
          this.label(b.name, cx, by - 54, 11, '#ffffff', 0.9);
          break;
        }
        case 'sortItem':
          this.emoji(D.sortItems[o.k % D.sortItems.length].emoji, o.x + 15, o.y + 27, 26);
          break;
      }
    },

    drawCritters(r) {
      const S = HSX.S, t = performance.now() / 1000;
      if (r.id === 'hang_cong' && S.species.cong_gio) {
        for (let i = 0; i < 3; i++) this.sprite('species/cong_gio', '🦀', 250 + i * 380 + Math.sin(t * 0.9 + i * 2) * 70, 11 * T, 28);
      }
      if (r.id === 'bai_de_rua' && S.species.rua_bien) {
        const nest = r.objs.find(o => o.type === 'nest');
        if (nest) this.sprite('species/rua_bien', '🐢', nest.x + T + 40 + Math.sin(t * 0.3) * 14, nest.y + T, 44);
      }
    },

    drawShot(s) {
      const c = this.ctx;
      if (s.type === 'bag') { this.emoji('🛍️', s.x + s.w / 2, s.y + s.h - 2, 32); return; }
      const g = c.createLinearGradient(0, s.y, 0, s.y + s.h);
      g.addColorStop(0, 'rgba(190,140,255,0)');
      g.addColorStop(1, 'rgba(190,140,255,0.9)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(s.x, s.y + s.h);
      c.quadraticCurveTo(s.x + s.w / 2, s.y - 10, s.x + s.w, s.y + s.h);
      c.fill();
    },

    drawEnemy(e) {
      const c = this.ctx, t = performance.now() / 1000, img = A.get('enemies/' + e.img);
      const cx = e.x + e.w / 2, by = e.y + e.h;
      const wobble = (e.state === 'windup' || e.state === 'raise') ? Math.sin(t * 60) * 2 : 0;
      c.save();
      c.translate(cx + wobble, by + (e.def.fly ? Math.sin(e.ph * 3) * 3 : 0));
      if (e.dir > 0) c.scale(-1, 1);
      const sq = e.squash, stretch = !e.ground && !e.def.fly ? 0.06 : 0;
      c.scale(1 + sq * 0.15 - stretch, 1 - sq * 0.2 + stretch);
      if (e.flash > 0) c.filter = 'brightness(2.6)';
      if (e.state === 'stun') c.rotate(Math.sin(t * 12) * 0.05);
      if (img) {
        const size = e.h / 0.8 * (e.kind === 'boss' ? 1.08 : 1.15);
        if (e.def.fly) c.globalAlpha = 0.9;
        this.spr(img, -size / 2, -size + 4, size, size, 'quai');
      } else {
        c.fillStyle = e.def.color;
        c.beginPath(); c.ellipse(0, -e.h / 2, e.w / 2, e.h / 2, 0, 0, 6.283); c.fill();
        c.filter = 'none';
        this.emoji(e.def.emoji, 0, -e.h * 0.25, e.h * 0.55);
      }
      c.restore();
      if (e.kind === 'boss' && e.layers > 0) {
        c.strokeStyle = 'rgba(220,210,255,0.45)';
        c.lineWidth = 3;
        for (let i = 0; i < e.layers; i++) {
          c.beginPath();
          c.ellipse(cx, by - e.h / 2, e.w / 2 + 8 + i * 6, e.h / 2 + 6 + i * 5, Math.sin(t + i) * 0.1, 0, 6.283);
          c.stroke();
        }
      }
      if (e.state === 'stun') this.emoji('💫', cx, e.y - 4, 22);
      if (e.state === 'windup' && e.kind === 'enemy') this.emoji('❗', cx, e.y - 4, 18);
    },

    drawSpirits() {
      const c = this.ctx, t = performance.now() / 1000;
      HSX.Spirits.list.forEach(s => {
        const sp = D.spirits[s.id], img = A.get('heroes/' + s.id);
        const g = c.createRadialGradient(s.x, s.y, 2, s.x, s.y, 26);
        g.addColorStop(0, `rgba(${sp.glow},0.55)`);
        g.addColorStop(1, `rgba(${sp.glow},0)`);
        c.fillStyle = g;
        c.beginPath(); c.arc(s.x, s.y, 26, 0, 6.283); c.fill();
        if (img) c.drawImage(img, s.x - 21, s.y - 30, 42, 42);
        else this.emoji(sp.emoji, s.x, s.y + 8, 24);
        if (Math.random() < 0.15) HSX.World.fx.push({ x: s.x + (Math.random() - 0.5) * 16, y: s.y + 6, vx: 0, vy: 20, g: 0, life: 0.6, max: 0.6, color: sp.color, r: 1.5 });
        void t;
      });
    },

    // ---------- Mầm ----------
    drawPlayer() {
      const c = this.ctx, P = HSX.Player, W = HSX.World, b = P.b, t = performance.now() / 1000;
      const x = P.cx(), y = b.y + b.h;
      const frame = this.playerFrame(P), img = frame && A.get('player/' + frame);
      const ghost = img && (A.get('player/mam_luot_2') || A.get('player/mam_luot') || A.get('player/mam'));
      P.trail.forEach(tr => {
        c.globalAlpha = tr.a * 0.5;
        if (ghost) this.mamImg(ghost, tr.x, tr.y, tr.f);
        else this.mam(tr.x, tr.y, tr.f, { lean: 0.5 });
      });
      c.globalAlpha = 1;
      if (W.mode === 'dead') c.globalAlpha = Math.max(0, W.deadT);
      else if (P.inv > 0 && Math.floor(P.inv * 16) % 2 === 0) c.globalAlpha = 0.35;
      if (img) this.mamImg(img, x, y, P.face, 'mam');
      else this.mam(x, y, P.face, this.pose(P, t));
      c.globalAlpha = 1;
      if (P.carry) this.emoji(D.sortItems[P.carry.k % D.sortItems.length].emoji, x, b.y - 8, 26);
      if (P.healT > 0) {
        const k = P.healT / P.C.HEAL_T;
        c.strokeStyle = `rgba(255,156,200,${0.4 + 0.5 * k})`;
        c.lineWidth = 3;
        c.beginPath(); c.arc(x, b.y + b.h / 2, 30 - k * 12, 0, 6.283 * k); c.stroke();
      }
      if (HSX.Calc.charmOn('khien_lon') && P.shieldT <= 0) {
        c.strokeStyle = 'rgba(160,210,255,0.35)';
        c.lineWidth = 2;
        c.beginPath(); c.arc(x, b.y + b.h / 2, 30, 0, 6.283); c.stroke();
      }
    },

    // Khung ảnh Qwen: khổ vuông 480, mặt nạ ở giữa, dòng chân ở 400 (xem dong_goi_mam trong qwen/cong_cu.py)
    mamImg(img, x, y, face, rim) {
      const c = this.ctx, k = MAM_DRAW / img.width;
      c.save();
      c.translate(x, y + 2);
      c.scale(face, 1);
      this.spr(img, -MAM_DRAW / 2 + MAM_DX, -400 * k, MAM_DRAW, MAM_DRAW, rim);
      c.restore();
    },

    // Vẽ ảnh nhân vật; có rim thì ghi lại phép biến đổi để sau khi chiếu sáng vẽ viền đúng chỗ đó
    spr(img, dx, dy, dw, dh, rim) {
      const c = this.ctx;
      c.drawImage(img, dx, dy, dw, dh);
      if (rim && this.rimQ) this.rimQ.push({ img, m: c.getTransform(), dx, dy, dw, dh, a: c.globalAlpha, rim });
    },

    // Tên khung ảnh Qwen của Mầm theo trạng thái (nếu đã có ảnh)
    playerFrame(P) {
      if (!A.get('player/mam')) return null;
      if (HSX.KHUNG_MAM) { const f = this.playerSeq(P, HSX.KHUNG_MAM); if (f) return f; }
      const b = P.b, pick = f => (A.get('player/' + f) ? f : 'mam');
      if (P.hurtT > 0) return pick('mam_dau');
      if (P.healT > 0) return pick('mam_hoi');
      if (P.dashT > 0) return pick('mam_luot');
      if (P.atkT > 0) return pick(P.atkDir === 'up' ? 'mam_chem_len' : P.atkDir === 'down' ? 'mam_chem_xuong' : 'mam_chem');
      if (!b.ground) return pick(b.vy < 0 ? 'mam_nhay' : 'mam_roi');
      if (Math.abs(b.vx) > 40) return pick('mam_chay' + (1 + Math.floor(P.anim * 10) % 3));
      return 'mam';
    },

    // Khung cắt từ bảng khung: mỗi động tác nhiều khung, chạy theo tiến độ của động tác.
    // Thiếu khung nào thì trả null để dùng cách cũ.
    playerSeq(P, K) {
      const b = P.b, C = P.C;
      const at = (dt, p) => {
        const n = K[dt];
        if (!n) return null;
        const f = `mam_${dt}_${1 + Math.min(n - 1, Math.max(0, Math.floor(p * n)))}`;
        return A.get('player/' + f) ? f : null;
      };
      const loop = (dt, i) => K[dt] && at(dt, (((i % K[dt]) + K[dt]) % K[dt]) / K[dt]);
      if (P.hurtT > 0) return at('dau', 1 - P.hurtT / C.HURT_T);
      if (P.healT > 0) return at('hoi', P.healT / C.HEAL_T);
      if (P.dashT > 0) return at('luot', 1 - P.dashT / C.DASH_T);
      if (P.atkT > 0) return at(P.atkDir === 'up' ? 'chem_len' : P.atkDir === 'down' ? 'chem_xuong' : 'chem', 1 - P.atkT / C.ATK_T);
      const nh = K.nhay;
      if (!b.ground) {
        if (!(nh >= 4)) return null;
        // cất cánh (rất ngắn) → đang lên → đỉnh → đang rơi
        const i = P.airT < 0.05 && b.vy < 0 ? 0 : b.vy < -350 ? 1 : b.vy <= 350 ? 2 : 3;
        return at('nhay', (i + 0.5) / nh);
      }
      if (nh >= 5 && P.landT < 0.1) return at('nhay', (nh - 0.5) / nh);
      if (Math.abs(b.vx) > 40) return loop('chay', Math.floor(P.step / 26));   // một khung mỗi 26 px chạy
      return loop('dung', Math.floor(P.anim * 4));
    },

    pose(P, t) {
      const b = P.b, run = b.ground && Math.abs(b.vx) > 40, ph = P.anim * 15;
      return {
        legA: run ? Math.sin(ph) : 0, legB: run ? -Math.sin(ph) : 0,
        lift: !b.ground ? 5 : 0,
        bob: run ? Math.abs(Math.sin(ph)) * 2 : Math.sin(t * 2.5) * 0.8,
        lean: P.dashT > 0 ? 0.6 : run ? 0.12 : 0,
        flare: !b.ground && b.vy > 0 ? 6 : 0,
        kneel: P.healT > 0 ? 6 : 0,
        atk: P.atkT > 0 ? P.atkDir : null,
      };
    },

    // Mầm vẽ bằng hình đơn giản: áo choàng lá, mặt nạ vỏ hạt trắng, Vợt Bắt Rác
    mam(x, y, face, o) {
      const c = this.ctx;
      c.save();
      c.translate(x, y + (o.kneel || 0));
      c.scale(face, 1);
      c.rotate((o.lean || 0) * 0.25);
      const bob = -(o.bob || 0);
      c.fillStyle = '#16211b';
      c.beginPath(); c.roundRect(-8 + (o.legA || 0) * 5, -14 - (o.lift || 0), 6, 14, 3); c.fill();
      c.beginPath(); c.roundRect(2 + (o.legB || 0) * 5, -14 - (o.lift || 0), 6, 14, 3); c.fill();
      c.fillStyle = '#3d8a48';
      c.beginPath();
      c.moveTo(-4, -40 + bob);
      c.quadraticCurveTo(-20, -52 + bob - (o.flare || 0), -25, -64 + bob - (o.flare || 0));
      c.quadraticCurveTo(-11, -56 + bob, 3, -45 + bob);
      c.fill();
      c.fillStyle = '#2f6b3a';
      c.strokeStyle = '#173d22';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-13, -10 + bob);
      c.quadraticCurveTo(-18, -30 + bob, -4, -40 + bob);
      c.quadraticCurveTo(11, -45 + bob, 14, -29 + bob);
      c.quadraticCurveTo(16, -13 + bob, 9, -8 + bob + (o.flare || 0) * 0.4);
      c.quadraticCurveTo(-1, -4 + bob + (o.flare || 0), -13, -10 + bob);
      c.fill();
      c.stroke();
      c.strokeStyle = '#6dbb70';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(-9, -12 + bob); c.quadraticCurveTo(-4, -26 + bob, 6, -38 + bob); c.stroke();
      c.fillStyle = '#f4f1e6';
      c.strokeStyle = '#bdb6a0';
      c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(3, -37 + bob, 11, 12, 0, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = '#121212';
      c.beginPath(); c.ellipse(0.5, -37 + bob, 2.6, 4.6, 0, 0, 6.283); c.fill();
      c.beginPath(); c.ellipse(8, -37 + bob, 2.6, 4.6, 0, 0, 6.283); c.fill();
      if (!o.atk) {
        c.strokeStyle = '#c79a5a';
        c.lineWidth = 3;
        c.beginPath(); c.moveTo(6, -18 + bob); c.lineTo(28, -36 + bob); c.stroke();
        c.strokeStyle = '#dfe7ee';
        c.lineWidth = 1.5;
        c.beginPath(); c.arc(31, -39 + bob, 6, 0, 6.283); c.moveTo(25, -39 + bob); c.lineTo(37, -39 + bob); c.moveTo(31, -45 + bob); c.lineTo(31, -33 + bob); c.stroke();
      }
      c.restore();
    },

    slash(P) {
      const c = this.ctx, b = P.b, k = 1 - P.atkT / P.C.ATK_T;
      if (k > 0.65) return;
      const a = 1 - k / 0.65, r = HSX.Calc.reach();
      c.save();
      c.translate(P.cx(), b.y + b.h / 2 - 4);
      c.rotate(P.atkAng);
      c.fillStyle = `rgba(255,255,255,${0.85 * a})`;
      c.beginPath();
      c.arc(10, 0, 54 * r, -1.05, 1.05);
      c.arc(2, 0, 40 * r, 0.95, -0.95, true);
      c.closePath();
      c.fill();
      c.strokeStyle = `rgba(150,255,190,${0.7 * a})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(10, 0, 56 * r, -1.0, 1.0); c.stroke();
      c.restore();
    },

    // ---------- Ánh sáng ----------
    // Bản đồ sáng = màu bóng tối của khu (ngoài trời thì trời sáng hơn đất, trong hang thì trần tối hơn)
    // cộng các nguồn sáng có màu. Lớp cảnh được NHÂN với bản đồ này: chỗ tối vẫn giữ màu và chi tiết, ngả theo màu khu,
    // chỗ gần đèn lồng ngả vàng, gần lồng giam ngả tím. Nền xa không bị nhân nên đất đá nổi thành khối trên nền.
    lightWorld(m, cam, lights) {
      if (m.dark < 0.02) return;
      const L = this.light, lc = this.lctx, s = L.width / VW;
      lc.globalCompositeOperation = 'source-over';
      const g = lc.createLinearGradient(0, 0, 0, L.height);
      g.addColorStop(0, rgba(m.sky ? mixA(m.amb, [255, 255, 255], 0.12) : mixA(m.amb, [0, 0, 0], 0.3)));
      g.addColorStop(1, rgba(m.sky ? mixA(m.amb, [0, 0, 0], 0.15) : m.amb));
      lc.fillStyle = g;
      lc.fillRect(0, 0, L.width, L.height);
      lc.globalCompositeOperation = 'lighter';
      lights.forEach(l => {
        const x = (l.x - cam.x) * s, y = (l.y - cam.y) * s, r = l.r * s;
        if (x < -r || y < -r || x > L.width + r || y > L.height + r) return;
        const col = l.glow || '255,244,226', gr = lc.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, `rgba(${col},0.95)`);
        gr.addColorStop(0.4, `rgba(${col},0.5)`);
        gr.addColorStop(1, `rgba(${col},0)`);
        lc.fillStyle = gr;
        lc.fillRect(x - r, y - r, r * 2, r * 2);
      });
      lc.globalCompositeOperation = 'source-over';
      // multiply tô cả chỗ trống của lớp cảnh, nên chép độ trong suốt ra trước rồi cắt lại theo nó
      const wc = this.wctx, cw = this.worldCv.width, ch = this.worldCv.height;
      this.mctx.globalCompositeOperation = 'copy';
      this.mctx.drawImage(this.worldCv, 0, 0);
      wc.setTransform(1, 0, 0, 1, 0, 0);
      wc.globalCompositeOperation = 'multiply';
      wc.drawImage(L, 0, 0, cw, ch);
      wc.globalCompositeOperation = 'destination-in';
      wc.drawImage(this.maskCv, 0, 0);
      wc.globalCompositeOperation = 'source-over';
    },

    // Viền nhân vật vẽ sau khi chiếu sáng nên không bị tối đi: Mầm và quái luôn nổi rõ trên nền tối
    drawRims(m) {
      if (!this.rimQ || !this.rimQ.length) return;
      const c = this.ctx, k = this.k, p = RIM_PAD / k, s = 0.3 + 0.7 * m.dark;
      this.rimQ.forEach(q => {
        c.save();
        c.setTransform(q.m);
        c.globalAlpha = q.a * s;
        c.drawImage(this.rimTex(q.img, q.dw, q.dh, q.rim), q.dx - p, q.dy - p, q.dw + 2 * p, q.dh + 2 * p);
        c.restore();
      });
    },
    // Ảnh viền của một khung (nhớ sẵn theo cỡ vẽ): vòng ngoài mảnh + vệt sáng ở mép trên
    rimTex(img, dw, dh, style) {
      const k = this.k, key = `${style}|${dw}|${dh}|${k}`, memo = img._rim || (img._rim = {});
      if (memo[key]) return memo[key];
      const P = RIM_PAD, sw = dw * k, sh = dh * k, w = Math.ceil(sw) + 2 * P, h = Math.ceil(sh) + 2 * P;
      const mk = () => { const x = document.createElement('canvas'); x.width = w; x.height = h; return x; };
      const out = mk(), g = out.getContext('2d'), d = Math.max(1, Math.round(1.6 * k)), col = RIM[style];
      // vòng ngoài: hình nở rộng d điểm ảnh rồi trừ hình gốc
      for (let a = 0; a < 8; a++) g.drawImage(img, P + Math.round(Math.cos(a * Math.PI / 4) * d), P + Math.round(Math.sin(a * Math.PI / 4) * d), sw, sh);
      g.globalCompositeOperation = 'destination-out';
      g.drawImage(img, P, P, sw, sh);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = col.line;
      g.fillRect(0, 0, w, h);
      // mép trên: phần hình mà ngay phía trên nó là khoảng trống
      const top = mk(), tg = top.getContext('2d');
      tg.drawImage(img, P, P, sw, sh);
      tg.globalCompositeOperation = 'destination-out';
      tg.drawImage(img, P, P + d * 1.4, sw, sh);
      tg.globalCompositeOperation = 'source-in';
      tg.fillStyle = col.top;
      tg.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(top, 0, 0);
      return (memo[key] = out);
    },

    // Quầng sáng quanh nguồn sáng (bloom), cộng thêm lên trên cảnh
    drawGlow(m, cam, lights) {
      if (m.dark < 0.02) return;
      const c = this.ctx;
      c.globalCompositeOperation = 'lighter';
      lights.forEach(l => {
        const x = l.x - cam.x, y = l.y - cam.y, r = l.r * (l.glow ? 0.7 : 0.5);
        if (x < -r || y < -r || x > VW + r || y > VH + r) return;
        const col = l.glow || '255,238,205', a = (l.glow ? 0.45 : 0.12) * m.dark;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${col},${a})`);
        g.addColorStop(0.3, `rgba(${col},${a * 0.45})`);
        g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g;
        c.fillRect(x - r, y - r, r * 2, r * 2);
      });
      c.globalCompositeOperation = 'source-over';
    },

    // Tia sáng chéo từ trên xuống (trăng khi tối, nắng vàng khi sáng), mép mềm, chập chờn chậm
    drawRays(m, cam, t) {
      if (!m.ray) return;
      const c = this.ctx, n = m.sky ? 4 : 3, span = VW + 700;
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const x0 = ((hash(i, 21) * span - cam.x * 0.12) % span + span) % span - 350, top = -20 - cam.y * 0.04;
        const w0 = m.sky ? 34 + hash(i, 22) * 70 : 14 + hash(i, 22) * 26, len = VH * (0.8 + hash(i, 23) * 0.4), lean = len * 0.3;
        const a = (m.sky ? 0.05 : 0.045) * (0.5 + 0.5 * Math.sin(t * 0.35 + i * 2.1));
        const g = c.createLinearGradient(0, top, 0, top + len);
        g.addColorStop(0, rgba(m.ray, a));
        g.addColorStop(0.6, rgba(m.ray, a * 0.4));
        g.addColorStop(1, rgba(m.ray, 0));
        c.fillStyle = g;
        for (let j = 0; j < 3; j++) {   // 3 lớp chồng nhau, rộng dần: mép tia mềm
          const e = j * 10;
          c.beginPath();
          c.moveTo(x0 - e, top);
          c.lineTo(x0 + w0 + e, top);
          c.lineTo(x0 + lean + w0 * 2.2 + e * 1.6, top + len);
          c.lineTo(x0 + lean - e * 1.6, top + len);
          c.closePath();
          c.fill();
        }
      }
      c.globalCompositeOperation = 'source-over';
    },

    // Bụi, bào tử trôi lơ lửng. Gần nguồn sáng thì lấp lánh hơn; hạt to mờ là bụi ở gần mắt (tiền cảnh)
    drawMotes(m, cam, t, lights) {
      const c = this.ctx, W2 = VW + 60, H2 = VH + 60;
      const ls = lights.map(l => ({ x: l.x - cam.x, y: l.y - cam.y, r: l.r }));
      c.globalCompositeOperation = 'lighter';
      this.motes.forEach(p => {
        const x = ((p.x + t * p.vx + Math.sin(t * 0.6 + p.ph) * 12 - cam.x * p.z) % W2 + W2) % W2 - 30;
        const y = ((p.y + t * p.vy - cam.y * p.z) % H2 + H2) % H2 - 30;
        let lit = 0;
        ls.forEach(l => { const d = Math.hypot(x - l.x, y - l.y); if (d < l.r) lit = Math.max(lit, 1 - d / l.r); });
        const big = p.z > 1.25;
        const a = (0.14 + 0.7 * lit) * (0.55 + 0.45 * Math.sin(t * 1.7 + p.ph * 3)) * (big ? 0.3 : 1);
        c.fillStyle = rgba(m.dust, a);
        c.beginPath(); c.arc(x, y, p.r * (big ? 2.6 : 1), 0, 6.283); c.fill();
      });
      c.globalCompositeOperation = 'source-over';
    },

    // Tiền cảnh: bóng cỏ, đá, rác sát đáy phòng, trôi nhanh hơn cảnh (gần mắt hơn). Trong hang có thêm thạch nhũ trên trần.
    drawFg(r, m, cam) {
      const c = this.ctx, par = 1.25, step = 210, area = r.def.area;
      const base = (r.h * T - cam.y) * 1.06 + 10, roof = -cam.y * 1.06 - 10;
      c.fillStyle = `rgba(${m.vig},0.93)`;
      const i0 = Math.floor(cam.x * par / step) - 1, i1 = i0 + Math.ceil(VW / step) + 2;
      for (let i = i0; i <= i1; i++) {
        const x = i * step + hash(i, 32) * 110 - cam.x * par;
        if (base < VH + 120 && hash(i, 31) > 0.4) this.fgShape(area, x, base, 30 + hash(i, 33) * 50, i);
        if (!m.sky && roof > -90 && hash(i, 34) > 0.35) {
          const w = 16 + hash(i, 35) * 26, len = 40 + hash(i, 36) * 70;
          c.beginPath(); c.moveTo(x - w, roof); c.lineTo(x - w * 0.2, roof + len); c.lineTo(x + w * 0.3, roof + len * 0.6); c.lineTo(x + w, roof); c.fill();
        }
      }
    },
    fgShape(area, x, base, h, i) {
      const c = this.ctx;
      c.beginPath();
      if (area === 'bai_bien') {   // khóm cỏ biển
        const n = 5 + Math.floor(hash(i, 40) * 4);
        for (let j = 0; j < n; j++) {
          const bx = x + (j - n / 2) * 7, hh = h * (0.5 + hash(i, 41 + j) * 0.6), lean = (hash(i, 50 + j) - 0.5) * 40;
          c.moveTo(bx - 3, base);
          c.quadraticCurveTo(bx + lean * 0.2, base - hh * 0.6, bx + lean, base - hh);
          c.quadraticCurveTo(bx + lean * 0.3 + 3, base - hh * 0.5, bx + 3, base);
        }
        c.ellipse(x, base, n * 6, 12, 0, Math.PI, 0);
      } else if (area === 'hang') {   // đá và măng đá
        c.ellipse(x, base, 34 + hash(i, 42) * 30, h * 0.5, 0, Math.PI, 0);
        c.moveTo(x + 10, base);
        c.lineTo(x + 20, base - h * 1.3);
        c.lineTo(x + 32, base);
      } else {   // đống rác: gò, chai đứng, túi nilon
        c.ellipse(x, base, 40 + hash(i, 42) * 30, h * 0.45, 0, Math.PI, 0);
        c.roundRect(x - 18, base - h * 0.95, 11, h * 0.6, 3);
        c.rect(x - 15, base - h * 1.1, 5, 8);
        c.ellipse(x + 20, base - h * 0.42, 14, 11, 0.4, 0, 6.283);
      }
      c.fill();
    },

    // Viền tối quanh mép màn hình, đậm hơn khi tối, ngả theo màu khu
    drawVignette(m) {
      const c = this.ctx, g = c.createRadialGradient(VW / 2, VH / 2, VH * 0.38, VW / 2, VH / 2, VW * 0.64);
      g.addColorStop(0, `rgba(${m.vig},0)`);
      g.addColorStop(1, `rgba(${m.vig},${0.3 + 0.4 * m.dark})`);
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
    },

    // ---------- Chữ trong thế giới ----------
    drawTipPrompt(W) {
      const c = this.ctx, P = HSX.Player, touch = HSX.Input.usingTouch;
      if (W.tip) {
        const t = W.tip, text = touch ? t.t : t.k, x = HSX.clamp(t.x * T + T / 2, W.cam.x + 200, W.cam.x + VW - 200);
        const y = t.y * T - 34 - (W.prompt && Math.abs(W.prompt.y - (t.y * T - 34)) < 40 ? 44 : 0);
        c.font = `14px ${FONT}`;
        const w = c.measureText(text).width + 24;
        c.fillStyle = 'rgba(8,14,20,0.78)';
        c.beginPath(); c.roundRect(x - w / 2, y - 18, w, 28, 8); c.fill();
        c.strokeStyle = 'rgba(160,230,180,0.5)';
        c.stroke();
        this.label(text, x, y - 4, 14, '#e8f5ea', 1, true);
      }
      if (W.prompt && W.mode === 'play') {
        const p = W.prompt, key = touch ? '▲' : '↑/E';
        this.label(`${key} ${p.label}`, p.x, p.y + Math.sin(performance.now() / 250) * 2, 14, '#fff6c8');
      }
      void P;
    },

    // ---------- HUD ----------
    drawHud(W) {
      const c = this.ctx, S = HSX.S, Calc = HSX.Calc, t = performance.now() / 1000;
      const ox = 54, oy = 56, rr = 30, lvl = S.energy / 99;
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.beginPath(); c.arc(ox, oy, rr + 5, 0, 6.283); c.fill();
      c.save();
      c.beginPath(); c.arc(ox, oy, rr, 0, 6.283); c.clip();
      const top = oy + rr - lvl * rr * 2;
      const g = c.createLinearGradient(0, top, 0, oy + rr);
      g.addColorStop(0, '#9ff0b5');
      g.addColorStop(1, '#1e7a45');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(ox - rr, oy + rr);
      for (let x = -rr; x <= rr; x += 4) c.lineTo(ox + x, top + Math.sin(x / 6 + t * 3) * 2);
      c.lineTo(ox + rr, oy + rr);
      c.fill();
      c.restore();
      c.strokeStyle = S.energy >= 33 && S.spirits.sen ? `rgba(200,255,215,${0.7 + 0.3 * Math.sin(t * 4)})` : '#e8f5ea';
      c.lineWidth = 3;
      c.beginPath(); c.arc(ox, oy, rr, 0, 6.283); c.stroke();
      const max = Calc.maxHp();
      for (let i = 0; i < max; i++) this.leaf(106 + i * 30, 42, i < S.hp);
      if (Calc.charmOn('khien_lon')) {
        const x = 106 + max * 30 + 6, ready = HSX.Player.shieldT <= 0;
        c.globalAlpha = ready ? 1 : 0.35;
        this.emoji('🛡️', x, 50, 20);
        c.globalAlpha = 1;
      }
      c.textAlign = 'left';
      c.font = `bold 15px ${FONT}, ${EMOJI}`;
      c.fillStyle = '#e8f5ea';
      c.strokeStyle = 'rgba(0,0,0,0.7)';
      c.lineWidth = 3;
      const line = `🌱 ${Math.floor(S.seeds)}    ♻️ ${HSX.Sys.totalMaterials()}    ✨ ${HSX.pct(Calc.cleanPct())}`;
      c.strokeText(line, 96, 84);
      c.fillText(line, 96, 84);
      const boss = W.boss;
      if (boss && boss.active && !boss.dead) {
        const bw = 420, bx = (VW - bw) / 2, by = VH - 46;
        this.label(boss.def.name, VW / 2, by - 12, 15, '#efe6ff');
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(bx - 3, by - 3, bw + 6, 16);
        if (boss.layers > 0) {
          const seg = bw / boss.def.layers;
          for (let i = 0; i < boss.layers; i++) {
            c.fillStyle = i === boss.layers - 1 ? '#b9a7ff' : '#7d6bc4';
            const f = i === boss.layers - 1 ? boss.layerHp / boss.def.layerHp : 1;
            c.fillRect(bx + i * seg + 2, by, (seg - 4) * f, 10);
          }
        } else {
          c.fillStyle = '#e05a5a';
          c.fillRect(bx, by, bw * Math.max(0, boss.hp / boss.maxHp), 10);
        }
      }
    },
    leaf(x, y, full) {
      const c = this.ctx;
      c.save();
      c.translate(x, y);
      c.rotate(-0.5);
      c.fillStyle = full ? '#7be08f' : 'rgba(255,255,255,0.08)';
      c.strokeStyle = full ? '#e8ffe9' : 'rgba(232,245,234,0.5)';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(11, 0, 0, 12); c.quadraticCurveTo(-11, 0, 0, -12); c.fill(); c.stroke();
      if (full) { c.strokeStyle = '#3f9a55'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, 9); c.stroke(); }
      c.restore();
    },

    drawBanner(b) {
      const c = this.ctx, a = Math.min(1, b.t / 0.4, (b.dur - b.t) / 0.6);
      if (a <= 0) return;
      c.globalAlpha = a;
      const y = 150;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillRect(0, y - 40, VW, b.sub ? 84 : 62);
      c.strokeStyle = 'rgba(232,245,234,0.7)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(VW / 2 - 220, y + 10); c.lineTo(VW / 2 + 220, y + 10); c.stroke();
      this.label(b.text, VW / 2, y - 10, 30, '#f2f7f0', a, true);
      if (b.sub) this.label(b.sub, VW / 2, y + 28, 15, '#bfe6c8', a, true);
      c.globalAlpha = 1;
    },

    // ---------- Tiện ích vẽ ----------
    emoji(ch, x, y, size) {
      const c = this.ctx;
      c.font = `${size}px ${EMOJI}`;
      c.textAlign = 'center';
      c.textBaseline = 'alphabetic';
      c.fillStyle = '#000';
      c.fillText(ch, x, y);
    },
    sprite(key, emo, x, y, size) {
      const img = A.get(key);
      if (img) this.ctx.drawImage(img, x - size / 2, y - size, size, size);
      else this.emoji(emo, x, y, size);
    },
    label(s, x, y, size, color, alpha, plain) {
      const c = this.ctx;
      c.globalAlpha = alpha === undefined ? 1 : alpha;
      c.font = `${plain ? '' : 'bold '}${size}px ${FONT}, ${EMOJI}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 3;
      c.strokeStyle = 'rgba(0,0,0,0.65)';
      c.strokeText(s, x, y);
      c.fillStyle = color;
      c.fillText(s, x, y);
      c.textBaseline = 'alphabetic';
      c.globalAlpha = 1;
    },
  };
})();
