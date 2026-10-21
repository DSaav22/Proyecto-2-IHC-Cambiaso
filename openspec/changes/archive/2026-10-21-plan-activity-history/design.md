# Design: Plan Activity History

## Architecture Decisions

### 1. Database Model (`schema.prisma`)

Add a new model `PlanActivity` to store activity events:

```prisma
model PlanActivity {
  id            String   @id @default(uuid())
  planId        String
  userId        String
  action        String   // 'created' | 'confirmed' | 'cancelled' | 'joined' | 'left'
  previousState String?
  newState      String?
  metadata      Json?
  createdAt     DateTime @default(now())

  plan          Plan     @relation(fields: [planId], references: [id], onDelete: Cascade)
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([planId, createdAt])
}
```

Update `User` and `Plan` models to define the corresponding relation `activities PlanActivity[]`.

### 2. Backend Service (`activity.service.ts`)

Create a dedicated `activity.service.ts` to keep clean architecture:

- `recordActivity(db, { planId, userId, action, previousState, newState, metadata })`:
  Creates an activity record in `PlanActivity`. Wrapped gracefully so an activity log failure does not abort critical transaction paths unless required.
- `getUserActivity(db, userId, filter)`:
  Queries `PlanActivity` where `plan.userId == userId` OR `plan.members.some(m => m.userId == userId)`.
  Applies action filtering based on `tipo`:
  - `todos`: all actions
  - `estados`: `action in ['confirmed', 'cancelled']`
  - `creaciones`: `action in ['created']`
  - `participacion`: `action in ['joined', 'left']`
  Orders results by `createdAt: 'desc'`.
  Includes plan information (`titulo`, `estado`, `id`) and user information (`name`).

### 3. Backend Route & Lifecycle Hooks

- Mount `GET /api/plans/activity` in `apps/backend/src/routes/plans.ts` (or `activity.routes.ts` mounted under `/api/plans`).
- Validate `tipo` query param with Zod (`z.enum(["todos", "estados", "creaciones", "participacion"]).optional().default("todos")`).
- Trigger `recordActivity` in `PlansService` or store methods:
  - Inside `create(...)`: action `'created'`, `newState: 'pendiente'`, `metadata: { title }`
  - Inside `confirm(...)`: action `'confirmed'`, `previousState: 'pendiente'`, `newState: 'confirmado'`
  - Inside `cancel(...)`: action `'cancelled'`, `previousState: currentEstado`, `newState: 'cancelado'`
  - Inside `join(...)`: action `'joined'`, `metadata: { title }`
  - Inside `leave(...)`: action `'left'`, `metadata: { title }`

### 4. Frontend Layer

- **API Client** (`apps/frontend/src/api/client.ts`):
  Add `getActivity(tipo?: string)` returning `Promise<ActivityEvent[]>`.
- **Domain Component** (`apps/frontend/src/components/domain/ActivityCard.tsx`):
  Renders the 4 dimensions:
  1. Action title & icon (Calendar/Check/X/User icon).
  2. Timestamp (absolute formatted date and relative time "Hace X min").
  3. Status badge (`Pendiente`, `Confirmado`, `Cancelado`).
  4. Plan title with direct clickable navigation (`/mis-planes`).
- **Page Component** (`apps/frontend/src/pages/ActivityHistoryPage.tsx`):
  - 4 thematic filter chips (`Todos`, `Estados`, `Creaciones`, `Participación`) using Hick's Law ($n=4$).
  - Activity list container rendering `ActivityCard` items.
  - Empty state when `activities.length === 0`, providing a message and a "Crear un plan" button.
- **Navbar Integration** (`apps/frontend/src/components/domain/Navbar.tsx`):
  - Add link "Historial" with accessible minimum touch target $\ge 44$px adhering to Fitts's Law.
- **App Routing** (`apps/frontend/src/App.tsx`):
  - Register route `/historial` wrapped in `ProtectedRoute`.

### 5. Interaction Decisions & HCI Constraints

- **Fitts's Law**: $T = a + b \log_2(2D/W)$. Increasing touch target width/height ($W \ge 44$px) and placing the entry point in the global top navigation reduces acquisition time $T$.
- **Hick's Law**: $T = b \log_2(n+1)$. Grouping event types into $n=4$ thematic chips drastically reduces decision latency compared to a free-form filter or nested menus.
- **Cognitive Load ($7 \pm 2$)**: The user does not need to cross-reference multiple views or remember previous states; each `ActivityCard` explicitly renders what changed, when, the outcome, and the affected entity.

### 6. Vitest Testing Plan (Rule 8: $\ge 4$ tests per file)

- **Backend Tests** (`apps/backend/src/services/activity.service.test.ts`):
  1. `recordActivity`: successfully creates a persistent activity record.
  2. `getUserActivity`: isolates activities (user cannot see other users' private plan activities).
  3. `getUserActivity`: orders results by `createdAt` descending.
  4. `getUserActivity`: correctly filters by `tipo: "estados"` and `tipo: "creaciones"`.
- **Frontend Tests** (`apps/frontend/src/pages/ActivityHistoryPage.test.tsx`):
  1. Renders the 4 dimensions on an activity card.
  2. Switches filter chips and updates query parameter / active state.
  3. Renders empty state message and "Crear un plan" CTA when no activities exist.
  4. Ensures "Historial" navigation link meets $\ge 44$px accessible target standards.
