# Exploration: plan-activity-history (Issue #24 / Sub-issues #25, #26, #27, #28)

## Verified Codebase Facts

1. **Prisma & Data Layer**:
   - `apps/backend/prisma/schema.prisma` currently has `User`, `Plan`, and `PlanMember`.
   - `Plan` has relation to `User` (`userId`), and `PlanMember` handles guest memberships with `@@unique([planId, userId])`.
   - Adding `PlanActivity` requires an explicit migration via `pnpm --filter backend prisma migrate dev --name add_plan_activity`.
   - Foreign keys to `Plan` and `User` with `onDelete: Cascade` ensure referential integrity when plans or users are deleted.

2. **Backend Plans Architecture**:
   - State transitions and CRUD are encapsulated in `apps/backend/src/services/plans.service.ts` (`create`, `confirm`, `cancel`, `joinByCode`, `leave`, `update`, `delete`).
   - `PlansStore` is implemented by `createPrismaPlansStore` (production), `createMemoryStore` in `routes/plans.test.ts`, and the mock in `routes/auth.recover.test.ts`.
   - Adding activity logging directly in `plans.service.ts` or delegating to a dedicated `activity.service.ts` allows logging to be executed transactionally or as a side-effect without breaking mock stores.

3. **Query & Isolation**:
   - Plans query logic (`buildWhere`) scopes plans by creator `userId` OR membership `members: { some: { userId } }`.
   - Activity query `GET /api/plans/activity` must apply the exact same owner-or-member isolation: an activity is visible to user $U$ if and only if $U$ created the plan or is an accepted member of the plan.

4. **Frontend Architecture & Navigation**:
   - `apps/frontend/src/components/domain/Navbar.tsx` currently renders links for "Mis Planes" and user authentication buttons.
   - Adding "Historial" requires an accessible `<NavLink>` with `min-h-[44px]` / padding conforming to Fitts's Law.
   - The route `/historial` must be registered in `apps/frontend/src/App.tsx` wrapped in `<ProtectedRoute>`.
   - The UI requires 4 chips ($n=4$) for thematic event filtering: "Todos", "Estados", "Creaciones", "Participación" (Hick's Law).

5. **Existing Evidence Baseline**:
   - Before modifying the frontend, `docs/evidencias/historial/` has captured initial "antes" screenshots:
     - `Fitts-antes.jpeg`: Navbar without direct Historial access.
     - `Hick-antes.jpeg`: Views without structured thematic event chips.
     - `Carga-Cognitiva-antes-P1.jpeg`..`P4.jpeg` / `P3.png`: Step-by-step sequence (P1: Initial card, P2: Confirm dialog, P3: Full screen after update, P4: Focused card lacking temporal trace/audit).
   - Delivery will update `docs/decisiones-interaccion.md` with before/after comparisons and code snippets.

## Review & Delivery Strategy

- 4 atomic Sub-issues (#25, #26, #27, #28) with isolated PRs/commits into `master`.
- 1 final direct commit to `master` for documentation (`docs/decisiones-interaccion.md`), evidence assets, and OpenSpec archive/sync.
