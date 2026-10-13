## Why

The current plan lifecycle only supports creation, listing, confirmation, and unrestricted deletion. The assignment requires completing the CRUD cycle by adding plan editing and enforcing a business rule: a confirmed plan cannot be deleted until it is cancelled first. This aligns with the course deliverable "completar el ciclo del elemento" (issue #5) and its deadline of 2026-10-08 18:00.

## What Changes

- Add an **edit** endpoint (`PUT /api/plans/:id`) and frontend flow so users can modify a plan's description and due date for drafts and confirmed plans (with caution notice), while cancelled plans are immutable (read-only).
- Add a `cancelado` state to the plan state machine with the transition `confirmado → cancelado`.
- **Enforce a delete restriction**: a plan in `confirmado` cannot be deleted; the API returns an error and the UI explains the reason clearly.
- Update the plan card to show cancel and edit actions, disabling edit on cancelled plans and presenting cancelled plans with a dimmed visual treatment and original event date.
- Add unit tests covering the new restriction and state logic.
- Data persists across page reloads (database-backed, already the case for existing features).

## Capabilities

### New Capabilities

- `plan-lifecycle`: Covers the new edit flow, state-based editability (cancelled immutable, confirmed with caution note), the `cancelado` state, the delete restriction rule, the cancel transition, and UI adaptations for blocked actions.

### Modified Capabilities

- `plan-state-machine`: The state machine gains a third state (`cancelado`), the transition (`confirmado → cancelado`), and pure predicates `canDelete` and `canEdit`.
- `plans`: The plans API gains `PUT /api/plans/:id` for editing (blocked for cancelled plans) and `POST /api/plans/:id/cancel` for cancellation. The existing `DELETE /api/plans/:id` gains a state guard. The plan card UI adds edit, cancel actions, and dimmed styling for cancelled plans.

## Impact

- **Database**: Prisma schema may need an `updatedAt` field on `Plan` (already has `createdAt`). The `estado` column accepts a new value `cancelado`.
- **Backend**: `planState.ts` adds `cancelado` state and `cancelPlan` function. `plans.service.ts` adds `update` and `cancel` methods and a pre-delete state check. `plans.ts` routes add `PUT /:id` and `POST /:id/cancel`. `schemas.ts` adds a `planUpdateSchema`.
- **Frontend**: `client.ts` adds `updatePlan` and `cancelPlan` API methods. `usePlans.ts` adds `updatePlan` and `cancelPlan` callbacks. Domain components gain an edit dialog and cancel action. `PlanCard` shows contextual action availability.
- **Tests**: New tests in `planState.test.ts` for `cancelado` transitions and delete guard logic.
