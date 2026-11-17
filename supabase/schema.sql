-- Hồi Sinh Xanh: cơ sở dữ liệu lớp học (Supabase / Postgres).
-- Cách dùng: Supabase → SQL Editor → dán toàn bộ file này → Run. Chạy lại nhiều lần vẫn an toàn.
--
-- Vai trò:
--   giao_vien: tự đăng ký bằng email ở dang-nhap.html (trigger bên dưới tạo hồ sơ).
--   hoc_sinh : do giáo viên tạo qua hàm supabase/functions/quan-ly-hoc-sinh (đặt app_metadata.vai_tro = 'hoc_sinh').
-- Mọi bảng đều bật RLS: học sinh chỉ thấy dữ liệu của mình, giáo viên chỉ thấy học sinh trong lớp mình.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- bảng
create table if not exists public.lop (
  id           uuid primary key default gen_random_uuid(),
  giao_vien_id uuid not null references auth.users(id) on delete cascade,
  ten          text not null check (char_length(ten) between 1 and 80),
  ma_lop       text not null unique check (ma_lop ~ '^[A-Z0-9]{6}$'),
  tao_luc      timestamptz not null default now()
);
create index if not exists lop_giao_vien on public.lop (giao_vien_id);

create table if not exists public.ho_so (
  id            uuid primary key references auth.users(id) on delete cascade,
  vai_tro       text not null check (vai_tro in ('giao_vien', 'hoc_sinh')),
  ho_ten        text not null default '' check (char_length(ho_ten) <= 80),
  ten_dang_nhap text check (ten_dang_nhap is null or ten_dang_nhap ~ '^[a-z0-9.]{2,40}$'),
  lop_id        uuid references public.lop(id) on delete cascade,
  tao_luc       timestamptz not null default now(),
  check (vai_tro = 'giao_vien' or (lop_id is not null and ten_dang_nhap is not null))
);
create unique index if not exists ho_so_ten_trong_lop on public.ho_so (lop_id, ten_dang_nhap) where vai_tro = 'hoc_sinh';

-- Mỗi kết quả trong game / ôn tập là một dòng. ma_su_kien do máy học sinh tạo để gửi lại không bị trùng.
create table if not exists public.su_kien (
  id          bigint generated always as identity primary key,
  hoc_sinh_id uuid not null references public.ho_so(id) on delete cascade,
  loai        text not null check (loai in ('cong_phan_loai', 'leu_nem_rac', 'trong_cay', 'dao_cay', 'quiz')),
  dung        int  not null default 0 check (dung >= 0),
  tong        int  not null default 0 check (tong >= 0 and dung <= tong and tong <= 100),
  du_lieu     jsonb not null default '{}'::jsonb check (pg_column_size(du_lieu) < 16000),
  luc         timestamptz not null default now(),
  ma_su_kien  uuid not null unique,
  nhan_luc    timestamptz not null default now()
);
create index if not exists su_kien_hs_luc on public.su_kien (hoc_sinh_id, luc);

-- Ảnh chụp tiến độ mới nhất trong save của học sinh (số cây, sao cổng, thời gian chơi)
create table if not exists public.tien_do (
  hoc_sinh_id uuid primary key references public.ho_so(id) on delete cascade,
  so_cay      int not null default 0 check (so_cay between 0 and 500),
  so_o        int not null default 0 check (so_o between 0 and 500),
  so_cay_lon  int not null default 0 check (so_cay_lon between 0 and 500),
  so_loai_cay int not null default 0 check (so_loai_cay between 0 and 50),
  sao_cong    int not null default 0 check (sao_cong between 0 and 3),
  thoi_gian   int not null default 0 check (thoi_gian >= 0),
  man         text check (man is null or char_length(man) <= 10),
  cap_nhat    timestamptz not null default now()
);

create table if not exists public.tom_tat_ai (
  id       bigint generated always as identity primary key,
  lop_id   uuid not null references public.lop(id) on delete cascade,
  noi_dung text not null,
  mo_hinh  text,
  bang_ma  jsonb not null default '{}'::jsonb,   -- HS01 → id học sinh (AI chỉ thấy mã, không thấy tên)
  tao_luc  timestamptz not null default now()
);
alter table public.tom_tat_ai add column if not exists bang_ma jsonb not null default '{}'::jsonb;
create index if not exists tom_tat_lop on public.tom_tat_ai (lop_id, tao_luc desc);

-- ---------------------------------------------------------------- hàm kiểm tra quyền (security definer để không vòng lặp RLS)
create or replace function public.la_giao_vien() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ho_so where id = auth.uid() and vai_tro = 'giao_vien');
$$;

create or replace function public.la_gv_cua(hs uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ho_so h join public.lop l on l.id = h.lop_id
    where h.id = hs and l.giao_vien_id = auth.uid()
  );
$$;

create or replace function public.lop_cua_toi() returns uuid
language sql stable security definer set search_path = public as $$
  select lop_id from public.ho_so where id = auth.uid();
$$;

-- ---------------------------------------------------------------- tự tạo hồ sơ giáo viên khi đăng ký
create or replace function public.tao_ho_so_moi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Tài khoản học sinh do hàm quan-ly-hoc-sinh tạo, hồ sơ được ghi ở đó.
  -- Nhận ra bằng đuôi email ảo: lúc trigger chạy, app_metadata tùy chỉnh có thể chưa được ghi vào bản ghi.
  if coalesce(new.raw_app_meta_data ->> 'vai_tro', '') = 'hoc_sinh'
     or new.email like '%@hs.hoisinhxanh.example' then
    return new;
  end if;
  insert into public.ho_so (id, vai_tro, ho_ten)
  values (new.id, 'giao_vien',
          left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'ho_ten'), ''), split_part(new.email, '@', 1)), 80))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists sau_khi_tao_tai_khoan on auth.users;
create trigger sau_khi_tao_tai_khoan
  after insert on auth.users
  for each row execute function public.tao_ho_so_moi();

-- ---------------------------------------------------------------- RLS
alter table public.lop        enable row level security;
alter table public.ho_so      enable row level security;
alter table public.su_kien    enable row level security;
alter table public.tien_do    enable row level security;
alter table public.tom_tat_ai enable row level security;

-- lop: giáo viên quản lý lớp mình; học sinh đọc được lớp của mình (tên lớp)
drop policy if exists lop_doc on public.lop;
create policy lop_doc on public.lop for select to authenticated
  using (giao_vien_id = auth.uid() or id = public.lop_cua_toi());
drop policy if exists lop_tao on public.lop;
create policy lop_tao on public.lop for insert to authenticated
  with check (giao_vien_id = auth.uid() and public.la_giao_vien());
drop policy if exists lop_sua on public.lop;
create policy lop_sua on public.lop for update to authenticated
  using (giao_vien_id = auth.uid()) with check (giao_vien_id = auth.uid());
drop policy if exists lop_xoa on public.lop;
create policy lop_xoa on public.lop for delete to authenticated
  using (giao_vien_id = auth.uid());

-- ho_so: đọc của mình, giáo viên đọc học sinh lớp mình; chỉ được sửa họ tên của chính mình
drop policy if exists ho_so_doc on public.ho_so;
create policy ho_so_doc on public.ho_so for select to authenticated
  using (id = auth.uid() or public.la_gv_cua(id));
drop policy if exists ho_so_sua on public.ho_so;
create policy ho_so_sua on public.ho_so for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.ho_so from authenticated;
grant update (ho_ten) on public.ho_so to authenticated;

-- su_kien: học sinh ghi và đọc của mình; giáo viên đọc của học sinh lớp mình. Không ai sửa / xoá từ web.
drop policy if exists su_kien_doc on public.su_kien;
create policy su_kien_doc on public.su_kien for select to authenticated
  using (hoc_sinh_id = auth.uid() or public.la_gv_cua(hoc_sinh_id));
drop policy if exists su_kien_ghi on public.su_kien;
create policy su_kien_ghi on public.su_kien for insert to authenticated
  with check (hoc_sinh_id = auth.uid()
              and exists (select 1 from public.ho_so where id = auth.uid() and vai_tro = 'hoc_sinh'));

-- tien_do: học sinh ghi đè ảnh chụp của mình; giáo viên đọc
drop policy if exists tien_do_doc on public.tien_do;
create policy tien_do_doc on public.tien_do for select to authenticated
  using (hoc_sinh_id = auth.uid() or public.la_gv_cua(hoc_sinh_id));
drop policy if exists tien_do_ghi on public.tien_do;
create policy tien_do_ghi on public.tien_do for insert to authenticated
  with check (hoc_sinh_id = auth.uid()
              and exists (select 1 from public.ho_so where id = auth.uid() and vai_tro = 'hoc_sinh'));
drop policy if exists tien_do_sua on public.tien_do;
create policy tien_do_sua on public.tien_do for update to authenticated
  using (hoc_sinh_id = auth.uid()) with check (hoc_sinh_id = auth.uid());

-- tom_tat_ai: giáo viên đọc tóm tắt của lớp mình (hàm tom-tat-lop ghi bằng service role)
drop policy if exists tom_tat_doc on public.tom_tat_ai;
create policy tom_tat_doc on public.tom_tat_ai for select to authenticated
  using (exists (select 1 from public.lop l where l.id = lop_id and l.giao_vien_id = auth.uid()));

-- ---------------------------------------------------------------- số trung bình của lớp cho học sinh so sánh
-- Học sinh không đọc được dữ liệu bạn khác; hàm này chỉ trả về con số trung bình của cả lớp.
create or replace function public.trung_binh_lop() returns json
language sql stable security definer set search_path = public as $$
  with hs as (
    select id from public.ho_so where lop_id = public.lop_cua_toi() and vai_tro = 'hoc_sinh'
  ),
  minigame as (
    select hoc_sinh_id, sum(dung)::float / nullif(sum(tong), 0) as ti_le
    from public.su_kien where hoc_sinh_id in (select id from hs) and loai in ('cong_phan_loai', 'leu_nem_rac')
    group by hoc_sinh_id
  ),
  quiz as (
    select hoc_sinh_id, sum(dung)::float / nullif(sum(tong), 0) as ti_le
    from public.su_kien where hoc_sinh_id in (select id from hs) and loai = 'quiz'
    group by hoc_sinh_id
  ),
  cay as (
    select hoc_sinh_id, so_cay::float / nullif(so_o, 0) as ti_le
    from public.tien_do where hoc_sinh_id in (select id from hs)
  )
  select json_build_object(
    'so_hoc_sinh', (select count(*) from hs),
    'chinh_xac',   (select avg(ti_le) from minigame),
    'quiz',        (select avg(ti_le) from quiz),
    'trong_cay',   (select avg(ti_le) from cay)
  );
$$;

revoke all on function public.trung_binh_lop() from public;
grant execute on function public.trung_binh_lop() to authenticated;
