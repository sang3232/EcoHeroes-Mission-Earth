/* Hội thoại và cảnh truyện: khung lời thoại có chân dung, lời dẫn giữa màn hình, thẻ tên màn, viền điện ảnh,
   bong bóng thoại trên đầu nhân vật. Nội dung các cảnh nằm ở js/cot_truyen.js (HSX.CANH, HSX.NGUOI).

   Một cảnh là danh sách bước, chạy lần lượt:
     { noi: 'sen', chu: '...' }       lời của một nhân vật (HSX.NGUOI), chờ người chơi bấm
     { ke: '...', den: true }         lời dẫn giữa màn hình (den: nền đen kịt, như mở đầu phim)
     { tieuDe: ['Màn 1', 'Tên màn'] } thẻ tên màn
     { cho: giây }                    chờ
     { lam: fn }                      chạy một việc (đi kèm noi / cho... thì chạy lúc bước bắt đầu)
     { toi: giây } / { sang: giây }   tối dần / sáng dần cả màn hình
     { nhin: {x, y} | fn | null }     camera nhìn về một điểm (toạ độ màn chơi); null: về lại Mầm
     { neu: fn, buoc: [...] }         chỉ chạy các bước con khi fn() đúng lúc tới bước này
   Bấm Chém / Nhảy / E / chuột / chạm màn hình để qua lời. Esc, Start, ☰ để bỏ qua cả cảnh
   (các việc "lam" còn lại vẫn được chạy để thế giới đúng như lúc xem hết). */
(function () {
  const VW = HSX.VW, VH = HSX.VH, I = HSX.Input, A = HSX.Assets;
  const FONT = '"Segoe UI",system-ui,-apple-system,Roboto,sans-serif';
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const TOC_DO = 40;      // chữ hiện ra mỗi giây
  const BAM = ['attack', 'jump', 'interact', 'tap'];

  const TR = HSX.Truyen = {
    canh: null, hang: [], den: 0, vien: 0, cam: null, tweens: [],

    active() { return !!this.canh; },

    // Chạy cảnh id (một lần cho mỗi save, trừ khi opt.lai). Trả về false nếu không có cảnh hoặc đã xem.
    // opt.sau: chạy khi cảnh xong hoặc bị bỏ qua.
    play(id, opt) {
      opt = opt || {};
      const f = HSX.CANH && HSX.CANH[id];
      if (!f || (HSX.S.story[id] && !opt.lai)) return false;
      return this.chay(id, f(), opt);
    },
    // Cảnh dựng tại chỗ (lời Mẹ Đước đổi theo tiến trình...). opt.khongLuu: không ghi là đã xem.
    chay(id, buoc, opt) {
      opt = opt || {};
      if (this.canh) { this.hang.push([id, buoc, opt]); return true; }
      this.canh = { id, buoc: buoc.slice(), i: -1, sau: opt.sau, luu: !opt.khongLuu, t: 0, cur: {}, hien: 0 };
      HSX.Player.healT = 0;
      this.next();
      return true;
    },

    next() {
      const c = this.canh;
      for (;;) {
        c.i++;
        if (c.i >= c.buoc.length) { this.end(); return; }
        const b = c.buoc[c.i];
        if (b.neu) { if (b.neu()) c.buoc.splice(c.i + 1, 0, ...b.buoc); continue; }
        if (b.den) this.den = 1;
        if (b.lam) b.lam();
        if (b.nhin !== undefined) this.cam = typeof b.nhin === 'function' ? b.nhin() : b.nhin;
        c.cur = b; c.t = 0; c.hien = 0;
        if (b.noi || b.ke || b.tieuDe || b.cho || b.toi || b.sang) return;
        if (!this.canh) return;   // lam đã bỏ qua / kết thúc cảnh
      }
    },

    // Bỏ qua: chạy nốt các việc còn lại, không diễn lời và thời gian chờ
    skip() {
      const c = this.canh;
      if (!c) return;
      for (let i = c.i + 1; i < c.buoc.length; i++) {
        const b = c.buoc[i];
        if (b.neu) { if (b.neu()) c.buoc.splice(i + 1, 0, ...b.buoc); continue; }
        if (b.lam && !b.dien) b.lam();   // dien: việc chỉ để diễn (hiệu ứng), bỏ qua thì thôi
      }
      this.den = 0;
      this.end();
    },

    end() {
      const c = this.canh;
      this.canh = null;
      this.tweens.forEach(t => { t.o[t.k] = t.to; });
      this.tweens = [];
      this.cam = null;
      HSX.Player.nam = 0;
      if (c.luu) { HSX.S.story[c.id] = true; HSX.saveGame(); }
      if (c.sau) c.sau();
      const nx = this.hang.shift();
      if (nx && !this.canh) this.chay(nx[0], nx[1], nx[2]);
    },

    // Đổi dần một số (vd Mầm nằm → đứng dậy)
    tween(o, k, to, dur) { this.tweens.push({ o, k, from: o[k], to, t: 0, dur }); },

    update(dt) {
      this.tweens = this.tweens.filter(tw => {
        tw.t += dt;
        const p = Math.min(1, tw.t / tw.dur), e = p * p * (3 - 2 * p);
        tw.o[tw.k] = tw.from + (tw.to - tw.from) * e;
        return p < 1;
      });
      const c = this.canh;
      if (!c) {
        this.vien = Math.max(0, this.vien - dt * 3);
        this.den = Math.max(0, this.den - dt * 2);
        return;
      }
      this.vien = Math.min(1, this.vien + dt * 3);
      if (I.pressed('menu')) { I.consume('menu'); this.skip(); return; }
      const bam = BAM.some(k => I.pressed(k));
      BAM.concat('mouseAtk').forEach(k => I.consume(k));
      const b = c.cur;
      c.t += dt;
      if (b.noi || b.ke) {
        const n = (b.chu || b.ke).length, het = c.hien >= n;
        c.hien = Math.min(n, c.hien + dt * TOC_DO);
        if (bam && c.t > 0.15) { if (!het) c.hien = n; else this.next(); }
      } else if (b.tieuDe) {
        if (c.t > 3.4 || (bam && c.t > 0.8)) this.next();
      } else if (b.toi) {
        this.den = Math.min(1, c.t / b.toi);
        if (c.t >= b.toi) this.next();
      } else if (b.sang) {
        this.den = Math.max(0, 1 - c.t / b.sang);
        if (c.t >= b.sang) this.next();
      } else if (c.t >= (b.cho || 0)) this.next();
    },

    // ---------- Vẽ (toạ độ màn hình) ----------
    draw(c, t) {
      if (this.den > 0) { c.fillStyle = `rgba(0,0,0,${this.den})`; c.fillRect(0, 0, VW, VH); }
      if (this.vien > 0) {
        const h = 46 * (1 - Math.pow(1 - this.vien, 3));
        c.fillStyle = '#000';
        c.fillRect(0, 0, VW, h);
        c.fillRect(0, VH - h, VW, h);
      }
      const cn = this.canh;
      if (!cn) return;
      const b = cn.cur;
      c.save();
      c.textBaseline = 'alphabetic';
      if (b.noi) this.drawLoi(c, t, b, cn);
      else if (b.ke) this.drawKe(c, t, b, cn);
      else if (b.tieuDe) this.drawTieuDe(c, b, cn);
      c.font = `12px ${FONT}`;
      c.textAlign = 'right';
      c.fillStyle = 'rgba(232,245,234,0.5)';
      c.fillText(I.usingTouch ? '☰ Bỏ qua' : I.device === 'pad' ? 'Start: bỏ qua' : 'Esc: bỏ qua', VW - 16, 29);
      c.restore();
    },

    // Khung lời thoại: chân dung bên trái, tên, chữ hiện dần, ▼ khi hiện hết
    drawLoi(c, t, b, cn) {
      const ng = (HSX.NGUOI || {})[b.noi] || { ten: b.noi, mau: '#e8f5ea' };
      const w = Math.min(780, VW - 120), h = 116, x = (VW - w) / 2;
      // khung nằm dưới; nếu sẽ che mất Mầm (đứng sát đáy màn hình) hoặc chỗ camera đang nhìn thì đưa lên trên
      const P = HSX.Player, cam = HSX.World.cam, duoi = VH - 46 - h - 12, pt = P.b.y - cam.y - 30, pd = P.b.y + P.b.h - cam.y;
      const cheMam = pd > duoi - 6 && pt < duoi + h && P.cx() - cam.x > x - 20 && P.cx() - cam.x < x + w + 20;
      const cheCam = this.cam && this.cam.y - cam.y > duoi - 60;
      const y = cheMam || cheCam ? 46 + 12 : duoi;
      const vao = Math.min(1, cn.t / 0.16);
      c.globalAlpha = vao;
      const g = c.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, 'rgba(10,20,16,0.93)');
      g.addColorStop(1, 'rgba(4,10,8,0.93)');
      c.fillStyle = g;
      c.strokeStyle = ng.mau;
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(x, y + (1 - vao) * 10, w, h, 12); c.fill();
      c.globalAlpha = vao * 0.55;
      c.stroke();
      c.globalAlpha = vao;
      const ps = h - 24, px = x + 12, py = y + 12;
      this.chanDung(c, ng, px, py, ps, t);
      const tx = px + ps + 18;
      c.font = `bold 16px ${FONT}`;
      c.textAlign = 'left';
      c.fillStyle = ng.mau;
      c.fillText(ng.ten, tx, y + 30);
      c.font = `16px ${FONT}, ${EMOJI}`;
      c.fillStyle = '#eef6ee';
      this.chuDan(c, b.chu, cn.hien, tx, y + 57, w - (tx - x) - 26, 23, 'left');
      if (cn.hien >= b.chu.length) this.muiTen(c, x + w - 24, y + h - 18 + Math.sin(t * 6) * 2, ng.mau);
      c.globalAlpha = 1;
    },

    // Lời dẫn: chữ nghiêng giữa màn hình, trên nền đen (den) hoặc dải tối mờ
    drawKe(c, t, b, cn) {
      c.font = `italic 20px ${FONT}`;
      const lines = this.wrap(c, b.ke, 660), y0 = VH / 2 - (lines.length - 1) * 16;
      if (!b.den) {
        const g = c.createLinearGradient(0, y0 - 70, 0, y0 + lines.length * 32 + 40);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.3, 'rgba(0,0,0,0.7)');
        g.addColorStop(0.7, 'rgba(0,0,0,0.7)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, y0 - 70, VW, lines.length * 32 + 110);
      }
      c.fillStyle = '#e4efe6';
      this.chuDan(c, b.ke, cn.hien, VW / 2, y0, 660, 32, 'center', lines);
      if (cn.hien >= b.ke.length) this.muiTen(c, VW / 2, y0 + lines.length * 32 + Math.sin(t * 6) * 2, '#bfe6c8');
    },

    drawTieuDe(c, b, cn) {
      const a = Math.max(0, Math.min(1, cn.t / 0.6, (3.4 - cn.t) / 0.7));
      c.globalAlpha = a;
      c.textAlign = 'center';
      const y = VH / 2 - 10;
      const g = c.createLinearGradient(0, y - 80, 0, y + 70);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.55)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, y - 80, VW, 150);
      c.font = `600 15px ${FONT}`;
      c.fillStyle = '#bfe6c8';
      c.fillText(b.tieuDe[0].toUpperCase().split('').join(' '), VW / 2, y - 26);
      c.font = `bold 42px ${FONT}`;
      c.fillStyle = '#f4f8f0';
      c.fillText(b.tieuDe[1], VW / 2, y + 22);
      const L = 120 + 60 * Math.min(1, cn.t / 0.8);
      c.strokeStyle = 'rgba(191,230,200,0.6)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(VW / 2 - L, y + 42); c.lineTo(VW / 2 + L, y + 42); c.stroke();
      c.fillStyle = '#9ff0b5';
      c.beginPath(); c.moveTo(VW / 2, y + 37); c.lineTo(VW / 2 + 5, y + 42); c.lineTo(VW / 2, y + 47); c.lineTo(VW / 2 - 5, y + 42); c.fill();
      c.globalAlpha = 1;
    },

    // Chữ hiện dần theo số ký tự đã hiện (hien), tự xuống dòng
    chuDan(c, chu, hien, x, y, maxW, lh, align, lines) {
      lines = lines || this.wrap(c, chu, maxW);
      c.textAlign = align;
      let n = Math.floor(hien);
      lines.forEach((ln, i) => {
        if (n <= 0) return;
        c.fillText(ln.slice(0, n), align === 'center' && n < ln.length ? x - (c.measureText(ln).width - c.measureText(ln.slice(0, n)).width) / 2 : x, y + i * lh);
        n -= ln.length + 1;
      });
    },
    wrap(c, s, maxW) {
      const out = [];
      let cur = '';
      s.split(' ').forEach(wd => {
        const thu = cur ? cur + ' ' + wd : wd;
        if (c.measureText(thu).width > maxW && cur) { out.push(cur); cur = wd; } else cur = thu;
      });
      if (cur) out.push(cur);
      return out;
    },
    muiTen(c, x, y, mau) {
      c.fillStyle = mau;
      c.beginPath(); c.moveTo(x - 6, y - 4); c.lineTo(x + 6, y - 4); c.lineTo(x, y + 3); c.closePath(); c.fill();
    },

    // Chân dung: phần đầu của ảnh nhân vật, đặt trong ô vuông bo góc có quầng màu của nhân vật
    chanDung(c, ng, x, y, s, t) {
      c.save();
      c.beginPath(); c.roundRect(x, y, s, s, 10); c.clip();
      const g = c.createRadialGradient(x + s / 2, y + s * 0.55, 4, x + s / 2, y + s * 0.55, s * 0.75);
      g.addColorStop(0, this.mauA(ng.mau, 0.45));
      g.addColorStop(1, 'rgba(8,14,12,0.95)');
      c.fillStyle = g;
      c.fillRect(x, y, s, s);
      const img = ng.anh && A.get(ng.anh), cat = img && this.vungMat(img, ng.cat);
      if (cat) {
        c.translate(x + s / 2, y);
        if (ng.lat) c.scale(-1, 1);
        c.translate(0, Math.sin(t * 2) * 1.2);
        c.drawImage(img, cat.x, cat.y, cat.s, cat.s, -s / 2, 0, s, s);
      } else {
        c.font = `${Math.round(s * 0.6)}px ${EMOJI}`;
        c.textAlign = 'center';
        c.fillStyle = '#000';
        c.fillText(ng.emo || '❔', x + s / 2, y + s * 0.74);
      }
      c.restore();
      c.strokeStyle = this.mauA(ng.mau, 0.7);
      c.lineWidth = 2;
      c.beginPath(); c.roundRect(x, y, s, s, 10); c.stroke();
    },
    // Vùng mặt của ảnh: cat = [x, y, cạnh] theo tỉ lệ ảnh, hoặc tự tìm: phần trên của hình (đo kênh trong suốt một lần)
    vungMat(img, cat) {
      if (img._mat) return img._mat;
      if (cat) return (img._mat = { x: cat[0] * img.width, y: cat[1] * img.height, s: cat[2] * img.width });
      let x0 = 0, y0 = 0, x1 = img.width, y1 = img.height;
      try {
        const k = 96 / Math.max(img.width, img.height), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data;
        let a = w, b = h, e = -1, f = -1;
        for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
          if (d[(yy * w + xx) * 4 + 3] < 60) continue;
          if (xx < a) a = xx; if (xx > e) e = xx; if (yy < b) b = yy; if (yy > f) f = yy;
        }
        if (e >= 0) { x0 = a / k; y0 = b / k; x1 = (e + 1) / k; y1 = (f + 1) / k; }
      } catch (err) { /* ảnh không đọc được điểm ảnh (mở file trực tiếp): dùng cả ảnh */ }
      const bw = x1 - x0, bh = y1 - y0, s = Math.min(bw * 0.95, bh * 0.6);
      return (img._mat = { x: (x0 + x1) / 2 - s / 2, y: y0 - s * 0.04, s });
    },
    mauA(hex, a) {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    },

    // Bong bóng thoại trên đầu một nhân vật (toạ độ màn chơi), không dừng game
    bong(c, x, y, chu, a) {
      c.save();
      c.globalAlpha = a;
      c.font = `bold 14px ${FONT}`;
      const lines = this.wrap(c, chu, 240), w = Math.max(...lines.map(l => c.measureText(l).width)) + 22, h = lines.length * 19 + 14;
      const cam = HSX.World.cam, bx = HSX.clamp(x - w / 2, cam.x + 10, cam.x + VW - w - 10), by = Math.max(cam.y + 54, y - h - 12);
      x = HSX.clamp(x, bx + 14, bx + w - 14);   // đuôi bong bóng vẫn chỉ về phía người nói
      c.fillStyle = 'rgba(16,10,26,0.88)';
      c.strokeStyle = 'rgba(210,170,255,0.75)';
      c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(bx, by, w, h, 9); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x - 7, by + h); c.lineTo(x, by + h + 10); c.lineTo(x + 7, by + h); c.closePath(); c.fill();
      c.fillStyle = '#f2e8ff';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      lines.forEach((l, i) => c.fillText(l, bx + w / 2, by + 16 + i * 19));
      c.restore();
    },
  };
})();
