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

/* Cổng Rừng (Màn 2): Bước 1 mở cống dẫn nước, Bước 2 xếp bần cho đom đóm về tổ */
(function () {
  const D = HSX.DATA;
  const BW = 5, BH = 4;
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // Bắc, Đông, Nam, Tây
  // Đường ống đúng: từ nguồn (0,1) uốn về cửa xả (4,2)
  const PATH = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 2], [3, 2], [3, 1], [3, 0], [4, 0], [4, 1], [4, 2]];
  const ARM = [
    'left:calc(50% - 5px);top:0;width:10px;height:50%',
    'top:calc(50% - 5px);right:0;height:10px;width:50%',
    'left:calc(50% - 5px);bottom:0;width:10px;height:50%',
    'top:calc(50% - 5px);left:0;height:10px;width:50%',
  ];
  // '.': bùn trồng được · '~': nước · 'T': tổ đom đóm · 'L': đèn điện (bật/tắt được)
  const MAP_B = ['..~T.', 'T.L~T', '.~...', '.TL..'];
  const K_B = 3;   // số cây bần con được trồng

  const dirBit = (a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
  };
  const rot = m => ((m << 1) | (m >> 3)) & 15;

  function baseA() {
    const cells = new Array(BW * BH).fill(null);
    for (let i = 0; i < PATH.length; i++) {
      const p = PATH[i];
      let m = 0;
      if (i > 0) m |= 1 << dirBit(p, PATH[i - 1]);
      if (i < PATH.length - 1) m |= 1 << dirBit(p, PATH[i + 1]);
      cells[p[1] * BW + p[0]] = { mask: m, base: m, fixed: i === 0 || i === PATH.length - 1 };
    }
    return cells;
  }

  const SRC = PATH[0][1] * BW + PATH[0][0];
  const OUT = PATH[PATH.length - 1][1] * BW + PATH[PATH.length - 1][0];

  function solvedA(cells) {
    const seen = new Set([SRC]), q = [SRC];
    while (q.length) {
      const i = q.shift(), m = cells[i].mask, x = i % BW, y = (i - x) / BW;
      for (let d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= BW || ny >= BH) continue;
        const j = ny * BW + nx, c = cells[j];
        if (!c || !(c.mask & (1 << ((d + 2) % 4))) || seen.has(j)) continue;
        seen.add(j); q.push(j);
      }
    }
    return seen.has(OUT);
  }

  // Xáo cống: mỗi mảnh xoay ngẫu nhiên; par = số lần xoay ít nhất để về đúng
  function scramble() {
    let best = null;
    for (let tryN = 0; tryN < 60; tryN++) {
      let par = 0;
      const cells = baseA().map(c => {
        if (!c || c.fixed) return c;
        const n = 1 + Math.floor(Math.random() * 3), mask = (c.base << n | c.base >> (4 - n)) & 15;
        par += (4 - n) % 4;
        return { mask, base: c.base, fixed: false };
      });
      if (solvedA(cells)) continue;
      best = { cells, par };
      break;
    }
    if (!best) {
      const cells = baseA().map(c => (c && !c.fixed ? { mask: rot(c.mask), base: c.base, fixed: false } : c));
      best = { cells, par: 10 };
    }
    return best;
  }

  function parseB() {
    const cells = [];
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const t = MAP_B[y][x];
      cells.push({ x, y, t, sapling: false, lampOn: t === 'L' });
    }
    return cells;
  }
  const cellAt = (cells, x, y) => (x >= 0 && y >= 0 && x < BW && y < BH ? cells[y * BW + x] : null);
  const near = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) <= 1;
  const covered = (cells, n) => cells.some(c => c.sapling && near(c, n));
  const blocked = (cells, n) => cells.some(c => c.t === 'L' && c.lampOn && near(c, n));
  const doneB = cells => cells.filter(c => c.t === 'T').every(n => covered(cells, n) && !blocked(cells, n));

  // Kiểm tra bàn đom đóm có lời giải với tối đa k cây (dùng cho kiem_tra/m2_puzzle.js)
  function solveB(map, k, lampsOn) {
    const cells = [], spots = [], nests = [];
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const t = map[y][x], c = { x, y, t, sapling: false, lampOn: t === 'L' ? !!lampsOn : false };
      cells.push(c);
      if (t === '.') spots.push(c);
      if (t === 'T') nests.push(c);
    }
    const pick = [];
    let found = null;
    const tryPick = () => {
      pick.forEach(s => { s.sapling = true; });
      const ok = nests.every(n => covered(cells, n) && !blocked(cells, n));
      pick.forEach(s => { s.sapling = false; });
      return ok;
    };
    const walk = start => {
      if (found) return;
      if (pick.length && tryPick()) { found = pick.slice(); return; }
      if (pick.length >= k) return;
      for (let i = start; i < spots.length; i++) {
        pick.push(spots[i]);
        walk(i + 1);
        pick.pop();
        if (found) return;
      }
    };
    walk(0);
    return found;
  }

  HSX.Puzzle2 = {
    active: false,
    phase: 'A',
    _baseA: baseA,
    _scramble: scramble,
    _solvedA: solvedA,
    _solveB: solveB,
    _doneB: doneB,
    _mapB: MAP_B,
    _k: K_B,

    open() {
      if (this.active) return;
      this.active = this.done = false;
      this.phase = 'A';
      this.moves = 0;
      const s = scramble();
      this.a = { cells: s.cells, par: s.par, w: BW, h: BH, src: SRC, out: OUT };
      this.b = parseB();
      this.render();
    },

    close() {
      this.active = false;
      HSX.UI.closeModal();
      HSX.Render.tilesDirty = true;
    },

    rotateA(i) {
      if (this.phase !== 'A') return;
      const c = this.a.cells[i];
      if (!c || c.fixed) return;
      c.mask = rot(c.mask);
      this.moves++;
      this.render();
    },

    toggleB(x, y) {
      if (this.phase !== 'B') return;
      const c = cellAt(this.b, x, y);
      if (!c || c.t !== 'L') return;
      c.lampOn = !c.lampOn;
      this.moves++;
      this.render();
    },

    placeB(x, y) {
      if (this.phase !== 'B') return;
      const c = cellAt(this.b, x, y);
      if (!c || c.t !== '.') return;
      if (!c.sapling && this.b.filter(o => o.sapling).length >= K_B) {
        HSX.UI.toast(`Chỉ có ${K_B} cây bần con — nhấc một cây lên trước đã.`);
        return;
      }
      c.sapling = !c.sapling;
      this.moves++;
      this.render();
    },

    next() {
      this.phase = 'B';
      this.render();
    },

    stars() {
      const par = (this.a.par || 0) + K_B + 1;
      if (this.moves <= par + 8) return 3;
      if (this.moves <= par + 16) return 2;
      return 1;
    },

    render() {
      if (this.phase === 'A') this.renderA(); else this.renderB();
    },

    renderA() {
      const a = this.a, ok = solvedA(a.cells);
      let g = '';
      for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) {
        const i = y * a.w + x, c = a.cells[i];
        if (!c) { g += '<div class="p2-cell empty"></div>'; continue; }
        let inner = '';
        for (let d = 0; d < 4; d++) if (c.mask & (1 << d)) inner += `<i class="p2-arm" style="${ARM[d]}"></i>`;
        if (i === a.src) inner += '<span class="p2-ico">💧</span>';
        else if (i === a.out) inner += '<span class="p2-ico">🌊</span>';
        else inner += '<span class="p2-dot"></span>';
        const cls = 'p2-cell flow' + (c.fixed ? ' locked' : '') + (ok ? ' done' : '');
        g += `<button class="${cls}" ${c.fixed ? 'disabled' : `data-act="p2-rotate" data-arg="${i}"`}>${inner}</button>`;
      }
      HSX.UI.openRaw(`<div class="modal puzzle">
        <div class="m-head"><b>🌊 Cổng Rừng</b><span class="muted small">Bước 1/2 · ${this.moves} lần xoay</span><button class="x" data-act="p2-close" title="Thoát">✕</button></div>
        <p class="muted small">Cống bị bít làm nước tù đọng, rừng chết dần. Xoay các đoạn cống để dẫn nước từ 💧 ra cửa xả 🌊.</p>
        <div class="p2-grid" style="grid-template-columns:repeat(${a.w},54px)">${g}</div>
        ${ok
          ? '<div class="pz-ok center">✔ Nước đã chảy! Đêm xuống, đom đóm bay về rặng bần.</div><div class="row end"><button class="btn primary" data-act="p2-next">Tiếp tục →</button></div>'
          : '<p class="muted small center">Bấm một đoạn cống để xoay 90°. Nối liền mạch từ nguồn tới cửa xả.</p>'}
      </div>`);
    },

    renderB() {
      const used = this.b.filter(c => c.sapling).length, ok = doneB(this.b);
      let g = '';
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
        const c = cellAt(this.b, x, y);
        let cls = 'p2-cell', inner = '', act = '';
        if (c.t === '~') { cls += ' nuoc'; inner = '<span class="p2-ico">〰️</span>'; }
        else if (c.t === 'T') {
          const lit = covered(this.b, c) && !blocked(this.b, c);
          cls += ' to' + (lit ? ' lit' : '');
          inner = `<span class="p2-ico">${lit ? '🌟' : '✨'}</span>`;
        } else if (c.t === 'L') {
          cls += ' den' + (c.lampOn ? ' on' : '');
          inner = `<span class="p2-ico">${c.lampOn ? '💡' : '🌑'}</span>`;
          act = `data-act="p2-toggle" data-arg="${x},${y}"`;
        } else {
          cls += ' bun';
          inner = c.sapling ? '<span class="p2-sapling">🌳</span>' : '<span class="p2-dot"></span>';
          act = `data-act="p2-place" data-arg="${x},${y}"`;
        }
        g += `<button class="${cls}" ${act}>${inner}</button>`;
      }
      HSX.UI.openRaw(`<div class="modal puzzle">
        <div class="m-head"><b>✨ Cổng Rừng</b><span class="muted small">Bước 2/2 · Bần ${used}/${K_B}</span><button class="x" data-act="p2-close" title="Thoát">✕</button></div>
        <p class="muted small">Trồng 🌳 bần để che tổ ✨ cho đom đóm. Đèn 💡 quá sáng thì đom đóm bỏ đi — bấm đèn để tắt. Rừng cần cả bóng tối.</p>
        <div class="p2-grid" style="grid-template-columns:repeat(${BW},54px)">${g}</div>
        <p class="muted small center">Mỗi cây bần che chính nó và 4 ô sát cạnh.</p>
        ${ok
          ? '<div class="pz-ok center">✔ Đom đóm đã về kín rặng bần!</div><div class="row end"><button class="btn primary" data-act="p2-finish">Hoàn tất</button></div>'
          : ''}
      </div>`);
    },

    finish() {
      if (this.done) return;
      this.done = true;
      const st = this.stars(), res = HSX.Sys.onPuzzle2Result(st);
      HSX.S.facts.domdom = true;
      HSX.S.facts.trieu = true;
      HSX.UI.openRaw(`<div class="modal puzzle">
        <div class="m-head"><b>🌿 Cổng Rừng đã mở</b><button class="x" data-act="p2-close">✕</button></div>
        <div class="pz-stars">${'★'.repeat(st)}<span>${'☆'.repeat(3 - st)}</span></div>
        <p class="center">${this.moves} lần xoay / đặt.</p>
        ${res.first ? '<div class="reward">🎉 Cống thông, nước chảy, đom đóm về. Đường tới <b>Hang Lưới Ma</b> đã mở! Nhận <b>+6 🌱 hạt giống</b>.</div>' : ''}
        <p class="muted small center">Đom đóm thụ phấn giúp cây trong rừng lớn nhanh hơn. Sao tốt nhất: ${HSX.S.flags.m2Best || 0}★.</p>
        <div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts.domdom}</div>
        <div class="row end"><button class="btn" data-act="p2-retry">Chơi lại</button><button class="btn primary" data-act="p2-close">Xong</button></div>
      </div>`);
    },
  };
})();
