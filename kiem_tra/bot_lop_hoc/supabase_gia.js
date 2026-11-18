/* supabase-js GIẢ cho bài thử 20 bot (kiem_tra/bot_lop_hoc_web.mjs). Chỉ nạp trong bài thử: bài thử chặn
   tệp supabase-js thật trên CDN và trả tệp này thay vào. Trang web, tai_khoan.js, dong_bo.js, lop_hoc.js...
   vẫn là mã thật, không sửa dòng nào.
   Mọi truy vấn được gửi về /__bot_db của máy chủ thử (cơ sở dữ liệu trong bộ nhớ), không đi ra mạng. */
(function () {
  'use strict';
  function createClient(url, key, opts) {
    var khoaPhien = (opts && opts.auth && opts.auth.storageKey) || 'sb-phien';
    function phien() { try { return JSON.parse(localStorage.getItem(khoaPhien) || 'null'); } catch (e) { return null; } }
    var nghe = [];

    function goi(yc) {
      var p = phien();
      return fetch('/__bot_db', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ nguoi: p && p.user ? p.user.id : null }, yc)),
      }).then(function (r) { return r.json(); });
    }

    function Truy(bang) { this.yc = { bang: bang, op: 'select', loc: [], xep: [], cot: '*' }; }
    Truy.prototype.select = function (cot) { this.yc.cot = cot || '*'; this.yc.traVe = true; return this; };
    Truy.prototype.eq = function (c, v) { this.yc.loc.push(['eq', c, v]); return this; };
    Truy.prototype.in = function (c, v) { this.yc.loc.push(['in', c, v]); return this; };
    Truy.prototype.order = function (c, o) { this.yc.xep.push([c, !(o && o.ascending === false)]); return this; };
    Truy.prototype.limit = function (n) { this.yc.gioiHan = n; return this; };
    Truy.prototype.single = function () { this.yc.mot = 'single'; return this; };
    Truy.prototype.maybeSingle = function () { this.yc.mot = 'maybe'; return this; };
    Truy.prototype.insert = function (dong) { this.yc.op = 'insert'; this.yc.dong = [].concat(dong); return this; };
    Truy.prototype.upsert = function (dong, o) {
      this.yc.op = 'upsert'; this.yc.dong = [].concat(dong);
      this.yc.trungCot = o && o.onConflict; this.yc.boQuaTrung = !!(o && o.ignoreDuplicates); return this;
    };
    Truy.prototype.update = function (gt) { this.yc.op = 'update'; this.yc.gt = gt; return this; };
    Truy.prototype.delete = function () { this.yc.op = 'delete'; return this; };
    Truy.prototype.then = function (ok, loi) { return goi(this.yc).then(ok, loi); };

    return {
      auth: {
        getUser: function () { var p = phien(); return Promise.resolve({ data: { user: p ? p.user : null }, error: null }); },
        getSession: function () { return Promise.resolve({ data: { session: phien() }, error: null }); },
        onAuthStateChange: function (cb) { nghe.push(cb); return { data: { subscription: { unsubscribe: function () {} } } }; },
        signOut: function () { localStorage.removeItem(khoaPhien); nghe.forEach(function (cb) { cb('SIGNED_OUT', null); }); return Promise.resolve({ error: null }); },
        signInWithPassword: function () { return Promise.resolve({ data: {}, error: { message: 'Bài thử bot không đăng nhập bằng mật khẩu' } }); },
        signUp: function () { return Promise.resolve({ data: {}, error: { message: 'Bài thử bot không đăng ký' } }); },
        updateUser: function () { return Promise.resolve({ data: {}, error: null }); },
        resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
      },
      from: function (bang) { return new Truy(bang); },
      rpc: function (ten, thamSo) { return goi({ op: 'rpc', ten: ten, thamSo: thamSo || {} }); },
      functions: {
        invoke: function () {
          return Promise.resolve({ data: null, error: { message: 'Bài thử bot không gọi hàm máy chủ', context: { json: function () { return Promise.resolve({ loi: 'Bài thử bot không gọi hàm máy chủ' }); } } } });
        },
      },
    };
  }
  window.supabase = { createClient: createClient };
})();
