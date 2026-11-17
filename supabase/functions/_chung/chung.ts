// Dùng chung cho các hàm máy chủ: CORS, trả JSON, xác thực giáo viên sở hữu lớp.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(du: unknown, trangThai = 200): Response {
  return new Response(JSON.stringify(du), { status: trangThai, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}

export class LoiYeuCau extends Error {
  constructor(public trangThai: number, thongBao: string) { super(thongBao); }
}

// Client quyền quản trị (service role): chỉ tồn tại trong hàm máy chủ, không bao giờ gửi về trình duyệt.
export function quanTri(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL"), khoa = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !khoa) throw new LoiYeuCau(500, "Máy chủ chưa được cấu hình Supabase.");
  return createClient(url, khoa, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Kiểm tra người gọi là giáo viên và (nếu có lopId) là chủ của lớp đó.
export async function xacThucGiaoVien(req: Request, admin: SupabaseClient, lopId?: string) {
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) throw new LoiYeuCau(401, "Thiếu phiên đăng nhập. Hãy đăng nhập lại.");
  const { data: u, error } = await admin.auth.getUser(jwt);
  if (error || !u?.user) throw new LoiYeuCau(401, "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  const { data: hs } = await admin.from("ho_so").select("vai_tro").eq("id", u.user.id).maybeSingle();
  if (!hs || hs.vai_tro !== "giao_vien") throw new LoiYeuCau(403, "Chỉ tài khoản giáo viên mới dùng được chức năng này.");
  let lop: { id: string; ten: string; ma_lop: string } | null = null;
  if (lopId) {
    const { data } = await admin.from("lop").select("id, ten, ma_lop").eq("id", lopId).eq("giao_vien_id", u.user.id).maybeSingle();
    if (!data) throw new LoiYeuCau(404, "Không tìm thấy lớp, hoặc lớp không thuộc tài khoản này.");
    lop = data;
  }
  return { giaoVienId: u.user.id, lop };
}

export function xuLy(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    if (req.method !== "POST") return json({ loi: "Chỉ nhận POST." }, 405);
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof LoiYeuCau) return json({ loi: e.message }, e.trangThai);
      console.error(JSON.stringify({ muc: "loi", thong_bao: String((e as Error)?.message || e) }));
      return json({ loi: "Máy chủ gặp lỗi, thử lại sau ít phút." }, 500);
    }
  };
}
