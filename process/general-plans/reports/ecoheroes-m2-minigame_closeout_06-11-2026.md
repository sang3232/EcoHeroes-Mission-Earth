# Closeout: EcoHeroes Màn 2 — Cổng Rừng Mini-game & Đom Đóm Thụ Phấn

**Date**: 2026-11-06
**Branch**: `feature/ecoheroes-fixes`
**Plan**: `process/general-plans/completed/ecoheroes-m2-minigame_PLAN_06-11-2026.md`

---

## Summary

Delivered the required Map 2 gate mini-game ("Cổng Rừng"): a two-phase puzzle
(water-flow culvert → firefly light-vs-darkness placement) that blocks the only route to
`hang_luoi`. Also upgraded Bần from a cosmetic +15% seed bonus into a real economy loop via
firefly pollination, and made the whole gate/state layer level-aware so M1 is untouched.

---

## Changes Made

| File | Change |
|---|---|
| `js/data.js` | `ban.light` 125→40 (glow now comes from fireflies); `dom_dom.buff` = `{ seedBonus: 0.15, growBonus: 0.25 }` |
| `js/state.js` | New persisted `flags: { congRung: false, m2Best: 0 }`; both normalized in `migrate` |
| `js/systems.js` | `tickTrees` growth multiplier `min(2, 1 + growBonus)`; `pollinate(dt)` 15 s tick (grow a young tree → free-plant Đước → +1 seed); `onPuzzle2Result(stars)` sets flags + grants `+6` seeds on first win |
| `js/puzzle.js` | New `HSX.Puzzle2`: Phase A (5×4 rotate-to-connect culvert, 12 segments) and Phase B (5×4 grove, 3 saplings, 4 nests, 2 lamps, Manhattan-1 coverage); pure helpers exposed for headless testing |
| `js/levels/m2.js` | `gateClean: 0.3`; `cua_rung` cliff column (`#` x=34, y=0–8) with `G` at x=34, y=9–11 |
| `js/world.js` | `gateSolved()` level-aware helper used by `Room.solid`, `findInteract`, `interact`, `lights()`; M2 prompt/toast copy; Bần light driven by fireflies |
| `js/render.js` | Level-aware gate art (green bars + 🌿 for M2); `drawDomDom` generalised to any room with mature Bần, cache keyed on tree ids |
| `js/ui.js` | `p2-rotate / p2-toggle / p2-place / p2-next / p2-finish / p2-close / p2-retry`; species buff text understands `growBonus` |
| `css/style.css` | `.p2-*` board styles |
| `kiem_tra/duong_di.js` | `MAN.m2` gains the `+ Giải Cổng Rừng` puzzle stage |
| `kiem_tra/m2_puzzle.js` | New headless solvability proof for both phases |

---

## Verification

| Test | Result |
|------|--------|
| `node --check` on 10 changed/added files | PASS |
| `node kiem_tra/duong_di.js` | PASS — m1 13/13, m2 10/10, 0 lỗi |
| `node kiem_tra/m2_puzzle.js` | PASS — 300/300 culvert scrambles solvable (par 13–26); firefly board solvable with exactly 3 saplings and lamps off, unsolvable otherwise |
| Headless state-machine sim | open → solve Phase A → Phase B → finish → retry, star scoring, lamp gating |

Regression guard: M1's gate/sorting flow still resolves through `gateSolved()` → `S.puzzle.solved`,
and the M1 path solver remains 13/13.

---

## Deviation From Plan (intentional)

- Gate is **3 tiles plus a `#` cliff above**, not the planned 2 tiles at y=10–11. Two tiles
  (96 px) is jumpable at `C.JUMP 800 / C.GRAV 2400` (≈133 px apex), and `duong_di.js` proved the
  boss was still reachable (9/10). The cliff makes the gate the only route.
- Star bands widened to `par+8 / par+16` so non-optimal players can still reach 3★.

---

## Git Status

**Committed:**

```
41cd9eb feat(m2): Cổng Rừng mini-game và đom đóm thụ phấn cho bần   (11 files, +493/−31)
1289f23 docs(plan): kế hoạch và nhật ký EXECUTE Cổng Rừng Màn 2     (1 file, +348)
```

Worktree clean. Branch `feature/ecoheroes-fixes` is **2 commits ahead of origin and unpushed**.

---

## Classification

**Archive-readiness**: READY — contract satisfied, automated gates green, changes committed.

**Drift signals**: 2 (feature files touched + 3 memory-worthy observations; no `.claude/`,
`.codex/`, `README.md`, `AGENTS.md`, or protocol files changed) → **MEDIUM** → UPDATE PROCESS
recommended and applied via this closeout.

---

## Remaining / Unverified

Manual browser checks (polish, not blockers):

1. Modal layout/feel at phone width.
2. A real in-game jump attempt at the gate column (geometry and solver both say it is blocked).
3. Pollination toast cadence (15 s) during live play.

---

## Process Notes (honest state of the harness)

This repository has **no** `process/context/`, `process/features/`, or
`process/development-protocols/` tree — only `process/general-plans/{active,completed,reports}`.
As a result:

- `vc-audit-context` and `vc-audit-vc` are **not runnable** here (nothing to audit / no agent tree).
- Durable learnings were captured in the plan §11 and this report instead of a context group.
- Recommended follow-up: run `vc-setup` (or `vc-generate-context`) to seed
  `process/context/all-context.md` before the next feature, so future agents get real routing.

Plan audit result: the active inventory is now empty; `completed/` holds the two finished
plan artifacts (`ecoheroes-fixes` goal block, this plan). No stale active plans remain.

---

## Next State

**No immediate follow-up required.** Suggested next:

1. Push the branch / open a PR when ready.
2. Run the three manual browser checks above.
3. Seed repo context with `vc-setup` before starting the next feature area.

---

**Closeout complete.** Plan moved to `process/general-plans/completed/`.
