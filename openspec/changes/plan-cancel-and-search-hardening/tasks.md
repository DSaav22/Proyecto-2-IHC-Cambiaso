# Tasks: Plan Cancel and Search Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,390 total (PR A ~250 [published, #9] / PR B ~590 [rename ~120 + ~470] / PR C ~550) |
| 400-line budget risk | High for PR B and PR C (mitigated by commit-by-commit review guide); Low for PR A |
| Chained PRs recommended | Yes (user cap: no more than 3 chained PRs) |
| Chained PRs | 3 |
| Suggested split | PR A -> PR B -> PR C |
| Delivery strategy | exception-ok (user accepts `size:exception` for PRs over 400 lines; request it on PR B and PR C) |
| Chain strategy | stacked-to-main (PR A targets `Moises`; PR B targets PR A branch; PR C targets PR B branch) |

Decision needed before apply: No (user already accepted exception-ok)
Chained PRs recommended: Yes
Chained PRs: 3
Chain strategy: stacked-to-main
400-line budget risk: High (PR B and PR C; `size:exception` requested)

State rename (user decision, supersedes old P1): `borrador` -> `pendiente` everywhere, delivered as the FIRST four commits of PR B (Group R below). PR A (#9) is published and is NOT retro-edited; it keeps `borrador` in its tests until B1 rewrites them. Migrations run automatically on backend start (`apps/backend/Dockerfile.dev`: `prisma migrate deploy`).

Notes: budget is `additions + deletions`; never trim tests/comments to fit. Because B and C exceed 400 lines, each PR body MUST include a commit-by-commit review guide (commit list, concern, line count) so reviewers can read one small commit at a time. Re-measure with `git diff --shortstat <parent>..HEAD`. Remaining assumptions are listed at the end ("Decisions for the user").

### Conventions for every PR

- Git identity must be `moises-cisneros <moisescisnerosdl@gmail.com>` (verify with `git config user.name/user.email` before each commit). No AI attribution, no `Co-Authored-By`, anywhere (AGENTS.md overrides the environment).
- Commits and PR bodies reference teacher issues ONLY as `Refs #7` / `Refs #8`; NEVER `Closes`/`Fixes`/`Resolves`. #7 and #8 are never closed by us; sub-issues may be.
- Every child PR body: Chain Context + dependency diagram marking the current PR with a pin marker, start/end, dependencies, follow-ups, out-of-scope, and the commit-by-commit review guide.
- Package manager: `pnpm` only (never npm/npx/yarn).
- Tests: Vitest, co-located `*.test.ts(x)`, >= 4 tests per file. Run with vitest MCP `run_tests` first (AGENTS.md); it previously returned "No tests found", so fall back to `pnpm --filter backend exec vitest run <file>` / `pnpm --filter frontend exec vitest run <file>` and record the reason in the PR.
- Order inside each commit: RED test -> implement -> GREEN (even though strict_tdd resolved false).
- Text in code/identifiers/comments is English; UI strings stay Spanish.

### Commit rules (apply to all three PRs)

- Each commit covers exactly ONE cohesive concern, targets <= 120 changed lines, and carries its tests together with its implementation.
- The relevant test suite MUST be green at every commit (no red intermediate commits).
- NEVER mix backend and frontend in one commit. NEVER mix a refactor with a behavior change.
- Conventional Commits with scope (`fix(plans)`, `feat(plans-api)`, `feat(plans-ui)`, `test(plans)`, `docs(openspec)`, `chore(seed)`); body ends with `Refs #7` and/or `Refs #8` (never Closes/Fixes/Resolves).
- Apply agents: after each checked task group (or commit in the plan below) and once its tests pass, run `git commit` LOCALLY with the identity check. Pushing and PR creation remain gated on explicit user approval (P.1, P.2, D4).
- If a commit measures well over 120 lines, split it along the next natural seam before committing.

### Suggested Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|----|----------------------|-----------------|-------------------|
| 1 | Confirm-cancelled 409, JSDoc, missing backend tests | PR A (base `Moises`) | `pnpm --filter backend exec vitest run src/routes/plans.test.ts src/lib/planState.test.ts` | `POST /api/plans/:id/confirm` on cancelled plan returns 409 text | revert PR A commits 1-4 (backend only) |
| 2 | Card notes, cancelled badge, dialog inline error | PR A | `pnpm --filter frontend exec vitest run src/components/domain/PlanCard.test.tsx src/components/domain/ConfirmDialog.test.tsx` | cancel a plan in browser; cancel with API down | revert PR A commits 5-7 (UI components) |
| 0 | State rename `borrador` -> `pendiente` (backend, DB migration, frontend, docs) | PR B (first 4 commits) | `pnpm --filter backend exec vitest run` then `pnpm --filter frontend exec vitest run` | docker compose PostgreSQL: row created as `borrador` becomes `pendiente` after migrate; rollback SQL restores it | revert B1-B4 together + run rollback SQL (design) |
| 3 | Server query API + summary | PR B (base PR A) | `pnpm --filter backend exec vitest run src/lib/schemas.test.ts src/services/plans.service.test.ts src/routes/plans.test.ts` | `curl "/api/plans?q=cena&estado=pendiente&fecha=next7&today=2026-06-15"` | revert PR B backend commits (params optional) |
| 4 | Client, hook, URL helpers, labels (no page change) | PR B | `pnpm --filter frontend exec vitest run src/lib src/hooks` | unit-level only; page still compiles | revert PR B frontend commits |
| 5 | Page: URL state, summary stats, filterPlans removal | PR C (base PR B) | `pnpm --filter frontend exec vitest run src/pages src/lib` | type in search, reload keeps filters (UI->API->DB) | revert PR C page commits; API stays compatible |
| 6 | Filters bar a11y, empty states | PR C | `pnpm --filter frontend exec vitest run src/components` | keyboard + 375 px viewport pass | revert PR C UI commits |
| 7 | Seeds, spec sync, DESIGN.md, e2e checklist | PR C | `pnpm --filter backend exec vitest run` (regression) | `pnpm --filter backend prisma db seed` twice | revert PR C seed/docs commits (seed additions idempotent) |

Note: the former interim client-side "exclude cancelled" slice is dropped; the stats-excluding-cancelled behavior now lands in PR B via `computePlanSummary` (satisfies PLN-04, PLN-05, PLN-19, SM-06).

---

# PR A: `fix/plan-cancel-flow` (base `Moises`, ~250 lines, `Refs #7`)

Dependencies: none | Forecast: Chained PRs: 3 | 400-line risk: Low | Decision needed before apply: No

## Group 1: Confirm-cancelled 409 and backend tests

- [x] 1.1 RED: in `apps/backend/src/lib/planState.test.ts` add test: confirming a `cancelado` plan throws `InvalidTransitionError` with `from === "cancelado"` (SM-02, SM-07; #7.3, #7.8). Ensure file has >= 4 tests.
- [x] 1.2 RED: in `apps/backend/src/routes/plans.test.ts` add tests: confirm on cancelled -> 409 `{ message: "Un plan cancelado no puede confirmarse" }`; confirm on confirmed -> 409 "El plan ya está confirmado"; guest `POST /:id/cancel` -> 403; guest confirm -> 403 (SM-02, SM-03; #7.2, #7.3, #7.4, #7.8).
- [x] 1.3 Implement in `apps/backend/src/routes/plans.ts`: discriminate `InvalidTransitionError.from` in the confirm handler (cancel handler message unchanged) (SM-02; #7.3).
- [x] 1.4 Fix JSDoc of `confirm`, `cancel`, `update` in `apps/backend/src/services/plans.service.ts` per design wording (SM-02, SM-03; #7.1).
- [x] 1.5 Confirm `confirmPlan` on cancelled in the service-level/route fake is covered; run `pnpm --filter backend exec vitest run src/lib/planState.test.ts src/routes/plans.test.ts` (and MCP `run_tests`), all green.

## Group 2: Card notes, cancelled badge, dialog inline error

- [x] 2.1 RED: `apps/frontend/src/components/domain/ConfirmDialog.test.tsx` — `error` prop renders `role="alert"`; absent when null/undefined; cleared on reopen; accept disabled while pending (PLN-14; #7.5). >= 4 tests.
- [x] 2.2 RED: `apps/frontend/src/components/domain/PlanCard.test.tsx` — owner+cancelled `role="note"` "Este plan está cancelado: no se puede editar ni confirmar. Puedes eliminarlo desde «Más acciones»."; guest note "Solo lectura: solo el creador puede editar, confirmar o cancelar este plan."; no note on active owner card; no "Venció hace" when cancelled but present for pending past plan; cancel failure keeps dialog open with alert (PLN-14..17; #7.5, #7.6).
- [x] 2.3 Add `error?: string | null` prop and `<p role="alert" className="text-sm text-destructive">` to `apps/frontend/src/components/domain/ConfirmDialog.tsx` (PLN-14; #7.5).
- [x] 2.4 Update `apps/frontend/src/components/domain/PlanCard.tsx`: notes, hide due badge when cancelled, callbacks `(id) => Promise<{ ok: true } | { ok: false; message: string }>`, `run()` closes only on `ok`, stores `actionError` for the dialog (PLN-14..17; #7.5, #7.6).
- [x] 2.5 Adapt `apps/frontend/src/components/domain/PlanList.tsx` and `apps/frontend/src/pages/MyPlansPage.tsx` handlers to return the hook result (`apps/frontend/src/hooks/usePlans.ts` result type stays); keep `PlanList.test.tsx` passing.
- [x] 2.6 Run `pnpm --filter frontend exec vitest run src/components/domain` green.

## Commit plan (PR A, 7 commits, all `Refs #7`)

| # | Commit message | Tasks | Est. lines |
|---|----------------|-------|-----------|
| A1 | `test(plans): cover confirm on cancelled plan in planState` | 1.1 | ~25 |
| A2 | `fix(plans): return distinct 409 when confirming a cancelled plan` | 1.2 (confirm-cancelled + confirm-confirmed tests), 1.3 | ~60 |
| A3 | `test(plans): cover guest cancel and confirm rejections` | 1.2 (guest 403 tests), 1.5 | ~40 |
| A4 | `docs(plans): correct JSDoc of confirm, cancel and update store methods` | 1.4 | ~20 |
| A5 | `feat(plans-ui): show inline error in ConfirmDialog` | 2.1, 2.3 | ~50 |
| A6 | `feat(plans-ui): keep cancel dialog open on failure` | 2.2 (failure test), 2.4 (callback result + `run()` + `actionError`), 2.5 | ~90 |
| A7 | `feat(plans-ui): explain blocked actions on PlanCard` | 2.2 (note + overdue tests), 2.4 (notes, hide overdue wording when cancelled), 2.6 | ~90 |

Each commit body ends with `Refs #7`. Backend commits (A1-A4) and frontend commits (A5-A7) are never mixed.

---

# PR B: `feat/plans-search-data-layer` (base PR A branch, ~590 lines, `Refs #8`)

Dependencies: PR A (stack order; route file) | Forecast: 400-line risk: High, `size:exception` requested, commit-by-commit review guide required | Decision needed before apply: No

## Group R: State rename `borrador` -> `pendiente` (executes FIRST in PR B, commits B1-B4)

Never edit the applied migration `apps/backend/prisma/migrations/20261006120000_plan_state_machine/migration.sql`. `docs/project-card.md` stays untouched. No API alias.

- [x] R.1 RED then implement (backend, commit B1): rename `borrador` -> `pendiente` in `apps/backend/src/lib/planState.ts` (`PLAN_STATES`), `apps/backend/src/services/plans.service.ts` (incl. JSDoc), `apps/backend/src/lib/planState.test.ts`, `apps/backend/src/lib/schemas.test.ts`, `apps/backend/src/routes/plans.test.ts`; add a test that the zod enum rejects `borrador` with 400 and accepts `pendiente` (SM-01, SM-08). Run `pnpm --filter backend exec vitest run` green.
- [x] R.2 Create `apps/backend/prisma/migrations/<timestamp>_rename_plan_state_pendiente/migration.sql` (timestamp after `20261011142500_add_plan_title`) with `UPDATE "Plan" SET "estado"='pendiente' WHERE "estado"='borrador';` and `ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'pendiente';` (commit B2; SM-08).
- [x] R.3 Set `estado String @default("pendiente")` in `apps/backend/prisma/schema.prisma` line 28; update state expectations in `apps/backend/prisma/seed.ts` if any (commit B2).
- [x] R.4 Frontend rename (commit B3): `apps/frontend/src/api/client.ts` types, `apps/frontend/src/components/domain/PlanCard.tsx`, `apps/frontend/src/components/domain/PlanFiltersBar.tsx` (option value `pendiente`, label "Pendiente"), and tests `PlanCard.test.tsx`, `PlanFiltersBar` fixtures, `ConfirmDialog.test.tsx`, `PlanList.test.tsx`, `apps/frontend/src/hooks/usePlans.test.tsx`, `apps/frontend/src/pages/MyPlansPage.test.tsx`, `apps/frontend/src/lib/planFilters.test.ts`; label text "Borrador" -> "Pendiente". Run `pnpm --filter frontend exec vitest run` green (SM-01, PLN-03).
- [x] R.5 Docs rename (commit B4): `README.md`, `apps/frontend/DESIGN.md` (state row), `docs/task-02-state-tests.md`. Do not touch `docs/project-card.md` or `openspec/specs/` (synced in C11).
- [x] R.6 Verify migration against real PostgreSQL (`docker compose`, DB service): with pre-migration code create a plan (state `borrador`), apply `pnpm --filter backend prisma migrate deploy`, confirm the row is `pendiente` and a new plan defaults to `pendiente`; run the rollback SQL from the design and confirm the inverse. Record results in the PR body (SM-08 scenarios).
- [x] R.7 Final check: `rg "borrador" apps README.md docs` shows only the new migration, the old applied migration, `docs/project-card.md` (untouched), the rejection test, and historical notes.

## Group 3: Server-side query API and summary

- [x] 3.1 RED: `apps/backend/src/lib/schemas.test.ts` — `planListQuerySchema`: trims/empties `q`; `q` > 100 rejected; bad `estado`/`fecha` rejected; `today=2026-02-30` rejected; array `q` rejected; unknown keys stripped (PLN-01; #8.1).
- [x] 3.2 Export `isRealCalendarDate`; add `PLAN_DATE_FILTERS`, `PlanDateFilter`, `planListQuerySchema` in `apps/backend/src/lib/schemas.ts` (PLN-01).
- [x] 3.3 RED: create `apps/backend/src/services/plans.service.test.ts` — `buildPlanWhere`: scope first in `AND`; `q` -> `contains` insensitive on `titulo` only; each `fecha` range at day 0/7/8/yesterday with `toUtcDate("2026-06-15")`; cancelled excluded when `fecha` without `estado`, included with `estado=cancelado`; guest scope present. `computePlanSummary`: total counts cancelled; overdue/nextDueDate exclude cancelled; null when none; with-results and empty cases (PLN-02..06, PLN-18, PLN-19; #7.6, #8.2-#8.4, #8.9). Carries the migrated overdue/next7 boundary semantics of the former client `filterPlans` tests.
- [x] 3.4 Implement in `apps/backend/src/services/plans.service.ts`: `PlanListFilter`, `PlanSummary`, `toUtcDate`, `buildPlanWhere`, `computePlanSummary`; extend `PlansStore.list(userId, filter?, todayUtc?)`; add `PlansStore.summary(userId, todayUtc)` (one `findMany` select `dueDate, estado`); keep order `dueDate asc, createdAt asc` (PLN-01, PLN-06, PLN-07; #8.8).
- [x] 3.5 RED: `apps/backend/src/routes/plans.test.ts` — 400 with `errors` and "Parámetros de búsqueda inválidos"; filter + `todayUtc` forwarded to fake `list`; response `{ plans, summary }` with `nextDueDate` as `YYYY-MM-DD`/null; missing `today` uses server UTC date; no params unchanged (PLN-01, PLN-06; #8.8). Note: PUT on cancelled -> 409 test (PLN-16) is added here pending user decision D1.
- [x] 3.6 Update `GET /` in `apps/backend/src/routes/plans.ts`: `safeParse(req.query)`, `Promise.all([store.list, store.summary])`, serialize summary.
- [x] 3.7 Update fake stores: add `summary` and arg-recording `list` in `apps/backend/src/routes/plans.test.ts` and `apps/backend/src/routes/auth.recover.test.ts` (compile and keep green).
- [x] 3.8 During apply verify Prisma `contains` with `%` and `_` against real PostgreSQL (`docker compose` DB + seeded plan titled with literal `%`) per PLN-02 literal wildcard; if not literal, escape `\`, `%`, `_` in `buildPlanWhere` and add a test; record result in PR.
- [x] 3.9 Run `pnpm --filter backend exec vitest run` green.

## Group 4: Client API, hook, URL helpers, labels (no page change)

Compatibility rule: `usePlans(criteria)` defaults `criteria` to empty and `filterPlans` stays (deprecated) until task 5.3, so `MyPlansPage` keeps compiling and its tests stay green after every commit in this group (only the `listPlans` mock return shape gains `summary`).

- [x] 4.1 RED: `apps/frontend/src/lib/planFilters.test.ts` — `parsePlanFilters` drops unknown `estado`/`fecha`, caps `q` at 100; `serializePlanFilters` omits defaults; round-trip; `toPlanListParams` includes `today=2026-06-15` using `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime(new Date(2026, 5, 15, 23, 30))`; `localToday` local date (PLN-04, PLN-08, PLN-18; #8.3, #8.6, #8.9).
- [x] 4.2 Add `localToday`, `PLAN_STATUS_LABELS` (display capitalization only: `pendiente` -> "Pendiente", `confirmado` -> "Confirmado", `cancelado` -> "Cancelado"); make `daysUntil` reuse `localToday` in `apps/frontend/src/lib/plans.ts` (single label mapping).
- [x] 4.3 Extend `apps/frontend/src/lib/planFilters.ts`: add `DATE_FILTER_LABELS`, `parsePlanFilters`, `serializePlanFilters`, `toPlanListParams`; keep `filterPlans` (marked deprecated, removed in 5.3).
- [x] 4.4 Update `apps/frontend/src/api/client.ts`: `PlanDateFilter`, `PlanListParams`, `PlanSummary`, `PlansResponse`, `listPlans(params = {}, signal?)` via `URLSearchParams` (omit empty); `request` rethrows when `init.signal?.aborted` instead of mapping AbortError to `ApiError(0)` (PLN-01, PLN-07, PLN-12; #8.8).
- [x] 4.5 RED: create `apps/frontend/src/hooks/useDebouncedValue.test.ts` (>= 4 tests with fake timers: initial value, delayed update, rapid changes collapse, cleanup) then create `apps/frontend/src/hooks/useDebouncedValue.ts` (default 300 ms) (PLN-12).
- [x] 4.6 RED: `apps/frontend/src/hooks/usePlans.test.tsx` — only `q` is debounced, estado/fecha immediate; 5 keystrokes -> one request; stale response ignored (abort + requestId); `loading` first load vs `refreshing`; error keeps previous plans/summary and `reload()` retries; mutation patches from response then refetches; rewrite the old "without refetching" test; mocks return `summary` (PLN-12, PLN-13; #8.8).
- [x] 4.7 Rewrite `apps/frontend/src/hooks/usePlans.ts` as `usePlans(criteria)` returning `{ plans, summary, loading, refreshing, loadError, reload, addPlan, joinPlan, updatePlan, confirmPlan, cancelPlan, deletePlan }` per design.
- [x] 4.8 Run `pnpm --filter frontend exec vitest run` (full, page tests included) green.

## Commit plan (PR B, 14 commits, all `Refs #8`; rename first)

| # | Commit message | Tasks | Est. lines |
|---|----------------|-------|-----------|
| B1 | `feat(plans): rename plan state borrador to pendiente in backend` | R.1 | ~50 |
| B2 | `chore(db): migrate plan estado borrador to pendiente` | R.2, R.3, R.6 | ~20 |
| B3 | `refactor(plans-ui): rename plan state borrador to pendiente in frontend` | R.4 | ~40 |
| B4 | `docs(plans): rename borrador to pendiente in README, DESIGN and task docs` | R.5, R.7 | ~20 |
| B5 | `feat(plans-api): validate plan list query parameters` | 3.1, 3.2 | ~60 |
| B6 | `feat(plans-api): add buildPlanWhere and computePlanSummary` | 3.3, first half of 3.4 (pure functions only) | ~120 |
| B7 | `feat(plans-api): extend PlansStore with filtered list and summary` | 3.4 (store methods), 3.7 | ~50 |
| B8 | `feat(plans-api): serve filters and summary from GET /api/plans` | 3.5, 3.6 | ~70 |
| B9 | `test(plans): verify literal percent and underscore search against Prisma` | 3.8 (escape fix + test only if needed), 3.9 | ~20 |
| B10 | `feat(plans-ui): add plan state labels and local today helper` | 4.1 (localToday test), 4.2 | ~30 |
| B11 | `feat(plans-ui): add plan filter URL helpers` | 4.1 (parse/serialize/params tests), 4.3 | ~60 |
| B12 | `feat(plans-ui): add server-backed listPlans client with abort handling` | 4.4 | ~40 |
| B13 | `feat(plans-ui): add useDebouncedValue hook` | 4.5 | ~40 |
| B14 | `feat(plans-ui): drive usePlans from criteria with debounce and stale guard` | 4.6, 4.7, 4.8 | ~120 |

Suite green at every commit (B1: backend suite; B3: frontend suite; B2 and B4 keep both green). Backend commits (B1-B2, B5-B9) and frontend commits (B3, B10-B14) are never mixed; B4 is docs only. B9 may be an empty note-only commit omitted if no change is needed (record the verification result in the PR body instead).

---

# PR C: `feat/plans-search-ui` (base PR B branch, ~550 lines, `Refs #7` / `Refs #8`)

Dependencies: PR B | Forecast: 400-line risk: High, `size:exception` requested, commit-by-commit review guide required | Decision needed before apply: Yes for copy only (D2) and archive order (D3), both non-blocking: defaults used if unanswered

## Group 5: Page with URL state and summary stats

- [x] 5.1 RED: `apps/frontend/src/pages/MyPlansPage.test.tsx` — wrap ALL tests in `MemoryRouter` (`initialEntries` with `?estado=confirmado&fecha=next7`); mocks return `summary`; rewrite the test at ~L254: typing debounces (`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`) then `listPlans` called with `q`, server-empty shows no-match state; corrupted URL `?estado=zzz&fecha=next7`; stats from summary unchanged by filters; "Sin pendientes" placeholder; retry button on `loadError` (PLN-07, PLN-08, PLN-10, PLN-12, PLN-19; #7.7, #8.6-#8.8).
- [x] 5.2 Rewrite `apps/frontend/src/pages/MyPlansPage.tsx`: `useSearchParams`, `criteria = useMemo(parsePlanFilters)`, `setSearchParams(serialize, { replace: true })`, rewrite non-canonical URL once, stats "Planes" = `summary.total`, "Próximo plan" = `nextDueDate` label or "Sin pendientes", "Vencidos" = `summary.overdue`; `aria-busy={refreshing}`; filter bar never unmounts after first load; `loadError` inline with "Reintentar" (PLN-08, PLN-19).
- [x] 5.3 Remove `filterPlans` (and its old tests, including the overdue `["4"]` case; semantics already migrated to 3.3) from `apps/frontend/src/lib/planFilters.ts`; keep `PlanList.test.tsx` green.
- [x] 5.4 Run `pnpm --filter frontend exec vitest run` full green.

## Group 6: Filters bar accessibility, empty states

- [x] 6.1 RED: `apps/frontend/src/components/domain/PlanFiltersBar.test.tsx` — labels "Estado"/"Fecha límite" found by label; count "Mostrando N de M planes" in `role="status"`; chips with remove names containing the filter; focus moves to search input after removing last chip, to the control after removing one; `size-11` class; "Limpiar filtros" clears all (PLN-09, PLN-11; #8.6, #8.7).
- [x] 6.2 Update `apps/frontend/src/components/domain/PlanFiltersBar.tsx`: props `{ criteria, onChange, onReset, resultCount, totalCount }`, visible labels without conflicting `aria-label`, options from `PLAN_STATUS_LABELS`/`DATE_FILTER_LABELS`, refs for focus, 44 px chips, mobile `grid grid-cols-1 sm:grid-cols-2`, count `basis-full sm:ml-auto`.
- [x] 6.3 RED then implement in `apps/frontend/src/components/domain/PlanList.test.tsx`/`PlanList.tsx` and `apps/frontend/src/pages/MyPlansPage.tsx`: `summary.total === 0` -> "Todavía no tienes planes" (filter bar hidden); `total > 0 && plans.length === 0` -> no-match message + "Limpiar filtros" (PLN-10; #8.7). Keep >= 4 tests per file.
- [x] 6.4 In `apps/frontend/src/components/domain/PlanCard.tsx` use `PLAN_STATUS_LABELS` for badge text and add/keep a test that the cancelled badge "Cancelado" has text + icon (MODIFIED card requirement; #8.5). The "Pendiente" label itself is already delivered by the rename (R.4); no special mapping remains.
- [ ] 6.5 Manual a11y check (keyboard-only, 375 px viewport); run `pnpm --filter frontend exec vitest run src/components`.

## Group 7: Seeds, spec sync, docs, final verification

- [x] 7.1 Implement `seedDemoPlans()` in `apps/backend/prisma/seed.ts` after users, production refusal first: `PLZ-SEED2A`..`PLZ-SEED2F` via `upsert` with `update: {}` (create-only); usuario1: pendiente +3, confirmado +10, confirmado today, pendiente -2, cancelado -5; usuario2: pendiente +20 joined by usuario1 via `planMember.upsert({ where: { planId_userId }, update: {} })`; distinct titles for search (SEED-01..03; #8.8). No co-located test pattern for seeds.
- [x] 7.2 Verify seeds: `pnpm --filter backend prisma db seed` twice (no duplicates, no error), `NODE_ENV=production` refuses; fresh reseed via `docker compose down -v` then `pnpm dev` (SEED-02, SEED-03). Done on a throwaway database `planazo_seedtest` (dropped afterwards) instead of `docker compose down -v`, which was ruled out for safety.
- [x] 7.3 Add `cancelado` row to `apps/frontend/DESIGN.md` (state badge/colors).
- [x] 7.4 Reconcile overlapping changes BEFORE syncing this one. Order chosen: (1) `plan-lifecycle`, (2) `add-plan-title`, (3) `add-plan-filters-and-search` (client-side filter requirements get MODIFIED by this change), (4) this change. Reason: our deltas were written against current main specs and PLN-02 depends on `titulo`; archiving the others first keeps `/opsx-sync` of ours a clean MODIFIED/ADDED merge. Executed here (last group of PR C) so earlier PRs stay code-focused; confirm with user (D3). Touch only `openspec/` files for this. DONE: `add-plan-title` synced and archived; `plan-lifecycle` and `add-plan-filters-and-search` archived on 2026-10-12 WITHOUT syncing (superseded, see `ARCHIVED-WITHOUT-SYNC.md` in each archived folder).
- [x] 7.5 `/opsx-sync` of `openspec/changes/plan-cancel-and-search-hardening/specs/*` into `openspec/specs/` (plans, plan-state-machine, test-user-seeding). The sync must also carry the `borrador` -> `pendiente` rename (SM-08) into main `openspec/specs/plan-state-machine/spec.md` and `openspec/specs/plans/spec.md` through MODIFIED deltas (every remaining `borrador` there is rewritten).
- [ ] 7.6 After verify passes: `/opsx-archive` for this change (no code edits; only checkboxes in this file are modified during apply).
- [x] 7.7 Run complete suites: `pnpm --filter backend exec vitest run` and `pnpm --filter frontend exec vitest run`; run typecheck/build if available via `pnpm --filter <workspace>`.
- [ ] 7.8 Manual end-to-end checklist (UI -> API -> DB, teacher review), login as usuario1:
  - [ ] a. `/mis-planes` lists seeded plans in 3 states; stats match (cancelled counts in "Planes" only).
  - [ ] b. Type in search: network shows one `GET /api/plans?q=...&today=...` after ~300 ms; result matches DB (`SELECT titulo FROM "Plan"`).
  - [ ] c. Filter Pendiente/Confirmado/Cancelado (URL carries `estado=pendiente`; `?estado=borrador` is ignored by the UI sanitizer and 400 on the API); cancelled appears only under "Cancelado" (and with no filters).
  - [ ] d. Date filters Hoy / Próximos 7 días / Próximos 30 días / Vencidos exclude cancelled.
  - [ ] e. Combined search + estado + fecha; chips removable; "Limpiar filtros".
  - [ ] f. Reload page: filters and results persist (URL `?q&estado&fecha`); corrupted URL does not 400.
  - [ ] g. No match shows "No hay planes que coincidan con los filtros"; count announced.
  - [ ] h. Cancel with dialog: dismiss = no request; accept = "Cancelado", reload keeps it; API failure keeps dialog open with error.
  - [ ] i. Cancelled card: note, no confirm/edit/cancel, no "Venció hace"; delete works. Guest card (usuario1 on usuario2's plan): read-only note; cancel via API -> 403.
  - [ ] j. Confirm cancelled via API -> 409 "Un plan cancelado no puede confirmarse".
  - [ ] k. 375 px viewport and keyboard-only pass.

## Commit plan (PR C, 11 commits; `Refs #8` unless noted)

| # | Commit message | Tasks | Est. lines |
|---|----------------|-------|-----------|
| C1 | `test(plans-ui): wrap MyPlansPage tests in MemoryRouter and mock summary` | 5.1 (test-only prep, no behavior change) | ~40 |
| C2 | `feat(plans-ui): drive MyPlans filters from the URL` | 5.1 (corrupted URL, debounce tests), 5.2 (`useSearchParams`, criteria, canonical URL) | ~90 |
| C3 | `feat(plans-ui): show MyPlans stats from server summary` | 5.1 (stats tests), 5.2 (summary stats, "Sin pendientes"); body also `Refs #7` | ~60 |
| C4 | `feat(plans-ui): add refreshing state and load error retry to MyPlans` | 5.1 (retry test), 5.2 (`aria-busy`, "Reintentar") | ~50 |
| C5 | `refactor(plans-ui): remove client-side filterPlans` | 5.3, 5.4 (no behavior change; refactor only) | ~70 (mostly deletions) |
| C6 | `feat(plans-ui): label filters and announce result count` | 6.1 (labels, count), 6.2 (props, labels, count) | ~90 |
| C7 | `feat(plans-ui): add removable chips with focus management and 44px targets` | 6.1 (chips, focus, size-11, reset), 6.2 (refs, chips, mobile grid) | ~100 |
| C8 | `feat(plans-ui): distinguish empty and no-match states` | 6.3 | ~70 |
| C9 | `chore(seed): add demo plans for seeded users` | 7.1, 7.2 | ~90 |
| C10 | `docs(plans-ui): add cancelado row to DESIGN.md` | 7.3 | ~15 |
| C11 | `docs(openspec): sync plan specs (incl. pendiente rename) and archive reconciled changes`; body `Refs #7` and `Refs #8` | 7.4, 7.5, 7.6 (spec diffs may be large; split per capability into extra docs commits if > 120 lines) | ~120+ |

The former C9 ("Pendiente" label) disappeared: the rename in PR B (B3) delivers it. Task 6.4/6.5 (cancelled badge text+icon check, manual a11y pass) folds into C7/C8 as a test-only addition if the badge test is missing. 7.7 and 7.8 are verification only (no commit). Backend (C9) and frontend commits are never mixed; C5 is the only refactor and contains no behavior change.

---

## Process tasks (execute only with the user's approval)

- [ ] P.1 Ask the user, then create 3 GitHub sub-issues, one per PR (PR A: "Cancel flow: confirm-cancelled 409, card notes, dialog error", parent `Refs #7`; PR B: "Plans search data layer: query API, summary, client and hook", parent `Refs #8`; PR C: "Plans search UI, seeds and spec sync", parent `Refs #7` / `Refs #8`). Per-commit-group sub-issues only if the user later asks. Bodies reference the parent via `Refs` (never `Closes`). #7 and #8 are never closed by us; sub-issues may be.
- [ ] P.2 Before each commit/push verify author/committer is `moises-cisneros <moisescisnerosdl@gmail.com>`; no AI attribution or `Co-Authored-By`. Local commits per group are allowed during apply once tests pass; push and PR creation need explicit user approval.
- [ ] P.3 After each PR merges, retarget the next branch if the base changed (clean diff only) and re-measure size; keep `size:exception` justification and commit review guide on PR B and PR C.

## Traceability

| Criterion | Task ids |
|-----------|----------|
| #7.1 Pending/confirmed can be cancelled | 1.4, 2.2, 7.8h |
| #7.2 Cancelled cannot be cancelled again | 1.2, 7.8i |
| #7.3 Cancelled cannot be confirmed | 1.1, 1.2, 1.3, 7.8j |
| #7.4 Only organizer cancels | 1.2, 2.2, 7.8i |
| #7.5 Confirmation before cancel | 2.1, 2.2, 2.3, 2.4, 7.8h |
| #7.6 UI explains blocked action; cancelled excluded from overdue/next | 2.2, 2.4, 3.3, 3.4, 5.1, 5.2, 7.8i |
| #7.7 Cancelado persisted across reload | 5.1, 7.8f, 7.8h |
| #7.8 Unit tests allowed + rejected | 1.1, 1.2, 1.5 |
| #8.1 Search by name | 3.1, 3.2, 3.3, 7.8b |
| #8.2 Filter by state | 3.3, 6.2, 7.8c, R.1, R.4 |
| State rename `borrador` -> `pendiente` (SM-01, SM-08) | R.1-R.7, 4.2, 7.1, 7.5 |
| #8.3 Filter by due date | 3.3, 4.1, 7.8d |
| #8.4 Combine search and filters | 3.3, 7.8e |
| #8.5 State by text and color | 6.4 |
| #8.6 Active filters shown/removable | 4.1, 5.1, 6.1, 6.2, 7.8e |
| #8.7 Clear message when nothing matches | 5.1, 6.1, 6.3, 7.8g |
| #8.8 Filtering from the database | 3.4, 3.5, 3.8, 4.4, 4.6, 7.1, 7.8b |
| #8.9 Filter unit tests (results + empty) | 3.3, 4.1, 6.1 |
| Cancelled only under "Cancelado" | 3.3, 7.1, 7.8c, 7.8d |

## Decisions for the user (assumptions in this plan)

- D1: `PUT /api/plans/:id` on a cancelled plan returns 409 (PLN-16 scenario); confirm current behavior in the route during 3.5 and ask before changing it if it differs.
- D2: New UI copy "Limpiar filtros" (spec) vs design's "Restablecer filtros"/"Quitar filtros", and "No hay planes que coincidan con los filtros" (spec) vs design's "No existen planes con estas características": tasks use the spec wording.
- D3: Archive order of overlapping changes (7.4) and doing it in the last group of PR C instead of before PR A.
- D5 (resolved by user): rename `borrador` -> `pendiente` everywhere, no API alias; stale clients get 400. Risk: ERICK2 branch / PR #3 still uses `borrador` (merge conflicts possible).
- D4: Creating GitHub sub-issues (P.1), pushing and opening PRs require explicit approval.
- Resolved: delivery strategy is exception-ok (size:exception on PR B and PR C) with at most 3 chained PRs.
