# Design: Share Plans by Code with Read-Only Access for Guests

## Architecture Decisions

### 1. Database Schema (Prisma)
In `apps/backend/prisma/schema.prisma`:
```prisma
model Plan {
  id          String       @id @default(uuid())
  description String
  dueDate     DateTime     @db.Date
  estado      String       @default("borrador")
  shareCode   String       @unique
  userId      String
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime     @default(now())
  members     PlanMember[]

  @@index([userId, dueDate])
}

model PlanMember {
  id        String   @id @default(uuid())
  planId    String
  userId    String
  joinedAt  DateTime @default(now())
  plan      Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([planId, userId])
  @@index([userId])
}
```

### 2. Share Code Generation
- Generate a 6-character clean uppercase alphanumeric code prefixed with `PLZ-` (e.g. `PLZ-7K9M2X`).
- Utility function in backend `lib/shareCode.ts` ensuring collision-free generation with retry logic.

### 3. Backend Service (`plans.service.ts`)
- **Plan creation**: Auto-assigns a `shareCode` during `create`.
- **Join by code**: `joinByCode(userId: string, code: string): Promise<StoredPlan>`:
  - Finds plan by uppercase trimmed `code`.
  - If not found -> throw `NotFoundError("Plan no encontrado")`.
  - If `plan.userId === userId` -> throw `ValidationError("Ya eres el creador de este plan")`.
  - If already in `members` -> throw `ConflictError("Ya te has unido a este plan")`.
  - Inserts into `PlanMember`.
  - Returns plan with member information.
- **List plans**:
  ```ts
  prisma.plan.findMany({
    where: {
      OR: [
        { userId },
        { members: { some: { userId } } }
      ]
    },
    include: {
      user: { select: { name: true } },
      members: { where: { userId }, select: { id: true } }
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }]
  });
  ```
- **Serialization**:
  ```ts
  {
    id: plan.id,
    description: plan.description,
    dueDate: toDateString(plan.dueDate),
    estado: plan.estado,
    createdAt: plan.createdAt.toISOString(),
    shareCode: plan.shareCode,
    isOwner: plan.userId === requesterId,
    ownerName: plan.user.name
  }
  ```
- **Authorization on Mutations**:
  - `update`, `confirm`, `cancel`, `delete`: verify `plan.userId === requesterId`. If the user is only a member or third-party, reject with `ForbiddenError` (HTTP 403).

### 4. Backend Endpoints (`routes/plans.ts`)
- `POST /api/plans/join`:
  - Body: `{ code: string }`.
  - Returns `200` with `{ plan: serialize(plan, user.id) }`.
  - Handles `400` (validation / creator cannot join), `404` (not found), `409` (already joined).
- Existing mutation endpoints (`PUT /:id`, `POST /:id/confirm`, `DELETE /:id`):
  - Check ownership before executing. Return `403` with `{ message: "Solo el creador puede modificar o eliminar este plan" }` if requester is not owner.

### 5. Frontend Client & Hook
- In `apps/frontend/src/api/client.ts`:
  - Expand `Plan` interface:
    ```ts
    export interface Plan {
      id: string;
      description: string;
      dueDate: string;
      estado: PlanStatus;
      createdAt: string;
      shareCode: string;
      isOwner: boolean;
      ownerName: string;
    }
    ```
  - Add `api.joinPlan(code: string): Promise<{ plan: Plan }>`.
- In `apps/frontend/src/hooks/usePlans.ts`:
  - Add `joinPlan(code: string)` that calls `api.joinPlan` and updates state without page reload.

### 6. Frontend UI
- **Toolbar in `MyPlansPage`**:
  - Beside "Nuevo plan", add an accessible secondary button: "Unirse con código".
  - Opens `JoinPlanDialog`: accessible modal dialog with input for code, submitting sends `joinPlan`.
- **`PlanCard` Adaptations**:
  - Top header:
    - If `plan.isOwner`:
      - Shows "Creador" badge.
      - Displays `shareCode` with a "Copiar código" button (with tooltip / copy feedback).
    - If `!plan.isOwner`:
      - Shows "Invitado" badge (subtle secondary role).
      - Shows "Creado por: {plan.ownerName}".
  - Action footer:
    - If `plan.isOwner`: Shows "Confirmar plan" button (when draft) and ⋮ menu with "Eliminar".
    - If `!plan.isOwner`: Actions are hidden or replaced with an indicator: "Solo lectura".

### 7. Vitest Testing Strategy (Rule 8: >= 4 tests per test file)
- **Backend Tests (`routes/plans.test.ts`)**:
  - Join plan with valid code succeeds (200) and adds plan to user's list.
  - Join plan with non-existent code returns 404.
  - Creator attempting to join their own plan returns 400.
  - Joining an already joined plan returns 409.
  - Guest attempting to confirm plan receives 403 Forbidden.
  - Guest attempting to delete plan receives 403 Forbidden.
- **Frontend Tests (`PlanCard.test.tsx`, `usePlans.test.tsx`, `JoinPlanDialog.test.tsx`)**:
  - `PlanCard` renders share code and copy button for creator.
  - `PlanCard` does NOT render "Confirmar plan" or delete actions for guest.
  - `PlanCard` displays guest badge and owner name when `isOwner: false`.
  - `JoinPlanDialog` handles code submission and error display.
