# Design: Plan Cancel and Search Hardening

## Technical Approach

Hybrid, server-authoritative filtering (confirmed P1-P9). The client keeps filter state in the URL, debounces the text query, and calls `GET /api/plans?q&estado&fecha&today`. The route validates with zod, the service builds a Prisma `where` through a pure exported `buildPlanWhere`, and an unfiltered `summary` feeds the stat cards. #7 fixes are local: discriminate the confirm 409 with `InvalidTransitionError.from`, add `role="note"` explanations, and keep `ConfirmDialog` open with an inline error on failure. Layering follows `ARCHITECTURE.md`: routes = HTTP + zod, services = Prisma, frontend `api/` -> `hooks/` -> `pages/`/`components/`, pure helpers in `lib/`.

## Architecture Decisions

| Decision | Options | Tradeoffs | Chosen | Why |
|---|---|---|---|---|
| Filtering location | Client-only / server-only / hybrid (server filters, URL state client-side) | Client-only fails #8 "interface -> query -> DB"; server needs race handling and a summary | Hybrid | #8 criterion, AGENTS.md layering, `buildPlanWhere` unit-testable, pagination path. Performance is NOT a reason (~0.7 KB per plan) |
| Summary source | Second unfiltered client request / `list` returns `{plans, summary}` / new `PlansStore.summary` | Second request doubles round trips and races; changing `list` return breaks callers | New `summary(userId, todayUtc)`: one `findMany` selecting `dueDate, estado` over the scope + pure `computePlanSummary` | One lightweight query; `list` stays backward compatible; logic testable without Prisma. Rejected 3 aggregate queries (`count` x2 + `findFirst`): more round trips, same result |
| "Today" authority | Server `new Date()` / client `today` param | Server UTC disagrees with local calendar near midnight | Client sends local `today=YYYY-MM-DD`; missing -> server UTC date; invalid -> 400 | Matches `daysUntil` (local calendar day) used on cards |
| Mutation sync | Local patch only / refetch only / patch + refetch | Patch alone leaves non-matching cards and stale summary; refetch alone flashes old state | Patch from server response, then background `reload()` | Instant feedback, then filters and summary reconcile |
| Card action failure | Page-level `ErrorAlert` / inline in dialog | Page-top error is far from the action | Dialog stays open, `role="alert"` under the description | Error next to the action (scenario 16) |
| `filterPlans` | Keep as fallback / delete | Two sources of truth drift | Delete; semantics move to `buildPlanWhere` tests | Server is authoritative |
| Migration/index | Add `estado`/trigram index / none | Index adds migration for tiny volume | None | `@@index([userId, dueDate])` serves the owner branch with ranges; the member branch uses `PlanMember @@index([userId])`; `ILIKE '%q%'` cannot use btree anyway; per-user rows are tens |
| State value `borrador` | Keep DB/API `borrador` and label it "Pendiente" in the UI (old P1) / rename the value to `pendiente` everywhere | UI-only: no migration, but code, API and UI use different words forever. Rename: one data migration, ~65 occurrences in ~20 files, 400 for stale clients, merge conflicts with ERICK2 branch | Rename (user decision, supersedes P1) | One vocabulary across DB, API, code, specs and UI; the project is small with a single client. No alias: an alias would keep two values alive and defeat the rename |
| Seeds update policy | Reset demo rows each start / create-only | Reset erases manual testing on every backend start | `upsert` with `update: {}` | Idempotent and non-destructive; `docker compose down -v` reseeds fresh dates |

## Data Flow

    URL ?q&estado&fecha --parsePlanFilters--> criteria --(q debounced 300 ms)--> usePlans
      usePlans --listPlans(params+today, signal)--> GET /api/plans
      route: planListQuerySchema -> Promise.all[store.list(user, filter, t), store.summary(user, t)]
      service: buildPlanWhere -> prisma.plan.findMany  |  findMany(select) -> computePlanSummary
      <-- { plans, summary } (latest request only) --> PlanFiltersBar / StatCards / PlanList

## Backend Contracts

`apps/backend/src/lib/schemas.ts` (export `isRealCalendarDate`):

```ts
export const PLAN_DATE_FILTERS = ["today", "next7", "next30", "overdue"] as const;
export type PlanDateFilter = (typeof PLAN_DATE_FILTERS)[number];
export const planListQuerySchema = z.object({
  q: z.string("Búsqueda inválida").trim().max(100, "La búsqueda debe tener máximo 100 caracteres")
    .optional().transform((v) => v || undefined),
  estado: z.enum(PLAN_STATES, "Estado inválido").optional(),
  fecha: z.enum(PLAN_DATE_FILTERS, "Filtro de fecha inválido").optional(),
  today: z.string("Fecha inválida").refine(isRealCalendarDate, "Ingresa una fecha válida").optional(),
});
```

Repeated params (`?q=a&q=b`) are arrays and fail as 400; unknown keys are stripped.

`apps/backend/src/services/plans.service.ts`:

```ts
export interface PlanListFilter { q?: string; estado?: PlanState; fecha?: PlanDateFilter }
export interface PlanSummary { total: number; overdue: number; nextDueDate: Date | null }
export function toUtcDate(ymd: string): Date;            // `${ymd}T00:00:00.000Z`
export function buildPlanWhere(userId: string, filter: PlanListFilter, todayUtc: Date): Prisma.PlanWhereInput;
export function computePlanSummary(rows: { dueDate: Date; estado: string }[], todayUtc: Date): PlanSummary;
interface PlansStore {
  list(userId: string, filter?: PlanListFilter, todayUtc?: Date): Promise<StoredPlan[]>; // no filter = unchanged
  summary(userId: string, todayUtc: Date): Promise<PlanSummary>;
  // ...existing methods
}
```

`buildPlanWhere` returns `{ AND: [scope, ...clauses] }`, scope first:
- scope: `{ OR: [{ userId }, { members: { some: { userId } } }] }` (guest plans visible under every filter).
- `q`: `{ titulo: { contains: q, mode: "insensitive" } }` (title only, matches the UI label; not accent-insensitive, P9).
- `estado`: `{ estado }`.
- `fecha` (t = `todayUtc`, `+n` = n UTC days): today `{ dueDate: { gte: t, lte: t } }`; next7 `{ gte: t, lte: t+7 }`; next30 `{ gte: t, lte: t+30 }`; overdue `{ lt: t }`.
- `fecha` set and `estado` unset: add `{ estado: { not: "cancelado" } }` (P3).

`computePlanSummary`: `total` = all rows (cancelled included, P2); `overdue` = non-cancelled with `dueDate < t`; `nextDueDate` = min non-cancelled `dueDate >= t` or null. Order stays `dueDate asc, createdAt asc`.

Route `GET /`: `safeParse(req.query)`; on failure 400. `todayUtc = toUtcDate(parsed.today ?? new Date().toISOString().slice(0, 10))`. Response `{ plans: serialize[], summary: { total, overdue, nextDueDate: "YYYY-MM-DD" | null } }`.

JSDoc fixes (already shipped in PR A with the old name; the rename commit B1 updates the words to `pendiente`): `confirm` "Moves an owned `pendiente` plan to `confirmado`; rejects with `InvalidTransitionError` when `confirmado` or `cancelado`". `cancel` "Moves an owned `pendiente` or `confirmado` plan to `cancelado`; rejects with `InvalidTransitionError` when already `cancelado`". `update` mentions `titulo`.

| Endpoint | Condition | Status | Message |
|---|---|---|---|
| GET `/plans` | invalid `q`/`estado`/`fecha`/`today` | 400 | "Parámetros de búsqueda inválidos" + `errors` (fieldErrors) |
| POST `/:id/confirm` | `InvalidTransitionError`, `from === "cancelado"` | 409 | "Un plan cancelado no puede confirmarse" |
| POST `/:id/confirm` | `InvalidTransitionError`, other `from` | 409 | "El plan ya está confirmado" |
| POST `/:id/confirm`, `/:id/cancel` | guest | 403 | `ForbiddenPlanActionError.message` |
| POST `/:id/cancel` | already cancelled | 409 | unchanged |

## Frontend Contracts

`api/client.ts`: `PlanDateFilter`, `PlanListParams { q?; estado?: PlanStatus; fecha?; today?: string }`, `PlanSummary { total; overdue; nextDueDate: string | null }`, `PlansResponse { plans; summary }`, `listPlans(params: PlanListParams = {}, signal?: AbortSignal): Promise<PlansResponse>` building the query with `URLSearchParams` (empty values omitted). `request` rethrows when `init.signal?.aborted` instead of mapping to `ApiError(0)`.

`lib/plans.ts`: `localToday(now = new Date()): string` (local calendar date); `daysUntil` reuses it; `PLAN_STATUS_LABELS: Record<PlanStatus, string> = { pendiente: "Pendiente", confirmado: "Confirmado", cancelado: "Cancelado" }` (display capitalization only; no special `borrador` mapping since the value is renamed).

`lib/planFilters.ts`: keep `StatusFilter`, `DateFilter`, `PlanFilterCriteria`, `INITIAL_PLAN_FILTERS`, `hasActiveFilters`; add `DATE_FILTER_LABELS`, `parsePlanFilters(sp: URLSearchParams): PlanFilterCriteria` (unknown `estado`/`fecha` -> `"all"`, `q` capped at 100), `serializePlanFilters(c): URLSearchParams` (defaults omitted, keys `q`, `estado`, `fecha`), `toPlanListParams(c, today): PlanListParams`. Delete `filterPlans`.

`hooks/useDebouncedValue.ts` (new): `useDebouncedValue<T>(value: T, delayMs = 300): T`.

`hooks/usePlans.ts`: `usePlans(criteria: PlanFilterCriteria)` returns `{ plans, summary, loading, refreshing, loadError, reload, addPlan, joinPlan, updatePlan, confirmPlan, cancelPlan, deletePlan }`.
- Request key = `serializePlanFilters({ ...criteria, query: debouncedQuery })`; status/date apply immediately; `today = localToday()` per request.
- Each request aborts the previous `AbortController` and increments a `requestId` ref; only the latest id writes state.
- `loading` is true until the first response; later requests set `refreshing`. Errors keep previous `plans`/`summary` and set `loadError`; `reload()` retries.
- Mutations patch from the server response, then call `reload()`; result types unchanged.

`pages/MyPlansPage.tsx`: `useSearchParams`; `criteria = useMemo(parsePlanFilters)`; changes call `setSearchParams(serialize, { replace: true })`; non-canonical URLs are rewritten once with `replace`. Stats: "Planes" = `summary.total`, "Próximo plan" = `nextDueDate ? getDueStatus(...).label : "Sin pendientes"`, "Vencidos" = `summary.overdue`. Empty states: `summary.total === 0` -> `PlanList` "Todavía no tienes planes" (filter bar hidden); `total > 0 && plans.length === 0` -> "No hay planes que coincidan con los filtros" + "Limpiar filtros". List wrapper gets `aria-busy={refreshing}`; the filter bar never unmounts after the first load. `loadError` renders inline with a "Reintentar" button. Card handlers return the hook result.

`PlanFiltersBar`: props `{ criteria, onChange, onReset, resultCount, totalCount }`. Visible labels "Estado" and "Fecha límite" with no conflicting `aria-label` (label-in-name); options use `PLAN_STATUS_LABELS`. Count "Mostrando N de M planes" always rendered in `role="status" aria-live="polite"`. Chip remove buttons `size-11` (44 px). After removing a chip, focus moves to its control (search input, status select, date select) via refs; "Quitar filtros" focuses the search input. Mobile: selects in `grid grid-cols-1 sm:grid-cols-2`, `w-full`; count `basis-full sm:ml-auto`.

`PlanCard`: status text from `PLAN_STATUS_LABELS`; due badge not rendered when cancelled. Owner + cancelled: `<p role="note">` "Este plan está cancelado: no se puede editar ni confirmar. Puedes eliminarlo desde «Más acciones»." Guest: `<p role="note">` "Solo lectura: solo el creador puede editar, confirmar o cancelar este plan." Callbacks become `(id) => Promise<{ ok: true } | { ok: false; message: string }>`; `run()` closes only on `ok`, else stores `actionError` passed to `ConfirmDialog`.

`ConfirmDialog`: new `error?: string | null`, rendered `<p role="alert" className="text-sm text-destructive">` above the buttons; cleared when reopened.

## Date and Timezone Contract

`dueDate` is `@db.Date`, serialized `YYYY-MM-DD`. Both sides compare calendar days: the client sends `localToday()`; the server converts it with `toUtcDate` and compares against UTC-midnight dates. Across local midnight, the open page keeps the old `today` until its next request; card labels (`daysUntil(now)`) may briefly disagree with `summary`. Accepted, documented. Tests pin dates: backend passes `today=2026-06-15` explicitly and calls `buildPlanWhere(..., toUtcDate("2026-06-15"))`; frontend uses `vi.useFakeTimers({ toFake: ["Date"] })` + `vi.setSystemTime(new Date(2026, 5, 15, 23, 30))` (local) and asserts `today=2026-06-15`; debounce tests use fake timers with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.

## Seeds

`prisma/seed.ts`, after users, `seedDemoPlans()`: production refusal stays first. Plans upserted by fixed `shareCode` (`PLZ-SEED2A`..`PLZ-SEED2F`, alphabet-valid) with `update: {}`; dates relative to the first seed run (UTC). usuario1: pendiente +3, confirmado +10, confirmado 0 (today), pendiente -2 (overdue), cancelado -5. usuario2: pendiente +20, which usuario1 joins via `planMember.upsert({ where: { planId_userId } , update: {} })`.

## File Changes and Test Plan

| File | Action | Tests (>= 4 each) |
|---|---|---|
| `backend/src/lib/planState.ts` + `.test.ts` | Modify JSDoc only | + confirm on `cancelado` throws with `from="cancelado"` |
| `backend/src/lib/schemas.ts` + `.test.ts` | Add query schema, export helper | trims/empties `q`; `q` > 100 rejected; bad `estado`/`fecha` rejected; `today=2026-02-30` rejected; array `q` rejected |
| `backend/src/services/plans.service.ts` + new `plans.service.test.ts` | Filter, summary, JSDoc | scope always first; q insensitive; each `fecha` range at boundaries; cancelled excluded unless `estado=cancelado`; summary excludes cancelled from overdue/next, total counts all |
| `backend/src/routes/plans.ts` + `plans.test.ts` | Query + 409 | confirm-cancelled 409 text; guest cancel 403; 400 with `errors`; filter and `todayUtc` forwarded to store; summary in response. Fakes in `plans.test.ts` and `auth.recover.test.ts` gain `summary` (fake `list` records its args) |
| `backend/prisma/seed.ts` | Demo plans; state expectations use `pendiente` | none (no co-located test pattern for seeds) |
| `backend/prisma/schema.prisma` (line 28) + NEW `prisma/migrations/<ts>_rename_plan_state_pendiente/migration.sql` | Default `"pendiente"`; data migration | verified manually against real PostgreSQL (see Migration / Rollout) |
| `backend/src/lib/planState.ts`, `services/plans.service.ts`, `lib/schemas.test.ts`, `routes/plans.test.ts` (+ `planState.test.ts`) | Rename `borrador` -> `pendiente` | existing tests updated; one new test: schema rejects `borrador` |
| `frontend/src/api/client.ts`, `PlanCard.tsx`, `PlanFiltersBar.tsx` + tests (`usePlans.test.tsx`, `MyPlansPage.test.tsx`, `planFilters.test.ts`, `ConfirmDialog.test.tsx`, `PlanList.test.tsx`) | Rename types, options, fixtures | existing tests updated |
| `README.md`, `apps/frontend/DESIGN.md`, `docs/task-02-state-tests.md` | Rename in docs (never `docs/project-card.md`) | n/a |
| `frontend/src/api/client.ts` | `listPlans(params, signal)` | covered via hook |
| `frontend/src/lib/planFilters.ts` + `.test.ts` | Rewrite | parse sanitizes unknown; serialize omits defaults; round-trip; `toPlanListParams` includes `today`. Old `filterPlans` tests (incl. overdue `["4"]`) deleted |
| `frontend/src/lib/plans.ts` | `localToday`, labels | tested in `planFilters.test.ts` / `PlanCard.test.tsx` |
| `frontend/src/hooks/useDebouncedValue.ts`, `usePlans.ts` + `usePlans.test.tsx` | New / rewrite | debounces only q; stale response ignored; loading vs refreshing; error keeps data + reload; mutation patches then refetches. Existing "without refetching" test rewritten; mocks return `summary` |
| `frontend/src/components/domain/PlanFiltersBar.tsx` + test | a11y | label-in-name queries (`"Estado"`, `"Fecha límite"`); live count; focus after chip removal; 44 px class |
| `PlanCard.tsx` + test | Notes, labels, failure | "Pendiente"; owner-cancelled note; guest note; no "Venció" when cancelled; dialog stays open with alert on failure. Existing "Borrador" assertion updated in the rename commit B3 |
| `ConfirmDialog.tsx` + test | `error` prop | renders alert; absent when null |
| `PlanList.tsx` + test | unchanged API | existing tests remain valid |
| `pages/MyPlansPage.tsx` + test | URL, summary, empty states | All tests wrapped in `MemoryRouter`; mocks return `summary`; test at ~254 rewritten: typing debounces then calls `listPlans` with `q`, server-empty result shows no-match state; URL restore on reload; stats from summary |

Run via vitest MCP `run_tests` per AGENTS.md; it previously returned "No tests found", so the fallback is `pnpm --filter backend exec vitest run` / `pnpm --filter frontend exec vitest run`, recording the reason.

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. New HTTP input is bounded by zod and Prisma parameterization.

## PR Plan (3 chained PRs, stacked-to-main, delivery `exception-ok`)

User constraint: at most 3 chained PRs; each PR is built from many small commits (one cohesive concern, <= 120 changed lines, tests with implementation, suite green at every commit, never backend + frontend or refactor + behavior in one commit).

| PR | Branch (base) | Content | Commit scopes | Refs | Est. lines |
|---|---|---|---|---|---|
| A | `fix/plan-cancel-flow` (`Moises`) | confirm-cancelled 409, JSDoc, missing tests, PlanCard notes, cancelled badge, ConfirmDialog inline error and stay-open-on-failure, hide overdue wording when cancelled | `fix(plans)`, `test(plans)`, `docs(plans)`, `feat(plans-ui)` | `Refs #7` | ~250 |
| B | `feat/plans-search-data-layer` (PR A) | FIRST 4 commits: rename `borrador` -> `pendiente` (B1 backend code+tests, B2 migration+schema+seed, B3 frontend, B4 docs); then `isRealCalendarDate` export, `planListQuerySchema`, `buildPlanWhere`, `computePlanSummary`, `PlansStore.list/summary`, route, fake stores, Prisma `%`/`_` check; client `listPlans` + `PlansResponse` + abort handling, `useDebouncedValue`, `usePlans(criteria)`, URL helpers, `PLAN_STATUS_LABELS`, `localToday` | `feat(plans)`, `chore(db)`, `refactor(plans-ui)`, `docs(plans)`, `feat(plans-api)`, `test(plans)`, `feat(plans-ui)` | `Refs #8` | ~590 (`size:exception`) |
| C | `feat/plans-search-ui` (PR B) | MyPlansPage with `useSearchParams` and summary stats, `filterPlans` removal and test migration, MemoryRouter wrapping, PlanFiltersBar a11y, empty states, seeds `PLZ-SEED2A..F`, DESIGN.md row, spec reconciliation (`/opsx-sync`, `/opsx-archive` in order plan-lifecycle -> add-plan-title -> add-plan-filters-and-search -> this change; the sync also applies the rename to main specs `plan-state-machine` and `plans` via MODIFIED deltas) | `feat(plans-ui)`, `refactor(plans-ui)`, `chore(seed)`, `docs(openspec)` | `Refs #7`, `Refs #8` | ~550 (`size:exception`) |

PR A (#9) is already published and keeps `borrador` in its tests; it is NOT retro-edited. The rename lands as the first commits of PR B, so PR B's first four commits also rewrite the `borrador` strings PR A introduced.

The former interim client-side slice (exclude cancelled from stats/date filters) is dropped: the server `computePlanSummary` and `buildPlanWhere` in PR B satisfy that behavior (PLN-04, PLN-05, PLN-19, SM-06). To keep the suite green between PR B and PR C, `usePlans(criteria)` defaults to empty criteria and the deprecated `filterPlans` stays until PR C removes it in a dedicated refactor commit.

Commits and PR bodies use only `Refs #7` / `Refs #8`, never `Closes`/`Fixes`/`Resolves` (the teacher closes issues). No AI attribution anywhere. Apply commits locally per task group after tests pass; push and PR creation need explicit user approval. The detailed per-PR commit lists live in `tasks.md`.

## Migration / Rollout

One data migration, introduced by the rename commit B2. The existing `apps/backend/prisma/migrations/20261006120000_plan_state_machine/migration.sql` (which sets `estado='borrador'` and `DEFAULT 'borrador'`) is already applied and MUST NOT be edited. Add a NEW migration directory `prisma/migrations/<timestamp>_rename_plan_state_pendiente/` (timestamp later than `20261011142500_add_plan_title`, for example `20261012120000`) containing:

```sql
UPDATE "Plan" SET "estado" = 'pendiente' WHERE "estado" = 'borrador';
ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'pendiente';
```

`schema.prisma` line 28 becomes `estado String @default("pendiente")`. No index or column type changes; `confirmado` and `cancelado` rows are untouched.

Execution: `apps/backend/Dockerfile.dev` runs `prisma generate && prisma migrate deploy && prisma db seed && pnpm dev` on every backend container start, so `pnpm dev` applies the migration automatically (no manual step). Compose-less environments must run `pnpm --filter backend prisma migrate deploy`.

Rollback SQL (documented only; Prisma has no down migrations). Run it AFTER reverting the code, on every DB where the migration was applied, then delete the migration row if re-running forward is needed (`DELETE FROM "_prisma_migrations" WHERE migration_name = '<timestamp>_rename_plan_state_pendiente';`):

```sql
UPDATE "Plan" SET "estado" = 'borrador' WHERE "estado" = 'pendiente';
ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'borrador';
```

Verification (task R.6): with the pre-migration code, create a plan (state `borrador`) in the compose PostgreSQL, apply the migration, confirm the row reads `pendiente` and a new plan defaults to `pendiente`; run the rollback SQL and confirm the inverse.

Compatibility and risk: no API alias. A stale client (or a branch still on `borrador`) gets `400` on `estado=borrador` and its created plans rely on the DB default. Acceptable for a single-client small project. ERICK2 branch / PR #3 still uses `borrador` in its code, so merge conflicts with this change are possible; whoever merges second renames the strings (the migration is order-independent because it only updates existing rows and the default).

Rollback of code per PR (or per commit) is by revert; reverting PR C restores client filtering against the still-compatible API because filter params are optional. Reverting the rename requires reverting B1-B4 together plus the rollback SQL above.

## Risks and Open Questions

- Data migration risk (`borrador` -> `pendiente`): mitigated by a new immutable-safe migration, real-PostgreSQL verification, and documented rollback SQL.
- ERICK2 branch / PR #3 conflict: it still uses `borrador`; expect textual conflicts and a stale-value 400 until it is renamed.
- PR B and PR C exceed the 400-line budget (user-accepted `size:exception`); mitigated by small cohesive commits and a commit-by-commit review guide in each PR body.
- Prisma `contains` wildcard escaping (`%`, `_`) is unverified against the running PostgreSQL; low impact, check during apply.
- Fake store hides real `where` bugs; mitigated by `buildPlanWhere` unit tests and manual check against seeds.
- Open: none blocking. Search field set (title only) must match the spec phase wording.
