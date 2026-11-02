/* Hồi Sinh Xanh — dữ liệu game: vật phẩm, công thức, tinh linh, quái, puzzle, kiến thức. */
window.HSX = window.HSX || {};

HSX.T = 48;          // cỡ ô gạch (px)
HSX.VW = 960;        // khung nhìn
HSX.VH = 540;

HSX.DATA = {
  // Cấp của Vợt Bắt Rác (nâng ở Bàn lọc tại Trạm)
  tiers: [
    { name: 'Thô', dmg: 5, color: '#8a9399' },
    { name: 'Sạch', dmg: 8, color: '#2d9cdb' },
    { name: 'Tinh khiết', dmg: 12, color: '#e0a800' },
  ],
  weaponCost: [
    null,
    { ong_nhua: 4, luoi_cu: 3, manh_thuy_tinh: 2 },
    { ong_nhua: 6, lon_nhom: 8, manh_thuy_tinh: 5, gach_sinh_thai: 2 },
  ],

  items: {
    // Nguyên liệu thô
    chai_pet:       { kind: 'material', name: 'Chai nhựa PET', emoji: '🧴', desc: 'Chai nước dạt vào bờ. Nghiền thành hạt nhựa hoặc làm phao.' },
    tui_nilon:      { kind: 'material', name: 'Túi nilon', emoji: '🛍️', desc: 'Rất khó tái chế. Nhồi thật chặt vào đâu đó có khi lại hữu ích...' },
    lon_nhom:       { kind: 'material', name: 'Lon nhôm', emoji: '🥫', desc: 'Kim loại nhẹ, bền, tái chế được nhiều lần.' },
    luoi_cu:        { kind: 'material', name: 'Lưới cũ', emoji: '🕸️', desc: 'Lưới đánh cá bị bỏ lại trên biển.' },
    vo_so:          { kind: 'material', name: 'Vỏ sò', emoji: '🐚', desc: 'Nhặt trên bãi cát. Nghe nói gió biển rất thích chúng.' },
    rong_bien:      { kind: 'material', name: 'Rong biển', emoji: '🌿', desc: 'Rác hữu cơ, ủ thành phân compost.' },
    manh_thuy_tinh: { kind: 'material', name: 'Thủy tinh biển', emoji: '💎', desc: 'Mảnh chai vỡ bị sóng và cát mài nhẵn.' },
    // Sơ chế
    hat_nhua:       { kind: 'material', name: 'Hạt nhựa', emoji: '🔘', desc: 'Nhựa nghiền nhỏ, dùng để ép ống.' },
    day_thung:      { kind: 'material', name: 'Dây thừng', emoji: '🧶', desc: 'Bện lại từ lưới cũ.', fact: 'luoima' },
    ong_nhua:       { kind: 'material', name: 'Ống nhựa', emoji: '🥤', desc: 'Ép từ hạt nhựa. Dùng để nâng cấp Vợt.' },
    phao_nhua:      { kind: 'material', name: 'Phao nhựa', emoji: '⭕', desc: 'Chai nhựa đóng kín buộc lại, nổi trên nước.' },
    gach_sinh_thai: { kind: 'material', name: 'Gạch sinh thái', emoji: '🧱', desc: 'Chai nhựa nhồi chặt túi nilon, cứng như gạch.', fact: 'gach' },
    compost:        { kind: 'consumable', name: 'Phân compost', emoji: '🍂', desc: 'Bón khi trồng: cây lớn nhanh gấp đôi.', fact: 'rong' },
    // Vũ khí
    vot:            { kind: 'weapon', name: 'Vợt Bắt Rác', emoji: '🥅', desc: 'Vũ khí của Mầm. Nâng cấp ở Bàn lọc tại Trạm Tái Chế.' },
    // Bùa: 3 ô, chỉ đổi khi ngồi ở Trạm
    khien_lon:      { kind: 'charm', name: 'Khiên Lon', emoji: '🛡️', fx: { shield: 20 }, desc: 'Chặn hoàn toàn 1 đòn, hồi lại sau 20 giây.', fact: 'lon' },
    chuong_gio:     { kind: 'charm', name: 'Chuông Gió Vỏ Sò', emoji: '🎐', fx: { speed: 0.15, seedBonus: 0.25 }, desc: '+15% tốc độ chạy, +25% hạt giống rơi.' },
    phao_quay_dau:  { kind: 'charm', name: 'Phao Quây Dầu', emoji: '🔗', fx: { magnet: 130, reach: 0.2 }, desc: 'Hút nguyên liệu từ xa, tầm chém dài hơn 20%.' },
    // Công cụ: có là dùng được
    kinh_lup:       { kind: 'tool', name: 'Kính Lúp Phân Loại', emoji: '🔍', desc: 'Nhìn xuyên tường giả để đi qua. Puzzle phân loại có thêm gợi ý.', fact: 'thuytinh' },
    xuong_phao:     { kind: 'tool', name: 'Xuồng Phao', emoji: '🛶', desc: 'Nổi trên nước độc: đi qua sông tới Đảo Rác.' },
    // Công trình
    rao_chan:       { kind: 'structure', name: 'Rào Chắn Ổ Trứng', emoji: '🚧', desc: 'Dựng ở Bãi đẻ rùa để rùa mẹ yên tâm đẻ trứng.' },
    dan_tach_rac:   { kind: 'structure', name: 'Dàn Tách Rác', emoji: '🗑️', desc: 'Mỗi lần nghỉ ở Trạm nhận thêm 3 nguyên liệu.' },
  },

  stations: {
    nghien:  { name: 'Máy nghiền & ép', emoji: '⚙️' },
    che_tao: { name: 'Bàn chế tạo', emoji: '🛠️' },
    u_phan:  { name: 'Lò ủ phân', emoji: '🪣' },
  },

  // Mỗi bộ nguyên liệu là duy nhất để Bàn thí nghiệm nhận ra
  recipes: [
    { id: 'r_hat_nhua', out: 'hat_nhua', station: 'nghien', cost: { chai_pet: 2 } },
    { id: 'r_ong', out: 'ong_nhua', station: 'nghien', cost: { hat_nhua: 3 } },
    { id: 'r_day', out: 'day_thung', qty: 2, station: 'che_tao', cost: { luoi_cu: 2 } },
    { id: 'r_phao', out: 'phao_nhua', station: 'che_tao', cost: { chai_pet: 3, day_thung: 1 } },
    { id: 'r_khien', out: 'khien_lon', station: 'che_tao', cost: { lon_nhom: 4, day_thung: 1 } },
    { id: 'r_kinh_lup', out: 'kinh_lup', station: 'che_tao', cost: { manh_thuy_tinh: 3, hat_nhua: 1 } },
    { id: 'r_xuong', out: 'xuong_phao', station: 'che_tao', cost: { phao_nhua: 4, day_thung: 2 } },
    { id: 'r_rao', out: 'rao_chan', station: 'che_tao', cost: { gach_sinh_thai: 4, day_thung: 1 } },
    { id: 'r_gach', out: 'gach_sinh_thai', station: 'che_tao', cost: { chai_pet: 1, tui_nilon: 3 }, hidden: true, hint: 'Nhồi túi nilon thật chặt vào một chai nhựa.' },
    { id: 'r_chuong', out: 'chuong_gio', station: 'che_tao', cost: { vo_so: 3, day_thung: 1 }, hidden: true, hint: 'Vỏ sò buộc với dây thừng, gió sẽ hát.' },
    { id: 'r_phao_dau', out: 'phao_quay_dau', station: 'che_tao', cost: { phao_nhua: 2, luoi_cu: 1, day_thung: 1 }, hidden: true, hint: 'Phao nhựa buộc cùng lưới cũ và dây thừng.' },
    { id: 'r_compost', out: 'compost', station: 'u_phan', cost: { rong_bien: 3 } },
  ],

  // 4 nhân vật cũ nay là tinh linh: bay theo Mầm, tỏa sáng, cho khả năng mới
  spiritOrder: ['sen', 'gio', 'gau', 'taiche'],
  spirits: {
    sen:    { name: 'Hoa Sen', emoji: '🌸', color: '#ff9cc8', glow: '255,150,200', ability: 'heal',
              skill: 'Giữ nút Hồi (F) khi đứng yên: tốn 33 năng lượng, hồi 1 lá.' },
    gio:    { name: 'Gió', emoji: '🍃', color: '#7ef0b0', glow: '140,255,190', ability: 'dash',
              skill: 'Bấm Lướt (C) để lướt ngang, cả khi đang nhảy. Vượt được vực gai rộng.' },
    gau:    { name: 'Gấu Rừng', emoji: '🐻', color: '#e0a46a', glow: '255,200,140', ability: 'slam',
              skill: 'Bấm Phép (V) khi đang nhảy: đập xuống, phá nền rác nứt, gây sóng chấn. Tốn 33 năng lượng.' },
    taiche: { name: 'Tái Chế', emoji: '♻️', color: '#7cc8ff', glow: '140,200,255', ability: 'magnet',
              skill: 'Tự hút nguyên liệu ở gần, +20% nguyên liệu rơi.' },
  },

  // ai: cách di chuyển. drops: [vật phẩm, xác suất]. chip: màu mảnh vụn khi trúng đòn, tan biến
  enemies: {
    chai_lan:    { name: 'Chai Lăn', emoji: '🧴', color: '#8fa9b8', ai: 'roller', hp: 12, w: 40, h: 44, speed: 70, rush: 300, sight: 320,
                   chip: ['#cfeaff', '#3d7bd9', '#ffffff'], drops: [['chai_pet', 0.8], ['manh_thuy_tinh', 0.15]] },
    slime_nilon: { name: 'Slime Nilon', emoji: '🛍️', color: '#a393c4', ai: 'hopper', hp: 16, w: 46, h: 40, hopX: 170, hopY: 560, every: 1.3,
                   chip: ['#ecebf4', '#b9b6cc', '#a393c4'], drops: [['tui_nilon', 0.8], ['rong_bien', 0.3]] },
    cua_lon:     { name: 'Cua Lon', emoji: '🥫', color: '#9aa3ab', ai: 'crab', hp: 22, w: 54, h: 42, speed: 60, rush: 320, sight: 280, shell: true,
                   chip: ['#c9ccd1', '#d0453a', '#8a5a3a'], drops: [['lon_nhom', 0.85], ['vo_so', 0.35]] },
    luoi_ma:     { name: 'Lưới Ma', emoji: '🕸️', color: '#6f8794', ai: 'ghost', hp: 14, w: 42, h: 50, speed: 110, sight: 420, fly: true,
                   chip: ['#5f8f6a', '#9fd3a8', '#c49bff'], drops: [['luoi_cu', 0.75], ['rong_bien', 0.3]] },
    // Màn 2. split: chết thì vỡ ra 2 con nhỏ (tạm thời, không lưu). img: dùng chung ảnh với loại khác
    hop_xop:     { name: 'Hộp Xốp', emoji: '📦', color: '#e8e6dc', ai: 'hopper', hp: 14, w: 44, h: 38, hopX: 150, hopY: 470, every: 1.6, split: 'manh_xop',
                   chip: ['#ffffff', '#ecebe4', '#cfcdc2'], drops: [['tui_nilon', 0.5], ['chai_pet', 0.35]] },
    manh_xop:    { name: 'Mảnh Xốp', emoji: '◽', color: '#f0efe8', ai: 'hopper', hp: 4, w: 24, h: 21, hopX: 230, hopY: 380, every: 0.8, img: 'hop_xop',
                   chip: ['#ffffff', '#ecebe4'], drops: [] },
  },
  // sub: dòng chữ nhỏ dưới tên boss khi trận đánh bắt đầu
  bosses: {
    cua_khong_lo: { name: 'Cua Lon Khổng Lồ', img: 'cua_lon', emoji: '🥫', color: '#8d969e', hp: 70, w: 130, h: 100, shell: true, sub: 'Kẻ canh lồng Gấu Rừng',
                    chip: ['#c9ccd1', '#d0453a', '#8a5a3a', '#6b6f75'], drops: { lon_nhom: 10, vo_so: 6, luoi_cu: 4 } },
    vua_nilon:    { name: 'Vua Túi Nilon', img: 'vua_nilon', emoji: '🛍️', color: '#8e7cc3', hp: 90, layers: 5, layerHp: 15, w: 150, h: 170, sub: 'Kẻ đẻ ra Sương Độc',
                    chip: ['#ecebf4', '#b9b6cc', '#e05a5a', '#f2c14e', '#4a90d9'], drops: { chai_pet: 15, tui_nilon: 20, lon_nhom: 10, luoi_cu: 8 } },
    luoi_ma_khong_lo: { name: 'Lưới Ma Khổng Lồ', img: 'luoi_ma_khong_lo', emoji: '🕸️', color: '#6f8794', hp: 120, w: 140, h: 150, fly: true,
                    sub: 'Kết từ trăm tấm lưới bị bỏ lại', chip: ['#5f8f6a', '#9fd3a8', '#c49bff', '#3d6b8a'], drops: { luoi_cu: 12, day_thung: 3, rong_bien: 6 } },
  },

  // Sổ quái vật: gặp thì ghi tên, hạ lần đầu thì mở hình và cách đánh, hạ đủ "can" lần thì mở kiến thức (thẻ Bạn có biết?)
  soQuai: {
    chai_lan: { rac: 'Chai nhựa PET', can: 3, fact: 'chai',
      mo_ta: 'Chai nước uống một lần rồi bỏ, bị sóng đánh dạt lên bờ. Sương Độc làm nó tỉnh dậy và lăn khắp bãi cát.',
      cach: 'Thấy Mầm thì khựng lại lấy đà rồi lăn thẳng tới. Nhảy qua lúc nó lăn, chém khi nó dừng thở.' },
    slime_nilon: { rac: 'Túi nilon', can: 3, fact: 'nilon',
      mo_ta: 'Một búi túi nilon mỏng quấn vào nhau. Nhẹ, bay theo gió, rơi xuống đâu cũng bám chặt.',
      cach: 'Nhảy cóc về phía Mầm theo nhịp đều. Chém lúc nó vừa tiếp đất, hoặc chém xuống từ trên cao.' },
    cua_lon: { rac: 'Lon nhôm', can: 3, fact: 'lon',
      mo_ta: 'Cua làm từ lon nước ngọt móp méo, gỉ sét. Vỏ lon phía trước cứng tới mức vợt bật ra.',
      cach: 'Vỏ trước đỡ mọi đòn chém ngang. Nhảy qua đánh sau lưng, chém xuống, hoặc chờ nó lao xong đứng thở.' },
    luoi_ma: { rac: 'Lưới đánh cá bỏ đi', can: 3, fact: 'luoima',
      mo_ta: 'Lưới đánh cá bị bỏ lại trôi dạt trong nước, vẫn quấn lấy mọi thứ đi qua. Bay xuyên được tường.',
      cach: 'Lượn chậm rồi đuổi theo khi thấy Mầm. Đứng chờ nó tới gần rồi chém, đừng chạy vào chỗ hẹp.' },
    cua_khong_lo: { rac: 'Lon nhôm', can: 1, fact: 'nhom', boss: true,
      mo_ta: 'Cua Lon to nhất bãi, canh giữ lồng của Gấu Rừng ở Ghềnh Đá. Mai lon dày và đôi càng nặng như búa.',
      cach: 'Giơ càng thì sắp đập đất tạo sóng chấn: nhảy qua. Lùi lại lấy đà thì sắp lao: tránh để nó đâm tường, choáng lật ngửa thì chém liên tục.' },
    vua_nilon: { rac: 'Nhựa dùng một lần', can: 1, fact: 'motlan', boss: true,
      mo_ta: 'Kẻ đẻ ra Sương Độc, ghép từ vô số túi nilon, đội vương miện nắp chai. Mỗi lớp túi xé ra lại có lớp khác bên trong.',
      cach: 'Pha 1: chém túi bay tới, nhảy qua sóng chấn khi nó đập đất, tránh cú lao. Xé hết 5 lớp túi thì sang pha 2: nhanh hơn, nuốt rác và nhả ra Slime Nilon.' },
    hop_xop: { rac: 'Hộp xốp, phao xốp', can: 3, fact: 'xop',
      mo_ta: 'Hộp xốp đựng cơm, phao xốp của đầm tôm bị vứt lại ven bờ. Nhẹ, nổi, trôi theo nước vào tận gốc đước.',
      cach: 'Nhảy cóc chậm. Chém vỡ thì nó tách thành hai Mảnh Xốp nhỏ nhảy loạn xạ: dọn luôn kẻo sót lại.' },
    luoi_ma_khong_lo: { rac: 'Lưới đánh cá bỏ đi', can: 1, fact: 'luoibo', boss: true,
      mo_ta: 'Kết từ hàng trăm tấm lưới bị cắt bỏ giữa biển rồi trôi vào rừng đước. Nó quấn lấy mọi thứ đi qua: cá, cua, rễ cây và cả ánh sáng.',
      cach: 'Rướn ra sau là sắp quăng lưới: chạy tránh, bị quấn thì chém liên tục để thoát. Rướn lên cao là sắp lao chéo xuống: lướt sang bên. Nó bay cao thì nhảy lên bục mà chém lên.' },
  },

  // Nguyên liệu rơi từ đống rác, theo khu vực
  heapLoot: {
    bai_bien: [['chai_pet', 1.2], ['tui_nilon', 1], ['lon_nhom', 0.7], ['luoi_cu', 0.6], ['vo_so', 0.5], ['rong_bien', 0.7], ['manh_thuy_tinh', 0.3]],
    hang:     [['lon_nhom', 1], ['luoi_cu', 0.8], ['vo_so', 0.8], ['manh_thuy_tinh', 0.45], ['chai_pet', 0.6]],
    dao_rac:  [['chai_pet', 1.5], ['tui_nilon', 1.5], ['lon_nhom', 1], ['luoi_cu', 1], ['manh_thuy_tinh', 0.8]],
    boss:     [['tui_nilon', 1]],
    rung:     [['luoi_cu', 1.1], ['tui_nilon', 0.9], ['rong_bien', 0.9], ['chai_pet', 0.7], ['vo_so', 0.5], ['lon_nhom', 0.4]],
    dam:      [['tui_nilon', 1.2], ['chai_pet', 0.9], ['luoi_cu', 0.9], ['lon_nhom', 0.5], ['rong_bien', 0.5], ['manh_thuy_tinh', 0.3]],
  },

  // Phòng phân loại ở Lều bỏ hoang: món rác và thùng đúng của nó
  sortItems: [
    { name: 'Chai nước nhựa', emoji: '🧴', bin: 'u', hint: 'Nhựa PET: tái chế được' },
    { name: 'Vỏ chuối', emoji: '🍌', bin: 'o', hint: 'Thức ăn thừa: ủ thành phân' },
    { name: 'Lon nước ngọt', emoji: '🥫', bin: 'u', hint: 'Nhôm: tái chế gần như vô hạn lần' },
    { name: 'Túi nilon bẩn', emoji: '🛍️', bin: 'e', hint: 'Nilon mỏng, dính bẩn: khó tái chế' },
    { name: 'Báo cũ', emoji: '📰', bin: 'u', hint: 'Giấy khô, sạch: tái chế được' },
    { name: 'Xương cá', emoji: '🐟', bin: 'o', hint: 'Thức ăn thừa: ủ thành phân' },
  ],
  bins: {
    u: { name: 'Tái chế được', emoji: '♻️', color: '#2f80ed' },
    o: { name: 'Rác hữu cơ', emoji: '🍌', color: '#27ae60' },
    e: { name: 'Rác thải khác', emoji: '🚮', color: '#6b7280' },
  },

  journals: {
    1: { title: 'Nhật ký Người Gác Cũ — Trang 1', teach: ['r_gach'],
      text: 'Ngày Sương Độc tràn về, rác phủ kín bãi. Tôi nhồi thật chặt túi nilon vào chai nhựa, viên gạch ấy cứng không kém gạch nung. Bốn viên với một sợi dây là đủ dựng hàng rào cho rùa mẹ đẻ trứng.' },
    2: { title: 'Nhật ký Người Gác Cũ — Trang 2', hint: ['r_chuong', 'r_phao_dau'],
      text: 'Trên đảo rác này, logo của Tập Đoàn in trên từng thùng phuy. Họ đổ rác ra đây, rồi Sương Độc mọc lên. Tôi để lại hai điều: vỏ sò buộc dây thừng, gió sẽ hát và mang hạt giống tới. Phao buộc cùng lưới và dây, quây được rác trôi, mai này quây cả dầu loang.' },
    3: { title: 'Sổ tay người nuôi tôm',
      text: 'Năm đó giá tôm lên cao, cả xóm rủ nhau phá rừng đào đầm. Ba vụ đầu trúng lớn, nhà nào cũng sắm được xuồng máy. Tới vụ thứ tư thì tôm chết trắng đầm. Đất nhiễm phèn, nước bẩn, con giống thả xuống bao nhiêu chết bấy nhiêu. Giờ tôi mới hiểu: ngày trước con tôm sống được là nhờ rừng che, rừng lọc nước. Chặt rừng là chặt luôn cái nghề của mình.' },
    4: { title: 'Sổ tay Mẹ Đước',
      text: 'Mùa này đom đóm về đậu kín mấy cây bần ven lạch, cả rặng cây nhấp nháy như có ai thắp đèn. Bọn nhỏ trong xóm hay chèo xuồng ra coi. Từ hồi người ta thắp đèn sáng choang dọc bờ đầm, đom đóm thưa hẳn. Bà trồng lại mấy cây bần, chừa khoảng tối cho tụi nó. Rừng cần cả bóng tối nữa, con à.' },
  },

  // dat: loại ô trồng được. 'cat': ô đất Màn 1 · 'bun': ô đất Màn 2 · 'boi': bãi bồi (Y) Màn 2, cây đước trồng ở đây mọc rễ bắc cầu
  trees: {
    muong_bien: { name: 'Muống biển', emoji: '🌺', cost: 2, grow: 20, light: 80, fact: 'muong', dat: ['cat'], desc: 'Lớn nhanh, giữ cát.' },
    phi_lao:    { name: 'Phi lao', emoji: '🌲', cost: 3, grow: 30, light: 130, fact: 'philao', dat: ['cat'], desc: 'Tỏa sáng mạnh nhất.' },
    dua:        { name: 'Dừa', emoji: '🌴', cost: 5, grow: 40, light: 100, dat: ['cat'], desc: 'Mỗi lần nghỉ ở Trạm cho 2 hạt giống.' },
    duoc:       { name: 'Đước', emoji: '🌳', cost: 2, grow: 15, light: 110, fact: 'duoc', dat: ['boi', 'bun'], desc: 'Cắm trụ mầm xuống bùn. Ở bãi bồi, rễ đước vươn ra bắc thành cầu.' },
    ban:        { name: 'Bần', emoji: '🌳', cost: 3, grow: 25, light: 125, fact: 'ban', dat: ['bun'], desc: 'Mọc ven lạch nước lợ, tỏa sáng mạnh. Đom đóm rất thích cây bần.' },
  },

  species: {
    cong_gio: { name: 'Còng gió', emoji: '🦀', room: 'hang_cong', cond: { tree: { muong_bien: 2 } }, buff: { dropBonus: 0.10 }, fact: 'cong' },
    rua_bien: { name: 'Rùa biển (Đồi mồi)', emoji: '🐢', room: 'bai_de_rua', cond: { clean: 0.8, structure: 'rao_chan' }, buff: { seedBonus: 0.25 }, fact: 'rua' },
    ca_thoi_loi: { name: 'Cá thòi lòi', emoji: '🐟', room: 'dam_bo_hoang', cond: { tree: { duoc: 3 } }, buff: { dropBonus: 0.10 }, fact: 'thoiloi' },
    dom_dom:  { name: 'Đom đóm', emoji: '✨', room: 'ran_ban', cond: { tree: { ban: 2 } }, buff: { seedBonus: 0.15 }, fact: 'domdom' },
    co_trang: { name: 'Cò trắng', emoji: '🕊️', room: 'nha_me_duoc', cond: { clean: 0.7 }, buff: { seedBonus: 0.15 }, fact: 'co' },
  },

  // Bản đồ thế giới: 8 màn theo kịch bản. x, y: vị trí mốc trên bản đồ (% bề ngang / bề cao). Màn chưa có trong game thì hiện "sắp ra mắt".
  theGioi: [
    { id: 'm1', ten: 'Bãi Biển Nhựa', van_de: 'Rác nhựa dùng một lần', emo: '🏖️', x: 12, y: 74 },
    { id: 'm2', ten: 'Rừng Ngập Mặn', van_de: 'Rừng bị chặt làm đầm nuôi tôm', emo: '🌳', x: 27, y: 61 },
    { id: 'm3', ten: 'Sông Đen', van_de: 'Nước thải công nghiệp', emo: '🏭', x: 21, y: 38 },
    { id: 'm4', ten: 'Đồng Khói', van_de: 'Đốt rơm rạ, khói mù', emo: '🌾', x: 36, y: 47 },
    { id: 'm5', ten: 'Núi Rác', van_de: 'Bãi chôn lấp quá tải', emo: '⛰️', x: 42, y: 22 },
    { id: 'm6', ten: 'Thành Phố Kính', van_de: 'Ô nhiễm không khí, kẹt xe', emo: '🏙️', x: 70, y: 24 },
    { id: 'm7', ten: 'Rạn San Hô Bạc', van_de: 'San hô tẩy trắng', emo: '🪸', x: 84, y: 70 },
    { id: 'm8', ten: 'Trung Tâm Tiêu Thụ', van_de: 'Tiêu dùng vô độ', emo: '🏢', x: 54, y: 50 },
  ],

  facts: {
    luat3nhom: 'Luật Bảo vệ môi trường 2020 chia rác sinh hoạt thành 3 nhóm: rác tái chế được, rác thực phẩm và rác thải khác.',
    lon: 'Lon nhôm có thể tái chế nhiều lần mà gần như không giảm chất lượng.',
    nilon: 'Túi nilon mỏng rất khó tái chế và có thể tồn tại trong môi trường hàng trăm năm.',
    gach: 'Gạch sinh thái (ecobrick) là chai nhựa nhồi chặt rác nhựa mềm, dùng làm ghế, bồn cây hay tường thấp.',
    luoima: 'Lưới ma là lưới đánh cá bị bỏ lại, tiếp tục quấn và làm chết sinh vật biển trong nhiều năm.',
    chai: 'Một nghiên cứu năm 2017 ước tính chỉ khoảng 9% lượng nhựa thải ra trên thế giới từ trước tới nay được tái chế.',
    nhom: 'Làm lon từ nhôm tái chế tốn ít hơn khoảng 95% năng lượng so với luyện nhôm mới từ quặng.',
    motlan: 'Trong các đợt nhặt rác bãi biển, phần lớn món rác hay gặp nhất là đồ nhựa dùng một lần: vỏ bánh kẹo, chai nước, nắp chai, túi nilon, ống hút.',
    rua: 'Rùa biển cái thường quay về đúng vùng bãi biển nơi nó nở ra để đẻ trứng.',
    cong: 'Còng gió đào hang trên bãi cát. Mật độ hang còng thường được dùng để đánh giá sức khỏe của bãi biển.',
    philao: 'Phi lao được trồng nhiều ven biển miền Trung Việt Nam để chắn gió và chắn cát bay.',
    muong: 'Muống biển bò trên cát, rễ của nó giúp giữ cát không bị gió và sóng cuốn đi.',
    rong: 'Rong biển dạt bờ có thể ủ thành phân bón hữu cơ.',
    thuytinh: 'Thủy tinh biển là mảnh chai vỡ được sóng và cát mài nhẵn trong nhiều năm.',
    // Màn 2: Rừng Ngập Mặn
    trumam: 'Quả đước nảy mầm ngay khi còn trên cây, thành trụ mầm dài. Trụ mầm rụng xuống cắm vào bùn rồi mọc thành cây mới.',
    duoc: 'Cây đước có bộ rễ chống hình vòm cắm sâu xuống bùn, giúp giữ đất và làm yếu sức sóng.',
    rungchan: 'Một dải rừng ngập mặn đủ rộng có thể làm sóng biển yếu đi đáng kể trước khi sóng đánh vào đê và làng ven biển.',
    tom: 'Ở nhiều vùng ven biển châu Á, trong đó có Việt Nam, nhiều rừng ngập mặn đã bị chặt để làm đầm nuôi tôm.',
    trieu: 'Rừng ngập mặn cần nước triều lên xuống mỗi ngày. Bờ bao, cống bị bít làm nước tù đọng thì cây đước chết dần.',
    xop: 'Hộp xốp (nhựa polystyrene) rất nhẹ, dễ vỡ thành hạt nhỏ li ti, gần như không thể nhặt hết khi đã ra môi trường.',
    luoibo: 'Một nghiên cứu năm 2018 về vùng rác lớn giữa Thái Bình Dương cho thấy lưới đánh cá chiếm gần một nửa khối lượng rác nhựa trôi nổi ở đó.',
    thoiloi: 'Cá thòi lòi sống ở bãi bùn rừng ngập mặn. Chúng thở được qua da và miệng, dùng vây ngực để trườn và trèo lên rễ cây.',
    domdom: 'Đom đóm dùng ánh sáng để tìm bạn. Đèn điện quá sáng ban đêm khiến chúng khó tìm nhau, nên đom đóm thưa dần ở nơi nhiều đèn.',
    co: 'Rừng ngập mặn là nơi làm tổ và kiếm ăn của nhiều loài chim nước như cò, diệc.',
    ban: 'Cây bần mọc ven sông rạch vùng nước lợ. Ở miền Tây Nam Bộ, đom đóm hay tụ về đậu trên cây bần vào ban đêm.',
  },

  puzzle: {
    binsR1: [
      { id: 'taiche', name: 'Tái chế được', emoji: '♻️', color: '#2f80ed' },
      { id: 'huuco', name: 'Rác hữu cơ', emoji: '🍌', color: '#27ae60' },
      { id: 'khac', name: 'Rác thải khác', emoji: '🚮', color: '#6b7280' },
    ],
    binsR2: [
      { id: 'nhua', name: 'Nhựa', emoji: '🧴', color: '#2f80ed' },
      { id: 'kimloai', name: 'Kim loại', emoji: '🥫', color: '#8e44ad' },
      { id: 'giaytt', name: 'Giấy & thủy tinh', emoji: '📦', color: '#e67e22' },
      { id: 'huuco', name: 'Rác hữu cơ', emoji: '🍌', color: '#27ae60' },
      { id: 'khac', name: 'Rác thải khác', emoji: '🚮', color: '#6b7280' },
    ],
    items: [
      { name: 'Chai nước nhựa', emoji: '🧴', cat: 'nhua', hint: 'Nhựa số 1 (PET): tái chế được' },
      { name: 'Xô nhựa vỡ', emoji: '🪣', cat: 'nhua', hint: 'Nhựa cứng HDPE (số 2): tái chế được' },
      { name: 'Lon nước ngọt', emoji: '🥫', cat: 'kimloai', hint: 'Nhôm: tái chế gần như vô hạn lần' },
      { name: 'Bu lông gỉ', emoji: '🔩', cat: 'kimloai', hint: 'Sắt thép: bán phế liệu được' },
      { name: 'Chai thủy tinh', emoji: '🍾', cat: 'giaytt', hint: 'Thủy tinh: nấu chảy làm chai mới' },
      { name: 'Thùng các-tông', emoji: '📦', cat: 'giaytt', hint: 'Giấy bìa khô: tái chế được' },
      { name: 'Báo cũ', emoji: '📰', cat: 'giaytt', hint: 'Giấy khô, sạch: tái chế được' },
      { name: 'Vỏ chuối', emoji: '🍌', cat: 'huuco', hint: 'Thức ăn thừa: ủ thành phân' },
      { name: 'Xương cá', emoji: '🐟', cat: 'huuco', hint: 'Thức ăn thừa: ủ thành phân' },
      { name: 'Bã cà phê', emoji: '☕', cat: 'huuco', hint: 'Hữu cơ: ủ phân rất tốt' },
      { name: 'Rong biển dạt bờ', emoji: '🌿', cat: 'huuco', hint: 'Hữu cơ: ủ thành phân' },
      { name: 'Lá khô', emoji: '🍂', cat: 'huuco', hint: 'Hữu cơ: ủ thành phân' },
      { name: 'Túi nilon bẩn', emoji: '🛍️', cat: 'khac', hint: 'Nilon mỏng, dính bẩn: khó tái chế' },
      { name: 'Ống hút nhựa', emoji: '🥤', cat: 'khac', hint: 'Nhựa nhỏ và bẩn: thường không tái chế được' },
      { name: 'Hộp xốp dính dầu', emoji: '🍱', cat: 'khac', hint: 'Xốp bẩn: không tái chế được' },
      { name: 'Khẩu trang đã dùng', emoji: '😷', cat: 'khac', hint: 'Đồ vệ sinh cá nhân: bỏ rác khác' },
      { name: 'Giấy vệ sinh đã dùng', emoji: '🧻', cat: 'khac', hint: 'Giấy bẩn: không tái chế được' },
    ],
  },
};

HSX.DATA.recipesById = {};
HSX.DATA.recipes.forEach(r => { HSX.DATA.recipesById[r.id] = r; });
