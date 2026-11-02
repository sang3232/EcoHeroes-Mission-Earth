# -*- coding: utf-8 -*-
"""Sinh nhân vật, khung hoạt ảnh và ảnh nền cho Hồi Sinh Xanh bằng Qwen-Image-2.1 (bộ D:\\Yuyuko_QwenImage).

Chạy bằng Python của môi trường Qwen (có sẵn Pillow):
  PY=D:\\Yuyuko_QwenImage\\env\\Scripts\\python.exe
  PY qwen\\cong_cu.py goc [id ...]       -> qwen\\viec_goc.json: dáng gốc, 3 phương án mỗi nhân vật
  PY qwen\\cong_cu.py dong_tac [id ...]  -> qwen\\viec_dong_tac.json: các khung hoạt ảnh, dựa vào ảnh gốc đã chọn
  PY qwen\\cong_cu.py nen [id ...]       -> qwen\\viec_nen.json: ảnh nền nhiều lớp và mẫu ô gạch, 3 phương án
  PY qwen\\cong_cu.py bang [mam | mam:chay | vua_nilon ...] -> qwen\\viec_bang.json: bảng khung, cả chuỗi động tác trong một ảnh
  PY qwen\\cong_cu.py do_vat [id ...]    -> qwen\\viec_do_vat.json: đồ vật trong màn (đống rác, Trạm, lồng...), 3 phương án
  PY qwen\\cong_cu.py xem goc|dong_tac|nen|bang|do_vat -> qwen\\xem\\*.jpg: bảng so sánh để chọn phương án
  PY qwen\\cong_cu.py xem_dong [động tác | boss ...] -> qwen\\xem\\dong_*.gif: hoạt ảnh xem thử của bảng khung
  PY qwen\\cong_cu.py dong_goi           -> chuẩn hoá theo qwen\\chon.json, ghi vào assets\\
Sinh ảnh:
  PY D:\\Yuyuko_QwenImage\\sinh_anh.py qwen\\viec_goc.json qwen\\ra_goc 24

qwen\\chon.json ghi phương án đã chọn (số 1-3) cho từng khung, khung nào cần lật ngang, và ảnh nền:
  {"mam": {"goc": 2, "chay1": 1, "lat": ["chay1"], "bang": {"chay": 1}, "bo": {"chay": [4]}}, "nen": {"bai_bien_xa": 3}}
  "bang": phương án bảng khung của từng động tác; "bo": số thứ tự khung (từ 1) muốn bỏ khi cắt.
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps, ImageStat

THU_MUC = os.path.dirname(os.path.abspath(__file__))
GAME = os.path.dirname(THU_MUC)
RA = {"goc": os.path.join(THU_MUC, "ra_goc"), "dong_tac": os.path.join(THU_MUC, "ra_dong_tac"),
      "nen": os.path.join(THU_MUC, "ra_nen"), "bang": os.path.join(THU_MUC, "ra_bang"),
      "do_vat": os.path.join(THU_MUC, "ra_do_vat")}
CHON = os.path.join(THU_MUC, "chon.json")

HAT = [101, 202, 303]
PHONG_CACH = ("2D game character sprite, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, "
              "cute chibi proportions with a big head and small body, bright friendly colors, "
              "full body visible from head to feet, centered, no text, no ground, no shadow")
CHOP = ("Keep the same character, same outfit, same colors, same pose, same framing and same art style. "
        "Change only the eyes: both eyes gently closed in a natural blink.")
DAU = ("Keep the same character, same outfit, same colors, same pose, same framing and same art style. "
       "Change only the face: a pained hurt expression, eyes squeezed shut, mouth open in an ouch.")

# huong: nhân vật chính và tinh linh nhìn sang phải, quái nhìn sang trái.
# khung: các khung hoạt ảnh và dáng của từng khung. Mặc định là chớp mắt / đánh / đau.
NHAN_VAT = [
    # neo_mat: căn khung theo mặt nạ trắng và đáy thân (xem dong_goi_mam), khổ rộng cho vợt chĩa lên/xuống
    dict(id="mam", nhom="player", huong="right", neo_mat=True,
         mo_ta="a tiny guardian hero wearing a hooded cloak made from one large dark-green leaf, a round white "
               "seed-shell mask covering the whole face with two large dark oval eye holes, short legs, holding a "
               "long trash-picking net like a spear",
         khung={
             "chay1": "running, mid-stride with the front leg reaching forward, cloak flowing behind",
             "chay2": "running, both legs passing under the body, cloak flowing behind",
             "chay3": "running, mid-stride with the back leg pushing off, cloak flowing behind",
             "nhay": "jumping upward, knees tucked, cloak flaring downward",
             "roi": "falling down, arms slightly raised, cloak billowing upward",
             "chem": "slashing the net horizontally forward in a wide arc, motion swoosh lines",
             "chem_len": "slashing the net straight upward overhead, motion swoosh lines",
             "chem_xuong": "in mid-air, stabbing the net straight down below the feet",
             "luot": "dashing horizontally forward, body leaning far forward, speed lines behind",
             "dau": "flinching backward from a hit, body recoiling",
             "hoi": "kneeling with head bowed, glowing green leaves swirling around, healing",
         }),
    dict(id="gau", nhom="heroes", huong="right",
         mo_ta="a sturdy friendly brown bear eco-guardian standing upright on two legs, chest armor plates made of "
               "flattened recycled aluminum cans, a green leaf emblem on the chest, a short green scarf",
         danh="throwing a powerful paw punch forward, body leaning into the strike"),
    dict(id="gio", nhom="heroes", huong="right",
         mo_ta="a nimble young wind spirit kid with swirling mint-green hair shaped like leaves, light green tunic, "
               "a long flowing leaf scarf, holding a trash-picking net with a blue plastic handle",
         danh="lunging forward and swinging the trash-picking net in a wide arc, motion swoosh lines"),
    dict(id="sen", nhom="heroes", huong="right",
         mo_ta="a gentle healer girl wearing a pink lotus-petal hat and a white and pink robe, holding a wooden staff "
               "topped with a glowing pink lotus flower",
         danh="raising the lotus staff high overhead, pink healing sparkles bursting from the flower"),
    dict(id="taiche", nhom="heroes", huong="right",
         mo_ta="a cheerful small robot built from recycled tin cans and plastic bottles, round glass dome head with "
               "friendly eyes, a blue recycling symbol on its chest",
         danh="punching forward with an extended spring-loaded tin-can fist"),
    dict(id="chai_lan", nhom="enemies", huong="left",
         mo_ta="a cute but grumpy monster made of a crumpled clear plastic water bottle with a blue cap, angry eyes, "
               "tiny stubby arms and legs, faint toxic purple glow",
         danh="leaning forward and ramming headfirst"),
    dict(id="slime_nilon", nhom="enemies", huong="left",
         mo_ta="a blobby slime monster made of crumpled white and grey plastic bags, angry eyes, drippy edges, "
               "faint toxic purple glow",
         danh="stretching forward in a lunging bite with a wide open mouth"),
    dict(id="cua_lon", nhom="enemies", huong="left",
         mo_ta="a crab monster built from rusty dented aluminum soda cans, two big can claws, grumpy face, "
               "faint toxic purple glow",
         danh="snapping one big claw forward"),
    dict(id="luoi_ma", nhom="enemies", huong="left",
         mo_ta="a ghostly floating monster made of tangled old green fishing net, hollow glowing purple eyes, "
               "trailing net strands, no legs",
         danh="lashing net tentacles forward"),
    dict(id="vua_nilon", nhom="enemies", huong="left", trum=True,
         mo_ta="a giant king monster made of countless crumpled plastic bags, a crown made of colorful bottle caps, "
               "a long cape of plastic wrappers, menacing but cartoonish grin, toxic purple glow",
         danh="raising both arms and summoning a swirl of flying plastic bags"),
    # goc_tu: không có ảnh gốc riêng, bảng khung dựa vào ảnh gốc đã chọn của nhân vật khác (bản to của Cua Lon)
    dict(id="cua_khong_lo", nhom="enemies", huong="left", trum=True, goc_tu="cua_lon",
         mo_ta="a giant boss crab built from huge rusty dented aluminum soda cans, two enormous can claws, a thick "
               "armored can shell on its back, grumpy battle-scarred face, faint toxic purple glow"),
    # Màn 2: Rừng Ngập Mặn
    dict(id="me_duoc", nhom="npc", huong="left",
         mo_ta="a kind elderly Vietnamese grandmother who guards the mangrove forest, wearing a conical palm-leaf hat, "
               "a faded brown traditional blouse and dark trousers rolled up to the knees, bare muddy feet, leaning on "
               "a walking stick made from a twisted mangrove root, a small woven basket of long green mangrove "
               "seedlings on her back, warm gentle smile"),
    dict(id="hop_xop", nhom="enemies", huong="left",
         mo_ta="a grumpy little monster made of a cracked white styrofoam food box, the hinged lid opening like a "
               "mouth with jagged foam teeth, foam crumbs flaking off, tiny stubby legs, angry eyes, faint toxic "
               "purple glow"),
    dict(id="luoi_ma_khong_lo", nhom="enemies", huong="left", trum=True,
         mo_ta="a giant ghostly boss monster woven from huge tangles of old green and blue fishing nets, knotted "
               "ropes and broken plastic floats caught inside, a hooded net head with two hollow glowing purple eyes, "
               "two long trailing net arms, the lower body dissolving into dangling net strands, floating above the "
               "ground, toxic purple glow"),
]

# Ảnh nền: lớp xa (đặc), lớp gần (trong suốt, vẽ chồng lên), mẫu ô gạch (lặp lại được).
# Chỉ cần bản sáng: game tự phủ lớp tối theo độ sạch của màn.
NEN_DUOI = "painterly 2D side-scrolling game background art, soft light, no characters, no people, no text"
NEN = [
    dict(id="bai_bien_xa", rong=1792, cao=768,
         prompt="Far parallax layer: a quiet tropical beach at dawn, calm sea, distant islands on the horizon, "
                "soft clouds, " + NEN_DUOI),
    dict(id="bai_bien_gan", rong=1792, cao=768, trong_suot=True,
         prompt="Near parallax layer: silhouettes of casuarina trees, coastal rocks and low sand dunes along the "
                "bottom edge only, empty transparent sky above, " + NEN_DUOI),
    dict(id="hang_xa", rong=1792, cao=768,
         prompt="Far parallax layer: inside a large sea cave, rocky walls, tide pools, faint shafts of light from "
                "cracks in the ceiling, " + NEN_DUOI),
    dict(id="dao_rac_xa", rong=1792, cao=768,
         prompt="Far parallax layer: a distant island made of piled plastic trash and rusty barrels under a "
                "stormy purple sky, gloomy sea, " + NEN_DUOI),
    dict(id="o_cat", rong=1024, cao=1024,
         prompt="Seamless tileable texture of packed sand with small pebbles and shell fragments, flat front view, "
                "hand-painted game tile texture, even lighting, no shadows, no text"),
    dict(id="o_da", rong=1024, cao=1024,
         prompt="Seamless tileable texture of dark wet sea-cave rock with barnacles, flat front view, "
                "hand-painted game tile texture, even lighting, no shadows, no text"),
    # Màn 2: Rừng Ngập Mặn
    dict(id="rung_xa", rong=1792, cao=768,
         prompt="Far parallax layer: a misty mangrove forest at the edge of the sea, tall mangrove trees standing on "
                "arching stilt roots in calm shallow water, hanging aerial roots, soft morning light through the "
                "leaves, " + NEN_DUOI),
    dict(id="rung_gan", rong=1792, cao=768, trong_suot=True,
         prompt="Near parallax layer: dark silhouettes of mangrove trees with tangled arching stilt roots and thin "
                "breathing roots poking up from the mud, along the bottom edge only, empty transparent sky above, "
                + NEN_DUOI),
    dict(id="dam_xa", rong=1792, cao=768,
         prompt="Far parallax layer: abandoned shrimp farm ponds with straight muddy dikes, a broken wooden sluice "
                "gate, rusty paddle-wheel aerators, a few dead mangrove stumps, a thin line of surviving mangrove "
                "forest on the horizon, overcast sky, " + NEN_DUOI),
    dict(id="o_bun", rong=1024, cao=1024, sang=1.7,
         prompt="Seamless tileable texture of dark wet river mud with tangled small roots, fallen mangrove leaves "
                "and tiny snail shells, flat front view, hand-painted game tile texture, even lighting, no shadows, "
                "no text"),
    # Bản đồ thế giới (8 màn): game đặt các mốc màn lên trên ảnh này
    dict(id="the_gioi", rong=1792, cao=1024,
         prompt="A hand-painted fantasy world map of a small green land seen from above, like an old storybook map: "
                "a sandy beach coast in the lower left, a mangrove forest along the coast, a dark polluted river "
                "winding inland past smoking factories, golden rice fields with smoke, a huge garbage landfill "
                "mountain, a city of glass towers, a pale coral reef in the sea on the right, and a giant grey "
                "shopping-mall fortress in the middle, soft watercolor colors, parchment paper edges, no text, "
                "no labels, no letters, no compass"),
]
THEO_ID = {n["id"]: n for n in NHAN_VAT}

# Bảng khung (sprite sheet): Qwen vẽ cả chuỗi động tác trong MỘT ảnh, các khung xếp một hàng từ trái
# sang phải, nên chúng ăn khớp và khác nhau theo đúng nhịp. dong_goi cắt ra từng khung.
# "o": bề ngang mỗi ô (px) — động tác vươn vợt xa thì ô rộng hơn để các khung không dính nhau.
BANG = {
    "mam": {
        "dung": dict(ten="a gentle idle breathing loop", o=384, khung=[
            "standing relaxed, holding the net forward",
            "breathing in, body rising very slightly",
            "standing relaxed, holding the net forward",
            "breathing out, body sinking very slightly"]),
        "chay": dict(ten="a smooth looping run cycle", o=384, khung=[
            "contact pose: front foot touching down far ahead, back leg stretched behind",
            "down pose: knees bent, body at its lowest",
            "passing pose: back leg swinging forward under the body",
            "up pose: pushing off the ground, body at its highest",
            "contact pose with the other foot reaching forward",
            "passing pose: legs crossing under the body"]),
        "nhay": dict(ten="a jump from take-off to landing", o=384, khung=[
            "crouching to take off, knees bent",
            "launching upward, legs stretched down, cloak trailing below",
            "at the top of the jump, knees tucked up",
            "falling down, cloak billowing upward, legs dangling",
            "landing, knees bent absorbing the impact"]),
        "chem": dict(ten="a horizontal net slash attack", o=448, khung=[
            "winding up, net pulled back behind the shoulder",
            "swinging the net forward in a wide horizontal arc with a motion swoosh",
            "net fully extended straight forward at the end of the swing",
            "recovering, bringing the net back to the ready position"]),
        "chem_len": dict(ten="an upward net slash attack", o=448, khung=[
            "crouching slightly, net held low, ready to swing upward",
            "swinging the net upward in an arc with a motion swoosh",
            "net raised straight up overhead",
            "lowering the net back down"]),
        "chem_xuong": dict(ten="a downward net stab while in mid-air", o=384, khung=[
            "in mid-air, raising the net above the head",
            "in mid-air, thrusting the net straight down below the feet",
            "in mid-air, net pointing straight down, legs tucked up"]),
        "luot": dict(ten="a fast forward dash", o=448, khung=[
            "leaning forward, about to dash",
            "dashing forward, body leaning almost horizontal, speed lines behind",
            "dashing forward, cloak streaming far behind, speed lines",
            "stopping the dash, leaning back, cloak settling"]),
        "dau": dict(ten="getting hit", o=384, khung=[
            "hit: flinching backward, head thrown back",
            "staggering backward, arms flung out",
            "regaining balance"]),
        "hoi": dict(ten="a healing spell", o=384, khung=[
            "kneeling on one knee, head bowed",
            "kneeling, glowing green leaves start swirling around",
            "kneeling, bright green glow and leaves swirling around the whole body",
            "standing back up, the green glow fading"]),
    },
    # Boss: khung 1 của mọi bảng là dáng đứng bình thường, dong_goi lấy nó làm chuẩn độ lớn cho cả bảng
    "vua_nilon": {
        "dung": dict(ten="a menacing idle breathing loop", o=448, khung=[
            "standing tall, arms hanging at the sides, cape hanging down",
            "breathing in, the bag body swelling up slightly, bags rustling",
            "standing tall, arms hanging at the sides",
            "breathing out, the bag body sagging slightly"]),
        "gam": dict(ten="a roar that summons plastic bags", o=448, khung=[
            "standing tall, about to roar",
            "head thrown back, mouth wide open roaring, arms spreading out",
            "roaring with both arms raised high, loose plastic bags swirling up around the body",
            "lowering the arms, grinning wickedly"]),
        "nem": dict(ten="a throwing attack", o=448, khung=[
            "standing tall, about to throw",
            "leaning back, one arm pulled far back holding a bundle of crumpled plastic bags",
            "swinging the arm forward hard, about to let go",
            "arm stretched far forward after the throw, hand open and empty"]),
        "nhay": dict(ten="a jumping ground-slam attack", o=448, khung=[
            "standing tall, about to jump",
            "crouching low, knees bent, gathering strength",
            "leaping upward, body stretched, both fists raised above the head",
            "falling down with both fists raised high, cape flying upward",
            "landed heavily, knees bent, both fists pounding the ground"]),
        "lao": dict(ten="a charging run", o=448, khung=[
            "standing tall, lowering the head, about to charge",
            "charging forward, body leaning far forward, one leg stepping forward",
            "charging forward, legs passing under the body, cape streaming behind",
            "charging forward, the other leg stepping forward, cape streaming behind"]),
        "dau": dict(ten="being hit hard", o=448, khung=[
            "standing tall",
            "flinching backward from a hit, some plastic bags tearing off the body",
            "staggering, arms flailing, angry face"]),
        "chet": dict(ten="a defeat", o=448, khung=[
            "standing, wounded and swaying",
            "collapsing to the knees, the crown slipping off",
            "deflating, the body sinking down into a heap of plastic bags",
            "only a flat pile of crumpled plastic bags left on the ground, the bottle-cap crown lying on top"]),
    },
    "cua_khong_lo": {
        "dung": dict(ten="an idle breathing loop", o=512, khung=[
            "standing on its legs, both big claws lowered",
            "both claws raised slightly, breathing in",
            "standing on its legs, both big claws lowered",
            "claws clicking open, breathing out"]),
        "di": dict(ten="a sideways walking loop", o=512, khung=[
            "standing on its legs, both big claws lowered",
            "walking, front legs stepping forward",
            "walking, legs passing under the body",
            "walking, back legs stepping forward"]),
        "dap": dict(ten="a double claw ground-slam attack", o=448, khung=[
            "standing on its legs, both big claws lowered",
            "raising both huge claws high overhead",
            "slamming both claws straight down onto the ground",
            "both claws resting on the ground after the slam, legs braced"]),
        "lao": dict(ten="a charging rush", o=512, khung=[
            "standing on its legs, both big claws lowered",
            "crouching low behind its shell, legs digging in, about to rush",
            "rushing forward, legs scurrying, claws held forward",
            "rushing forward, the other legs scurrying, claws held forward"]),
        "choang": dict(ten="being stunned after crashing into a wall", o=512, khung=[
            "standing on its legs, both big claws lowered",
            "knocked over onto its back, legs flailing in the air, soft belly exposed, dizzy eyes",
            "lying on its back, legs flailing the other way, dizzy eyes"]),
        "chet": dict(ten="a defeat", o=512, khung=[
            "standing on its legs, wounded and shaking",
            "collapsing, both claws dropping to the ground",
            "falling apart into separate dented cans",
            "only a scattered pile of crushed rusty cans left on the ground"]),
    },
    "luoi_ma_khong_lo": {
        "dung": dict(ten="a floating idle loop", o=448, khung=[
            "floating in place, net arms hanging down, net strands dangling below",
            "floating slightly higher, net arms drifting outward, strands swaying",
            "floating in place, net arms hanging down",
            "floating slightly lower, net arms drifting inward, strands swaying the other way"]),
        "quang": dict(ten="casting a fishing net attack", o=512, khung=[
            "floating in place, net arms hanging down",
            "pulling both net arms far back behind the body, gathering a big bundle of net",
            "flinging both net arms forward, a wide fishing net flying out and spreading open in front",
            "net arms stretched far forward after the throw, hands open"]),
        "lao": dict(ten="a swooping charge", o=512, khung=[
            "floating in place, net arms hanging down",
            "leaning back and rising, eyes glowing brighter, about to swoop",
            "swooping forward fast, body stretched horizontally, net strands streaming far behind",
            "slowing down, body upright again, strands settling"]),
        "goi": dict(ten="a summoning roar", o=448, khung=[
            "floating in place, net arms hanging down",
            "throwing the head back, glowing mouth wide open roaring, net arms spreading wide",
            "roaring with net arms raised high, small floating net ghosts tearing loose from its body",
            "lowering the arms, eyes glowing"]),
        "dau": dict(ten="being hit hard", o=448, khung=[
            "floating in place, net arms hanging down",
            "flinching backward from a hit, torn net pieces and a plastic float flying off",
            "recoiling, net arms flailing, angry glowing eyes"]),
        "chet": dict(ten="a defeat", o=512, khung=[
            "floating, wounded and sagging",
            "sinking down, the knots coming loose, the glow fading from the eyes",
            "unraveling into loose strands, small fish and a crab slipping free from the net",
            "only a flat heap of old fishing net and broken floats left on the ground"]),
    },
}
BANG_CAO = 576
BANG_PHONG_CACH = ("2D game sprite sheet, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, "
                   "cute chibi proportions with a big head and small body, no text, no numbers, no frame borders, "
                   "no grid lines, no ground, no shadow")
BANG_TRUM = ("2D game boss sprite sheet, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, "
             "menacing but kid-friendly, no text, no numbers, no frame borders, no grid lines, no ground, no shadow")
GIU = {"mam": "Keep the same face mask, colors, outfit and proportions as the reference in every frame."}
GIU_KHAC = "Keep the same face, colors, materials and body shape as the reference in every frame."

# Đồ vật trong màn (thay hình vẽ bằng code và emoji). "cao": chiều cao khi đóng gói (px).
DO_VAT_KIEU = ("2D game prop, hand-painted cartoon style, soft cel shading, clean medium-weight dark outline, side view, "
               "single object centered, whole object visible, no text, no characters, no ground, no shadow, "
               "no background")
DO_VAT = [
    dict(id="dong_rac", cao=200,
         prompt="a small messy heap of washed-up plastic trash: crumpled plastic bags, plastic bottles, a dented soda "
                "can and a tangle of old fishing net, piled on a low mound of dirty sand"),
    dict(id="tram", cao=240,
         prompt="a small cozy recycling rest station: a low bench made of driftwood planks and blue recycled plastic "
                "crates, a short wooden post on one end holding a glowing green recycling-symbol lantern"),
    dict(id="long", cao=260,
         prompt="an ominous spirit cage made of twisted black-purple plastic bars and rusty metal rings, empty inside "
                "with clear see-through gaps between the bars, a round dome top, faint toxic purple glow"),
    dict(id="den_long", cao=160,
         prompt="an old hanging lantern made from a glass jar with a small warm candle flame inside, a rusty wire "
                "handle on top, warm orange glow"),
    dict(id="nhat_ky", cao=200,
         prompt="a small wooden lectern stand holding an open old weathered journal book with handwritten pages, "
                "a pencil resting on the book"),
    # Màn 2: Rừng Ngập Mặn
    dict(id="dong_rac_dam", cao=200,
         prompt="a small messy heap of shrimp-farm trash: broken white styrofoam boxes, empty woven plastic feed "
                "sacks, cracked plastic floats and a tangle of old fishing net, piled on a low mound of dark mud"),
    dict(id="nha_san", cao=330,
         prompt="a small rustic stilt hut standing on thin wooden poles, a thatched nipa palm roof, woven bamboo "
                "walls, a short wooden ladder, a hanging oil lamp glowing warm by the door, a few young mangrove "
                "seedlings in pots on the porch"),
    dict(id="cay_duoc", cao=260,
         prompt="a young red mangrove tree with glossy green leaves, many arching stilt roots spreading out like legs "
                "at the bottom, a few long green seedling pods hanging from the branches"),
]


def khung_cua(n):
    return list(n["khung"]) if "khung" in n else ["chop", "danh", "dau"]


def ghi_json(duong, du_lieu):
    with open(duong, "w", encoding="utf-8") as f:
        json.dump(du_lieu, f, ensure_ascii=False, indent=1)
    print("ghi", duong, "-", len(du_lieu), "việc")


def doc_chon():
    if not os.path.exists(CHON):
        return {}
    with open(CHON, encoding="utf-8") as f:
        return json.load(f)


def loc(ds, ids):
    return [n for n in ds if not ids or n["id"] in ids]


def tep_ra(ten_viec, giai_doan):
    return os.path.join(RA[giai_doan], ten_viec + ".png")


# ---------- Tạo việc cho sinh_anh.py ----------

def viec_goc(ids):
    ds = []
    for n in loc(NHAN_VAT, ids):
        if n.get("goc_tu"):
            continue
        for k, hat in enumerate(HAT):
            ds.append({
                "ten": "%s_goc_%d" % (n["id"], k + 1), "trong_suot": True, "rong": 1024, "cao": 1024, "hat": hat,
                "prompt": "%s, standing in a relaxed idle pose, three-quarter view facing %s. %s." % (
                    n["mo_ta"], n["huong"], PHONG_CACH),
            })
    return ds


def loi_dang(n, dang):
    return ("The same character as in the reference image: %s. Pose: %s, side view facing %s. Keep the same face, "
            "colors, outfit, proportions and art style as the reference. %s." % (
                n["mo_ta"], dang, n["huong"], PHONG_CACH))


def viec_dong_tac(ids):
    chon, ds, thieu = doc_chon(), [], []
    for n in loc(NHAN_VAT, ids):
        so = chon.get(n["id"], {}).get("goc")
        goc = so and tep_ra("%s_goc_%d" % (n["id"], so), "goc")
        if not goc or not os.path.exists(goc):
            thieu.append(n["id"])
            continue
        if "khung" in n:
            loi = {k: loi_dang(n, v) for k, v in n["khung"].items()}
        else:
            loi = {"chop": CHOP, "dau": DAU, "danh": loi_dang(n, "%s toward the %s" % (n["danh"], n["huong"]))}
        for dt in khung_cua(n):
            for k, hat in enumerate(HAT):
                v = {"ten": "%s_%s_%d" % (n["id"], dt, k + 1), "trong_suot": True, "hat": hat,
                     "dua_vao": [goc], "prompt": loi[dt]}
                # Khung chỉ sửa nét mặt giữ khổ ảnh gốc; khung đổi dáng thì sinh khổ vuông
                if dt not in ("chop",) and not (dt == "dau" and "khung" not in n):
                    v.update(rong=1024, cao=1024)
                ds.append(v)
    if thieu:
        print("chưa chọn ảnh gốc (chon.json) cho:", ", ".join(thieu))
    return ds


def viec_bang(ids):
    """ids: "mam" (mọi động tác) hoặc "mam:chay" (một động tác)."""
    chon, ds = doc_chon(), []
    muon = [i.split(":") for i in ids] or [[k] for k in BANG]
    for m in muon:
        n, dts = THEO_ID[m[0]], (m[1:] or list(BANG[m[0]]))
        nguon = n.get("goc_tu", n["id"])
        so = chon.get(nguon, {}).get("goc")
        goc = so and tep_ra("%s_goc_%d" % (nguon, so), "goc")
        if not goc or not os.path.exists(goc):
            print("chưa chọn ảnh gốc (chon.json) cho:", nguon)
            continue
        kieu = BANG_TRUM if n.get("trum") else BANG_PHONG_CACH
        for dt in dts:
            b = BANG[n["id"]][dt]
            tung = " ".join("Frame %d: %s." % (i + 1, t) for i, t in enumerate(b["khung"]))
            loi = ("A sprite sheet of the same character as in the reference image: %s. Exactly %d animation frames "
                   "of %s, arranged left to right in one single horizontal row, evenly spaced with a clear empty gap "
                   "between frames, every frame at the same scale on the same ground line, side view facing %s in "
                   "every frame. %s %s %s." % (n["mo_ta"], len(b["khung"]), b["ten"], n["huong"], tung,
                                              GIU.get(n["id"], GIU_KHAC), kieu))
            for k, hat in enumerate(HAT):
                ds.append({"ten": "%s_bang_%s_%d" % (n["id"], dt, k + 1), "trong_suot": True, "hat": hat,
                           "dua_vao": [goc], "rong": b["o"] * len(b["khung"]), "cao": BANG_CAO, "prompt": loi})
    return ds


def vung_lien(m):
    """Gán nhãn các vùng liền nhau (8 hướng) của mặt nạ bool. Trả về (nhãn, số vùng)."""
    import numpy as np
    from collections import deque
    h, w = m.shape
    nhan = np.zeros((h, w), np.int32)
    so = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if nhan[y0, x0]:
            continue
        so += 1
        nhan[y0, x0] = so
        q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not nhan[yy, xx]:
                        nhan[yy, xx] = so
                        q.append((yy, xx))
    return nhan, so


def don_manh(a):
    """Dọn một khung vừa cắt: bỏ mẩu của khung bên cạnh lấn qua mép cắt, vệt bóng xám dưới chân, hạt rác.
    Giữ lá, vệt chém... tách rời nhưng không chạm mép và không phải bóng."""
    import numpy as np
    nho = a.resize((max(1, a.width // 2), max(1, a.height // 2)), Image.BOX)
    x = np.asarray(nho).astype(np.int16)
    nhan, so = vung_lien(x[..., 3] > 40)
    if so <= 1:
        return a
    dt = np.bincount(nhan.ravel())[1:]
    lon = int(dt.argmax()) + 1
    ys = np.nonzero((nhan == lon).any(1))[0]
    day_than = ys.max()
    bo = np.zeros(so + 1, bool)
    for k in range(1, so + 1):
        vung = nhan == k
        if k == lon:
            continue
        yy, xx = np.nonzero(vung)
        px = x[vung][:, :3]
        bao_hoa = (px.max(1) - px.min(1)).mean()
        sang = px.mean()
        cham_mep = xx.min() == 0 or xx.max() == nhan.shape[1] - 1
        if dt[k - 1] < 0.002 * dt[lon - 1]:
            bo[k] = True                                   # hạt rác
        elif cham_mep and dt[k - 1] < 0.25 * dt[lon - 1]:
            bo[k] = True                                   # mẩu khung bên cạnh
        elif bao_hoa < 32 and 50 < sang < 205 and yy.min() >= day_than - 4:
            bo[k] = True                                   # bóng xám dưới chân
    if not bo.any():
        return a
    giu = Image.fromarray((~bo[nhan] * 255).astype(np.uint8)).resize(a.size, Image.NEAREST)
    al = np.minimum(np.asarray(a.getchannel("A")), np.asarray(giu))
    a = a.copy()
    a.putalpha(Image.fromarray(al.astype(np.uint8)))
    return a


def cat_bang(a, so_khung):
    """Cắt bảng khung thành từng khung: đường cắt đặt ở cột ít hình nhất gần các mốc chia đều,
    nên đầu vợt lấn sang ô bên cạnh cũng không làm cắt sai. Trả về [(ảnh khung, x0, x1)]."""
    import numpy as np
    al = np.asarray(a.getchannel("A")).astype(np.float32)
    cot = (al > 40).sum(0).astype(np.float32)
    w, buoc = a.width, a.width / so_khung
    cat = [0]
    for i in range(1, so_khung):
        g = int(i * buoc)
        lo, hi = max(cat[-1] + 1, int(g - buoc * 0.35)), min(w - 1, int(g + buoc * 0.35))
        cat.append(lo + int(np.argmin(cot[lo:hi + 1])))
    cat.append(w)
    return [(don_alpha(don_manh(a.crop((x0, 0, x1, a.height)))), x0, x1) for x0, x1 in zip(cat, cat[1:])]


def viec_nen(ids):
    ds = []
    for n in loc(NEN, ids):
        for k, hat in enumerate(HAT):
            v = {"ten": "%s_%d" % (n["id"], k + 1), "rong": n["rong"], "cao": n["cao"], "hat": hat,
                 "prompt": n["prompt"]}
            if n.get("trong_suot"):
                v["trong_suot"] = True
            ds.append(v)
    return ds


def viec_do_vat(ids):
    return [{"ten": "%s_%d" % (n["id"], k + 1), "trong_suot": True, "rong": 1024, "cao": 1024, "hat": hat,
             "prompt": "%s. %s." % (n["prompt"], DO_VAT_KIEU)}
            for n in loc(DO_VAT, ids) for k, hat in enumerate(HAT)]


# ---------- Bảng so sánh ----------

def phong_chu(co):
    for f in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, co)
    return ImageFont.load_default()


def o_co(w, h, o=16):
    g = Image.new("RGB", (w, h), (255, 255, 255))
    d = ImageDraw.Draw(g)
    for y in range(0, h, o):
        for x in range(0, w, o):
            if (x // o + y // o) % 2:
                d.rectangle((x, y, x + o - 1, y + o - 1), fill=(225, 225, 225))
    return g


def xem_bang():
    """Mỗi động tác một bảng: 3 phương án xếp dọc, kẻ đỏ chỗ sẽ cắt khung."""
    os.makedirs(os.path.join(THU_MUC, "xem"), exist_ok=True)
    font, RONG = phong_chu(26), 1500
    for nid, ds in BANG.items():
        for dt, b in ds.items():
            anh = []
            for k in range(len(HAT)):
                p = tep_ra("%s_bang_%s_%d" % (nid, dt, k + 1), "bang")
                if os.path.exists(p):
                    anh.append((k + 1, Image.open(p).convert("RGBA")))
            if not anh:
                continue
            hang = []
            for so, a in anh:
                s = RONG / a.width
                h = max(1, round(a.height * s))
                nen = o_co(RONG, h)
                nen.paste(a.resize((RONG, h), Image.LANCZOS), (0, 0), a.resize((RONG, h), Image.LANCZOS))
                d = ImageDraw.Draw(nen)
                for _, x0, x1 in cat_bang(a, len(b["khung"]))[1:]:
                    d.line([(x0 * s, 0), (x0 * s, h)], fill=(230, 30, 30), width=3)
                d.text((8, 4), str(so), fill=(200, 30, 30), font=font)
                hang.append(nen)
            bang = Image.new("RGB", (RONG, sum(x.height + 10 for x in hang)), (250, 250, 250))
            y = 0
            for x in hang:
                bang.paste(x, (0, y))
                y += x.height + 10
            duong = os.path.join(THU_MUC, "xem", "bang_%s_%s.jpg" % (nid, dt))
            bang.save(duong, quality=88)
            print("ghi", duong)


TOC_DO = {"dung": 4, "chay": 12}   # khung/giây khi xem thử; còn lại 10


def xem_dong(ids):
    """GIF xem thử hoạt ảnh của từng động tác: 3 phương án bảng khung cạnh nhau, đã cắt và căn như trong game.
    In độ giống nhau giữa hai khung liền nhau (cao quá ~92% là gần như trùng hình)."""
    import numpy as np
    chon = doc_chon()
    os.makedirs(os.path.join(THU_MUC, "xem"), exist_ok=True)
    font = phong_chu(20)
    for nid, ds in BANG.items():
        if THEO_ID[nid].get("trum"):
            xem_dong_trum(nid, ds, ids, font)
            continue
        so = chon.get(nid, {}).get("goc")
        p0 = so and tep_ra("%s_goc_%d" % (nid, so), "goc")
        if not p0 or not os.path.exists(p0):
            continue
        goc = don_alpha(Image.open(p0).convert("RGBA"))
        for dt, b in ds.items():
            if ids and dt not in ids:
                continue
            pa = []
            for k in range(len(HAT)):
                p = tep_ra("%s_bang_%s_%d" % (nid, dt, k + 1), "bang")
                if not os.path.exists(p):
                    continue
                khung = {"goc": goc}
                for i, (f, _, _) in enumerate(cat_bang(Image.open(p).convert("RGBA"), len(b["khung"]))):
                    khung["k_%d" % (i + 1)] = f
                ra = chuan_hoa_mam(khung)
                fr = [ra["k_%d" % (i + 1)][0] for i in range(len(b["khung"])) if "k_%d" % (i + 1) in ra]
                al = [np.asarray(f.getchannel("A")) > 128 for f in fr]
                giong = [(al[i] & al[(i + 1) % len(al)]).sum() / max(1, (al[i] | al[(i + 1) % len(al)]).sum())
                         for i in range(len(al))]
                print("%s %s phương án %d: %d khung, giống khung kế: %s" % (
                    nid, dt, k + 1, len(fr), " ".join("%.0f%%" % (100 * g) for g in giong)))
                pa.append((k + 1, fr))
            if not pa:
                continue
            O, n = 280, max(len(f) for _, f in pa)
            ra_anh = []
            for t in range(n):
                g = Image.new("RGB", (O * len(pa), O + 30), (44, 52, 66))
                d = ImageDraw.Draw(g)
                for c, (so_pa, fr) in enumerate(pa):
                    f = fr[t % len(fr)].resize((O, O), Image.LANCZOS)
                    g.paste(f, (c * O, 30), f)
                    d.line([(c * O, 30 + O * MAM_CHAN / MAM_KHO), ((c + 1) * O, 30 + O * MAM_CHAN / MAM_KHO)], fill=(120, 130, 140))
                    d.text((c * O + 8, 4), "%s %d - khung %d/%d" % (dt, so_pa, t % len(fr) + 1, len(fr)), fill=(240, 240, 240), font=font)
                ra_anh.append(g)
            duong = os.path.join(THU_MUC, "xem", "dong_%s_%s.gif" % (nid, dt))
            ra_anh[0].save(duong, save_all=True, append_images=ra_anh[1:], duration=round(1000 / TOC_DO.get(dt, 10)), loop=0)
            print("ghi", duong)


def xem_dong_trum(nid, ds, ids, font):
    """GIF xem thử khung boss: 3 phương án cạnh nhau, đã căn như trong game (vạch xám là dòng chân).
    xem_dong vua_nilon: mọi động tác của boss đó; xem_dong nhay: chỉ động tác nhay."""
    for dt, b in ds.items():
        if ids and dt not in ids and nid not in ids:
            continue
        pa = []
        for k in range(len(HAT)):
            p = tep_ra("%s_bang_%s_%d" % (nid, dt, k + 1), "bang")
            if not os.path.exists(p):
                continue
            fr = []
            for kq in chuan_hoa_trum([f for f, _, _ in cat_bang(Image.open(p).convert("RGBA"), len(b["khung"]))]):
                if kq:
                    o = Image.new("RGBA", (TRUM_W, TRUM_H), (0, 0, 0, 0))
                    o.paste(kq[0], (kq[1], kq[2]), kq[0])
                    fr.append(o)
            if fr:
                pa.append((k + 1, fr))
        if not pa:
            continue
        O = 300
        OH = round(O * TRUM_H / TRUM_W)
        ra_anh = []
        for t in range(max(len(f) for _, f in pa)):
            g = Image.new("RGB", (O * len(pa), OH + 30), (44, 52, 66))
            d = ImageDraw.Draw(g)
            for c, (so_pa, fr) in enumerate(pa):
                f = fr[t % len(fr)].resize((O, OH), Image.LANCZOS)
                g.paste(f, (c * O, 30), f)
                yl = 30 + OH * TRUM_CHAN / TRUM_H
                d.line([(c * O, yl), ((c + 1) * O, yl)], fill=(120, 130, 140))
                d.text((c * O + 8, 4), "%s %d - khung %d/%d" % (dt, so_pa, t % len(fr) + 1, len(fr)), fill=(240, 240, 240), font=font)
            ra_anh.append(g)
        duong = os.path.join(THU_MUC, "xem", "dong_%s_%s.gif" % (nid, dt))
        ra_anh[0].save(duong, save_all=True, append_images=ra_anh[1:], duration=220, loop=0)
        print("ghi", duong)


def xem(giai_doan):
    if giai_doan == "bang":
        return xem_bang()
    hang = []
    if giai_doan == "goc":
        hang = [(n["id"], ["%s_goc_%d" % (n["id"], k + 1) for k in range(len(HAT))]) for n in NHAN_VAT]
    elif giai_doan == "dong_tac":
        for n in NHAN_VAT:
            for dt in khung_cua(n):
                hang.append(("%s %s" % (n["id"], dt), ["%s_%s_%d" % (n["id"], dt, k + 1) for k in range(len(HAT))]))
    elif giai_doan == "do_vat":
        hang = [(n["id"], ["%s_%d" % (n["id"], k + 1) for k in range(len(HAT))]) for n in DO_VAT]
    else:
        hang = [(n["id"], ["%s_%d" % (n["id"], k + 1) for k in range(len(HAT))]) for n in NEN]
    hang = [(t, ds) for t, ds in hang if any(os.path.exists(tep_ra(x, giai_doan)) for x in ds)]
    if not hang:
        print("chưa có ảnh nào trong", RA[giai_doan])
        return
    rong_o = 480 if giai_doan == "nen" else 300
    cao_o, NHAN = 300, 170
    font = phong_chu(22)
    os.makedirs(os.path.join(THU_MUC, "xem"), exist_ok=True)
    for b in range(0, len(hang), 6):
        phan = hang[b:b + 6]
        bang = Image.new("RGB", (NHAN + rong_o * len(HAT), cao_o * len(phan)), (250, 250, 250))
        d = ImageDraw.Draw(bang)
        for r, (tieu_de, ds) in enumerate(phan):
            d.text((10, r * cao_o + cao_o // 2 - 12), tieu_de, fill=(20, 40, 30), font=font)
            for c, ten in enumerate(ds):
                p = tep_ra(ten, giai_doan)
                nen = o_co(rong_o - 8, cao_o - 8)
                if os.path.exists(p):
                    a = Image.open(p).convert("RGBA")
                    a.thumbnail((rong_o - 16, cao_o - 16))
                    nen.paste(a, ((rong_o - 8 - a.width) // 2, (cao_o - 8 - a.height) // 2), a)
                bang.paste(nen, (NHAN + c * rong_o + 4, r * cao_o + 4))
                d.text((NHAN + c * rong_o + 10, r * cao_o + 8), str(c + 1), fill=(200, 30, 30), font=font)
        duong = os.path.join(THU_MUC, "xem", "%s_%d.jpg" % (giai_doan, b // 6 + 1))
        bang.save(duong, quality=88)
        print("ghi", duong)


# ---------- Chuẩn hoá khung hình và đóng gói vào game ----------

def don_alpha(a):
    """Bỏ alpha rác (<12) mà sinh_anh.py đã ghi chú, rồi cắt sát hình."""
    k = a.getchannel("A").point(lambda x: 0 if x < 12 else x)
    a = a.copy()
    a.putalpha(k)
    hop = k.getbbox()
    return a.crop(hop) if hop else a


def khoi_luong(a):
    return ImageStat.Stat(a.getchannel("A")).sum[0] / 255.0


def tam_x(a):
    cot = list(a.getchannel("A").resize((a.width, 1), Image.BOX).tobytes())
    tong = sum(cot) or 1
    return sum(i * c for i, c in enumerate(cot)) / tong


def dong_goi_nhan_vat(n, c):
    """Mọi khung của một nhân vật cùng khổ vuông, chân chạm đáy, trọng tâm ở giữa.
    Khung gốc cao 80% khổ; khung khác co giãn để cùng 'khối lượng' hình với khung gốc,
    nên dáng vươn dài hay co lại thì nhân vật vẫn không to nhỏ thất thường.
    Trả về số khung / chỗ đặt khung của từng động tác (bảng khung) để dong_goi ghi file khung.js."""
    lat = c.get("lat", [])
    if lat is True:
        lat = ["goc"] + khung_cua(n)
    khung, so_khung, trum = {}, {}, {}
    for dt, so in c.get("bang", {}).items():
        p = tep_ra("%s_bang_%s_%d" % (n["id"], dt, so), "bang")
        if not os.path.exists(p):
            print("thiếu", p)
            continue
        bo = c.get("bo", {}).get(dt, [])   # số thứ tự khung (từ 1) muốn bỏ
        tat_ca = [f for f, _, _ in cat_bang(Image.open(p).convert("RGBA"), len(BANG[n["id"]][dt]["khung"]))]
        if n.get("trum"):
            # boss: căn cả bảng theo khung 1 trước, rồi mới bỏ khung hỏng
            trum[dt] = [k for i, k in enumerate(chuan_hoa_trum(tat_ca)) if k and i + 1 not in bo]
            continue
        ds = [f for i, f in enumerate(tat_ca) if i + 1 not in bo]
        for i, f in enumerate(ds):
            khung["%s_%d" % (dt, i + 1)] = f
        so_khung[dt] = len(ds)
    if trum:
        so_khung = ghi_khung_trum(n, trum)
    for dt in ["goc"] + khung_cua(n):
        so = c.get(dt)
        if not so:
            continue
        p = tep_ra("%s_%s_%d" % (n["id"], dt, so), "goc" if dt == "goc" else "dong_tac")
        if not os.path.exists(p):
            print("thiếu", p)
            continue
        a = don_alpha(Image.open(p).convert("RGBA"))
        if dt in lat:
            a = ImageOps.mirror(a)
        khung[dt] = a
    if "goc" not in khung:
        return so_khung
    if n.get("neo_mat"):
        dong_goi_mam(n, khung)
        return so_khung
    cao = 512 if n.get("trum") else 256
    kho = int(cao / 0.8)
    goc = khung["goc"]
    s0 = cao / goc.height
    m0 = khoi_luong(goc) * s0 * s0
    thu_muc = os.path.join(GAME, "assets", n["nhom"])
    os.makedirs(thu_muc, exist_ok=True)
    for dt, a in khung.items():
        s = s0 if dt == "goc" else math.sqrt(m0 / max(1.0, khoi_luong(a)))
        s = min(s, (kho - 8) / a.width, (kho - 4) / a.height)
        w, h = max(1, round(a.width * s)), max(1, round(a.height * s))
        nho = a.resize((w, h), Image.LANCZOS)
        x = max(0, min(kho - w, round(kho / 2 - tam_x(a) * s)))
        o = Image.new("RGBA", (kho, kho), (0, 0, 0, 0))
        o.paste(nho, (x, kho - 4 - h), nho)
        ten = n["id"] + (".png" if dt == "goc" else "_%s.png" % dt)
        o.save(os.path.join(thu_muc, ten))
        print("ghi assets/%s/%s  (%dx%d, co %.2f)" % (n["nhom"], ten, kho, kho, s))
    return so_khung


# Khung boss: khổ chung TRUM_W x TRUM_H, dòng chân TRUM_CHAN, dáng đứng (khung 1 của mỗi bảng) cao TRUM_CAO.
# Mỗi khung lưu ảnh đã cắt sát cho nhẹ, kèm chỗ đặt (x, y) trong khổ chung. Khớp với bossFrame/drawEnemy trong render.js.
TRUM_W, TRUM_H, TRUM_CHAN, TRUM_CAO = 600, 500, 496, 300


def do_khung(a):
    """(đỉnh, đáy, tâm x phần thân dưới) của một khung. Bỏ qua hàng chỉ có giọt, sợi mảnh."""
    import numpy as np
    al = np.asarray(a.getchannel("A")) > 100
    ys = np.nonzero(al.sum(1) > max(3, 0.02 * a.width))[0]
    if not len(ys):
        return None
    tren, day = int(ys.min()), int(ys.max())
    duoi = al[max(tren, day - int((day - tren + 1) * 0.3)):day + 1]
    xs = np.nonzero(duoi)[1]
    return tren, day, (float(xs.mean()) if len(xs) else a.width / 2)


def chuan_hoa_trum(ds):
    """ds: mọi khung của MỘT bảng (Qwen vẽ cùng tỉ lệ trong một ảnh). Khung 1 là dáng đứng: co cả bảng để khung 1 cao
    TRUM_CAO như ảnh gốc. Mỗi khung: đáy chạm dòng chân, tâm phần thân dưới ở giữa khổ, nên vươn tay hay giơ càng thì
    chân vẫn đứng yên một chỗ. Trả về [(ảnh cắt sát, x, y) hoặc None] cùng thứ tự với ds."""
    do = [do_khung(a) for a in ds]
    if not do or not do[0]:
        return [None] * len(ds)
    s = TRUM_CAO / (do[0][1] - do[0][0] + 1)
    ra = []
    for a, d in zip(ds, do):
        if not d:
            ra.append(None)
            continue
        w, h = max(1, round(a.width * s)), max(1, round(a.height * s))
        nho = a.resize((w, h), Image.LANCZOS)
        o = Image.new("RGBA", (TRUM_W, TRUM_H), (0, 0, 0, 0))
        o.paste(nho, (round(TRUM_W / 2 - d[2] * s), round(TRUM_CHAN - (d[1] + 1) * s)), nho)
        hop = o.getchannel("A").getbbox()
        ra.append((o.crop(hop), hop[0], hop[1]) if hop else None)
    return ra


def ghi_khung_trum(n, trum):
    """Ghi ảnh khung boss vào assets/enemies/<id>_<động tác>_<số>.png. Trả về {động tác: [[x, y], ...]}."""
    thu_muc = os.path.join(GAME, "assets", n["nhom"])
    os.makedirs(thu_muc, exist_ok=True)
    cho = {}
    for dt, ds in trum.items():
        cho[dt] = []
        for i, (anh, x, y) in enumerate(ds):
            anh.save(os.path.join(thu_muc, "%s_%s_%d.png" % (n["id"], dt, i + 1)), optimize=True)
            cho[dt].append([x, y])
        print("ghi assets/%s/%s_%s_1..%d" % (n["nhom"], n["id"], dt, len(ds)))
    return cho


MAM_KHO, MAM_CHAN, MAM_CAO = 480, 400, 256   # khổ vuông, dòng chân, chiều cao thân khung gốc (khớp render.js)


def phan_than(a):
    """Thân (đã bỏ cán vợt, mắt lưới, vệt chém mảnh) và mặt nạ trắng, ở 1/4 độ phân giải."""
    import numpy as np
    nho = a.resize((max(1, a.width // 4), max(1, a.height // 4)), Image.BOX)
    x = np.asarray(nho).astype(np.int16)
    than = Image.fromarray(((x[..., 3] > 160) * 255).astype(np.uint8))
    mat = Image.fromarray((((x[..., 3] > 200) & (x[..., :3].min(-1) > 190)) * 255).astype(np.uint8))
    mo = lambda m: m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    return mo(than), mo(mat)


def mat_na(a):
    """Mặt nạ trắng của Mầm: (chiều cao, tâm x) của vùng kem lớn nhất, đo ở 1/2 độ phân giải.
    Dùng chiều cao chứ không dùng diện tích: hai lỗ mắt chia mặt nạ thành dải mỏng, lọc nét mảnh sẽ ăn mất
    diện tích ở khung nhỏ; còn chiều cao gồm cả lỗ mắt và ít đổi khi quay nghiêng."""
    import numpy as np
    x = np.asarray(a.resize((max(1, a.width // 2), max(1, a.height // 2)), Image.BOX)).astype(np.int16)
    sang, bh = x[..., :3].mean(-1), x[..., :3].max(-1) - x[..., :3].min(-1)
    m = Image.fromarray((((x[..., 3] > 200) & (sang > 150) & (bh < 70)) * 255).astype(np.uint8))
    m = np.asarray(m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    nhan, so = vung_lien(m)
    if not so:
        return None
    k = int(np.bincount(nhan.ravel())[1:].argmax()) + 1
    ys, xs = np.nonzero(nhan == k)
    if len(xs) < 20:
        return None
    return (ys.max() - ys.min() + 1) * 2.0, xs.mean() * 2 + 1


def dong_goi_mam(n, khung):
    thu_muc = os.path.join(GAME, "assets", n["nhom"])
    os.makedirs(thu_muc, exist_ok=True)
    for dt, (o, s, ti_le) in chuan_hoa_mam(khung).items():
        ten = n["id"] + (".png" if dt == "goc" else "_%s.png" % dt)
        o.save(os.path.join(thu_muc, ten))
        print("ghi assets/%s/%s  (co %.3f, mặt %.0f%%)" % (n["nhom"], ten, s, ti_le))


def chuan_hoa_mam(khung):
    """Khung của Mầm: mặt nạ cùng cỡ, cùng chỗ theo chiều ngang; đáy thân chạm dòng chân.
    Cán vợt, lưới chĩa lên/xuống không làm nhân vật nhảy vị trí như khi căn theo cả hình.
    Trả về {tên: (ảnh 480x480, hệ số co, cỡ mặt nạ so với khung gốc %)}."""
    import numpy as np
    do, thieu = {}, {}
    for dt, a in khung.items():
        than, _ = phan_than(a)
        tx = np.nonzero(np.asarray(than) > 0)[1]
        than_x = tx.mean() * 4 + 2 if len(tx) else a.width / 2
        day = (than.getbbox() or (0, 0, 0, a.height // 4))[3] * 4
        mn = mat_na(a)
        if not mn:
            thieu[dt] = dict(day=day, than_x=than_x)
            continue
        do[dt] = dict(cao_mat=mn[0], tam=mn[1], day=day, than_x=than_x)
    # Khung bị ánh sáng phủ kín mặt nạ: mượn cỡ và độ lệch mặt-thân của khung bên cạnh cùng động tác
    for dt, d in thieu.items():
        cung = [k for k in do if k != "goc" and k.rsplit("_", 1)[0] == dt.rsplit("_", 1)[0]]
        if not cung:
            print("không thấy mặt nạ, bỏ khung:", dt)
            continue
        ke = min(cung, key=lambda k: abs(int(k.rsplit("_", 1)[-1]) - int(dt.rsplit("_", 1)[-1])) if k.rsplit("_", 1)[-1].isdigit() else 99)
        do[dt] = dict(cao_mat=do[ke]["cao_mat"], tam=d["than_x"] + do[ke]["tam"] - do[ke]["than_x"], day=d["day"],
                      than_x=d["than_x"])
        print("không thấy mặt nạ ở %s: mượn cỡ của %s" % (dt, ke))
    if "goc" not in do:
        return {}
    s0 = MAM_CAO / (do["goc"]["day"] - khung["goc"].getbbox()[1])
    ra = {}
    for dt, a in khung.items():
        if dt not in do:
            continue
        d = do[dt]
        s = s0 * do["goc"]["cao_mat"] / d["cao_mat"]
        w, h = max(1, round(a.width * s)), max(1, round(a.height * s))
        nho = a.resize((w, h), Image.LANCZOS)
        o = Image.new("RGBA", (MAM_KHO, MAM_KHO), (0, 0, 0, 0))
        o.paste(nho, (round(MAM_KHO / 2 - d["tam"] * s), round(MAM_CHAN - d["day"] * s)), nho)
        ra[dt] = (o, s, 100 * d["cao_mat"] / do["goc"]["cao_mat"])
    return ra


def dong_goi_nen(chon_nen):
    thu_muc = os.path.join(GAME, "assets", "bg")
    os.makedirs(thu_muc, exist_ok=True)
    for n in NEN:
        so = chon_nen.get(n["id"])
        p = so and tep_ra("%s_%d" % (n["id"], so), "nen")
        if not p or not os.path.exists(p):
            continue
        a = Image.open(p)
        if n["id"].startswith("o_"):
            a = a.convert("RGB").resize((192, 192), Image.LANCZOS)   # mẫu ô gạch: 4 ô 48 px
            if n.get("sang"):   # ảnh quá tối (bùn): sáng lên cho đất còn thấy được khi game phủ lớp tối
                from PIL import ImageEnhance
                a = ImageEnhance.Brightness(a).enhance(n["sang"])
        elif n.get("trong_suot"):
            # lớp gần đã bị cắt sát nội dung: giữ tỉ lệ, rộng 1600 px, game đặt sát đáy màn hình
            a = a.convert("RGBA")
            a = a.resize((1600, round(a.height * 1600 / a.width)), Image.LANCZOS)
        else:
            a = a.convert("RGB")
            a = a.resize((round(a.width * 540 / a.height), 540), Image.LANCZOS)   # cao bằng khung game
        a.save(os.path.join(thu_muc, n["id"] + ".png"))
        print("ghi assets/bg/%s.png  (%dx%d)" % (n["id"], a.width, a.height))


def dong_goi_do_vat(chon_dv):
    """Đồ vật: cắt sát hình, cao n["cao"] px. Chọn nhiều phương án thì thành nhiều kiểu (vd hai đống rác khác nhau)."""
    if not chon_dv:
        return
    thu_muc = os.path.join(GAME, "assets", "props")
    os.makedirs(thu_muc, exist_ok=True)
    so = {}
    for n in DO_VAT:
        ds = chon_dv.get(n["id"])
        if not ds:
            continue
        k = 0
        for pa in ([ds] if isinstance(ds, int) else ds):
            p = tep_ra("%s_%d" % (n["id"], pa), "do_vat")
            if not os.path.exists(p):
                print("thiếu", p)
                continue
            a = don_alpha(Image.open(p).convert("RGBA"))
            a = a.resize((max(1, round(a.width * n["cao"] / a.height)), n["cao"]), Image.LANCZOS)
            k += 1
            a.save(os.path.join(thu_muc, "%s_%d.png" % (n["id"], k)), optimize=True)
            print("ghi assets/props/%s_%d.png  (%dx%d)" % (n["id"], k, a.width, a.height))
        if k:
            so[n["id"]] = k
    ghi_js(os.path.join(thu_muc, "do_vat.js"), "số kiểu ảnh của mỗi đồ vật", ["HSX.DO_VAT = %s;" % json.dumps(so)])


def ghi_js(duong, chu_thich, dong):
    """File .js để game đọc (chạy được cả khi mở index.html trực tiếp, không cần máy chủ)."""
    with open(duong, "w", encoding="utf-8") as f:
        f.write("// Tự sinh bởi qwen/cong_cu.py dong_goi: %s\n" % chu_thich)
        for d in dong:
            f.write(d + "\n")
    print("ghi", os.path.relpath(duong, GAME))


def dong_goi():
    chon, quai = doc_chon(), {}
    for n in NHAN_VAT:
        c = chon.get(n["id"], {})
        if not c.get("goc") and not c.get("bang"):
            continue
        sk = dong_goi_nhan_vat(n, c)
        if not sk:
            continue
        if n["nhom"] == "player":
            ghi_js(os.path.join(GAME, "assets", "player", "khung.js"), "số khung mỗi động tác của %s" % n["id"],
                   ["HSX.KHUNG_%s = %s;" % (n["id"].upper(), json.dumps(sk))])
        else:
            quai[n["id"]] = sk
    if quai:
        ghi_js(os.path.join(GAME, "assets", "enemies", "khung.js"), "chỗ đặt từng khung hoạt ảnh boss trong khổ chung",
               ["HSX.KHUNG_QUAI_CO = %s;" % json.dumps(dict(w=TRUM_W, h=TRUM_H, chan=TRUM_CHAN, cao=TRUM_CAO)),
                "HSX.KHUNG_QUAI = %s;" % json.dumps(quai, separators=(",", ":"))])
    dong_goi_nen(chon.get("nen", {}))
    dong_goi_do_vat(chon.get("do_vat", {}))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    lenh, them = (sys.argv[1] if len(sys.argv) > 1 else ""), sys.argv[2:]
    if lenh == "goc":
        ghi_json(os.path.join(THU_MUC, "viec_goc.json"), viec_goc(them))
    elif lenh == "dong_tac":
        ghi_json(os.path.join(THU_MUC, "viec_dong_tac.json"), viec_dong_tac(them))
    elif lenh == "nen":
        ghi_json(os.path.join(THU_MUC, "viec_nen.json"), viec_nen(them))
    elif lenh == "bang":
        ghi_json(os.path.join(THU_MUC, "viec_bang.json"), viec_bang(them))
    elif lenh == "do_vat":
        ghi_json(os.path.join(THU_MUC, "viec_do_vat.json"), viec_do_vat(them))
    elif lenh == "xem":
        xem(them[0] if them else "goc")
    elif lenh == "xem_dong":
        xem_dong(them)
    elif lenh == "dong_goi":
        dong_goi()
    else:
        print(__doc__)
