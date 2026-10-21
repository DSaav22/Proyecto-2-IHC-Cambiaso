## 1. Sub-issue #25: Data · PlanActivity Model, Persistence and Event Logging (PR 1)

- [x] 1.1 Add `PlanActivity` model in `apps/backend/prisma/schema.prisma` with relations to `User` (cascade delete) and `Plan` (SetNull on delete), including snapshot fields `planTitle`, `action`, `details`, and `@@index([userId, createdAt(sort: Desc)])`
- [x] 1.2 Generate and version Prisma database migration via `pnpm --filter backend prisma migrate dev --name add_plan_activity`
- [x] 1.3 Implement `recordActivity` in `apps/backend/src/services/plans.service.ts` (or `activity.service.ts`) capturing actions: `created`, `confirmed`, `cancelled`, `edited`, `joined`, `left`
- [x] 1.4 Instrument plan lifecycle methods in `plans.service.ts` (`createPlan`, `confirmPlan`, `cancelPlan`, `updatePlan`, `joinPlan`, `leavePlan`) to persist activity records
- [x] 1.5 Run `pnpm verify-subissue 25` to validate criteria, absence of AI attribution and tests
- [x] 1.6 Commit: `feat(backend): agregar modelo PlanActivity y registro de eventos (Closes #25, Refs #24)`

## 2. Sub-issue #26: Query · GET /api/plans/activity Endpoint and User Isolation (PR 2)

- [x] 2.1 Implement `getUserActivity(userId, options)` service method with strict `userId` isolation, descending chronological ordering, and action filtering
- [x] 2.2 Expose authenticated HTTP endpoint `GET /api/plans/activity` in `apps/backend/src/routes/plans.ts`
- [x] 2.3 Define and export activity response schemas and TypeScript interfaces in `apps/backend/src/lib/schemas.ts` (Zod schemas, mirrored in `apps/frontend/src/api/client.ts`)
- [x] 2.4 Verify endpoint authentication (401 when unauthorized) and isolation (no cross-user activity leak)
- [x] 2.5 Run `pnpm verify-subissue 26` to validate criteria, absence of AI attribution and tests
- [x] 2.6 Commit: `feat(backend): agregar endpoint GET /api/plans/activity y aislamiento por usuario (Closes #26, Refs #24)`

## 3. Sub-issue #27: Interface · /historial Screen, Empty State and Fitts/Hick/Cognitive Load Decisions (PR 3)

- [x] 3.1 Implement authenticated HTTP call `getActivity(filter?: string)` in `apps/frontend/src/api/client.ts`, consumed through the `apps/frontend/src/hooks/useActivity.ts` hook
- [x] 3.2 Create `apps/frontend/src/components/domain/ActivityCard.tsx` rendering the 4 dimensions (action icon/title, relative/exact time, state badge, plan title with direct link)
- [x] 3.3 Create `apps/frontend/src/pages/ActivityHistoryPage.tsx` with thematic filter chips ($n=4$, Hick's Law), event timeline, and empty state with primary CTA
- [x] 3.4 Add "Historial" navigation link in `apps/frontend/src/components/domain/Navbar.tsx` with touch target $\ge 44$px (Fitts's Law)
- [x] 3.5 Register protected route `/historial` in `apps/frontend/src/App.tsx`
- [x] 3.6 Run `pnpm verify-subissue 27` to validate criteria, absence of AI attribution and tests
- [x] 3.7 Commit: `feat(frontend): implementar pantalla de historial con filtros y acceso Fitts (Closes #27, Refs #24)`

## 4. Sub-issue #28: Tests and Evidence · Vitest Unit Tests and Interaction Decisions Documentation (PR 4)

- [x] 4.1 Create `apps/backend/src/services/activity.service.test.ts` with $\ge 4$ tests (persistence on plan creation, persistence on confirm/cancel, user isolation, chronological order and action filtering)
- [x] 4.2 Create `apps/frontend/src/pages/ActivityHistoryPage.test.tsx` with $\ge 4$ tests (4 dimensions rendering, empty state CTA, chip selection filtering, Fitts touch target sizing)
- [x] 4.3 Run Vitest test suites (`pnpm --filter backend test` & `pnpm --filter frontend test`) confirming 100% pass rate
- [x] 4.4 Run `pnpm verify-subissue 28` to validate criteria, absence of AI attribution and tests
- [x] 4.5 Commit: `test: agregar pruebas unitarias y documentar decisiones de interacción (Closes #28, Refs #24)`

## 5. Deliverables and Closure · IHC Documentation and OpenSpec Sync (Direct Commit to master)

- [x] 5.1 Store and verify all before/after evidence captures in `docs/evidencias/historial/` (`Fitts-antes.jpeg`, `Fitts-despues.jpeg`, `Hick-antes.jpeg`, `Hick-despues.jpeg`, `Carga-Cognitiva-antes-P1.jpeg`..`P4.jpeg`, `Carga-Cognitiva-despues.jpeg`, `Estado-Vacio-despues.jpeg`)
- [x] 5.2 Complete `docs/decisiones-interaccion.md` with theoretical justifications (Fitts, Hick, Cognitive Load), code references, and screenshot links
- [x] 5.3 Sync delta specification into main specifications (`openspec sync`)
- [x] 5.4 Archive change with OpenSpec (`openspec archive plan-activity-history`)
- [x] 5.5 Commit: `docs: registrar evidencias de interacción y sincronizar especificación OpenSpec (Refs #24)`
- [x] 5.6 Confirm that parent issue #24 remains OPEN for teacher evaluation
