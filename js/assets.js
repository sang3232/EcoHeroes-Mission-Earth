/* Nạp ảnh từ thư mục assets/. Thiếu ảnh nào thì game vẽ bằng code hoặc emoji thay cho ảnh đó. */
HSX.Assets = {
  imgs: {},
  PLAYER: ['mam', 'mam_chay1', 'mam_chay2', 'mam_chay3', 'mam_nhay', 'mam_roi', 'mam_chem', 'mam_chem_len', 'mam_chem_xuong', 'mam_luot', 'mam_dau', 'mam_hoi'],

  load() {
    const D = HSX.DATA, keys = [];
    ['bai_bien_xa', 'bai_bien_gan', 'hang_xa', 'dao_rac_xa', 'boss_xa', 'o_cat', 'o_da'].forEach(id => keys.push('bg/' + id));
    this.PLAYER.forEach(id => keys.push('player/' + id));
    // Khung cắt từ bảng khung Qwen (assets/player/khung.js do qwen/cong_cu.py ghi)
    const K = HSX.KHUNG_MAM || {};
    Object.keys(K).forEach(dt => { for (let i = 1; i <= K[dt]; i++) keys.push(`player/mam_${dt}_${i}`); });
    D.spiritOrder.forEach(id => keys.push('heroes/' + id));
    Object.keys(D.enemies).forEach(id => keys.push('enemies/' + id));
    Object.keys(D.bosses).forEach(id => keys.push('enemies/' + D.bosses[id].img));
    Object.keys(D.items).forEach(id => keys.push('items/' + id));
    Object.keys(D.trees).forEach(id => keys.push('trees/' + id));
    Object.keys(D.species).forEach(id => keys.push('species/' + id));
    new Set(keys).forEach(key => {
      const img = new Image();
      img.onload = () => {
        this.imgs[key] = img;
        if (key.startsWith('bg/o_') && HSX.Render) HSX.Render.tilesDirty = true;
      };
      img.src = 'assets/' + key + '.png';
    });
  },

  get(key) { return this.imgs[key] || null; },

  html(key, emoji, cls) {
    const img = this.imgs[key];
    return img
      ? `<img class="ico ${cls || ''}" src="${img.src}" alt="">`
      : `<span class="ico emo ${cls || ''}">${emoji}</span>`;
  },
};
