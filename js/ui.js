/* Giao diện: menu tạm dừng, menu Trạm Tái Chế, hộp thoại, thông báo, nút cảm ứng */
(function () {
  const D = HSX.DATA, Calc = HSX.Calc, Sys = HSX.Sys, A = HSX.Assets, T = HSX.T;
  const fmt = HSX.fmt, esc = HSX.esc, pct = HSX.pct;
  const $ = id => document.getElementById(id);
  const KIND = { material: 'Nguyên liệu', consumable: 'Vật tư', charm: 'Bùa', tool: 'Công cụ', structure: 'Công trình', weapon: 'Vũ khí' };

  const icon = (cat, id, emoji, cls) => A.html(cat + '/' + id, emoji, cls);
  const itemIcon = (id, cls) => icon('items', id, D.items[id].emoji, cls);
  const spiritIcon = (id, cls) => icon('heroes', id, D.spirits[id].emoji, cls);

  function costChips(cost) {
    return Object.keys(cost).map(id => {
      const have = Sys.count(id), need = cost[id], rec = Sys.recipeFor(id), unknown = rec && !HSX.S.known[rec.id];
      const title = esc(D.items[id].name + (unknown ? ' (chưa biết cách làm: tìm trong Nhật ký hoặc Bàn thí nghiệm)' : ''));
      return `<span class="chip ${have >= need ? '' : 'short'}" title="${title}">${itemIcon(id, 'sm')}${unknown ? '❓' : ''} ${Math.min(have, need)}/${need}</span>`;
    }).join('');
  }

  function recipeRow(r) {
    const it = D.items[r.out], chk = Sys.canCraft(r);
    const act = Sys.isUnique(r.out) && HSX.S.owned[r.out]
      ? '<span class="have">✔ Đã có</span>'
      : `<button class="btn small" data-act="craft" data-arg="${r.id}" ${chk.ok ? '' : `disabled title="${esc(chk.reason)}"`}>Chế</button>`;
    return `<div class="row-item">${itemIcon(r.out)}<div class="grow"><b>${it.name}</b>${(r.qty || 1) > 1 ? ` ×${r.qty}` : ''} <span class="tag">${KIND[it.kind]}</span>
      <div class="small muted">${it.desc}</div><div class="cost">${costChips(r.cost)}</div></div>${act}</div>`;
  }

  // Bố trí các phòng trên bản đồ bằng cách khớp vị trí cửa nối giữa hai phòng
  function layoutRooms() {
    const L = HSX.LEVELS[HSX.S.level], pos = {}, q = [L.start];
    const doorBox = (def, d) => {
      let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      def.map.forEach((row, y) => [...row].forEach((c, x) => { if (c === String(d)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
      const w = def.map[0].length, h = def.map.length;
      return { x0, y0, side: x0 === 0 ? 'left' : x1 === w - 1 ? 'right' : y0 === 0 ? 'top' : 'bottom' };
    };
    pos[L.start] = { x: 0, y: 0 };
    while (q.length) {
      const id = q.shift(), def = L.rooms[id], p = pos[id];
      for (const d in def.doors) {
        const [to, td] = def.doors[d];
        if (pos[to]) continue;
        const a = doorBox(def, d), nd = L.rooms[to], b = doorBox(nd, td), w = def.map[0].length, h = def.map.length;
        const nw = nd.map[0].length, nh = nd.map.length;
        if (a.side === 'right') pos[to] = { x: p.x + w, y: p.y + a.y0 - b.y0 };
        else if (a.side === 'left') pos[to] = { x: p.x - nw, y: p.y + a.y0 - b.y0 };
        else if (a.side === 'top') pos[to] = { x: p.x + a.x0 - b.x0, y: p.y - nh };
        else pos[to] = { x: p.x + a.x0 - b.x0, y: p.y + h };
        q.push(to);
      }
    }
    return pos;
  }

  const UI = HSX.UI = {
    queue: [], view: null,
    sel: { exp: [], expMsg: '', book: 'phatminh', compost: true, quai: null },

    init() {
      $('modal-root').addEventListener('click', e => this.handle(e));
      addEventListener('keydown', e => {
        if (!this.blocking() || HSX.Puzzle.active) return;
        if (e.code === 'Escape' || (this.view && this.view.kind === 'pause' && (e.code === 'Tab' || e.code === 'KeyM'))) {
          e.preventDefault();
          this.closeModal();
        }
      });
      this.initTouch();
    },

    blocking() { return !!$('modal-root').innerHTML || HSX.Puzzle.active; },

    // ---------- Hộp thoại chung ----------
    // buttons: [chữ, hành động, nút chính?, tham số]
    modal(title, body, buttons, wide) {
      buttons = buttons || [['Đóng', 'close', true]];
      const html = `<div class="overlay"><div class="modal ${wide ? 'wide' : ''}"><div class="m-head"><b>${title}</b><button class="x" data-act="close" title="Đóng (Esc)">✕</button></div>
        <div class="m-body">${body}</div><div class="row end">${buttons.map(([l, a, p, g]) => `<button class="btn ${p ? 'primary' : ''}" data-act="${a}"${g ? ` data-arg="${g}"` : ''}>${l}</button>`).join('')}</div></div></div>`;
      if (this.blocking()) { this.queue.push(html); return; }
      this.view = { kind: 'modal' };
      $('modal-root').innerHTML = html;
    },
    openRaw(html) { $('modal-root').innerHTML = `<div class="overlay">${html}</div>`; },
    closeModal() {
      $('modal-root').innerHTML = '';
      this.view = null;
      HSX.Input.clear();
      const next = this.queue.shift();
      if (next) { this.view = { kind: 'modal' }; $('modal-root').innerHTML = next; }
    },
    toast(msg, cls, ms) {
      const box = $('toasts'), el = document.createElement('div');
      el.className = 'toast ' + (cls || '');
      el.innerHTML = msg;
      box.appendChild(el);
      while (box.children.length > 4) box.firstChild.remove();
      ms = ms || 3400;
      setTimeout(() => el.classList.add('out'), ms);
      setTimeout(() => el.remove(), ms + 500);
    },
    fact(text) { this.toast(`💡 <b>Bạn có biết?</b><br>${text}`, 'fact', 9000); },

    handle(e) {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const act = el.dataset.act, arg = el.dataset.arg, S = HSX.S, v = this.view;
      switch (act) {
        case 'close': this.closeModal(); return;
        case 'tab': v.tab = arg; break;
        case 'craft': Sys.craft(arg); break;
        case 'equip': Sys.equipCharm(arg); break;
        case 'unequip': Sys.unequipCharm(+arg); break;
        case 'upweapon': Sys.upgradeWeapon(); break;
        case 'exp-add': if (!this.sel.exp.includes(arg) && this.sel.exp.length < 3) this.sel.exp.push(arg); break;
        case 'exp-del': this.sel.exp = this.sel.exp.filter(x => x !== arg); break;
        case 'exp-try': this.sel.expMsg = Sys.experiment(this.sel.exp).msg; break;
        case 'book': this.sel.book = arg; break;
        case 'quai': this.sel.quai = arg; break;
        case 'cam': HSX.opt.camChuot = +arg; HSX.saveOpt(); break;
        case 'hd-bat': HSX.opt.huongDan = !HSX.opt.huongDan; HSX.saveOpt(); break;
        case 'hd-lai': HSX.HuongDan.lamLai(); this.closeModal(); this.toast('Hướng dẫn sẽ chạy lại từ bước đầu.'); return;
        case 'compost': this.sel.compost = !this.sel.compost; break;
        case 'tg': this.sel.tg = arg; break;
        case 'di': this.closeModal(); HSX.World.travel(arg); return;
        case 'tg-mo': this.closeModal(); this.openPause('thegioi'); return;
        case 'plant':
          if (Sys.plant(v.room, v.idx, arg, this.sel.compost)) { this.closeModal(); this.toast(`Đã trồng ${D.trees[arg].emoji} ${D.trees[arg].name}`); }
          return;
        case 'save': this.toast(HSX.saveGame() ? '💾 Đã lưu.' : 'Không lưu được: trình duyệt đang chặn bộ nhớ.'); return;
        case 'fullscreen': (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); return;
        case 'export': this.closeModal(); this.modal('Mã save', `<p class="small">Sao chép đoạn mã này để chuyển save sang máy khác.</p><textarea class="code" readonly onclick="this.select()">${HSX.exportSave()}</textarea>`); return;
        case 'import': this.closeModal(); this.modal('Nhập mã save', '<p class="small">Dán mã save vào đây. Tiến trình hiện tại sẽ bị thay thế.</p><textarea class="code" id="imp-code"></textarea>', [['Hủy', 'close'], ['Nhập', 'do-import', true]]); return;
        case 'do-import':
          try { HSX.S = HSX.importSave($('imp-code').value); HSX.saveGame(); location.reload(); }
          catch (err) { this.toast('Mã save không hợp lệ.'); }
          return;
        case 'reset': this.closeModal(); this.modal('Chơi lại từ đầu?', '<p>Xóa <b>toàn bộ</b> tiến trình. Không hoàn tác được.</p>', [['Hủy', 'close', true], ['Xóa và chơi lại', 'do-reset']]); return;
        case 'do-reset': HSX.S = HSX.newState(); HSX.saveGame(); location.reload(); return;
        case 'pz-bin': HSX.Puzzle.choose(arg); return;
        case 'pz-close': HSX.Puzzle.close(); return;
        case 'pz-retry': HSX.Puzzle.close(); HSX.Puzzle.open(); return;
        default: return;
      }
      void S;
      this.renderMenu();
    },

    // ---------- Menu nhiều tab ----------
    openPause(tab) { this.sel.tg = null; this.view = { kind: 'pause', tab: tab || 'tui' }; this.renderMenu(); HSX.emit('menu'); },
    openBench(gifts) { this.sel.tg = null; this.view = { kind: 'bench', tab: 'nghi', gifts: gifts || [] }; this.renderMenu(); },
    // dat: loại ô ('cat', 'bun', 'boi'), chỉ hiện cây trồng được ở loại ô đó
    openPlant(room, idx, dat) {
      this.view = { kind: 'plant', room, idx, dat: dat || 'cat' };
      this.renderMenu();
    },
    renderMenu() {
      const v = this.view;
      if (!v) return;
      let title, tabs, body;
      if (v.kind === 'pause') {
        title = '⏸ Tạm dừng';
        tabs = [['tui', '🎒 Túi đồ'], ['bando', '🗺️ Bản đồ'], ['thegioi', '🌏 Thế giới'], ['so', '📖 Sổ'], ['caidat', '⚙️ Cài đặt']];
        body = this['tab_' + v.tab]();
      } else if (v.kind === 'bench') {
        title = '♻️ Trạm Tái Chế';
        tabs = [['nghi', '🪑 Nghỉ'], ['bua', '🔮 Bùa'], ['xuong', '🛠️ Xưởng'], ['loc', '💧 Bàn lọc'], ['thinghiem', '🧪 Thí nghiệm'], ['lenduong', '🧭 Lên đường']];
        body = this['bench_' + v.tab]();
      } else {
        title = '🌱 Trồng cây';
        tabs = [];
        body = this.plantBody();
      }
      const scroll = $('modal-root').querySelector('.m-body');
      const top = scroll ? scroll.scrollTop : 0;
      $('modal-root').innerHTML = `<div class="overlay"><div class="modal menu">
        <div class="m-head"><b>${title}</b>${tabs.length ? `<nav class="mtabs">${tabs.map(([id, n]) => `<button class="${v.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}">${n}</button>`).join('')}</nav>` : ''}<button class="x" data-act="close" title="Đóng (Esc)">✕</button></div>
        <div class="m-body">${body}</div></div></div>`;
      const nb = $('modal-root').querySelector('.m-body');
      if (nb) nb.scrollTop = top;
      this.xemQuai();
    },

    // ---------- Túi đồ ----------
    tab_tui() {
      const S = HSX.S, tier = D.tiers[S.owned.vot.tier];
      const mats = Object.keys(D.items).filter(id => (D.items[id].kind === 'material' || D.items[id].kind === 'consumable') && Sys.count(id) > 0);
      const owned = kind => Object.keys(S.owned).filter(id => D.items[id] && D.items[id].kind === kind);
      let h = `<div class="cols"><div>
        <h3>Mầm</h3>
        <div class="row-item">${itemIcon('vot')}<div class="grow"><b>Vợt Bắt Rác</b> <span class="tier" style="--c:${tier.color}">${tier.name}</span><div class="small muted">Sát thương ${tier.dmg} mỗi đòn</div></div></div>
        <div class="row-item"><span class="ico emo">🍃</span><div class="grow"><b>Máu: ${S.hp}/${Calc.maxHp()} lá</b><div class="small muted">Mảnh Lá: ${S.shards % 4}/4 (đủ 4 mảnh thì thêm 1 lá)</div></div></div>
        <div class="row-item"><span class="ico emo">🌱</span><div class="grow"><b>${Math.floor(S.seeds)} hạt giống</b><div class="small muted">Dùng để trồng cây ở ô đất</div></div></div>
        <h3>Tinh linh</h3>`;
      h += D.spiritOrder.map(id => S.spirits[id]
        ? `<div class="row-item">${spiritIcon(id)}<div class="grow"><b>${D.spirits[id].name}</b><div class="small muted">${D.spirits[id].skill}</div></div></div>`
        : '<div class="row-item dim"><span class="ico emo">❔</span><div class="grow"><b>Chưa giải cứu</b><div class="small muted">Đang bị Sương Độc nhốt ở đâu đó</div></div></div>').join('');
      h += '</div><div><h3>Bùa đang đeo</h3>';
      h += S.charms.map(id => (id ? `<div class="row-item">${itemIcon(id)}<div class="grow"><b>${D.items[id].name}</b><div class="small muted">${D.items[id].desc}</div></div></div>` : '<div class="row-item dim"><span class="ico emo">◌</span><div class="grow small muted">Ô trống (đổi bùa ở Trạm Tái Chế)</div></div>')).join('');
      const tools = owned('tool').concat(owned('structure'));
      h += '<h3>Công cụ & công trình</h3>' + (tools.length ? tools.map(id => `<div class="row-item">${itemIcon(id)}<div class="grow"><b>${D.items[id].name}</b><div class="small muted">${D.items[id].desc}</div></div></div>`).join('') : '<p class="small muted">Chưa có. Chế ở Xưởng tại Trạm Tái Chế.</p>');
      h += '<h3>Nguyên liệu</h3>' + (mats.length ? `<div class="inv">${mats.map(id => `<div class="chip big" title="${esc(D.items[id].name + ': ' + D.items[id].desc)}">${itemIcon(id)}<b>${fmt(Sys.count(id))}</b></div>`).join('')}</div>` : '<p class="small muted">Chém đống rác và quái để nhặt nguyên liệu.</p>');
      return h + '</div></div>';
    },

    // ---------- Bản đồ ----------
    tab_bando() {
      const S = HSX.S, L = HSX.LEVELS[S.level], pos = layoutRooms(), here = HSX.World.room.id;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (const id in pos) {
        const d = L.rooms[id];
        minX = Math.min(minX, pos[id].x); minY = Math.min(minY, pos[id].y);
        maxX = Math.max(maxX, pos[id].x + d.map[0].length); maxY = Math.max(maxY, pos[id].y + d.map.length);
      }
      const k = Math.min(880 / (maxX - minX), 420 / (maxY - minY));
      let svg = '';
      for (const id in pos) {
        if (!S.visited[id]) continue;
        const d = L.rooms[id], x = (pos[id].x - minX) * k, y = (pos[id].y - minY) * k, w = d.map[0].length * k, h = d.map.length * k;
        const left = Calc.roomHeaps(id) - Object.keys(S.heaps[id] || {}).length;
        svg += `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" class="mroom ${id === here ? 'here' : ''} ${left ? '' : 'clean'}"/>
          <text x="${x + w / 2}" y="${y + h / 2}" class="mname">${esc(d.name)}</text>
          <text x="${x + w / 2}" y="${y + h / 2 + 15}" class="msub">${d.map.some(r => r.includes('B')) ? '♻️ ' : ''}${left ? '🗑️' + left : '✨'}${id === here ? ' · 📍' : ''}</text></g>`;
      }
      const seen = Object.keys(L.rooms).filter(id => S.visited[id]).length, total = Object.keys(L.rooms).length;
      return `<p class="small muted"><b>${esc(L.name)}</b> · Đã khám phá ${seen}/${total} khu vực · Độ sạch ${pct(Calc.cleanPct())} · ♻️ Trạm Tái Chế · 🗑️ số đống rác còn lại · ✨ đã sạch · 📍 bạn đang ở đây</p>
        <svg class="map" viewBox="-4 -4 ${(maxX - minX) * k + 8} ${(maxY - minY) * k + 8}">${svg}</svg>`;
    },

    // ---------- Bản đồ thế giới: 8 màn theo kịch bản ----------
    tab_thegioi() { return this.banDoTheGioi(false); },
    bench_lenduong() { return this.banDoTheGioi(true); },
    banDoTheGioi(diDuoc) {
      const S = HSX.S, ds = D.theGioi, img = A.get('bg/the_gioi');
      const tt = m => (!HSX.LEVELS[m.id] ? 'sap' : Calc.levelDone(m.id) ? 'xong' : S.mo[m.id] ? 'mo' : 'khoa');
      if (!ds.some(m => m.id === this.sel.tg)) this.sel.tg = S.level;
      const m = ds.find(x => x.id === this.sel.tg), so = ds.indexOf(m) + 1, st = tt(m);
      const H = 540 / 945 * 100;
      const duong = ds.map(x => `${x.x},${(x.y * H / 100).toFixed(2)}`).join(' ');
      const moc = ds.map((x, i) => `<button class="tg-moc ${tt(x)} ${x.id === m.id ? 'sel' : ''} ${x.id === S.level ? 'here' : ''}" style="left:${x.x}%;top:${x.y}%" data-act="tg" data-arg="${x.id}" title="${esc(x.ten)}">
          <span class="tg-o">${tt(x) === 'sap' || tt(x) === 'khoa' ? '🔒' : x.emo}</span><span class="tg-ten">${i + 1}. ${esc(x.ten)}</span></button>`).join('');
      let info = `<h3>${m.emo} Màn ${so}: ${esc(m.ten)}</h3><p class="small">Vấn đề: <b>${esc(m.van_de)}</b></p>`;
      if (st === 'sap') info += '<p class="small muted">🚧 Khu vực này sẽ có ở bản sau. Hồi sinh các khu trước để đi tiếp.</p>';
      else if (st === 'khoa') info += '<p class="small muted">🔒 Hạ boss của màn trước để mở đường tới đây.</p>';
      else {
        const rooms = HSX.LEVELS[m.id].rooms, tham = Object.keys(rooms).filter(id => S.visited[id]).length;
        info += `<p class="small">${st === 'xong' ? '✨ Đã hồi sinh' : '🌱 Đang hồi sinh'} · Độ sạch ${pct(Calc.cleanPct(m.id))} · Khu vực đã tới ${tham}/${Object.keys(rooms).length}</p>`;
        if (m.id === S.level) info += '<p class="small">📍 Bạn đang ở đây.</p>';
        else if (diDuoc) info += `<button class="btn primary" data-act="di" data-arg="${m.id}">Lên đường tới ${esc(m.ten)}</button>`;
        else info += '<p class="small muted">Ngồi nghỉ ở một Trạm Tái Chế để lên đường sang khu này.</p>';
      }
      return `<div class="tg" style="${img ? `background-image:url('${img.src}')` : ''}">
          ${img ? '' : '<div class="tg-nen"></div>'}
          <svg class="tg-duong" viewBox="0 0 100 ${H.toFixed(2)}" preserveAspectRatio="none"><polyline points="${duong}"/></svg>
          ${moc}</div>
        <div class="tg-info">${info}</div>`;
    },

    // ---------- Sổ ----------
    tab_so() {
      const S = HSX.S, sub = this.sel.book;
      const subs = [['phatminh', 'Phát Minh'], ['quai', 'Quái vật'], ['sachdo', 'Sách Đỏ'], ['nhatky', 'Nhật ký'], ['biet', 'Bạn có biết']];
      let h = `<div class="subtabs">${subs.map(([id, n]) => `<button class="${sub === id ? 'on' : ''}" data-act="book" data-arg="${id}">${n}</button>`).join('')}</div>`;
      if (sub === 'phatminh') {
        h += `<p class="small muted">Đã biết ${D.recipes.filter(r => S.known[r.id]).length}/${D.recipes.length} công thức. Công thức bí ẩn tìm qua Nhật ký hoặc Bàn thí nghiệm ở Trạm.</p><div class="list">`;
        D.recipes.forEach(r => {
          const it = D.items[r.out];
          h += S.known[r.id]
            ? `<div class="row-item">${itemIcon(r.out)}<div class="grow"><b>${it.name}</b> <span class="tag">${D.stations[r.station].name}</span><div class="cost">${Object.keys(r.cost).map(id => `<span class="chip">${itemIcon(id, 'sm')} ${r.cost[id]}</span>`).join('')}</div></div></div>`
            : `<div class="row-item dim"><span class="ico emo">❓</span><div class="grow"><b>Công thức bí ẩn</b><div class="small muted">${S.hints[r.id] ? '📜 Gợi ý: ' + r.hint : 'Chưa có manh mối.'}</div></div></div>`;
        });
        h += '</div>';
      } else if (sub === 'sachdo') {
        h += '<p class="small muted">Loài vật thật ở Việt Nam. Phục hồi nơi sống để chúng quay về.</p>';
        h += Object.keys(D.species).map(id => {
          const sp = D.species[id];
          if (S.seen[id]) return `<div class="row-item">${icon('species', id, sp.emoji)}<div class="grow"><b>${sp.name}</b><div class="small">${D.facts[sp.fact]}</div></div></div>`;
          return `<div class="row-item dim"><span class="ico emo">❔</span><div class="grow"><b>Chưa gặp</b>${Sys.speciesStatus(id).map(x => `<div class="small ${x.ok ? 'ok' : 'no'}">${x.ok ? '✔' : '✘'} ${x.text}</div>`).join('')}</div></div>`;
        }).join('');
      } else if (sub === 'quai') {
        h += this.soQuai();
      } else if (sub === 'nhatky') {
        // trang chưa tìm thấy: gợi ý màn có trang đó (theo phòng có journal = n)
        const oDau = n => { for (const lv in HSX.LEVELS) for (const id in HSX.LEVELS[lv].rooms) if (HSX.LEVELS[lv].rooms[id].journal === +n) return HSX.LEVELS[lv].goi; return 'đâu đó'; };
        h += Object.keys(D.journals).map(n => (S.journals[n]
          ? `<div class="journal"><b>📜 ${D.journals[n].title}</b><p>${D.journals[n].text}</p></div>`
          : `<div class="journal dim"><b>📜 Trang chưa tìm thấy</b><p class="small muted">Ở đâu đó trong ${oDau(n)}...</p></div>`)).join('');
      } else {
        const seen = Object.keys(D.facts).filter(k => S.facts[k]);
        h += `<p class="small muted">Đã mở ${seen.length}/${Object.keys(D.facts).length} thẻ kiến thức.</p>`;
        h += seen.map(k => `<div class="fact-box">💡 ${D.facts[k]}</div>`).join('') || '<p class="small muted">Chế đồ, trồng cây và giải đố để mở thẻ kiến thức.</p>';
      }
      return h;
    },

    // ---------- Sổ quái vật ----------
    // Gặp: hiện tên và bóng đen. Hạ lần đầu: hiện hình, mô tả, cách đánh. Hạ đủ số lần: mở thẻ kiến thức về loại rác đó.
    soQuai() {
      const S = HSX.S, ids = Object.keys(D.soQuai), q = id => S.quai[id] || {};
      if (!D.soQuai[this.sel.quai]) this.sel.quai = ids.find(id => q(id).seen) || ids[0];
      const sel = this.sel.quai;
      let h = `<p class="small muted">Đã gặp ${ids.filter(id => q(id).seen).length}/${ids.length} · đã ghi ${ids.filter(id => q(id).kills).length} · hoàn thành ${ids.filter(id => q(id).kills >= D.soQuai[id].can).length} trang. Hạ đủ số lần ghi trên mỗi trang để mở kiến thức về loại rác đó.</p>`;
      h += '<div class="so-quai"><div class="sq-luoi">';
      ids.forEach(id => {
        const d = D.soQuai[id], e = D.enemies[id] || D.bosses[id], img = D.bosses[id] ? D.bosses[id].img : id;
        h += `<button class="sq-the ${id === sel ? 'sel' : ''} ${q(id).seen ? '' : 'an'} ${q(id).kills ? '' : 'bong'} ${d.boss ? 'trum' : ''}" data-act="quai" data-arg="${id}">
          ${q(id).seen ? A.html('enemies/' + img, e.emoji) : '<span class="ico emo">❔</span>'}<b>${q(id).seen ? esc(e.name) : '???'}</b>
          ${q(id).kills >= d.can ? '<span class="sq-ok">✔</span>' : q(id).kills ? `<span class="sq-so">${q(id).kills}/${d.can}</span>` : ''}</button>`;
      });
      return h + `</div><div class="sq-trang">${this.trangQuai(sel)}</div></div>`;
    },
    trangQuai(id) {
      const q = HSX.S.quai[id] || {}, d = D.soQuai[id], e = D.enemies[id] || D.bosses[id];
      if (!q.seen) return '<div class="sq-trong muted">Chưa gặp loài quái này. Hãy đi khám phá thêm.</div>';
      let h = `<canvas id="sq-xem" width="640" height="400" data-quai="${id}"></canvas>
        <h3>${esc(e.name)} ${d.boss ? '<span class="tag">Boss</span>' : ''}</h3>
        <p class="small"><b>Làm từ:</b> ${d.rac} · <b>Đã hạ:</b> ${q.kills || 0}${d.can > 1 ? '/' + d.can : ''}</p>`;
      if (!q.kills) return h + '<p class="small muted">Hạ nó một lần để ghi lại hình dáng và cách đánh.</p>';
      h += `<p>${d.mo_ta}</p><p class="small"><b>Cách đánh:</b> ${d.cach}</p>`;
      return h + (q.kills >= d.can
        ? `<div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts[d.fact]}</div>`
        : `<p class="small muted">Hạ thêm ${d.can - q.kills} lần để mở kiến thức về ${d.rac.toLowerCase()}.</p>`);
    },
    // Hình động trong trang Sổ: quái thường nhún nhảy, boss diễn lần lượt từng động tác (khung Qwen nếu có)
    xemQuai() {
      const cv = $('sq-xem');
      if (!cv) return;
      const id = cv.dataset.quai, g = cv.getContext('2d'), q = HSX.S.quai[id] || {}, ma = (this.xemMa || 0) + 1;
      this.xemMa = ma;
      A.loadBoss(id);
      const TEN = { dung: 'Đứng', di: 'Đi', gam: 'Gầm', nem: 'Ném túi', nhay: 'Nhảy đập', lao: 'Lao tới', dau: 'Trúng đòn',
        dap: 'Đập càng', choang: 'Choáng', chet: 'Gục ngã', quang: 'Quăng lưới', goi: 'Gọi Lưới Ma' };
      const img0 = A.get('enemies/' + (D.bosses[id] ? D.bosses[id].img : id)), t0 = performance.now();
      const ve = () => {
        if (this.xemMa !== ma || !document.body.contains(cv)) return;
        const t = (performance.now() - t0) / 1000, W2 = cv.width, H2 = cv.height, chan = H2 - 40;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, W2, H2);
        const bg = g.createRadialGradient(W2 / 2, chan - 80, 20, W2 / 2, chan - 80, W2 * 0.6);
        bg.addColorStop(0, '#2a3a4a'); bg.addColorStop(1, '#0b1118');
        g.fillStyle = bg; g.fillRect(0, 0, W2, H2);
        g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, chan, W2, 2);
        if (!q.kills) g.filter = 'brightness(0)';   // chưa hạ: chỉ thấy bóng đen
        const K = (HSX.KHUNG_QUAI || {})[id], G = HSX.KHUNG_QUAI_CO;
        let nhan = '';
        if (K && G && q.kills) {
          const ds = Object.keys(K), dt = ds[Math.floor(t / 1.6) % ds.length], n = K[dt].length, i = Math.min(n - 1, Math.floor((t % 1.6) / 1.6 * n * 1.25));
          const fr = A.get(`enemies/${id}_${dt}_${i + 1}`), u = 230 / G.cao;
          if (fr) g.drawImage(fr, W2 / 2 + (K[dt][i][0] - G.w / 2) * u, chan + (K[dt][i][1] - G.chan) * u, fr.width * u, fr.height * u);
          nhan = TEN[dt] || dt;
        } else if (img0) {
          const s = 300, nh = Math.sin(t * 3), lao = Math.max(0, Math.sin(t * 1.3)) > 0.97 ? 1 : 0;
          g.save();
          g.translate(W2 / 2 - lao * 30, chan);
          g.scale(1 + nh * 0.03 + lao * 0.1, 1 - nh * 0.04 - lao * 0.08);
          g.drawImage(img0, -s / 2, -s + 8, s, s);
          g.restore();
        }
        g.filter = 'none';
        if (nhan) {
          g.font = 'bold 22px "Segoe UI",system-ui,sans-serif';
          g.textAlign = 'center';
          g.fillStyle = '#bfe6c8';
          g.fillText(nhan, W2 / 2, H2 - 12);
        }
        requestAnimationFrame(ve);
      };
      requestAnimationFrame(ve);
    },

    // ---------- Cài đặt ----------
    tab_caidat() {
      const S = HSX.S;
      return `<div class="cols"><div><h3>Điều khiển</h3>
        <table class="keys">
          <tr><td>Chạy</td><td>← → hoặc A D</td></tr>
          <tr><td>Nhảy (giữ lâu nhảy cao)</td><td>Space hoặc Z</td></tr>
          <tr><td>Chém (kèm ↑ ↓ để chém lên, chém xuống bật nảy)</td><td>X hoặc J</td></tr>
          <tr><td>Chém về phía con trỏ (trỏ lên / xuống / ngang)</td><td>Chuột trái</td></tr>
          <tr><td>Lướt</td><td>C, Shift hoặc K</td></tr>
          <tr><td>Hồi máu (giữ)</td><td>F hoặc L</td></tr>
          <tr><td>Kỹ năng tinh linh</td><td>V hoặc I</td></tr>
          <tr><td>Ngồi Trạm, đọc, trồng cây, nhặt</td><td>↑ hoặc E</td></tr>
          <tr><td>Xuống khỏi bục gỗ</td><td>↓ + Nhảy</td></tr>
          <tr><td>Túi đồ / Bản đồ / Tạm dừng</td><td>Tab / M / Esc</td></tr>
        </table>
        <p class="small muted">Tay cầm: A nhảy, X chém, RB lướt, B hồi, Y phép, Start tạm dừng. Điện thoại: dùng nút trên màn hình, xoay ngang máy.</p></div>
        <div><h3>Camera theo chuột</h3><p class="small muted">Rê chuột ra phía mép màn hình thì khung nhìn lia theo một phần.</p>
        <div class="row">${[[0, 'Tắt'], [0.18, 'Nhẹ'], [0.3, 'Vừa'], [0.45, 'Mạnh']].map(([v, n]) => `<button class="btn small ${HSX.opt.camChuot === v ? 'on' : ''}" data-act="cam" data-arg="${v}">${n}</button>`).join('')}</div>
        <h3>Hướng dẫn</h3><p class="small muted">Bảng nhỏ phía trên màn hình dạy từng thao tác, mẹo mới hiện khi gặp tình huống lần đầu.</p>
        <div class="row"><button class="btn small ${HSX.opt.huongDan ? 'on' : ''}" data-act="hd-bat">${HSX.opt.huongDan ? 'Đang bật' : 'Đang tắt'}</button><button class="btn small" data-act="hd-lai">Xem lại từ đầu</button></div>
        <h3>Thống kê</h3><p class="small">Thời gian chơi ${HSX.fmtTime(S.stats.time)} · Quái đã hạ ${fmt(S.stats.kills)} · Số lần ngã ${S.stats.deaths}</p>
        <h3>Lưu game</h3><p class="small muted">Game tự lưu khi ngồi Trạm, khi sang phòng mới và khi nhặt đồ quan trọng.</p>
        <div class="row"><button class="btn" data-act="save">Lưu ngay</button><button class="btn" data-act="fullscreen">Toàn màn hình</button></div>
        <div class="row"><button class="btn" data-act="export">Xuất mã save</button><button class="btn" data-act="import">Nhập mã save</button><button class="btn danger" data-act="reset">Chơi lại từ đầu</button></div>
        <h3>Hình ảnh</h3><p class="small muted">Đang dùng ${Object.keys(A.imgs).length} ảnh từ thư mục assets/. Thiếu ảnh nào thì game tự vẽ thay.</p></div></div>`;
    },

    // ---------- Trạm Tái Chế ----------
    bench_nghi() {
      const S = HSX.S, v = this.view, L = HSX.LEVELS[S.level];
      const loai = Object.keys(D.species).filter(id => HSX.roomLevel(D.species[id].room) === S.level);
      return `<div class="reward">🪑 Đã nghỉ ở Trạm: hồi đầy máu, đã lưu game. Quái quanh ${L.goi} cũng hồi sinh.${v.gifts.length ? `<br>Nhận thêm: ${v.gifts.join(' ')}` : ''}</div>
        <p class="small muted">Ngã xuống thì sẽ tỉnh dậy ở Trạm này. Chỉ đổi bùa được khi ngồi ở Trạm. Sang khu khác: thẻ 🧭 Lên đường.</p>
        <div class="cols"><div><h3>Tinh linh đi cùng</h3>${D.spiritOrder.filter(id => S.spirits[id]).map(id => `<div class="row-item">${spiritIcon(id)}<div class="grow"><b>${D.spirits[id].name}</b><div class="small muted">${D.spirits[id].skill}</div></div></div>`).join('') || '<p class="small muted">Chưa có tinh linh nào.</p>'}</div>
        <div><h3>${esc(L.name)}</h3><p class="small">Độ sạch ${pct(Calc.cleanPct())} · Khu vực đã tới ${Object.keys(L.rooms).filter(id => S.visited[id]).length}/${Object.keys(L.rooms).length}</p>
        ${loai.map(id => `<div class="small">${S.species[id] ? '✔' : '✘'} ${D.species[id].emoji} ${D.species[id].name}</div>`).join('')}</div></div>`;
    },
    bench_bua() {
      const S = HSX.S, all = Object.keys(S.owned).filter(id => D.items[id] && D.items[id].kind === 'charm');
      let h = '<p class="small muted">3 ô bùa. Bùa chế ở Xưởng, một số công thức là bí ẩn.</p><div class="list">';
      h += S.charms.map((id, k) => (id
        ? `<div class="row-item">${itemIcon(id)}<div class="grow"><b>${D.items[id].name}</b><div class="small">${D.items[id].desc}</div></div><button class="btn small" data-act="unequip" data-arg="${k}">Gỡ</button></div>`
        : '<div class="row-item dim"><span class="ico emo">◌</span><div class="grow small muted">Ô trống</div></div>')).join('');
      h += '</div><h3>Bùa có sẵn</h3>';
      const free = all.filter(id => !S.charms.includes(id));
      h += free.length ? free.map(id => `<div class="row-item">${itemIcon(id)}<div class="grow"><b>${D.items[id].name}</b><div class="small">${D.items[id].desc}</div></div><button class="btn small" data-act="equip" data-arg="${id}" ${S.charms.includes(null) ? '' : 'disabled'}>Đeo</button></div>`).join('') : '<p class="small muted">Không còn bùa nào khác.</p>';
      return h;
    },
    bench_xuong() {
      const S = HSX.S;
      const mats = Object.keys(D.items).filter(id => (D.items[id].kind === 'material' || D.items[id].kind === 'consumable') && Sys.count(id) > 0);
      let h = `<div class="inv">${mats.map(id => `<div class="chip big" title="${esc(D.items[id].name)}">${itemIcon(id)}<b>${fmt(Sys.count(id))}</b></div>`).join('') || '<span class="small muted">Chưa có nguyên liệu.</span>'}</div>`;
      for (const st in D.stations) {
        const list = D.recipes.filter(r => r.station === st && S.known[r.id]);
        if (!list.length) continue;
        h += `<h3>${D.stations[st].emoji} ${D.stations[st].name}</h3><div class="list">${list.map(recipeRow).join('')}</div>`;
      }
      return h;
    },
    bench_loc() {
      const S = HSX.S, tier = S.owned.vot.tier, c = Sys.weaponCost();
      let h = `<p class="small muted">Rửa sạch và tinh chế nguyên liệu để Vợt Bắt Rác mạnh hơn.</p>
        <div class="row-item">${itemIcon('vot')}<div class="grow"><b>Vợt Bắt Rác</b> <span class="tier" style="--c:${D.tiers[tier].color}">${D.tiers[tier].name}</span><div class="small">Sát thương hiện tại: ${D.tiers[tier].dmg}</div></div></div>`;
      if (!c) return h + '<p class="have">✔ Vợt đã ở bậc cao nhất.</p>';
      const next = D.tiers[tier + 1];
      return h + `<div class="row-item"><span class="ico emo">⬆️</span><div class="grow"><b>Lên bậc <span class="tier" style="--c:${next.color}">${next.name}</span></b><div class="small">Sát thương ${next.dmg}</div><div class="cost">${costChips(c)}</div></div>
        <button class="btn small" data-act="upweapon" ${Sys.canPay(c) ? '' : 'disabled'}>Nâng</button></div>`;
    },
    bench_thinghiem() {
      const S = HSX.S;
      this.sel.exp = this.sel.exp.filter(id => Sys.count(id) > 0);
      const sel = this.sel.exp, mats = Object.keys(D.items).filter(id => D.items[id].kind === 'material' && Sys.count(id) > 0);
      const hidden = D.recipes.filter(r => r.hidden), found = hidden.filter(r => S.known[r.id]).length;
      const slots = [0, 1, 2].map(k => (sel[k]
        ? `<button class="lab-slot full" data-act="exp-del" data-arg="${sel[k]}" title="Bỏ ra">${itemIcon(sel[k])}<small>${D.items[sel[k]].name}</small></button>`
        : '<div class="lab-slot">?</div>')).join('<span class="plus">+</span>');
      return `<p class="small muted">Ghép 2–3 nguyên liệu khác nhau, mỗi thứ tốn 1. Đúng công thức bí ẩn thì được ghi vào Sổ Phát Minh. Sai thì nhận lại khoảng một nửa. Công thức bí ẩn: ${found}/${hidden.length}.</p>
        <div class="lab-slots">${slots}<button class="btn primary" data-act="exp-try" ${sel.length >= 2 ? '' : 'disabled'}>Thử ghép</button></div>
        ${this.sel.expMsg ? `<div class="lab-msg">${this.sel.expMsg}</div>` : ''}
        <div class="inv">${mats.map(id => `<button class="chip big ${sel.includes(id) ? 'sel' : ''}" data-act="exp-add" data-arg="${id}" title="${esc(D.items[id].name)}">${itemIcon(id)}<b>${fmt(Sys.count(id))}</b></button>`).join('') || '<span class="small muted">Chưa có nguyên liệu.</span>'}</div>`;
    },

    plantBody() {
      const S = HSX.S, dat = this.view.dat || 'cat';
      const ds = Object.keys(D.trees).filter(id => D.trees[id].dat.includes(dat));
      return `<p class="small">Bạn có <b>${Math.floor(S.seeds)} 🌱</b> hạt giống. Cây lớn trong lúc bạn chơi, lớn rồi thì tỏa sáng.${dat === 'boi' ? ' Bãi bồi ngập bùn: chỉ cây đước sống được, rễ đước lớn lên sẽ bắc thành cầu.' : ''}</p>
        <button class="btn small ${this.sel.compost ? 'on' : ''}" data-act="compost">🍂 Bón compost (lớn nhanh gấp đôi): ${this.sel.compost ? 'Bật' : 'Tắt'} · còn ${Sys.count('compost')}</button>
        <div class="list">${ds.map(id => {
          const t = D.trees[id];
          return `<div class="row-item">${icon('trees', id, t.emoji)}<div class="grow"><b>${t.name}</b> <span class="tag">🌱 ${t.cost}</span><div class="small muted">${t.desc} Lớn sau ${HSX.fmtTime(t.grow)}.</div></div>
            <button class="btn small" data-act="plant" data-arg="${id}" ${S.seeds >= t.cost ? '' : 'disabled'}>Trồng</button></div>`;
        }).join('')}</div>`;
    },

    // ---------- Hộp thoại sự kiện ----------
    showJournal(n, first) {
      const j = D.journals[n];
      const teach = first && j.teach ? `<div class="reward">Học được công thức: ${j.teach.map(r => { const it = D.items[D.recipesById[r].out]; return `${it.emoji} <b>${it.name}</b>`; }).join(', ')}</div>` : '';
      const hint = first && j.hint ? '<div class="reward">Có gợi ý mới cho công thức bí ẩn. Xem Sổ → Phát Minh, rồi thử ở Bàn thí nghiệm tại Trạm.</div>' : '';
      this.modal(`📜 ${j.title}`, `<p class="journal-text">${j.text}</p>${teach}${hint}`);
    },
    showSpirit(id) {
      const sp = D.spirits[id];
      this.modal(`${sp.emoji} Giải cứu ${sp.name}!`, `<div class="big-emo">${spiritIcon(id, 'xl')}</div>
        <p class="center">${sp.name} thoát khỏi Sương Độc và sẽ bay theo bạn, tỏa sáng xung quanh.</p>
        <div class="reward"><b>Khả năng mới:</b> ${sp.skill}</div>`, [['Tiếp tục', 'close', true]]);
    },
    showSpecies(id) {
      const sp = D.species[id], buff = Object.keys(sp.buff).map(k => (k === 'dropBonus' ? `+${pct(sp.buff[k])} nguyên liệu rơi` : `+${pct(sp.buff[k])} hạt giống`)).join(', ');
      this.modal(`${sp.emoji} ${sp.name} đã quay về!`, `<div class="big-emo">${icon('species', id, sp.emoji, 'xl')}</div>
        <p class="center">Nơi sống đã đủ tốt. Thưởng: <b>${buff}</b>.</p><div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts[sp.fact]}</div>`, [['Tuyệt vời!', 'close', true]]);
    },
    // Bảng tổng kết khi hạ boss cuối màn, kèm đường sang màn sau
    showVictory(lv) {
      const S = HSX.S, loai = Object.keys(D.species).filter(id => HSX.roomLevel(D.species[id].room) === lv);
      const so = `<p class="small">Thời gian ${HSX.fmtTime(S.stats.time)} · Độ sạch ${pct(Calc.cleanPct(lv))} · Loài vật quay về ${loai.filter(id => S.species[id]).length}/${loai.length} · Mảnh Lá ${S.shards}</p>`;
      if (lv === 'm2') {
        this.modal('🌿 Rừng Ngập Mặn bắt đầu hồi sinh!', `<p>Lưới Ma Khổng Lồ đã buông ra. Cá, cua quay về, rễ đước lại vươn ra giữ đất.</p>${so}
          <div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts.rungchan}</div>
          <p class="small">Vẫn còn bãi bồi chờ cây đước, rặng bần chờ đom đóm. Đi tiếp lên thượng nguồn: <b>Màn 3: Sông Đen</b> sẽ có ở bản sau.</p>`,
        [['Xem bản đồ thế giới', 'tg-mo'], ['Tiếp tục khám phá', 'close', true]]);
        return;
      }
      this.modal('🌅 Bãi Biển Nhựa đã hồi sinh!', `<p>Vua Túi Nilon đã bị đánh bại, Sương Độc tan đi và bình minh trở lại.</p>${so}
        <div class="fact-box">💡 <b>Bạn có biết?</b> ${D.facts.nilon}</div>
        <p class="small">Đường tới <b>Màn 2: Rừng Ngập Mặn</b> đã mở. Đi ngay, hoặc ở lại dọn nốt rác rồi lên đường sau từ thẻ 🧭 Lên đường ở bất kỳ Trạm Tái Chế nào.</p>`,
      [['Ở lại khám phá', 'close'], ['Lên đường tới Rừng Ngập Mặn', 'di', true, 'm2']]);
    },
    showIntro(oldSave) {
      const touch = HSX.Input.usingTouch || matchMedia('(pointer: coarse)').matches;
      this.toast(`${touch ? '📱 Xoay ngang điện thoại. ' : ''}Bảng hướng dẫn phía trên sẽ dạy từng thao tác${touch ? ', nút cần bấm sẽ sáng lên' : ''}. Tắt hoặc xem lại trong Cài đặt.`, '', 6500);
      if (oldSave) this.toast('Game đã đổi từ lối chơi idle sang hành động, nên tiến trình bản cũ không chuyển sang được.', '', 6500);
    },

    // ---------- Nút cảm ứng ----------
    initTouch() {
      const box = $('touch');
      const show = () => { box.hidden = false; HSX.Input.usingTouch = true; };
      if (matchMedia('(pointer: coarse)').matches) show();
      addEventListener('pointerdown', e => { if (e.pointerType === 'touch') show(); }, true);
      const held = new Map();
      const set = (id, a) => {
        const old = held.get(id);
        if (old === a) return;
        if (old) HSX.Input.setTouch(old, false);
        if (a) { held.set(id, a); HSX.Input.setTouch(a, true); } else held.delete(id);
      };
      box.addEventListener('pointerdown', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        e.preventDefault();
        box.setPointerCapture && box.setPointerCapture(e.pointerId);
        if (b.dataset.a === 'menu') {
          if (HSX.Truyen.active()) HSX.Truyen.skip();   // đang diễn cảnh truyện: ☰ để bỏ qua
          else if (!this.blocking()) this.openPause('tui');
          return;
        }
        set(e.pointerId, b.dataset.a);
      });
      // Trượt ngón tay giữa các nút di chuyển mà không cần nhấc lên
      box.addEventListener('pointermove', e => {
        if (!held.has(e.pointerId)) return;
        const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest('#touch [data-a]');
        if (b && b.dataset.a !== 'menu') set(e.pointerId, b.dataset.a);
      });
      const up = e => set(e.pointerId, null);
      box.addEventListener('pointerup', up);
      box.addEventListener('pointercancel', up);
    },
  };
  void T;
})();
