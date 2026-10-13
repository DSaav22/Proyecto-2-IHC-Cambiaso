# Proposal: Allow Cancelling Plans in Draft State

## Why

Currently, the plan state machine only permits cancelling plans that have already been confirmed (`confirmado → cancelado`). Cancelling a draft (`borrador → cancelado`) is rejected by `cancelPlan()` with `InvalidTransitionError` and the API responds `409 Conflict`.

However, users need to be able to cancel plans while they are still in the planning/draft phase without first having to artificially "confirm" them. Allowing `borrador → cancelado` provides a more natural lifecycle and allows users to archive or stop plans that will not go forward.

## What Changes

### Backend
- **State Machine (`apps/backend/src/lib/planState.ts`)**:
  - Update `cancelPlan` to allow transitions from both `borrador` and `confirmado` to `cancelado`.
  - Only reject transitions to `cancelado` if the plan is already `cancelado` (or any unrecognized state).
- **Service & Routes (`apps/backend/src/routes/plans.ts`)**:
  - In `POST /api/plans/:id/cancel`, update the 409 error message to reflect that only already-cancelled plans cannot be cancelled again.
- **Unit Tests**:
  - Update `apps/backend/src/lib/planState.test.ts` to verify `borrador → cancelado` succeeds and preserves plan data.
  - Update `apps/backend/src/routes/plans.test.ts` to verify `POST /api/plans/:id/cancel` succeeds on draft plans.

### Frontend
- **UI (`apps/frontend/src/components/domain/PlanCard.tsx`)**:
  - Expose the "Cancelar plan" action on draft plan cards for plan owners (alongside "Confirmar plan").
- **Unit Tests (`apps/frontend/src/components/domain/PlanCard.test.tsx`)**:
  - Add unit test verifying that draft plans offer a cancellation option and trigger the cancellation dialog.

## Capabilities

### Modified Capabilities
- `plan-state-machine`: Extends valid cancellation transitions to include `borrador → cancelado`.
- `plans`: Enables cancellation endpoint and UI controls for draft plans.

## Impact
- Backend: `apps/backend/src/lib/planState.ts`, `apps/backend/src/lib/planState.test.ts`, `apps/backend/src/routes/plans.ts`, `apps/backend/src/routes/plans.test.ts`.
- Frontend: `apps/frontend/src/components/domain/PlanCard.tsx`, `apps/frontend/src/components/domain/PlanCard.test.tsx`.
