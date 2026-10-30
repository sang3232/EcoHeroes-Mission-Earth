/* Puzzle Cổng Phân Loại: 2 vòng, phân rác vào đúng thùng trước khi hết giờ */
(function () {
  const D = HSX.DATA;
  const ROUNDS = [
    { bins: 'binsR1', n: 8, time: 7 },
    { bins: 'binsR2', n: 10, time: 5 },
  ];
  // Vòng 1 gộp nhựa, kim loại, giấy & thủy tinh vào nhóm "Tái chế được"
  const R1 = { nhua: 'taiche', kimloai: 'taiche', giaytt: 'taiche', huuco: 'huuco', khac: 'khac' };

  HSX.Puzzle = {
    active: false,

    open() {
      if (this.active) return;
      this.active = true;
      this.done = false;
      this.hint = !!HSX.S.owned.kinh_lup;
      this.rounds = ROUNDS.map(r => Object.assign({}, r, { items: HSX.shuffle(D.puzzle.items.slice()).slice(0, r.n) }));
      this.ri = 0;
      this.ii = 0;
      this.mistakes = 0;
      this.startItem();
      this.render();
      this.iv = setInterval(() => this.tick(), 100);
      this.onKey = e => {
        if (e.key === 'Escape') { this.close(); return; }
        const n = parseInt(e.key, 10), bins = this.bins();
        if (!this.done && n >= 1 && n <= bins.length) this.choose(bins[n - 1].id);
      };
      document.addEventListener('keydown', this.onKey);
    },

    close() {
      this.active = false;
      clearInterval(this.iv);
      document.removeEventListener('keydown', this.onKey);
      HSX.UI.closeModal();
      HSX.Render.tilesDirty = true;
    },

    bins() { return D.puzzle[this.rounds[this.ri].bins]; },
    item() { return this.rounds[this.ri].items[this.ii]; },
    answer(it) { return this.ri === 0 ? R1[it.cat] : it.cat; },

    startItem() {
      this.tMax = this.rounds[this.ri].time + (this.hint ? 2 : 0);
      this.tLeft = this.tMax;
      this.lock = false;
      this.feedback = '';
    },

    tick() {
      if (this.lock || this.done) return;
      this.tLeft -= 0.1;
      const bar = document.getElementById('pz-time');
      if (bar) bar.style.width = Math.max(0, (this.tLeft / this.tMax) * 100) + '%';
      if (this.tLeft <= 0) this.choose(null);
    },

    choose(bin) {
      if (this.lock || this.done) return;
      const it = this.item(), ans = this.answer(it), ok = bin === ans;
      this.lock = true;
      if (!ok) this.mistakes++;
      const right = this.bins().find(b => b.id === ans);
      this.feedback = ok
        ? '<div class="pz-ok">✔ Chính xác!</div>'
        : `<div class="pz-bad">${bin === null ? '⏱ Hết giờ!' : '✘ Chưa đúng.'} ${HSX.esc(it.name)} → <b>${right.emoji} ${right.name}</b><br><small>${HSX.esc(it.hint)}</small></div>`;
      this.render();
      setTimeout(() => this.next(), ok ? 450 : 1700);
    },

    next() {
      if (!this.active) return;
      this.ii++;
      if (this.ii >= this.rounds[this.ri].items.length) {
        this.ri++;
        this.ii = 0;
        if (this.ri >= this.rounds.length) { this.ri = this.rounds.length - 1; this.finish(); return; }
      }
      this.startItem();
      this.render();
    },

    stars() {
      const m = this.mistakes;
      return m <= 1 ? 3 : m <= 3 ? 2 : m <= 6 ? 1 : 0;
    },

    render() {
      const it = this.item(), bins = this.bins();
      const total = this.rounds.reduce((a, r) => a + r.items.length, 0);
      const done = this.rounds.slice(0, this.ri).reduce((a, r) => a + r.items.length, 0) + this.ii;
      HSX.UI.openRaw(`<div class="modal puzzle">
        <div class="m-head"><b>🧩 Cổng Phân Loại</b><span class="muted small">Vòng ${this.ri + 1}/2 · ${done}/${total} · Sai ${this.mistakes}</span><button class="x" data-act="pz-close" title="Thoát">✕</button></div>
        <p class="muted small">${this.ri === 0 ? 'Vòng 1: chia rác thành 3 nhóm như Luật Bảo vệ môi trường.' : 'Vòng 2: tách rác tái chế thành nhựa, kim loại, giấy & thủy tinh.'} Bấm thùng hoặc phím số 1–${bins.length}.</p>
        <div class="pz-card">
          <div class="pz-emo">${it.emoji}</div>
          <div class="pz-name">${HSX.esc(it.name)}</div>
          ${this.hint ? `<div class="pz-hint">🔍 ${HSX.esc(it.hint)}</div>` : ''}
          <div class="pz-timebar"><i id="pz-time" style="width:${(this.tLeft / this.tMax) * 100}%"></i></div>
        </div>
        <div class="pz-feedback">${this.feedback || '&nbsp;'}</div>
        <div class="pz-bins">${bins.map((b, k) => `<button class="pz-bin" style="--c:${b.color}" data-act="pz-bin" data-arg="${b.id}" ${this.lock ? 'disabled' : ''}><span class="k">${k + 1}</span><span class="e">${b.emoji}</span><span>${b.name}</span></button>`).join('')}</div>
        ${this.hint ? '' : '<p class="muted small">Mẹo: chế 🔍 Kính Lúp Phân Loại ở Xưởng để thấy nhãn rác và có thêm 2 giây mỗi món.</p>'}
      </div>`);
    },

    finish() {
      this.done = true;
      clearInterval(this.iv);
      const st = this.stars(), res = HSX.Sys.onPuzzleResult(st);
      HSX.S.facts.luat3nhom = true;
      HSX.UI.openRaw(`<div class="modal puzzle">
        <div class="m-head"><b>🧩 Kết quả</b><button class="x" data-act="pz-close">✕</button></div>
        <div class="pz-stars">${'★'.repeat(st)}<span>${'☆'.repeat(3 - st)}</span></div>
        <p class="center">Sai ${this.mistakes} lần.</p>
        ${st === 0 ? '<p class="center">Chưa qua cổng: được sai tối đa 6 lần. Thử lại nhé!</p>' : ''}
        ${res.first ? '<div class="reward">🎉 Cổng đã mở, đường tới Hang Vua Nilon đã thông! Nhận <b>🗑️ Dàn Tách Rác</b>. Lồng của tinh linh <b>♻️ Tái Chế</b> cũng đã mở khóa.</div>' : ''}
        ${st > 0 ? `<p class="muted small center">Sao tốt nhất: ${HSX.S.puzzle.best}★. Mỗi sao +5% sát thương cả đội.</p>` : ''}
        <div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts.luat3nhom}</div>
        <div class="row end"><button class="btn" data-act="pz-retry">Chơi lại</button><button class="btn primary" data-act="pz-close">Xong</button></div>
      </div>`);
    },
  };
})();
