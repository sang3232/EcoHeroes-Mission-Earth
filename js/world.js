/* Thế giới: phòng, chuyển phòng, vật thể, đồ rơi, quái, boss, ánh sáng, camera */
(function () {
  const D = HSX.DATA, T = HSX.T, Phys = HSX.Phys, Calc = HSX.Calc, Sys = HSX.Sys, I = HSX.Input;
  const ENEMY = { c: 'chai_lan', s: 'slime_nilon', k: 'cua_lon', g: 'luoi_ma', f: 'hop_xop' };
  const isDoor = c => c >= '1' && c <= '9';
  const lerp = (a, b, t) => a + (b - a) * t;
  const RAC = ['#e05a5a', '#4a90d9', '#f2f2f2', '#f2c14e', '#5cc48a', '#a08a62'];   // màu mảnh rác vụn
  const LUOI = ['#5f8f6a', '#3d6b8a', '#9fd3a8', '#c9b98a'];                         // màu sợi lưới đứt
  // Năng lượng mỗi lần hạt ná trúng: quái, giáp boss, đống rác, túi / lưới đang bay, lưới ma giăng
  // (chém trúng được 11, 3, 4, 6, 3: ná được chừng một nửa)
  const NL_BAN = { quai: 5, giap: 1, rac: 2, dan: 3, luoi: 1 };
  // Cổng đã mở chưa? Màn 1 dùng puzzle phân loại, Màn 2 dùng cờ "cổng rừng"
  const gateSolved = () => (HSX.S.level === 'm2' ? !!HSX.S.flags.congRung : !!HSX.S.puzzle.solved);

  // ---------- Phòng ----------
  function Room(id) {
    const S = HSX.S, def = HSX.roomDef(id), lv = HSX.roomLevel(id);
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
    this.roots = {};       // ô cầu rễ "x,y" → chỉ số bãi bồi (ô cây) mọc ra nó
    this.rootSegs = [];    // từng đoạn cầu rễ: { tiles, idx, x0, x1, y }
    this.luoiHp = {};      // tấm lưới ma (theo ô đầu tiên) → số nhát còn lại
    const broken = S.broken[id] || {}, heaps = S.heaps[id] || {}, picked = S.picked[id] || {};
    const drained = def.xa && S.flags['xa_' + id];
    const n = { heap: 0, enemy: 0, plant: 0, shard: 0, item: 0 };
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.grid[y][x], o = { x: x * T, y: y * T, tx: x, ty: y };
      if (c === 'X' || c === 'n') { if (broken[x + ',' + y]) this.grid[y][x] = '.'; continue; }
      if (c === 'w') { if (drained) this.grid[y][x] = '.'; continue; }
      if (c === 'r') continue;
      if (c === 'G') { this.gates.push(o); continue; }
      switch (c) {
        case '@': this.start = o; break;
        case 'B': this.objs.push(Object.assign(o, { type: 'bench' })); break;
        case 'S': if (!S.spirits[def.spirit]) this.objs.push(Object.assign(o, { type: 'cage', spirit: def.spirit, hp: 3, shake: 0 })); break;
        case 'T': { const i = n.heap++; if (!heaps[i]) this.objs.push(Object.assign(o, { type: 'heap', idx: i, hp: 3, shake: 0 })); break; }
        case 'P': this.objs.push(Object.assign(o, { type: 'plant', idx: n.plant++, dat: lv === 'm1' ? 'cat' : 'bun' })); break;
        case 'Y': this.objs.push(Object.assign(o, { type: 'plant', idx: n.plant++, dat: 'boi' })); break;
        case 'M': this.objs.push(Object.assign(o, { type: 'npc', npc: 'me_duoc' })); break;
        case 'A': this.objs.push(Object.assign(o, { type: 'hut' })); break;
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
        case 'c': case 's': case 'k': case 'g': case 'f': this.spawns.push({ type: ENEMY[c], tx: x, ty: y, idx: n.enemy++ }); break;
        case 'K': case 'V': case 'N': this.bossSpawn = { tx: x, ty: y }; break;
        default: continue;
      }
      this.grid[y][x] = '.';
    }
    this.findRoots();
  }
  // Cầu rễ: mỗi dải ô r liền nhau thuộc về bãi bồi (Y) gần nó nhất, mọc khi cây đước ở đó đã lớn
  Room.prototype.findRoots = function () {
    const boi = this.objs.filter(o => o.type === 'plant' && o.dat === 'boi'), seen = {};
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.grid[y][x] !== 'r' || seen[x + ',' + y]) continue;
      const tiles = [], q = [[x, y]];
      seen[x + ',' + y] = true;
      while (q.length) {
        const [a, b] = q.pop();
        tiles.push([a, b]);
        [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]].forEach(([c, d]) => {
          if (c < 0 || d < 0 || c >= this.w || d >= this.h || seen[c + ',' + d] || this.grid[d][c] !== 'r') return;
          seen[c + ',' + d] = true;
          q.push([c, d]);
        });
      }
      let best = null, bd = 1e9;
      boi.forEach(o => tiles.forEach(([a, b]) => { const dd = Math.abs(a - o.tx) + Math.abs(b - o.ty); if (dd < bd) { bd = dd; best = o; } }));
      if (!best) continue;
      const xs = tiles.map(t => t[0]);
      const seg = { tiles, idx: best.idx, x0: Math.min(...xs), x1: Math.max(...xs), y: tiles[0][1], from: best.tx };
      tiles.forEach(([a, b]) => { this.roots[a + ',' + b] = best.idx; });
      this.rootSegs.push(seg);
    }
  };
  // Độ lớn (0-1) của cây đước nuôi ô cầu rễ (tx, ty); 0 nếu chưa trồng
  Room.prototype.rootGrow = function (tx, ty) {
    const i = this.roots[tx + ',' + ty];
    if (i === undefined) return 0;
    const t = (HSX.S.trees[this.id] || {})[i];
    return t && t.type === 'duoc' ? t.g : 0;
  };
  Room.prototype.tile = function (tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) {
      const e = this.grid[HSX.clamp(ty, 0, this.h - 1)][HSX.clamp(tx, 0, this.w - 1)];
      return isDoor(e) ? e : '#';
    }
    return this.grid[ty][tx];
  };
  Room.prototype.solid = function (tx, ty) {
    const c = this.tile(tx, ty);
    if (c === '#' || c === 'X' || c === 'n') return true;
    if (c === '?') return !HSX.S.owned.kinh_lup;
    if (c === 'D') return !HSX.S.flags.sorted;
    if (c === 'G') return !gateSolved();
    if (isDoor(c)) return this.locked;
    return false;
  };
  Room.prototype.oneWay = function (tx, ty, b) {
    const c = this.tile(tx, ty);
    return c === '=' || (c === '~' && !!b.boat) || (c === 'r' && this.rootGrow(tx, ty) >= 1);
  };
  Room.prototype.onOneWay = function (b) {
    const ty = Math.floor((b.y + b.h + 2) / T), x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
    let one = false;
    for (let tx = x0; tx <= x1; tx++) { if (this.solid(tx, ty)) return false; if (this.oneWay(tx, ty, b)) one = true; }
    return one;
  };
  // Gai, nước độc (Xuồng Phao đi được), nước ngập Màn 2 (rơi vào là mất máu, kể cả có xuồng)
  Room.prototype.hazardAt = function (b) {
    return Phys.eachTile({ x: b.x + 4, y: b.y + 6, w: b.w - 8, h: b.h - 6 }, (tx, ty) => {
      const c = this.tile(tx, ty);
      return c === '^' || c === 'w' || (c === '~' && !b.boat);
    });
  };
  Room.prototype.hazardNear = function (b) {
    return Phys.eachTile({ x: b.x - T, y: b.y, w: b.w + 2 * T, h: b.h + T / 2 }, (tx, ty) => {
      const c = this.tile(tx, ty);
      return c === '^' || c === 'w' || (c === '~' && !b.boat);
    });
  };

  // ---------- Thế giới ----------
  const W = HSX.World = {
    room: null, enemies: [], boss: null, pickups: [], shots: [], fx: [], texts: [],
    cam: { x: 0, y: 0 }, lookX: 0, aimX: 0, aimY: 0, hitstop: 0, shake: 0, fade: 0, fadeTo: null,
    ui: [], flashes: [], corpses: [], kick: { x: 0, y: 0 }, hurtT: 0, orbPulse: 0, loi: [], xa: null,
    bannerData: null, mode: 'play', deadT: 0, dawnT: 0, victoryT: 0, hints: {}, prompt: null, tip: null, gains: {}, gainT: 0,
    chamT: 0, neLuc: -1e9,   // lướt né: thời gian chậm lại còn bao lâu, lần né gần nhất được thưởng (giờ chơi S.stats.time)
    nguonDau: null,          // thứ sắp làm Mầm mất máu (đặt ngay trước P.hurt), để nhật ký trận boss biết mất máu vì đâu
    banPha: false,           // đang xử lý hạt ná phá quái / đống rác: đồ rơi ra tự bay về Mầm (xem drop)

    init() {
      const S = HSX.S;
      S.level = HSX.roomLevel(S.bench.room);
      this.dawnT = Calc.levelDone() ? 99 : 0;
      this.load(S.bench.room, S.visited[S.bench.room] ? { bench: true } : { start: true });
    },

    // entry: { door, side, vx, vy } qua cửa · { bench } ở Trạm · { start } ở ô @. im: không hiện tên phòng.
    load(id, entry) {
      const S = HSX.S, P = HSX.Player, first = !S.visited[id], lv = HSX.roomLevel(id);
      if (this.boss && this.boss.active && !this.boss.dead) HSX.emit('hettran', { ketQua: 'roi' });   // rời phòng giữa trận boss
      if (lv !== S.level) { S.level = lv; this.dawnT = Calc.levelDone(lv) ? 99 : 0; }
      const r = this.room = new Room(id);
      this.enemies = []; this.boss = null; this.pickups = []; this.shots = []; this.fx = []; this.texts = [];
      this.flashes = []; this.corpses = []; this.loi = []; this.xa = null; this.chamT = 0; this.neLuc = -1e9;
      P.troi = 0;
      HSX.Truyen.cam = null;
      HSX.Render.tilesDirty = true;
      this.spawnEnemies();
      this.placePlayer(entry);
      S.visited[id] = true;
      HSX.Spirits.sync();
      HSX.Spirits.snap();
      this.camUpdate(0, true);
      if (!entry.im) this.banner(r.def.name, first ? 'Khu vực mới' : null, first ? 2.8 : 1.6);
      if (this.boss) HSX.Assets.loadBoss(this.boss.type);   // khung hoạt ảnh boss chỉ nạp khi vào phòng boss
      HSX.emit('room', r);
      HSX.saveGame();
    },

    // Đi sang màn khác (bản đồ thế giới ở Trạm, hoặc sau khi thắng màn trước): tới Trạm đã nghỉ gần nhất của màn đó,
    // chưa nghỉ lần nào thì tới chỗ bắt đầu màn
    travel(lv) {
      const S = HSX.S, L = HSX.LEVELS[lv];
      if (!L || !S.mo[lv]) return;
      const b = S.benches[lv];
      S.bench = b || { room: L.start, x: null, y: null };
      this.fadeTo = () => { this.mode = 'play'; this.load(S.bench.room, b ? { bench: true } : { start: true }); };
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
      if (this.chamT > 0) { this.chamT -= dt; dt *= 0.35; }   // vừa lướt né: thời gian chậm lại một nhịp
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
      HSX.Truyen.update(dt);
      if (this.mode === 'dead') {
        this.deadT -= dt;
        if (this.deadT <= 0) this.fadeTo = () => this.respawn();
        return;
      }
      if (Calc.levelDone() && this.dawnT < 99) this.dawnT += dt;
      // Đang diễn cảnh truyện: thế giới đứng yên, Mầm không nhận phím, camera theo cảnh
      if (HSX.Truyen.active()) {
        P.update(dt, this.room);
        HSX.Spirits.update(dt);
        this.enemies.forEach(e => { e.ph += dt; e.stT = (e.stT || 0) + dt; });
        this.camUpdate(dt);
        return;
      }
      if (this.hitstop > 0) { this.hitstop -= dt; return; }
      if (I.pressed('menu')) { HSX.UI.openPause('tui'); return; }
      if (I.pressed('inventory')) { HSX.UI.openPause('tui'); return; }
      if (I.pressed('map')) { HSX.UI.openPause('bando'); return; }

      S.stats.time += dt;
      if (this.victoryT > 0) { this.victoryT -= dt; if (this.victoryT <= 0) HSX.UI.showVictory(S.level); }

      P.update(dt, r);
      if (this.mode !== 'play' || this.fadeTo) return;
      if (HSX.HuongDan) HSX.HuongDan.update(dt);
      HSX.CotTruyen.vung();
      if (HSX.Truyen.active()) return;
      if (r.hazardAt(P.b)) { this.hazardHit(); return; }

      // Quái
      this.enemies.forEach(e => {
        HSX.Enemies.update(e, dt, r, P);
        if (!e.dead && e.y > r.h * T + 300) { e.dead = true; }
      });
      if (this.boss && !this.boss.active && !this.boss.dead && P.cx() > 7 * T) this.startBoss();
      // Sổ quái vật: quái lọt vào khung nhìn lần đầu thì ghi là đã gặp
      const cam = this.cam;
      this.enemies.forEach(e => {
        if (e.dead || (e.kind === 'boss' && !e.active) || (S.quai[e.type] && S.quai[e.type].seen)) return;
        if (e.x + e.w > cam.x && e.x < cam.x + HSX.VW && e.y + e.h > cam.y && e.y < cam.y + HSX.VH) Sys.quaiSeen(e.type);
      });
      const pb = { x: P.b.x + 3, y: P.b.y + 5, w: P.b.w - 6, h: P.b.h - 7 };
      // Boss đang sơ hở (kẹt, lún cát, choáng, lật ngửa...) thì chạm thân không mất máu: lao vào đánh lúc đó là đúng cách
      this.enemies.forEach(e => {
        if (e.dead || (e.kind === 'boss' && (!e.active || e.open > 0)) || !Phys.overlap(pb, e)) return;
        this.nguonDau = e.kind === 'boss' ? 'than:' + e.state : 'quai:' + e.type;
        P.hurt(1, e.x + e.w / 2);
      });
      this.enemies = this.enemies.filter(e => !e.dead || e === this.boss);

      this.updateShots(dt, pb);
      if (HSX.GhiTran) HSX.GhiTran.buoc(dt);
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
      this.nguonDau = 'dia_hinh';
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
      if (this.boss && this.boss.active && !this.boss.dead) HSX.emit('hettran', { ketQua: 'thua' });
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

    // Thêm năng lượng: đốm sáng bay từ chỗ trúng (x, y) về quả cầu năng lượng
    napNL(n, x, y) {
      const S = HSX.S, truoc = S.energy;
      S.energy = Math.min(99, S.energy + n);
      if (S.energy > truoc) this.orbs(x, y, Math.max(1, Math.round((S.energy - truoc) / 4)));
    },

    // ---------- Đòn chém ----------
    attack(box, dir) {
      const S = HSX.S, P = HSX.Player, r = this.room, dmg = Calc.weaponDmg(), ang = P.atkAng;
      let hit = false, pogo = false;
      const gain = (n, x, y) => this.napNL(n, x, y);
      // chỗ trúng: giữa phần giao của vùng chém và vật bị trúng
      const at = o => ({ x: (Math.max(box.x, o.x) + Math.min(box.x + box.w, o.x + o.w)) / 2, y: (Math.max(box.y, o.y) + Math.min(box.y + box.h, o.y + o.h)) / 2 });
      this.enemies.forEach(e => {
        if (e.dead || (e.kind === 'boss' && !e.active) || !Phys.overlap(box, e)) return;
        const res = HSX.Enemies.damage(e, dmg, P, dir), p = at(e);
        hit = true;
        if (res === 'giap') {   // boss đang thủ thế: tia lửa xám, ít năng lượng
          gain(dmg * 0.6, p.x, p.y);
          HSX.Audio.hit();
        } else if (res !== 'block') {
          gain(dmg * 2.2, p.x, p.y);
          if (res !== 'dead') HSX.Audio.hit();   // đòn chốt hạ: chỉ nghe tiếng chết (killEnemy)
        } else {
          // Quái đỡ đòn (block): âm thanh bật lại
          HSX.Audio.ricochet();
        }
        if (dir === 'down') pogo = true;
      });
      // Túi, lưới boss ném tới: chém đúng lúc (đợi nó tới sát, không chém bừa liên tục) thì phản lại, không thì chỉ phá được nó.
      // Đang nhấp nháy sau khi trúng đòn thì không phản được (lưới bay xuyên qua người rồi chém lại thì không tính)
      const dungLuc = P.chemLuc - P.chemTruoc >= 0.45 && P.inv <= 0;
      this.shots.forEach(s => {
        if ((s.type !== 'bag' && s.type !== 'net') || s.phan || s.huy || !Phys.overlap(box, s)) return;
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
        hit = true; gain(6, cx, cy);
        if (dir === 'down') pogo = true;
        if (dungLuc && Math.hypot(cx - P.cx(), cy - P.cy()) < 47 + s.w / 2) { this.phanLai(s, ang); return; }
        s.huy = true;
        this.burst(cx, cy, s.type === 'net' ? '#9fd3a8' : '#d8d0ff', 10);
        this.chips(cx, cy, s.type === 'net' ? LUOI : ['#e8e8f0', '#b9b9c9'], 5, 200);
      });
      // Lưới ma giăng: mỗi đòn trúng một tấm lưới là một nhát
      const luoi = {};
      Phys.eachTile(box, (tx, ty) => { if (r.tile(tx, ty) === 'n') luoi[this.tamLuoi(tx, ty)] = [tx, ty]; });
      for (const k in luoi) {
        const [tx, ty] = luoi[k];
        hit = true;
        if (dir === 'down') pogo = true;
        gain(3, tx * T + T / 2, ty * T + T / 2);
        this.chatLuoi(k, tx, ty, ang);
      }
      r.objs.slice().forEach(o => {
        if (o.type === 'heap' && Phys.overlap(box, { x: o.x + 2, y: o.y + 8, w: T - 4, h: T - 8 })) {
          hit = true; gain(4, o.x + T / 2, o.y + T / 2);
          HSX.Audio.breakHeap();
          if (dir === 'down') pogo = true;
          o.hp--; o.shake = 0.15;
          this.dust(o.x + T / 2, o.y + T - 8, 5);
          this.chips(o.x + T / 2, o.y + T / 2, RAC, 4, 220);
          this.spark(o.x + T / 2, o.y + T / 2, '#ffe9b0');
          if (o.hp <= 0) this.breakHeap(o);
        } else if (o.type === 'cage' && Phys.overlap(box, { x: o.x + 2, y: o.y - 30, w: T - 4, h: T + 30 })) {
          hit = true;
          if (!this.cageOpen()) { this.hint('cage', this.cageLockText()); this.spark(o.x + T / 2, o.y, '#c79bff'); return; }
          HSX.Audio.breakHeap();
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
      HSX.Audio.slam();
      this.shake = 14;
      this.hitstop = 0.06;
      this.dust(cx, feet, 14);
      this.burst(cx, feet - 6, '#e0a46a', 16);
      this.ring(cx, feet - 4, '#ffd9a0', 150, 0.35, 6);
      this.flash(cx, feet - 10, 220, '255,210,150', 0.25);
      HSX.emit('slam');
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
      // Đống rác bịt cống (phòng có xa): vỡ ra thì nước tù thoát đi
      if (r.def.xa && !S.flags['xa_' + r.id]) { this.xaNuoc(); if (this.xa) this.xa.cua = { x: tx * T + T / 2, y: ty * T }; }
      else this.text(tx * T + T / 2, ty * T - 10, 'Nền rác vỡ!', '#ffe08a', 18);
      HSX.saveGame();
    },

    // ---------- Nước ngập, lưới ma, cầu rễ (Màn 2) ----------
    xaNuoc() {
      const r = this.room, S = HSX.S, o = [];
      r.grid.forEach((row, y) => row.forEach((c, x) => { if (c === 'w') { o.push([x, y]); row[x] = '.'; } }));
      S.flags['xa_' + r.id] = true;
      if (!o.length) return;
      const ys = o.map(p => p[1]);
      this.xa = { t: 0, dur: 1.8, o, top: Math.min(...ys), bot: Math.max(...ys) + 1 };
      this.shake = 12;
      this.text(o[0][0] * T, o[0][1] * T - 20, 'Cống thông rồi!', '#bfe8ff', 20);
      this.banner('Nước đã thoát ra biển', 'Lối đi dưới lòng lạch đã lộ ra', 2.8);
      Sys.fact('trieu');
      HSX.emit('xa');
    },
    // Các ô n liền nhau là một tấm lưới; khoá của tấm là ô nhỏ nhất (theo hàng rồi cột)
    tamLuoi(tx, ty) {
      const r = this.room, seen = {}, q = [[tx, ty]];
      let best = ty * 1000 + tx;
      seen[tx + ',' + ty] = true;
      while (q.length) {
        const [x, y] = q.pop();
        best = Math.min(best, y * 1000 + x);
        [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(([a, b]) => {
          if (seen[a + ',' + b] || a < 0 || b < 0 || a >= r.w || b >= r.h || r.grid[b][a] !== 'n') return;
          seen[a + ',' + b] = true;
          q.push([a, b]);
        });
      }
      return best;
    },
    // Một nhát chém vào tấm lưới; 3 nhát thì đứt cả tấm
    chatLuoi(k, tx, ty, ang) {
      const r = this.room, x = tx * T + T / 2, y = ty * T + T / 2, o = new Set(), q = [[tx, ty]];
      r.luoiHp[k] = (r.luoiHp[k] === undefined ? 3 : r.luoiHp[k]) - 1;
      while (q.length) {   // cả tấm lưới rung lên
        const [a, b] = q.pop();
        if (o.has(a + ',' + b) || r.tile(a, b) !== 'n') continue;
        o.add(a + ',' + b);
        q.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
      }
      r.luoiRung = { o, t: 0.22 };
      this.hitFx(x, y, ang, '#9fd3a8');
      this.chips(x, y, LUOI, 4, 200);
      if (r.luoiHp[k] <= 0) this.catLuoi(tx, ty);
      else this.text(x, y - 24, r.luoiHp[k] === 2 ? 'Rách một mảng' : 'Sắp đứt!', '#d8f5dc', 14);
    },
    catLuoi(tx, ty) {
      const r = this.room, S = HSX.S, br = S.broken[r.id] = S.broken[r.id] || {}, q = [[tx, ty]], o = [];
      while (q.length) {
        const [x, y] = q.pop();
        if (x < 0 || y < 0 || x >= r.w || y >= r.h || r.grid[y][x] !== 'n') continue;
        r.grid[y][x] = '.';
        br[x + ',' + y] = true;
        o.push([x, y]);
        q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      if (!o.length) return;
      o.forEach(([x, y], i) => {
        this.chips(x * T + T / 2, y * T + T / 2, LUOI, 4, 240);
        if (i % 2 === 0) this.dust(x * T + T / 2, y * T + T / 2, 2);
      });
      const m = o[Math.floor(o.length / 2)], cx = m[0] * T + T / 2, cy = m[1] * T + T / 2;
      this.drop('luoi_cu', o.length > 4 ? 2 : 1, cx, cy);
      // một con vật mắc trong lưới được thả ra
      const ch = HSX.pick(['🐟', '🦀', '🐠', '🦐']);
      this.fxp({ k: 'emo', ch, x: cx, y: cy, vx: (Math.random() < 0.5 ? -1 : 1) * 220, vy: -380, g: 900, life: 1.6, r: 22, vr: 5 });
      this.text(cx, cy - 26, `Lưới đứt! ${ch} thoát ra`, '#bff5d6', 16);
      this.shake = 6;
      HSX.emit('luoi');
      Sys.fact('luoima');
      HSX.saveGame();
    },
    // Cây đước ở bãi bồi vừa lớn: rễ mọc thành cầu
    rootsGrown(idx) {
      const r = this.room;
      r.rootSegs.filter(s => s.idx === idx).forEach(s => {
        s.tiles.forEach(([x, y], i) => {
          this.fxp({ k: 'leaf', x: x * T + T / 2, y: y * T + 6, vx: (Math.random() - 0.5) * 90, vy: -80 - Math.random() * 90, g: 300,
            life: 0.9, r: 4, rot: Math.random() * 6, vr: 6, color: i % 2 ? '#7be08f' : '#b9e07b' });
          if (i % 2 === 0) this.fxp({ x: x * T + T / 2, y: y * T + 8, vy: -40, life: 1.1, r: 2, color: '#b8ffd0', add: true });
        });
        this.flash((s.x0 + s.x1 + 1) / 2 * T, s.y * T, 260, '160,255,190', 0.9);
      });
      this.banner('Rễ đước đã bắc thành cầu', 'Giờ đi qua được rồi', 2.4);
      HSX.emit('cau');
    },
    // Bong bóng thoại trên đầu một nhân vật (không dừng game)
    say(e, text, dur) { this.loi.push({ e, text, t: 0, dur: dur || 2.6 }); },
    // Lưới quăng ra theo đường vòng cung, rơi trúng chỗ (tx, ty) sau khoảng 0,85 giây
    netShot(x, y, tx, ty) {
      const tt = 0.85, g = 700;
      this.shots.push({ type: 'net', x: x - 22, y: y - 22, w: 44, h: 44, vx: (tx - x) / tt, vy: (ty - y) / tt - 0.5 * g * tt, g, life: 2.4, t: 0 });
    },
    // Rác bị hút vào một điểm (Vua Túi Nilon nuốt rác)
    hut(x, y) {
      const a = Math.random() * 6.283, d = 160 + Math.random() * 120;
      this.fxp({ k: 'chip', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, vx: -Math.cos(a) * d * 2.2, vy: -Math.sin(a) * d * 1.3,
        life: 0.45, r: 3 + Math.random() * 3, rot: Math.random() * 6, vr: 12, color: HSX.pick(RAC) });
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
      this.chips(o.x + T / 2, o.y + T / 2, RAC, 16, 380);
      this.dust(o.x + T / 2, o.y + T - 4, 8);
      this.ring(o.x + T / 2, o.y + T / 2, '#ffe9b0', 60, 0.3, 4);
      this.flash(o.x + T / 2, o.y + T / 2, 140, '255,233,176', 0.2);
      this.shake = 6;
      HSX.emit('heap', o);
      if (Calc.roomClean(r.id)) {
        const oDat = r.objs.some(x => x.type === 'plant' && x.dat !== 'boi');
        this.banner(`${r.def.name} đã sạch rác`, `Độ sạch tăng, ${HSX.LEVELS[S.level].goi} sáng hơn.${oDat ? ' Ô đất đã trồng được cây.' : ''}`, 2.6);
        Sys.checkSpecies();
      }
      HSX.saveGame();
    },

    // Đồ rơi văng ra rồi nằm chờ nhặt; hut: tự bay về Mầm dù ở xa (đồ rơi khi hạt ná phá quái, đống rác)
    drop(id, n, x, y) {
      for (let k = 0; k < n && this.pickups.length < 140; k++) {
        this.pickups.push({ id, x: x - 8, y: y - 8, w: 16, h: 16, vx: (Math.random() - 0.5) * 340, vy: -260 - Math.random() * 260, t: 0, hut: !!this.banPha });
      }
    },

    updatePickups(dt) {
      const P = HSX.Player, r = this.room, mag = Calc.magnet();
      this.pickups = this.pickups.filter(p => {
        p.t += dt;
        const dx = P.cx() - (p.x + 8), dy = P.cy() - (p.y + 8), dist = Math.hypot(dx, dy) || 1;
        if (p.t > 0.35 && (dist < mag || p.hut)) {
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
      HSX.Audio.kill();   // tiếng chết: mọi đường gây sát thương đều đi qua đây
      e.dead = true;
      S.stats.kills++;
      this.deathFx(e.x + e.w / 2, e.y + e.h / 2, e.def.chip || [e.def.color], Math.max(e.w, e.h));
      // xác: quái thường nảy trắng rồi tan trong 0,3 giây, boss diễn hoạt ảnh gục ngã
      this.corpses.push({ e, t: 0, dur: e.kind === 'boss' ? 2.6 : 0.3 });
      this.hitstop = Math.max(this.hitstop, 0.06);
      this.shake = Math.max(this.shake, 6);
      Sys.quaiKill(e.type);
      HSX.emit('kill', e);
      if (e.kind === 'boss') { this.bossDefeated(e); return; }
      // Hộp Xốp vỡ ra hai mảnh nhỏ nhảy loạn (không lưu, rời phòng thì mất)
      if (e.def.split && !e.temp) {
        [-1, 1].forEach(s => {
          this.spawnTemp(e.def.split, e.x + e.w / 2 - 12 + s * 10, e.y + e.h - 24);
          const m = this.enemies[this.enemies.length - 1];
          m.vx = s * 220; m.vy = -380; m.dir = s; m.t = 0.5;
        });
        this.text(e.x + e.w / 2, e.y - 10, 'Vỡ ra mảnh nhỏ!', '#f4f4ee', 15);
      }
      if (e.temp) return;
      (S.dead[r.id] = S.dead[r.id] || {})[e.idx] = true;
      e.def.drops.forEach(([id, ch]) => this.drop(id, HSX.roll(ch * Calc.dropMult()), e.x + e.w / 2, e.y + e.h / 2));
      this.drop('seed', HSX.roll(0.6 * Calc.seedMult()), e.x + e.w / 2, e.y + e.h / 2);
      if (r.def.cageLock === 'enemies' && r.objs.some(o => o.type === 'cage') && this.enemies.every(x => x.dead || x.temp)) {
        this.banner('Lồng đã mở khóa', 'Chém vỡ lồng để giải cứu tinh linh', 2.2);
      }
    },

    // Lần đầu gặp boss thì diễn cảnh truyện (js/cot_truyen.js: gap_<boss>) rồi mới đánh
    startBoss() {
      const b = this.boss;
      if (!HSX.Truyen.play('gap_' + b.type, { sau: () => this.batDauDanh(b) })) this.batDauDanh(b);
    },
    batDauDanh(b) {
      if (b !== this.boss || b.dead || b.active) return;
      b.active = true;
      this.room.locked = true;
      this.shake = 10;
      this.ring(b.x + b.w / 2, b.y + b.h / 2, '#c49bff', 280, 0.9, 8);
      this.flash(b.x + b.w / 2, b.y + b.h / 2, 320, '190,120,255', 0.6);
      this.banner(b.def.name, b.def.sub, 2.8);
      HSX.emit('trandau', b);
    },

    bossDefeated(e) {
      const S = HSX.S, r = this.room;
      HSX.emit('hettran', { ketQua: 'thang' });
      S.bosses[e.type] = true;
      r.locked = false;
      this.shake = 18;
      this.hitstop = 0.35;
      const bx = e.x + e.w / 2, by = e.y + e.h / 2;
      this.ring(bx, by, '#ffffff', 340, 0.8, 8);
      this.ring(bx, by, '#c49bff', 220, 1.1, 5);
      this.flash(bx, by, 520, '255,240,220', 1.2);
      for (const id in e.def.drops) this.drop(id, Math.min(12, e.def.drops[id]), e.x + e.w / 2, e.y + e.h / 2);
      for (const id in e.def.drops) if (e.def.drops[id] > 12) Sys.addItem(id, e.def.drops[id] - 12);
      this.drop('seed', 8, e.x + e.w / 2, e.y + e.h / 2);
      this.shots = [];
      this.loi = this.loi.filter(l => l.e !== e);
      HSX.Player.troi = 0;
      this.enemies.forEach(x => { if (x.temp && !x.dead) { x.dead = true; this.burst(x.x + x.w / 2, x.y + x.h / 2, '#d8d0ff', 12); } });
      // Boss cuối màn: trời sáng hẳn, diễn cảnh kết rồi hiện bảng tổng kết màn (không có cảnh thì hiện sau 5 giây)
      if (e.type === 'vua_nilon' || e.type === 'luoi_ma_khong_lo') {
        const lv = e.type === 'vua_nilon' ? 'm1' : 'm2';
        if (lv === 'm1') { S.dawn = true; S.mo.m2 = true; Sys.fact('nilon'); }
        S.xong[lv] = true;
        this.dawnT = 0;
        if (!HSX.Truyen.play('thua_' + e.type, { sau: () => HSX.UI.showVictory(lv) })) {
          this.victoryT = 5;
          this.banner(lv === 'm1' ? 'Bình minh trở lại' : 'Rừng bắt đầu hồi sinh', lv === 'm1' ? 'Sương Độc trên Bãi biển nhựa đã tan' : 'Lưới ma đã buông, cá tôm quay về', 4.5);
        }
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
      this.shots.push({ type: 'bag', x: x - 17, y: y - 17, w: 34, h: 34, vx: (Math.random() - 0.5) * 260, vy: -260, life: 5, t: Math.random() * 6 });
    },
    wave(x, feet, dir, speed) {
      this.shots.push({ type: 'wave', x: x - 20, y: feet - 30, w: 40, h: 30, vx: dir * speed, vy: 0, life: 3 });
    },
    // Vùng đánh của boss (kẹp càng, nổ túi, sập lưới): đứng trong vùng lúc nó còn là mất máu, bị hất ra xa tâm boss (tu)
    zone(x, y, w, h, life, kieu, dir, tu) {
      this.shots.push({ type: 'vung', kieu, dir: dir || 1, x, y, w, h, life, max: life, t: 0, tu });
    },
    // Vùng lưới quẫy là hình bầu dục nội tiếp hộp vùng: trúng khi điểm của hộp b gần tâm nhất nằm trong bầu dục
    trongElip(s, b) {
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, qx = HSX.clamp(cx, b.x, b.x + b.w), qy = HSX.clamp(cy, b.y, b.y + b.h);
      return ((qx - cx) / (s.w / 2)) ** 2 + ((qy - cy) / (s.h / 2)) ** 2 <= 1;
    },
    // Mưa túi (Vua Túi Nilon pha 2): 6 túi, bóng dưới đất báo chỗ rơi, giữa các túi chừa khe rộng để đứng
    muaTui() {
      const r = this.room, day = (r.h - 2) * T, buoc = (r.w - 3) * T / 6;
      for (let i = 0; i < 6; i++) {
        const x = T * 1.5 + (i + 0.3 + Math.random() * 0.4) * buoc, life = 0.9 + i * 0.06;
        this.shots.push({ type: 'bao', x: x - 22, y: day - 8, w: 44, h: 8, life, max: life });
      }
    },
    // Túi, lưới bị chém phản lại: bay theo hướng chém, gần đúng hướng boss thì tự lái về phía boss
    phanLai(s, ang) {
      const b = this.boss, cx = s.x + s.w / 2, cy = s.y + s.h / 2;
      let a = ang;
      if (b && b.active && !b.dead) {
        const ab = Math.atan2(b.y + b.h / 2 - cy, b.x + b.w / 2 - cx), d = Math.atan2(Math.sin(ab - ang), Math.cos(ab - ang));
        if (Math.abs(d) < 0.75) a = ab;
      }
      Object.assign(s, { phan: true, vx: Math.cos(a) * 780, vy: Math.sin(a) * 780, g: 0, life: 1.3 });
      this.ring(cx, cy, '#fff6c8', 50, 0.25, 3);
      this.spark(cx, cy, '#fff6c8');
      HSX.emit('phan');
    },

    // ---------- Ná Tái Chế ----------
    // Hạt nhựa bay vòng cung (tốc độ v, trọng lực g): trúng quái (mạnh bằng một nhát chém), túi / lưới đang bay,
    // lưới ma giăng, đống rác thì vỡ; ra khỏi phòng thì mất.
    // Trúng năng lượng theo đòn thực tế n = dmg * 0,2 (dmg = sát thương Vợt Bắt Rác × 2), giống như khi chém quái.
    // Quái, đống rác, lưới ma bị hạt ná phá thì đồ rơi ra tự bay về Mầm (banPha: drop đánh dấu hut), khỏi phải chạy tới nhặt.
    banHat(x, y, a, v, g) {
      this.shots.push({ type: 'hat', x: x - 6, y: y - 6, w: 12, h: 12, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g, life: 3, t: 0 });
      this.fxp({ k: 'glow', x, y, life: 0.12, r: 22, color: 'rgba(232,244,255,0.7)', add: true });
      this.kick.x -= Math.cos(a) * 2;
    },
    bayHat(s, dt) {
      const r = this.room, P = HSX.Player, tia = () => this.spark(s.x + s.w / 2, s.y + s.h / 2, '#e8f4ff');
      const pha = f => { this.banPha = true; const kq = f(); this.banPha = false; return kq; };   // đồ rơi trong lúc này tự bay về Mầm
      s.t += dt;
      for (let k = 0; k < 3; k++) {   // chia nhỏ bước: hạt bay nhanh không xuyên qua tường mỏng, quái nhỏ
        const ox = s.x, oy = s.y;     // vị trí trước bước nhỏ: biết hạt vào ô rắn từ hướng nào
        s.vy += s.g * dt / 3;
        s.x += s.vx * dt / 3;
        s.y += s.vy * dt / 3;
        const cx = s.x + s.w / 2, cy = s.y + s.h / 2, tx = Math.floor(cx / T), ty = Math.floor(cy / T), ang = Math.atan2(s.vy, s.vx);
        if (cx < 0 || cx > r.w * T || cy > r.h * T) return false;
        if (r.tile(tx, ty) === 'n') {
          tia();
          const dealt = Calc.weaponDmg() * 2;  // actual damage dealt by bullet
          this.napNL(dealt * 0.15, cx, cy);
          HSX.Audio.hit();  // âm thanh chạm sàn
          pha(() => this.chatLuoi(this.tamLuoi(tx, ty), tx, ty, ang));
          return false;
        }
        if (r.solid(tx, ty)) {
          this.dust(cx, cy, 2); this.spark(cx, cy, '#e8f4ff');
          // Vào ô rắn từ hàng phía trên → chạm mặt đất: tiếng trầm.
          // Còn lại (đâm ngang vào tường / từ dưới lên) → tiếng bật.
          const oty = Math.floor((oy + s.h / 2) / T);
          if (oty < ty) HSX.Audio.thud();
          else HSX.Audio.ricochet();
          return false;
        }
        const e = this.enemies.find(x => !x.dead && (x.kind !== 'boss' || x.active) && Phys.overlap(s, x));
        if (e) {
          const res = pha(() => HSX.Enemies.damage(e, Calc.weaponDmg() * 2, P, 'ban', cx));
          const dealt = res !== 'block' ? Calc.weaponDmg() * 2 : (res === 'giap' ? Calc.weaponDmg() * 2 * 0.4 : 0);
          const gain = res === 'giap' ? dealt * 0.15 : (res !== 'block' ? dealt * 0.55 : 0);
          if (res === 'giap') { this.spark(cx, cy, '#cfd3e0'); this.napNL(gain, cx, cy); }
          else if (res !== 'block') { this.hitFx(cx, cy, ang, (e.def.chip || [])[0]); this.napNL(gain, cx, cy); }
          // Âm thanh theo kết quả đòn: vỏ đỡ (0 sát thương) → bật lại; giáp boss (ăn 40%) → trúng giáp; còn lại → trúng đòn
          if (res === 'block') HSX.Audio.ricochet();
          else if (res === 'giap') HSX.Audio.armorHit();
          else if (res !== 'dead') HSX.Audio.hit();   // đòn chốt hạ: chỉ nghe tiếng chết (killEnemy)
          // quái bị hạ: killEnemy() lo tiếng chết (không gọi lại ở đây)
          return false;
        }
        const o = r.objs.find(x => x.type === 'heap' && Phys.overlap(s, { x: x.x + 2, y: x.y + 8, w: T - 4, h: T - 8 }));
        if (o) {
          tia();
          const dealt = Calc.weaponDmg() * 2;  // actual damage dealt by bullet on trash
          this.napNL(dealt * 0.2, cx, cy);
          o.hp--; o.shake = 0.15;
          this.chips(o.x + T / 2, o.y + T / 2, RAC, 4, 220);
          if (o.hp <= 0) pha(() => this.breakHeap(o));
          return false;
        }
        const sh = this.shots.find(x => (x.type === 'bag' || x.type === 'net') && !x.phan && !x.huy && Phys.overlap(s, x));
        if (sh) {
          sh.huy = true;
          const dealt = Calc.weaponDmg() * 2;  // actual damage dealt by bullet on bag/net
          this.napNL(dealt * 0.3, cx, cy);
          this.burst(sh.x + sh.w / 2, sh.y + sh.h / 2, sh.type === 'net' ? '#9fd3a8' : '#d8d0ff', 10);
          this.chips(sh.x + sh.w / 2, sh.y + sh.h / 2, sh.type === 'net' ? LUOI : ['#e8e8f0', '#b9b9c9'], 5, 200);
          return false;
        }
      }
      return s.life > 0;
    },
    // Túi / lưới đã bị chém phản lại: bay thẳng, trúng quái thì Enemies.phanDon lo phần còn lại
    bayPhan(s, dt) {
      const r = this.room;
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, mau = s.type === 'net' ? '#9fd3a8' : '#d8d0ff';
      if (r.solid(Math.floor(cx / T), Math.floor(cy / T))) { this.burst(cx, cy, mau, 10); return false; }
      const hop = s.type === 'net' ? { x: s.x + s.w * 0.2, y: s.y + s.h * 0.2, w: s.w * 0.6, h: s.h * 0.6 } : s;
      const e = this.enemies.find(x => !x.dead && (x.kind !== 'boss' || x.active) && Phys.overlap(hop, x));
      if (e) {
        this.burst(cx, cy, mau, 16);
        this.ring(cx, cy, '#fff6c8', 90, 0.35, 4);
        this.hitstop = Math.max(this.hitstop, 0.08);
        this.shake = Math.max(this.shake, 8);
        HSX.Enemies.phanDon(e, s.type, HSX.Player, cx);
        return false;
      }
      return s.life > 0;
    },

    // Lướt né: đang lướt mà dính đòn thì xuyên qua. Mỗi 1,5 giây được thưởng một lần: thời gian chậm lại, thêm năng lượng.
    luotNe(P, nguon) {
      P.inv = Math.max(P.inv, 0.4);
      const now = HSX.S.stats.time, thuong = now - this.neLuc >= 1.5;
      HSX.emit('luotne', { nguon, thuong });
      if (!thuong) return;
      this.neLuc = now;
      const S = HSX.S, truoc = S.energy;
      this.chamT = 0.45;
      S.energy = Math.min(99, S.energy + 11);
      if (S.energy > truoc) this.orbs(P.cx(), P.cy(), 3);
      this.text(P.cx(), P.b.y - 14, 'Né!', '#bff5ff', 18);
      this.ring(P.cx(), P.cy(), '#bff5ff', 70, 0.35, 3);
      this.flash(P.cx(), P.cy(), 160, '190,245,255', 0.3);
    },

    updateShots(dt, pb) {
      const P = HSX.Player, r = this.room, moi = [];
      this.shots = this.shots.filter(s => {
        if (s.huy) return false;
        s.life -= dt;
        // của Mầm: hạt ná, túi / lưới đã bị chém phản lại
        if (s.type === 'hat') return this.bayHat(s, dt);
        if (s.phan) return this.bayPhan(s, dt);
        if (s.type === 'bao') {   // bóng báo chỗ túi sắp rơi (mưa túi): hết giờ thì túi rơi từ trần xuống
          if (s.life <= 0) moi.push({ type: 'bag', roi: true, x: s.x + s.w / 2 - 17, y: T * 0.6, w: 34, h: 34, vx: 0, vy: 150, life: 3, t: Math.random() * 6 });
          return s.life > 0;
        }
        if (s.type === 'bag' && s.roi) {
          s.t += dt;
          s.vy = Math.min(900, s.vy + 1500 * dt);
          s.y += s.vy * dt;
          if (r.solid(Math.floor((s.x + s.w / 2) / T), Math.floor((s.y + s.h) / T))) {
            this.burst(s.x + s.w / 2, s.y + s.h - 4, '#d8d0ff', 8);
            this.dust(s.x + s.w / 2, s.y + s.h, 3);
            return false;
          }
        } else if (s.type === 'vung') {
          s.t += dt;
        } else if (s.type === 'bag') {
          s.t += dt;
          const dx = P.cx() - (s.x + s.w / 2), dy = P.cy() - (s.y + s.h / 2), d = Math.hypot(dx, dy) || 1;
          s.vx += (dx / d * 170 - s.vx) * dt * 1.4;
          s.vy += (dy / d * 170 - s.vy) * dt * 1.4 + Math.sin(s.t * 4) * 20 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
        } else if (s.type === 'net') {
          // lưới bay vòng cung, xòe rộng dần; chạm đất / tường thì rũ xuống rồi tan
          s.t += dt;
          s.vy += s.g * dt;
          const cx = s.x + s.w / 2 + s.vx * dt, cy = s.y + s.h / 2 + s.vy * dt, sz = Math.min(96, 44 + s.t * 75);
          s.w = s.h = sz;
          s.x = cx - sz / 2;
          s.y = cy - sz / 2;
          if (r.solid(Math.floor(cx / T), Math.floor((cy + sz * 0.3) / T))) {
            this.chips(cx, cy, LUOI, 6, 160);
            this.dust(cx, cy + sz * 0.3, 3);
            return false;
          }
        } else {
          s.x += s.vx * dt;
          const tx = Math.floor((s.vx > 0 ? s.x + s.w : s.x) / T);
          if (r.solid(tx, Math.floor((s.y + s.h / 2) / T))) { this.dust(s.x + s.w / 2, s.y + s.h, 6); return false; }
          if (Math.random() < 0.5) this.dust(s.x + s.w / 2, s.y + s.h, 1);
        }
        if (s.kieu === 'quay' ? this.trongElip(s, pb) : Phys.overlap(s.type === 'net' ? { x: s.x + s.w * 0.2, y: s.y + s.h * 0.2, w: s.w * 0.6, h: s.h * 0.6 } : s, pb)) {
          this.nguonDau = 'dan:' + s.type + (s.roi ? ':roi' : s.kieu ? ':' + s.kieu : '');
          const dau = P.hurt(1, s.tu !== undefined ? s.tu : s.x + s.w / 2);
          if (s.type === 'bag') { this.burst(s.x + s.w / 2, s.y + s.h / 2, '#d8d0ff', 8); return false; }
          // lưới trùm trúng: Mầm bị quấn, chém liên tục để thoát
          if (s.type === 'net' && dau) { P.troi = 1.1; this.chips(P.cx(), P.cy(), LUOI, 8, 180); HSX.emit('quan'); return false; }
        }
        return s.life > 0;
      }).concat(moi);
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
      const sp = D.spirits[o.spirit];
      this.burst(o.x + T / 2, o.y, sp.color, 40);
      this.chips(o.x + T / 2, o.y, ['#5e2f86', '#8a4fc0', '#3a2a1a'], 14, 420);
      this.ring(o.x + T / 2, o.y, sp.color, 150, 0.7, 6);
      this.ring(o.x + T / 2, o.y, '#ffffff', 90, 0.45, 3);
      this.flash(o.x + T / 2, o.y, 360, sp.glow, 0.9);
      this.shake = 8;
      HSX.emit('rescue', o.spirit);
      HSX.saveGame();
      // tinh linh nói chuyện với Mầm (js/cot_truyen.js: cuu_<id>), xong thì hiện thẻ khả năng mới
      const the = () => HSX.UI.showSpirit(o.spirit);
      if (!HSX.Truyen.play('cuu_' + o.spirit, { sau: the })) the();
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
        if (o.type === 'npc') return { kind: 'npc', label: 'Trò chuyện', o, x: ox, y: o.y - 72 };
        if (o.type === 'plant') {
          const t = (S.trees[r.id] || {})[o.idx];
          if (!t) return { kind: 'plant', label: o.dat === 'boi' ? 'Cắm trụ mầm đước' : 'Trồng cây', o, x: ox, y: o.y - 10 };
        }
      }
      for (const g of r.gates) {
        if (gateSolved()) break;
        if (Math.abs(cx - (g.x + T / 2)) < 80 && Math.abs(feet - (g.y + T)) < T * 3.2) {
          const top = Math.min(...r.gates.map(x => x.y));
          const nhan = S.level === 'm2' ? 'Mở Cổng Rừng' : 'Mở Cổng Phân Loại';
          return { kind: 'gate', label: nhan, x: g.x + T / 2, y: top - 16 };
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
          this.ring(it.o.x + T / 2, it.o.y + 10, '#9ff0b5', 90, 0.5, 4);
          HSX.emit('rest');
          HSX.UI.openBench(gifts);
          break;
        }
        case 'journal': Sys.readJournal(it.o.n); break;
        case 'npc': HSX.CotTruyen.npc(it.o.npc); break;
        case 'plant':
          // bãi bồi: trồng được ngay khi đã học cách trồng đước từ Mẹ Đước; ô đất thường: phải dọn sạch rác trong phòng trước
          if (it.o.dat === 'boi' && !S.flags.trongDuoc) HSX.UI.toast('Bãi bồi ngập bùn, cây thường không sống nổi. Ai trong rừng này biết cách trồng cây ở đây nhỉ?');
          else if (it.o.dat !== 'boi' && !Calc.roomClean(r.id)) HSX.UI.toast('Phá hết đống rác trong phòng này trước, đất mới trồng được cây.');
          else HSX.UI.openPlant(r.id, it.o.idx, it.o.dat);
          break;
        case 'pick': P.carry = it.o; it.o.held = true; break;
        case 'drop': this.dropCarry(P); break;
        case 'nest':
          HSX.UI.toast(S.owned.rao_chan
            ? (S.species.rua_bien ? 'Rùa mẹ đã về đẻ trứng ở đây 🐢' : 'Rào chắn đã dựng. Rùa mẹ sẽ về khi bãi biển đủ sạch.')
            : 'Ổ trứng rùa không được bảo vệ. Cần 🚧 Rào Chắn Ổ Trứng (chế ở Trạm).');
          break;
        case 'gate': {
          const m2 = S.level === 'm2';
          const need = HSX.LEVELS[S.level].gateClean;
          if (Calc.cleanPct() < need) {
            const noi = m2
              ? `Cổng chỉ mở khi ${HSX.LEVELS[S.level].goi} sạch ít nhất ${HSX.pct(need)}. Hiện tại: ${HSX.pct(Calc.cleanPct())}. Hãy dọn thêm rác.`
              : `Cổng chỉ mở khi bãi biển sạch ít nhất ${HSX.pct(need)}. Hiện tại: ${HSX.pct(Calc.cleanPct())}. Hãy phá thêm đống rác.`;
            HSX.UI.toast(noi);
          } else if (m2) HSX.Puzzle2.open();
          else HSX.Puzzle.open();
          break;
        }
      }
    },

    findTip() {
      const P = HSX.Player, tips = this.room.def.tips || [], feet = P.b.y + P.b.h;
      for (const t of tips) {
        if (t.khi && !t.khi()) continue;
        if (Math.abs(P.cx() - (t.x * T + T / 2)) < 3 * T && Math.abs(feet - (t.y + 1) * T) < 3 * T) return t;
      }
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
      const P = HSX.Player, r = this.room, VW = HSX.VW, VH = HSX.VH, rw = r.w * T, rh = r.h * T, I = HSX.Input;
      // Lia theo chuột: con trỏ lệch khỏi giữa màn hình bao nhiêu thì khung nhìn dịch theo một phần chừng đó
      // (độ mạnh chỉnh trong Cài đặt). Chuột đứng yên 2,5 giây hoặc ra khỏi màn chơi thì trả về như cũ.
      const kc = HSX.opt.camChuot, chuot = kc > 0 && !I.usingTouch && performance.now() - I.mouse.t < 2500;
      const ax = chuot ? HSX.clamp((I.mouse.x - VW / 2) * kc, -170, 170) : 0;
      const ay = chuot ? HSX.clamp((I.mouse.y - VH / 2) * kc, -110, 110) : 0;
      const ke = snap ? 1 : Math.min(1, dt * 4);
      this.aimX += (ax - this.aimX) * ke;
      this.aimY += (ay - this.aimY) * ke;
      this.lookX += ((chuot ? 0 : P.face * 60) - this.lookX) * (snap ? 1 : Math.min(1, dt * 1.8));
      let tx = P.cx() + this.lookX + this.aimX - VW / 2, ty = P.cy() - VH / 2 - 20 + P.look + this.aimY;
      // Trận boss: khung nhìn đặt giữa Mầm và boss để thấy cả hai
      const bo = this.boss, tc = HSX.Truyen.cam;
      if (bo && bo.active && !bo.dead) tx = P.cx() * 0.6 + (bo.x + bo.w / 2) * 0.4 + this.aimX * 0.5 - VW / 2;
      // Cảnh truyện: camera nhìn về chỗ cảnh chỉ định (lia chậm)
      if (tc) { tx = tc.x - VW / 2; ty = tc.y - VH / 2; }
      tx = rw <= VW ? (rw - VW) / 2 : HSX.clamp(tx, 0, rw - VW);
      ty = rh <= VH ? (rh - VH) / 2 : HSX.clamp(ty, 0, rh - VH);
      if (snap) { this.cam.x = tx; this.cam.y = ty; return; }
      const k = Math.min(1, dt * (tc ? 2.6 : 7));
      this.cam.x += (tx - this.cam.x) * k;
      this.cam.y += (ty - this.cam.y) * k;
    },

    // ---------- Ánh sáng ----------
    // Mức sáng nền: tối nhất lúc đầu, sáng dần theo độ sạch và số tinh linh. Phòng boss tối cho tới khi thắng.
    ambient() {
      const r = this.room, S = HSX.S;
      if (r.def.boss && !S.bosses[r.def.boss]) return 0.04;
      let a = 0.06 + Calc.cleanPct() * 0.55 + Calc.spiritCount() * 0.04;
      if (r.def.area === 'hang' || r.def.area === 'hang_re') a -= 0.03;
      a = HSX.clamp(a, 0.04, 0.85);
      if (Calc.levelDone()) a = lerp(a, 1, Math.min(1, this.dawnT / 4));
      void S;
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
        else if (o.type === 'npc') L.push({ x: cx, y: cy - 34, r: 130, glow: '255,214,160' });
        else if (o.type === 'hut') L.push({ x: cx + 46, y: cy - 150, r: 170, glow: '255,196,120' });
        else if (o.type === 'plant' && trees[o.idx]) {
          const t = trees[o.idx], d = D.trees[t.type];
          // Bần không tự phát sáng: ánh sáng ấm là của đom đóm tụ về
          const domDom = t.type === 'ban' && S.species.dom_dom && t.g >= 1;
          L.push({
            x: cx, y: cy - 30,
            r: (domDom ? 130 : d.light) * (0.3 + 0.7 * t.g),
            glow: domDom ? '230,255,150' : (t.g >= 1 ? '180,255,170' : null),
          });
        }
      });
      // rễ đước phát sáng yếu dọc theo cầu
      r.rootSegs.forEach(sg => {
        const g = r.rootGrow(sg.x0, sg.y);
        if (g < 0.25) return;
        for (let x = sg.x0; x <= sg.x1; x += 3) L.push({ x: x * T + T, y: sg.y * T + 14, r: 85 * g, glow: '140,255,190' });
      });
      r.gates.forEach(g => { if (!gateSolved()) L.push({ x: g.x + T / 2, y: g.y + T / 2, r: 50, glow: S.level === 'm2' ? '120,255,200' : '120,200,255' }); });
      this.enemies.forEach(e => {
        if (e.dead) return;
        if (e.kind === 'boss') L.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 210, glow: '170,90,255' });
        else if (e.type === 'luoi_ma') L.push({ x: e.x + e.w / 2, y: e.y + e.h / 3, r: 45, glow: '190,110,255' });
      });
      this.shots.forEach(s => { if (s.type === 'bag') L.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, r: 40, glow: '180,140,255' }); });
      this.flashes.forEach(f => L.push({ x: f.x, y: f.y, r: f.r * (0.4 + 0.6 * f.life / f.max), glow: f.glow, bloom: 0.4 }));
      return L;
    },

    // ---------- Hiệu ứng ----------
    banner(text, sub, dur) { this.bannerData = { text, sub, t: 0, dur: dur || 2.4 }; },
    text(x, y, s, color, size) {
      this.texts.push({ x, y, s: String(s), color: color || '#fff', size: size || 16, life: 1.2, max: 1.2 });
      if (this.texts.length > 40) this.texts.shift();
    },
    // ---------- Hạt hiệu ứng ----------
    // k: 'dot' chấm, 'chip' mảnh vụn xoay, 'smoke' khói loang, 'leaf' lá xoay: vẽ trong cảnh nên bị chiếu sáng như cảnh.
    // add: vẽ cộng sáng SAU lớp ánh sáng nên luôn rực trong bóng tối: 'dot', 'streak' vệt theo hướng bay,
    // 'ring' vòng sóng lan từ r tới r1, 'glow' đốm sáng mềm, 'cut' vệt chém trắng cắt ngang chỗ trúng.
    fxp(o) {
      const p = Object.assign({ vx: 0, vy: 0, g: 0, drag: 0, life: 0.5, r: 2, k: 'dot', rot: 0, vr: 0 }, o);
      p.max = p.life;
      this.fx.push(p);
      return p;
    },
    burst(x, y, color, n) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * 6.283, sp = 60 + Math.random() * 220;
        this.fxp({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, g: 500, life: 0.5 + Math.random() * 0.4, color, r: 1.5 + Math.random() * 2.5, add: k % 3 === 0 });
      }
      this.fxp({ k: 'glow', x, y, life: 0.25, r: 26 + n, color, add: true });
    },
    spark(x, y, color) {
      for (let k = 0; k < 6; k++) {
        const a = Math.random() * 6.283, sp = 260 + Math.random() * 260;
        this.fxp({ k: 'streak', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 6, life: 0.2, r: 2, color, add: true });
      }
    },
    dust(x, y, n) {
      for (let k = 0; k < n; k++) {
        this.fxp({ k: 'smoke', x: x + (Math.random() - 0.5) * 20, y: y - 3, vx: (Math.random() - 0.5) * 160, vy: -20 - Math.random() * 70,
          drag: 3, g: -20, life: 0.45 + Math.random() * 0.3, r: 4 + Math.random() * 4, color: '#cdb98f' });
      }
    },
    chips(x, y, colors, n, sp) {
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, v = (sp || 300) * (0.5 + Math.random());
        this.fxp({ k: 'chip', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 1300, life: 0.6 + Math.random() * 0.5,
          r: 2.5 + Math.random() * 3.5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20, color: colors[k % colors.length] });
      }
    },
    ring(x, y, color, r1, life, w) { this.fxp({ k: 'ring', x, y, r: 4, r1, life: life || 0.3, w: w || 4, color, add: true }); },
    // Chớp sáng ngắn (đòn trúng, nổ): soi sáng cả xung quanh trong phòng tối
    flash(x, y, r, glow, life) { this.flashes.push({ x, y, r, glow, life: life || 0.15, max: life || 0.15 }); },
    // Đòn trúng: tia lửa bắn theo hướng chém, vệt chém trắng cắt ngang, vòng sóng, chớp sáng
    hitFx(x, y, ang, color) {
      const c = color || '#ffffff';
      for (let k = 0; k < 8; k++) {
        const a = ang + (Math.random() - 0.5) * 1.5, sp = 380 + Math.random() * 520;
        this.fxp({ k: 'streak', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 7, life: 0.16 + Math.random() * 0.1, r: 2.2, color: k % 2 ? c : '#ffffff', add: true });
      }
      this.fxp({ k: 'cut', x, y, rot: ang + Math.PI / 2 + (Math.random() - 0.5) * 0.5, life: 0.13, r: 46, color: '#ffffff', add: true });
      this.ring(x, y, '#ffffff', 44, 0.2, 3);
      this.fxp({ k: 'glow', x, y, life: 0.1, r: 26, color: 'rgba(255,255,255,0.55)', add: true });
      this.flash(x, y, 90, '255,244,220', 0.1);
    },
    // Quái tan biến: mảnh vụn đúng chất liệu của nó, khói độc tím, đốm xanh bay lên (rác đã được dọn)
    deathFx(x, y, colors, size) {
      this.chips(x, y, colors, Math.round(10 + size * 0.12), 320);
      for (let k = 0; k < 6; k++) {
        this.fxp({ k: 'smoke', x: x + (Math.random() - 0.5) * size * 0.5, y: y + (Math.random() - 0.5) * size * 0.4, vx: (Math.random() - 0.5) * 80,
          vy: -30 - Math.random() * 40, drag: 2, life: 0.7 + Math.random() * 0.4, r: size * 0.12 + Math.random() * 8, color: '#5a3d78' });
      }
      for (let k = 0; k < 7; k++) {
        this.fxp({ x: x + (Math.random() - 0.5) * size * 0.5, y, vx: (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 90, drag: 1,
          life: 0.9 + Math.random() * 0.8, r: 1.5 + Math.random() * 1.5, color: '#9ff0b5', add: true });
      }
      this.ring(x, y, '#c49bff', size * 0.9, 0.35, 5);
      this.fxp({ k: 'glow', x, y, life: 0.3, r: size * 0.8, color: '#e6d5ff', add: true });
      this.flash(x, y, 160 + size, '200,160,255', 0.3);
    },
    // Năng lượng bay về quả cầu ở góc màn hình (toạ độ màn hình)
    orbs(x, y, n) {
      for (let k = 0; k < n; k++) {
        const a = Math.random() * 6.283;
        this.ui.push({ x: x - this.cam.x, y: y - this.cam.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260 - 120, t: -k * 0.04 });
      }
    },
    updateFx(dt) {
      this.fx.forEach(p => {
        p.life -= dt;
        if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      });
      this.fx = this.fx.filter(p => p.life > 0);
      if (this.fx.length > 500) this.fx.splice(0, this.fx.length - 500);
      // năng lượng: bung ra rồi bị hút dần về quả cầu năng lượng (54, 56)
      this.ui = this.ui.filter(o => {
        o.t += dt;
        if (o.t < 0) return true;
        const dx = 54 - o.x, dy = 56 - o.y, d = Math.hypot(dx, dy) || 1, pull = Math.min(1, o.t * 1.6) * 2600, f = Math.exp(-3 * dt);
        o.vx = (o.vx + dx / d * pull * dt) * f;
        o.vy = (o.vy + dy / d * pull * dt) * f;
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if (d < 22 || o.t > 2) { this.orbPulse = 1; return false; }
        return true;
      });
      this.orbPulse = Math.max(0, this.orbPulse - dt * 3);
      this.flashes.forEach(f => { f.life -= dt; });
      this.flashes = this.flashes.filter(f => f.life > 0);
      this.corpses.forEach(c => {
        c.t += dt;
        // boss biết bay (Lưới Ma Khổng Lồ) gục xuống rơi chạm đất rồi mới thành đống lưới
        if (c.e.kind === 'boss' && c.e.def.fly && this.room) {
          c.e.vy = Math.min(900, Math.max(0, c.e.vy) + 1400 * dt);
          c.e.y = Math.min((this.room.h - 2) * T - c.e.h, c.e.y + c.e.vy * dt);
        }
      });
      this.corpses = this.corpses.filter(c => c.t < c.dur);
      this.hurtT = Math.max(0, this.hurtT - dt);
      const kf = Math.exp(-14 * dt);
      this.kick.x *= kf;
      this.kick.y *= kf;
      this.texts.forEach(t => { t.life -= dt; t.y -= 28 * dt; });
      this.texts = this.texts.filter(t => t.life > 0);
      this.loi.forEach(l => { l.t += dt; });
      this.loi = this.loi.filter(l => l.t < l.dur);
      const rr = this.room && this.room.luoiRung;
      if (rr) { rr.t -= dt; if (rr.t <= 0) this.room.luoiRung = null; }
      // nước thoát qua cống vừa vỡ: tia nước bắn ra
      if (this.xa) {
        const x = this.xa;
        x.t += dt;
        if (x.cua && x.t < x.dur * 0.8) {
          for (let k = 0; k < 2; k++) {
            this.fxp({ x: x.cua.x + (Math.random() - 0.5) * 50, y: x.cua.y + 20 + Math.random() * 90, vx: 160 + Math.random() * 260, vy: -120 + Math.random() * 160,
              g: 900, life: 0.5 + Math.random() * 0.3, r: 2 + Math.random() * 2.5, color: k ? '#8fc9d6' : '#5f9fae' });
          }
        }
        if (x.t >= x.dur) this.xa = null;
      }
    },
  };
})();
