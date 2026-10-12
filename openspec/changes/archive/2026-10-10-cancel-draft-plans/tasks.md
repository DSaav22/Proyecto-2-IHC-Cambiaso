## 1. Backend: State Machine & Services

- [x] 1.1 Update `cancelPlan` in `apps/backend/src/lib/planState.ts` to permit transition from `borrador` as well as `confirmado`
- [x] 1.2 Update unit tests in `apps/backend/src/lib/planState.test.ts` to verify `borrador → cancelado`
- [x] 1.3 Update error response message in `apps/backend/src/routes/plans.ts` for cancelled plans
- [x] 1.4 Update endpoint tests in `apps/backend/src/routes/plans.test.ts` to verify cancelling a draft plan returns 200

## 2. Frontend: UI & PlanCard

- [x] 2.1 Update `PlanCard.tsx` to display "Cancelar plan" button on draft plans for plan owners
- [x] 2.2 Update `PlanCard.test.tsx` to verify "Cancelar plan" is available and clickable on draft cards

## 3. Verification

- [x] 3.1 Run Vitest backend tests (`pnpm --filter backend test`)
- [x] 3.2 Run Vitest frontend tests (`pnpm --filter frontend test`)
- [x] 3.3 Run build check (`pnpm build`)
