## 1. State Machine: add `cancelado` state and cancel transition

- [x] 1.1 Extend `PLAN_STATES` in `apps/backend/src/lib/planState.ts` to `["borrador", "confirmado", "cancelado"]` and update the `PlanState` type
- [x] 1.2 Add `cancelPlan()` pure function in `planState.ts` that accepts a plan with `estado: "confirmado"` and returns it with `estado: "cancelado"`, throwing `InvalidTransitionError` for any other state
- [x] 1.3 Add `DeleteBlockedError` class in `planState.ts` for attempts to delete a confirmed plan
- [x] 1.4 Add `canDelete()` pure function in `planState.ts` that returns `false` when `estado === "confirmado"`

## 2. State Machine: unit tests

- [x] 2.1 Add tests in `apps/backend/src/lib/planState.test.ts` for the new lifecycle rules (≥ 4 new tests): cancel from `confirmado` succeeds, cancel from `borrador` throws, cancel from `cancelado` throws, `canDelete` returns false for `confirmado`, `canDelete` returns true for `borrador` and `cancelado`, data preserved after cancel

## 3. Backend Service: update and cancel operations, delete guard

- [x] 3.1 Add `update(userId, planId, data)` method to the `PlansStore` interface and its Prisma implementation in `plans.service.ts`
- [x] 3.2 Add `cancel(userId, planId)` method to `PlansStore` using the same guarded-write pattern as `confirm`
- [x] 3.3 Add a state guard to the `delete` method: check `estado === "confirmado"` and throw `DeleteBlockedError` before issuing the Prisma delete

## 4. Backend Routes: PUT edit, POST cancel, delete guard error handling

- [x] 4.1 Add `PUT /api/plans/:id` route in `plans.ts` that validates with `planSchema`, calls `store.update`, and returns the updated plan (or 400/404)
- [x] 4.2 Add `POST /api/plans/:id/cancel` route that calls `store.cancel` and maps `InvalidTransitionError` to 409 with a Spanish message
- [x] 4.3 Update the `DELETE /:id` handler to catch `DeleteBlockedError` and respond 409 with a message explaining the plan must be cancelled first

## 5. Frontend API Client: add updatePlan and cancelPlan

- [x] 5.1 Add `updatePlan(id, input)` method to `api` in `apps/frontend/src/api/client.ts` using `PUT /plans/:id`
- [x] 5.2 Add `cancelPlan(id)` method to `api` using `POST /plans/:id/cancel`
- [x] 5.3 Update `PlanStatus` type to include `"cancelado"`

## 6. Frontend Hook: extend `usePlans` with updatePlan and cancelPlan

- [x] 6.1 Add `updatePlan` callback in `usePlans.ts` that calls `api.updatePlan` and updates the plan in local state
- [x] 6.2 Add `cancelPlan` callback that calls `api.cancelPlan` and updates the plan's estado in local state
- [x] 6.3 Export `UpdatePlanResult` and `CancelPlanResult` types following the existing `AddPlanResult` pattern

## 7. Frontend UI: edit dialog, cancel action, delete restriction messaging

- [x] 7.1 Extend `PlanDialog` to accept optional `initialData` prop for pre-filling the form in edit mode, and change its title/button text accordingly
- [x] 7.2 Add "Editar" item to the `PlanCard` three-dot menu for all plan states
- [x] 7.3 Add edit flow in `MyPlansPage`: open dialog with plan data, call `handleUpdate`, close dialog on success
- [x] 7.4 Add "Cancelar plan" button on confirmed plan cards (same style as "Confirmar plan") with a confirmation dialog
- [x] 7.5 Show "Cancelado" badge (with appropriate icon) on cancelled plan cards; hide confirm and cancel buttons
- [x] 7.6 Disable "Eliminar" in the menu for confirmed plans with a tooltip or inline message: "Debes cancelar el plan antes de eliminarlo"
- [x] 7.7 Wire `handleCancel` in `MyPlansPage` to `cancelPlan` from the hook with a success notice

## 8. Verification

- [x] 8.1 Run `pnpm --filter backend test` and confirm all existing + new tests pass
- [x] 8.2 Manually verify full flow: create → edit → confirm → attempt delete (blocked) → cancel → delete (allowed) → reload and verify persistence

## 9. State Machine & Backend: enforce edit restrictions for cancelled plans

- [x] 9.1 Add `canEdit()` pure predicate in `apps/backend/src/lib/planState.ts` that returns `false` when `estado === "cancelado"` and `true` otherwise, and define `EditBlockedError`
- [x] 9.2 Add unit tests in `apps/backend/src/lib/planState.test.ts` for `canEdit` (draft/confirmed return true, cancelled returns false)
- [x] 9.3 In `plans.service.ts`, add check `canEdit(existing)` in `update()` and throw `EditBlockedError` if false
- [x] 9.4 In `plans.ts`, catch `EditBlockedError` in `PUT /api/plans/:id` and respond with `409` and a Spanish message

## 10. Frontend UI: card styling for cancelled plans and caution notice for confirmed plans

- [x] 10.1 In `PlanCard.tsx`, hide "Editar" option from actions menu when `plan.estado === "cancelado"`
- [x] 10.2 In `PlanCard.tsx`, apply dimmed styling to cancelled plans (`opacity-75 bg-muted/20 border-border/80`, muted lateral bar, event date text muted) complying with `DESIGN.md`
- [x] 10.3 In `PlanDialog.tsx`, display a caution notice using `accent` tokens when editing a confirmed plan (`initialData?.estado === "confirmado"`)
- [x] 10.4 Update `PlanCard.test.tsx` and `MyPlansPage.test.tsx` to verify cancelled plan card presentation and blocked edit flow
- [x] 10.5 Run full verification (`pnpm --filter backend test`, `pnpm --filter frontend test`, and `pnpm build`)
