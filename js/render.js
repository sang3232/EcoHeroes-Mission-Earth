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
    // Màn 2: bùn rừng đước, bờ đầm tôm, hang dưới gốc rễ
    rung:      { top: '#6f8a44', body: '#4a3b2b', dark: '#2f2519', edge: '#1c1610', plank: '#6b4a2b', tuft: '#7fb04f' },
    dam:       { top: '#8c7c58', body: '#5e4e38', dark: '#3e3426', edge: '#2a2219', plank: '#7a5a3a', tuft: '#93a35c' },
    hang_re:   { top: '#5e7a4a', body: '#38302a', dark: '#26201b', edge: '#15110d', plank: '#5b412a', tuft: '#5f9f7a' },
    rung_boss: { top: '#56627a', body: '#332c3c', dark: '#221d2a', edge: '#120f18', plank: '#4b3a4b', tuft: '#7a8fc4' },
  };
  const TEX = { bai_bien: 'bg/o_cat', dao_rac: 'bg/o_cat', hang: 'bg/o_da', boss: 'bg/o_da', rung: 'bg/o_bun', dam: 'bg/o_bun', hang_re: 'bg/o_bun', rung_boss: 'bg/o_bun' };
  const RUNG = { rung: 1, dam: 1, hang_re: 1, rung_boss: 1 };   // khu Màn 2: bục là cành/rễ cây, cỏ là rễ thở
  // Ảnh nền xa / lớp gần của từng khu (khu nào không có thì dùng chung)
  const NEN_XA = { rung_boss: 'rung', hang_re: 'hang' }, NEN_GAN = { bai_bien: 'bai_bien_gan', rung: 'rung_gan', dam: 'rung_gan' };
  const MAM_DRAW = 114, MAM_DX = 6;   // cỡ vẽ khung Mầm (thân cao ~61 px), dịch tới trước cho thân (không phải mặt nạ) ở giữa hộp va chạm
  const SOLIDISH = c => c === '#' || c === 'X' || (c === '?' && !HSX.S.owned.kinh_lup);
  // Tường Kính Lúp: không hiển thị khi chưa có đồ, chỉ hiện khi có kinh_lup (vẽ dashed tranlucent)
  const RENDER_KINH_LUP = c => c === '?' && HSX.S.owned.kinh_lup;
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
    // Màn 2: ánh xanh lục dịu của rừng, bụi như đom đóm; đầm tôm xám đục; hang rễ tối xanh; hang Lưới Ma tím lạnh
    rung:      { sky: true, amb: [28, 54, 44], bg: [40, 72, 58], fog: [52, 96, 76], dust: [190, 255, 170], ray: [170, 235, 190], vig: '2,12,8' },
    dam:       { sky: true, amb: [46, 48, 40], bg: [64, 66, 56], fog: [84, 86, 72], dust: [215, 225, 190], ray: [215, 215, 185], vig: '8,8,4' },
    hang_re:   { sky: false, amb: [20, 40, 34], bg: [30, 58, 48], fog: [34, 74, 60], dust: [150, 255, 200], ray: [120, 220, 170], vig: '1,8,6' },
    rung_boss: { sky: false, amb: [24, 28, 46], bg: [36, 42, 66], fog: [56, 50, 98], dust: [190, 160, 255], ray: null, vig: '4,4,14' },
  };
  const DAY = { amb: [255, 255, 255], bg: [255, 255, 255], fog: [170, 165, 155], dust: [255, 226, 150], ray: [255, 226, 165] };
  // Viền nhân vật: vòng sáng mảnh bao quanh (line) và ánh trăng hắt lên mép trên (top)
  const RIM = {
    mam:  { line: 'rgba(160,255,195,0.5)', top: 'rgba(230,255,238,0.9)' },
    quai: { line: 'rgba(205,150,255,0.55)', top: 'rgba(205,220,255,0.75)' },
    soho: { line: 'rgba(255,214,110,0.95)', top: 'rgba(255,244,200,1)' },   // boss đang sơ hở: viền vàng, luôn sáng rõ
  };
  const RIM_PAD = 6;
  // Màu vệt chém theo cấp Vợt (Thô, Sạch, Tinh khiết): [lõi, mép]
  const SLASH = [['255,255,255', '150,255,190'], ['225,255,240', '90,230,170'], ['255,250,225', '255,210,110']];

  const R = HSX.Render = {
    tilesDirty: true, k: 1, cam: { x: 0, y: 0 }, rimQ: null, leafPop: [], leafBits: [], glowCache: {},

    // Quầng sáng tròn vẽ sẵn một lần rồi dùng lại mỗi khung hình
    // (createRadialGradient mỗi frame cho hàng chục hạt là chỗ tốn nhất lúc vẽ).
    glow(color) {
      let cv = this.glowCache[color];
      if (cv) return cv;
      const S = 64;
      cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, color);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      return (this.glowCache[color] = cv);
    },
    // Quầng sáng 3 lớp cho đèn / tinh linh (lõi đậm hơn mép), cũng vẽ sẵn một lần theo màu
    bloom(col) {
      const key = 'bloom:' + col;
      let cv = this.glowCache[key];
      if (cv) return cv;
      const S = 128;
      cv = document.createElement('canvas');
      cv.width = cv.height = S;
      const g = cv.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      gr.addColorStop(0, `rgba(${col},1)`);
      gr.addColorStop(0.3, `rgba(${col},.45)`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
      return (this.glowCache[key] = cv);
    },

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
      // rung màn hình: dao động mượt (cộng vài sóng sin lệch nhịp) thay vì nhảy ngẫu nhiên, cộng cú giật theo hướng đòn
      const sh = W.shake * 0.55;
      const cam = this.cam = {
        x: Math.round(W.cam.x + sh * (Math.sin(t * 47.3) * 0.6 + Math.sin(t * 83.1 + 1.3) * 0.4) + W.kick.x),
        y: Math.round(W.cam.y + sh * (Math.sin(t * 53.7 + 2.1) * 0.6 + Math.sin(t * 71.9 + 0.4) * 0.4) + W.kick.y),
      };
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
      W.corpses.forEach(cp => this.drawCorpse(cp));
      W.enemies.forEach(e => { if (!e.dead) this.drawEnemy(e); });
      this.drawSpirits();
      this.drawPlayer();
      this.drawFx(W.fx, false);
      wc.restore();
      this.ctx = c;

      // 3. Ánh sáng, viền nhân vật, quầng sáng, tia sáng, sương gần, bụi, tiền cảnh, viền tối mép màn hình
      const lights = W.lights();
      this.lightWorld(m, cam, lights);
      c.drawImage(this.worldCv, 0, 0, VW, VH);
      this.drawRims(m);
      this.rimQ = null;
      // vệt chém và hạt cộng sáng vẽ sau ánh sáng: luôn sáng rõ trong bóng tối
      c.save();
      c.translate(-cam.x, -cam.y);
      if (HSX.Player.atkT > 0) this.slash(HSX.Player);
      this.veSang(W, t);
      this.drawFx(W.fx, true);
      this.drawDomDom(r, t);
      c.restore();
      this.drawGlow(m, cam, lights);
      this.drawRays(m, cam, t);
      this.drawFog(m, cam, t, true);
      this.drawMotes(m, cam, t, lights);
      this.drawFg(r, m, cam);
      this.drawVignette(m);
      this.drawHurt(W, t);

      const dien = HSX.Truyen.active();   // đang diễn cảnh truyện: ẩn chữ gợi ý, bảng hướng dẫn, HUD
      c.save();
      c.translate(-cam.x, -cam.y);
      if (!dien) {
        if (!(HSX.HuongDan && HSX.HuongDan.active())) this.drawTipPrompt(W);
        else this.drawTipPrompt(W, true);
        if (HSX.HuongDan) HSX.HuongDan.drawWorld(c, t);
      }
      W.texts.forEach(t => this.label(t.s, t.x, t.y, t.size, t.color, Math.min(1, t.life / t.max * 2)));
      W.loi.forEach(l => {
        const e = l.e, a = Math.min(1, l.t / 0.2, (l.dur - l.t) / 0.4);
        if (a > 0) HSX.Truyen.bong(c, e.x + e.w / 2, e.y - 8, l.text, a);
      });
      c.restore();

      if (!dien) {
        this.drawHud(W);
        this.drawOrbs(W);
        if (HSX.HuongDan) HSX.HuongDan.draw(c, t);
      }
      if (W.bannerData && !dien) this.drawBanner(W.bannerData);
      // trời hửng sáng khi vừa hạ boss cuối màn: ánh cam phủ nhẹ rồi tan
      if (HSX.Calc.levelDone() && W.dawnT < 7) {
        const k = Math.sin(Math.min(1, W.dawnT / 7) * Math.PI) * (HSX.S.level === 'm1' ? 0.35 : 0.22);
        const g = c.createLinearGradient(0, 0, 0, VH);
        g.addColorStop(0, HSX.S.level === 'm1' ? `rgba(255,190,120,${k})` : `rgba(190,255,200,${k})`);
        g.addColorStop(1, `rgba(255,240,200,${k * 0.4})`);
        c.fillStyle = g;
        c.fillRect(0, 0, VW, VH);
      }
      HSX.Truyen.draw(c, t);
      if (W.fade > 0) { c.fillStyle = `rgba(0,0,0,${W.fade})`; c.fillRect(0, 0, VW, VH); }
      if (W.mode === 'dead') {
        c.fillStyle = `rgba(0,0,0,${Math.min(0.7, (1.1 - W.deadT) * 0.8)})`;
        c.fillRect(0, 0, VW, VH);
      }
    },

    // ---------- Nền ----------
    // Ảnh nền Qwen là cảnh ban ngày: nhân với màu không khí (nhớ sẵn, chỉ tính lại khi độ sáng đổi), rồi phủ sương
    drawBg(r, cam, amb, m) {
      const c = this.ctx, area = r.def.area, far = A.get('bg/' + (NEN_XA[area] || area) + '_xa');
      if (far) {
        const img = this.tinted(far, m.bg), s = VH / far.height, w = far.width * s, off = -((cam.x * 0.2) % w), oy = -cam.y * 0.08;
        for (let x = off - (off > 0 ? w : 0); x < VW; x += w) c.drawImage(img, x, oy, w, VH + 40);
        this.haze(m, 0.6);
      } else if (area === 'bai_bien') this.bgBeach(cam, amb);
      else if (area === 'hang') this.bgCave(cam, amb, '#05070c', '#151b28');
      else if (area === 'hang_re') this.bgCave(cam, amb, '#030806', '#0f1c16');
      else if (area === 'dao_rac') this.bgIsland(cam, amb);
      else if (area === 'rung' || area === 'dam') this.bgMangrove(cam, amb, area === 'dam');
      else this.bgCave(cam, amb, '#06030b', '#1d1030');
      const near = NEN_GAN[area] && A.get('bg/' + NEN_GAN[area]);
      if (near) {
        // dải cây, đá sát đáy màn hình, trôi nhanh hơn lớp xa, tối hơn lớp xa một chút vì ở gần (cao quá 300 px thì thu nhỏ lại)
        const img = this.tinted(near, mixA(m.bg, [0, 0, 0], 0.18)), s = Math.min(1, 300 / near.height);
        const w = near.width * s, h = near.height * s, off = -((cam.x * 0.45) % w), y = VH - h + 30 - cam.y * 0.2;
        for (let x = off - (off > 0 ? w : 0); x < VW; x += w) c.drawImage(img, x, y, w, h);
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
    // Rừng đước vẽ bằng code (khi chưa có ảnh nền Qwen): trời xanh lục, hàng cây trên rễ chống, mặt nước phản chiếu
    bgMangrove(cam, k, dam) {
      const c = this.ctx, t = performance.now() / 1000;
      const g = c.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, mix(dam ? '#0b0d0a' : '#04100c', dam ? '#a9b8b0' : '#9fd8c0', k));
      g.addColorStop(0.62, mix(dam ? '#1c201a' : '#0d2a20', dam ? '#d8d6c0' : '#d6f0d8', k));
      g.addColorStop(1, mix('#0a120e', '#7a8a6a', k));
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      const waterY = 330 - cam.y * 0.1;
      c.fillStyle = mix(dam ? '#141812' : '#08161a', dam ? '#7d8c72' : '#5fa3a0', k);
      c.fillRect(0, waterY, VW, VH - waterY);
      // hai lớp hàng cây: xa mờ, gần đậm; mỗi cây là tán tròn trên chùm rễ vòm
      [[0.12, 0.55, 150, '#0a1a14', '#6f9a7a'], [0.3, 0.8, 210, '#06100c', '#4f7a5a']].forEach(([par, sc, step, c0, c1], layer) => {
        c.fillStyle = mix(c0, c1, k * (layer ? 0.8 : 0.9));
        c.strokeStyle = c.fillStyle;
        const off = cam.x * par;
        for (let i = Math.floor(off / step) - 1; i < Math.floor(off / step) + VW / step + 2; i++) {
          if (dam && hash(i, 70 + layer) > 0.45) continue;   // đầm tôm: rừng thưa, nhiều chỗ trống
          const x = i * step - off + hash(i, 61) * 60, h = (70 + hash(i, 62) * 50) * sc, base = waterY + 6 + layer * 8;
          c.beginPath();
          c.ellipse(x, base - h, h * 0.55, h * 0.36, 0, 0, 6.283);
          c.ellipse(x - h * 0.3, base - h * 0.88, h * 0.32, h * 0.24, 0, 0, 6.283);
          c.fill();
          c.lineWidth = 2.2 * sc;
          c.beginPath();
          for (let j = -2; j <= 2; j++) { c.moveTo(x, base - h * 0.7); c.quadraticCurveTo(x + j * h * 0.18, base - h * 0.35, x + j * h * 0.26, base); }
          c.stroke();
        }
      });
      // gợn nước
      c.strokeStyle = mix('#1a2a26', '#cfe8e0', k * 0.8);
      c.globalAlpha = 0.4;
      c.lineWidth = 1.5;
      for (let row = 0; row < 3; row++) {
        c.beginPath();
        for (let x = 0; x <= VW; x += 24) { const y = waterY + 12 + row * 22 + Math.sin(x / 50 + t * 1.2 + row) * 2.5; if (x) c.lineTo(x, y); else c.moveTo(x, y); }
        c.stroke();
      }
      c.globalAlpha = 1;
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
        if (ch === '?') continue;   // tường Kính Lúp: không vẽ ở tile layer, chỉ vẽ khi có kinh_lup ở drawDynamicTiles
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
          // bờ đất sát nước ngập: bo tròn góc trên cho bờ thoai thoải xuống nước, viền cỏ chạy theo đường cong
          if (!SOLIDISH(up) && y > 0) [[-1, 0], [1, T]].forEach(([s, ox]) => {
            if (r.tile(x + s, y) !== 'w') return;
            g.save();
            g.globalCompositeOperation = 'destination-out';
            g.beginPath(); g.moveTo(px + ox, py - 1); g.lineTo(px + ox - s * 18, py - 1); g.quadraticCurveTo(px + ox - s * 3, py + 3, px + ox, py + 20); g.closePath(); g.fill();
            g.restore();
            g.strokeStyle = pal.top;
            g.lineWidth = 3;
            g.beginPath(); g.moveTo(px + ox - s * 18, py + 1); g.quadraticCurveTo(px + ox - s * 4, py + 4, px + ox, py + 20); g.stroke();
          });
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
        } else if (ch === '=' && RUNG[r.def.area]) {
          // Màn 2: bục là cành / rễ cây cong, rêu xanh phía trên, rễ con rủ xuống
          const l = r.tile(x - 1, y) !== '=', rr = r.tile(x + 1, y) !== '=';
          g.fillStyle = pal.plank;
          g.beginPath();
          g.moveTo(px + (l ? 4 : 0), py + 2);
          g.quadraticCurveTo(px + T / 2, py - 2 + hash(x, y) * 3, px + T - (rr ? 4 : 0), py + 2);
          g.lineTo(px + T - (rr ? 8 : 0), py + 11);
          g.quadraticCurveTo(px + T / 2, py + 15, px + (l ? 8 : 0), py + 11);
          g.closePath();
          g.fill();
          g.fillStyle = 'rgba(140,200,110,0.55)';
          g.fillRect(px + (l ? 6 : 0), py, T - (l ? 6 : 0) - (rr ? 6 : 0), 3);
          g.strokeStyle = pal.edge;
          g.lineWidth = 1.4;
          g.beginPath();
          for (let i = 0; i < 2; i++) {
            const sx = px + 10 + hash(x + i, y) * 28, len = 6 + hash(x, y + i) * 12;
            g.moveTo(sx, py + 12); g.quadraticCurveTo(sx + 3, py + 12 + len * 0.6, sx - 1, py + 12 + len);
          }
          g.stroke();
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
      if (RUNG[area]) {
        // rễ thở của cây đước, mắm nhô lên khỏi bùn; lá rụng; lỗ hang cua
        if (h(1) > 0.35) {
          g.strokeStyle = area === 'rung_boss' ? '#3a3448' : pal.dark;
          g.lineCap = 'round';
          const n = 2 + Math.floor(h(2) * 4);
          for (let i = 0; i < n; i++) {
            const bx = px + 4 + h(3 + i) * 40, len = 5 + h(8 + i) * 10;
            g.lineWidth = 2 + h(12 + i) * 1.5;
            g.beginPath(); g.moveTo(bx, py + 3); g.lineTo(bx + (h(15 + i) - 0.5) * 3, py - len); g.stroke();
          }
          g.lineCap = 'butt';
        }
        if (h(20) > 0.7) {
          g.fillStyle = h(21) > 0.5 ? 'rgba(160,140,60,0.8)' : 'rgba(110,150,70,0.8)';
          g.beginPath(); g.ellipse(px + h(22) * T, py + 3, 5, 2, h(23) * 3, 0, 6.283); g.fill();
        }
        if (h(24) > 0.82) {
          g.fillStyle = 'rgba(15,10,6,0.75)';
          g.beginPath(); g.ellipse(px + 8 + h(25) * 30, py + 5, 3.5, 2, 0, 0, 6.283); g.fill();
        }
        if (area === 'dam' && h(26) > 0.86) {   // mảnh xốp, bao nilon kẹt trong bùn
          g.fillStyle = h(27) > 0.5 ? '#ecebe4' : '#c9c3a6';
          g.save(); g.translate(px + 6 + h(28) * 36, py + 3); g.rotate((h(29) - 0.5) * 0.8); g.fillRect(-4, -2, 8, 4); g.restore();
        }
        return;
      }
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
      if (RUNG[area]) {   // rễ rủ dưới gầm bùn, đầu rễ sáng nhẹ
        const n = 1 + Math.floor(h(5) * 3);
        g.strokeStyle = pal.edge;
        g.lineWidth = 1.8;
        for (let i = 0; i < n; i++) {
          const sx = px + 6 + h(6 + i) * 36, len = 10 + h(9 + i) * 22, sw = (h(12 + i) - 0.5) * 12;
          g.beginPath(); g.moveTo(sx, by - 1); g.quadraticCurveTo(sx + sw, by + len * 0.5, sx + sw * 0.4, by + len); g.stroke();
          if (h(15 + i) > 0.5) { g.fillStyle = 'rgba(160,255,190,0.5)'; g.beginPath(); g.arc(sx + sw * 0.4, by + len, 1.6, 0, 6.283); g.fill(); }
        }
        return;
      }
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
      const c = this.ctx, S = HSX.S, t = performance.now() / 1000, W = HSX.World;
      const x0 = Math.max(0, Math.floor(cam.x / T) - 1), x1 = Math.min(r.w - 1, x0 + Math.ceil(VW / T) + 2);
      const y0 = Math.max(0, Math.floor(cam.y / T) - 1), y1 = Math.min(r.h - 1, y0 + Math.ceil(VH / T) + 2);
      // nước đầm Màn 2: đục ngầu lúc đầu, trong dần khi khu rừng sạch và hồi sinh
      const trong = Math.min(1, HSX.Calc.cleanPct() * 0.7 + (HSX.Calc.levelDone() ? 0.5 : 0));
      const nuoc = mix('#3b4528', '#2a6a72', trong), mat = mix('#8a9a6a', '#bfe8e6', trong);
      // nước đang rút sau khi phá cống: mặt nước hạ dần rồi biến mất
      if (W.xa) {
        const p = Math.min(1, W.xa.t / W.xa.dur), lv = (W.xa.top + (W.xa.bot - W.xa.top) * p * p) * T;
        c.globalAlpha = 1 - p * 0.6;
        c.fillStyle = nuoc;
        W.xa.o.forEach(([x, y]) => { const a = Math.max(y * T, lv); if (a < (y + 1) * T) c.fillRect(x * T, a, T, (y + 1) * T - a); });
        c.globalAlpha = 1;
      }
      this.veNuoc(c, r, x0, x1, t, trong, mat);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const ch = r.grid[y][x], px = x * T, py = y * T;
        if (ch === 'n') this.luoiO(c, r, x, y, px, py, t);
        else if (ch === '~') {
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
      r.rootSegs.forEach(sg => this.cauRe(c, r, sg, t));
    },

    // Nước ngập Màn 2, vẽ theo từng cột: mỗi dải nước liền nhau đậm dần theo độ sâu (cùng thang độ sâu nên các cột nối liền).
    // Trước khi đổ nước, đắp bờ bùn dốc thoai thoải ở bên có đất và gò bùn lồi lõm ở đáy: nhìn xuyên qua nước thấy bờ dốc,
    // hồ không còn vuông vức như cái hộp. Mặt nước gợn sóng liền mạch, bọt trắng ven bờ, lá rụng trôi.
    veNuoc(c, r, x0, x1, t, trong, mat) {
      const pal = PAL[r.def.area] || PAL.rung;
      const tren = mix('#617552', '#5fb0ae', trong), duoi = mix('#141a10', '#123a42', trong);
      const bun = mix(pal.body, '#0a0805', 0.2), bunMat = mix(pal.top, '#1a140c', 0.45);
      const W = (x, y) => r.tile(x, y) === 'w', dat = (x, y) => r.solid(x, y);
      for (let x = Math.max(0, x0 - 1); x <= Math.min(r.w - 1, x1 + 1); x++) {
        for (let y = 0; y < r.h; y++) {
          if (!W(x, y) || W(x, y - 1)) continue;   // đầu mỗi dải nước (ô có mặt nước)
          let y1 = y;
          while (W(x, y1 + 1)) y1++;
          const px = x * T, top = y * T + 10, bot = (y1 + 1) * T, sau = bot - top;
          // Lòng hồ hình chảo: sát bờ thì đáy bùn dâng gần tới mặt nước, cách bờ hơn hai ô thì sâu hẳn.
          // Chiều cao đáy ở mép cột tính từ khoảng cách tới bờ, nên hai cột cạnh nhau nối liền một đường cong.
          let dl = 0, dr = 0;
          while (dl < 6 && W(x - dl - 1, y)) dl++;
          while (dr < 6 && W(x + dr + 1, y)) dr++;
          const cao = d => Math.max(0, 1 - d / 2.3) * sau * 0.82 + 4;
          const hl = Math.max(cao(dl), cao(dr + 1)), hr = Math.max(cao(dl + 1), cao(dr)), hm = (hl + hr) / 2 + hash(x, y1) * 6;
          c.fillStyle = bun;
          c.beginPath();
          c.moveTo(px, bot);
          c.lineTo(px, bot - hl);
          c.quadraticCurveTo(px + T / 2, bot - hm - (hl + hr) * 0.04, px + T, bot - hr);
          c.lineTo(px + T, bot);
          c.closePath();
          c.fill();
          c.strokeStyle = bunMat;   // lớp phù sa sáng hơn trên mặt bùn
          c.lineWidth = 2.5;
          c.beginPath(); c.moveTo(px, bot - hl); c.quadraticCurveTo(px + T / 2, bot - hm - (hl + hr) * 0.04, px + T, bot - hr); c.stroke();
          // bậc đất nằm dưới nước (bên cạnh là đất từ hàng nào đó trở xuống): mái bùn loe ra che cạnh vuông
          c.fillStyle = bun;
          [-1, 1].forEach(s => {
            let ys = -1;
            for (let yy = y + 1; yy <= y1; yy++) if (dat(x + s, yy)) { ys = yy; break; }
            if (ys < 0) return;
            const a = ys * T - 4, rong = Math.min(34, 12 + (bot - a) * 0.3), bx = s < 0 ? px : px + T;
            c.beginPath(); c.moveTo(bx, a); c.quadraticCurveTo(bx - s * 4, a + (bot - a) * 0.5, bx - s * rong, bot); c.lineTo(bx, bot); c.closePath(); c.fill();
          });
          if (hash(x * 7, y1) > 0.7) {   // đá cuội, rễ chìm dưới đáy
            c.fillStyle = 'rgba(30,24,16,0.8)';
            c.beginPath(); c.ellipse(px + 10 + hash(x, y1 * 3) * 28, bot - hm + 4, 5, 3, 0, 0, 6.283); c.fill();
          }
          // nước: đậm dần theo độ sâu (cùng thang cho mọi cột), đủ trong để thấy lòng hồ
          const g = c.createLinearGradient(0, top, 0, top + 3 * T);
          g.addColorStop(0, tren);
          g.addColorStop(1, duoi);
          c.globalAlpha = 0.6;
          c.fillStyle = g;
          c.fillRect(px, top, T, sau);
          c.globalAlpha = 0.16;   // dải sáng phản chiếu ngay dưới mặt nước
          c.fillStyle = '#eafff4';
          c.fillRect(px, top + 3, T, 4);
          c.globalAlpha = 1;
          c.strokeStyle = mat;
          c.lineWidth = 2.2;
          c.beginPath();
          for (let i = 0; i <= 6; i++) { const yy = top + Math.sin(t * 2 + (px + i * 8) * 0.019) * 2; if (i) c.lineTo(px + i * 8, yy); else c.moveTo(px, yy); }
          c.stroke();
          [-1, 1].forEach(s => {   // bọt trắng ven bờ
            if (!dat(x + s, y)) return;
            const bx = s < 0 ? px : px + T;
            c.fillStyle = `rgba(235,245,230,${0.45 + 0.2 * Math.sin(t * 2.5 + x)})`;
            for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(bx - s * (3 + i * 5), top + 1 + Math.sin(t * 3 + i) * 1.2, 2.2 - i * 0.5, 0, 6.283); c.fill(); }
          });
          if (hash(x, y) > 0.55) {   // lá đước rụng, bèo trôi
            const lx = px + ((hash(x, 3) * T + t * 6) % T), ly = top + 2 + Math.sin(t * 2 + x) * 1.5;
            c.fillStyle = trong > 0.5 ? 'rgba(120,200,110,0.75)' : 'rgba(170,160,90,0.7)';
            c.beginPath(); c.ellipse(lx, ly, 5, 2, 0.3, 0, 6.283); c.fill();
          }
        }
      }
    },

    // Một ô lưới ma: mắt lưới chéo đung đưa, nút thắt, đôi khi có con cá mắc kẹt. Trúng đòn thì rung.
    luoiO(c, r, x, y, px, py, t) {
      const lr = r.luoiRung, rung = lr && lr.o.has(x + ',' + y) ? Math.sin(t * 70) * 3 * (lr.t / 0.22) : 0;
      c.save();
      c.translate(px + rung, py);
      c.beginPath(); c.rect(0, 0, T, T); c.clip();
      c.fillStyle = 'rgba(50,34,80,0.22)';
      c.fillRect(0, 0, T, T);
      c.translate(T / 2, T / 2);
      c.rotate(0.785);
      c.strokeStyle = 'rgba(122,170,140,0.9)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = -36; i <= 36; i += 11) {
        const s = Math.sin(t * 1.3 + x * 0.7 + y + i * 0.1) * 1.4;
        c.moveTo(i + s, -40); c.lineTo(i - s, 40);
        c.moveTo(-40, i - s); c.lineTo(40, i + s);
      }
      c.stroke();
      c.fillStyle = 'rgba(190,220,190,0.9)';
      for (let i = -33; i <= 33; i += 11) for (let j = -33; j <= 33; j += 11) if (hash(x * 7 + i, y * 5 + j) > 0.78) c.fillRect(i - 1.5, j - 1.5, 3, 3);
      c.restore();
      if (hash(x, y * 3) > 0.72) {   // cá mắc lưới
        const fx = px + 12 + hash(x, y) * 22, fy = py + 14 + hash(y, x) * 20, l = Math.sin(t * 3 + x) * 0.15;
        c.save();
        c.translate(fx + rung, fy);
        c.rotate(l);
        c.fillStyle = 'rgba(230,150,70,0.85)';
        c.beginPath(); c.ellipse(0, 0, 7, 3.5, 0, 0, 6.283); c.fill();
        c.beginPath(); c.moveTo(6, 0); c.lineTo(11, -4); c.lineTo(11, 4); c.closePath(); c.fill();
        c.restore();
      }
    },

    // Cầu rễ đước: chưa trồng thì là vệt đứt nét gợi ý; cây lớn dần thì rễ vươn dần từ phía cây sang
    cauRe(c, r, sg, t) {
      const g = r.rootGrow(sg.x0, sg.y), x0 = sg.x0 * T, x1 = (sg.x1 + 1) * T, y = sg.y * T, L = x1 - x0;
      c.save();
      if (g <= 0) {
        c.strokeStyle = `rgba(170,245,200,${0.18 + 0.08 * Math.sin(t * 2)})`;
        c.setLineDash([5, 8]);
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(x0, y + 8); c.quadraticCurveTo((x0 + x1) / 2, y - 4, x1, y + 8); c.stroke();
        c.restore();
        return;
      }
      const tuTrai = sg.from <= sg.x0, len = L * Math.min(1, g * 1.15);
      const a = tuTrai ? x0 : x1 - len;
      c.beginPath(); c.rect(a - 4, y - 40, len + 8, T + 60); c.clip();
      c.strokeStyle = '#4e3822';
      c.lineCap = 'round';
      for (let i = 0; i <= Math.ceil(L / 34); i++) {   // rễ chống hình vòm cắm xuống nước
        const sx = x0 + i * 34 - 12, w = 56 + hash(i, sg.y) * 30, hg = 14 + hash(i + 3, sg.y) * 14;
        c.lineWidth = 3.5 + hash(i, sg.y + 1) * 3;
        c.beginPath(); c.moveTo(sx, y + 40); c.quadraticCurveTo(sx + w / 2, y - hg + 14, sx + w, y + 40); c.stroke();
      }
      c.strokeStyle = '#7a5a36';
      c.lineWidth = 6;
      c.beginPath(); c.moveTo(x0, y + 5); c.quadraticCurveTo((x0 + x1) / 2, y + 1, x1, y + 5); c.stroke();
      c.strokeStyle = '#a3824e';
      c.lineWidth = 2;
      c.beginPath(); c.moveTo(x0, y + 2); c.quadraticCurveTo((x0 + x1) / 2, y - 2, x1, y + 2); c.stroke();
      if (g >= 1) {   // đầu rễ phát sáng yếu
        c.fillStyle = `rgba(170,255,200,${0.45 + 0.3 * Math.sin(t * 2)})`;
        for (let i = 0; i < L / 30; i++) { c.beginPath(); c.arc(x0 + 15 + i * 30, y + 34 - hash(i, 9) * 10, 2, 0, 6.283); c.fill(); }
      }
      c.restore();
    },

    // ---------- Vật thể ----------
    drawObj(o, r) {
      const c = this.ctx, S = HSX.S, t = performance.now() / 1000;
      const cx = o.x + T / 2, by = o.y + T, sx = o.shake ? Math.sin(t * 80) * 4 : 0;
      if (this.drawProp(o, cx, by, sx, t)) return;
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
          const tr = (S.trees[r.id] || {})[o.idx], boi = o.dat === 'boi';
          // bãi bồi: gò bùn ướt bóng nước; ô đất thường: luống đất
          c.fillStyle = boi ? '#3a3020' : '#4a3220';
          c.beginPath(); c.ellipse(cx, by - 2, boi ? 24 : 20, boi ? 8 : 7, 0, Math.PI, 0); c.fill();
          if (boi) { c.fillStyle = 'rgba(150,200,210,0.35)'; c.beginPath(); c.ellipse(cx - 6, by - 6, 8, 2, 0, 0, 6.283); c.fill(); }
          if (!tr) {
            const g = boi ? 0.35 + 0.3 * Math.sin(t * 3) : 0.5;   // bãi bồi nhấp nháy mời cắm trụ mầm
            c.fillStyle = `rgba(160,230,150,${g})`;
            if (boi && S.flags.trongDuoc) { c.fillRect(cx - 1, by - 22, 2, 16); c.beginPath(); c.ellipse(cx, by - 24, 3, 5, 0, 0, 6.283); c.fill(); }
            else c.fillRect(cx - 1, by - 12, 2, 8);
            break;
          }
          const d = D.trees[tr.type], dv = tr.type === 'duoc' && HSX.DO_VAT && HSX.DO_VAT.cay_duoc && A.get('props/cay_duoc_1');
          if (dv) {   // cây đước ảnh Qwen: lớn dần từ trụ mầm
            const h = 40 + 110 * tr.g, w = dv.width * h / dv.height, lac = Math.sin(t * 1.2 + o.idx) * 0.02;
            c.save(); c.translate(cx, by + 4); c.rotate(lac); c.drawImage(dv, -w / 2, -h, w, h); c.restore();
            break;
          }
          const img = A.get('trees/' + tr.type), size = 26 + 50 * tr.g;
          if (img) c.drawImage(img, cx - size / 2, by - size - 2, size, size);
          else this.emoji(tr.g >= 1 ? d.emoji : '🌱', cx, by - 4, tr.g >= 1 ? 58 : size * 0.6);
          break;
        }
        case 'npc': this.drawNpc(o, cx, by, t); break;
        case 'hut': this.drawHut(o, cx, by); break;
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

    // Đồ vật bằng ảnh Qwen (assets/props, xem qwen/HUONG_DAN.md). Trả về false nếu chưa có ảnh để vẽ bằng code.
    // rong: bề rộng khi vẽ (px), chân ảnh đặt ở đáy ô (lún xuống một chút cho dính đất)
    drawProp(o, cx, by, sx, t) {
      const c = this.ctx, DV = HSX.DO_VAT || {};
      const anh = (id, k) => DV[id] && A.get(`props/${id}_${1 + (k || 0) % DV[id]}`);
      const ve = (img, rong, x, day, lat) => {
        const h = img.height * rong / img.width;
        c.save();
        c.translate(x, day);
        if (lat) c.scale(-1, 1);
        c.drawImage(img, -rong / 2, -h, rong, h);
        c.restore();
        return h;
      };
      switch (o.type) {
        case 'heap': {
          const img = (HSX.S.level !== 'm1' && anh('dong_rac_dam', o.idx)) || anh('dong_rac', o.idx);   // Màn 2: rác đầm tôm
          if (!img) return false;
          // trúng đòn: nảy dẹt rồi bật lại
          const ep = o.shake ? 1 - Math.sin(o.shake / 0.15 * Math.PI) * 0.12 : 1;
          c.save();
          c.translate(cx + sx, by + 4);
          c.scale(2 - ep, ep);
          ve(img, 78, 0, 0, o.idx % 2);
          c.restore();
          return true;
        }
        case 'bench': {
          const img = anh('tram');
          if (!img) return false;
          ve(img, 104, cx, by + 3);
          return true;
        }
        case 'cage': {
          const img = anh('long');
          if (!img) return false;
          const sp = A.get('heroes/' + o.spirit);
          c.globalAlpha = 0.6;
          if (sp) c.drawImage(sp, cx - 24 + sx, by - 62, 48, 48);
          else this.emoji(D.spirits[o.spirit].emoji, cx + sx, by - 24, 30);
          c.globalAlpha = 1;
          ve(img, 76, cx + sx, by + 2);
          if (!HSX.World.cageOpen()) this.emoji('🔒', cx + sx, by - 12, 16);
          return true;
        }
        case 'lantern': {
          const img = anh('den_long');
          if (!img) return false;
          const lac = Math.sin(t * 1.3) * 0.06, h = img.height * 30 / img.width;
          c.strokeStyle = '#3a2a1a';
          c.lineWidth = 2;
          c.beginPath(); c.moveTo(cx, o.y - 4); c.lineTo(cx + Math.sin(lac) * 12, o.y + 8); c.stroke();
          c.save();
          c.translate(cx, o.y - 4);
          c.rotate(lac);
          c.drawImage(img, -15, 10, 30, h);
          c.restore();
          return true;
        }
        case 'journal': {
          const img = anh('nhat_ky');
          if (!img) return false;
          ve(img, 50, cx, by + 2);
          return true;
        }
      }
      return false;
    },

    // Mẹ Đước: ảnh Qwen (hoặc emoji), thở nhẹ, quay mặt về phía Mầm; 💬 khi có chuyện chưa kể
    drawNpc(o, cx, by, t) {
      const c = this.ctx, img = A.get('npc/me_duoc'), P = HSX.Player, h = 104;
      const mat = P.cx() < cx ? 1 : -1;   // ảnh gốc nhìn sang trái
      c.save();
      c.translate(cx, by + 2);
      c.scale(mat, 1 + Math.sin(t * 2.2) * 0.012);
      if (img) this.spr(img, -h * 0.625, -h * 1.25 + 5, h * 1.25, h * 1.25, 'mam');
      else this.emoji('👵', 0, -10, 52);
      c.restore();
      if (!HSX.S.flags.gapMeDuoc || HSX.S.seeds < 2) this.emoji('💬', cx + 18, by - h - 4 + Math.sin(t * 3) * 3, 20);
    },
    // Nhà sàn của Mẹ Đước (trang trí phía sau)
    drawHut(o, cx, by) {
      const c = this.ctx, DV = HSX.DO_VAT || {}, img = DV.nha_san && A.get('props/nha_san_1');
      if (img) { const w = 250, h = img.height * w / img.width; c.drawImage(img, cx - w / 2, by + 6 - h, w, h); return; }
      c.fillStyle = '#4a3420';
      [-80, -30, 30, 80].forEach(dx => c.fillRect(cx + dx - 4, by - 110, 8, 110));
      c.fillStyle = '#6b4a2b';
      c.fillRect(cx - 95, by - 120, 190, 12);
      c.fillStyle = '#8a6a44';
      c.fillRect(cx - 85, by - 200, 170, 80);
      c.fillStyle = '#b89a5a';
      c.beginPath(); c.moveTo(cx - 115, by - 192); c.lineTo(cx, by - 262); c.lineTo(cx + 115, by - 192); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,200,120,0.85)';
      c.fillRect(cx + 40, by - 175, 22, 26);
    },

    drawCritters(r) {
      const S = HSX.S, t = performance.now() / 1000, c = this.ctx;
      if (r.id === 'hang_cong' && S.species.cong_gio) {
        for (let i = 0; i < 3; i++) this.sprite('species/cong_gio', '🦀', 250 + i * 380 + Math.sin(t * 0.9 + i * 2) * 70, 11 * T, 28);
      }
      if (r.id === 'bai_de_rua' && S.species.rua_bien) {
        const nest = r.objs.find(o => o.type === 'nest');
        if (nest) this.sprite('species/rua_bien', '🐢', nest.x + T + 40 + Math.sin(t * 0.3) * 14, nest.y + T, 44);
      }
      // Màn 2: cá thòi lòi nhảy trên bãi bùn, cò trắng đứng gần nhà Mẹ Đước
      if (r.id === 'dam_bo_hoang' && S.species.ca_thoi_loi) {
        [[4, 12], [16, 11], [26, 11], [35, 11], [44, 12]].forEach(([x, y], i) => {
          const p = (t * 0.7 + i * 0.37) % 1, nhay = p < 0.25 ? Math.sin(p / 0.25 * Math.PI) * 18 : 0;
          this.sprite('species/ca_thoi_loi', '🐟', x * T + 20 + Math.sin(t * 0.4 + i) * 10, (y + 1) * T - 2 - nhay, 22);
        });
      }
      if (r.id === 'nha_me_duoc' && S.species.co_trang) {
        [[17, 11], [25, 10.95], [36, 11]].forEach(([x, y], i) => {
          const gx = x * T, gy = (y + 1) * T, cui = Math.max(0, Math.sin(t * 0.8 + i * 2)) > 0.92 ? 6 : 0;
          c.strokeStyle = '#e8ecef'; c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(gx - 3, gy); c.lineTo(gx - 1, gy - 16); c.moveTo(gx + 3, gy); c.lineTo(gx + 1, gy - 16); c.stroke();
          c.fillStyle = '#f4f7f8';
          c.beginPath(); c.ellipse(gx, gy - 22, 11, 7, -0.2, 0, 6.283); c.fill();
          c.strokeStyle = '#f4f7f8'; c.lineWidth = 3;
          c.beginPath(); c.moveTo(gx + 7, gy - 25); c.quadraticCurveTo(gx + 14, gy - 34, gx + 9, gy - 42 + cui); c.stroke();
          c.fillStyle = '#e8b84a';
          c.beginPath(); c.moveTo(gx + 9, gy - 43 + cui); c.lineTo(gx + 19, gy - 41 + cui); c.lineTo(gx + 9, gy - 40 + cui); c.fill();
        });
      }
    },
    // Đom đóm ở Rặng bần (vẽ cộng sáng sau lớp ánh sáng, nên luôn lấp lánh trong bóng tối)
    drawDomDom(r, t) {
      if (r.id !== 'ran_ban' || !HSX.S.species.dom_dom) return;
      const c = this.ctx;
      const cay = r._domCay || (r._domCay = r.objs.filter(o => o.type === 'plant'));   // lọc một lần mỗi phòng, không lọc lại 34 lần mỗi khung
      const spr = this.glow('rgba(230,255,150,1)');
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 34; i++) {
        const goc = cay[i % 2] || { x: 10 * T, y: 10 * T };
        const x = goc.x + T / 2 + Math.sin(t * 0.5 + i * 1.7) * 90 + Math.sin(t * 1.3 + i) * 20;
        const y = goc.y - 60 + Math.cos(t * 0.4 + i * 2.3) * 60 + Math.sin(t * 1.1 + i) * 14;
        const a = Math.max(0, Math.sin(t * 2.2 + i * 1.9)) * 0.9;
        if (a < 0.05) continue;
        c.globalAlpha = a;
        c.drawImage(spr, x - 9, y - 9, 18, 18);
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    },

    drawShot(s) {
      const c = this.ctx;
      if (s.type === 'hat' || s.type === 'bao' || s.type === 'vung') return;   // vẽ sau ánh sáng (veSang)
      if (s.type === 'bag') { this.emoji('🛍️', s.x + s.w / 2, s.y + s.h - 2, 32); return; }
      if (s.type === 'net') { this.luoiBay(s.x + s.w / 2, s.y + s.h / 2, s.w / 2, s.t); return; }
      const g = c.createLinearGradient(0, s.y, 0, s.y + s.h);
      g.addColorStop(0, 'rgba(190,140,255,0)');
      g.addColorStop(1, 'rgba(190,140,255,0.9)');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(s.x, s.y + s.h);
      c.quadraticCurveTo(s.x + s.w / 2, s.y - 10, s.x + s.w, s.y + s.h);
      c.fill();
    },

    // Vẽ sau ánh sáng để phòng tối vẫn thấy rõ: hạt ná, quầng vàng quanh túi / lưới bị phản lại, bóng báo mưa túi,
    // vùng đánh của boss, báo trước chiêu boss sắp ra
    veSang(W, t) {
      const c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      W.shots.forEach(s => {
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        if (s.type === 'hat') {   // hạt nhựa: lõi trắng, vệt sáng phía sau
          const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
          c.strokeStyle = 'rgba(200,230,255,0.55)';
          c.lineWidth = 5;
          c.lineCap = 'round';
          c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx - ux * 34, cy - uy * 34); c.stroke();
          c.fillStyle = '#f4fbff';
          c.beginPath(); c.arc(cx, cy, 5, 0, 6.283); c.fill();
        } else if (s.phan) {   // túi / lưới đang bay ngược về phía boss
          const g = c.createRadialGradient(cx, cy, 4, cx, cy, s.w * 0.8);
          g.addColorStop(0, 'rgba(255,240,170,0.55)');
          g.addColorStop(1, 'rgba(255,240,170,0)');
          c.fillStyle = g;
          c.fillRect(cx - s.w, cy - s.w, s.w * 2, s.w * 2);
        } else if (s.type === 'bao') {   // bóng tím dưới đất: túi sắp rơi xuống chỗ này
          const k = 1 - s.life / s.max;
          c.fillStyle = `rgba(190,130,255,${0.15 + 0.4 * k})`;
          c.beginPath(); c.ellipse(cx, s.y + s.h / 2, 10 + 14 * k, 4 + 3 * k, 0, 0, 6.283); c.fill();
          c.strokeStyle = `rgba(230,200,255,${0.3 + 0.5 * k})`;
          c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(cx, s.y - 6); c.lineTo(cx, s.y - 6 - 40 * k); c.stroke();
        } else if (s.type === 'vung') {
          const a = Math.max(0, s.life / s.max);
          if (s.kieu === 'kep') {   // vệt càng kẹp
            c.strokeStyle = `rgba(255,236,190,${0.9 * a})`;
            c.lineWidth = 6;
            c.beginPath(); c.arc(s.dir > 0 ? s.x : s.x + s.w, cy, s.w * 0.9, s.dir > 0 ? -0.9 : Math.PI - 0.9, s.dir > 0 ? 0.9 : Math.PI + 0.9); c.stroke();
          } else if (s.kieu === 'sap') {   // màn lưới sập xuống
            c.globalAlpha = a;
            c.strokeStyle = 'rgba(160,220,180,0.8)';
            c.lineWidth = 1.5;
            c.beginPath();
            for (let x = s.x; x <= s.x + s.w; x += 12) { c.moveTo(x, s.y); c.lineTo(x + 18, s.y + s.h); c.moveTo(x + 18, s.y); c.lineTo(x, s.y + s.h); }
            c.stroke();
            c.globalAlpha = 1;
          } else if (s.kieu === 'quay') {   // sợi lưới quẫy tung ra tới mép vùng bầu dục
            const rx = s.w / 2, ry = s.h / 2;
            c.strokeStyle = `rgba(160,240,190,${0.75 * a})`;
            c.lineWidth = 2;
            c.beginPath();
            for (let k = 0; k < 16; k++) {
              const g = k / 16 * 6.283 + s.t * 4;
              c.moveTo(cx + Math.cos(g) * rx * 0.25, cy + Math.sin(g) * ry * 0.25);
              c.quadraticCurveTo(cx + Math.cos(g + 0.3) * rx * 0.7, cy + Math.sin(g + 0.3) * ry * 0.7, cx + Math.cos(g + 0.2) * rx, cy + Math.sin(g + 0.2) * ry);
            }
            c.stroke();
            c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, 6.283); c.stroke();
          }
        }
      });
      W.enemies.forEach(e => { if (e.kind === 'boss' && e.active && !e.dead) this.baoTruoc(e, t); });
      if (HSX.Player.ngam && HSX.Player.ngamT > 0.05) this.duongNgam(HSX.Player, t);
      c.restore();
    },
    // Đường bay vòng cung của hạt ná khi đang ngắm: chấm mờ dần theo quãng bay, vòng ở chỗ hạt sẽ chạm (đỏ nếu trúng quái)
    duongNgam(P, t) {
      const c = this.ctx, W = HSX.World, r = W.room, a = P.banAng, d = P.diemBan(a), v = P.tocBan(P.luc()), g = P.C.BAN_G, dt = 1 / 60;
      let x = d.x, y = d.y, vx = Math.cos(a) * v, vy = Math.sin(a) * v, cham = null;
      c.fillStyle = '#eef8ff';
      for (let i = 1; i <= 110 && !cham; i++) {
        vy += g * dt; x += vx * dt; y += vy * dt;
        const tx = Math.floor(x / T), ty = Math.floor(y / T);
        if (x < 0 || x > r.w * T || y > r.h * T || r.solid(tx, ty)) cham = { x, y };
        else if (W.enemies.some(e => !e.dead && (e.kind !== 'boss' || e.active) && x > e.x && x < e.x + e.w && y > e.y && y < e.y + e.h)) cham = { x, y, quai: true };
        else if (i % 3 === 0) {
          c.globalAlpha = Math.max(0.15, 0.85 - i / 140);
          c.beginPath(); c.arc(x, y, i % 6 === 0 ? 3 : 2, 0, 6.283); c.fill();
        }
      }
      if (cham) {
        c.globalAlpha = 0.85;
        c.strokeStyle = cham.quai ? '#ff9a8a' : '#eef8ff';
        c.lineWidth = 2;
        c.beginPath(); c.arc(cham.x, cham.y, 7 + Math.sin(t * 10) * 1.5, 0, 6.283); c.stroke();
      }
      c.globalAlpha = 1;
    },
    // Báo trước chiêu boss: cột dưới bụng Lưới Ma sắp sập lưới, vòng quanh Vua sắp nổ túi, vùng trước mặt Cua sắp kẹp
    baoTruoc(e, t) {
      const c = this.ctx, cx = e.x + e.w / 2, nhap = 0.5 + 0.5 * Math.sin(t * 18);
      if (e.state === 'sap' && !e.sap && e.t > 0) {
        const y0 = e.y + e.h * 0.55, day = (HSX.World.room.h - 2) * T, w = e.w * 0.84;
        const g = c.createLinearGradient(0, y0, 0, day);
        g.addColorStop(0, `rgba(190,130,255,${0.04 + 0.08 * nhap})`);
        g.addColorStop(1, `rgba(190,130,255,${0.14 + 0.18 * nhap})`);
        c.fillStyle = g;
        c.fillRect(cx - w / 2, y0, w, day - y0);
      } else if (e.state === 'no' && !e.no && e.t > 0) {   // sắp nổ túi
        c.strokeStyle = `rgba(230,213,255,${0.25 + 0.35 * nhap})`;
        c.lineWidth = 3;
        c.setLineDash([10, 8]);
        c.beginPath(); c.ellipse(cx, e.y + e.h / 2, 160, e.h / 2 + 30, 0, 0, 6.283); c.stroke();
        c.setLineDash([]);
      } else if (e.state === 'quay' && !e.quay && e.t > 0) {   // sắp quẫy lưới: đúng vùng bầu dục sẽ trúng (Enemies.QUAY)
        const q = HSX.Enemies.QUAY, cy = e.y + e.h / 2 + q.lech;
        c.fillStyle = `rgba(170,240,200,${0.04 + 0.07 * nhap})`;
        c.strokeStyle = `rgba(170,240,200,${0.25 + 0.35 * nhap})`;
        c.lineWidth = 3;
        c.setLineDash([10, 8]);
        c.beginPath(); c.ellipse(cx, cy, q.rx, q.ry, 0, 0, 6.283); c.fill(); c.stroke();
        c.setLineDash([]);
      } else if (e.state === 'kep' && !e.kep && e.t > 0) {
        c.fillStyle = `rgba(255,220,160,${0.06 + 0.12 * nhap})`;
        c.fillRect(e.dir > 0 ? e.x + e.w - 20 : e.x - 90, e.y + e.h * 0.2, 110, e.h * 0.75);
      }
    },

    // Tấm lưới đang bay (Lưới Ma Khổng Lồ quăng) hoặc đang trùm lên Mầm: hình tròn mắt lưới, phao nhựa ở mép
    luoiBay(x, y, rr, t) {
      const c = this.ctx;
      c.save();
      c.translate(x, y);
      c.rotate(Math.sin(t * 5) * 0.15);
      c.beginPath(); c.ellipse(0, 0, rr, rr * 0.8, 0, 0, 6.283);
      c.fillStyle = 'rgba(60,40,100,0.18)';
      c.fill();
      c.save();
      c.clip();
      c.strokeStyle = 'rgba(140,190,160,0.95)';
      c.lineWidth = 1.6;
      c.beginPath();
      for (let i = -rr; i <= rr; i += 9) { c.moveTo(i - rr, -rr); c.lineTo(i + rr, rr); c.moveTo(i + rr, -rr); c.lineTo(i - rr, rr); }
      c.stroke();
      c.restore();
      c.strokeStyle = 'rgba(200,170,255,0.8)';
      c.lineWidth = 2.2;
      c.beginPath(); c.ellipse(0, 0, rr, rr * 0.8, 0, 0, 6.283); c.stroke();
      c.fillStyle = '#e8743a';
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + t; c.beginPath(); c.arc(Math.cos(a) * rr, Math.sin(a) * rr * 0.8, 3, 0, 6.283); c.fill(); }
      c.restore();
    },

    // o: { pop: 0-1 } quái vừa bị hạ (nảy to, trắng lên) · { chet: giây } boss đang gục ngã
    drawEnemy(e, o) {
      const c = this.ctx, t = performance.now() / 1000, img = A.get('enemies/' + e.img);
      const cx = e.x + e.w / 2, by = e.y + e.h, fr = e.kind === 'boss' && this.bossFrame(e, o);
      // có khung hoạt ảnh thì không cần rung, nghiêng giả bằng code; boss rướn lâu (đòn giả) thì rung người
      const wobble = (!fr && (e.state === 'windup' || e.state === 'raise') ? Math.sin(t * 60) * 2 : 0) + (!o && e.gia && e.t > 0 ? Math.sin(t * 75) * 2.5 : 0);
      c.save();
      c.translate(cx + wobble, by + (e.def.fly ? Math.sin(e.ph * 3) * 3 : 0));
      if (e.dir > 0) c.scale(-1, 1);
      const sq = e.squash, stretch = !fr && !e.ground && !e.def.fly ? 0.06 : 0, pop = o && o.pop ? 1 + o.pop * 0.35 : 1;
      c.scale((1 + sq * 0.15 - stretch) * pop, (1 - sq * 0.2 + stretch) * pop);
      // chớp trắng khi trúng đòn; xác boss chỉ chớp trong khoảnh khắc đầu (e.flash không còn giảm sau khi chết)
      if ((e.flash > 0 && !o) || (o && o.pop) || (o && o.chet < 0.08)) c.filter = 'brightness(2.6)';
      if (e.state === 'stun' && !fr) c.rotate(Math.sin(t * 12) * 0.05);
      const size = e.h / 0.8 * (e.kind === 'boss' ? 1.08 : 1.15), rim = o ? null : e.open > 0 ? 'soho' : 'quai';
      if (fr) {
        // khung boss: khổ chung G, (fr.x, fr.y) là chỗ ảnh đã cắt sát nằm trong khổ đó; thân dáng đứng cao bằng ảnh gốc
        const G = HSX.KHUNG_QUAI_CO, u = size * 0.8 / G.cao;
        this.spr(fr.img, (fr.x - G.w / 2) * u, (fr.y - G.chan) * u + 3, fr.img.width * u, fr.img.height * u, rim);
      } else if (img) {
        if (e.def.fly) c.globalAlpha *= 0.9;
        this.spr(img, -size / 2, -size + 4, size, size, rim);
      } else {
        c.fillStyle = e.def.color;
        c.beginPath(); c.ellipse(0, -e.h / 2, e.w / 2, e.h / 2, 0, 0, 6.283); c.fill();
        c.filter = 'none';
        this.emoji(e.def.emoji, 0, -e.h * 0.25, e.h * 0.55);
      }
      c.restore();
      if (o) return;
      if (e.kind === 'boss' && e.layers > 0) {
        c.strokeStyle = 'rgba(220,210,255,0.45)';
        c.lineWidth = 3;
        for (let i = 0; i < e.layers; i++) {
          c.beginPath();
          c.ellipse(cx, by - e.h / 2, e.w / 2 + 8 + i * 6, e.h / 2 + 6 + i * 5, Math.sin(t + i) * 0.1, 0, 6.283);
          c.stroke();
        }
      }
      if (e.state === 'stun' || e.state === 'choang' || e.state === 'quan') this.emoji('💫', cx, e.y - 4, 22);
      if (e.state === 'windup' && e.kind === 'enemy') this.emoji('❗', cx, e.y - 4, 18);
    },

    // Khung hoạt ảnh boss theo trạng thái AI (enemies.js). Mỗi động tác là một dãy khung trong assets/enemies/khung.js:
    // { động tác: [[x, y], ...] } là chỗ đặt từng khung đã cắt sát trong khổ chung. Trả về null nếu chưa có ảnh.
    bossFrame(e, o) {
      const K = (HSX.KHUNG_QUAI || {})[e.type];
      if (!K) return null;
      const fr = (dt, i) => {
        const ds = K[dt];
        if (!ds) return null;
        const j = Math.min(ds.length - 1, Math.max(0, i)), img = A.get(`enemies/${e.type}_${dt}_${j + 1}`);
        return img && { img, x: ds[j][0], y: ds[j][1] };
      };
      const pick = (dt, p, n) => fr(dt, Math.floor(Math.min(0.999, Math.max(0, p)) * (n || (K[dt] || []).length)));
      const loop = (dt, fps, tu) => { const n = (K[dt] || []).length - (tu || 0); return n > 0 ? fr(dt, (tu || 0) + Math.floor(e.ph * fps) % n) : null; };
      const cuoi = dt => fr(dt, (K[dt] || []).length - 1);
      const st = e.state, t0 = e.stT || 0, truoc = e.prevState;
      const chon = () => {
        if (o && o.chet !== undefined) return pick('chet', o.chet / 1.6);
        if (e.stagger > 0) return pick('dau', 1 - e.stagger / 0.45);
        if (!e.active) return null;
        if (e.type === 'vua_nilon') {
          if (st === 'intro') return pick('gam', t0 / 1.4);
          if (st === 'roar') return pick('gam', t0 / 1.2);
          if (st === 'summon') return pick('gam', t0 / 0.6);
          if (st === 'throw') return pick('nem', t0 / 0.6, (K.nem || []).length - 1);   // khung cuối là lúc buông tay
          if (st === 'leap') return e.t > 0 ? fr('nhay', t0 < 0.12 ? 0 : 1) : fr('nhay', e.vy < 0 ? 2 : 3);
          if (st === 'charge') return e.t > 0 ? fr('lao', 1) : loop('lao', 10, 1);   // lấy đà: chúi người về trước
          if (st === 'lun') return cuoi('nhay');                                      // lún xuống cát sau cú nhảy đập
          if (st === 'choang') return loop('dau', 5, 1);                              // đâm tường, choáng
          if (st === 'no') return e.no ? cuoi('gam') : pick('gam', t0 / 0.5);         // phồng lên rồi nổ túi
          if (st === 'mua') return pick('gam', t0 / 0.7);
          if (truoc === 'throw' && t0 < 0.3) return cuoi('nem');
          if (truoc === 'leap' && t0 < 0.35) return cuoi('nhay');
          return null;
        }
        if (e.type === 'luoi_ma_khong_lo') {
          if (st === 'intro') return pick('goi', t0 / 1.4);
          if (st === 'roar') return pick('goi', t0 / 1.2);
          if (st === 'goi') return pick('goi', t0 / 0.9);
          if (st === 'quang') return e.nem ? cuoi('quang') : pick('quang', t0 / 0.6, (K.quang || []).length - 1);
          if (st === 'lao') return e.t > 0 ? fr('lao', 1) : fr('lao', 2);
          if (st === 'ket') return cuoi('lao');                                       // cắm xuống đất sau cú lao
          if (st === 'quan') return fr('chet', 0);                                    // tự quấn trong lưới, rũ xuống
          if (st === 'sap') return e.sap ? cuoi('quang') : pick('quang', t0 / 0.45, 2);
          if (st === 'quay') return e.quay ? cuoi('goi') : pick('goi', t0 / 0.3, 2);    // bị chém dồn: quẫy lưới
          if (truoc === 'lao' && t0 < 0.3) return cuoi('lao');
          if (e.flash > 0.03) return fr('dau', 1);   // vừa trúng đòn: giật người
          return loop('dung', 4);
        }
        // Cua Lon Khổng Lồ
        if (st === 'raise') return pick('dap', t0 / 0.5, (K.dap || []).length - 1);
        if (st === 'ket') return cuoi('dap');                                         // càng kẹt dưới cát
        if (st === 'kep') return e.kep ? cuoi('dap') : pick('dap', t0 / 0.32, 2);     // giơ càng rồi kẹp
        if (st === 'windup') return pick('lao', t0 / 0.65, 2);
        if (st === 'charge') return loop('lao', 12, 2);
        if (st === 'stun') return loop('choang', 4, 1);
        if (st === 'walk' && truoc === 'raise' && t0 < 0.35) return cuoi('dap');
        if (st === 'walk') return loop('di', 8);
        return null;
      };
      // thiếu khung của động tác nào thì đứng thở, không quay về ảnh gốc (khác khổ, nhân vật sẽ nhảy chỗ)
      return chon() || loop('dung', 3);
    },

    // Quái vừa bị hạ: nảy to, trắng lên rồi tan (mảnh vụn do World.deathFx bắn ra). Boss diễn khung gục ngã rồi mờ dần.
    drawCorpse(cp) {
      const c = this.ctx, k = cp.t / cp.dur;
      c.save();
      if (cp.e.kind === 'boss') {
        c.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        this.drawEnemy(cp.e, { chet: cp.t });
      } else {
        c.globalAlpha = 1 - k;
        this.drawEnemy(cp.e, { pop: k });
      }
      c.restore();
    },

    // Hạt hiệu ứng (World.fxp). add = false: vẽ trong lớp cảnh; add = true: cộng sáng sau lớp ánh sáng
    drawFx(list, add) {
      const c = this.ctx;
      if (add) c.globalCompositeOperation = 'lighter';
      list.forEach(p => {
        if (!!p.add !== add) return;
        const a = Math.max(0, p.life / p.max);
        c.globalAlpha = a;
        c.fillStyle = c.strokeStyle = p.color;
        switch (p.k) {
          case 'streak': {
            const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(42, sp * 0.035);
            c.lineWidth = p.r * (0.5 + a);
            c.lineCap = 'round';
            c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len); c.stroke();
            break;
          }
          case 'ring':
            c.lineWidth = p.w * a;
            c.beginPath(); c.arc(p.x, p.y, p.r + (p.r1 - p.r) * (1 - a * a), 0, 6.283); c.stroke();
            break;
          case 'glow':   // quầng vẽ sẵn, không tạo gradient mới mỗi hạt mỗi khung
            c.drawImage(this.glow(p.color), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
            break;
          case 'cut': {   // vệt chém trắng, thon hai đầu
            const L = p.r * (0.6 + 0.4 * (1 - a)), w = 5 * a;
            c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
            c.beginPath(); c.moveTo(-L, 0); c.quadraticCurveTo(0, -w, L, 0); c.quadraticCurveTo(0, w, -L, 0); c.fill();
            c.restore();
            break;
          }
          case 'chip':
            c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.r, -p.r * 0.55, p.r * 2, p.r * 1.1); c.restore();
            break;
          case 'smoke':
            c.globalAlpha = a * 0.35;
            c.beginPath(); c.arc(p.x, p.y, p.r * (1 + (1 - a) * 1.6), 0, 6.283); c.fill();
            break;
          case 'leaf':
            c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
            c.beginPath(); c.moveTo(0, -p.r); c.quadraticCurveTo(p.r * 0.9, 0, 0, p.r); c.quadraticCurveTo(-p.r * 0.9, 0, 0, -p.r); c.fill();
            c.restore();
            break;
          case 'emo': {   // emoji bay (cá thoát lưới, chai trôi, trang sách cổ); bob: nhấp nhô trên nước
            c.globalAlpha = Math.min(1, a * 2.5);
            c.save();
            c.translate(p.x, p.y + (p.bob ? Math.sin((p.max - p.life) * 3) * 4 : 0));
            c.rotate(p.rot);
            this.emoji(p.ch, 0, p.r * 0.35, p.r);
            c.restore();
            break;
          }
          default:
            c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
        }
      });
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    },

    // Trúng đòn: viền đỏ chớp. Còn 1 lá máu: viền đỏ đập theo nhịp tim
    drawHurt(W, t) {
      const S = HSX.S, c = this.ctx;
      let a = W.hurtT / 0.45 * 0.55;
      if (S.hp === 1 && W.mode === 'play') a = Math.max(a, 0.16 + 0.14 * Math.pow(Math.max(0, Math.sin(t * 5.5)), 4));
      if (a <= 0.01) return;
      // Gradient chỉ tạo một lần; độ đậm đổi bằng globalAlpha (trước đây tạo lại mỗi khung bị thương)
      if (!this.hurtGrad) {
        this.hurtGrad = c.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VW * 0.62);
        this.hurtGrad.addColorStop(0, 'rgba(160,0,20,0)');
        this.hurtGrad.addColorStop(1, 'rgba(170,10,30,1)');
      }
      c.save();
      c.globalAlpha = a;
      c.fillStyle = this.hurtGrad;
      c.fillRect(0, 0, VW, VH);
      c.restore();
    },

    // Năng lượng nhận được bay về quả cầu năng lượng (toạ độ màn hình)
    drawOrbs(W) {
      const c = this.ctx;
      if (!W.ui.length) return;
      c.globalCompositeOperation = 'lighter';
      W.ui.forEach(o => {
        if (o.t < 0) return;
        const g = c.createRadialGradient(o.x, o.y, 0, o.x, o.y, 10);
        g.addColorStop(0, 'rgba(210,255,225,0.95)');
        g.addColorStop(0.4, 'rgba(120,230,150,0.5)');
        g.addColorStop(1, 'rgba(60,180,100,0)');
        c.fillStyle = g;
        c.fillRect(o.x - 10, o.y - 10, 20, 20);
        c.strokeStyle = 'rgba(160,255,190,0.4)';
        c.lineWidth = 2;
        c.beginPath(); c.moveTo(o.x, o.y); c.lineTo(o.x - o.vx * 0.03, o.y - o.vy * 0.03); c.stroke();
      });
      c.globalCompositeOperation = 'source-over';
    },

    drawSpirits() {
      const c = this.ctx, t = performance.now() / 1000;
      HSX.Spirits.list.forEach(s => {
        const sp = D.spirits[s.id], img = A.get('heroes/' + s.id);
        c.save();
        c.globalAlpha = 0.55;
        c.drawImage(this.glow(`rgba(${sp.glow},1)`), s.x - 26, s.y - 26, 52, 52);
        c.restore();
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
      if (P.nam > 0) {
        // cảnh mở đầu: Mầm nằm giữa đống rác rồi ngồi dậy (xoay quanh gót chân)
        const dv = HSX.DO_VAT && HSX.DO_VAT.dong_rac && A.get('props/dong_rac_1');
        if (dv) c.drawImage(dv, x - 50, y + 6 - dv.height * 100 / dv.width, 100, dv.height * 100 / dv.width);
        c.save();
        c.translate(x, y - 10 * P.nam);
        c.rotate(-P.face * Math.PI / 2 * P.nam);
        c.translate(-x, -y);
        if (img) this.mamImg(img, x, y, P.face);
        else this.mam(x, y, P.face, this.pose(P, t));
        c.restore();
      } else if (img) this.mamImg(img, x, y, P.face, 'mam');
      else this.mam(x, y, P.face, this.pose(P, t));
      if (P.ngam) this.na(x, b.y + b.h / 2 - 6, P.banAng, 1, P.luc());
      else if (P.banT > 0) this.na(x, b.y + b.h / 2 - 6, P.banAng, P.banT / 0.25);
      c.globalAlpha = 1;
      if (P.troi > 0) this.luoiBay(x, b.y + b.h / 2, 30 + Math.sin(t * 20) * 1.5, t * 0.2);   // bị lưới trùm
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

    // Ná Tái Chế trên tay Mầm: cán ống nhựa xanh, chạc lon nhôm, dây bện. Đang ngắm (keo: lực 0-1) thì dây kéo căng về sau,
    // vừa bắn (k: 1 → 0) thì dây bật lại
    na(x, y, a, k, keo) {
      const c = this.ctx;
      c.save();
      c.globalAlpha *= Math.min(1, k * 2.5);
      c.translate(x + Math.cos(a) * 16, y + Math.sin(a) * 16);
      c.rotate(a);
      c.lineCap = 'round';
      c.strokeStyle = '#3f8fd0';
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.stroke();
      c.strokeStyle = '#c9ccd1';
      c.lineWidth = 3.5;
      c.beginPath(); c.moveTo(6, 0); c.lineTo(15, -9); c.moveTo(6, 0); c.lineTo(15, 9); c.stroke();
      const lui = keo !== undefined ? 8 + 14 * keo : 10 * Math.max(0, k - 0.6);   // kéo căng, hoặc còn rung về sau một chút
      c.strokeStyle = '#c9b98a';
      c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(15, -9); c.lineTo(15 - lui, 0); c.lineTo(15, 9); c.stroke();
      c.restore();
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

    // Vệt chém: cung trăng lưỡi liềm quét nhanh từ đầu tới cuối, lõi sáng, mép màu theo cấp Vợt, thêm vệt gió mảnh phía ngoài
    slash(P) {
      const c = this.ctx, b = P.b, k = 1 - P.atkT / P.C.ATK_T;
      if (k > 0.65) return;
      const a = 1 - k / 0.65, r = HSX.Calc.reach(), col = SLASH[HSX.S.owned.vot.tier] || SLASH[0];
      const quet = Math.min(1, k / 0.25), a0 = -1.05, a1 = a0 + 2.1 * quet;
      c.save();
      c.translate(P.cx(), b.y + b.h / 2 - 4);
      c.rotate(P.atkAng);
      const g = c.createRadialGradient(6, 0, 36 * r, 6, 0, 58 * r);
      g.addColorStop(0, `rgba(${col[1]},0)`);
      g.addColorStop(0.55, `rgba(${col[0]},${0.95 * a})`);
      g.addColorStop(1, `rgba(${col[1]},${0.55 * a})`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(10, 0, 56 * r, a0, a1);
      c.arc(2, 0, 38 * r, a1 - 0.1 * quet, a0 + 0.1 * quet, true);
      c.closePath();
      c.fill();
      c.lineCap = 'round';
      c.strokeStyle = `rgba(${col[1]},${0.85 * a})`;
      c.lineWidth = 2;
      c.beginPath(); c.arc(10, 0, 58 * r, a0 + 0.05, Math.max(a0 + 0.06, a1 - 0.05)); c.stroke();
      c.strokeStyle = `rgba(${col[0]},${0.4 * a})`;
      c.lineWidth = 1.2;
      c.beginPath(); c.arc(10, 0, 65 * r, a0 + 0.3, Math.max(a0 + 0.31, a1 - 0.25)); c.stroke();
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
        c.globalAlpha = q.a * (q.rim === 'soho' ? 0.75 + 0.25 * Math.sin(performance.now() / 70) : s);
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
        const col = l.glow || '255,238,205', a = (l.glow ? 0.45 : 0.12) * m.dark * (l.bloom || 1);
        c.globalAlpha = a;
        c.drawImage(this.bloom(col), x - r, y - r, r * 2, r * 2);
      });
      c.globalAlpha = 1;
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
      } else if (RUNG[area]) {   // rễ đước vòm và rễ thở nhô lên
        c.fill();
        c.strokeStyle = c.fillStyle;
        c.lineCap = 'round';
        for (let j = 0; j < 3; j++) {
          const w = 40 + hash(i, 44 + j) * 40, sx = x - 50 + j * 30;
          c.lineWidth = 5 + hash(i, 47 + j) * 4;
          c.beginPath(); c.moveTo(sx, base + 4); c.quadraticCurveTo(sx + w / 2, base - h * (0.8 + hash(i, 50 + j) * 0.5), sx + w, base + 4); c.stroke();
        }
        c.lineWidth = 3;
        c.beginPath();
        for (let j = 0; j < 5; j++) { const bx = x - 30 + j * 15 + hash(i, 55 + j) * 8; c.moveTo(bx, base + 2); c.lineTo(bx + 1, base - 10 - hash(i, 60 + j) * 14); }
        c.stroke();
        c.lineCap = 'butt';
        c.beginPath();
        c.ellipse(x, base, 70, 10, 0, Math.PI, 0);
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
      // Màu viền theo khu, độ đậm đổi theo độ tối: giữ gradient theo màu, đổi độ đậm bằng globalAlpha
      const c = this.ctx;
      this.vigGrad = this.vigGrad || {};
      let g = this.vigGrad[m.vig];
      if (!g) {
        g = c.createRadialGradient(VW / 2, VH / 2, VH * 0.38, VW / 2, VH / 2, VW * 0.64);
        g.addColorStop(0, `rgba(${m.vig},0)`);
        g.addColorStop(1, `rgba(${m.vig},1)`);
        this.vigGrad[m.vig] = g;
      }
      c.save();
      c.globalAlpha = 0.3 + 0.4 * m.dark;
      c.fillStyle = g;
      c.fillRect(0, 0, VW, VH);
      c.restore();
    },

    // ---------- Chữ trong thế giới ----------
    // khongTip: đang có bảng hướng dẫn thì chỉ hiện chữ tương tác, không hiện dòng gợi ý của phòng
    drawTipPrompt(W, khongTip) {
      const c = this.ctx, P = HSX.Player, touch = HSX.Input.usingTouch;
      if (W.tip && !khongTip) {
        const t = W.tip, text = touch ? t.t : HSX.phimChu(t.k), x = HSX.clamp(t.x * T + T / 2, W.cam.x + 200, W.cam.x + VW - 200);
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
        const p = W.prompt, key = HSX.phim('tuongTac');
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
      // năng lượng bay về tới quả cầu: lóe sáng
      if (W.orbPulse > 0) {
        const gr = rr + 6 + 14 * W.orbPulse, gg = c.createRadialGradient(ox, oy, rr * 0.6, ox, oy, gr);
        gg.addColorStop(0, `rgba(160,255,190,${0.5 * W.orbPulse})`);
        gg.addColorStop(1, 'rgba(160,255,190,0)');
        c.globalCompositeOperation = 'lighter';
        c.fillStyle = gg;
        c.fillRect(ox - gr, oy - gr, gr * 2, gr * 2);
        c.globalCompositeOperation = 'source-over';
      }
      // lá máu: mất lá thì lá vỡ rơi xuống, hồi lá thì lá nảy lên; còn 1 lá thì lá đập đỏ theo nhịp tim
      const max = Calc.maxHp(), now = performance.now(), dtR = Math.min(0.05, (now - (this.hudT || now)) / 1000);
      this.hudT = now;
      if (this.hpSeen === undefined) this.hpSeen = S.hp;
      for (let i = S.hp; i < this.hpSeen; i++) this.leafBreak(106 + i * 30, 42);
      for (let i = this.hpSeen; i < S.hp; i++) this.leafPop[i] = 1;
      this.hpSeen = S.hp;
      for (let i = 0; i < max; i++) {
        const pop = this.leafPop[i] || 0;
        this.leaf(106 + i * 30, 42, i < S.hp, 1 + 0.45 * Math.sin(pop * Math.PI), S.hp === 1 && i === 0 ? t : null);
        if (pop > 0) this.leafPop[i] = Math.max(0, pop - dtR * 3);
      }
      this.leafBits = this.leafBits.filter(p => {
        p.t += dtR;
        p.vy += 900 * dtR;
        p.x += p.vx * dtR;
        p.y += p.vy * dtR;
        p.rot += p.vr * dtR;
        c.save();
        c.globalAlpha = Math.max(0, 1 - p.t / 0.8);
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = '#7be08f';
        c.beginPath(); c.moveTo(0, -5); c.lineTo(4, 3); c.lineTo(-3, 4); c.closePath(); c.fill();
        c.restore();
        return p.t < 0.8;
      });
      if (Calc.charmOn('khien_lon')) {
        const x = 106 + max * 30 + 6, ready = HSX.Player.shieldT <= 0;
        c.globalAlpha = ready ? 1 : 0.35;
        this.emoji('🛡️', x, 50, 20);
        c.globalAlpha = 1;
      }
      // Ná Tái Chế: ô nhỏ dưới quả cầu năng lượng, vòng sáng chạy hết là bắn được
      if (S.owned.na_tai_che) {
        const P = HSX.Player, nx = ox, ny = oy + 47, k = Math.max(0, P.banCd) / P.C.BAN_CD;
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.beginPath(); c.arc(nx, ny, 12, 0, 6.283); c.fill();
        c.strokeStyle = k > 0 ? 'rgba(232,245,234,0.35)' : '#bfe6ff';
        c.lineWidth = 2.5;
        c.beginPath(); c.arc(nx, ny, 12, -Math.PI / 2, -Math.PI / 2 + 6.283 * (1 - k)); c.stroke();
        c.globalAlpha = k > 0 ? 0.45 : 1;
        this.emoji('🎯', nx, ny + 5, 13);
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
    leafBreak(x, y) {
      for (let k = 0; k < 6; k++) {
        this.leafBits.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -120 - Math.random() * 120, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16, t: 0 });
      }
    },
    leaf(x, y, full, scale, timDap) {
      const c = this.ctx, dap = timDap !== null && timDap !== undefined ? Math.pow(Math.max(0, Math.sin(timDap * 5.5)), 4) : 0;
      c.save();
      c.translate(x, y);
      c.rotate(-0.5);
      if (scale && scale !== 1) c.scale(scale, scale);
      if (dap) c.scale(1 + dap * 0.15, 1 + dap * 0.15);
      c.fillStyle = full ? (dap ? mix('#7be08f', '#ff6b6b', dap) : '#7be08f') : 'rgba(255,255,255,0.08)';
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
