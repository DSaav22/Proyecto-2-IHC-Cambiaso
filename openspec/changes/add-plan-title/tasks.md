## 1. Backend: Schema and Migration

- [x] 1.1 Update `apps/backend/prisma/schema.prisma` adding `titulo String @default("")` to `Plan`
- [x] 1.2 Generate Prisma migration `add_plan_title` in `apps/backend/prisma/migrations`
- [x] 1.3 Add backend schema unit tests in `apps/backend/src/lib/schemas.test.ts` for `titulo` validation (min 3, max 100, required, trimming)
- [x] 1.4 Update `apps/backend/src/lib/schemas.ts`, `apps/backend/src/services/plans.service.ts`, and `apps/backend/src/routes/plans.ts` to validate, store, update, and serialize `titulo`
- [x] 1.5 Update backend tests in `apps/backend/src/routes/plans.test.ts` to cover `titulo` in create, update, and list endpoints

## 2. Frontend: Client Types and Form

- [x] 2.1 Update `Plan` and `PlanInput` types in `apps/frontend/src/api/client.ts` to include `titulo`
- [x] 2.2 Update `apps/frontend/src/components/domain/PlanForm.tsx` to include a "Título" input with min 3 and max 100 characters validation
- [x] 2.3 Update unit tests in `apps/frontend/src/components/domain/PlanForm.test.tsx` to verify title input, validation errors, and submission

## 3. Frontend: PlanCard Display

- [x] 3.1 Update `apps/frontend/src/components/domain/PlanCard.tsx` to display `plan.titulo` prominently as heading above description
- [x] 3.2 Update unit tests in `apps/frontend/src/components/domain/PlanCard.test.tsx` to verify title rendering

## 4. Verification and Build

- [x] 4.1 Run Vitest tests on backend (`pnpm --filter backend test`) and confirm all pass
- [x] 4.2 Run Vitest tests on frontend (`pnpm --filter frontend test`) and confirm all pass
- [x] 4.3 Verify full monorepo typecheck and build (`pnpm build`)
