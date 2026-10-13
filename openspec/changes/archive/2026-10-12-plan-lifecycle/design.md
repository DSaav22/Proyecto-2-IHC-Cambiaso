## Context

The plan CRUD currently supports create, list, confirm (`borrador → confirmado`), and unconditional delete. See proposal.md for motivation. The backend follows a layered architecture: routes → services → Prisma. The frontend follows hook + presentational: pages → hooks → api/client. The state machine lives in `lib/planState.ts` (pure, no framework imports) and is already tested in `planState.test.ts` with 4 tests.

Key existing pieces:
- `PLAN_STATES = ["borrador", "confirmado"]` and `confirmPlan()` in `planState.ts`
- `PlansStore` interface in `plans.service.ts` with `list`, `create`, `confirm`, `delete`
- `plans.ts` routes: `GET /`, `POST /`, `POST /:id/confirm`, `DELETE /:id`
- `api/client.ts` with `listPlans`, `createPlan`, `confirmPlan`, `deletePlan`
- `usePlans` hook with `addPlan`, `confirmPlan`, `deletePlan`
- `PlanCard` component with three-dot menu (only "Eliminar" currently)

## Goals / Non-Goals

**Goals:**
- Add `cancelado` as a third plan state with `confirmado → cancelado` transition
- Add `PUT /api/plans/:id` to edit description and dueDate
- Add `POST /api/plans/:id/cancel` to cancel a confirmed plan
- Enforce delete restriction: confirmed plans cannot be deleted (409)
- Show contextual UI messaging when actions are blocked by state
- Add ≥ 4 unit tests for the new state rules

**Non-Goals:**
- Batch operations (edit/delete multiple plans at once)
- Undo cancel (cancelado is a terminal state for now)
- Notification system for state changes
- Adding an `updatedAt` timestamp to the Plan model (out of scope, would require a migration for a field not consumed by UI)

## Decisions

### D1: `cancelado` as a third state in the existing state machine

**Choice:** Extend `PLAN_STATES` to `["borrador", "confirmado", "cancelado"]` and add a `cancelPlan()` pure function alongside `confirmPlan()`.

**Rationale:** The assignment requires that a confirmed plan cannot be deleted until cancelled. This needs a third state. Adding it to the same pure module keeps the state machine testable without Prisma.

**Alternative considered:** Using a `deletable` boolean flag instead of a third state. Rejected because it would create ambiguous combinations (`confirmado` + `deletable`) and not match the requirement's language ("primero debe cancelarse").

### D2: Delete guard in the service layer, not the route

**Choice:** `plans.service.ts`'s `delete` method checks `estado === "confirmado"` and throws a `DeleteBlockedError` before issuing the Prisma delete. The route catches it and returns `409`.

**Rationale:** Business rules belong in the service layer per ARCHITECTURE.md. The route only maps errors to HTTP codes.

**Alternative considered:** Guard in the route handler. Rejected because it leaks business logic into the HTTP layer.

### D3: Edit uses `planSchema` (same as create) for validation

**Choice:** Reuse the existing `planSchema` from `schemas.ts` to validate the body of `PUT /api/plans/:id`.

**Rationale:** The spec says edit fields follow the same rules as creation. No new schema needed, reducing duplication.

**Alternative considered:** A partial schema (`planSchema.partial()`). Rejected because the spec requires both fields to be present on edit (full replacement, not patch).

### D4: Edit dialog reuses `PlanDialog` component with pre-filled data

**Choice:** Extend the existing `PlanDialog` to accept an optional `initialData` prop. When provided, the dialog becomes an edit form instead of a create form.

**Rationale:** The create and edit forms have the same fields and validation. One component, two modes. Keeps the component count low.

**Alternative considered:** A separate `EditPlanDialog` component. Rejected as unnecessary duplication given identical fields.

### D5: Card actions and presentation derive from state

**Choice:** The `PlanCard` receives the plan's `estado` and derives which actions and styles are applied:
- `borrador`: show "Confirmar plan" button, menu has "Editar" + "Eliminar"
- `confirmado`: show "Cancelar plan" button, menu has "Editar" (which opens dialog with a warning note advising caution), disabled "Eliminar" with explanation
- `cancelado`: show "Cancelado" badge with `Ban` icon, card visually dimmed (`opacity-75 bg-muted/20 border-border/80`, lateral bar muted, event date preserved with muted text), menu has ONLY "Eliminar" (no "Editar")

**Rationale:** Cancelled is a terminal state; editing it makes no semantic sense and creates user confusion. Preserving the original event date with dimmed visuals keeps mental reference without visual competition.

### D6: Edit restriction in service layer and pure state machine

**Choice:** Add `canEdit(plan: { estado: string }): boolean` in `planState.ts` (returns `false` for `cancelado`, `true` otherwise) and `EditBlockedError`. `plans.service.ts` checks `canEdit(existing)` and throws `EditBlockedError` if false. `plans.ts` route catches it and returns `409 Conflict`.

**Rationale:** Prevents API-level tampering with cancelled plans, keeping the state machine clean and aligned with the UI rules.

## Risks / Trade-offs

- **`cancelado` is terminal** → Once cancelled, a plan cannot be confirmed again. If this is too strict, a future change can add `cancelado → borrador`. For now, the assignment only requires cancel-before-delete.
- **No Prisma migration for `estado` column** → The `estado` column is a `String`, not an enum, so `cancelado` is stored without a schema migration. Risk: the database accepts any string. Mitigation: the `PLAN_STATES` array in `planState.ts` is the source of truth; the service validates against it.
- **Optimistic concurrency on cancel** → Same guarded-write pattern as `confirm`: `updateMany` with `where: { estado: "confirmado" }` to prevent race conditions.
