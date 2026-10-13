## Context

The `/mis-planes` screen renders all plans of the current user. When plans accumulate, finding a specific plan or focusing on pending/confirmed plans in the upcoming days requires search and filtering capabilities.

## Design Decisions

### 1. Pure Filtering Function (`apps/frontend/src/lib/planFilters.ts`)

Define filter criteria type:
```typescript
export type StatusFilter = "all" | "borrador" | "confirmado" | "cancelado";
export type DateFilter = "all" | "today" | "next7" | "next30" | "overdue";

export interface PlanFilterCriteria {
  query: string;
  status: StatusFilter;
  dateRange: DateFilter;
}
```

Filtering algorithm:
- `query`: trimmed, lowercase match against `plan.titulo.toLowerCase()`.
- `status`: matches `plan.estado` if not `"all"`.
- `dateRange`: uses calendar calculations (comparing with `today` YYYY-MM-DD):
  - `"today"`: `daysUntil(plan.dueDate) === 0`
  - `"next7"`: `daysUntil >= 0 && daysUntil <= 7`
  - `"next30"`: `daysUntil >= 0 && daysUntil <= 30`
  - `"overdue"`: `daysUntil < 0`
  - `"all"`: all dates accepted.
- Criteria are combined using `AND` logic.

### 2. UI Component (`apps/frontend/src/components/domain/PlanFiltersBar.tsx`)

- Input field with `Search` icon for title query, plus clear button.
- Select/Dropdown for `Estado` (Todos, Borrador, Confirmado, Cancelado).
- Select/Dropdown for `Fecha límite` (Todas las fechas, Hoy, Próximos 7 días, Próximos 30 días, Vencidos).
- Active filter chips: Each applied filter (non-empty query, status !== all, dateRange !== all) displays a removable tag with `X` button.
- Clear all button: "Quitar filtros" / "Limpiar filtros".

### 3. Integration in `MyPlansPage.tsx`

- Maintain filter state: `criteria: PlanFilterCriteria`.
- Derive `filteredPlans = useMemo(() => filterPlans(plans, criteria), [plans, criteria])`.
- If `plans.length > 0` and `filteredPlans.length === 0`:
  Render empty state banner:
  - Text: *"No existen planes con estas características"*.
  - Button to reset filters.

### 4. Unit Testing Strategy

- `apps/frontend/src/lib/planFilters.test.ts`: Test individual and combined filtering rules (query, status, date intervals, combinations).
- `apps/frontend/src/components/domain/PlanFiltersBar.test.tsx`: Test user inputs, dropdown selection, active filter tags, and removal actions.
- `apps/frontend/src/pages/MyPlansPage.test.tsx`: Test integration of filtering and empty state message.
