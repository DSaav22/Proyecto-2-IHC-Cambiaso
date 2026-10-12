# Tarea 2: Estados del plan y pruebas unitarias

## Regla de estados

Un plan tiene exactamente un estado:

| Estado | Significado |
| --- | --- |
| `pendiente` | Estado inicial de todo plan nuevo. El cliente no puede elegirlo. |
| `confirmado` | El plan fue confirmado por su dueño. No hay vuelta a `pendiente`. |

Única transición permitida: `pendiente` → `confirmado`. Confirmar un plan ya confirmado es una transición inválida.

La regla es una función pura en `apps/backend/src/lib/planState.ts` (`PLAN_STATES`, `INITIAL_PLAN_STATE`, `confirmPlan`, `InvalidTransitionError`), sin dependencias de Prisma ni Express. El servicio la aplica con una escritura condicionada (`updateMany` solo si el plan sigue en `pendiente`) para que dos confirmaciones simultáneas no puedan tener éxito a la vez.

Endpoint: `POST /api/plans/:id/confirm` (requiere sesión).

| Código | Cuándo |
| --- | --- |
| `200` | El plan pasó a `confirmado`; devuelve el plan actualizado. |
| `404` | El plan no existe o pertenece a otro usuario. |
| `409` | El plan ya estaba confirmado. |

## Las cuatro pruebas

Archivo: `apps/backend/src/lib/planState.test.ts`.

| # | Prueba | Qué comprueba |
| --- | --- | --- |
| 1 | Estado inicial | `INITIAL_PLAN_STATE` es `pendiente`. |
| 2 | Transición válida | `confirmPlan` sobre un plan pendiente devuelve un plan `confirmado`. |
| 3 | Transición inválida | `confirmPlan` sobre un plan confirmado lanza `InvalidTransitionError`. |
| 4 | Datos preservados | Tras confirmar, `description`, `dueDate`, `userId` (y `id`) no cambian. |

## Cómo ejecutarlas

```bash
pnpm --filter backend test planState
```

Salida esperada (resumen):

```text
 Test Files  1 passed (1)
      Tests  4 passed (4)
```

Para correr toda la suite del backend: `pnpm --filter backend test`.
