/* Luật chơi ngoài trận đánh: chỉ số, chế tạo, bùa, nâng Vợt, thí nghiệm, nhật ký, cây, sinh vật */
(function () {
  const D = HSX.DATA;
  const UNIQUE = { weapon: 1, charm: 1, tool: 1, structure: 1 };
  const SORT_POOL = ['chai_pet', 'tui_nilon', 'lon_nhom', 'luoi_cu', 'vo_so', 'rong_bien'];

  function symDiff(a, b) {
    const A = new Set(a), B = new Set(b);
    let n = 0;
    A.forEach(v => { if (!B.has(v)) n++; });
    B.forEach(v => { if (!A.has(v)) n++; });
    return n;
  }
  function levelRooms(lv) { return HSX.LEVELS[lv || HSX.S.level].rooms; }

  const heapCount = {};   // số đống rác của từng màn (đếm một lần)
  let pollT = 0, pollRoom = '';   // nhịp đom đóm thụ phấn (giây) và phòng đang tính
  const Calc = HSX.Calc = {
    charmFx(key) {
      let sum = 0;
      HSX.S.charms.forEach(id => { const fx = id && D.items[id].fx; if (fx && fx[key]) sum += fx[key]; });
      return sum;
    },
    charmOn(id) { return HSX.S.charms.includes(id); },
    speciesFx(key) {
      let sum = 0;
      for (const id in HSX.S.species) sum += D.species[id].buff[key] || 0;
      return sum;
    },
    weaponDmg() { return D.tiers[HSX.S.owned.vot.tier].dmg; },
    maxHp() { return Math.min(9, 5 + Math.floor(HSX.S.shards / 4)); },
    runSpeed() { return 320 * (1 + this.charmFx('speed')); },
    reach() { return 1 + this.charmFx('reach'); },
    magnet() { return 70 + (HSX.S.spirits.taiche ? 150 : 0) + this.charmFx('magnet'); },
    dropMult() { return 1 + (HSX.S.spirits.taiche ? 0.2 : 0) + this.speciesFx('dropBonus'); },
    seedMult() { return 1 + this.charmFx('seedBonus') + this.speciesFx('seedBonus'); },
    spiritCount() { return Object.keys(HSX.S.spirits).length; },
    // Độ sạch tính riêng từng màn (mặc định màn đang chơi)
    heapTotal(lv) {
      lv = lv || HSX.S.level;
      if (heapCount[lv] === undefined) {
        let n = 0;
        const rooms = levelRooms(lv);
        for (const id in rooms) rooms[id].map.forEach(row => { for (const c of row) if (c === 'T') n++; });
        heapCount[lv] = n;
      }
      return heapCount[lv];
    },
    heapsBroken(lv) {
      const rooms = levelRooms(lv);
      let n = 0;
      for (const id in HSX.S.heaps) if (rooms[id]) n += Object.keys(HSX.S.heaps[id]).length;
      return n;
    },
    cleanPct(lv) { return Math.min(1, this.heapsBroken(lv) / Math.max(1, this.heapTotal(lv))); },
    roomHeaps(id) { let n = 0; HSX.roomDef(id).map.forEach(row => { for (const c of row) if (c === 'T') n++; }); return n; },
    roomClean(id) { return Object.keys(HSX.S.heaps[id] || {}).length >= this.roomHeaps(id); },
    // Màn đã hạ boss cuối: trời sáng hẳn (Màn 1: bình minh)
    levelDone(lv) { lv = lv || HSX.S.level; return lv === 'm1' ? !!HSX.S.dawn : !!HSX.S.xong[lv]; },
  };

  HSX.Sys = {
    // ---------- Túi đồ ----------
    count(id) { return Math.floor(HSX.S.inv[id] || 0); },
    addItem(id, n) { HSX.S.inv[id] = (HSX.S.inv[id] || 0) + n; },
    canPay(cost) { for (const k in cost) if (this.count(k) < cost[k]) return false; return true; },
    pay(cost) { for (const k in cost) HSX.S.inv[k] -= cost[k]; },
    isUnique(id) { return !!UNIQUE[D.items[id].kind]; },
    grant(id, n) {
      if (this.isUnique(id)) { if (!HSX.S.owned[id]) HSX.S.owned[id] = { tier: 0 }; HSX.emit('co', id); }
      else this.addItem(id, n);
    },
    totalMaterials() { let n = 0; for (const id in HSX.S.inv) n += Math.floor(HSX.S.inv[id]); return n; },
    fact(key) {
      const s = HSX.S;
      if (!key || s.facts[key]) return;
      s.facts[key] = true;
      HSX.UI.fact(D.facts[key]);
    },

    // ---------- Sổ quái vật ----------
    quai(type) { return (HSX.S.quai[type] = HSX.S.quai[type] || { seen: false, kills: 0 }); },
    quaiName(type) { return (D.enemies[type] || D.bosses[type]).name; },
    quaiSeen(type) {
      const q = this.quai(type);
      if (q.seen || !D.soQuai[type]) return;
      q.seen = true;
      HSX.UI.toast(`📖 Sổ quái vật: lần đầu gặp <b>${this.quaiName(type)}</b>`);
    },
    // Hạ lần đầu: mở hình và cách đánh. Hạ đủ số lần: mở kiến thức về loại rác đó.
    quaiKill(type) {
      const q = this.quai(type), d = D.soQuai[type];
      if (!d) return;
      q.seen = true;
      q.kills++;
      if (q.kills === 1) HSX.UI.toast(`📖 Đã ghi <b>${this.quaiName(type)}</b> vào Sổ quái vật${d.can > 1 ? ` · 1/${d.can}` : ''}`);
      if (q.kills === d.can) {
        if (d.can > 1) HSX.UI.toast(`📖 Hoàn thành trang <b>${this.quaiName(type)}</b> trong Sổ quái vật`);
        this.fact(d.fact);
      }
    },

    // ---------- Chế tạo (tức thì, chỉ khi ngồi ở Trạm) ----------
    recipeFor(itemId) { return D.recipes.find(r => r.out === itemId); },
    canCraft(r) {
      const s = HSX.S;
      if (!s.known[r.id]) return { ok: false, reason: 'Chưa biết công thức' };
      if (this.isUnique(r.out) && s.owned[r.out]) return { ok: false, reason: 'Đã có' };
      if (!this.canPay(r.cost)) return { ok: false, reason: 'Thiếu nguyên liệu' };
      return { ok: true };
    },
    craft(rid) {
      const r = D.recipesById[rid], chk = this.canCraft(r), it = D.items[r.out];
      if (!chk.ok) { HSX.UI.toast(chk.reason); return; }
      this.pay(r.cost);
      this.grant(r.out, r.qty || 1);
      HSX.UI.toast(`Chế xong: ${it.emoji} ${it.name}${(r.qty || 1) > 1 ? ' ×' + r.qty : ''}`);
      if (r.out === 'kinh_lup') HSX.Render.tilesDirty = true;
      this.fact(it.fact);
      this.checkSpecies();
      HSX.saveGame();
    },

    // ---------- Bùa ----------
    equipCharm(id) {
      const s = HSX.S;
      if (!s.owned[id] || D.items[id].kind !== 'charm' || s.charms.includes(id)) return;
      const k = s.charms.indexOf(null);
      if (k < 0) { HSX.UI.toast('Hết ô bùa. Gỡ bớt một bùa trước.'); return; }
      s.charms[k] = id;
    },
    unequipCharm(k) { HSX.S.charms[k] = null; },

    // ---------- Vợt ----------
    weaponCost() { return D.weaponCost[HSX.S.owned.vot.tier + 1] || null; },
    upgradeWeapon() {
      const c = this.weaponCost();
      if (!c) return;
      if (!this.canPay(c)) { HSX.UI.toast('Chưa đủ nguyên liệu'); return; }
      this.pay(c);
      HSX.S.owned.vot.tier++;
      HSX.UI.toast(`🥅 Vợt Bắt Rác lên bậc ${D.tiers[HSX.S.owned.vot.tier].name}! Sát thương ${Calc.weaponDmg()}`);
      HSX.saveGame();
    },

    // ---------- Bàn thí nghiệm ----------
    experiment(sel) {
      const s = HSX.S;
      if (sel.length < 2) return { type: 'invalid', msg: 'Chọn ít nhất 2 nguyên liệu.' };
      if (sel.some(id => this.count(id) < 1)) return { type: 'invalid', msg: 'Thiếu nguyên liệu.' };
      const key = sel.slice().sort().join('+');
      const match = D.recipes.find(r => Object.keys(r.cost).sort().join('+') === key);
      if (match && s.known[match.id]) {
        const it = D.items[match.out];
        return { type: 'known', msg: `Bạn đã biết công thức này: ${it.emoji} ${it.name}. Không tốn nguyên liệu.` };
      }
      sel.forEach(id => { s.inv[id] -= 1; });
      if (match) {
        s.known[match.id] = true;
        const it = D.items[match.out];
        HSX.saveGame();
        return { type: 'found', msg: `🎉 Phát minh mới: ${it.emoji} <b>${it.name}</b>! Đã ghi vào Sổ Phát Minh, chế được ở Xưởng.` };
      }
      const near = D.recipes.some(r => r.hidden && !s.known[r.id] && symDiff(Object.keys(r.cost), sel) === 1);
      let back = 0;
      sel.forEach(id => { if (Math.random() < 0.5) { this.addItem(id, 1); back++; } });
      return {
        type: 'fail',
        msg: `${near ? '🤏 Gần đúng rồi! Hình như thừa hoặc thiếu đúng một thứ.' : '💨 Chỉ ra phế liệu hỗn hợp.'} Nhận lại ${back}/${sel.length} nguyên liệu.`,
      };
    },

    // ---------- Nhật ký ----------
    readJournal(n) {
      const s = HSX.S, j = D.journals[n], first = !s.journals[n];
      s.journals[n] = true;
      (j.teach || []).forEach(rid => { s.known[rid] = true; });
      (j.hint || []).forEach(rid => { s.hints[rid] = true; });
      HSX.UI.showJournal(n, first);
      if (first) HSX.saveGame();
    },

    // ---------- Trạm Tái Chế ----------
    rest(roomId, x, y) {
      const s = HSX.S;
      s.bench = { room: roomId, x, y };
      s.benches[HSX.roomLevel(roomId)] = s.bench;
      s.hp = Calc.maxHp();
      s.dead = {};
      const gifts = [];
      if (s.owned.dan_tach_rac) for (let k = 0; k < 3; k++) { const id = HSX.pick(SORT_POOL); this.addItem(id, 1); gifts.push(D.items[id].emoji); }
      const dua = this.matureCount('dua');
      if (dua) { s.seeds += dua * 2; gifts.push(`${dua * 2} 🌱`); }
      HSX.saveGame();
      return gifts;
    },

    // ---------- Cây ----------
    plant(roomId, idx, type, useCompost) {
      const s = HSX.S, T = D.trees[type];
      if (s.seeds < T.cost) { HSX.UI.toast(`Cần ${T.cost} 🌱 hạt giống`); return false; }
      s.seeds -= T.cost;
      const c = !!(useCompost && this.count('compost') > 0);
      if (c) s.inv.compost -= 1;
      (s.trees[roomId] = s.trees[roomId] || {})[idx] = { type, g: 0, c };
      this.fact(T.fact);
      HSX.emit('trong', { room: roomId, idx, type });
      HSX.saveGame();
      return true;
    },
    // Đào cây đã trồng lên (cần xẻng): trả lại hạt giống đã tốn. Cây làm cầu rễ do World chặn.
    digUp(roomId, idx) {
      const s = HSX.S, t = (s.trees[roomId] || {})[idx];
      if (!t) return 0;
      const cost = (D.trees[t.type] && D.trees[t.type].cost) || 0;
      delete s.trees[roomId][idx];
      s.seeds += cost;
      HSX.emit('dao', { room: roomId, idx, type: t.type });
      HSX.saveGame();
      return cost;
    },
    tickTrees(dt) {
      const s = HSX.S;
      // Đom đóm thụ phấn: mọi cây lớn nhanh hơn (trần 2× để không vỡ nhịp chơi)
      const growMult = Math.min(2, 1 + Calc.speciesFx('growBonus'));
      for (const r in s.trees) for (const i in s.trees[r]) {
        const t = s.trees[r][i];
        if (t.g >= 1) continue;
        t.g = Math.min(1, t.g + (dt / D.trees[t.type].grow) * (t.c ? 2 : 1) * growMult);
        if (t.g >= 1) {
          this.checkSpecies();
          const W = HSX.World, cau = W.room && W.room.id === r && W.room.rootSegs.some(sg => sg.idx === +i);
          if (cau) W.rootsGrown(+i);
          else HSX.UI.toast(`${D.trees[t.type].emoji} ${D.trees[t.type].name} đã lớn và tỏa sáng`);
        }
      }
      this.pollinate(dt);
      if (HSX.Quests) HSX.Quests.tick(dt);
    },

    // Phòng có bần trưởng thành + đom đóm: cứ ~15 giây đom đóm giúp rừng một việc
    pollinate(dt) {
      const s = HSX.S, W = HSX.World;
      if (!s.species.dom_dom || !W || !W.room) return;
      const room = W.room, trees = s.trees[room.id] || {};
      if (pollRoom !== room.id) { pollRoom = room.id; pollT = 0; }
      let ban = 0;
      for (const i in trees) if (trees[i].type === 'ban' && trees[i].g >= 1) ban++;
      if (!ban) return;
      pollT += dt;
      if (pollT < 15) return;
      pollT = 0;
      // 1) cây trong phòng chưa lớn: thụ phấn cho lớn nhanh
      const young = [];
      for (const i in trees) if (trees[i].g < 1) young.push(i);
      if (young.length) {
        const t = trees[HSX.pick(young)];
        t.g = Math.min(0.999, t.g + 0.35);
        HSX.saveGame();
        return;
      }
      // 2) còn ô đất trống: gieo miễn phí một trụ mầm đước.
      // Rặng bần là vườn đom đóm: đừng gieo chen vào ô của người chơi, nhất là ô quá sáng.
      const empty = room.objs.filter(o => {
        if (o.type !== 'plant' || o.dat === 'boi' || trees[o.idx]) return false;
        if (room.id === 'ran_ban' && (!s.flags.congRung || (o.sang || 0) >= 2)) return false;
        return true;
      });
      if (empty.length) {
        const o = HSX.pick(empty);
        (s.trees[room.id] = s.trees[room.id] || {})[o.idx] = { type: 'duoc', g: 0, c: false };
        HSX.emit('trong', { room: room.id, idx: o.idx, type: 'duoc' });
        HSX.UI.toast('✨ Đom đóm thụ phấn: một trụ mầm đước mọc lên');
        HSX.saveGame();
        return;
      }
      // 3) hết đất trống: rơi thêm một hạt giống
      s.seeds += 1;
      HSX.saveGame();
    },
    matureCount(type) {
      let n = 0;
      const tr = HSX.S.trees;
      for (const r in tr) for (const i in tr[r]) if (tr[r][i].type === type && tr[r][i].g >= 1) n++;
      return n;
    },

    // ---------- Sinh vật ----------
    speciesStatus(id) {
      const s = HSX.S, sp = D.species[id], c = sp.cond, list = [], lv = HSX.roomLevel(sp.room);
      const room = HSX.roomDef(sp.room);
      list.push({ ok: Calc.roomClean(sp.room), text: `Dọn sạch rác ở ${room.name}` });
      if (c.clean) list.push({ ok: Calc.cleanPct(lv) >= c.clean, text: `Độ sạch ${HSX.LEVELS[lv].goi} ≥ ${HSX.pct(c.clean)}` });
      if (c.tree) for (const t in c.tree) {
        const have = this.matureCount(t);
        list.push({ ok: have >= c.tree[t], text: `${c.tree[t]} cây ${D.trees[t].name} trưởng thành (${Math.min(have, c.tree[t])}/${c.tree[t]})` });
      }
      if (c.structure) list.push({ ok: !!s.owned[c.structure], text: `Dựng ${D.items[c.structure].emoji} ${D.items[c.structure].name}` });
      return list;
    },
    checkSpecies() {
      const s = HSX.S;
      for (const id in D.species) {
        if (s.species[id] || !this.speciesStatus(id).every(x => x.ok)) continue;
        s.species[id] = true;
        s.seen[id] = true;
        s.facts[D.species[id].fact] = true;
        HSX.UI.showSpecies(id);
        HSX.saveGame();
      }
    },

    // ---------- Puzzle ----------
    onPuzzleResult(stars) {
      const s = HSX.S;
      if (stars <= 0) return { first: false };
      const first = !s.puzzle.solved;
      s.puzzle.best = Math.max(s.puzzle.best, stars);
      s.puzzle.solved = true;
      if (first) this.grant('dan_tach_rac', 1);
      HSX.saveGame();
      return { first };
    },

    // Cổng Rừng (Màn 2): mở đường tới Hang Lưới Ma, thưởng hạt giống
    onPuzzle2Result(stars) {
      const s = HSX.S;
      if (stars <= 0) return { first: false };
      const first = !s.flags.congRung;
      s.flags.m2Best = Math.max(s.flags.m2Best || 0, stars);
      s.flags.congRung = true;
      if (first) s.seeds += 6;
      HSX.saveGame();
      return { first };
    },
  };
})();
