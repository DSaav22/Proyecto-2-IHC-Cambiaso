# Proposal: Share Plans by Code with Read-Only Access for Guests

## Why

Currently, plans in Planazo are strictly isolated per user: each user can only see and manage plans they created. However, the core vision of Planazo is "helping a group organize a plan" ("Ayudar a un grupo a organizar un plan").

To enable group collaboration without introducing unnecessary role-system complexity:
1. When a user creates a plan, the system generates a unique, human-readable share code.
2. The creator can share this code with friends or group members.
3. Other signed-in users can enter the code to join the plan and see it in their plans list.
4. Members who joined via code have **strictly read-only access**: they can view the plan details, description, due date, and status, but **cannot** edit the plan, change its state, confirm it, or delete it.
5. Only the creator retains management permissions (edit, confirm, delete).

## What Changes

### Backend
- **Prisma Schema**:
  - Add `shareCode String @unique` to `Plan` model.
  - Add `PlanMember` model (`id`, `planId`, `userId`, `joinedAt`) with compound unique constraint `@@unique([planId, userId])` and foreign keys cascading on delete.
  - Create migration or migration script for the new model and field.
- **Plan Service (`plans.service.ts`)**:
  - Helper to generate unique, clean uppercase codes (e.g., `PLZ-XXXX`).
  - Auto-generate `shareCode` when a plan is created.
  - Add `joinByCode(userId: string, code: string): Promise<StoredPlan>`:
    - Finds plan by `shareCode`. Returns 404 if not found.
    - If user is already the owner, reject (user cannot join their own plan).
    - If user already joined, reject duplicate membership.
    - Creates `PlanMember` record and returns the plan.
  - Update `list(userId: string)` to query plans owned by `userId` OR where `userId` is in `members`.
  - Return metadata: `isOwner: boolean`, `shareCode?: string`, `ownerName: string`.
  - Enforce ownership in `update`, `confirm`, `cancel`, and `delete`: if the requester is not the creator, reject with a forbidden/authorization error.
- **Routes (`routes/plans.ts`)**:
  - `POST /api/plans/join`: endpoint receiving `{ code: string }`. Validates input, calls `store.joinByCode`, responds `200` with the serialized plan, or appropriate error (`400`, `404`, `409`).
  - Update `PUT /api/plans/:id`, `POST /api/plans/:id/confirm`, and `DELETE /api/plans/:id` to respond `403 Forbidden` if a member (non-owner) attempts to mutate or delete the plan.
- **Unit Tests**:
  - Add at least 4 unit tests covering join by code (successful join, invalid code, owner joining self, duplicate join, unauthorized mutation attempts).

### Frontend
- **API Client (`client.ts`)**:
  - Update `Plan` interface with `isOwner: boolean`, `shareCode?: string`, `ownerName?: string`.
  - Add `joinPlan(code: string): Promise<{ plan: Plan }>` to `api` object.
- **Hook (`usePlans.ts`)**:
  - Expose `joinPlan(code: string): Promise<void>` which calls the API and appends the joined plan to state.
- **UI Components**:
  - **Join Plan Dialog**: Accessible button and dialog ("Unirse con código") in `MyPlansPage` allowing users to paste/type a code.
  - **Plan Card (`PlanCard.tsx`)**:
    - Display ownership badge: "Creador" vs "Invitado (Solo lectura)".
    - For creator: display the share code with a quick copy button ("Copiar código"). Show action buttons ("Confirmar plan", menu with "Eliminar").
    - For guest: show "Creado por: {ownerName}". Do NOT show "Confirmar plan" button, edit actions, or delete actions.
- **Unit Tests**:
  - Add unit tests for the join modal/form and for `PlanCard` read-only presentation for guests.

## Capabilities

### Modified Capabilities
- `plans`: Adds share code generation, plan joining by code, unified listing of owned and joined plans, and read-only enforcement for guests.

## Impact
- Backend: `apps/backend/prisma/schema.prisma`, `apps/backend/src/services/plans.service.ts`, `apps/backend/src/routes/plans.ts`, and test files.
- Frontend: `apps/frontend/src/api/client.ts`, `apps/frontend/src/hooks/usePlans.ts`, `apps/frontend/src/components/molecules/PlanCard.tsx`, `apps/frontend/src/pages/MyPlansPage.tsx`, and test files.
