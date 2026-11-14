/* Độ khó (5 mức) và chế độ Tự đánh cho các mức dễ.
   - Lưu trong save của từng tài khoản: S.doKho ('rat_de' | 'de' | 'thuong' | 'kho' | 'rat_kho'), S.tuDanh (bật / tắt).
   - Không đổi luật chơi trong file khác: bọc hàm gốc (giống js/gian_lan.js) để nhân các con số theo mức.
       HSX.Enemies.damage  sát thương Mầm gây ra (chém, ná, đập, phản đòn)
       HSX.Enemies.update  quái và boss nhanh / chậm hơn (thời gian của quái chạy nhanh hơn hoặc chậm hơn)
       HSX.Player.hurt     số lá máu mất mỗi lần trúng đòn (phần lẻ cộng dồn), thời gian bất tử sau khi trúng
       HSX.World.napNL     năng lượng nhận được (để hồi máu, dùng kỹ năng)
   - Minigame (Cổng Phân Loại, Lều phân loại, Cổng Rừng) giữ nguyên ở mọi mức để số liệu học tập so sánh được.
   - Tự đánh (chỉ ở Rất dễ và Dễ): Mầm tự quay về phía vật gây hại gần nhất (quái, boss đang đánh, túi / lưới bay tới)
     và chém khi vật đó trong tầm; đã có Ná Tái Chế thì tự bắn khi vật ở xa hơn tầm chém và đường bay không vướng tường.
   Nạp file này sau js/ui.js và trước js/main.js. */
(function () {
  'use strict';
  const T = HSX.T, P = HSX.Player, E = HSX.Enemies, W = HSX.World, Calc = HSX.Calc;
  const BAT_TU_GOC = P.C.INV;

  // danh: nhân sát thương Mầm gây ra · dau: nhân lá máu mất · toc: tốc độ của quái, boss
  // batTu: giây bất tử sau khi trúng đòn · nl: nhân năng lượng nhận được · tuDanh: có chế độ Tự đánh
  const MUC = [
    { id: 'rat_de', ten: 'Rất dễ', mo: 'Quái chậm hẳn, trúng 2 đòn mới mất 1 lá, Mầm đánh mạnh gấp đôi. Có Tự đánh (bật sẵn).',
      danh: 2, dau: 0.5, toc: 0.75, batTu: 1.7, nl: 1.5, tuDanh: true, tuDanhSan: true },
    { id: 'de', ten: 'Dễ', mo: 'Quái chậm hơn, mất ít máu hơn, Mầm đánh mạnh hơn. Có Tự đánh (tự bật hoặc tắt).',
      danh: 1.5, dau: 0.75, toc: 0.88, batTu: 1.4, nl: 1.25, tuDanh: true, tuDanhSan: false },
    { id: 'thuong', ten: 'Thường', mo: 'Đúng như thiết kế của game.',
      danh: 1, dau: 1, toc: 1, batTu: BAT_TU_GOC, nl: 1, tuDanh: false },
    { id: 'kho', ten: 'Khó', mo: 'Quái nhanh hơn, có đòn làm mất 2 lá, quái và boss trâu hơn.',
      danh: 0.85, dau: 1.5, toc: 1.12, batTu: 0.95, nl: 0.9, tuDanh: false },
    { id: 'rat_kho', ten: 'Rất khó', mo: 'Mỗi đòn mất 2 lá, quái nhanh và trâu, ít năng lượng. Dành cho ai đã thắng mọi boss.',
      danh: 0.7, dau: 2, toc: 1.25, batTu: 0.8, nl: 0.8, tuDanh: false },
  ];
  const THEO_ID = {};
  MUC.forEach(m => { THEO_ID[m.id] = m; });

  function muc() { const S = HSX.S; return (S && THEO_ID[S.doKho]) || THEO_ID.thuong; }
  function tuDanhBat() { const S = HSX.S; return !!(S && S.tuDanh && muc().tuDanh); }

  // ---------- Bọc hàm gốc ----------
  const damageGoc = E.damage;
  E.damage = function (e, dmg, Pl, dir, srcX) { return damageGoc.call(this, e, dmg * muc().danh, Pl, dir, srcX); };

  const updateGoc = E.update;
  E.update = function (e, dt, room, Pl) { return updateGoc.call(this, e, dt * muc().toc, room, Pl); };

  const napGoc = W.napNL;
  W.napNL = function (n, x, y) { return napGoc.call(this, n * muc().nl, x, y); };

  let leMau = 0;   // phần lá lẻ cộng dồn giữa các lần trúng đòn (vd. Dễ: 4 đòn mất 3 lá)
  const hurtGoc = P.hurt;
  P.hurt = function (n, fromX, hazard) {
    const m = muc();
    if (m.dau === 1 && m.batTu === BAT_TU_GOC) return hurtGoc.call(this, n, fromX, hazard);
    // Các trường hợp hàm gốc không trừ máu (đang bất tử, lướt né, khiên chặn): để hàm gốc tự xử lý, không cộng dồn
    if (!hazard && (this.inv > 0 || HSX.DEBUG_GOD || this.dashT > 0 || (Calc.charmOn('khien_lon') && this.shieldT <= 0))) {
      return hurtGoc.call(this, n, fromX, hazard);
    }
    leMau += n * m.dau;
    const mat = Math.floor(leMau + 1e-9);
    leMau -= mat;
    const kq = hurtGoc.call(this, mat, fromX, hazard);
    if (kq) {
      this.inv = m.batTu;
      if (mat === 0) W.text(this.cx(), this.b.y - 14, 'Đỡ được!', '#9ff0b5');
    }
    return kq;
  };

  // ---------- Tự đánh ----------
  const TAM_BAN = 380;   // xa nhất (px) để tự bắn ná
  // khoảng cách từ điểm (x, y) tới hộp o
  function kcHop(x, y, o) {
    const dx = Math.max(o.x - x, 0, x - (o.x + o.w)), dy = Math.max(o.y - y, 0, y - (o.y + o.h));
    return Math.hypot(dx, dy);
  }
  // Các vật gây hại quanh Mầm, gần nhất trước
  function vatGayHai(cx, cy) {
    const ds = [];
    W.enemies.forEach(e => {
      if (e.dead || (e.kind === 'boss' && !e.active)) return;
      const ex = e.x + e.w / 2;
      // quái có vỏ đang quay mặt về phía Mầm: chém trước mặt chỉ kêu "Keng!" rồi bật lại, nên bỏ qua
      if (e.def && e.def.shell && Math.sign(cx - ex) === e.dir && !(e.open > 0 || e.state === 'rest')) return;
      ds.push({ x: HSX.clamp(cx, e.x + 4, e.x + e.w - 4), y: HSX.clamp(cy, e.y + 4, e.y + e.h - 4), kc: kcHop(cx, cy, e) });
    });
    W.shots.forEach(s => {
      if ((s.type !== 'bag' && s.type !== 'net') || s.phan || s.huy) return;
      ds.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, kc: kcHop(cx, cy, s) });
    });
    return ds.sort((a, b) => a.kc - b.kc);
  }
  // Góc bắn ná (đường vòng cung thấp, lực tối đa) để hạt tới điểm t; null nếu không tới được hoặc vướng tường
  function gocBan(Pl, cx, cy, t, room) {
    const v = Pl.C.BAN_V0 + Pl.C.BAN_V1, g = Pl.C.BAN_G;
    const dx = t.x - cx, X = Math.abs(dx), Y = cy - t.y;   // Y dương: mục tiêu ở cao hơn Mầm
    if (X < 10) return null;
    const v2 = v * v, disc = v2 * v2 - g * (g * X * X + 2 * Y * v2);
    if (disc < 0) return null;
    const th = Math.atan((v2 - Math.sqrt(disc)) / (g * X));
    const a = dx > 0 ? -th : Math.PI + th;
    const vx = Math.cos(a) * v, vy = Math.sin(a) * v, tMax = X / Math.abs(vx);
    for (let tt = 0.02; tt < tMax; tt += 0.02) {
      const x = cx + vx * tt, y = cy + vy * tt + 0.5 * g * tt * tt;
      if (room.solid(Math.floor(x / T), Math.floor(y / T))) return null;
    }
    return a;
  }
  function tuDanh(Pl, dt, room) {
    if ((HSX.Truyen && HSX.Truyen.active()) || (HSX.PhatLai && HSX.PhatLai.dang)) return;
    if (Pl.carry || Pl.ngam || Pl.healT > 0 || Pl.troi > 0 || Pl.nam > 0 || Pl.hurtT > 0 || Pl.slam || Pl.dashT > 0) return;
    if (HSX.Input.down('heal') || HSX.Input.down('shoot')) return;   // người chơi đang tự hồi máu / ngắm ná
    const cx = Pl.cx(), cy = Pl.b.y + Pl.b.h / 2 - 4;
    const t = vatGayHai(cx, cy)[0];
    if (!t) return;
    if (t.kc <= 70 * Calc.reach() + 12) {
      if (Pl.atkCd > 0 || Pl.atkT > 0 || Pl.atkBuf > 0) return;
      // giả như người chơi bấm chém về phía vật đó (Player.update trừ dt trước khi xét nên cộng bù)
      Pl.atkBuf = Pl.C.BUF + dt;
      Pl.atkAim = { x: t.x - W.cam.x, y: t.y - W.cam.y };
      return;
    }
    if (!HSX.S.owned.na_tai_che || Pl.banCd > 0 || Pl.atkT > 0 || t.kc > TAM_BAN) return;
    const a = gocBan(Pl, cx, cy, t, room);
    if (a === null) return;
    if (Math.abs(Math.cos(a)) > 0.15) Pl.face = Math.cos(a) > 0 ? 1 : -1;
    Pl.ban(a, 1);
  }
  const updatePGoc = P.update;
  P.update = function (dt, room) {
    if (tuDanhBat()) tuDanh(this, dt, room);
    return updatePGoc.call(this, dt, room);
  };

  // ---------- Chọn mức, giao diện ----------
  function chon(id, im) {
    const S = HSX.S, m = THEO_ID[id];
    if (!S || !m) return;
    S.doKho = id;
    if (m.tuDanh) { if (S.tuDanh === undefined || S.doKhoTruoc !== id) S.tuDanh = !!m.tuDanhSan; } else S.tuDanh = false;
    S.doKhoTruoc = id;
    leMau = 0;
    HSX.saveGame();
    if (!im && HSX.UI) HSX.UI.toast(`Độ khó: <b>${m.ten}</b>${m.tuDanh ? ` · Tự đánh ${S.tuDanh ? 'đang bật' : 'đang tắt'}` : ''}`);
  }
  function doiTuDanh() {
    const S = HSX.S;
    if (!S || !muc().tuDanh) return;
    S.tuDanh = !S.tuDanh;
    HSX.saveGame();
    HSX.UI.toast(S.tuDanh ? 'Tự đánh: <b>bật</b>. Mầm tự chém, tự bắn vật gây hại gần nhất.' : 'Tự đánh: <b>tắt</b>.');
  }
  // Khối Độ khó trong tab Cài đặt (js/ui.js gọi)
  function oCaiDat() {
    const S = HSX.S, m = muc();
    return `<h3>Độ khó</h3>
      <div class="row">${MUC.map(x => `<button class="btn small ${x.id === m.id ? 'on' : ''}" data-act="dokho" data-arg="${x.id}" aria-pressed="${x.id === m.id}">${x.ten}</button>`).join('')}</div>
      <p class="small muted">${m.mo} Minigame giữ nguyên ở mọi mức.</p>
      ${m.tuDanh
        ? `<div class="row"><button class="btn small ${S.tuDanh ? 'on' : ''}" data-act="tudanh" aria-pressed="${!!S.tuDanh}">Tự đánh: ${S.tuDanh ? 'đang bật' : 'đang tắt'}</button></div>
           <p class="small muted">Mầm tự quay về phía vật gây hại gần nhất (quái, boss, túi hay lưới bay tới) và chém khi trong tầm; có Ná Tái Chế thì tự bắn khi ở xa. Em vẫn tự chạy, nhảy, lướt và né.</p>`
        : '<p class="small muted">Chế độ Tự đánh có ở mức Rất dễ và Dễ.</p>'}`;
  }
  // Game mới: hỏi độ khó một lần (sau cảnh mở đầu), bấm ✕ thì giữ mức Thường
  function moChonDau() {
    const S = HSX.S;
    S.doKho = 'thuong';
    HSX.UI.modal('Chọn độ khó', `<p class="small">Đổi lại lúc nào cũng được trong Cài đặt (Esc → Cài đặt). Minigame giữ nguyên ở mọi mức.</p>
      <div class="cot-do-kho">${MUC.map(x => `<p class="small"><b>${x.ten}:</b> ${x.mo}</p>`).join('')}</div>`,
      MUC.map(x => [x.ten, 'dokho-dau', x.id === 'thuong', x.id]));
  }
  if (HSX.UI && HSX.UI.showIntro) {
    const introGoc = HSX.UI.showIntro;
    HSX.UI.showIntro = function () {
      if (HSX.S && !HSX.S.doKho) moChonDau();
      return introGoc.apply(this, arguments);
    };
  }
  // Ván đã có từ trước khi có độ khó: báo một lần, giữ mức Thường
  setTimeout(function () {
    const S = HSX.S;
    if (!S || S.doKho || (HSX.Truyen && HSX.Truyen.active()) || !(S.stats && S.stats.time > 5)) return;
    S.doKho = 'thuong';
    HSX.saveGame();
    if (HSX.UI) HSX.UI.toast('Mới: game có 5 mức độ khó, mức Rất dễ và Dễ có chế độ <b>Tự đánh</b>. Chọn trong Cài đặt (Esc → Cài đặt).', '', 7000);
  }, 2500);

  HSX.DoKho = {
    MUC, muc, chon, doiTuDanh, oCaiDat, tuDanhBat,
    chonDau(id) { chon(id); if (HSX.UI) HSX.UI.closeModal(); },
    _vatGayHai: vatGayHai, _gocBan: gocBan,
  };
})();
