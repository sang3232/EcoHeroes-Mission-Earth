/* Thế giới: phòng, chuyển phòng, vật thể, đồ rơi, quái, boss, ánh sáng, camera */
(function () {
  const D = HSX.DATA, T = HSX.T, Phys = HSX.Phys, Calc = HSX.Calc, Sys = HSX.Sys, I = HSX.Input;
  const ENEMY = { c: 'chai_lan', s: 'slime_nilon', k: 'cua_lon', g: 'luoi_ma' };
  const isDoor = c => c >= '1' && c <= '9';
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------- Phòng ----------
  function Room(id) {
    const S = HSX.S, def = HSX.LEVELS[S.level].rooms[id];
    this.id = id;
    this.def = def;
    this.h = def.map.length;
    this.w = def.map[0].length;
    this.grid = def.map.map(r => r.split(''));
    this.objs = [];
    this.spawns = [];
    this.gates = [];
    this.bossSpawn = null;
    this.start = null;
    this.locked = false;
    const broken = S.broken[id] || {}, heaps = S.heaps[id] || {}, picked = S.picked[id] || {};
    const n = { heap: 0, enemy: 0, plant: 0, shard: 0, item: 0 };
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.grid[y][x], o = { x: x * T, y: y * T, tx: x, ty: y };
      if (c === 'X') { if (broken[x + ',' + y]) this.grid[y][x] = '.'; continue; }
      if (c === 'G') { this.gates.push(o); continue; }
      switch (c) {
        case '@': this.start = o; break;
        case 'B': this.objs.push(Object.assign(o, { type: 'bench' })); break;
        case 'S': if (!S.spirits[def.spirit]) this.objs.push(Object.assign(o, { type: 'cage', spirit: def.spirit, hp: 3, shake: 0 })); break;
        case 'T': { const i = n.heap++; if (!heaps[i]) this.objs.push(Object.assign(o, { type: 'heap', idx: i, hp: 3, shake: 0 })); break; }
        case 'P': this.objs.push(Object.assign(o, { type: 'plant', idx: n.plant++ })); break;
        case 'H': { const i = n.shard++; if (!picked['H' + i]) this.objs.push(Object.assign(o, { type: 'shard', idx: i })); break; }
        case 'J': this.objs.push(Object.assign(o, { type: 'journal', n: def.journal })); break;
        case 'L': this.objs.push(Object.assign(o, { type: 'lantern' })); break;
        case 'R': this.objs.push(Object.assign(o, { type: 'nest' })); break;
        case 'u': case 'o': case 'e': this.objs.push(Object.assign(o, { type: 'bin', bin: c })); break;
        case 'i': {
          const k = n.item++;
          if (!S.flags.sorted) this.objs.push({ type: 'sortItem', k, x: x * T + 9, y: y * T + 18, w: 30, h: 30, vx: 0, vy: 0 });
          break;
        }
        case 'c': case 's': case 'k': case 'g': this.spawns.push({ type: ENEMY[c], tx: x, ty: y, idx: n.enemy++ }); break;
        case 'K': case 'V': this.bossSpawn = { tx: x, ty: y }; break;
        default: continue;
      }
      this.grid[y][x] = '.';
    }
  }
  Room.prototype.tile = function (tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) {
      const e = this.grid[HSX.clamp(ty, 0, this.h - 1)][HSX.clamp(tx, 0, this.w - 1)];
      return isDoor(e) ? e : '#';
    }
    return this.grid[ty][tx];
  };
  Room.prototype.solid = function (tx, ty) {
    const c = this.tile(tx, ty);
    if (c === '#' || c === 'X') return true;
    if (c === '?') return !HSX.S.owned.kinh_lup;
    if (c === 'D') return !HSX.S.flags.sorted;
    if (c === 'G') return !HSX.S.puzzle.solved;
    if (isDoor(c)) return this.locked;
    return false;
  };
  Room.prototype.oneWay = function (tx, ty, b) {
    const c = this.tile(tx, ty);
    return c === '=' || (c === '~' && !!b.boat);
  };
  Room.prototype.onOneWay = function (b) {
    const ty = Math.floor((b.y + b.h + 2) / T), x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
    let one = false;
    for (let tx = x0; tx <= x1; tx++) { if (this.solid(tx, ty)) return false; if (this.oneWay(tx, ty, b)) one = true; }
    return one;
  };
  Room.prototype.hazardAt = function (b) {
    return Phys.eachTile({ x: b.x + 4, y: b.y + 6, w: b.w - 8, h: b.h - 6 }, (tx, ty) => {
      const c = this.tile(tx, ty);
      return c === '^' || (c === '~' && !b.boat);
    });
  };
  Room.prototype.hazardNear = function (b) {
    return Phys.eachTile({ x: b.x - T, y: b.y, w: b.w + 2 * T, h: b.h + T / 2 }, (tx, ty) => {
      const c = this.tile(tx, ty);
      return c === '^' || (c === '~' && !b.boat);
    });
  };

  // ---------- Thế giới ----------
  const W = HSX.World = {
    room: null, enemies: [], boss: null, pickups: [], shots: [], fx: [], texts: [],
    cam: { x: 0, y: 0 }, lookX: 0, hitstop: 0, shake: 0, fade: 0, fadeTo: null,
    bannerData: null, mode: 'play', deadT: 0, dawnT: 0, victoryT: 0, hints: {}, prompt: null, tip: null, gains: {}, gainT: 0,

    init() {
      const S = HSX.S;
      this.dawnT = S.dawn ? 99 : 0;
      this.load(S.bench.room, S.visited[S.bench.room] ? { bench: true } : { start: true });
    },

    load(id, entry) {
      const S = HSX.S, P = HSX.Player, first = !S.visited[id];
      const r = this.room = new Room(id);
      this.enemies = []; this.boss = null; this.pickups = []; this.shots = []; this.fx = []; this.texts = [];
      HSX.Render.tilesDirty = true;
      this.spawnEnemies();
      this.placePlayer(entry);
      S.visited[id] = true;
      HSX.Spirits.sync();
      HSX.Spirits.snap();
      this.camUpdate(0, true);
      this.banner(r.def.name, first ? 'Khu vực mới' : null, first ? 2.8 : 1.6);
      HSX.saveGame();
    },

    spawnEnemies() {
      const r = this.room, dead = HSX.S.dead[r.id] || {};
      r.spawns.forEach(s => { if (!dead[s.idx]) this.enemies.push(HSX.Enemies.create(s.type, s.tx, s.ty, s.idx)); });
      if (r.bossSpawn && r.def.boss && !HSX.S.bosses[r.def.boss]) {
        this.boss = HSX.Enemies.createBoss(r.def.boss, r.bossSpawn.tx, r.bossSpawn.ty);
        this.enemies.push(this.boss);
      }
    },

    placePlayer(entry) {
      const r = this.room, P = HSX.Player, b = P.b, rw = r.w * T, rh = r.h * T;
      if (entry.door) {
        let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
        r.grid.forEach((row, y) => row.forEach((c, x) => {
          if (c !== entry.door) return;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }));
        const midX = ((x0 + x1 + 1) / 2) * T - b.w / 2;
        if (x0 === 0) P.place(10, (y1 + 1) * T - b.h, Math.max(0, entry.vx));
        else if (x1 === r.w - 1) P.place(rw - b.w - 10, (y1 + 1) * T - b.h, Math.min(0, entry.vx));
        else if (y0 === 0) P.place(midX, 4, 0, Math.max(150, entry.vy));
        else {
          // Đi lên qua hố ở sàn: bật lên cố định. Phía trên không có bục đỡ thì trôi sang mép hố gần nhất.
          const gy = r.h - 2;
          let ledge = false;
          for (let y = gy - 5; y <= gy && !ledge; y++) for (let x = x0; x <= x1; x++) if (r.solid(x, y) || r.tile(x, y) === '=') ledge = true;
          let dir = 0;
          if (!ledge) {
            let L = x0 - 1, Rr = x1 + 1;
            while (L >= 0 && !r.solid(L, gy)) L--;
            while (Rr < r.w && !r.solid(Rr, gy)) Rr++;
            dir = (L < 0 ? 1e9 : x0 - L) <= (Rr >= r.w ? 1e9 : Rr - x1) ? -1 : 1;
          }
          P.place(midX, rh - b.h - 6, dir * 230, -1000);
          if (dir) { P.face = dir; P.nudgeT = 0.6; }
          P.pogoT = 0.35;
        }
        return;
      }
      const bench = r.objs.find(o => o.type === 'bench' && (HSX.S.bench.x === null || (o.x === HSX.S.bench.x && o.y === HSX.S.bench.y))) || r.objs.find(o => o.type === 'bench');
      const spot = (entry.start && r.start) || bench || r.start || { x: rw / 2, y: T };
      P.place(spot.x + T / 2 - b.w / 2, spot.y + T - b.h);
    },

    go(to, entry) {
      if (this.fadeTo) return;
      this.fadeTo = () => this.load(to, entry);
    },

    // ---------- Vòng cập nhật ----------
    update(dt) {
      const S = HSX.S, P = HSX.Player, r = this.room;
      this.shake = Math.max(0, this.shake - dt * 30);
      const bd = this.bannerData;
      if (bd) { bd.t += dt; if (bd.t > bd.dur) this.bannerData = null; }
      if (this.fadeTo) {
        this.fade = Math.min(1, this.fade + dt / 0.18);
        if (this.fade >= 1) { const f = this.fadeTo; this.fadeTo = null; f(); }
        return;
      }
      if (this.fade > 0) this.fade = Math.max(0, this.fade - dt / 0.25);
      this.updateFx(dt);
      if (this.mode === 'dead') {
        this.deadT -= dt;
        if (this.deadT <= 0) this.fadeTo = () => this.respawn();
        return;
      }
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      if (I.pressed('menu')) { HSX.UI.openPause('tui'); return; }
      if (I.pressed('inventory')) { HSX.UI.openPause('tui'); return; }
      if (I.pressed('map')) { HSX.UI.openPause('bando'); return; }

      S.stats.time += dt;
      if (S.dawn && this.dawnT < 99) this.dawnT += dt;
      if (this.victoryT > 0) { this.victoryT -= dt; if (this.victoryT <= 0) HSX.UI.showVictory(); }

      P.update(dt, r);
      if (this.mode !== 'play' || this.fadeTo) return;
      if (r.hazardAt(P.b)) { this.hazardHit(); return; }

      // Quái
      this.enemies.forEach(e => {
        HSX.Enemies.update(e, dt, r, P);
        if (!e.dead && e.y > r.h * T + 300) { e.dead = true; }
      });
      if (this.boss && !this.boss.active && !this.boss.dead && P.cx() > 7 * T) this.startBoss();
      const pb = { x: P.b.x + 3, y: P.b.y + 5, w: P.b.w - 6, h: P.b.h - 7 };
      this.enemies.forEach(e => {
        if (!e.dead && (e.kind !== 'boss' || e.active) && Phys.overlap(pb, e)) P.hurt(1, e.x + e.w / 2);
      });
      this.enemies = this.enemies.filter(e => !e.dead || e === this.boss);

      this.updateShots(dt, pb);
      this.updatePickups(dt);
      this.collectShards(pb);
      this.updateSortItems(dt);
      this.room.objs.forEach(o => { if (o.shake) o.shake = Math.max(0, o.shake - dt); });
      Sys.tickTrees(dt);
      HSX.Spirits.update(dt);

      this.prompt = this.findInteract();
      this.tip = this.findTip();
      this.checkExit();
      this.camUpdate(dt);
    },

    // ---------- Máu, chết, gai ----------
    hazardHit() {
      const P = HSX.Player;
      P.hurt(1, P.cx(), true);
      if (HSX.S.hp <= 0 || this.mode !== 'play') return;
      this.text(P.cx(), P.b.y - 10, 'Độc!', '#d58cff');
      this.fadeTo = () => {
        P.place(P.safe.x, P.safe.y);
        P.inv = 1.1;
        HSX.Spirits.snap();
        this.camUpdate(0, true);
      };
    },

    die() {
      if (this.mode === 'dead') return;
      this.mode = 'dead';
      this.deadT = 1.1;
      HSX.S.stats.deaths++;
      const P = HSX.Player;
      this.burst(P.cx(), P.cy(), '#e8f5ea', 30);
    },

    respawn() {
      const S = HSX.S;
      S.hp = Calc.maxHp();
      S.energy = 0;
      S.dead = {};
      this.mode = 'play';
      this.load(S.bench.room, { bench: true });
      HSX.Player.inv = 1;
      this.banner('Tỉnh dậy ở Trạm Tái Chế', 'Đồ nhặt được vẫn còn nguyên', 2.4);
    },

    // ---------- Đòn chém ----------
    attack(box, dir) {
      const S = HSX.S, P = HSX.Player, r = this.room, dmg = Calc.weaponDmg();
      let hit = false, pogo = false;
      const gain = n => { S.energy = Math.min(99, S.energy + n); };
      this.enemies.forEach(e => {
        if (e.dead || (e.kind === 'boss' && !e.active) || !Phys.overlap(box, e)) return;
        const res = HSX.Enemies.damage(e, dmg, P, dir);
        hit = true;
        if (res !== 'block') { gain(11); this.spark(e.x + e.w / 2, e.y + e.h / 2, '#ffffff'); }
        if (dir === 'down') pogo = true;
      });
      this.shots = this.shots.filter(s => {
        if (s.type !== 'bag' || !Phys.overlap(box, s)) return true;
        hit = true; gain(6);
        if (dir === 'down') pogo = true;
        this.burst(s.x + s.w / 2, s.y + s.h / 2, '#d8d0ff', 10);
        return false;
      });
      r.objs.slice().forEach(o => {
        if (o.type === 'heap' && Phys.overlap(box, { x: o.x + 2, y: o.y + 8, w: T - 4, h: T - 8 })) {
          hit = true; gain(4);
          if (dir === 'down') pogo = true;
          o.hp--; o.shake = 0.15;
          this.dust(o.x + T / 2, o.y + T - 8, 5);
          if (o.hp <= 0) this.breakHeap(o);
        } else if (o.type === 'cage' && Phys.overlap(box, { x: o.x + 2, y: o.y - 30, w: T - 4, h: T + 30 })) {
          hit = true;
          if (!this.cageOpen()) { this.hint('cage', this.cageLockText()); this.spark(o.x + T / 2, o.y, '#c79bff'); return; }
          o.hp--; o.shake = 0.15;
          this.spark(o.x + T / 2, o.y, '#ffd6f0');
          if (o.hp <= 0) this.rescue(o);
        }
      });
      if (dir === 'down' && !pogo) pogo = Phys.eachTile(box, (tx, ty) => r.tile(tx, ty) === '^');
      if (hit) this.hitstop = Math.max(this.hitstop, 0.045);
      return { hit, pogo };
    },

    // Gấu Rừng đập xuống: phá nền nứt, gây sóng chấn quanh chân
    slamImpact(P) {
      const r = this.room, b = P.b, cx = P.cx(), feet = b.y + b.h;
      this.shake = 14;
      this.hitstop = 0.06;
      this.dust(cx, feet, 14);
      this.burst(cx, feet - 6, '#e0a46a', 16);
      const ty = Math.floor((feet + 4) / T);
      for (let tx = Math.floor((b.x - 10) / T); tx <= Math.floor((b.x + b.w + 10) / T); tx++) if (r.tile(tx, ty) === 'X') this.breakX(tx, ty);
      this.enemies.forEach(e => {
        if (e.dead || (e.kind === 'boss' && !e.active)) return;
        if (Math.abs(e.x + e.w / 2 - cx) < 150 && Math.abs(e.y + e.h - feet) < 90) HSX.Enemies.damage(e, 12, P, 'slam');
      });
      r.objs.slice().forEach(o => {
        if (o.type !== 'heap' || Math.abs(o.x + T / 2 - cx) > 150 || Math.abs(o.y + T - feet) > 90) return;
        o.hp -= 2; o.shake = 0.2;
        if (o.hp <= 0) this.breakHeap(o);
      });
    },

    breakX(tx, ty) {
      const r = this.room, S = HSX.S, q = [[tx, ty]];
      const br = S.broken[r.id] = S.broken[r.id] || {};
      while (q.length) {
        const [x, y] = q.pop();
        if (r.tile(x, y) !== 'X' || x < 0 || y < 0 || x >= r.w || y >= r.h) continue;
        r.grid[y][x] = '.';
        br[x + ',' + y] = true;
        this.burst(x * T + T / 2, y * T + T / 2, '#8a7a5c', 10);
        q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      HSX.Render.tilesDirty = true;
      this.text(tx * T + T / 2, ty * T - 10, 'Nền rác vỡ!', '#ffe08a', 18);
      HSX.saveGame();
    },

    // ---------- Đống rác, đồ rơi ----------
    breakHeap(o) {
      const S = HSX.S, r = this.room, pool = D.heapLoot[r.def.area] || D.heapLoot.bai_bien;
      (S.heaps[r.id] = S.heaps[r.id] || {})[o.idx] = true;
      r.objs.splice(r.objs.indexOf(o), 1);
      const total = pool.reduce((a, p) => a + p[1], 0), n = HSX.roll((3 + Math.random() * 2) * Calc.dropMult());
      for (let k = 0; k < n; k++) {
        let x = Math.random() * total, id = pool[0][0];
        for (const [pid, w] of pool) { x -= w; if (x <= 0) { id = pid; break; } }
        this.drop(id, 1, o.x + T / 2, o.y + T / 2);
      }
      this.drop('seed', HSX.roll(1.3 * Calc.seedMult()), o.x + T / 2, o.y + T / 2);
      this.burst(o.x + T / 2, o.y + T / 2, '#a08a62', 22);
      this.shake = 6;
      if (Calc.roomClean(r.id)) {
        this.banner(`${r.def.name} đã sạch rác`, 'Độ sạch tăng, bãi biển sáng hơn. Ô đất đã trồng được cây.', 2.6);
        Sys.checkSpecies();
      }
      HSX.saveGame();
    },

    drop(id, n, x, y) {
      for (let k = 0; k < n && this.pickups.length < 140; k++) {
        this.pickups.push({ id, x: x - 8, y: y - 8, w: 16, h: 16, vx: (Math.random() - 0.5) * 340, vy: -260 - Math.random() * 260, t: 0 });
      }
    },

    updatePickups(dt) {
      const P = HSX.Player, r = this.room, mag = Calc.magnet();
      this.pickups = this.pickups.filter(p => {
        p.t += dt;
        const dx = P.cx() - (p.x + 8), dy = P.cy() - (p.y + 8), dist = Math.hypot(dx, dy) || 1;
        if (p.t > 0.35 && dist < mag) {
          p.x += dx / dist * 560 * dt;
          p.y += dy / dist * 560 * dt;
        } else {
          p.vy = Math.min(800, p.vy + 1500 * dt);
          Phys.move(p, r, dt);
          if (p.ground) p.vx *= 0.8;
        }
        if (p.t > 0.25 && dist < 28) { this.collect(p.id); return false; }
        return p.t < 90;
      });
      this.gainT += dt;
      if (this.gainT > 0.5 && Object.keys(this.gains).length) {
        const s = Object.keys(this.gains).map(id => `+${this.gains[id]} ${id === 'seed' ? '🌱' : D.items[id].emoji}`).join('  ');
        this.text(P.cx(), P.b.y - 16, s, '#ffffff', 15);
        this.gains = {};
        this.gainT = 0;
      }
    },

    // Mảnh Lá: đủ 4 mảnh thì thêm 1 lá máu tối đa
    collectShards(pb) {
      const S = HSX.S, r = this.room;
      r.objs.slice().forEach(o => {
        if (o.type !== 'shard' || !Phys.overlap(pb, { x: o.x + 8, y: o.y + 4, w: T - 16, h: T - 8 })) return;
        r.objs.splice(r.objs.indexOf(o), 1);
        (S.picked[r.id] = S.picked[r.id] || {})['H' + o.idx] = true;
        S.shards++;
        this.burst(o.x + T / 2, o.y + T / 2, '#7be08f', 26);
        if (S.shards % 4 === 0) {
          S.hp = Calc.maxHp();
          this.banner('Thêm 1 lá máu!', `Đã ghép đủ 4 Mảnh Lá · Máu tối đa ${Calc.maxHp()}`, 2.6);
        } else this.banner('Mảnh Lá', `${S.shards % 4}/4 mảnh · đủ 4 mảnh thì thêm 1 lá máu`, 2.2);
        HSX.saveGame();
      });
    },

    collect(id) {
      if (id === 'seed') HSX.S.seeds++;
      else Sys.addItem(id, 1);
      this.gains[id] = (this.gains[id] || 0) + 1;
      if (Object.keys(this.gains).length === 1 && this.gains[id] === 1) this.gainT = 0;
    },

    // ---------- Quái chết, boss ----------
    killEnemy(e) {
      const S = HSX.S, r = this.room;
      e.dead = true;
      S.stats.kills++;
      this.burst(e.x + e.w / 2, e.y + e.h / 2, e.def.color, 22);
      if (e.kind === 'boss') { this.bossDefeated(e); return; }
      if (e.temp) return;
      (S.dead[r.id] = S.dead[r.id] || {})[e.idx] = true;
      e.def.drops.forEach(([id, ch]) => this.drop(id, HSX.roll(ch * Calc.dropMult()), e.x + e.w / 2, e.y + e.h / 2));
      this.drop('seed', HSX.roll(0.6 * Calc.seedMult()), e.x + e.w / 2, e.y + e.h / 2);
      if (r.def.cageLock === 'enemies' && r.objs.some(o => o.type === 'cage') && this.enemies.every(x => x.dead || x.temp)) {
        this.banner('Lồng đã mở khóa', 'Chém vỡ lồng để giải cứu tinh linh', 2.2);
      }
    },

    startBoss() {
      const b = this.boss;
      b.active = true;
      this.room.locked = true;
      this.shake = 10;
      this.banner(b.def.name, b.type === 'vua_nilon' ? 'Kẻ đẻ ra Sương Độc' : 'Kẻ canh lồng Gấu Rừng', 2.8);
    },

    bossDefeated(e) {
      const S = HSX.S, r = this.room;
      S.bosses[e.type] = true;
      r.locked = false;
      this.shake = 18;
      this.hitstop = 0.35;
      for (const id in e.def.drops) this.drop(id, Math.min(12, e.def.drops[id]), e.x + e.w / 2, e.y + e.h / 2);
      for (const id in e.def.drops) if (e.def.drops[id] > 12) Sys.addItem(id, e.def.drops[id] - 12);
      this.drop('seed', 8, e.x + e.w / 2, e.y + e.h / 2);
      this.shots = [];
      this.enemies.forEach(x => { if (x.temp && !x.dead) { x.dead = true; this.burst(x.x + x.w / 2, x.y + x.h / 2, '#d8d0ff', 12); } });
      if (e.type === 'vua_nilon') {
        S.dawn = true;
        this.dawnT = 0;
        this.victoryT = 5;
        Sys.fact('nilon');
        this.banner('Bình minh trở lại', 'Sương Độc trên Bãi biển nhựa đã tan', 4.5);
      } else {
        this.banner(`Đã hạ ${e.def.name}`, 'Lồng của Gấu Rừng đã mở', 2.8);
      }
      HSX.saveGame();
    },

    spawnTemp(type, x, y) {
      const e = HSX.Enemies.create(type, Math.floor(x / T), Math.floor(y / T), -1, true);
      e.x = x; e.y = y;
      this.enemies.push(e);
    },

    // ---------- Đạn của boss ----------
    bag(x, y) {
      this.shots.push({ type: 'bag', x: x - 17, y: y - 17, w: 34, h: 34, vx: (Math.random() - 0.5) * 260, vy: -260, life: 7, t: Math.random() * 6 });
    },
    wave(x, feet, dir, speed) {
      this.shots.push({ type: 'wave', x: x - 20, y: feet - 30, w: 40, h: 30, vx: dir * speed, vy: 0, life: 3 });
    },
    updateShots(dt, pb) {
      const P = HSX.Player, r = this.room;
      this.shots = this.shots.filter(s => {
        s.life -= dt;
        if (s.type === 'bag') {
          s.t += dt;
          const dx = P.cx() - (s.x + s.w / 2), dy = P.cy() - (s.y + s.h / 2), d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d * 170 - s.vx) * dt * 1.4;
          s.vy += (dy / d * 170 - s.vy) * dt * 1.4 + Math.sin(s.t * 4) * 20 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        } else {
          s.x += s.vx * dt;
          const tx = Math.floor((s.vx > 0 ? s.x + s.w : s.x) / T);
          if (r.solid(tx, Math.floor((s.y + s.h / 2) / T))) { this.dust(s.x + s.w / 2, s.y + s.h, 6); return false; }
          if (Math.random() < 0.5) this.dust(s.x + s.w / 2, s.y + s.h, 1);
        }
        if (Phys.overlap(pb, s)) {
          P.hurt(1, s.x + s.w / 2);
          if (s.type === 'bag') { this.burst(s.x + s.w / 2, s.y + s.h / 2, '#d8d0ff', 8); return false; }
        }
        return s.life > 0;
      });
    },

    // ---------- Lồng tinh linh ----------
    cageOpen() {
      const r = this.room, lock = r.def.cageLock, S = HSX.S;
      if (lock === 'enemies') return this.enemies.every(e => e.dead || e.temp);
      if (lock === 'boss') return !!S.bosses[r.def.boss];
      if (lock === 'puzzle') return S.puzzle.solved;
      return true;
    },
    cageLockText() {
      const lock = this.room.def.cageLock;
      if (lock === 'enemies') return 'Lồng bị Sương Độc khóa: hạ hết quái trong phòng trước.';
      if (lock === 'boss') return 'Lồng bị khóa: phải hạ Cua Lon Khổng Lồ.';
      return 'Lồng bị khóa: hãy giải Cổng Phân Loại.';
    },
    rescue(o) {
      const S = HSX.S, r = this.room;
      S.spirits[o.spirit] = true;
      r.objs.splice(r.objs.indexOf(o), 1);
      HSX.Spirits.sync(o.x + T / 2, o.y - 10);
      this.burst(o.x + T / 2, o.y, D.spirits[o.spirit].color, 40);
      this.shake = 8;
      HSX.saveGame();
      HSX.UI.showSpirit(o.spirit);
    },

    // ---------- Phòng phân loại (Lều bỏ hoang) ----------
    updateSortItems(dt) {
      const P = HSX.Player, r = this.room;
      const items = r.objs.filter(o => o.type === 'sortItem');
      if (!items.length) return;
      const bins = r.objs.filter(o => o.type === 'bin');
      items.forEach(o => {
        if (o.held) { o.x = P.cx() - 15; o.y = P.b.y - 34; return; }
        o.vy = Math.min(800, o.vy + 1500 * dt);
        Phys.move(o, r, dt);
        if (o.ground) { o.vx *= 0.75; o.thrown = false; }
        if (!o.thrown) return;
        const bin = bins.find(b => Phys.overlap(o, { x: b.x + 2, y: b.y + 4, w: T - 4, h: T - 4 }));
        if (!bin) return;
        const it = D.sortItems[o.k % D.sortItems.length];
        if (it.bin === bin.bin) {
          r.objs.splice(r.objs.indexOf(o), 1);
          this.burst(bin.x + T / 2, bin.y + 10, D.bins[bin.bin].color, 16);
          this.text(bin.x + T / 2, bin.y - 10, '✔', '#9ff0b5', 22);
          if (!r.objs.some(x => x.type === 'sortItem')) this.sortSolved();
        } else {
          o.thrown = false;
          o.vy = -420;
          o.vx = (Math.random() < 0.5 ? -1 : 1) * 170;
          this.text(bin.x + T / 2, bin.y - 10, '✘', '#ff8a8a', 22);
          HSX.UI.toast(`${it.emoji} ${it.name}: ${it.hint} → thùng <b>${D.bins[it.bin].name}</b>`);
        }
      });
    },
    sortSolved() {
      HSX.S.flags.sorted = true;
      HSX.Render.tilesDirty = true;
      this.shake = 8;
      this.banner('Phân loại đúng hết!', 'Cửa căn phòng bên trái đã mở', 2.6);
      Sys.fact('luat3nhom');
      HSX.saveGame();
    },
    throwCarry(P) {
      const o = P.carry;
      P.carry = null;
      o.held = false;
      o.thrown = true;
      o.x = P.cx() - 15;
      o.y = P.b.y - 30;
      o.vx = P.face * 430;
      o.vy = -360;
    },
    dropCarry(P) {
      const o = P.carry;
      if (!o) return;
      P.carry = null;
      o.held = false;
      o.thrown = false;
      o.x = P.cx() - 15;
      o.y = P.b.y + P.b.h - o.h;
      o.vx = 0;
      o.vy = 0;
    },

    // ---------- Tương tác ----------
    findInteract() {
      const P = HSX.Player, r = this.room, S = HSX.S, cx = P.cx(), feet = P.b.y + P.b.h;
      if (!P.b.ground && !P.carry) return null;
      if (P.carry) return { kind: 'drop', label: 'Đặt xuống', x: cx, y: P.b.y - 46 };
      for (const o of r.objs) {
        const ox = o.x + T / 2;
        if (o.type === 'sortItem') {
          if (!o.held && Math.abs(cx - (o.x + 15)) < 34 && Math.abs(feet - (o.y + o.h)) < 30) return { kind: 'pick', label: 'Nhặt', o, x: o.x + 15, y: o.y - 18 };
          continue;
        }
        if (Math.abs(cx - ox) > 40 || Math.abs(feet - (o.y + T)) > 24) continue;
        if (o.type === 'bench') return { kind: 'bench', label: 'Ngồi nghỉ', o, x: ox, y: o.y - 30 };
        if (o.type === 'journal') return { kind: 'journal', label: 'Đọc', o, x: ox, y: o.y - 24 };
        if (o.type === 'nest') return { kind: 'nest', label: 'Xem', o, x: ox, y: o.y - 20 };
        if (o.type === 'plant') {
          const t = (S.trees[r.id] || {})[o.idx];
          if (!t) return { kind: 'plant', label: 'Trồng cây', o, x: ox, y: o.y - 10 };
        }
      }
      for (const g of r.gates) {
        if (S.puzzle.solved) break;
        if (Math.abs(cx - (g.x + T / 2)) < 80 && Math.abs(feet - (g.y + T)) < T * 3.2) {
          const top = Math.min(...r.gates.map(x => x.y));
          return { kind: 'gate', label: 'Mở Cổng Phân Loại', x: g.x + T / 2, y: top - 16 };
        }
      }
      return null;
    },

    interact() {
      const it = this.findInteract(), P = HSX.Player, r = this.room, S = HSX.S;
      if (!it) return;
      switch (it.kind) {
        case 'bench': {
          const gifts = Sys.rest(r.id, it.o.x, it.o.y);
          this.enemies = this.enemies.filter(e => e.kind === 'boss' && !e.dead);
          this.spawnEnemies();
          if (this.boss && !this.enemies.includes(this.boss)) this.enemies.push(this.boss);
          this.burst(it.o.x + T / 2, it.o.y + 10, '#9ff0b5', 20);
          HSX.UI.openBench(gifts);
          break;
        }
        case 'journal': Sys.readJournal(it.o.n); break;
        case 'plant':
          if (!Calc.roomClean(r.id)) HSX.UI.toast('Phá hết đống rác trong phòng này trước, đất mới trồng được cây.');
          else HSX.UI.openPlant(r.id, it.o.idx);
          break;
        case 'pick': P.carry = it.o; it.o.held = true; break;
        case 'drop': this.dropCarry(P); break;
        case 'nest':
          HSX.UI.toast(S.owned.rao_chan
            ? (S.species.rua_bien ? 'Rùa mẹ đã về đẻ trứng ở đây 🐢' : 'Rào chắn đã dựng. Rùa mẹ sẽ về khi bãi biển đủ sạch.')
            : 'Ổ trứng rùa không được bảo vệ. Cần 🚧 Rào Chắn Ổ Trứng (chế ở Trạm).');
          break;
        case 'gate': {
          const need = HSX.LEVELS[S.level].gateClean;
          if (Calc.cleanPct() < need) HSX.UI.toast(`Cổng chỉ mở khi bãi biển sạch ít nhất ${HSX.pct(need)}. Hiện tại: ${HSX.pct(Calc.cleanPct())}. Hãy phá thêm đống rác.`);
          else HSX.Puzzle.open();
          break;
        }
      }
    },

    findTip() {
      const P = HSX.Player, tips = this.room.def.tips || [], feet = P.b.y + P.b.h;
      for (const t of tips) if (Math.abs(P.cx() - (t.x * T + T / 2)) < 3 * T && Math.abs(feet - (t.y + 1) * T) < 3 * T) return t;
      return null;
    },

    hint(key, msg) {
      const now = performance.now();
      if (this.hints[key] && now - this.hints[key] < 4000) return;
      this.hints[key] = now;
      HSX.UI.toast(msg);
    },

    // ---------- Chuyển phòng ----------
    checkExit() {
      const P = HSX.Player, b = P.b, r = this.room, cx = P.cx(), cy = P.cy(), rw = r.w * T, rh = r.h * T;
      let tx, ty, side;
      if (cx < 0) { side = 'left'; tx = 0; ty = Math.floor(cy / T); }
      else if (cx > rw) { side = 'right'; tx = r.w - 1; ty = Math.floor(cy / T); }
      else if (cy < 0) { side = 'top'; ty = 0; tx = Math.floor(cx / T); }
      else if (cy > rh) { side = 'bottom'; ty = r.h - 1; tx = Math.floor(cx / T); }
      if (!side) return;
      const d = r.grid[HSX.clamp(ty, 0, r.h - 1)][HSX.clamp(tx, 0, r.w - 1)], link = r.def.doors[d];
      if (!link) return;
      if (P.carry) this.dropCarry(P);
      this.go(link[0], { door: String(link[1]), side, vx: b.vx, vy: b.vy });
    },

    camUpdate(dt, snap) {
      const P = HSX.Player, r = this.room, VW = HSX.VW, VH = HSX.VH, rw = r.w * T, rh = r.h * T;
      this.lookX += (P.face * 60 - this.lookX) * (snap ? 1 : Math.min(1, dt * 1.8));
      let tx = P.cx() + this.lookX - VW / 2, ty = P.cy() - VH / 2 - 20 + P.look;
      // Trận boss: khung nhìn đặt giữa Mầm và boss để thấy cả hai
      const bo = this.boss;
      if (bo && bo.active && !bo.dead) tx = P.cx() * 0.6 + (bo.x + bo.w / 2) * 0.4 - VW / 2;
      tx = rw <= VW ? (rw - VW) / 2 : HSX.clamp(tx, 0, rw - VW);
      ty = rh <= VH ? (rh - VH) / 2 : HSX.clamp(ty, 0, rh - VH);
      if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
      const k = Math.min(1, dt * 7);
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    },

    // ---------- Ánh sáng ----------
    // Mức sáng nền: tối nhất lúc đầu, sáng dần theo độ sạch và số tinh linh. Phòng boss tối cho tới khi thắng.
    ambient() {
      const r = this.room, S = HSX.S;
      if (r.def.boss && !S.bosses[r.def.boss]) return 0.04;
      let a = 0.06 + Calc.cleanPct() * 0.55 + Calc.spiritCount() * 0.04;
      if (r.def.area === 'hang') a -= 0.03;
      a = HSX.clamp(a, 0.04, 0.85);
      if (S.dawn) a = lerp(a, 1, Math.min(1, this.dawnT / 4));
      return a;
    },

    lights() {
      const P = HSX.Player, r = this.room, S = HSX.S, L = [];
      L.push({ x: P.cx(), y: P.cy() - 6, r: 150 + 15 * Calc.spiritCount() });
      HSX.Spirits.lights().forEach(l => L.push(l));
      const trees = S.trees[r.id] || {};
      r.objs.forEach(o => {
        const cx = o.x + T / 2, cy = o.y + T / 2;
        if (o.type === 'bench') L.push({ x: cx, y: cy - 10, r: 140, glow: '160,255,190' });
        else if (o.type === 'lantern') L.push({ x: cx, y: cy, r: 190, glow: '255,200,120' });
        else if (o.type === 'cage') L.push({ x: cx, y: cy - 10, r: 80, glow: '200,120,255' });
        else if (o.type === 'shard') L.push({ x: cx, y: cy, r: 75, glow: '140,255,160' });
        else if (o.type === 'journal') L.push({ x: cx, y: cy, r: 70, glow: '255,210,140' });
        else if (o.type === 'plant' && trees[o.idx]) {
          const t = trees[o.idx], d = D.trees[t.type];
          L.push({ x: cx, y: cy - 30, r: d.light * (0.3 + 0.7 * t.g), glow: t.g >= 1 ? '180,255,170' : null });
        }
      });
      r.gates.forEach(g => { if (!S.puzzle.solved) L.push({ x: g.x + T / 2, y: g.y + T / 2, r: 50, glow: '120,200,255' }); });
      this.enemies.forEach(e => {
        if (e.dead) return;
        if (e.kind === 'boss') L.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 210, glow: '170,90,255' });
        else if (e.type === 'luoi_ma') L.push({ x: e.x + e.w / 2, y: e.y + e.h / 3, r: 45, glow: '190,110,255' });
      });
      this.shots.forEach(s => { if (s.type === 'bag') L.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, r: 40, glow: '180,140,255' }); });
      return L;
    },

    // ---------- Hiệu ứng ----------
    banner(text, sub, dur) { this.bannerData = { text, sub, t: 0, dur: dur || 2.4 }; },
    text(x, y, s, color, size) {
      this.texts.push({ x, y, s: String(s), color: color || '#fff', size: size || 16, life: 1.2, max: 1.2 });
      if (this.texts.length > 40) this.texts.shift();
    },
    burst(x, y, color, n) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * 6.283, sp = 60 + Math.random() * 200;
        this.fx.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 500, life: 0.7, max: 0.7, color, r: 2 + Math.random() * 3 });
      }
    },
    spark(x, y, color) {
      for (let k = 0; k < 6; k++) this.fx.push({ x, y, vx: (Math.random() - 0.5) * 360, vy: (Math.random() - 0.5) * 360, g: 0, life: 0.22, max: 0.22, color, r: 2.5 });
    },
    dust(x, y, n) {
      for (let k = 0; k < n; k++) this.fx.push({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 90, g: 120, life: 0.5, max: 0.5, color: '#cdb98f', r: 3 + Math.random() * 3 });
    },
    updateFx(dt) {
      this.fx.forEach(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; });
      this.fx = this.fx.filter(p => p.life > 0);
      if (this.fx.length > 400) this.fx.splice(0, this.fx.length - 400);
      this.texts.forEach(t => { t.life -= dt; t.y -= 28 * dt; });
      this.texts = this.texts.filter(t => t.life > 0);
    },
  };
})();
