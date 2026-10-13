# Exploration: plan-cancel-and-search-hardening

Issues: #7 (cancel a plan), #8 (search plans and filter by state/due date). Verified 2026-10-12 on branch `Moises` (master + ERICK2 merged). Condensed copy of Engram `sdd/plan-cancel-and-search-hardening/explore`.

## A. Verified findings

### #7 Cancel a plan
- `planState.ts:38-45` `confirmPlan` and `:48-55` `cancelPlan` are correct.
- `plans.service.ts:248-279` cancel is correct; `estado` is persisted as a string (`schema.prisma:28`, no enum).
- `routes/plans.ts:161-164` confirm maps ANY `InvalidTransitionError` to 409 "El plan ya está confirmado". Bug for cancelled plans; `InvalidTransitionError.from` is available to discriminate.
- `plans.service.ts:62-71` JSDoc is stale (cancel says "confirmed only"; confirm omits cancelled).
- `PlanCard.tsx:119-127, 202-218`: a cancelled plan owner loses Editar/confirm/cancel with no explanation; guests only see "Solo lectura" (`:219-223`).
- `ConfirmDialog` stays open while pending (OK), but `run()` closes it in `finally` even on failure and the error renders at page top.
- Missing tests: `planState` confirm-on-`cancelado` throws; `plans.test.ts` guest cancel -> 403 (guest tests at 637-688 cover confirm/delete/edit only) and confirm-cancelled -> 409; PlanCard explanatory note.
- `plans.test.ts` uses mocked Prisma plus an in-memory `PlansStore` fake (lines 26-151); a real Prisma `where` is never exercised.
- Main spec `plan-state-machine/spec.md:5,10` still says two states; `plans/spec.md` lacks cancel/edit/filter/title requirements (they live in unarchived changes `plan-lifecycle`, `add-plan-filters-and-search`, `add-plan-title`).

### #8 Search and filter
- `GET /api/plans` accepts no params (`routes/plans.ts:60-67`).
- Store list: OR owned/member, `orderBy dueDate, createdAt` (`plans.service.ts:81-102`).
- Indexes: `Plan @@index([userId, dueDate])`, `PlanMember` unique(planId, userId) + index(userId). No `estado`/`titulo` index.
- No query zod schema (`schemas.ts:44-58`); client `listPlans()` takes no args (`client.ts:85`).
- `usePlans` fetches once on mount (`usePlans.ts:35-53`); mutations patch local state.
- `filterPlans` is client-side (`planFilters.ts:27-66`): today / next7 (0..7 inclusive) / next30 / overdue, combined with AND.
- `daysUntil` compares the local calendar day with a UTC-midnight `dueDate` (`plans.ts:26-29`).
- `PlanFiltersBar.tsx:35-187`: search, two selects, chips with X, reset, count.
- `MyPlansPage`: filters in `useState` (lost on reload, `:38-42`); stats nextPlan/overdue computed from unfiltered plans including cancelled (`:110-111`); empty state at `:182`.
- `planFilters.ts:58-60` overdue includes cancelled; the `planFilters.test.ts` overdue test relies on cancelled plan #4.
- Seed creates users only (no plans). "borrador" is used everywhere; the issues say "pendiente". `react-router-dom ^7` available (`useSearchParams`).

## B. Recommendation: hybrid, server-authoritative filtering
- Performance is not the driver (<= 0.7 KB per plan, class-project volumes).
- Drivers: review criterion "interface -> query -> DB, resolved with DB data"; AGENTS.md layering (route validates with zod, service owns Prisma); testability; future pagination.
- Design: `GET /api/plans?q&estado&fecha&today` (zod `planListQuerySchema`); `PlansStore.list(userId, filter?)` builds `where` through a pure exported `buildPlanWhere`; the client sends its local calendar date as `today=YYYY-MM-DD`; the server never uses `new Date()` for range maths.
- Ranges on `@db.Date`: today -> [t, t]; next7 -> [t, t+7]; next30 -> [t, t+30]; overdue -> < t. Date filters exclude `cancelado` unless `estado=cancelado`.
- Response `{ plans, summary: { total, overdue, nextDueDate } }` computed over the unfiltered scope (stats exclude cancelled). Alternative: a second unfiltered request.
- URL query string via `useSearchParams` as source of truth; ~300 ms debounce on `q`; abort/sequence guard; keep previous list with `aria-busy` (split initial load vs refresh); sanitize unknown URL params; no mandatory migration or index.

## C. UI failure scenarios (17)
1. Empty state keyed on `plans.length` is wrong once filtering is server-side.
2. Stat cards mismatch filtered results.
3. Cancelled plans counted as overdue / next plan.
4. Full-page loading unmounts the search input while typing.
5. Out-of-order responses overwrite newer results.
6. Filters lost on reload.
7. Card stays visible after cancel/confirm/delete under an active filter.
8. Cancelled card shows "Venció hace N días".
9. Blocked actions unexplained for a cancelled plan owner.
10. Blocked actions unexplained for guests.
11. Mobile filter bar and chips overflow.
12. 14 px chip remove targets.
13. Result count is not `aria-live`.
14. Focus lost after removing a chip.
15. `aria-label` does not contain the visible label (label-in-name).
16. "Borrador" vs "pendiente" wording; `run()` closes the dialog on failure and shows the error at page top; filter API failure handling; local-midnight vs server-UTC mismatch.
17. Hand-edited URL params must not break the page.

## D. Side effects
Routes (query parse, confirm 409 discrimination via `error.from`); service (optional `list` filter param, `buildPlanWhere`, JSDoc); schemas (query schema); `client.listPlans(params)`; `usePlans` refactor (breaks `MyPlansPage.test.tsx:254` and the `planFilters.test` overdue assertion); PlanCard / PlanList / PlanFiltersBar changes; >= 4 tests per test file; spec deltas for `plan-state-machine` and `plans`; archive stale changes.

## E. Product questions (defaults, later confirmed by the user)
Borrador -> Pendiente UI-only (SUPERSEDED: user decided a full rename of the state value `borrador` -> `pendiente` everywhere, see proposal/design); cancelled excluded from "Próximo plan"/"Vencidos", included in "Planes" total; date filters never return cancelled unless `estado=cancelado`; next7 inclusive 0..7; cancelled read-only with explanation; cancelled deletable; seed demo plans; keep "Hoy" and "Próximos 30 días"; no accent-insensitive search.

## F. Suggested slices (< 400 lines each)
| # | Slice | Est. lines |
|---|-------|-----------|
| 1 | `fix(plans)`: confirm-cancelled 409 + tests | ~100 |
| 2 | `feat(plans-ui)`: blocked-action explanations | ~150 |
| 3 | `fix(plans)`: stats/date filters exclude cancelled | ~120 |
| 4 | `feat(plans-api)`: filter query | ~300 |
| 5 | `feat(plans-ui)`: `usePlans` + URL state | ~300 |
| 6 | `feat(plans-ui)`: a11y, empty states, "Pendiente" label | ~200 |
| 7 | `docs(openspec)` / `chore(seed)` | ~200 |

Slices 1-3 are independent. Slices 4 and 5 land together, or 4 ships with optional params first.
