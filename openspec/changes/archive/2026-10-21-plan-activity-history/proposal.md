# Proposal: Plan Activity History

## Why

Users in Planazo currently cannot audit or understand what changes happened to their plans over time. When a plan transitions to "confirmado" or "cancelado", or when members join or details are edited, the user has no timeline or log answering: **¿Qué cambios tuvo el plan y cuándo?**

Without an activity history, users suffer unnecessary cognitive load (trying to recall states from memory) and lack motor efficiency to navigate directly to their event timelines (Clase 16 · Tarea 4 / Issue #24).

This change introduces a persistent, isolated, and ergonomic Activity History system structured across 4 atomic sub-issues:

- **Sub-issue #25 (Datos)**: `PlanActivity` persistence model and activity logging upon state transitions/actions.
- **Sub-issue #26 (Consulta)**: `GET /api/plans/activity` endpoint with strict user isolation, chronological ordering, and thematic filtering.
- **Sub-issue #27 (Interfaz)**: Dedicated `/historial` screen, ergonomic Navbar access ($\ge 44$px, Fitts's Law), thematic filter chips ($n=4$, Hick's Law), autonomous 4-dimensional event cards (Cognitive Load reduction), and reassuring empty state.
- **Sub-issue #28 (Pruebas y Evidencias)**: Comprehensive Vitest test suite ($\ge 4$ tests per test file) and documentation in `docs/decisiones-interaccion.md`.

## What Changes

### Backend & Database

- Introduce `PlanActivity` model in `apps/backend/prisma/schema.prisma` with relations to `Plan` and `User`.
- Create database migration for `PlanActivity`.
- Implement `apps/backend/src/services/activity.service.ts` exposing `recordActivity(...)` and `getUserActivity(userId, filter)`.
- Hook `recordActivity` into existing plan lifecycle events:
  - Plan creation (`created`)
  - Plan confirmation (`confirmed`)
  - Plan cancellation (`cancelled`)
  - Member join (`joined`)
  - Member leave (`left`)
- Implement `GET /api/plans/activity` with query parameter validation (`tipo`: `todos|estados|creaciones|participacion`), ensuring strict user isolation (only events from plans where the user is creator or member).

### Frontend

- Add `getActivity(filter)` client method in `apps/frontend/src/api/client.ts`.
- Implement `apps/frontend/src/components/domain/ActivityCard.tsx` presenting the 4 event dimensions:
  1. Action performed with contextual icon and label.
  2. Exact and relative time formatted in Spanish (e.g., "Hace 10 min", "21 oct 2026, 11:30").
  3. Resulting state / outcome badge.
  4. Associated plan name with direct navigation link.
- Implement `apps/frontend/src/pages/ActivityHistoryPage.tsx` at route `/historial` with:
  - Filter chips (Todos, Estados, Creaciones, Participación) governed by Hick's Law.
  - Informative empty state with a call-to-action to create a plan.
- Update `apps/frontend/src/components/domain/Navbar.tsx` to include an accessible "Historial" navigation link with a target area $\ge 44$px adhering to Fitts's Law.
- Register `/historial` route in `apps/frontend/src/App.tsx`.

### Tests & Documentation

- Add Vitest tests in `apps/backend/src/services/activity.service.test.ts` ($\ge 4$ tests covering persistence, isolation, filtering, and ordering).
- Add Vitest tests in `apps/frontend/src/pages/ActivityHistoryPage.test.tsx` ($\ge 4$ tests covering 4 dimensions rendering, filter chip toggles, Fitts target sizing, and empty state).
- Document design decisions, before/after contrasts, and screenshots in `docs/decisiones-interaccion.md` per `docs/internal/guia-decisiones-interaccion-tarea-4.md`.

## Capabilities

### Added Capabilities

- `plan-activity-history`: Persistent event tracking, isolated query API, and dedicated UI with ergonomic interaction decisions.

### Modified Capabilities

- `plans`: Emits activity events upon creation, state change (confirm/cancel), and membership change (join/leave).
- `app-navbar`: Adds direct accessible link to `/historial` with touch target $\ge 44$px.

## Impact

- **Database**: New table `PlanActivity` in PostgreSQL with indexes on `(userId, createdAt)` and `(planId, createdAt)`.
- **Backend API**: New route `GET /api/plans/activity` mounted in `apps/backend/src/routes/plans.ts` or dedicated `activity.ts`.
- **Frontend Routing**: New page `/historial` protected by authentication session.
- **Dependencies**: None; uses existing Prisma, Express, React, and Vitest setup.
