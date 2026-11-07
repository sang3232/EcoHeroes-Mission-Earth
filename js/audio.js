/* Hệ thống âm thanh: tạo âm thanh bằng Web Audio API (không cần file, chạy từ file://) */
(function () {
  const Audio = HSX.Audio = {
    ctx: null,
    enabled: true,
    volume: 0.5,
    // Pool các oscillator cho âm thanh nhanh, tránh tạo mới liên tục
    pool: [],

    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Không khởi động được Web Audio:', e);
        this.enabled = false;
        return;
      }
      // Tự resume khi user tương tác (tránh policy autoplay)
      const resume = () => {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        document.removeEventListener('click', resume);
        document.removeEventListener('keydown', resume);
      };
      document.addEventListener('click', resume);
      document.addEventListener('keydown', resume);
    },

    // Tạo âm thanh cơ bản: oscillator + envelope
    tone(freq, dur, type, vol, when) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx, t = when || ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Envelope: attack -> decay -> sustain -> release
      const a = 0.01, d = 0.05, s = vol * 0.6, r = dur - a - d;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + a);
      gain.gain.linearRampToValueAtTime(s, t + a + d);
      gain.gain.linearRampToValueAtTime(0, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      return { osc, gain };
    },

    // Chord: phát nhiều nốt cùng lúc
    chord(freqs, dur, type, vol, when) {
      freqs.forEach(f => this.tone(f, dur, type, vol / freqs.length, when));
    },

    // Nhiễu trắng (tạo một lần rồi dùng lại) — nền cho tiếng gió
    _noise() {
      if (this._noiseBuf || !this.ctx) return this._noiseBuf;
      const ctx = this.ctx, rate = ctx.sampleRate || 44100;
      const buf = ctx.createBuffer(1, Math.floor(rate * 0.5), rate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
      return buf;
    },

    // Tiếng gió: nhiễu trắng qua bandpass quét tần số (f0 → f1)
    whoosh(dur, f0, f1, vol, q, when) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx, t = (when === undefined ? ctx.currentTime : when), buf = this._noise();
      if (!buf) return;
      const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      flt.type = 'bandpass';
      flt.Q.value = q || 1;
      flt.frequency.setValueAtTime(f0, t);
      flt.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + dur * 0.32);
      gain.gain.linearRampToValueAtTime(0.0001, t + dur);
      src.connect(flt);
      flt.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    },

    // Nhiễu trắng qua lowpass: tiếng "bụp" có lực mà không chói
    rumble(dur, cutoff, vol, when) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx, t = (when === undefined ? ctx.currentTime : when), buf = this._noise();
      if (!buf) return;
      const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), gain = ctx.createGain();
      src.buffer = buf;
      src.loop = true;
      flt.type = 'lowpass';
      flt.frequency.value = cutoff || 300;
      flt.Q.value = 0.8;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(flt);
      flt.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
      src.stop(t + dur + 0.02);
    },

    // Nốt trượt tần số (dây ná bật)
    sweep(f0, f1, dur, type, vol, when) {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx, t = (when === undefined ? ctx.currentTime : when);
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.008);
      gain.gain.linearRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },

    // ---- Các hiệu ứng âm thanh game ----
    // 1. Chém (slash): tiếng gió xé — hai lớp nhiễu quét ngược chiều
    slash() {
      this.whoosh(0.18, 2200, 420, 0.16, 1.2);
      this.whoosh(0.12, 3600, 1400, 0.06, 3.5);
    },

    // 27. Bắn ná (slingshot): dây bật + hạt xé gió
    shoot() {
      this.sweep(340, 105, 0.1, 'triangle', 0.16);
      this.whoosh(0.13, 2800, 900, 0.1, 2);
    },

    // 28. Hạt ná chạm đất: trầm, đục, đủ lực — không lẫn lớp nhiễu cao
    thud() {
      this.sweep(170, 55, 0.18, 'sine', 0.42);    // cú đục đi xuống
      this.tone(95, 0.22, 'triangle', 0.24);      // thân trầm, nghe rõ trên loa nhỏ
      this.rumble(0.12, 260, 0.2);                // "bụp" đất, lowpass nên không chói
    },

    // 2. Trúng đòn (hit enemy)
    hit() {
      this.tone(660, 0.06, 'square', 0.1);
      this.tone(1320, 0.04, 'sine', 0.06);
    },

    // 3. Hạ quái (kill enemy)
    kill() {
      this.chord([880, 1100, 1320], 0.2, 'sine', 0.12);
      this.tone(440, 0.3, 'triangle', 0.08);
    },

    // 4. Bị thương (player hurt)
    hurt() {
      this.tone(220, 0.15, 'sawtooth', 0.15);
      this.tone(110, 0.2, 'square', 0.1);
    },

    // 5. Nhảy (jump)
    jump() {
      this.tone(520, 0.06, 'sine', 0.08);
      this.tone(780, 0.04, 'sine', 0.05);
    },

    // 6. Đáp đất (land)
    land() {
      this.tone(180, 0.08, 'sine', 0.1);
    },

    // 7. Lướt né (dash): gió vụt qua — dài, loãng, khác tiếng chém
    dash() {
      this.whoosh(0.26, 700, 260, 0.14, 0.9);     // luồng gió chính, hạ dần
      this.whoosh(0.22, 1800, 700, 0.05, 2.2);    // lớp mảnh phía sau
    },

    // 8. Nhặt rác / tương tác (pickup/interact)
    pickup() {
      this.chord([660, 880, 1100], 0.12, 'sine', 0.1);
    },

    // 9. Mở lồng / giải cứu tinh linh (cage open)
    cageOpen() {
      this.chord([523, 659, 784, 1047], 0.4, 'sine', 0.12); // C major chord
      this.chord([1319, 1568, 1760], 0.3, 'sine', 0.08);
    },

    // 10. Nhận năng lượng (energy gain)
    energy() {
      this.chord([784, 988, 1175], 0.15, 'triangle', 0.08);
    },

    // 11. Năng lượng đầy / không thể nhận thêm
    energyFull() {
      this.tone(330, 0.1, 'square', 0.1);
    },

    // 12. Tường Kính Lúp va chạm (wall bump + hint)
    wallBump() {
      this.tone(150, 0.08, 'square', 0.12);
      this.tone(100, 0.12, 'sawtooth', 0.1);
    },

    // 13. Mở menu / nút bấm (UI click)
    click() {
      this.tone(1000, 0.03, 'sine', 0.05);
    },

    // 14. Thông báo / toast (notification)
    notify() {
      this.chord([660, 880], 0.1, 'sine', 0.06);
    },

    // 15. Phá đống rác (break heap)
    breakHeap() {
      this.tone(300, 0.08, 'sawtooth', 0.1);
      this.tone(200, 0.12, 'square', 0.08);
    },

    // 23. Đống rác bị chém/viết (cho heap/cage trong world.js)
    chop() {
      this.tone(220, 0.12, 'sawtooth', 0.06);
    },

    // 16. Trúng giáp boss (armor hit)
    armorHit() {
      this.tone(500, 0.05, 'square', 0.1);
      this.tone(400, 0.07, 'sawtooth', 0.08);
      this.tone(300, 0.1, 'sawtooth', 0.06);
    },

    // 24. Khiên chặn / vỡ khiên (shield block)
    shieldBreak() {
      this.tone(600, 0.1, 'square', 0.12);
      this.tone(800, 0.1, 'square', 0.12);
      this.tone(1000, 0.15, 'sawtooth', 0.1);
    },

    // 25. Bật lại / ricochet khi quái đỡ đòn (block)
    ricochet() {
      this.tone(500, 0.06, 'square', 0.06);
      this.tone(700, 0.05, 'square', 0.05);
      this.tone(900, 0.08, 'square', 0.06);
    },

    // 26. Đập xuống / Slam (Gấu Rừng): nhảy rồi đập đất để phá nền
    slam() {
      this.sweep(120, 38, 0.5, 'sine', 0.45);     // cú nện trầm, dài và nặng
      this.tone(70, 0.45, 'triangle', 0.3);       // thân sub nghe rõ trên loa nhỏ
      this.tone(120, 0.3, 'sawtooth', 0.12);
      this.tone(90, 0.4, 'square', 0.1);
      this.chord([60, 80, 100], 0.2, 'sawtooth', 0.08);
      this.rumble(0.3, 200, 0.28);                // đất bụi nặng, lowpass nên không chói
      this.whoosh(0.18, 700, 120, 0.1, 0.7);      // lớp gió khi chạm nền
    },

    // 17. Bán / nâng cấp / chế tạo (craft/upgrade)
    craft() {
      this.chord([523, 659, 784], 0.2, 'triangle', 0.1);
    },

    // 18. Level up / boss defeated
    victory() {
      this.chord([523, 659, 784, 1047], 0.5, 'sine', 0.12);
      setTimeout(() => this.chord([1319, 1568, 1760], 0.4, 'sine', 0.1), 200);
      setTimeout(() => this.chord([1976, 2349, 2637], 0.5, 'sine', 0.1), 500);
    },

    // 19. Tự động nhặt đồ rơi (auto pickup)
    autoPickup() {
      this.tone(880, 0.04, 'sine', 0.06);
      this.tone(1100, 0.03, 'sine', 0.04);
    },

    // 20. Trượt / sliding (cho lướt né xuyên tường)
    slide() {
      this.tone(600, 0.08, 'sine', 0.06);
      this.tone(900, 0.06, 'sine', 0.04);
    },

    // 21. Cửa mở / chuyển phòng
    doorOpen() {
      this.chord([440, 550, 660], 0.2, 'triangle', 0.08);
    },

    // 22. Kính Lúp - phát hiện tường (hint sound)
    kinhLupHint() {
      this.tone(400, 0.1, 'sine', 0.08);
      this.tone(600, 0.1, 'sine', 0.06);
      this.tone(800, 0.1, 'sine', 0.04);
    },

    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, v));
    },

    toggle() {
      this.enabled = !this.enabled;
      return this.enabled;
    }
  };
})();