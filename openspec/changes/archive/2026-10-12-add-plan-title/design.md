## Context

Plans currently consist of `id`, `description`, `dueDate`, `estado`, `shareCode`, `userId`, `createdAt`. Users need to identify their plans with a title (`titulo`) of 3 to 100 characters, in addition to the detailed description.

## Design Decisions

### 1. Database Model & Migration
In `apps/backend/prisma/schema.prisma`:
```prisma
model Plan {
  id          String       @id @default(uuid())
  titulo      String       @default("")
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
```

Migration:
```sql
ALTER TABLE "Plan" ADD COLUMN "titulo" TEXT NOT NULL DEFAULT '';
```

### 2. Backend Validation & Service Layer
In `apps/backend/src/lib/schemas.ts`:
- Validate `titulo`:
  ```typescript
  titulo: z
    .string({ required_error: "El título es obligatorio", invalid_type_error: "El título es obligatorio" })
    .trim()
    .min(3, "El título debe tener al menos 3 caracteres")
    .max(100, "El título debe tener máximo 100 caracteres"),
  ```
- Keep `description` required:
  ```typescript
  description: z
    .string({ required_error: "La descripción es obligatoria", invalid_type_error: "La descripción es obligatoria" })
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(500, "La descripción debe tener máximo 500 caracteres"),
  ```

In `apps/backend/src/services/plans.service.ts`:
- Update `StoredPlan` interface to include `titulo: string`.
- Update `create` and `update` methods to store and update `titulo`.

In `apps/backend/src/routes/plans.ts`:
- Update `serialize(plan: StoredPlan)` to include `titulo: plan.titulo`.

### 3. Frontend Types and Form
In `apps/frontend/src/api/client.ts`:
- Update `Plan` interface:
  ```typescript
  export interface Plan {
    id: string;
    titulo: string;
    description: string;
    dueDate: string;
    estado: PlanStatus;
    createdAt: string;
    shareCode?: string;
    isOwner?: boolean;
    ownerName?: string;
  }
  ```
- Update `PlanInput`:
  ```typescript
  export interface PlanInput {
    titulo: string;
    description: string;
    dueDate: string;
  }
  ```

In `apps/frontend/src/components/domain/PlanForm.tsx`:
- Add state for `titulo`.
- Add validation: `titulo.trim().length >= 3` and `<= 100`.
- Add an input field for "Título" before the description input.

### 4. Frontend Card Display
In `apps/frontend/src/components/domain/PlanCard.tsx`:
- Display `plan.titulo` as the primary heading (`<h3>`) with bold styling.
- Display `plan.description` as the secondary body text.

### 5. Testing Strategy
- Backend:
  - Unit tests in `apps/backend/src/lib/schemas.test.ts` verifying validation for `titulo` (length < 3, length > 100, valid values, trimming).
  - Route tests in `apps/backend/src/routes/plans.test.ts` verifying `titulo` in create, update, and list endpoints.
- Frontend:
  - Tests in `apps/frontend/src/components/domain/PlanForm.test.tsx` verifying validation errors on `titulo` and submission payload.
  - Tests in `apps/frontend/src/components/domain/PlanCard.test.tsx` verifying that `titulo` is rendered properly.
