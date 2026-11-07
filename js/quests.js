/* Hệ nhiệm vụ dùng chung: nhiệm vụ khai báo trong HSX.DATA.quests.
   Mỗi nhiệm vụ: ten, nguoiGiao, moKhi(), buoc[], xong(), xongText, khiXong().
   Trạng thái lưu ở HSX.S.quests[id] = { state: 'moi' | 'dang' | 'xong', buoc }.
   tick(dt) tự nhận nhiệm vụ khi moKhi() đúng, tự chuyển bước và tự hoàn thành.
   domDomDat() là hàm thuần: kiểm tra vườn đom đóm ở Rặng Bần, chạy được cả khi không có DOM. */
(function () {
  const D = HSX.DATA;
  let tickT = 0;

  const bao = (msg, cls, ms) => { if (HSX.UI && HSX.UI.toast) HSX.UI.toast(msg, cls, ms); };
  const luu = () => { if (HSX.saveGame) HSX.saveGame(); };
  const phat = (id, state) => { if (HSX.emit) HSX.emit('quest', { id, state }); };

  HSX.Quests = {
    ds() { return D.quests || {}; },
    def(id) { return this.ds()[id]; },
    trangThai(id) {
      const s = HSX.S, q = s && s.quests && s.quests[id];
      return q ? q.state : 'moi';
    },
    buoc(id) {
      const s = HSX.S, q = s && s.quests && s.quests[id];
      return q ? q.buoc : 0;
    },
    daXong(id) { return this.trangThai(id) === 'xong'; },
    dangLam(id) { return this.trangThai(id) === 'dang'; },
    // Danh sách cho bảng nhiệm vụ sau này: { id, ten, state, buoc, ...định nghĩa }
    list() {
      return Object.keys(this.ds()).map(id => Object.assign({ id, state: this.trangThai(id), buoc: this.buoc(id) }, this.ds()[id]));
    },

    batDau(id) {
      const def = this.def(id);
      if (!def || this.trangThai(id) !== 'moi') return false;
      const s = HSX.S;
      (s.quests = s.quests || {})[id] = { state: 'dang', buoc: 0 };
      const step = def.buoc && def.buoc[0];
      bao(`📜 Nhiệm vụ mới: <b>${def.ten}</b>${step ? '<br>' + step.text : ''}`, 'fact', 6200);
      luu();
      phat(id, 'dang');
      return true;
    },

    capNhat(id, buoc) {
      const def = this.def(id), s = HSX.S, q = s && s.quests && s.quests[id];
      if (!def || !q || q.state !== 'dang' || buoc <= q.buoc) return false;
      q.buoc = buoc;
      const step = def.buoc && def.buoc[buoc];
      if (step) bao(`📜 <b>${def.ten}</b><br>${step.text}`, '', 5200);
      luu();
      return true;
    },

    hoanThanh(id) {
      const def = this.def(id), s = HSX.S, q = s && s.quests && s.quests[id];
      if (!def || !q || q.state !== 'dang') return false;
      q.state = 'xong';
      if (def.khiXong) {
        try { def.khiXong(); } catch (e) { console.error('Quest ' + id, e); }
      }
      bao(`✅ Hoàn thành: <b>${def.ten}</b>${def.xongText ? '<br>' + def.xongText : ''}`, 'fact', 7000);
      luu();
      phat(id, 'xong');
      return true;
    },

    tick(dt) {
      tickT += dt;
      if (tickT < 0.4) return;
      tickT = 0;
      const s = HSX.S;
      if (!s) return;
      s.quests = s.quests || {};
      const ds = this.ds();
      for (const id in ds) {
        const def = ds[id], st = this.trangThai(id);
        try {
          if (st === 'moi') {
            if (def.moKhi && def.moKhi()) this.batDau(id);
            continue;
          }
          if (st !== 'dang') continue;
          if (def.xong && def.xong()) { this.hoanThanh(id); continue; }
          const q = s.quests[id], step = def.buoc && def.buoc[q.buoc];
          if (step && step.xong && step.xong()) this.capNhat(id, q.buoc + 1);
        } catch (e) {
          console.error('Quest ' + id, e);   // một nhiệm vụ lỗi không chặn các nhiệm vụ khác
        }
      }
    },

    // Vườn đom đóm: đủ plantNeed cây bần đã lớn ở ô tối, và không cây bần lớn nào ở ô quá sáng.
    domDomDat(def, trees) {
      const sang = (def && def.plantSang) || [], need = (def && def.plantNeed) || 0;
      let dat = 0, sai = 0;
      for (let i = 0; i < sang.length; i++) {
        const t = trees && trees[i];
        if (!t || t.type !== 'ban' || t.g < 1) continue;
        if (sang[i] >= 2) sai++;
        else dat++;
      }
      return { dat, can: need, sai, ok: dat >= need && sai === 0 };
    },
  };
})();
