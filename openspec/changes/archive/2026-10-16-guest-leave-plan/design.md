# Design: Salida de emergencia para invitados en planes compartidos (H3 / Sub-issue #18)

## Context

La membresía vive en `PlanMember` (`@@unique([planId, userId])`, cascada desde `Plan`) y solo `joinByCode` la crea. `PlansStore` (`plans.service.ts:155`) tiene 8 métodos; las rutas mapean `ForbiddenPlanActionError` a `403` y `null`/`false` a `404 { message: "Plan no encontrado" }`. En `PlanCard.tsx:112` el menú (⋮) solo se renderiza si `isOwner`; el invitado ve una nota `role="note"`. Motivación en proposal.md.

## Goals / Non-Goals

**Goals:** salida con confirmación coherente con `confirm`/`cancel`/`delete`; capas de `ARCHITECTURE.md`; reutilizar `ConfirmDialog`, `DropdownMenu` y `SuccessNotice`.

**Non-Goals:** expulsar invitados, transferir propiedad, notificar al creador, cambios de esquema o migraciones.

## Decisions

| # | Opción elegida | Alternativa descartada | Motivo |
|---|---|---|---|
| 1 | `POST /api/plans/:id/leave` → `200 { message: "Has abandonado el plan." }` | `DELETE /:id/membership` | Sigue la convención `/:id/confirm` y `/:id/cancel`, reutiliza `post()` del cliente y no se confunde con `DELETE /:id` (`api.deletePlan` usa `del`). Menos REST estricto, aceptado. |
| 2 | `leave` atómico en el store (ver contrato) | find-then-delete; reutilizar `delete` con rama por rol | Find-then-delete (`planMember.findUnique` + `delete`) abre una carrera y lanza `P2025` si la fila desaparece. `deleteMany` con `count` es idempotente y no distingue no miembro de plan inexistente (`404`), igual que `confirm`/`cancel` con usuarios ajenos. Reutilizar `delete` mezcla reglas opuestas (borrar plan vs. desvincularse) y debilita la autorización estricta. |
| 3 | Ruta valida/mapea errores; servicio posee Prisma | Prisma en la ruta | `ARCHITECTURE.md` prohíbe consultas en `routes/`. La ruta lee `res.locals.user`, normaliza `req.params.id` como las demás y traduce `false`→`404`, `ForbiddenPlanActionError`→`403`. |
| 4 | `api.leavePlan` → `usePlans.leavePlan` (filtra `plans` + `void reload()`, clon de `deletePlan`) → `PlanList`/`PlanCard` `onLeave` → `MyPlansPage.handleLeave` | Ocultar la tarjeta solo en cliente | La membresía seguiría activa y el plan reaparecería al recargar. |
| 5 | Menú (⋮) para ambos roles; invitado: solo «Abandonar plan» destructivo | Botón «Abandonar» en el pie | `DESIGN.md` ubica acciones destructivas en ⋮ y evita botones grandes secundarios. La nota de solo lectura se mantiene. |
| 6 | Capturar `H3-antes.png` antes de tocar la UI | Recrearla luego | Tras el cambio la UI previa ya no existe sin revertir. |

## Interfaces / Contracts

```ts
/** Removes the caller's PlanMember row. Resolves false when the plan does not exist
 *  or the caller is not a member; throws ForbiddenPlanActionError for the creator. */
leave(userId: string, planId: string): Promise<boolean>;

// createPrismaPlansStore
leave: async (userId, planId) => {
  const plan = await prisma.plan.findUnique({ where: { id: planId }, select: { userId: true } });
  if (!plan) return false;
  if (plan.userId === userId)
    throw new ForbiddenPlanActionError("El creador no puede abandonar su propio plan");
  const { count } = await prisma.planMember.deleteMany({ where: { planId, userId } });
  return count > 0;
},
```

Frontend: ``leavePlan: (id: string) => post<{ message: string }>(`/plans/${id}/leave`)``; `LeavePlanResult = { ok: true } | { ok: false; message: string }`; `OpenDialog` incorpora `"leave"`.

`ConfirmDialog` "leave": título «¿Abandonar este plan?»; descripción "«{titulo}» desaparecerá de tu lista. Podrás volver a unirte con el código de compartir." (`{titulo}` = `plan.titulo || plan.description`, como en los diálogos existentes); `confirmLabel` «Abandonar»; `pendingLabel` «Abandonando…»; `destructive`; `onConfirm={() => void run(onLeave)}`. El ítem usa `min-h-11` y `text-destructive`, igual que «Eliminar». `handleLeave` muestra «Has abandonado el plan.» en el toast existente o `setActionError(result.message)`; un error mantiene el diálogo abierto (comportamiento de `run`).

## Data Flow

    PlanCard ⋮ «Abandonar plan» → ConfirmDialog → onLeave → MyPlansPage.handleLeave
      → usePlans.leavePlan → api.leavePlan → POST /api/plans/:id/leave
      → store.leave → plan.findUnique → planMember.deleteMany
      ← 200 | 403 | 404 → filtrar plans + reload() → toast

## File Changes

| Archivo | Acción | Descripción |
|---|---|---|
| `apps/backend/src/services/plans.service.ts` | Modify | `leave` en interfaz e implementación Prisma |
| `apps/backend/src/routes/plans.ts` | Modify | Ruta `POST /:id/leave` |
| `apps/backend/src/routes/plans.test.ts` | Modify | `createMemoryStore` implementa `leave`; tests 200/403/404/401 |
| `apps/backend/src/routes/auth.recover.test.ts` | Modify | Literal `plansStore` con `leave: async () => false` |
| `apps/backend/src/services/plans.service.test.ts` | Modify | Mock con `plan.findUnique` y `planMember.deleteMany`; tests de `leave` |
| `apps/frontend/src/api/client.ts` | Modify | `leavePlan` |
| `apps/frontend/src/hooks/usePlans.ts` (+ test) | Modify | `leavePlan` |
| `apps/frontend/src/components/domain/PlanCard.tsx` (+ test) | Modify | Menú de invitado y diálogo |
| `apps/frontend/src/components/domain/PlanList.tsx` | Modify | Propaga `onLeave` |
| `apps/frontend/src/pages/MyPlansPage.tsx` | Modify | `handleLeave` |
| `docs/evidencias/H3-antes.png`, `H3-despues.png` | Create | Evidencia |
| `docs/evaluacion-heuristica.md` | Modify | H3 «Corregida» |

## Testing Strategy

| Capa | Qué | Cómo |
|---|---|---|
| Servicio | plan inexistente→`false`; creador→`ForbiddenPlanActionError`; `count 0`→`false`; `count 1`→`true` y `where` exacto | Vitest con mock de prisma ampliado (hoy solo `plan.findMany`) |
| Ruta | `200` + mensaje, `403`, `404` no miembro, `404` inexistente, `401` sin sesión | Supertest + `createMemoryStore` |
| Hook | éxito quita el plan y recarga; `ApiError` devuelve mensaje | Vitest con `api` simulado |
| Componente | invitado ve ⋮ solo con «Abandonar plan»; diálogo nombra el plan; error inline; creador sin «Abandonar» | Reescribir `PlanCard.test.tsx:350` («does not render actions menu for a guest»); revisar `PlanList.test.tsx` y `MyPlansPage.test.tsx` |

Mínimo 4 tests por archivo; verificación con el MCP de Vitest. TDD estricto: RED antes de cada implementación.

## Threat Matrix

N/A — no hay enrutamiento de shell, subprocesos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos. El nuevo endpoint HTTP hereda `requireAuth`, montado sobre `/api/plans` en `app.ts`.

## Migration / Rollout

No se requiere migración. Rollback: revertir el commit único.

## Risks / Trade-offs

- **Implementadores de `PlansStore` sin `leave`** rompen el typecheck → actualizar los tres (`createPrismaPlansStore`, `createMemoryStore`, literal de `auth.recover.test.ts`) y el mock.
- **Abandono accidental** → confirmación que nombra el plan; reingreso con código.
- **Carrera con la eliminación del creador** → `findUnique` nulo o `count 0` dan `404`, mostrado en el diálogo.
- **Ventana entre `findUnique` y `deleteMany`**: si el plan se borra entre ambos, la cascada deja `count 0` → `404`; correcto sin transacción.
- **Pérdida de `H3-antes.png`** → capturar antes del cambio de UI.
- **Trade-off:** el creador no recibe aviso del retiro (fuera de alcance).

## Open Questions

- Ninguna bloqueante.
