## 1. Backend: Prisma Schema & Migration

- [x] 1.1 Update `apps/backend/prisma/schema.prisma` with `shareCode` in `Plan` and create `PlanMember` model
- [x] 1.2 Create and apply Prisma migration for `shareCode` and `PlanMember` (or update database schema in dev)
- [x] 1.3 Update database seed to include test plans with share codes and test memberships if needed

## 2. Backend: Service & Share Code Utility

- [x] 2.1 Implement `apps/backend/src/lib/shareCode.ts` utility to generate collision-resistant uppercase share codes (`PLZ-XXXXXX`)
- [x] 2.2 Update `PlansStore` interface and `createPrismaPlansStore` in `apps/backend/src/services/plans.service.ts`:
  - Auto-generate `shareCode` on plan creation
  - Implement `joinByCode(userId: string, code: string)`
  - Update `list(userId: string)` to return both owned and joined plans with `isOwner` and `ownerName`
  - Update `update`, `confirm`, `cancel`, and `delete` to verify ownership and reject unauthorized members

## 3. Backend: Endpoints & Routing

- [x] 3.1 Implement `POST /api/plans/join` route in `apps/backend/src/routes/plans.ts` with validation and error handling (400, 404, 409)
- [x] 3.2 Update mutation routes (`PUT /:id`, `POST /:id/confirm`, `POST /:id/cancel`, `DELETE /:id`) to enforce 403 Forbidden when a non-creator attempts modifications
- [x] 3.3 Add unit tests in `apps/backend/src/routes/plans.test.ts` (at least 6 new unit tests for join endpoint and 403 access control)

## 4. Frontend: API Client & usePlans Hook

- [x] 4.1 Update `Plan` interface in `apps/frontend/src/api/client.ts` with `shareCode`, `isOwner`, and `ownerName`
- [x] 4.2 Add `api.joinPlan(code: string)` to `apps/frontend/src/api/client.ts`
- [x] 4.3 Update `apps/frontend/src/hooks/usePlans.ts` to include `joinPlan` method and maintain state

## 5. Frontend: UI Components

- [x] 5.1 Create `JoinPlanDialog.tsx` component in `apps/frontend/src/components/domain/` with accessible form, input formatting, and error feedback
- [x] 5.2 Add "Unirse con código" button to `apps/frontend/src/pages/MyPlansPage.tsx` and connect `JoinPlanDialog`
- [x] 5.3 Update `apps/frontend/src/components/domain/PlanCard.tsx`:
  - Show "Creador" badge, share code, and "Copiar código" button when `isOwner: true`
  - Show "Invitado" badge and "Creado por: {ownerName}" when `isOwner: false`
  - Hide "Confirmar plan" button and "Eliminar" menu item when `isOwner: false`

## 6. Frontend: Unit Tests & Verification

- [x] 6.1 Add unit tests for `JoinPlanDialog.test.tsx` (open/close, valid code submission, error display)
- [x] 6.2 Update `PlanCard.test.tsx` and `usePlans.test.tsx` testing creator vs guest read-only view
- [x] 6.3 Run Vitest backend tests (`pnpm --filter backend test`)
- [x] 6.4 Run Vitest frontend tests (`pnpm --filter frontend test`)
- [x] 6.5 Run build check (`pnpm build`)
