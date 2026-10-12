# Design: Allow Cancelling Plans in Draft State

## Architecture Decisions

### 1. State Machine (`planState.ts`)
Update `cancelPlan`:
```ts
export function cancelPlan<T extends { estado: string }>(
  plan: T,
): Omit<T, "estado"> & { estado: "cancelado" } {
  if (plan.estado !== "confirmado" && plan.estado !== "borrador") {
    throw new InvalidTransitionError(plan.estado as PlanState, "cancelado");
  }
  return { ...plan, estado: "cancelado" };
}
```
Predicates:
- `canDelete(plan)`: returns `true` for `borrador` and `cancelado`, `false` for `confirmado` (remains unchanged).
- `canEdit(plan)`: returns `true` for `borrador` and `confirmado`, `false` for `cancelado` (remains unchanged).

### 2. Backend Routes (`routes/plans.ts`)
In `POST /:id/cancel`:
When `InvalidTransitionError` is caught:
Return HTTP 409 with `{ message: "Un plan cancelado no puede volver a cancelarse" }`.

### 3. Frontend Card UI (`PlanCard.tsx`)
When `isOwner` and `isDraft`:
Render both "Confirmar plan" (primary button) and "Cancelar plan" (outline/ghost button):
```tsx
{isDraft ? (
  <div className="flex flex-wrap gap-2 border-t pt-3">
    <Button type="button" size="sm" onClick={() => setOpenDialog("confirm")}>
      Confirmar plan
    </Button>
    <Button type="button" variant="outline" size="sm" onClick={() => setOpenDialog("cancel")}>
      Cancelar plan
    </Button>
  </div>
) : isConfirmed ? (
  <div className="flex flex-wrap gap-2 border-t pt-3">
    <Button type="button" size="sm" onClick={() => setOpenDialog("cancel")}>
      Cancelar plan
    </Button>
  </div>
) : null}
```

### 4. Tests
- `apps/backend/src/lib/planState.test.ts`:
  - `cancels a borrador plan` returns state `cancelado`.
  - `cancels a confirmado plan` returns state `cancelado`.
  - `rejects cancelling an already cancelado plan` throws `InvalidTransitionError`.
- `apps/backend/src/routes/plans.test.ts`:
  - `POST /api/plans/:id/cancel` on a draft plan succeeds with 200 and changes state to `cancelado`.
- `apps/frontend/src/components/domain/PlanCard.test.tsx`:
  - Draft card renders "Cancelar plan" button.
  - Clicking "Cancelar plan" opens cancel dialog.
