# Proposal: Salida de emergencia para invitados en planes compartidos (H3 / Sub-issue #18)

## Why

Un invitado que se unió a un plan por código solo ve una nota de solo lectura: no existe acción para salir del plan, ni en la interfaz ni en la API (`PlanMember` solo se crea en `joinByCode`; `DELETE /api/plans/:id` responde `403` al invitado). Viola la heurística H3 de Nielsen (Control y libertad del usuario, severidad 3 - Mayor). Refs #16.

## What Changes

- Backend: `PlansStore.leave(userId, planId)` y `POST /api/plans/:id/leave`, que elimina solo la fila `PlanMember` del invitado.
  - `200` `{ message: "Has abandonado el plan." }`.
  - Creador: `403` `{ message: "El creador no puede abandonar su propio plan" }`.
  - No miembro o plan inexistente: `404` `{ message: "Plan no encontrado" }`.
- Frontend: `api.leavePlan`, `usePlans.leavePlan`; `PlanCard` recibe `onLeave` y muestra el menú (⋮) al invitado con «Abandonar plan» (destructiva) y `ConfirmDialog`; `PlanList` lo propaga; `MyPlansPage.handleLeave` muestra el aviso «Has abandonado el plan.». Si falla, el diálogo queda abierto con el error.
- Pruebas unitarias (Vitest); evidencia `docs/evidencias/H3-antes.png` / `H3-despues.png`; sección H3 de `docs/evaluacion-heuristica.md` en «Corregida».

**Nota de alcance:** el sub-issue #18 lista solo archivos de frontend, pero la acción requiere soporte de backend inexistente.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `plans`: nuevo requisito «Invitado abandona un plan» (API + UI con confirmación); se ajustan «Card actions menu» y «Read-only presentation on PlanCard for guests» (el invitado ve el menú solo con «Abandonar plan») y PLN-13 (refresco tras abandonar).

## Approach

- Abandono atómico: `plan.findUnique({ select: { userId } })` → chequeo de creador (`403`) → `planMember.deleteMany({ where: { planId, userId } })`; `count === 0` → `404`. Sin carrera find/delete; no miembro indistinguible de plan inexistente.
- Ruta `POST /:id/leave`, consistente con `/:id/confirm` y `/:id/cancel`.
- El invitado puede abandonar en cualquier estado del plan; la nota de solo lectura se mantiene.

## Impact

| Área | Impacto |
|------|---------|
| `apps/backend/src/services/plans.service.ts` (+ test) | `leave` en interfaz e implementación Prisma; ampliar mock con `plan.findUnique` y `planMember.deleteMany` |
| `apps/backend/src/routes/plans.ts` (+ test) | Ruta nueva; `createMemoryStore` implementa `leave` |
| `apps/backend/src/routes/auth.recover.test.ts` | El literal `plansStore` implementa `leave` |
| `apps/frontend/src/api/client.ts`, `hooks/usePlans.ts` (+ test) | `leavePlan` |
| `apps/frontend/src/components/domain/PlanCard.tsx` (+ test), `PlanList.tsx`, `pages/MyPlansPage.tsx` | Menú, diálogo y aviso |
| `docs/evaluacion-heuristica.md`, `docs/evidencias/H3-*.png` | Evidencia y estado |

Sin cambios de esquema Prisma, migraciones ni dependencias nuevas.

## Risks

| Riesgo | Mitigación |
|--------|------------|
| Implementadores o mocks de `PlansStore` sin `leave` rompen typecheck | Actualizar los tres implementadores y el mock |
| `PlanCard.test.tsx:350` afirma que el invitado no tiene menú | Reescribirlo; revisar `PlanList.test.tsx` y `MyPlansPage.test.tsx` |
| Perder `H3-antes.png` tras cambiar la UI | Capturarla antes de aplicar el cambio de UI |

## Out of Scope

- Expulsar invitados, transferir la propiedad, notificar al creador.
- Corregir la deriva previa del mensaje «Solo el creador puede modificar este plan».

## Rollback Plan

Revertir el commit único `fix: add leave plan emergency exit for guest members (Closes #18, Refs #16)`. Sin migración, no hay datos que restaurar.

## Success Criteria

- [ ] Un invitado abandona un plan tras confirmar y este desaparece de su lista sin recargar.
- [ ] El creador recibe `403`; un no miembro, `404`.
- [ ] Tests de backend y frontend en verde (mínimo 4 por archivo nuevo).
- [ ] Evidencias H3 presentes y H3 marcada «Corregida».
