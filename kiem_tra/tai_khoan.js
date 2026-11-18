/* Kiểm tra đăng nhập / đăng ký (js/web/tai_khoan.js) mà không cần mạng hay máy chủ thật.
   Nạp file thật trong một hộp cát (vm): giả lập window, localStorage, location và một
   supabase-js giả ghi lại mọi lời gọi. Nhờ vậy test chạy đúng code thật của trang đăng nhập:
   quy tắc email học sinh, kiểm tra mã lớp / tên đăng nhập, gọi signUp / signInWithPassword
   đúng tham số, chặn tài khoản học sinh đăng nhập ở tab giáo viên, và dịch lỗi sang tiếng Việt.

   Chạy:  node kiem_tra/tai_khoan.js
   Không tạo tài khoản thật, không gửi gì ra ngoài. */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

let soLoi = 0;
function nhom(ten) { console.log('\n' + ten); }
function ok(dieu, mo) { if (dieu) console.log('  ✓ ' + mo); else { console.log('  ✗ ' + mo); soLoi++; } }
async function nem(ham, khopLoi, mo) {
  try { await ham(); console.log('  ✗ ' + mo + ' (lẽ ra phải báo lỗi)'); soLoi++; }
  catch (e) { const m = String(e && e.message || e); if (!khopLoi || khopLoi.test(m)) console.log('  ✓ ' + mo); else { console.log('  ✗ ' + mo + ' — lỗi khác: ' + m); soLoi++; } }
}

// ---- supabase-js giả: ghi lại lời gọi, trả kết quả đặt trước ----
function taoSupabaseGia() {
  const g = { goi: [], ketQua: {}, hoSo: { data: null, error: null }, nguoiDung: { data: { user: null }, error: null } };
  function ghi(ten, tham) { g.goi.push({ ten, tham }); }
  function tra(ten) { return g.ketQua[ten] || { data: {}, error: null }; }
  const auth = {
    signInWithPassword: async (o) => { ghi('signInWithPassword', o); return tra('signInWithPassword'); },
    signUp: async (o) => { ghi('signUp', o); return tra('signUp'); },
    signOut: async () => { ghi('signOut', null); return { error: null }; },
    getUser: async () => g.nguoiDung,
    resetPasswordForEmail: async (email, o) => { ghi('resetPasswordForEmail', { email, o }); return tra('resetPasswordForEmail'); },
    updateUser: async (o) => { ghi('updateUser', o); return tra('updateUser'); },
    onAuthStateChange: (cb) => { g.onAuth = cb; return { data: { subscription: { unsubscribe() {} } } }; },
  };
  const sb = {
    auth,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => g.hoSo }) }) }),
    functions: { invoke: async (ten, o) => { ghi('invoke', { ten, o }); return tra('invoke'); } },
  };
  g.client = sb;
  return g;
}

function nap(cauHinh) {
  const luu = {};
  const localStorage = {
    getItem: (k) => (k in luu ? luu[k] : null),
    setItem: (k, v) => { luu[k] = String(v); },
    removeItem: (k) => { delete luu[k]; },
  };
  const gia = taoSupabaseGia();
  const sandbox = {
    console, localStorage,
    location: { origin: 'https://vd.example', pathname: '/thu-muc/dang-nhap.html' },
    window: { HSX_CAU_HINH: cauHinh, supabase: { createClient: () => gia.client } },
  };
  sandbox.window.localStorage = localStorage;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'web', 'tai_khoan.js'), 'utf8'), sandbox);
  return { TK: sandbox.window.HSXTaiKhoan, gia, luu };
}

const CAU_HINH = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_KEY: 'sb_publishable_test', MIEN_HOC_SINH: 'hs.hoisinhxanh.example' };

(async function () {
  // 1) Email ảo của học sinh
  nhom('1) Quy tắc email học sinh');
  {
    const { TK } = nap(CAU_HINH);
    ok(TK.emailHocSinh('K7P2QA', 'an.nguyen') === 'k7p2qa.an.nguyen@hs.hoisinhxanh.example', 'ghép <mã lớp>.<tên>@miền, viết thường');
    ok(TK.emailHocSinh('  k7p2qa ', '  AN.NGUYEN  ') === 'k7p2qa.an.nguyen@hs.hoisinhxanh.example', 'cắt khoảng trắng và hạ chữ thường');
  }

  // 2) Đăng nhập học sinh: kiểm tra đầu vào trước khi gọi mạng
  nhom('2) Đăng nhập học sinh — chặn đầu vào sai');
  {
    const { TK, gia } = nap(CAU_HINH);
    await nem(() => TK.dangNhapHocSinh('ABC', 'an.nguyen', '123456'), /Mã lớp/, 'mã lớp dưới 6 ký tự bị chặn');
    await nem(() => TK.dangNhapHocSinh('K7P2Q!', 'an.nguyen', '123456'), /Mã lớp/, 'mã lớp có ký tự lạ bị chặn');
    await nem(() => TK.dangNhapHocSinh('K7P2QA', 'An Nguyen', '123456'), /Tên đăng nhập/, 'tên có khoảng trắng bị chặn');
    await nem(() => TK.dangNhapHocSinh('K7P2QA', 'a', '123456'), /Tên đăng nhập/, 'tên quá ngắn bị chặn');
    ok(gia.goi.filter((x) => x.ten === 'signInWithPassword').length === 0, 'đầu vào sai thì KHÔNG gọi máy chủ');
  }

  // 3) Đăng nhập học sinh hợp lệ → gọi đúng email dẫn xuất
  nhom('3) Đăng nhập học sinh hợp lệ');
  {
    const { TK, gia } = nap(CAU_HINH);
    gia.ketQua.signInWithPassword = { data: { user: { id: 'u1' } }, error: null };
    gia.nguoiDung = { data: { user: { id: 'u1', email: 'k7p2qa.an.nguyen@hs.hoisinhxanh.example' } }, error: null };
    gia.hoSo = { data: { id: 'u1', vai_tro: 'hoc_sinh', ho_ten: 'An', ten_dang_nhap: 'an.nguyen', lop_id: 'L1', lop: { ten: '7A', ma_lop: 'K7P2QA' } }, error: null };
    const hs = await TK.dangNhapHocSinh('k7p2qa', 'An.Nguyen', 'matkhau');
    const g = gia.goi.find((x) => x.ten === 'signInWithPassword');
    ok(g && g.tham.email === 'k7p2qa.an.nguyen@hs.hoisinhxanh.example', 'gửi đúng email ảo cho máy chủ');
    ok(g && g.tham.password === 'matkhau', 'gửi đúng mật khẩu');
    ok(hs && hs.vai_tro === 'hoc_sinh' && hs.ma_lop === 'K7P2QA', 'trả hồ sơ học sinh đã rút gọn');
  }

  // 4) Sai thông tin → dịch lỗi sang tiếng Việt, không lộ thông điệp gốc
  nhom('4) Sai thông tin đăng nhập');
  {
    const { TK, gia } = nap(CAU_HINH);
    gia.ketQua.signInWithPassword = { data: { user: null }, error: { message: 'Invalid login credentials' } };
    await nem(() => TK.dangNhapHocSinh('K7P2QA', 'an.nguyen', 'sai'), /Sai thông tin đăng nhập/, 'báo lỗi tiếng Việt khi sai mật khẩu');
  }

  // 5) Đăng ký giáo viên
  nhom('5) Đăng ký giáo viên');
  {
    const { TK, gia } = nap(CAU_HINH);
    gia.ketQua.signUp = { data: { session: null, user: { id: 'g1' } }, error: null };
    const kq = await TK.dangKyGiaoVien('  Cô Lan  ', '  co.lan@truong.edu  ', 'matkhau8ky');
    const g = gia.goi.find((x) => x.ten === 'signUp');
    ok(g && g.tham.email === 'co.lan@truong.edu', 'cắt khoảng trắng email khi đăng ký');
    ok(g && g.tham.options.data.ho_ten === 'Cô Lan', 'gửi kèm họ tên vào metadata');
    ok(g && /dang-nhap\.html$/.test(g.tham.options.emailRedirectTo), 'đặt liên kết xác nhận về dang-nhap.html');
    ok(kq && kq.canXacNhan === true, 'chưa có phiên thì báo cần xác nhận email');
  }
  nhom('6) Đăng ký email đã tồn tại');
  {
    const { TK, gia } = nap(CAU_HINH);
    gia.ketQua.signUp = { data: { session: null }, error: { message: 'User already registered' } };
    await nem(() => TK.dangKyGiaoVien('Cô Lan', 'co.lan@truong.edu', 'matkhau8ky'), /đã có tài khoản/, 'báo email đã có tài khoản');
  }

  // 7) Tài khoản học sinh không được đăng nhập ở tab giáo viên
  nhom('7) Chặn học sinh đăng nhập nhầm tab giáo viên');
  {
    const { TK, gia } = nap(CAU_HINH);
    gia.ketQua.signInWithPassword = { data: { user: { id: 'u2' } }, error: null };
    gia.nguoiDung = { data: { user: { id: 'u2', email: 'k7p2qa.an.nguyen@hs.hoisinhxanh.example' } }, error: null };
    gia.hoSo = { data: { id: 'u2', vai_tro: 'hoc_sinh', ten_dang_nhap: 'an.nguyen', lop_id: 'L1', lop: { ten: '7A', ma_lop: 'K7P2QA' } }, error: null };
    await nem(() => TK.dangNhapGiaoVien('k7p2qa.an.nguyen@hs.hoisinhxanh.example', 'matkhau'), /tài khoản học sinh/i, 'phát hiện vai trò học sinh và từ chối');
    ok(gia.goi.some((x) => x.ten === 'signOut'), 'đăng xuất ngay để không giữ phiên sai vai trò');
  }

  // 8) Quên / đổi mật khẩu gọi đúng API
  nhom('8) Quên và đổi mật khẩu');
  {
    const { TK, gia } = nap(CAU_HINH);
    await TK.quenMatKhau('co.lan@truong.edu');
    const q = gia.goi.find((x) => x.ten === 'resetPasswordForEmail');
    ok(q && q.tham.email === 'co.lan@truong.edu' && /dang-nhap\.html$/.test(q.tham.o.redirectTo), 'gửi liên kết đặt lại về dang-nhap.html');
    await TK.doiMatKhau('matkhaumoi8');
    const d = gia.goi.find((x) => x.ten === 'updateUser');
    ok(d && d.tham.password === 'matkhaumoi8', 'đổi mật khẩu gọi updateUser đúng');
  }

  // 9) Nhớ tạm hồ sơ ở localStorage và xoá khi đăng xuất
  nhom('9) Nhớ tạm hồ sơ');
  {
    const { TK, gia, luu } = nap(CAU_HINH);
    gia.ketQua.signInWithPassword = { data: { user: { id: 'u1' } }, error: null };
    gia.nguoiDung = { data: { user: { id: 'u1', email: 'k7p2qa.an.nguyen@hs.hoisinhxanh.example' } }, error: null };
    gia.hoSo = { data: { id: 'u1', vai_tro: 'hoc_sinh', ten_dang_nhap: 'an.nguyen', lop_id: 'L1', lop: { ten: '7A', ma_lop: 'K7P2QA' } }, error: null };
    await TK.dangNhapHocSinh('k7p2qa', 'an.nguyen', 'matkhau');
    ok(luu['hoi-sinh-xanh-tai-khoan'], 'đăng nhập xong có nhớ hồ sơ rút gọn');
    await TK.dangXuat();
    ok(!luu['hoi-sinh-xanh-tai-khoan'], 'đăng xuất thì xoá hồ sơ đã nhớ');
  }

  // 10) Chế độ khách: chưa nối máy chủ thì báo rõ, không vỡ
  nhom('10) Chế độ khách (chưa cấu hình máy chủ)');
  {
    const { TK } = nap({ SUPABASE_URL: '', SUPABASE_KEY: '', MIEN_HOC_SINH: 'hs.hoisinhxanh.example' });
    ok(TK.coMay === false, 'coMay = false khi chưa điền URL / khoá');
    await nem(() => TK.dangNhapHocSinh('K7P2QA', 'an.nguyen', '123456'), /chưa được kết nối máy chủ/, 'đăng nhập ở chế độ khách báo lỗi rõ ràng');
  }

  console.log(soLoi ? ('\nCÓ LỖI: ' + soLoi + ' kiểm tra không đạt.') : '\nĐăng nhập / đăng ký chạy đúng. Không có lỗi.');
  process.exit(soLoi ? 1 : 0);
})();
