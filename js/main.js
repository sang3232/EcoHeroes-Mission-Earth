/* Khởi động game và vòng lặp chính: vật lý cố định 60 lần/giây, vẽ theo màn hình */
(function () {
  const old = HSX.hadOldSave();
  const loaded = HSX.loadSave();
  HSX.S = loaded || HSX.newState();

  HSX.Input.init();
  HSX.Assets.load();
  HSX.Render.init(document.getElementById('game'));
  HSX.UI.init();
  HSX.World.init();
  if (!loaded) HSX.UI.showIntro(old);
  if (old) HSX.dropOldSave();

  const STEP = 1 / 60;
  let acc = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    HSX.Input.poll();
    if (HSX.UI.blocking()) {
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
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  addEventListener('beforeunload', () => HSX.saveGame());
  document.addEventListener('visibilitychange', () => { if (document.hidden) HSX.saveGame(); });
})();
