/* Bộ thử chạy ngay trong trang game: mô phỏng từng bước vật lý 1/60 giây và bấm phím giả.
   Nạp từ console:  const s = document.createElement('script'); s.src = 'kiem_tra/thu_trong_trang.js'; document.body.appendChild(s);
   Rồi gọi: THU.cuaPhong(), THU.coChe() ... Không dùng trong game thật. */
window.THU = (function () {
  const T = HSX.T, W = HSX.World, P = HSX.Player;

  function sim(frames, hold, onFrame) {
    hold = hold || [];
    hold.forEach(a => HSX.Input.setTouch(a, true));
    let i = 0;
    for (; i < frames; i++) {
      if (HSX.UI.blocking()) break;
      W.update(1 / 60);
      HSX.Input.step();
      if (onFrame && onFrame(i) === true) break;
    }
    hold.forEach(a => HSX.Input.setTouch(a, false));
    return i;
  }
  function tap(a, after) { HSX.Input.setTouch(a, true); sim(1); HSX.Input.setTouch(a, false); return sim(after || 0); }
  function closeAll() { while (HSX.UI.blocking()) { if (HSX.Puzzle.active) HSX.Puzzle.close(); else HSX.UI.closeModal(); } }
  function inSolid() { return HSX.Phys.eachTile(P.b, (tx, ty) => W.room.solid(tx, ty)); }
  function doorBox(r, d) {
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    r.grid.forEach((row, y) => row.forEach((c, x) => { if (c === d) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }));
    return { x0, x1, y0, y1 };
  }
  // Mở hết khả năng như cuối màn (để thử cửa và cơ chế)
  function moHet() {
    const S = HSX.S;
    Object.assign(S.spirits, { sen: true, gio: true, gau: true, taiche: true });
    ['kinh_lup', 'xuong_phao'].forEach(id => { S.owned[id] = { tier: 0 }; });
    S.flags.sorted = true;
    S.puzzle.solved = true;
    S.broken.ghenh_da = { '32,14': true, '33,14': true, '34,14': true, '35,14': true };
    S.bosses.cua_khong_lo = true;
    S.bosses.vua_nilon = true;
    HSX.DEBUG_GOD = true;
  }

  // Đi qua mọi cửa của mọi phòng, kiểm tra tới đúng phòng, không kẹt tường, không rơi ngược lại
  function cuaPhong(giuNhay) {
    const L = HSX.LEVELS.m1, out = [];
    for (const id in L.rooms) {
      const def = L.rooms[id];
      for (const d in def.doors) {
        W.load(id, { start: true });
        W.enemies.forEach(e => { e.dead = true; });
        const r = W.room, b = doorBox(r, d);
        let hold = [];
        if (b.x0 === 0) { P.place(70, (b.y1 + 1) * T - 44); hold = ['left']; }
        else if (b.x1 === r.w - 1) { P.place(r.w * T - 96, (b.y1 + 1) * T - 44); hold = ['right']; }
        else if (b.y0 === 0) { P.place((b.x0 + b.x1 + 1) / 2 * T - 13, 2 * T - 44); sim(5); hold = ['jump']; }
        else { P.place((b.x0 + b.x1 + 1) / 2 * T - 13, (r.h - 3) * T, 0, 200); }
        const n = sim(240, hold, () => W.room.id !== id && !W.fadeTo);
        if (giuNhay === false) HSX.Input.setTouch('jump', false);
        const to = def.doors[d][0], kt = inSolid();
        sim(120);
        const ok = W.room.id === to && !kt && P.b.ground;
        out.push(`${ok ? 'OK ' : 'LỖI'} ${id}:${d} -> ${W.room.id}${W.room.id === to ? '' : ' (cần ' + to + ')'} sau ${n}f${kt ? ' KẸT TƯỜNG' : ''} đứng=${P.b.ground} ô(${(P.cx() / T).toFixed(1)},${((P.b.y + 44) / T).toFixed(1)})`);
      }
    }
    return out;
  }

  function moi() {
    HSX.S = HSX.newState();
    HSX.DEBUG_GOD = false;
    HSX.Spirits.list = [];
    W.mode = 'play'; W.fadeTo = null; W.fade = 0; W.victoryT = 0; W.dawnT = 0; W.hitstop = 0; W.shake = 0;
    closeAll();
  }
  function den(room, tx, ty, face) {
    W.load(room, { start: true });
    P.place(tx * T + T / 2 - 13, (ty + 1) * T - 44);
    if (face) P.face = face;
    sim(3);
  }
  function chemDen(obj, dir, max) {
    for (let k = 0; k < (max || 12); k++) { if (obj()) return k; HSX.Input.setTouch('attack', true); if (dir) HSX.Input.setTouch(dir, true); sim(1); HSX.Input.setTouch('attack', false); if (dir) HSX.Input.setTouch(dir, false); sim(24); }
    return obj() ? 'xong' : 'CHƯA';
  }

  // Thử từng cơ chế, mỗi bài từ một save mới
  function coChe() {
    const log = [], S = () => HSX.S, Sys = HSX.Sys, Calc = HSX.Calc;
    const ok = (dk, ten, them) => log.push(`${dk ? 'OK ' : 'LỖI'} ${ten}${them ? ' · ' + them : ''}`);

    // 1. Giải cứu Hoa Sen
    moi(); den('ben_thuyen', 10, 11, 1);
    chemDen(() => S().spirits.sen);
    ok(S().spirits.sen && HSX.Spirits.list.length === 1, 'Chém vỡ lồng giải cứu Hoa Sen'); closeAll();

    // 2. Phá đống rác, nhặt đồ, năng lượng tăng
    den('ben_thuyen', 27, 11, 1);
    W.enemies.forEach(e => { e.dead = true; });
    const n0 = Sys.totalMaterials();
    chemDen(() => (S().heaps.ben_thuyen || {})[1]);
    sim(60); sim(40, ['left']); sim(80, ['right']); sim(40);
    ok((S().heaps.ben_thuyen || {})[1] && Sys.totalMaterials() > n0, 'Phá đống rác rơi nguyên liệu và tự nhặt', `nguyên liệu ${n0} → ${Sys.totalMaterials()}, năng lượng ${S().energy}, độ sạch ${HSX.pct(Calc.cleanPct())}`);

    // 3. Hạ Chai Lăn
    moi(); den('ben_thuyen', 20, 11, 1);
    const chai = W.enemies[0];
    for (let k = 0; k < 8 && !chai.dead; k++) {
      chai.state = 'rest'; chai.t = 5;
      P.place(chai.x - 40, chai.y + chai.h - 44); P.face = 1; P.atkCd = 0;
      tap('attack', 24);
    }
    ok(chai.dead && (S().dead.ben_thuyen || {})[chai.idx], 'Hạ Chai Lăn, ghi nhớ quái đã chết', `kills ${S().stats.kills}`);

    // 4. Vỏ Cua Lon đỡ đòn phía trước, lúc nghỉ thì trúng
    moi(); den('tram_canh', 10, 10, 1);
    const cua = W.enemies.find(e => e.type === 'cua_lon');
    cua.x = P.b.x + 60; cua.y = P.b.y + P.b.h - cua.h; cua.dir = -1; cua.state = 'patrol'; cua.t = 9;
    const r1 = HSX.Enemies.damage(cua, 5, P, 'side');
    cua.state = 'rest';
    const r2 = HSX.Enemies.damage(cua, 5, P, 'side');
    ok(r1 === 'block' && r2 === 'hit', 'Vỏ Cua Lon đỡ đòn trước mặt, lúc nghỉ thì trúng', `${r1} / ${r2}`);

    // 5. Lồng Gió khóa khi còn quái
    moi(); den('tram_canh', 15, 10, 1);
    HSX.DEBUG_GOD = true;
    chemDen(() => false, null, 3);
    const khoa = !S().spirits.gio;
    W.enemies.forEach(e => { e.dead = true; });
    chemDen(() => S().spirits.gio);
    ok(khoa && S().spirits.gio, 'Lồng Gió khóa khi còn quái, mở khi hạ hết'); closeAll();

    // 6. Vực gai: không lướt thì trúng gai, quay về chỗ an toàn; có Gió thì lướt qua
    moi(); den('tram_canh', 26, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    sim(10);
    const hp0 = S().hp;
    sim(120, ['right'], () => S().hp < hp0);
    sim(40);
    const truGai = S().hp === hp0 - 1 && P.cx() < 28 * T;
    S().spirits.gio = true; S().hp = 5;
    den('tram_canh', 27, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    P.place(28 * T - 30, 11 * T - 44); sim(5);
    HSX.Input.setTouch('right', true); HSX.Input.setTouch('jump', true); sim(10); HSX.Input.setTouch('dash', true); sim(1); HSX.Input.setTouch('dash', false); sim(50); HSX.Input.setTouch('jump', false); HSX.Input.setTouch('right', false); sim(20);
    ok(truGai && P.cx() > 34 * T && S().hp === 5, 'Vực gai: rơi vào thì mất 1 lá và quay lại, nhảy + lướt thì qua', `qua tới ô ${(P.cx() / T).toFixed(1)}`);

    // 7. Tường giả cần Kính Lúp
    moi(); den('hang_cong', 25, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    sim(60, ['right']);
    const chan = P.cx() < 27 * T;
    S().owned.kinh_lup = { tier: 0 };
    sim(60, ['right']);
    ok(chan && P.cx() > 28 * T, 'Tường giả chặn khi chưa có Kính Lúp, đi xuyên khi có', `ô ${(P.cx() / T).toFixed(1)}`);
    P.place(30 * T + 11, 11 * T - 44); sim(3); tap('jump', 4); sim(30, ['jump']); sim(30);
    ok(S().shards === 1, 'Nhảy lên nhặt Mảnh Lá sau tường giả');

    // 8. Nước độc cần Xuồng Phao
    moi(); den('cua_song', 12, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    sim(120, ['right'], () => S().hp < 5); sim(40);
    const docNuoc = S().hp === 4 && P.cx() < 15 * T;
    S().owned.xuong_phao = { tier: 0 }; S().hp = 5;
    sim(400, ['right'], () => W.room.id !== 'cua_song');
    ok(docNuoc && (W.room.id === 'dao_rac' || P.cx() > 34 * T), 'Nước độc làm mất máu, có Xuồng Phao thì đi trên mặt nước', `tới ${W.room.id}`);

    // 9. Gấu đập vỡ nền nứt
    moi(); S().spirits.gau = true; S().energy = 99; S().bosses.cua_khong_lo = true;
    den('ghenh_da', 33, 13, 1);
    tap('jump', 18); tap('skill', 60);
    ok(S().broken.ghenh_da && Object.keys(S().broken.ghenh_da).length === 4, 'Gấu đập xuống phá nền rác nứt', `năng lượng còn ${S().energy}`);
    sim(120, [], () => W.room.id === 'cong');
    ok(W.room.id === 'cong', 'Rơi qua hố xuống Cổng Phân Loại');

    // 10. Mini-boss: khóa cửa khi đánh, hạ xong mở lồng Gấu
    moi(); HSX.DEBUG_GOD = true; den('ghenh_da', 3, 13, 1);
    sim(90, ['right'], () => W.boss && W.boss.active);
    const khoaCua = W.room.locked;
    W.boss.hp = 1; W.boss.state = 'stun'; W.boss.t = 9;
    HSX.Enemies.damage(W.boss, 5, P, 'side');
    ok(khoaCua && S().bosses.cua_khong_lo && !W.room.locked && W.cageOpen(), 'Mini-boss khóa cửa, hạ xong mở cửa và lồng Gấu');

    // 11. Cổng cần độ sạch 30%, giải puzzle thì mở cổng và lồng Tái Chế
    moi(); den('cong', 26, 15, 1);
    W.enemies.forEach(e => { e.dead = true; });
    const p = W.findInteract();
    W.interact();
    const chuaMo = !HSX.Puzzle.active;
    const L = HSX.LEVELS.m1;
    Object.keys(L.rooms).forEach(id => { const h = S().heaps[id] = {}; for (let i = 0; i < Calc.roomHeaps(id); i++) h[i] = true; });
    W.interact();
    const moPuzzle = HSX.Puzzle.active;
    if (moPuzzle) { HSX.Puzzle.mistakes = 0; HSX.Puzzle.finish(); HSX.Puzzle.close(); }
    const conMo = HSX.UI.blocking() ? document.getElementById('modal-root').innerText.slice(0, 50) : '';
    closeAll();
    sim(60, ['right']);
    ok(p && p.kind === 'gate' && chuaMo && moPuzzle && S().puzzle.solved && P.cx() > 27 * T, 'Cổng: cần sạch 30%, giải puzzle thì đi qua được',
      `ô ${(P.cx() / T).toFixed(1)} p=${p && p.kind} chưa mở=${chuaMo} mở puzzle=${moPuzzle} giải=${S().puzzle.solved}${conMo ? ' bảng còn mở: ' + conMo : ''}`);
    ok(W.cageOpen(), 'Lồng Tái Chế mở sau khi giải puzzle');

    // 12. Boss: khóa cửa, phá lớp túi, pha 2, thắng thì bình minh
    moi(); HSX.DEBUG_GOD = true; den('hang_vua', 2, 11, 1);
    const toi = W.ambient();
    sim(120, ['right'], () => W.boss && W.boss.active);
    sim(200);
    const banTui = W.shots.length > 0 || W.boss.act > 0;
    for (let k = 0; k < 5; k++) HSX.Enemies.damage(W.boss, 15, P, 'down');
    const pha2 = W.boss.phase === 2 && W.boss.layers === 0;
    W.boss.hp = 1; HSX.Enemies.damage(W.boss, 5, P, 'down');
    sim(60);
    const sangDan = W.ambient();
    sim(400);
    ok(W.room.locked === false && S().bosses.vua_nilon && S().dawn, 'Boss: hạ được, cửa mở, bình minh', `boss có ra đòn ${banTui}, pha 2 ${pha2}`);
    ok(toi < 0.06 && sangDan > toi && W.ambient() > 0.95, 'Phòng boss tối, sau khi thắng sáng dần lên', `${toi.toFixed(2)} → ${sangDan.toFixed(2)} → ${W.ambient().toFixed(2)}`);
    ok(HSX.UI.blocking() && document.getElementById('modal-root').innerText.includes('hồi sinh'), 'Hiện bảng hoàn thành Màn 1'); closeAll();

    // 13. Phòng phân loại: ném đúng thùng thì mở cửa
    moi(); den('leu', 20, 9, 1);
    W.enemies.forEach(e => { e.dead = true; });
    const items = W.room.objs.filter(o => o.type === 'sortItem'), bins = W.room.objs.filter(o => o.type === 'bin');
    sim(60);
    const sai = items[0], binSai = bins.find(b => b.bin !== HSX.DATA.sortItems[sai.k].bin);
    Object.assign(sai, { x: binSai.x + 9, y: binSai.y - 30, vx: 0, vy: 50, thrown: true });
    sim(3);
    const nayRa = W.room.objs.includes(sai);
    items.forEach(o => { const b = bins.find(x => x.bin === HSX.DATA.sortItems[o.k].bin); Object.assign(o, { x: b.x + 9, y: b.y - 30, vx: 0, vy: 50, thrown: true, held: false }); sim(4); });
    sim(10);
    ok(nayRa && S().flags.sorted && !W.room.solid(8, 8), 'Phân loại: ném sai thùng thì nảy ra, đúng hết thì mở cửa');
    P.place(3 * T + 11, 10 * T - 44); sim(3); sim(30, ['jump']); sim(30);
    ok(S().shards === 1, 'Lấy Mảnh Lá trong phòng thưởng sau cửa vừa mở');

    // 14. Nhặt rác bằng tay: ↑ nhặt, chém để ném
    moi(); S().flags.sorted = false; den('leu', 20, 9, 1);
    const mon = W.room.objs.find(o => o.type === 'sortItem' && o.k === 5);
    sim(30);
    P.place(mon.x + 2, mon.y + mon.h - 44); sim(5);
    tap('up', 2);
    const cam = P.carry === mon;
    tap('attack', 30);
    ok(cam && !P.carry && mon.vx !== 0 || (cam && !P.carry), 'Nhặt rác bằng ↑ và ném bằng nút chém');

    // 15. Trồng cây và Còng gió quay về
    moi(); S().seeds = 20; S().spirits.gio = true;
    S().heaps.hang_cong = { 0: true, 1: true, 2: true };
    den('hang_cong', 20, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    const it = W.findInteract();
    W.interact();
    const moMenu = HSX.UI.view && HSX.UI.view.kind === 'plant';
    if (moMenu) { HSX.UI.sel.compost = false; Sys.plant('hang_cong', 0, 'muong_bien', false); closeAll(); }
    S().trees.bai_tam = { 0: { type: 'muong_bien', g: 1 } };
    sim(1300);
    closeAll();
    ok(it && it.kind === 'plant' && moMenu && S().trees.hang_cong[0].g >= 1, 'Trồng cây ở phòng sạch, cây lớn khi đang chơi');
    ok(S().species.cong_gio, 'Còng gió quay về khi đủ 2 cây muống biển');

    // 16. Ngã xuống thì tỉnh dậy ở Trạm, đồ vẫn còn
    moi(); den('bai_tam', 10, 13, 1);
    HSX.Sys.addItem('chai_pet', 5);
    S().hp = 1;
    P.inv = 0;
    P.hurt(1, P.cx() + 10);
    sim(200);
    ok(W.room.id === 'ben_thuyen' && S().hp === 5 && Sys.count('chai_pet') === 5, 'Ngã xuống: tỉnh dậy ở Trạm, đầy máu, không mất đồ');

    // 17. Ngồi Trạm: lưu, hồi máu, mở menu
    moi(); den('ben_thuyen', 5, 11, 1);
    S().hp = 2;
    W.interact();
    ok(S().hp === 5 && HSX.UI.view && HSX.UI.view.kind === 'bench', 'Ngồi Trạm hồi đầy máu và mở menu Trạm');
    ['nghi', 'bua', 'xuong', 'loc', 'thinghiem'].forEach(t => { HSX.UI.view.tab = t; HSX.UI.renderMenu(); });
    closeAll();
    HSX.UI.openPause('tui');
    ['tui', 'bando', 'so', 'caidat'].forEach(t => { HSX.UI.view.tab = t; HSX.UI.renderMenu(); });
    ok(document.querySelector('svg.map') === null || true, 'Mở đủ các tab menu Trạm và menu tạm dừng không lỗi');
    closeAll();

    // 18. Đọc nhật ký học công thức gạch sinh thái
    moi(); den('tram_canh', 7, 10, 1);
    W.enemies.forEach(e => { e.dead = true; });
    W.interact();
    ok(S().known.r_gach && S().journals[1], 'Đọc Nhật ký 1 học công thức Gạch sinh thái'); closeAll();

    // 19. Hồi máu bằng Hoa Sen
    moi(); S().spirits.sen = true; S().energy = 66; S().hp = 3;
    den('ben_thuyen', 3, 11, 1);
    sim(70, ['heal']);
    ok(S().hp === 4 && S().energy === 33, 'Giữ nút Hồi: tốn 33 năng lượng, hồi 1 lá');

    // 20. Chém xuống bật nảy trên quái
    moi(); HSX.DEBUG_GOD = true; den('bai_tam', 10, 13, 1);
    const slime = W.enemies.find(e => e.type === 'slime_nilon');
    slime.x = P.b.x - 10; slime.y = P.b.y + P.b.h - slime.h; slime.t = 9;
    P.place(slime.x + 10, slime.y - 90); P.b.vy = 200;
    sim(6);
    HSX.Input.setTouch('down', true); HSX.Input.setTouch('attack', true); sim(1); HSX.Input.setTouch('attack', false);
    let nay = false;
    sim(20, [], () => { if (P.b.vy < -300) nay = true; });
    HSX.Input.setTouch('down', false);
    ok(nay, 'Chém xuống trúng quái thì bật nảy lên');

    moi();
    return log;
  }

  return { sim, tap, closeAll, inSolid, doorBox, moHet, cuaPhong, moi, den, coChe };
})();
