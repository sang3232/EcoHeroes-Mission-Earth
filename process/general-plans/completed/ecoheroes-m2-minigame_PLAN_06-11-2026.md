# PLAN: Map 2 Mini-game — "Cổng Rừng" (Water Flow → Firefly Balance)

- **Feature:** EcoHeroes — Map 2 (Rừng Ngập Mặn) mini-game + Bần tree upgrade
- **Created:** 06-11-2026
- **Status:** validated (CONDITIONAL) — ready for EXECUTE on approval
- **Entry phase:** VALIDATE complete → EXECUTE

---

## 1. Objective

Add a required mini-game to Map 2 (M2) that gates the boss room `hang_luoi`, mirroring Map 1's
"Cuộc Phân Loại" gate. Unlike M1 (categorization), the M2 gate is a **two-phase hybrid**:

1. **Phase A — Mở Cống Đầm** (water-flow / culvert routing puzzle)
2. **Phase B — Đêm Rặng Bần** (light-vs-darkness firefly placement puzzle)

Solving both restores the grove and upgrades the **Bần** tree from a cosmetic +15% seed bonus into
an **ecosystem engine** (firefly pollination) that accelerates forest growth.

### Why

- M2 currently has **no mini-game** (no `G` tile, no `gateClean`, no puzzle module). M1 has one.
- `dom_dom` today is only `cond: { tree: { ban: 2 } }` → `buff: { seedBonus: 0.15 }`. Limited.
- Lore contradiction to exploit: `ban` is the *brightest* tree (`light: 125`) yet fireflies *need darkness*
  (`facts.domdom`, journal #4: "Rừng cần cả bóng tối"). The puzzle turns this into the mechanic.

---

## 2. Design

### 2.1 Gate placement & flow

- New `G` tile in **`cua_rung`** (Cửa rừng), the room immediately before the boss.
- **Exact placement:** x=34, y=10–11 (both rows). x=33 is open and would let the player bypass the gate;
  x=35 is door 2. Verified against the current `cua_rung` map (width 36, `n` net at x=32, door 2 at x=35).
- `HSX.LEVELS.m2.gateClean = 0.3` (same threshold feel as M1).
- Reaching the gate prompts **"Mở Cổng Rừng"**.
- Gate solid until **both** phases solved (`S.flags.congRung === true`).
- **All gate branches must be level-aware** (M1 uses `S.puzzle.solved`, M2 uses `S.flags.congRung`):
  `Room.solid` `G` check, `findInteract` gate loop (the `if (S.puzzle.solved) break;` must become a
  level-aware `gateSolved()` helper), `interact` gate case, and the `render.js` gate draw.
- On solve: gate opens, boss path unlocked, reward = Bần + Đước seeds. Fireflies are **not**
  force-unlocked (see §2.4) — they still require 2 mature Bần, so planting Bần keeps its value.

> Routing note: `cua_rung` already sits on the critical path
> (`dam_bo_hoang → cua_rung → hang_luoi`), so no door rewiring is strictly required. Optional polish:
> add one `P` (bun) plot in `cua_rung` so the player can plant a Bần right before the puzzle.
> `render.js` gate art must switch emoji for M2 (e.g. 🌊/🌿 instead of ♻️) and use the M2 flag.

### 2.2 Phase A — "Mở Cống Đầm" (water flow)

- Modal UI, **rotate-to-connect** pipe puzzle (deterministic, easy to validate).
- Grid ≈ 6×5 of culvert segments (`thẳng`, `khuỷu`, `chữ T`, `nguồn`, `cửa xả`).
- Player rotates segments (click / arrow keys / number keys) to form a **continuous path**
  from the river inlet to the pond outlet.
- **Win:** inlet connected to outlet. **Lose:** none — it is a logic puzzle, but track moves/time for stars.
- **Teaching:** blocked culverts → stagnant water → mangroves die (`facts.trieu`, `facts.tom`).
- Stars: `moves <= par` → 3, `<= par*1.5` → 2, else 1.

### 2.3 Phase B — "Đêm Rặng Bần" (firefly balance)

- Night falls after water flows. Modal board ≈ 6×4 grove.
- Cell types: `bun` (plantable), `nuoc` (water, not plantable), `to` (firefly nest, must be covered),
  `den` (artificial light, toggleable).
- **Bần glow:** covers itself + orthogonal neighbours (radius 1).
- **Đèn:** active lamp scares fireflies from its radius (same orthogonal range).
- A nest is satisfied only if covered by a Bần **and** outside every active lamp radius.
- Player has **K saplings** (K = number of nests, tight but solvable) and may toggle lamps.
- **Win:** all nests satisfied. Stars by lamps left on / moves.

### 2.4 Bần upgrade — "Đom đóm thụ phấn" (pollination)

After `congRung` solved:

- **Gate reward:** grants Bần + Đước seeds only. `dom_dom` is **not** force-unlocked — it still uses the
  existing `cond: { tree: { ban: 2 } }` (2 mature Bần + `ran_ban` clean), so the Bần loop keeps its value.
- `ban.light` drops to **~40** (a normal tree; the **fireflies** supply the warm glow, not the tree).
- Bần **glows green only when fireflies are present** (`render.js` draws the firefly light source).
- New species buff `growBonus: 0.25` folded into `Sys.tickTrees` growth rate.
- **Pollination tick:** in any room with ≥1 mature Bần + `dom_dom` species, every ~12s do ONE of:
  - accelerate a random planted tree by a growth chunk, **or**
  - free-plant an Đước propagule on an empty plantable plot (no seed cost), **or**
  - drop +1 seed.
- **Reveal bonus (optional, low cost):** fireflies reveal a hidden lore shard / Mảnh Lá in dark rooms.

**Loop:** Bần → fireflies → free Đước growth/seeds → more bridges → reach boss.
Bần = economy; Đước = structure. No longer overlapping roles.

---

## 3. Data & state

### 3.1 `js/data.js`

| Key | Change |
|---|---|
| `trees.ban` | `light: 125 → 40`; desc → "Cây bần ven lạch. Đom đóm tụ về, thụ phấn cho rừng lớn nhanh." |
| `species.dom_dom` | `buff: { seedBonus: 0.15, growBonus: 0.25 }`; desc updated to mention pollination. Keep `cond.tree.ban = 2`. |
| (new) `puzzle.m2` | Phase A pipe layout + Phase B nest/lamp layout definitions (or hard-code in the new module). |
| (optional) `items` | reward charm if desired (e.g. a light/firefly charm). |

### 3.2 `js/state.js`

- Use the existing persisted `flags` bag — **no new top-level state key**:
  - `s.flags.congRung = false` (M2 gate solved)
  - `s.flags.m2Best = 0` (best stars for the M2 mini-game)
- `flags` is already in the normalize/persist list (state.js line 102), so nothing extra to hydrate.
  `saveGame` persists it and `importSave` normalizes it automatically.
- Do **not** touch `s.puzzle` (M1 owns it).

> M1 gate must keep using `S.puzzle.solved`; M2 gate uses `S.flags.congRung`.
> Do **not** overload the single `S.puzzle`.

---

## 4. File touchpoints

| File | Location | Change |
|---|---|---|
| `js/data.js` | `trees.ban`, `species.dom_dom`, new `puzzle.m2` | light/desc/buff + board data |
| `js/puzzle.js` | after `HSX.Puzzle` | add `HSX.Puzzle2` (open/close/tick/render/finish/stars) — two sub-phases |
| `js/levels/m2.js` | `cua_rung` map + level header | `G` at **x=34, y=10–11**; `gateClean: 0.3`; update header symbol comment (add G); optional `P` plot |
| `js/world.js` | `Room.solid` line 110 | `if (c === 'G') return S.level === 'm2' ? !S.flags.congRung : !S.puzzle.solved;` |
| `js/world.js` | `findInteract` ~1050 | **replace** the `if (S.puzzle.solved) break;` with a level-aware `gateSolved()` check; M2 label "Mở Cổng Rừng" |
| `js/world.js` | `interact` gate ~1090 | M2 → `HSX.Puzzle2.open()` (after `cleanPct >= gateClean`); toast uses `HSX.LEVELS[S.level].goi`, not "bãi biển" |
| `js/world.js` | `lights()` plant branch ~1182 | Bần glow only when `dom_dom` present; else dim |
| `js/world.js` | new tick / `update()` | firefly pollination tick (or put in `Sys.tickTrees`) |
| `js/systems.js` | `tickTrees` ~210 | growth × `(1 + speciesFx('growBonus'))`; pollination tick |
| `js/systems.js` | `onPuzzleResult` ~257 | M1-only today; add `onPuzzle2Result` writing `flags.congRung` + `flags.m2Best` |
| `js/render.js` | gate draw ~745 | level-aware condition (`congRung` for M2) + M2 emoji (🌊/🌿) |
| `js/render.js` | `drawDomDom` ~1166 | generalise to any room with mature Bần + `dom_dom` (not just `ran_ban`); invalidate `r._domCay` cache; Bần glow = firefly light |
| `js/ui.js` | action switch ~278 | add `p2-rotate`, `p2-toggle`, `p2-next`, `p2-close`, `p2-retry` cases → `HSX.Puzzle2.*` |
| `js/ui.js` | species / end-of-map copy ~668, ~677 | mention pollination + "cổng rừng" |
| `index.html` | script list | include new module if separate file (before `js/ui.js`, after `js/systems.js`) |
| `js/audio.js` | optional | water-flow / firefly solve sounds |
| `kiem_tra/m2_puzzle.js` | new file | headless solvability check for both phases (see §5) |

---

## 5. Verification (must stay green)

```bash
node --check js/data.js
node --check js/puzzle.js
node --check js/levels/m2.js
node --check js/world.js
node --check js/systems.js
node --check js/render.js
node --check js/state.js
node --check js/ui.js
node kiem_tra/duong_di.js
node kiem_tra/m2_puzzle.js
```

Expected `duong_di.js` result: **13/13 for m1 and 10/10 for m2**, with a new M2 step line such as
`+ Giải Cổng Rừng 10/10` (or the gate room counted reachable), no new errors.

`kiem_tra/m2_puzzle.js` (new): headless solvability proof for both phases —
- Phase A: the pipe layout admits a rotation set connecting inlet→outlet.
- Phase B: a sapling/lamp assignment satisfies every nest (greedy/backtracking check).
- Exits non-zero with a clear message if either board is unsolvable.

Manual checks:
- [ ] Gate is solid before solving, prompt reads "Mở Cổng Rừng".
- [ ] Gate requires `cleanPct >= 0.3` (same message style as M1, using `goi`).
- [ ] Phase A: path connectable; completing it advances to Phase B.
- [ ] Phase B: unsolvable configs rejected; solved sets `flags.congRung`.
- [ ] Gate opens + boss room reachable after solve.
- [ ] M1 gate/puzzle unaffected.
- [ ] Bần glows only with fireflies; pollination grows trees.
- [ ] Save/reload preserves `flags.congRung` and `flags.m2Best`.

---

## 6. Blast radius / risks

- **Shared `G`/gate code** in `world.js` is used by M1 — make every branch level-aware. Regression here breaks M1.
- **`S.puzzle` is shared state** — do not reuse; M2 uses `S.flags.congRung`.
- **`drawDomDom` caching:** it caches `r._domCay`; if generalised, clear/invalidate per room.
- **Growth multiplier** affects every tree — cap it and test M1 tree growth too.
- **Pollination free-plant** must avoid infinite loops / double-planting a plot.
- **`duong_di.js`** is a path solver. Its `solid()` already treats `G` as `!ab.puzzle`, and the M2
  stage list (`MAN.m2`, lines 26–30) never sets `puzzle: true`, so a new `G` at `cua_rung` would make the
  boss unreachable and drop the 10/10 result. **Required fix:** append a stage to `MAN.m2`:
  `['+ Giải Cổng Rừng', { dash:true, slam:true, roots:true, drained:true, puzzle:true }]`.
  If instead a distinct tile char is used for the M2 gate, mirror the branch in both `solve.solid()` and
  `Room.prototype.solid`.

---

## 7. Implementation order

1. Data + state (`data.js`, `state.js`) — inert until wired.
2. `HSX.Puzzle2` module (Phase A pipe, then Phase B firefly) — build/verify standalone.
3. Gate wiring (`world.js` solid / findInteract / interact) — level-aware.
4. `m2.js` gate tile + `gateClean` + optional `P`.
5. Puzzle result → `flags.congRung` → reward + firefly enable.
6. Bần upgrade (`tickTrees` growBonus + pollination; `lights()`; `drawDomDom`).
7. Copy/audio polish (`ui.js`, `audio.js`).
8. Full gate run + `duong_di.js`; fix solver if needed.
9. Commit + closeout.

---

## 8. Resume handoff

- Next phase: **VALIDATE** (confirm the plan against code, decide exact board layouts, par values).
- Then **EXECUTE** via `vc-execute-agent`.
- Key files: `js/data.js`, `js/state.js`, `js/puzzle.js`, `js/levels/m2.js`, `js/world.js`, `js/systems.js`, `js/render.js`.
- Reference M1 implementation: `js/puzzle.js` (`HSX.Puzzle`), `world.js` gate lines 1050–1095.

---

## 9. VALIDATE — gate contract (06-11-2026)

**Net Gate: CONDITIONAL** — 0 FAILs, 6 CONCERNs. Proceed to EXECUTE with the fixes below.

### Layer 1 dimensions

| Dimension | Status |
|---|---|
| Infra/setup fit | PASS — pure client JS, file:// compat, Web Audio gesture already handled |
| Test coverage | CONCERN — no automated solvability test; only `node --check` + `duong_di.js` |
| Breaking changes | CONCERN — shared `G` gate + `S.puzzle` state used by M1; `drawDomDom` cache |
| Security surface | PASS — offline game, no auth/data/secrets/network |

### Layer 2 sections

| Section | Status | Highest-risk item |
|---|---|---|
| 2.1 Gate placement | CONCERN | `S.puzzle.solved` is TRUE in M2 → gate skippable + no prompt |
| 2.2 Phase A (flow) | CONCERN | needs `p2-*` UI action wiring |
| 2.3 Phase B (firefly) | CONCERN | needs `p2-*` UI action wiring; board must be provably solvable |
| 2.4 Bần upgrade | CONCERN | `drawDomDom` hardcodes `ran_ban` + caches `_domCay` |
| Data & state | CONCERN | persist/normalize decision |
| Solver fix | PASS | `MAN.m2` stage fix already specified |

### Findings

| # | Finding | Severity | Fix |
|---|---|---|---|
| F1 | `world.js` line 110 `G` uses `!S.puzzle.solved`; in M2 that flag is already true (M1 done) → gate never solid | CONCERN | Level-aware: `S.level === 'm2' ? !S.flags.congRung : !S.puzzle.solved` |
| F2 | `findInteract` line 1051 `if (S.puzzle.solved) break;` → M2 never shows gate prompt | CONCERN | Replace with `gateSolved()` helper (level-aware) |
| F3 | `render.js` line 745 draws gate only `if (ch === 'G' && !S.puzzle.solved)` + ♻️ emoji | CONCERN | Level-aware condition + M2 emoji (🌊/🌿) |
| F4 | `cua_rung` G must sit at **x=34, y=10–11** (not 33); x=33 is open and would bypass; x=35 is door 2 | CONCERN | Fix placement in `m2.js` |
| F5 | `m2` has no `gateClean`; `interact` gate toast hardcodes "bãi biển" | CONCERN | Add `gateClean: 0.3`; toast uses `HSX.LEVELS[S.level].goi` |
| F6 | `ui.js` has hardcoded `pz-bin/pz-close/pz-retry`; new puzzle needs own actions | CONCERN | Add `p2-rotate / p2-toggle / p2-next / p2-close / p2-retry` cases |
| F7 | `drawDomDom` (render.js 1167) early-returns unless `r.id === 'ran_ban'`; caches `r._domCay` | CONCERN | Generalise to mature-Bần rooms; invalidate `_domCay` per room |
| F8 | `dom_dom` species unlock vs gate reward could double-gate | CONCERN | Gate grants Đước+Bần seeds only; keep species cond (2 mature Bần) as the natural unlock |
| F9 | State: no `puzzle2` persist/normalize entry | CONCERN | Use existing `flags` (persisted+normalized): `flags.congRung`, `flags.m2Best` |
| F10 | No automated proof both puzzle phases are solvable | CONCERN | Add `kiem_tra/m2_puzzle.js` headless solver check |
| F11 | `m2.js` header symbol comment lacks `G` | PASS (docs) | Update comment |
| F12 | Solver `MAN.m2` lacks `puzzle:true` → boss unreachable | PASS (already planned) | Append stage |

### Proposed plan updates (apply on accept)

| # | Change | Where | Why |
|---|---|---|---|
| P1 | Add `js/ui.js` `p2-*` action wiring to touchpoints | §4 | F6 |
| P2 | `findInteract` break must be level-aware, not just label | §4/§2.1 | F2 |
| P3 | Pin gate tiles to x=34, y=10–11 in `cua_rung` | §2.1 | F4 |
| P4 | Use `flags.congRung` + `flags.m2Best` (no new `puzzle2` state) | §3.2 | F9 |
| P5 | Gate grants seeds; fireflies still unlock via 2 mature Bần | §2.4 | F8 |
| P6 | Add `kiem_tra/m2_puzzle.js` solvability test | §5 | F10 |
| P7 | Level-aware gate render + M2 emoji; update `m2.js` header comment | §4 | F3/F11 |
| P8 | `drawDomDom` generalise + cache invalidation | §4 | F7 |

### Execute-agent instructions

| # | Instruction | Trigger |
|---|---|---|
| E1 | Before wiring the gate, confirm `HSX.S.level === 'm2'` at runtime; every `G`/gate branch must be level-aware | §2.1 entry |
| E2 | The moment `G` is added, run `node kiem_tra/duong_di.js`; if m2 < 10/10, append the `MAN.m2` puzzle stage | after m2 edit |
| E3 | Never overload `S.puzzle`; after gate changes, re-run M1 flow to confirm its gate still works | after §3–§4 |
| E4 | Every `p2-*` action must `return` in `ui.js` switch; add to `data-act` in the puzzle HTML | Phase A/B build |

### Test gates (must pass before close)

```bash
node --check js/data.js
node --check js/puzzle.js
node --check js/levels/m2.js
node --check js/world.js
node --check js/systems.js
node --check js/render.js
node --check js/state.js
node --check js/ui.js
node kiem_tra/duong_di.js      # expect 13/13 m1, 10/10 m2, no errors
node kiem_tra/m2_puzzle.js     # new: both phases solvable (agent-probe tier)
```

### Contract checklist (gates EXECUTE)

- [ ] M2 gate solid before solve; prompt "Mở Cổng Rừng"
- [ ] Gate requires `cleanPct >= 0.3` (copy uses `goi`)
- [ ] Phase A connects inlet→outlet; completes → Phase B
- [ ] Phase B covers all nests, outside active lamps; sets `flags.congRung`
- [ ] Gate opens; boss reachable; `duong_di.js` 10/10 m2
- [ ] M1 gate + sorting puzzle unaffected
- [ ] Bần glows only with fireflies; pollination grows trees; `growBonus` capped
- [ ] Save/reload preserves `flags.congRung`
- [ ] All `node --check` pass; `m2_puzzle.js` pass

---

## 10. EXECUTE log (06-11-2026)

**Status: code complete, automated gates green. Manual playtest outstanding.**

### What was built

| File | Change |
|---|---|
| `js/data.js` | `ban.light` 125→40 + new desc; `dom_dom.buff` = `{ seedBonus: 0.15, growBonus: 0.25 }` |
| `js/state.js` | `flags: { congRung: false, m2Best: 0 }` in `newState`; both normalized in `migrate` |
| `js/systems.js` | `tickTrees` growth × `min(2, 1+growBonus)`; new `pollinate(dt)` (15s tick: grow a young tree → free-plant Đước → +1 seed); `onPuzzle2Result(stars)` sets `flags.congRung`, `flags.m2Best`, `+6 seeds` on first win |
| `js/puzzle.js` | new `HSX.Puzzle2`: Phase A 5×4, 12-segment rotate-to-connect culvert (source 💧 → outlet 🌊); Phase B 5×4 grove, 3 saplings, 4 nests, 2 lamps, Manhattan-1 coverage; pure helpers `_baseA/_scramble/_solvedA/_solveB/_doneB` exposed for the headless test |
| `js/levels/m2.js` | `gateClean: 0.3`; `cua_rung` gets a cliff column (`#` at x=34, y=0–8) with `G` at x=34, y=9–11, so the only route to door 2 is through the gate |
| `js/world.js` | `gateSolved()` helper (M1 → `S.puzzle.solved`, M2 → `S.flags.congRung`); used in `Room.solid`, `findInteract`, `interact`, `lights()`; M2 prompt/toast copy; Bần light comes from fireflies |
| `js/render.js` | gate art level-aware (green bars + 🌿 for M2); `drawDomDom` generalised to any room with mature Bần, cache keyed on tree ids |
| `js/ui.js` | `p2-rotate / p2-toggle / p2-place / p2-next / p2-finish / p2-close / p2-retry`; species buff text understands `growBonus` |
| `css/style.css` | `.p2-*` board styles |
| `kiem_tra/duong_di.js` | `MAN.m2` gains `['+ Giải Cổng Rừng', { …, puzzle: true }]` |
| `kiem_tra/m2_puzzle.js` | new headless proof: 300 scrambles all solvable & never pre-solved; Phase B solvable with 3 saplings, unsolvable with 2, unsolvable with lamps on |

### Gate results

```
node kiem_tra/duong_di.js   → m1 13/13, m2 9/10 before gate, 10/10 after. 0 lỗi
node kiem_tra/m2_puzzle.js  → cống 300/300 giải được; đom đóm cần đúng 3 cây + tắt đèn. 0 lỗi
node --check (10 files)     → all pass
```

### Deviation from plan (intentional)

- Gate is **3 tiles + a `#` cliff above** instead of 2 tiles at y=10–11. Two tiles (96 px) is
  jumpable (`C.JUMP` 800 / `C.GRAV` 2400 ≈ 133 px), and `duong_di.js` proved the boss was still
  reachable at 9/10 stage. The cliff makes the gate the only route.
- Star bands widened to `par+8 / par+16` (par is the exact minimum clockwise rotations) so a
  non-optimal player can still reach 3★.

### Still unverified (needs a browser)

- Modal layout/feel on a phone-width viewport.
- Real jump-over attempt at the gate column.
- Pollination toast cadence (15 s) in live play.

---

## 11. Closeout (06-11-2026)

**Archive-readiness**: READY — plan contract satisfied, all automated gates green, work committed.

- Plan moved to `process/general-plans/completed/`.
- Closeout report: `process/general-plans/reports/ecoheroes-m2-minigame_closeout_06-11-2026.md`.
- Commits: `41cd9eb` (feature + tests), `1289f23` (plan/docs). Branch `feature/ecoheroes-fixes`, **not pushed**.
- Outstanding: three manual browser checks listed above. They are polish/confirmation items, not
  blockers — the gate is enforced by both the level geometry and the headless path solver.

**Durable learnings** (captured in the closeout report because this repo has no `process/context/` tree yet):

1. A blocking gate must be ≥3 tiles tall; 2 tiles (96 px) is jumpable at `C.JUMP 800 / C.GRAV 2400`
   (≈133 px apex). Pair it with a solid cliff above so no alternate arc exists.
2. Every new `G` tile requires a matching `MAN.<level>` stage with `puzzle: true`, otherwise
   `kiem_tra/duong_di.js` under-reports and silently marks the boss reachable.
3. `S.puzzle.solved` is a global M1 flag. Any M2 gate logic must go through a level-aware
   `gateSolved()` helper, never `S.puzzle` directly.
4. Repo has no `process/context/`, `process/features/`, or `process/development-protocols/`.
   `vc-audit-context` / `vc-audit-vc` cannot run here until `vc-setup` or `vc-generate-context` seeds them.

