## Why

Plans currently only feature a description and a due date. In order to improve plan management and allow users to clearly identify and search plans by a concise name, the `Plan` model requires a distinct `titulo` (title) attribute (min 3, max 100 characters), while keeping `description` mandatory for detailed information.

## What Changes

- Add a required `titulo` field (`String`, length 3-100) to the `Plan` model in `apps/backend/prisma/schema.prisma`.
- Generate and apply a new Prisma database migration adding the `titulo` column (with a fallback default for existing rows if needed).
- Update backend validation schemas in `apps/backend/src/lib/schemas.ts` to validate `titulo` (trim, min 3, max 100, required) and retain `description` as required.
- Update `apps/backend/src/services/plans.service.ts` and `apps/backend/src/routes/plans.ts` to persist, update, and serialize `titulo`.
- Update frontend client interfaces `Plan` and `PlanInput` in `apps/frontend/src/api/client.ts`.
- Update `apps/frontend/src/components/domain/PlanForm.tsx` to include an input for "Título" with validations and error feedback.
- Update `apps/frontend/src/components/domain/PlanCard.tsx` to render the title clearly above the description.
- Add and update unit tests with Vitest (at least 4 tests per relevant file in backend and frontend).

## Capabilities

### Modified Capabilities
- `plans`: adds the required `titulo` attribute to plan creation, editing, storage, and card presentation alongside the existing `description`.

## Impact

- Database: New Prisma migration in `apps/backend/prisma/migrations/` adding `titulo` column to `Plan`.
- Backend: `schema.prisma`, `schemas.ts`, `plans.service.ts`, `plans.ts`, and their Vitest test suites.
- Frontend: `client.ts`, `PlanForm.tsx`, `PlanCard.tsx`, `usePlans.ts` (if needed), and their Vitest test suites.
