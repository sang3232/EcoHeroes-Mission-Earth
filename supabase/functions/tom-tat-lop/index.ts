// AI tóm tắt và đánh giá xu hướng của một lớp, bằng tiếng Việt.
// POST { lop_id } → { noi_dung, mo_hinh, bang_ma, tao_luc }
// - Chỉ giáo viên chủ lớp gọi được.
// - Tên học sinh được đổi thành HS01, HS02… trước khi gửi cho AI; bảng đổi mã lưu cùng kết quả cho giáo viên.
// - Mô hình chính: z-ai/glm-5.3-flash (khoảng 0,04 / 0,08 USD mỗi triệu token vào / ra), suy nghĩ mức thấp và không
//   trả phần suy nghĩ (nếu không, phần nghĩ ăn hết max_tokens), chỉ đi qua nhà cung cấp không lưu dữ liệu.
//   GLM lỗi hoặc quá tải thì thử chuỗi mô hình miễn phí.
import { json, LoiYeuCau, quanTri, xacThucGiaoVien, xuLy } from "../_chung/chung.ts";

const CHINH = (Deno.env.get("MO_HINH_CHINH") || "z-ai/glm-5.3-flash").trim();
const MIEN_PHI = (Deno.env.get("MO_HINH_MIEN_PHI") ||
  "nvidia/nemotron-3-ultra-550b-a55b:free,google/gemma-4-31b-it:free,openrouter/free")
  .split(",").map((s) => s.trim()).filter(Boolean);
const CACH_NHAU_GIAY = 60;           // một lớp tóm tắt tối đa mỗi phút một lần
const SO_NGAY = 90;

type SuKien = { hoc_sinh_id: string; loai: string; dung: number; tong: number; du_lieu: Record<string, unknown>; luc: string };

const pt = (d: number, t: number) => (t > 0 ? Math.round((d / t) * 100) : null);

function tuan(iso: string): string {
  const d = new Date(iso);
  const dau = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - ((d.getUTCDay() + 6) % 7)));
  return dau.toISOString().slice(0, 10);
}

// Gom số liệu lớp thành một khối gọn, không có tên thật
function gomSoLieu(hs: Array<{ id: string }>, sk: SuKien[], td: Array<Record<string, number | string>>) {
  const bangMa: Record<string, string> = {};
  const maCua: Record<string, string> = {};
  hs.forEach((h, i) => { const m = "HS" + String(i + 1).padStart(2, "0"); bangMa[m] = h.id; maCua[h.id] = m; });
  const theoHs: Record<string, Record<string, unknown>> = {};
  const monSai: Record<string, number> = {};
  const quizSaiChuDe: Record<string, { sai: number; tong: number }> = {};
  const theoTuan: Record<string, { mg_d: number; mg_t: number; qz_d: number; qz_t: number }> = {};

  hs.forEach((h) => {
    theoHs[maCua[h.id]] = { cong: { luot: 0, d: 0, t: 0, cacLuot: [] as number[] }, leu: { d: 0, t: 0 }, quiz: { luot: 0, d: 0, t: 0 }, trong: 0, cuoi: null };
  });
  for (const e of sk) {
    const m = maCua[e.hoc_sinh_id];
    if (!m) continue;
    const o = theoHs[m] as any;
    const w = (theoTuan[tuan(e.luc)] ||= { mg_d: 0, mg_t: 0, qz_d: 0, qz_t: 0 });
    if (!o.cuoi || e.luc > o.cuoi) o.cuoi = e.luc;
    if (e.loai === "cong_phan_loai") {
      o.cong.luot++; o.cong.d += e.dung; o.cong.t += e.tong;
      if (e.tong) o.cong.cacLuot.push(pt(e.dung, e.tong));
      w.mg_d += e.dung; w.mg_t += e.tong;
      for (const mon of ((e.du_lieu?.cac_mon as Array<{ ten: string; dung: boolean }>) || [])) if (!mon.dung) monSai[mon.ten] = (monSai[mon.ten] || 0) + 1;
    } else if (e.loai === "leu_nem_rac") {
      o.leu.d += e.dung; o.leu.t += e.tong; w.mg_d += e.dung; w.mg_t += e.tong;
      if (!e.dung && e.du_lieu?.ten) monSai[String(e.du_lieu.ten)] = (monSai[String(e.du_lieu.ten)] || 0) + 1;
    } else if (e.loai === "quiz") {
      o.quiz.luot++; o.quiz.d += e.dung; o.quiz.t += e.tong; w.qz_d += e.dung; w.qz_t += e.tong;
      for (const c of ((e.du_lieu?.cac_cau as Array<{ cd: string; dung: boolean }>) || [])) {
        const q = (quizSaiChuDe[c.cd] ||= { sai: 0, tong: 0 }); q.tong++; if (!c.dung) q.sai++;
      }
    } else if (e.loai === "trong_cay") o.trong++;
  }
  const tienDo: Record<string, Record<string, number | string>> = {};
  td.forEach((r) => { const m = maCua[String(r.hoc_sinh_id)]; if (m) tienDo[m] = r; });

  const bayGio = Date.now();
  const hocSinh = Object.keys(theoHs).map((m) => {
    const o = theoHs[m] as any, t = tienDo[m] || {};
    const l = o.cong.cacLuot as number[];
    return {
      ma: m,
      cong_phan_loai: o.cong.luot ? { so_luot: o.cong.luot, chinh_xac_pt: pt(o.cong.d, o.cong.t), luot_dau_pt: l[0], luot_cuoi_pt: l[l.length - 1] } : null,
      leu_nem_rac: o.leu.t ? { so_lan_nem: o.leu.t, chinh_xac_pt: pt(o.leu.d, o.leu.t) } : null,
      quiz: o.quiz.luot ? { so_bai: o.quiz.luot, dung_pt: pt(o.quiz.d, o.quiz.t) } : null,
      trong_cay: t.so_o ? { o_da_trong: t.so_cay, tong_o: t.so_o, ti_le_pt: pt(Number(t.so_cay), Number(t.so_o)), cay_truong_thanh: t.so_cay_lon } : null,
      sao_cong_cao_nhat: t.sao_cong ?? null,
      phut_choi: t.thoi_gian ? Math.round(Number(t.thoi_gian) / 60) : 0,
      ngay_tu_lan_cuoi: o.cuoi ? Math.floor((bayGio - Date.parse(o.cuoi)) / 86400000) : null,
    };
  });
  const tuanSx = Object.keys(theoTuan).sort().slice(-8).map((k) => ({
    tuan_bat_dau: k, minigame_pt: pt(theoTuan[k].mg_d, theoTuan[k].mg_t), quiz_pt: pt(theoTuan[k].qz_d, theoTuan[k].qz_t),
  }));
  return {
    bangMa,
    soLieu: {
      so_hoc_sinh: hs.length,
      so_hoc_sinh_co_hoat_dong: hocSinh.filter((h) => h.ngay_tu_lan_cuoi !== null).length,
      theo_tuan: tuanSx,
      mon_rac_hay_nham: Object.entries(monSai).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([ten, lan]) => ({ ten, lan })),
      quiz_sai_theo_chu_de: Object.entries(quizSaiChuDe).map(([cd, v]) => ({ chu_de: cd, ti_le_sai_pt: pt(v.sai, v.tong), so_cau: v.tong })),
      hoc_sinh: hocSinh,
    },
  };
}

function loiNhac(tenLop: string, soLieu: unknown) {
  const heThong = `Bạn là trợ lý phân tích học tập của "Hồi Sinh Xanh", một game giáo dục môi trường cho học sinh 12–18 tuổi (phân loại rác theo Luật Bảo vệ môi trường 2020, trồng lại rừng ngập mặn, ôn tập bằng flashcard).
Người đọc là GIÁO VIÊN. Viết bằng tiếng Việt, rõ ràng, ngắn gọn, giọng tôn trọng.

NGUYÊN TẮC BẮT BUỘC:
- Chỉ dựa vào số liệu được cung cấp. Không bịa thêm số, không suy đoán điều số liệu không cho thấy.
- Số liệu chỉ phản ánh việc chơi game, KHÔNG dùng để chẩn đoán, gán nhãn năng lực/tính cách, xếp loại hay kỷ luật học sinh.
- Gọi học sinh bằng mã (HS01, HS02…) đúng như dữ liệu. Không đoán tên thật.
- Khi dữ liệu ít (vài lượt chơi), nói rõ là chưa đủ để kết luận.
- "Cổng Phân Loại" là minigame chia rác theo nhóm có tính giờ; "Lều ném rác" là ném từng món vào đúng thùng; "tỉ lệ trồng cây" = số ô đã trồng / tổng số ô trong game.

ĐỊNH DẠNG (đúng các tiêu đề này, mỗi mục 2–5 gạch đầu dòng):
## Tổng quan
## Xu hướng theo thời gian
## Điểm mạnh của lớp
## Kiến thức lớp hay nhầm
## Học sinh cần quan tâm thêm
## Gợi ý hoạt động cho tiết sau
## Giới hạn của dữ liệu`;
  const nguoiDung = `Lớp: ${tenLop}\nSố liệu (JSON):\n${JSON.stringify(soLieu)}`;
  return [{ role: "system", content: heThong }, { role: "user", content: nguoiDung }];
}

async function goiMoHinh(messages: unknown, khoa: string): Promise<{ noiDung: string; moHinh: string }> {
  const thu = async (model: string, maxTokens: number, them: Record<string, unknown> = {}) => {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${khoa}`, "Content-Type": "application/json", "X-Title": "Hoi Sinh Xanh" },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.4, ...them }),
      signal: AbortSignal.timeout(55000),
    });
    const d = await r.json().catch(() => ({}));
    const noiDung = String(d?.choices?.[0]?.message?.content || "").trim();
    console.log(JSON.stringify({ muc: "openrouter", model, trang_thai: r.status, do_dai: noiDung.length, token: d?.usage?.total_tokens }));
    return { ok: r.ok && noiDung.length > 200, trangThai: r.status, noiDung, moHinh: String(d?.model || model) };
  };
  try {
    const k = await thu(CHINH, 2000, {
      reasoning: { effort: "low", exclude: true },
      provider: { data_collection: "deny" },
    });
    if (k.ok) return k;
    if ([401, 403].includes(k.trangThai)) throw new LoiYeuCau(500, "Khoá OpenRouter của máy chủ không hợp lệ.");
  } catch (e) {
    if (e instanceof LoiYeuCau) throw e;   // hết giờ: thử chuỗi dự phòng
  }
  for (const m of MIEN_PHI) {
    try {
      const k = await thu(m, 1800);
      if (k.ok) return k;
      if ([401, 403].includes(k.trangThai)) break;
    } catch (_) { /* hết giờ: thử mô hình sau */ }
  }
  throw new LoiYeuCau(503, "Các mô hình AI đang bận. Thử lại sau ít phút.");
}

Deno.serve(xuLy(async (req) => {
  const than = await req.json().catch(() => ({}));
  const admin = quanTri();
  const { lop } = await xacThucGiaoVien(req, admin, String(than.lop_id || ""));
  if (!lop) throw new LoiYeuCau(400, "Thiếu mã lớp.");
  const khoa = Deno.env.get("OPENROUTER_API_KEY");
  if (!khoa) throw new LoiYeuCau(500, "Máy chủ chưa có khoá OpenRouter (Edge Functions → Secrets → OPENROUTER_API_KEY).");

  const { data: gan } = await admin.from("tom_tat_ai").select("tao_luc").eq("lop_id", lop.id).order("tao_luc", { ascending: false }).limit(1);
  if (gan?.[0] && Date.now() - Date.parse(gan[0].tao_luc) < CACH_NHAU_GIAY * 1000) {
    throw new LoiYeuCau(429, "Vừa tóm tắt xong. Đợi một phút rồi bấm lại nhé.");
  }

  const { data: hs } = await admin.from("ho_so").select("id").eq("lop_id", lop.id).eq("vai_tro", "hoc_sinh").order("ten_dang_nhap");
  if (!hs?.length) throw new LoiYeuCau(400, "Lớp chưa có học sinh.");
  const ids = hs.map((h: { id: string }) => h.id);
  const tu = new Date(Date.now() - SO_NGAY * 86400000).toISOString();
  const { data: sk } = await admin.from("su_kien").select("hoc_sinh_id, loai, dung, tong, du_lieu, luc")
    .in("hoc_sinh_id", ids).gte("luc", tu).order("luc").limit(20000);
  const { data: td } = await admin.from("tien_do").select("*").in("hoc_sinh_id", ids);
  if (!sk?.length && !td?.length) throw new LoiYeuCau(400, "Lớp chưa có dữ liệu chơi nào để tóm tắt.");

  const { bangMa, soLieu } = gomSoLieu(hs, (sk || []) as SuKien[], td || []);
  const { noiDung, moHinh } = await goiMoHinh(loiNhac(lop.ten, soLieu), khoa);
  const { data: luu, error } = await admin.from("tom_tat_ai")
    .insert({ lop_id: lop.id, noi_dung: noiDung, mo_hinh: moHinh, bang_ma: bangMa })
    .select("noi_dung, mo_hinh, bang_ma, tao_luc").single();
  if (error) throw new LoiYeuCau(500, "Không lưu được bản tóm tắt.");
  return json(luu);
}));
