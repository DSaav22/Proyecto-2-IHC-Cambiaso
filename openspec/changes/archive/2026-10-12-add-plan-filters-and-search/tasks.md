## 1. Filter Logic & Tests

- [x] 1.1 Implement pure filtering utility in `apps/frontend/src/lib/planFilters.ts` (title query, status, date intervals, AND logic)
- [x] 1.2 Write at least 4 unit tests in `apps/frontend/src/lib/planFilters.test.ts` for filtering rules and combinations

## 2. UI Components & Tests

- [x] 2.1 Implement `PlanFiltersBar.tsx` with search input, dropdowns for status/date, active filter tags with remove (×), and global clear action
- [x] 2.2 Export `PlanFiltersBar` from `apps/frontend/src/components/domain/index.ts`
- [x] 2.3 Write at least 4 unit tests in `apps/frontend/src/components/domain/PlanFiltersBar.test.tsx` verifying input, selections, active chips, and reset events

## 3. Integration in MyPlansPage & Empty State

- [x] 3.1 Integrate `PlanFiltersBar` into `apps/frontend/src/pages/MyPlansPage.tsx`
- [x] 3.2 Implement empty state feedback showing "No existen planes con estas características" with reset button when filters match zero items
- [x] 3.3 Update/add unit tests in `apps/frontend/src/pages/MyPlansPage.test.tsx` verifying search filtering and empty state display

## 4. Verification and Build

- [x] 4.1 Run full frontend test suite (`pnpm --filter frontend test`) and verify all pass
- [x] 4.2 Run full project build (`pnpm build`) and verify build succeeds
