# Proposal: Plan Cancel and Search Hardening

## Intent

Close teacher issues #7 (cancel a plan) and #8 (search plans, filter by state and due date). Cancellation works, but confirming a cancelled plan returns the wrong 409 message, blocked actions are unexplained, and cancelled plans leak into "Vencidos"/"Próximo plan". Search/filter runs only client-side, so it does not satisfy #8's "interface -> query -> database" criterion, and filters are lost on reload.

## Scope

### In Scope
- #7: confirm on a cancelled plan -> 409 "Un plan cancelado no puede confirmarse" (via `InvalidTransitionError.from`); fix stale JSDoc on `PlansStore.cancel/confirm`; missing tests; `role="note"` explanations in `PlanCard` for cancelled plans and guests; no "Venció hace N días" on cancelled cards; `ConfirmDialog` stays open on failure with the error next to the action; cancelled plans stay read-only and deletable.
- #8: `GET /api/plans?q&estado&fecha&today` (zod in route, pure exported `buildPlanWhere` in service, `PlansStore.list(userId, filter?)`), unfiltered `summary { total, overdue, nextDueDate }`; filters in the URL (`useSearchParams`, sanitized); ~300 ms debounce; stale-response guard; initial loading split from refreshing; refetch after confirm/cancel/delete/join/update.
- Semantics: date filters exclude cancelled unless `estado=cancelado`; "Próximos 7 días" = days 0..7 inclusive; keep "Hoy" and "Próximos 30 días"; guest plans visible under every filter; ordering `dueDate` asc then `createdAt`; "Planes" counts all, "Próximo plan"/"Vencidos" exclude cancelled.
- State rename (user decision, supersedes the earlier UI-only P1): the state value `borrador` becomes `pendiente` EVERYWHERE (DB value, Prisma default, API/JSON, zod enums, `PLAN_STATES`, `estado=pendiente` query value, frontend types, tests, seeds, README/DESIGN.md/docs, specs) through a NEW Prisma migration; UI label "Pendiente". The frontend keeps only a capitalization label map. No API alias: `borrador` yields 400.
- UI/UX: empty state keyed on `summary.total` + active filters; `aria-live` count; focus after chip removal; 44 px chip targets; label-in-name; mobile layout.
- Demo plan seeds for test users (production refusal kept).

### Out of Scope
Pagination; accent-insensitive search (documented limitation); `pg_trgm` index; editing cancelled plans; a backward-compatible `borrador` alias in the API; editing the already-applied migration `20261006120000_plan_state_machine`; `docs/project-card.md` (read-only). The only Prisma migration is the rename migration.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `plans`: server-side search/filter API, summary, URL filter state, blocked-action notes, `pendiente` state value and "Pendiente" label, accessibility.
- `plan-state-machine`: three states (`pendiente`, `confirmado`, `cancelado`); rename `borrador` -> `pendiente` (SM-08); confirming a cancelled plan is rejected with a distinct message.
- `test-user-seeding`: demo plans for seeded users.

## Approach

Hybrid, server-authoritative filtering. The client sends its local calendar date (`today=YYYY-MM-DD`); the server never uses `new Date()` for range maths (missing -> server UTC date; invalid -> 400).

| Option | Verdict |
|--------|---------|
| Client-only filter (current) | Fails #8's DB-query criterion; no pagination path |
| Server-side (chosen) | Meets #8; respects routes/services layering; `buildPlanWhere` unit-testable; paginates later; costs a summary field and request-race handling |

Performance is not the reason (about 0.7 KB per plan). No index is needed at class-project volume: existing `@@index([userId, dueDate])` covers the date ranges.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/backend/src/routes/plans.ts`, `lib/schemas.ts`, `services/plans.service.ts`, `lib/planState.ts` | Modified |
| `apps/backend/prisma/seed.ts`, `schema.prisma` (default), new migration under `prisma/migrations/` | Modified / New |
| ~20 files with ~65 `borrador` occurrences (backend lib/service/tests, frontend types/client/PlanCard/PlanFiltersBar/tests, README.md, DESIGN.md, docs/task-02-state-tests.md) | Modified (rename) |
| `apps/frontend/src/api/client.ts`, `hooks/usePlans.ts`, `lib/planFilters.ts`, `lib/plans.ts` | Modified |
| `apps/frontend/src/components/domain/{PlanCard,PlanList,PlanFiltersBar,ConfirmDialog}.tsx`, `pages/MyPlansPage.tsx` | Modified |
| Co-located `*.test.ts(x)` (>= 4 tests each) | Modified/New |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `usePlans` refactor breaks `MyPlansPage.test.tsx` and overdue test | High | Update in the same slice |
| Fake store hides real Prisma `where` bugs | Med | Unit-test pure `buildPlanWhere` |
| Timezone off-by-one | Med | Client `today`; boundary tests both sides |
| Overlap with unarchived changes | Med | Reconcile first (Dependencies) |
| Data migration of existing `estado` rows (`borrador` -> `pendiente`) | Med | New migration (never edit the applied one); verify against real PostgreSQL via docker compose; documented rollback SQL in design |
| Stale clients or branches still sending `borrador` (400; ERICK2 branch / PR #3 still uses `borrador`) | Med | Single-client small project, no alias by decision; merge conflicts with ERICK2 expected and resolved by renaming there |

## Rollback Plan

Each slice is one revertible PR. Filter params are optional, so reverting slice 5 restores client filtering against an unfiltered API. The rename is reverted by reverting its commits AND running the inverse SQL (`UPDATE "Plan" SET "estado"='borrador' WHERE "estado"='pendiente'; ALTER TABLE "Plan" ALTER COLUMN "estado" SET DEFAULT 'borrador';`, see design) on every database where the migration was applied. Seed additions are idempotent and removable.

## Dependencies

Unarchived `plan-lifecycle`, `add-plan-filters-and-search`, `add-plan-title` overlap `plans`/`plan-state-machine`. Recommendation: archive them (sync deltas into main specs) before this change's spec phase, so deltas here are written against current main specs; any still-wrong requirement (client-side filtering) is MODIFIED here.

## Success Criteria

- [ ] #7: owner cancels with confirmation; cancelled plan shows "Cancelado", is read-only with a visible note, stays deletable; confirm-cancelled -> 409; guest cancel -> 403; excluded from "Vencidos"/"Próximo plan".
- [ ] #8: text search (searched fields fixed in spec) resolves through the DB query; state filter (`estado=pendiente|confirmado|cancelado`, labels Pendiente/Confirmado/Cancelado); due-date filter (Hoy, Próximos 7 días 0..7, Próximos 30 días, Vencidos); combined AND; cancelled only under "Cancelado"; filters survive reload; empty state and count announced.

Review Workload Forecast (user constraint: at most 3 chained PRs, many small commits per PR; delivery strategy `exception-ok`, chain strategy stacked-to-main):

| PR | Branch | Base | Est. lines | Content | Refs | 400-line risk |
|----|--------|------|-----------|---------|------|---------------|
| A | `fix/plan-cancel-flow` | `Moises` | ~250 | confirm-cancelled 409, JSDoc, missing tests, PlanCard notes, ConfirmDialog failure behavior, hide overdue wording when cancelled (7 commits) | `Refs #7` | Low |
| B | `feat/plans-search-data-layer` | PR A branch | ~590 | FIRST 4 commits: `borrador` -> `pendiente` rename (backend, DB migration, frontend, docs; ~+120 lines); then query schema, `buildPlanWhere`, summary, route, stores; client `listPlans`, `useDebouncedValue`, `usePlans(criteria)`, URL helpers, labels (14 commits) | `Refs #8` | High (`size:exception`) |
| C | `feat/plans-search-ui` | PR B branch | ~550 | MyPlansPage URL state and summary stats, `filterPlans` removal, filters bar a11y, empty states, seeds, DESIGN.md, spec sync incl. rename in main specs (11 commits) | `Refs #7`, `Refs #8` | High (`size:exception`) |

Chained PRs: 3. B and C exceed 400 lines, accepted by the user (`size:exception`), mitigated by a commit-by-commit review guide in each PR body (each commit has one concern and is about 120 changed lines or fewer, tests included, suite green). The former interim client-side exclusion slice is dropped: excluding cancelled plans from overdue/next plan lands in PR B through the server summary. Work is tracked as 3 sub-issues (one per PR) of #7/#8; commits reference issues only as `Refs`; no AI attribution.
