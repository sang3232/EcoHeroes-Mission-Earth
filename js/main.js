/* Khởi động game và vòng lặp chính: vật lý cố định 60 lần/giây, vẽ theo màn hình */
(function () {
  // Màn hình cứu khi không mở được ván: viết bằng DOM thuần, không dùng UI / Render
  // (hai phần đó có thể chính là chỗ đang lỗi).
  function manCuu(tieuDe, loi) {
    if (document.getElementById('cuu-van')) return;
    const box = document.createElement('div');
    box.id = 'cuu-van';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'cuu-ten');
    const hop = document.createElement('div');
    hop.className = 'cuu-hop';
    const h = document.createElement('h2');
    h.id = 'cuu-ten';
    h.textContent = tieuDe;
    const p = document.createElement('p');
    p.textContent = 'Tiến trình đang lưu có thể bị lỗi. Bạn có thể tải lại trang để thử lần nữa, hoặc xoá ván lỗi và chơi lại từ đầu.';
    hop.append(h, p);
    if (loi) {
      const pre = document.createElement('pre');
      pre.className = 'cuu-loi';
      pre.textContent = loi;
      hop.appendChild(pre);
    }
    const row = document.createElement('div');
    row.className = 'row';
    const thu = document.createElement('button');
    thu.className = 'btn primary';
    thu.textContent = 'Tải lại trang';
    thu.onclick = () => location.reload();
    const xoa = document.createElement('button');
    xoa.className = 'btn danger';
    xoa.textContent = 'Xoá ván lỗi và chơi lại';
    xoa.onclick = () => {
      try {
        const raw = localStorage.getItem(HSX.SAVE_KEY);
        if (raw) localStorage.setItem(HSX.SAVE_KEY + '-hong', raw);   // giữ lại để nhờ cứu
      } catch (e) { /* hết chỗ */ }
      try { localStorage.removeItem(HSX.SAVE_KEY); } catch (e) { /* bỏ qua */ }
      location.reload();
    };
    row.append(thu, xoa);
    const ghiChu = document.createElement('p');
    ghiChu.className = 'small muted';
    ghiChu.textContent = 'Muốn giữ ván để xem lại? Đừng xoá: bản lỗi được sao lưu ở khoá "hoi-sinh-xanh-v2-hong" trong Local Storage.';
    hop.append(row, ghiChu);
    box.appendChild(hop);
    document.body.appendChild(box);
    thu.focus();
  }

  let chayDuoc = false;
  try {
    const old = HSX.hadOldSave();
    const loaded = HSX.loadSave();
    HSX.S = loaded || HSX.newState();

    HSX.Input.init();
    HSX.Assets.load();
    HSX.Audio.init();
    HSX.Render.init(document.getElementById('game'));
    HSX.UI.init();
    HSX.World.init();
    // Game mới: cảnh mở đầu (Mầm thức dậy giữa đống rác), xong thì nhắc về bảng hướng dẫn
    if (!loaded && !HSX.Truyen.play('mo_dau', { sau: () => HSX.UI.showIntro(old) })) HSX.UI.showIntro(old);
    if (old) HSX.dropOldSave();
    chayDuoc = true;
  } catch (e) {
    console.error('Không khởi động được game:', e);
    manCuu('Không mở được ván đã lưu', e && e.message ? e.message : String(e));
  }
  if (!chayDuoc) return;

  const STEP = 1 / 60;
  let acc = 0, last = performance.now();
  function frame(now) {
    try {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      HSX.Input.poll();
      if (HSX.PhatLai && HSX.PhatLai.dang) {
        // Đang xem lại trận boss (js/phat_lai.js): game đứng yên, chỉ dựng lại cảnh theo nhật ký
        acc = 0;
        HSX.PhatLai.capNhat(dt);
        HSX.Input.step();
      } else if (HSX.UI.blocking()) {
        // Menu đang mở: game đứng yên. Nút Start của tay cầm đóng menu.
        acc = 0;
        if (HSX.Input.pressed('menu') && !HSX.Puzzle.active) HSX.UI.closeModal();
        HSX.Input.step();
      } else {
        acc += dt;
        while (acc >= STEP) {
          HSX.World.update(STEP);
          HSX.Input.step();
          acc -= STEP;
          if (HSX.UI.blocking()) { acc = 0; break; }
        }
      }
      HSX.Render.draw();
    } catch (e) {
      // Lỗi giữa chừng: dừng vòng lặp và cho người chơi lối thoát, thay vì màn hình đen im lặng
      console.error('Lỗi khi chạy game:', e);
      manCuu('Game gặp lỗi khi đang chơi', e && e.message ? e.message : String(e));
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  addEventListener('beforeunload', () => HSX.saveGame());
  document.addEventListener('visibilitychange', () => { if (document.hidden) HSX.saveGame(); });
})();
