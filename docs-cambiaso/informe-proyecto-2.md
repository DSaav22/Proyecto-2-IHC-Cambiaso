# UNIVERSIDAD AUTÓNOMA GABRIEL RENÉ MORENO

**FACULTAD DE INGENIERÍA EN CIENCIAS DE LA COMPUTACIÓN Y TELECOMUNICACIONES**

---

# PLANAZO  
## Ayudar a un grupo a organizar un plan

**Integrante:** Saavedra Alberto Diego Joaquín · 221180702  

**Materia:** Interacción Hombre-Computador · ELC-106 ‘SA’  

**Docente:** Brandon Jason  

**Modalidad:** según evidencias de cada entrega (`docs-cambiaso/evidencias/`)  

**Fork:** https://github.com/DSaav22/Proyecto-2-IHC-Cambiaso  

**App:** https://planazo-yhcd.onrender.com  

**Figma:** https://www.figma.com/design/pBxjOBJbn05pgSRLh0fxrw  

**Santa Cruz — Bolivia**

---

# Índice

## Documento A — Proceso y todos los flujos
1. Antecedentes  
2. Los flujos (Figma ↔ código)  
3. Flujo 1 — Entrar y ver Mis planes  
4. Flujo 2 — Crear plan o unirse con código  
5. Flujo 3 — Invitar con consentimiento  
6. Flujo 4 — Fechas, lugares y votos  
7. Flujo 5 — Gastos, saldos y pagos  
8. Flujo 6 — Abandonar el plan  
9. Flujo 7 — Mis datos y eliminar cuenta  

## Documento B — Solución y sus razones
1. Qué es  
2. Para quién  
3. Valor  
4. Decisiones defendidas  
5. Qué no se vende  
6. Artefacto de accesibilidad  

## Conclusión

---

# Documento A — Proceso y todos los flujos

## Antecedentes

Organizar un plan en grupo (fecha, lugar, plata y quiénes van) se fragmenta en chats y hojas sueltas. Se pierde el estado compartido, se duplican mensajes y salir del plan o de la cuenta queda confuso o tramposo: a veces es más fácil entrar que salir.

La oportunidad es una sola app web donde el grupo ve el mismo estado (**pendiente / confirmado / cancelado**), invita con consentimiento, vota con reglas claras, reparte gastos y puede irse o borrar la cuenta sin culpa ni pasos escondidos.

Happy path de venta + validación IHC: estados con **texto** (no solo color), confirmaciones con botones del mismo peso visual, y pruebas E2E que protegen los flujos agregados en el fork.

## Los flujos (Figma ↔ código)

| # | Flujo | Figma (Screens) | Código principal |
| --- | --- | --- | --- |
| 1 | Entrar y ver Mis planes | Login · Mis planes | `LoginPage.tsx`, `MyPlansPage.tsx`, `Navbar.tsx`, `PlanCard.tsx` |
| 2 | Crear plan / unirse | Crear plan · Unirse con código | `PlanForm.tsx`, `JoinPlanDialog.tsx`, `plans.service.ts` |
| 3 | Invitar con consentimiento | Fechas y lugares · invitaciones | `PendingInvitations.tsx`, `invitations.service.ts`, `coordination.service.ts` |
| 4 | Fechas, lugares y votos | Fechas y lugares | diálogo de coordinación, `coordination.service.ts` |
| 5 | Gastos y saldos | Gastos | diálogo de gastos, `expenses.service.ts` |
| 6 | Abandonar plan | Abandonar plan | `ConfirmDialog.tsx`, regla `deuda_pendiente` |
| 7 | Mis datos / eliminar cuenta | Mis datos | `MyDataPage.tsx`, `account.service.ts` |

Evidencias por entrega: `docs-cambiaso/evidencias/` (tareas 7–10, clases 20–23).  
Video demo: [`video/planazo-demo.webm`](video/planazo-demo.webm).  
Diapositivas: [`presentacion/index.html`](presentacion/index.html).

---

## Flujo 1 — Entrar y ver Mis planes

**Pantallas en secuencia (Figma):** Abrir app → Login / Registro → Mis planes (saludo, stats, filtros, tarjetas).

**Happy path:**  
`usuario1@planazo.com` / `Planazo123!` → Mis planes con planes del seed, estados **Pendiente / Confirmado / Cancelado** en Badge (texto + color). Pestañas «Todos / Organizo yo / Me invitaron» (Clase 20).

**Validación:** correo inválido o contraseña vacía → mensaje bajo el campo + borde de error (`Field` State=Error). Sin sesión no se ve el contenido protegido.

**Código:** `apps/frontend/src/pages/LoginPage.tsx`, `MyPlansPage.tsx`, `auth/`.

---

## Flujo 2 — Crear plan o unirse con código

**Pantallas:** Mis planes → «+ Nuevo plan» / «Unirse con código» → diálogo → tarjeta nueva o plan unido.

**Happy path:** título + fecha límite → Crear → aparece en la lista. Unirse con código del seed (p. ej. `PLZ-SEED2A`) → entra como invitado.

**Validación:** campos vacíos o código inexistente → Notice de error; el plan no se inventa.

**Código:** `PlanForm.tsx`, `JoinPlanDialog.tsx`, `apps/backend/src/services/plans.service.ts`.

---

## Flujo 3 — Invitar con consentimiento

**Pantallas:** Fechas y lugares → Invitar por correo → el otro ve invitación pendiente → Unirme / Rechazar (botones iguales).

**Happy path (Clase 22 / ética):** Ana invita a Caro. Caro **no** entra al plan ni a Gastos hasta aceptar. Mientras está pendiente, el organizador ve el aviso «Tiene que aceptarla para entrar al plan».

**Antes (patrón oscuro):** `inviteByEmail` creaba `PlanMember` al instante → Caro salía en «Partes iguales» con deuda → abandonar bloqueado. Entrar gratis, salir caro.

**Después:** se crea `PlanInvitation`; aceptar crea el miembro. E2E: `tests/invitation-consent.spec.ts`. Commit: `fix(etica):…`.

**Código:** `invitations.service.ts`, `PendingInvitations.tsx`, `coordination.service.ts`.

---

## Flujo 4 — Fechas, lugares y votos

**Pantallas:** PlanCard → Fechas y lugares → proponer opción → votar (varios votos) → cerrar votación.

**Happy path:** se proponen lugares/fechas, se puede votar más de una opción y sacar el voto antes de cerrar (Tarea 6). Al cerrar, ya no se vota.

**Validación / estado vacío:** sin opciones, el diálogo guía a proponer; mensajes con Notice (texto + icono).

**Código:** coordinación en frontend domain + `coordination.service.ts`.

---

## Flujo 5 — Gastos, saldos y pagos

**Pantallas:** PlanCard → Gastos → saldos → agregar gasto → pagos.

**Happy path:** descripción, monto, «Partes iguales» entre quienes **ya aceptaron** estar en el plan → saldos y pagos pendientes/confirmados.

**Validación:** monto no numérico o participantes vacíos → error en campo / Notice. Solo participan miembros reales (no invitaciones pendientes).

**Código:** diálogo de gastos, `expenses.service.ts`, E2E `tests/expenses.spec.ts`.

---

## Flujo 6 — Abandonar el plan

**Pantallas:** PlanCard → Abandonar → ConfirmDialog (mismo tamaño de botones, consecuencia en el texto).

**Happy path:** sin deuda → confirma → el plan deja de verse en Mis planes.

**Validación / regla:** con deuda pendiente → bloqueo `deuda_pendiente` y mensaje de qué hacer (pagar / saldar), sin culpa ni botón escondido (Tarea 9 / ética de salida).

**Código:** `ConfirmDialog.tsx`, `leavePlan`, E2E `tests/leave-plan.spec.ts`.

---

## Flujo 7 — Mis datos y eliminar cuenta

**Pantallas:** Navbar (perfil) → Mis datos → Descargar JSON/CSV → Eliminar cuenta → confirmación honesta.

**Happy path (Tarea 10):** ver qué guarda Planazo, descargar, intentar eliminar.

**Regla de Planazo:** si organiza planes abiertos, debe transferirlos/cancelarlos; con deudas en gastos, no puede eliminar. El mensaje dice **por qué** y **qué hacer**. Después de eliminar, esa cuenta no inicia sesión.

**Código:** `MyDataPage.tsx`, `account.service.ts`, E2E `tests/account-exit.spec.ts`.  
Evidencia: `evidencias/tarea-10.md`.

---

# Documento B — Solución y sus razones

## Qué es

**Planazo** es una app web (SPA React + Express + PostgreSQL) para que un grupo cree un plan, invite con consentimiento, vote fechas/lugares, reparte gastos y pueda salir o borrar la cuenta sin trampas. El deploy de demo está en Render: https://planazo-yhcd.onrender.com

## Para quién

Estudiantes y amigos que arman planes cortos y necesitan el mismo estado compartido, sin pelearse con el chat ni con la interfaz.

## Valor

- Estado visible y compartido (pendiente / confirmado / cancelado).  
- Privacidad por defecto al invitar.  
- Salida honesta (abandonar / eliminar cuenta).  
- Diseño con tokens = mismos nombres en Figma y en `tokens.css`.  
- Pruebas E2E + GitHub Actions en verde.  
- Accesibilidad: axe + Lighthouse 100 en Login.

## Decisiones defendidas

### 1. Consentimiento al invitar (Clase 22)

**Dolor:** entrar sin pedir permiso y quedar en deudas.  
**Decisión:** invitación pendiente hasta aceptar; botones Unirme / Rechazar del mismo peso.  
**Evidencia:** `evidencias/clase-22.md`, test `invitation-consent.spec.ts`.

### 2. Confirmaciones honestas (abandonar / eliminar)

**Dolor:** culpa, botón primario que empuja a quedarse, pasos de más.  
**Decisión:** botones iguales, consecuencia en el texto, sin emoji de presión.  
**Evidencia:** Tarea 10, `ConfirmDialog`.

### 3. Tokens por uso, no por apariencia (Clase 23)

**Dolor:** colores fijos e inconsistentes entre pantallas.  
**Decisión:** `primary`, `destructive`, `background`… en Figma Foundations y en `tokens.css`. Inventario de botones + conteo de hex en Login.  
**Evidencia:** `evidencias/clase-23.md`, `sistema-diseno.md`.

### 4. Analítica sin datos personales (Tarea 9)

**Dolor:** telemetría que identifica personas.  
**Decisión:** se registran acciones agregadas, no nombre ni correo.  
**Evidencia:** `evidencias/tarea-9.md`, `evidencias/clase-21.md`.

### 5. Mis planes por rol (Clase 20)

**Dolor:** una sola lista mezcla lo que organizo y a lo que me invitaron.  
**Decisión:** pestañas / filtros por rol.  
**Evidencia:** `evidencias/clase-20.md`.

## Qué no se vende

- Tema oscuro completo con interruptor en UI (tokens `data-theme="oscuro"` existen; no hay switch).  
- Cobertura unitaria del 100 % de todo el diff del fork (README ~56 % + E2E de flujos críticos).  
- Correcciones de todos los patrones oscuros listados como pendientes (p. ej. revelar si un correo está registrado al invitar).

Solo se presenta lo implementado, probado y desplegado.

## Artefacto de accesibilidad

### Color (WCAG 1.4.3)

Contraste AA comprobado en tokens claros (`accesibilidad.md`): texto principal ~12:1; botones primary/destructive ≥ 4.5:1.

### Medición

- axe-core en E2E (`tests/accessibility.spec.ts`): Login, Registro, Mis planes, Fechas y lugares — sin violaciones.  
- Lighthouse Accessibility en Login: **100** (`evidencias/lighthouse-login.report.html`).

### Barreras corregidas

| Barrera | Qué pasaba | Qué se hizo |
| --- | --- | --- |
| 1 · Color fijo en destructivo | `text-white` a mano | Token `destructive-foreground` |
| 2 · Contraste de éxito | Verde demasiado claro en cancelados | `success` → `#166534` |
| 3 · Nombre accesible del perfil | Iniciales del avatar vs `aria-label` (axe `label-content-name-mismatch`) | Icono decorativo + label «Mis datos de …» |
| 4 · Tamaño táctil | Controles chicos | `min-h-11` (44px) en Button default |

---

## Mapa de conexión (código)

```
UI (pages/ + components/)
  → hooks/
  → api/client
  → Express routes/
  → services/ + Prisma
  → PostgreSQL
```

Diseño: [sistema-diseno.md](sistema-diseno.md) · auditoría Figma: [evidencias/figma-auditoria.md](evidencias/figma-auditoria.md).

---

## Comparación / modalidad

Las evidencias de clase declaran la modalidad usada en cada entrega. El producto del fork se defiende con código, commits incrementales, suite E2E y Actions en verde — no con “en mi máquina pasa”.

---

## Calidad y despliegue

| Ítem | Dónde |
| --- | --- |
| App en la nube | https://planazo-yhcd.onrender.com |
| Health | `/api/health` → ok |
| Usuarios seed | `usuario1@planazo.com` / `usuario2@planazo.com` · `Planazo123!` |
| Actions | badge en README · workflow `pruebas` |
| Video | [`video/planazo-demo.webm`](video/planazo-demo.webm) |
| Diapositivas | [`presentacion/index.html`](presentacion/index.html) |
| Despliegue | [despliegue.md](despliegue.md) |

---

# Conclusión

El desarrollo de **Planazo** en el Proyecto 2 muestra cómo el diseño de interacción centrado en el usuario (IHC), la ética de interfaces y la accesibilidad convierten un proceso informal (organizar un plan en el chat) en una herramienta compartida, verificable y honesta al entrar y al salir.

A partir del trabajo del fork, se destacan:

- **Efectividad frente al dolor del usuario:** el grupo ve el mismo estado del plan, vota y reparte gastos sin depender de mensajes sueltos; la invitación con consentimiento evita sumar a alguien a deudas sin pedir permiso.  
- **Alineación ética entre diseño y software:** se corrigió el patrón oscuro de “entrar fácil / salir difícil” (Clase 22) y se implementó salida honesta en abandonar y eliminar cuenta (Tarea 10), con pruebas que lo protegen.  
- **Rigurosidad en IHC y accesibilidad:** estados con texto (no solo color), tokens por uso alineados a Figma, contraste AA, axe en E2E y Lighthouse 100 en Login.  
- **Correspondencia Figma ↔ código ↔ despliegue:** componentes y pantallas en Figma, mismos nombres de tokens en código, app pública en Render y evidencias versionadas en el repositorio.

En definitiva, Planazo no solo lista planes: hace que organizar en grupo sea transparente, consentido y reversible sin engañar a nadie.

**GitHub:** https://github.com/DSaav22/Proyecto-2-IHC-Cambiaso  
**App:** https://planazo-yhcd.onrender.com  
**Figma:** https://www.figma.com/design/pBxjOBJbn05pgSRLh0fxrw
