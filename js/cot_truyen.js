/* Cốt truyện theo kịch bản (Hoi_Sinh_Xanh_Kich_Ban.docx): nhân vật nói, các cảnh truyện của Màn 1 và Màn 2,
   lời Mẹ Đước đổi theo tiến trình, cảnh tự chạy khi tới gần một chỗ trong phòng (story trong file màn).
   Cách chạy cảnh xem js/hoi_thoai.js. Nguyên tắc viết lời (kịch bản mục 8): không giảng đạo lý, mọi nhân vật
   đều có lý do của mình, kể cả boss. */
(function () {
  const T = HSX.T, D = HSX.DATA;
  const W = () => HSX.World, P = () => HSX.Player, S = () => HSX.S, TR = () => HSX.Truyen;

  // Người nói: tên, ảnh chân dung (cat: vùng mặt [x, y, cạnh] theo tỉ lệ ảnh), emoji khi chưa có ảnh, màu tên.
  // lat: ảnh gốc nhìn sang trái, lật lại để nhìn vào lời thoại.
  HSX.NGUOI = {
    mam:     { ten: 'Mầm', anh: 'player/mam', cat: [0.33, 0.25, 0.34], emo: '🌱', mau: '#9ff0b5' },
    sen:     { ten: 'Hoa Sen', anh: 'heroes/sen', emo: '🌸', mau: '#ff9cc8' },
    gio:     { ten: 'Gió', anh: 'heroes/gio', emo: '🍃', mau: '#7ef0b0' },
    gau:     { ten: 'Gấu Rừng', anh: 'heroes/gau', emo: '🐻', mau: '#e8b27a' },
    taiche:  { ten: 'Tái Chế', anh: 'heroes/taiche', emo: '♻️', mau: '#7cc8ff' },
    vua:     { ten: 'Vua Túi Nilon', anh: 'enemies/vua_nilon', emo: '🛍️', mau: '#c9a6ff', lat: true },
    sach:    { ten: 'Trang sách cổ', emo: '📜', mau: '#ffe08a' },
    me_duoc: { ten: 'Mẹ Đước', anh: 'npc/me_duoc', emo: '👵', mau: '#f0c987', lat: true },
    luoi:    { ten: 'Lưới Ma Khổng Lồ', anh: 'enemies/luoi_ma_khong_lo', emo: '🕸️', mau: '#b99cff', lat: true },
  };

  // ---------- Tiện ích cho các cảnh ----------
  const tl = (id, chu) => ({ neu: () => !!S().spirits[id], buoc: [{ noi: id, chu }] });   // tinh linh nói (nếu đã đi cùng)
  const vat = type => W().room.objs.find(o => o.type === type);
  const diem = o => o && { x: o.x + T / 2, y: o.y };
  const boss = () => { const b = W().boss; return b && { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
  const xac = () => { const cp = W().corpses.find(c => c.e.kind === 'boss'); return cp ? { x: cp.e.x + cp.e.w / 2, y: cp.e.y + cp.e.h / 2 } : null; };
  // Boss thức giấc: chớp sáng, vòng sóng
  function bossThuc() {
    const b = W().boss;
    if (!b) return;
    W().shake = 7;
    W().ring(b.x + b.w / 2, b.y + b.h / 2, '#c49bff', 240, 0.8, 6);
    W().flash(b.x + b.w / 2, b.y + b.h / 2, 300, '190,120,255', 0.7);
  }
  // Ra bãi biển (phòng id, cột tx) lúc trời hửng sáng, không hiện tên phòng
  function ra(id, tx) {
    const w = W(), p = P();
    w.load(id, { start: true, im: true });
    const r = w.room;
    let ty = 0;
    while (ty < r.h - 1 && !r.solid(tx, ty + 1)) ty++;
    p.place(tx * T + T / 2 - p.b.w / 2, (ty + 1) * T - p.b.h);
    p.face = 1;
    HSX.Spirits.snap();
    w.camUpdate(0, true);
    w.dawnT = 0;   // trời hửng sáng lại từ đầu cho người xem thấy
  }
  // Chai nhựa trôi dạt vào bờ (chỉ để diễn)
  function chaiTroi() {
    const w = W();
    w.fxp({ k: 'emo', ch: '🧴', x: w.cam.x + HSX.VW + 20, y: w.cam.y + HSX.VH * 0.62, vx: -150, vy: 0, life: 3, r: 26, bob: 1 });
    w.fxp({ k: 'emo', ch: '🛍️', x: w.cam.x + HSX.VW + 160, y: w.cam.y + HSX.VH * 0.6, vx: -130, vy: 0, life: 3.4, r: 24, bob: 1 });
  }
  // Trang sách cổ hiện lên trên Cổng Phân Loại
  function trangSach() {
    const w = W(), g = w.room.gates;
    if (!g.length) return;
    const x = g[0].x + T / 2, y = Math.min(...g.map(o => o.y)) - 70;
    w.fxp({ k: 'emo', ch: '📜', x, y, life: 9, r: 46, bob: 1 });
    w.fxp({ k: 'glow', x, y: y - 14, life: 2.5, r: 120, color: 'rgba(255,224,138,0.55)', add: true });
    w.ring(x, y - 14, '#ffe08a', 130, 0.8, 4);
    w.flash(x, y - 14, 260, '255,224,138', 2.2);
  }
  // Cá, cua thoát khỏi lưới
  function caThoat() {
    const w = W(), c = xac() || boss() || { x: P().cx(), y: P().cy() };
    ['🐟', '🦀', '🐟', '🦐', '🐠', '🦀', '🐟'].forEach((ch, i) => {
      const a = -Math.PI / 2 + (i - 3) * 0.42;
      w.fxp({ k: 'emo', ch, x: c.x, y: c.y, vx: Math.cos(a) * 340, vy: Math.sin(a) * 420, g: 700, life: 2.2, r: 24, vr: (Math.random() - 0.5) * 6 });
    });
    w.burst(c.x, c.y, '#9fd3a8', 30);
    w.ring(c.x, c.y, '#9ff0b5', 200, 0.8, 5);
  }

  // ---------- Các cảnh ----------
  HSX.CANH = {
    // Mở đầu: Mầm thức dậy giữa đống rác
    mo_dau: () => [
      { lam: () => { P().nam = 1; P().face = 1; }, den: true, ke: 'Thế giới Xanh Lam từng có rừng, có sông, có những bãi biển trắng và rạn san hô rực rỡ.' },
      { den: true, ke: 'Rồi người ta làm ra nhiều thứ hơn mức thiên nhiên kịp nhận lại. Rác phủ kín bờ biển. Sương Độc mọc lên từ rác.' },
      { den: true, ke: 'Các tinh linh bị nhốt vào lồng. Từng Vệ Binh Xanh một tan biến...' },
      { den: true, ke: '...chỉ còn lại một.' },
      { sang: 1.8 },
      { cho: 0.7 },
      { lam: () => TR().tween(P(), 'nam', 0, 1.2), cho: 1.4 },
      { noi: 'mam', chu: 'Ư... mình đang ở đâu đây?' },
      { noi: 'mam', chu: 'Rác... khắp nơi là rác. Còn các Vệ Binh khác đâu cả rồi?' },
      { noi: 'mam', chu: 'Mình nhỏ thế này... thì làm được gì chứ.' },
      { noi: 'sen', chu: 'Mầm... Mầm ơi... Ở đây! Bên phải nè!' },
      { nhin: () => diem(vat('cage')), cho: 1.4 },
      { noi: 'sen', chu: 'Chém vỡ cái lồng này giúp ta với!' },
      { nhin: null, cho: 0.5 },
      { tieuDe: ['Màn 1', 'Bãi Biển Nhựa'] },
    ],

    // Giải cứu tinh linh (sau cảnh là thẻ khả năng mới)
    cuu_sen: () => [
      { noi: 'sen', chu: 'Cảm ơn con, Mầm. Ta là Hoa Sen.' },
      { noi: 'sen', chu: 'Sen mọc lên từ bùn mà vẫn nở hoa. Thiên nhiên luôn biết cách tự chữa lành, miễn là được cho một cơ hội.' },
      { noi: 'mam', chu: 'Nhưng con chỉ có một mình...' },
      { noi: 'sen', chu: 'Giờ thì có ta rồi. Lúc mệt, cứ đứng yên giữ nút Hồi, ta sẽ chữa lành cho con.' },
      { noi: 'sen', chu: 'Gió đang bị nhốt ở Trạm canh cũ, phía bên kia đụn cát. Đi thôi.' },
    ],
    cuu_gio: () => [
      { noi: 'gio', chu: 'Phù! Cuối cùng cũng thở được! Sương Độc đặc quánh như keo ấy.' },
      { noi: 'gio', chu: 'Ta là Gió. Không khí sạch thì ai cũng cần, mà chẳng ai để ý tới... cho tới khi nó bẩn.' },
      { noi: 'mam', chu: 'Bạn đi cùng mình nhé?' },
      { noi: 'gio', chu: 'Còn phải hỏi! Bám vào ta mà lướt, vực gai rộng mấy cũng qua.' },
    ],
    cuu_gau: () => [
      { noi: 'gau', chu: 'Grừ... Con cua lon đó canh ta mãi.' },
      { noi: 'gau', chu: 'Ta là Gấu Rừng. Rừng là lá chắn của đất liền: chắn gió, giữ đất, giữ nước.' },
      { noi: 'gau', chu: 'Ở đây chẳng còn rừng, nên rác cứ thế tràn vào.' },
      { noi: 'mam', chu: 'Gấu có biết rác từ đâu ra không?' },
      { noi: 'gau', chu: 'Từ những bàn tay vứt nó đi, và từ những dòng sông chở nó ra biển.' },
      { noi: 'gau', chu: 'Mượn sức ta mà đập vỡ nền rác. Lối xuống Cổng Phân Loại nằm ngay dưới chân con.' },
    ],
    cuu_taiche: () => [
      { noi: 'taiche', chu: 'Bíp! Khởi động lại... Chào Mầm!' },
      { noi: 'taiche', chu: 'Ta là Tái Chế. Với ta, rác là tài nguyên đặt sai chỗ. Chai, lon, lưới đều quay lại vòng tuần hoàn được.' },
      { noi: 'taiche', chu: 'Nhưng muốn tái chế thì phải phân loại trước. Trộn chung một đống thì chẳng cứu được gì.' },
      { noi: 'mam', chu: 'Giống như cái Cổng vừa rồi.' },
      { noi: 'taiche', chu: 'Chính xác! Ta sẽ hút nguyên liệu quanh con. Giờ thì... đi gặp kẻ đẻ ra Sương Độc thôi.' },
    ],

    // Cổng Phân Loại: trang sách cổ Luật Bảo vệ môi trường 2020
    trang_luat: () => [
      { nhin: () => { const g = W().room.gates[0]; return g && { x: g.x - T * 3, y: g.y - T }; }, cho: 0.9 },
      { noi: 'taiche', chu: 'Mầm! Ta ở đây, trong lồng! Cổng này khóa luôn cả lồng của ta.' },
      { noi: 'taiche', chu: 'Cổng được dựng theo một trang sách cổ mà các tinh linh gìn giữ. Nhìn kìa!' },
      { lam: trangSach, cho: 1.1 },
      { noi: 'sach', chu: 'Luật Bảo vệ môi trường 2020, Điều 75: hộ gia đình, cá nhân phân loại rác sinh hoạt thành ba nhóm. Rác tái sử dụng, tái chế được. Rác thực phẩm. Và rác thải khác.' },
      { noi: 'taiche', chu: 'Bỏ đúng nhóm thì cổng mở. Bỏ lẫn lộn thì rác vẫn hoàn rác.' },
      { noi: 'mam', chu: 'Ba nhóm... Mình nhớ rồi.' },
      { neu: () => HSX.Calc.cleanPct('m1') < HSX.LEVELS.m1.gateClean,
        buoc: [{ noi: 'taiche', chu: 'À, cổng chỉ chịu mở khi bãi biển đã sạch bớt. Dọn thêm vài đống rác nữa nhé!' }] },
      { nhin: null, cho: 0.4 },
    ],

    // Vua Túi Nilon
    gap_vua_nilon: () => [
      { nhin: boss, cho: 0.9 },
      { lam: bossThuc, cho: 0.7 },
      { noi: 'vua', chu: 'Lại một kẻ dọn dẹp.' },
      { noi: 'vua', chu: 'Ngươi nhặt một cái túi, người ta vứt ra mười cái. Ngươi dọn được bao lâu?' },
      { noi: 'mam', chu: 'Ông là ai?' },
      { noi: 'vua', chu: 'Ta là thứ người ta dùng năm phút rồi vứt đi. Ta không tự sinh ra đâu, nhóc. Mỗi ngày có hàng triệu bàn tay tạo ra ta.' },
      { noi: 'vua', chu: 'Dùng xong là chúng quên. Chỉ có ta ở lại, hàng trăm năm.' },
      tl('gau', 'Đừng để nó làm con nao núng, Mầm.'),
      { noi: 'vua', chu: 'Muốn bãi biển này thì giành lấy, nếu ngươi đủ sức!' },
      { nhin: null, cho: 0.3 },
    ],
    thua_vua_nilon: () => [
      { nhin: xac, cho: 1.0 },
      { noi: 'vua', chu: 'Ngươi... thắng rồi...' },
      { noi: 'vua', chu: 'Nhưng ta sẽ quay lại... chừng nào người ta vẫn dùng một lần rồi vứt...' },
      { cho: 1.0 },
      { toi: 1.2 },
      { lam: () => ra('ben_thuyen', 14) },
      { sang: 1.8 },
      { cho: 1.6 },
      tl('sen', 'Nhìn kìa, Mầm. Mặt trời lên rồi.'),
      { noi: 'mam', chu: 'Bãi biển sáng rồi... Vậy là xong rồi, phải không?' },
      tl('gio', 'Hừm... Sóng vẫn đang đưa rác vào bờ kìa.'),
      { lam: chaiTroi, dien: true, cho: 1.6 },
      { noi: 'mam', chu: 'Rác đâu tự mọc ra. Có ai đó đã vứt nó đi...' },
      tl('taiche', 'Và có cả một hệ thống khiến việc vứt đi trở nên quá dễ dàng.'),
      tl('gau', 'Rác theo sông ra biển. Muốn biết nó từ đâu tới thì phải đi ngược lên.'),
      tl('sen', 'Phía bắc là rừng ngập mặn, lá chắn cuối cùng của bờ biển này. Mẹ Đước vẫn còn giữ rừng ở đó.'),
      { noi: 'mam', chu: 'Vậy mình đi thôi. Từng việc nhỏ một.' },
    ],

    // ----- Màn 2 -----
    den_m2: () => [
      { tieuDe: ['Màn 2', 'Rừng Ngập Mặn'] },
      tl('gau', 'Rừng... chỉ còn lại chừng này thôi sao?'),
      tl('gio', 'Gió ở đây mặn chát. Nước biển tràn vào tận trong đất liền rồi.'),
      tl('sen', 'Nhưng rễ cây vẫn còn thở. Ta nghe thấy.'),
      { noi: 'mam', chu: 'Mẹ Đước ở đâu đó trong rừng. Mình phải tìm bà.' },
    ],
    gap_me_duoc: () => [
      { nhin: () => diem(vat('npc')), cho: 0.6 },
      { noi: 'me_duoc', chu: 'Ai đó? À... một Vệ Binh Xanh. Lâu lắm rồi bà mới thấy lại.' },
      { noi: 'mam', chu: 'Bà là... người giữ rừng ạ?' },
      { noi: 'me_duoc', chu: 'Người ta gọi bà là Mẹ Đước. Bà giữ cánh rừng này từ hồi nó còn trùm kín cả cửa sông.' },
      { noi: 'me_duoc', chu: 'Hồi đó cò về trắng cả ngọn cây. Cua, cá thòi lòi nhiều tới nỗi đi đâu cũng nghe lách tách dưới chân.' },
      { noi: 'mam', chu: 'Vậy rừng đi đâu hết rồi ạ?' },
      { noi: 'me_duoc', chu: 'Người ta chặt rừng đào đầm nuôi tôm. Giá tôm cao, ai cũng mong đổi đời. Bà không trách họ.' },
      { noi: 'me_duoc', chu: 'Nhưng mất rừng thì sóng đánh thẳng vào bờ, nước mặn tràn vô ruộng. Đầm tôm rồi cũng chết dần, bỏ hoang như con thấy đó.' },
      tl('gau', 'Rừng là lá chắn của đất liền... Mất lá chắn thì đất cũng trôi theo sóng.'),
      { noi: 'me_duoc', chu: 'Nhưng rừng đước còn cứu được. Trái đước nảy mầm ngay trên cây, thành trụ mầm dài như cây bút.' },
      { noi: 'me_duoc', chu: 'Trụ mầm rụng xuống, cắm vô bùn rồi tự đứng lên thành cây. Rễ nó vươn ra, bắc qua nước như cây cầu.' },
      { noi: 'me_duoc', chu: 'Con cầm mấy trụ mầm này. Gặp bãi bồi thì cắm xuống, chờ một chút là rễ mọc thành lối đi.',
        lam: () => {
          const s = S();
          s.flags.gapMeDuoc = true;
          s.flags.trongDuoc = true;
          s.seeds += 6;
          W().text(P().cx(), P().b.y - 16, '+6 🌱 trụ mầm đước', '#9ff0b5', 16);
          HSX.Sys.fact('trumam');
        } },
      { noi: 'mam', chu: 'Cảm ơn bà. Con sẽ trồng lại rừng.' },
      { noi: 'me_duoc', chu: 'Đi qua đầm cẩn thận nghe con. Mấy tấm lưới người ta cắt bỏ giữa biển trôi vô đây, quấn hết cá tôm, không chịu đi.' },
      { nhin: null, lam: () => W().banner('Học được: Trồng đước', HSX.phimChu('Đứng ở bãi bồi, bấm {tuongTac} để cắm trụ mầm. Rễ đước lớn lên sẽ bắc thành cầu'), 3.4), cho: 0.3 },
    ],
    thay_lach: () => [
      { nhin: () => ({ x: 22 * T, y: 9 * T }), cho: 1.0 },
      tl('gio', 'Nước đứng im, chẳng chảy đi đâu cả. Mùi tù quá!'),
      tl('gau', 'Có thứ gì bịt kín cống phía bên kia. Nước triều không ra vào được thì rừng chết dần.'),
      { noi: 'mam', chu: 'Đống rác chặn cống... Mình phải đập vỡ nó.' },
      { nhin: null, cho: 0.3 },
    ],
    gap_luoi_ma_khong_lo: () => [
      { nhin: boss, cho: 0.9 },
      { lam: bossThuc, cho: 0.6 },
      { noi: 'luoi', chu: 'Ngươi... cũng muốn cắt ta ra sao?' },
      { noi: 'luoi', chu: 'Ta từng là lưới của ngư dân. Rách một lỗ, người ta cắt bỏ ta giữa biển rồi thay tấm mới.' },
      { noi: 'luoi', chu: 'Không ai nhặt ta về. Nên giờ ta giữ lấy mọi thứ trôi qua: cá, cua, rễ cây... cả ánh sáng.' },
      tl('sen', 'Nó đau lắm, Mầm. Nhưng những con cá mắc trong kia còn đau hơn.'),
      { noi: 'mam', chu: 'Mình sẽ gỡ từng sợi lưới một.' },
      { noi: 'luoi', chu: 'Thử xem!' },
      { nhin: null, cho: 0.3 },
    ],
    thua_luoi_ma_khong_lo: () => [
      { nhin: xac, cho: 1.0 },
      { noi: 'luoi', chu: 'Lỏng... ra rồi...' },
      { noi: 'luoi', chu: 'Thì ra... được buông ra... cũng nhẹ thế này...' },
      { lam: caThoat, dien: true, cho: 1.8 },
      tl('gio', 'Nhìn kìa! Cá, cua... chạy ra hết rồi!'),
      { noi: 'mam', chu: 'Ngoài biển còn bao nhiêu tấm lưới bị bỏ lại như thế nữa nhỉ...' },
      tl('taiche', 'Lưới cũ bện lại được thành dây thừng, thành thảm, thành đồ mới. Miễn là có người mang nó về bờ.'),
      { nhin: null, cho: 0.3 },
      { tieuDe: ['Màn 2', 'Rừng bắt đầu hồi sinh'] },
    ],
  };

  // ---------- Điều khiển cốt truyện trong lúc chơi ----------
  HSX.CotTruyen = {
    // Cảnh tự chạy khi Mầm đứng gần chỗ đánh dấu trong phòng (story của phòng)
    vung() {
      const r = W().room, p = P(), s = S(), bo = W().boss;
      if (!r.def.story || !p.b.ground || (bo && bo.active && !bo.dead)) return;
      for (const z of r.def.story) {
        if (s.story[z.canh] || (z.khi && !z.khi())) continue;
        if (Math.abs(p.cx() - (z.x + 0.5) * T) < z.r * T && Math.abs(p.b.y + p.b.h - (z.y + 1) * T) < z.r * T) { TR().play(z.canh); return; }
      }
    },

    // Nói chuyện với nhân vật (↑ / E). Lời đổi theo tiến trình.
    npc(id) {
      if (id !== 'me_duoc') return;
      const s = S();
      if (!s.flags.gapMeDuoc) { TR().play('gap_me_duoc', { lai: true }); return; }
      const buoc = [];
      // Lời theo nhiệm vụ: bắc cầu → nhận xẻng → trồng bần gọi đom đóm
      const Q = HSX.Quests;
      if (Q) {
        if (Q.dangLam('bac_cau')) {
          const b = Q.buoc('bac_cau');
          buoc.push({ noi: 'me_duoc', chu: b === 0
            ? 'Cái bãi bồi ngay trước hiên nhà, con cắm một trụ mầm đước xuống đó. Rễ nó vươn ra là bà qua được bên kia.'
            : 'Rễ đước đang bám bùn rồi. Đợi thêm chút, bà nghe được tiếng rễ siết.' });
        } else if (Q.daXong('dom_dom')) {
          buoc.push({ noi: 'me_duoc', chu: 'Đêm qua đom đóm về kín rặng bần. Cổng Rừng sáng lên như có đèn. Con giỏi lắm.' });
        } else if (Q.daXong('bac_cau')) {
          buoc.push(
            { noi: 'me_duoc', chu: 'Cây cầu rễ chắc rồi. Cầm lấy cái xẻng này. Rặng bần ven lạch đang thiếu bần; chỗ nào đèn chiếu sáng quá thì đom đóm không đậu.' },
            { noi: 'mam', chu: 'Con trồng bần ở mấy ô tối, đủ bốn cây. Cây mọc nhầm chỗ sáng thì con đào lên.' });
        }
      }
      if (s.seeds < 2) {
        buoc.push({ noi: 'me_duoc', chu: 'Hết trụ mầm rồi hả con? Bà còn mấy cây đây, cầm lấy.',
          lam: () => { s.seeds += 3; W().text(P().cx(), P().b.y - 16, '+3 🌱', '#9ff0b5', 16); } });
      }
      if (s.bosses.luoi_ma_khong_lo) {
        buoc.push(
          { noi: 'me_duoc', chu: 'Con nghe không? Tiếng cá thòi lòi lách tách dưới bùn lại rồi đó.' },
          { noi: 'me_duoc', chu: 'Ông Sông ở thượng nguồn nhắn xuống: nước sông đen như mực. Rác với nước bẩn đều từ trên đó trôi về đây.' },
          { noi: 'mam', chu: 'Vậy chặng tiếp theo là đi ngược lên sông.' });
      } else if (!s.flags.xa_lach_nuoc) {
        buoc.push({ noi: 'me_duoc', chu: 'Cái lạch phía trước bị rác bịt cống, nước tù ngập cả lối. Con phá chỗ rác chặn đó đi, nước sẽ thoát ra biển.' });
      } else {
        buoc.push({ noi: 'me_duoc', chu: 'Qua khỏi đầm là tới cửa rừng. Trong hang sâu nhất có một tấm lưới ma lớn lắm, cẩn thận nghe con.' });
      }
      // một mẩu chuyện về rừng, mỗi lần nói một chuyện
      const ke = [
        ['Rễ đước làm sóng yếu đi trước khi tới bờ. Hồi rừng còn dày, bão về làng mình đỡ hơn nhiều lắm.', 'rungchan'],
        ['Đầm tôm cần nước triều ra vào, rừng cũng vậy. Bít cống lại thì cả hai cùng chết.', 'trieu'],
        ['Hồi người ta chặt rừng đào đầm, bà không trách. Ai cũng muốn nhà mình đủ ăn. Cái khó là làm sao cho rừng với người cùng sống.', 'tom'],
      ];
      const k = (s.flags.meDuocKe = (s.flags.meDuocKe || 0) + 1) % ke.length;
      buoc.push({ noi: 'me_duoc', chu: ke[k][0], lam: () => HSX.Sys.fact(ke[k][1]) });
      TR().chay('me_duoc', buoc, { khongLuu: true });
    },
  };
  void D;
})();
