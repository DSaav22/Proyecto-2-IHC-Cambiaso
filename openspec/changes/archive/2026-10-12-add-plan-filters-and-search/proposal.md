## Why

Users who manage multiple plans need to quickly locate and organize them. By introducing a search by title and filters by state and due date (next X days, overdue, today), users can easily find specific plans and drill down using combined criteria.

## What Changes

- Create a pure filter helper / hook (`filterPlans`) that supports:
  - Text search by `titulo` (case-insensitive, trimmed).
  - Status filter (`all`, `borrador`, `confirmado`, `cancelado`).
  - Due date filter (`all`, `next7`, `next30`, `overdue`, `today`).
  - Combining search text and filters simultaneously (AND logic).
- Create a reusable UI component `PlanFiltersBar` with:
  - Accessible search input with search icon and clear button.
  - Dropdown or select controls for status and due date ranges.
  - Active filter badges/chips with removal controls (×).
  - Global "Quitar filtros" / "Limpiar filtros" action button.
- Integrate `PlanFiltersBar` into `MyPlansPage`.
- When filtering returns no matches, display:
  - Message: *"No existen planes con estas características"*.
  - A button to reset filters.
- Add comprehensive Vitest unit tests (filtering logic, UI interactions, empty state).

## Capabilities

### Modified Capabilities
- `plans`: adds search by title, multi-criteria filtering (status, date range), active filter management, and empty filtered state to the `/mis-planes` page.

## Impact

- Frontend:
  - `apps/frontend/src/lib/planFilters.ts` (new filter logic)
  - `apps/frontend/src/components/domain/PlanFiltersBar.tsx` (new UI component)
  - `apps/frontend/src/components/domain/index.ts` (export new component)
  - `apps/frontend/src/pages/MyPlansPage.tsx` (integrate search and filters)
  - Vitest test files for filter logic and UI components.
