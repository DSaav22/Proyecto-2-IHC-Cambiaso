## 1. Evidencia previa (antes de tocar la UI)

- [x] 1.1 Capturar `docs/evidencias/H3-antes.png` con la tarjeta actual de un plan de invitado (sin menú ⋮, solo la nota de solo lectura), antes de modificar cualquier archivo de UI (Decisión 6 del diseño).

## 2. Backend: servicio y ruta

- [x] 2.1 RED: en `apps/backend/src/services/plans.service.test.ts` ampliar el mock de prisma con `plan.findUnique` y `planMember.deleteMany` y escribir los tests de `leave` (plan inexistente → `false`; creador → `ForbiddenPlanActionError`; `count 0` → `false`; `count 1` → `true` con `where: { planId, userId }` exacto). Verificar con `run_tests` del MCP de vitest que fallan.
- [x] 2.2 GREEN: añadir `leave(userId, planId): Promise<boolean>` a la interfaz `PlansStore` e implementarlo en `createPrismaPlansStore` en `apps/backend/src/services/plans.service.ts` según el contrato del diseño (`findUnique` + `deleteMany`). Los tests de 2.1 deben pasar.
- [x] 2.3 Actualizar los otros dos implementadores de `PlansStore`: `createMemoryStore` en `apps/backend/src/routes/plans.test.ts` (membresía en memoria: creador → lanza `ForbiddenPlanActionError`, no miembro o inexistente → `false`) y el literal `plansStore` de `apps/backend/src/routes/auth.recover.test.ts` (`leave: async () => false`). Verificar con `pnpm --filter backend typecheck` que solo faltan las rutas.
- [x] 2.4 RED: en `apps/backend/src/routes/plans.test.ts` escribir los tests de `POST /api/plans/:id/leave` (200 con `{ message: "Has abandonado el plan." }`, 200 en plan `cancelado`, 403 creador, 404 no miembro, 404 inexistente, 401 sin sesión). Verificar con `run_tests` que fallan.
- [x] 2.5 GREEN: añadir la ruta `POST /:id/leave` en `apps/backend/src/routes/plans.ts` (lee `res.locals.user`, normaliza `req.params.id`, `false` → 404 «Plan no encontrado», `ForbiddenPlanActionError` → 403; sin Prisma en la ruta). Los tests de 2.4 deben pasar.

## 3. Frontend: API y hook

- [x] 3.1 RED: en `apps/frontend/src/hooks/usePlans.test.tsx` escribir los tests de `leavePlan` (éxito quita el plan de `plans` y recarga, `ApiError` devuelve `{ ok: false, message }`, error de red genérico, plan ajeno no altera la lista); el archivo debe conservar al menos 4 tests. Verificar que fallan.
- [x] 3.2 GREEN: añadir `leavePlan` (`post<{ message: string }>(`/plans/${id}/leave`)`) en `apps/frontend/src/api/client.ts`, y `leavePlan` con el tipo `LeavePlanResult` en `apps/frontend/src/hooks/usePlans.ts` (clon de `deletePlan`: filtra `plans` + `void reload()`). Los tests de 3.1 deben pasar.

## 4. Frontend: UI

- [x] 4.1 RED: en `apps/frontend/src/components/domain/PlanCard.test.tsx` reescribir el test de la línea 350 («does not render actions menu for a guest») para que verifique que el invitado ve el botón ⋮ con solo «Abandonar plan» y sin «Eliminar»; añadir tests: el diálogo nombra el plan, aceptar llama `onLeave`, descartar no lo llama, el error se muestra dentro del diálogo abierto, «Abandonar» deshabilitado mientras está pendiente, y la tarjeta del creador no contiene «Abandonar plan». Revisar que el test «explains to a guest…» (línea 224) y el de la nota de solo lectura (línea 355) siguen válidos. Verificar que fallan.
- [x] 4.2 GREEN: en `apps/frontend/src/components/domain/PlanCard.tsx` añadir la prop `onLeave`, `"leave"` en `OpenDialog`, el menú ⋮ para invitado con el ítem destructivo «Abandonar plan» (`min-h-11`, `text-destructive`) y el `ConfirmDialog` de salida («¿Abandonar este plan?», `confirmLabel` «Abandonar», `pendingLabel` «Abandonando…», `destructive`), conservando la nota de solo lectura y siguiendo `apps/frontend/DESIGN.md`.
- [x] 4.3 RED: en `apps/frontend/src/components/domain/PlanList.test.tsx` y `apps/frontend/src/pages/MyPlansPage.test.tsx` (hoy sin aserciones de menú de invitado) añadir tests: `PlanList` propaga `onLeave` a la tarjeta de invitado; `MyPlansPage` completa el flujo (invitado abre ⋮, confirma, el plan desaparece sin recargar y se muestra «Has abandonado el plan.») y muestra el error del diálogo si falla. Cada archivo debe conservar al menos 4 tests. Verificar que fallan.
- [x] 4.4 GREEN: propagar `onLeave` en `apps/frontend/src/components/domain/PlanList.tsx` y crear `handleLeave` en `apps/frontend/src/pages/MyPlansPage.tsx` (éxito → aviso en el `SuccessNotice` existente; fallo → `setActionError(result.message)` y el diálogo permanece abierto). Los tests de 4.1 y 4.3 deben pasar.

## 5. Verificación

- [x] 5.1 Ejecutar con las herramientas del MCP de vitest (`list_tests`, `run_tests`) las suites completas de backend y frontend y confirmar 100% de aciertos y al menos 4 tests por archivo modificado.
- [x] 5.2 Ejecutar `pnpm --filter backend typecheck` y `pnpm --filter frontend exec tsc -b` sin errores (confirma que los tres implementadores de `PlansStore` compilan).
- [x] 5.3 Ejecutar `openspec validate guest-leave-plan` sin errores.

## 6. Evidencia y documentación

- [x] 6.1 Capturar `docs/evidencias/H3-despues.png` con la tarjeta de invitado mostrando el menú con «Abandonar plan» y el diálogo de confirmación.
- [x] 6.2 Actualizar la fila de H3 del resumen ejecutivo y su sección detallada en `docs/evaluacion-heuristica.md` a «Corregida», enlazando `H3-antes.png` y `H3-despues.png`, siguiendo el protocolo de la skill `heuristic-evaluation` y la entrada de H1 como modelo.

## Review Workload Forecast

- Estimated changed lines (code + tests, excluding docs/images): ~420 (backend ~150: servicio 12, ruta 20, tests servicio/ruta/stores ~120; frontend ~270: api/hook 25, PlanCard 50, PlanList/MyPlansPage 20, tests ~175).
- Chained PRs recommended: No (delivery_strategy `single-pr`; los cambios son cohesivos y un único commit revertible).
- 400-line budget risk: Medium (la estimación roza el presupuesto por el peso de los tests).
- Decision needed before apply: No.
