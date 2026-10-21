# DESIGN.md — Sistema de diseño de Planazo

Fuente de verdad visual del frontend. Todo cambio de UI debe seguir estas directrices.
Los valores viven en `src/tokens.css` (color, tipografía, espacio) y `src/index.css` (forma, movimiento, capa base).
**Si un valor cambia en esos archivos, se actualiza este documento en el mismo commit** (sin OpenSpec: es solo documentación).

## 1. Reglas generales

1. **Solo tokens.** Prohibido colores hex, `rgb()` o fuentes literales en componentes. Usar utilidades de Tailwind respaldadas por tokens (`bg-primary`, `text-muted-foreground`, `border-border`…).
2. **Sin degradados.** Superficies sólidas: botón primario `bg-primary`, texto de énfasis `text-primary`, fondos `bg-background`, logo con relleno sólido. No existen utilidades ni tokens de degradado.
3. **Sombras y desenfoques discretos.** Máximo `shadow-xs`/`shadow-sm` en tarjetas y `shadow-md` en elementos flotantes (menús, diálogos). Sin halos con desenfoque decorativos ni `shadow-2xl`.
4. **Movimiento mínimo.** Solo transiciones de color/sombra (≤200 ms) y animaciones de entrada de diálogos. Sin animaciones infinitas en la UI (se eliminó `animate-float`). Respetar `prefers-reduced-motion` (ya garantizado en `index.css`).
5. **Accesibilidad.** Contraste AA, foco visible con `ring`, áreas táctiles de al menos 44 px (`min-h-11`), `aria-label` en botones solo-ícono, el estado nunca se comunica solo con color.
6. **Idioma.** Textos de interfaz en español; identificadores y comentarios en inglés.

## 2. Color (`tokens.css`)

| Token | Valor | Uso |
| --- | --- | --- |
| `background` / `foreground` | `#f2f8f7` / `#0b2a2e` | Fondo de página y texto base |
| `card` / `card-foreground` | `#ffffff` / `#0b2a2e` | Tarjetas, diálogos, navbar |
| `primary` / `primary-foreground` | `#0f766e` / `#ffffff` | Acción principal, enlaces, foco de marca |
| `secondary` / `secondary-foreground` | `#d5f5ef` / `#0b3b39` | Acciones secundarias, fondos de realce suave |
| `muted` / `muted-foreground` | `#e5f0ee` / `#46666a` | Fondos y texto de apoyo |
| `accent` / `accent-foreground` | `#fbbf24` / `#3b2504` | Avisos de atención (p. ej. «vence hoy») |
| `destructive` | `#be123c` | Eliminar, errores |
| `success` | `#15803d` | Estado «Confirmado» |
| `warning` | `#b45309` | Reservado para avisos; hoy sin uso |
| `ink` / `ink-foreground` | `#062b30` / `#e6faf6` | Superficies oscuras y overlay de diálogos |
| `border` / `input` / `ring` | `#d0e2df` / `#a9c5c1` / `#14b8a6` | Bordes, campos, anillo de foco |

Solo existen los tokens de la tabla. Los tokens `coral`, `popover`/`popover-foreground` y `brand-start`/`brand-mid`/`brand-end` se retiraron de `tokens.css`; no deben volver a usarse.

### Semántica de estados del plan

| Estado | Presentación |
| --- | --- |
| `pendiente` | Insignia neutra (`muted`), acción primaria «Confirmar plan» (`primary`) |
| `confirmado` | Insignia `success` con ícono de check, sin botón de acción |
| `cancelado` | Insignia neutra (`muted`) con ícono `Ban` y el texto «Cancelado» (el estado nunca se comunica solo con color). Sin acciones de editar, confirmar ni cancelar; solo se puede eliminar desde «Más acciones». No muestra la insignia de vencimiento |
| Vencimiento (`overdue`/`today`/`soon`/`later`) | Insignia `destructive` / `accent` / `accent` / `primary` según `getDueStatus()`. Es independiente del estado del plan |

### Semántica de roles de usuario (Membresía)

Para evitar saturar la tarjeta con el verde semántico del estado `confirmado` o de vencimientos lejanos, los roles se diferencian estructuralmente:

| Rol | Presentación | Justificación UX |
| --- | --- | --- |
| `Creador` | Insignia neutra (`muted`), texto «Creador» | Al ser el caso habitual en "Mis planes", se mantiene sobrio para no generar ruido visual repetitivo. |
| `Invitado` | Insignia con contorno (`outline`), texto «Invitado» | Destaca la excepción como una etiqueta estructural limpia (`border border-border bg-card`), sin colisionar con el color de los estados. |

### Variantes de componentes base (`ui/`)

#### Insignias (`Badge`)

- `default`: `bg-primary/10 text-primary` (resaltado de marca o vencimiento lejano).
- `success`: `bg-success/12 text-success` (exclusivo para estado `confirmado`).
- `warning`: `bg-accent/35 text-accent-foreground` (vencimiento hoy/pronto).
- `danger`: `bg-destructive/10 text-destructive` (vencido).
- `muted`: `bg-muted text-muted-foreground` (estado `pendiente`, `cancelado` y rol `Creador`).
- `outline`: `border border-border bg-card text-foreground` (rol `Invitado`, etiquetas no-semánticas).

#### Botones (`Button`)

- `default` (Primario): `bg-primary text-primary-foreground` sólido con sombra discreta. Un solo botón primario por tarjeta/pantalla.
- `secondary`: `bg-secondary text-secondary-foreground`, realce suave.
- `outline`: `border border-input bg-card text-foreground`, acciones secundarias en tarjetas (como «Cancelar plan») para evitar competir con el botón primario.
- `ghost`: `text-foreground hover:bg-secondary/70`, acciones en barras y menús.
- `destructive`: `bg-destructive text-white`, reservado para la confirmación final dentro de diálogos destructivos (eliminar o cancelar definitivamente).

## 3. Tipografía

- Cuerpo y UI: **Plus Jakarta Sans** (`font-sans`).
- Títulos `h1`–`h3` y números destacados: **Bricolage Grotesque** (`font-display`, `letter-spacing: -0.02em`, aplicado en `index.css`).
- Jerarquía: título de diálogo `text-2xl font-bold`; título de tarjeta `text-base font-semibold`; apoyo `text-sm text-muted-foreground`; etiquetas/insignias `text-xs font-semibold`.

## 4. Espaciado y forma

- Unidad base `--spacing: 0.25rem`. Usar la escala de Tailwind (`p-4`, `gap-6`…), sin valores arbitrarios (`p-[13px]`).
- Radio base `--radius: 0.875rem` → `rounded-sm|md|lg|xl`. Evitar radios arbitrarios como `rounded-[2.5rem]`.
- Contenedor de página: `max-w-5xl`, gutters `px-4 sm:px-6`.

## 5. Patrones de componente

- **Botón primario:** `bg-primary text-primary-foreground`, sólido, foco con `ring`. Un solo botón primario por tarjeta/diálogo.
- **Acciones destructivas y de ciclo de vida:**
  - En tarjetas, acciones irreversibles o de retroceso («Cancelar plan») usan `variant="outline"`.
  - Operaciones permanentes («Eliminar») se ubican en el menú de acciones (⋮) y nunca como botón directo en la tarjeta.
  - Toda acción destructiva o de transición de estado exige confirmación mediante `ConfirmDialog`.
- **`ConfirmDialog`:** Patrón unificado para confirmar acciones de impacto. Debe nombrar explícitamente el recurso (p. ej. `«Cena de equipo»`), explicar el cambio, mostrar errores inline dentro del modal sin cerrarse si la API falla, y usar botón `destructive` solo al confirmar la acción crítica.
- **`PlanFiltersBar` (Barra de búsqueda y filtros):**
  - Inputs con debounce de 300 ms en texto y cambio inmediato en selects.
  - Sincronización bidireccional con query params de la URL (`?q&estado&fecha`).
  - Chips de filtros activos con botón de remoción táctil (mínimo 44 px / `min-h-11`) y gestión de foco que devuelve el cursor al control al remover un chip.
  - Región `aria-live` que anuncia los resultados ("Mostrando X de Y planes").
- **`StatCard` (Métricas de cabecera):** Tarjetas con valor numérico destacado en `font-display` y etiqueta de apoyo en `text-xs text-muted-foreground`. Su valor proviene del `summary` calculado por el servidor (no se altera al filtrar la lista).
- **`ActivityCard` (Historial de actividad):** Tarjeta autónoma que consolida en un solo bloque visual las 4 dimensiones del evento (ícono y título semántico, tiempo relativo/exacto, badge de estado y enlace destacado al plan). Implementa deep-linking hacia `/mis-planes#plan-${id}` con auto-scroll y resalte mediante `:target` y foco visual, minimizando la carga cognitiva.
- **Chips temáticos de historial (`ActivityHistoryPage`):** Conjunto acotado de 4 chips semánticos (`Todos`, `Estados`, `Creaciones`, `Participación`) conforme a la Ley de Hick ($n=4$), con área táctil accesible de al menos 44 px (`min-h-11`, Ley de Fitts) y estado vacío empático que orienta al usuario mediante un CTA primario.
- **Navbar:** logo + nombre de marca es un único enlace; los ítems de navegación se separan visualmente y no duplican destino. Los accesos principales garantizan un área de contacto mínima de 44×44 px (`min-h-11`).
- **Estados vacíos, carga y error:** siempre contemplados; mensajes en `Alert`/`Notices`, no en `alert()` del navegador. Distinguir estado sin planes ("todavía no tienes planes") de estado sin coincidencias ("no hay planes que coincidan").
- **Formularios:** etiqueta visible, error por campo, sin placeholder como única etiqueta.

## 6. Checklist antes de abrir una PR de frontend

- [ ] Sin hex ni fuentes literales; solo tokens.
- [ ] Sin degradados nuevos, sin animaciones infinitas.
- [ ] Contraste y foco verificados; botones solo-ícono con `aria-label`.
- [ ] Textos en español; componente ubicado según `ARCHITECTURE.md`.
- [ ] Si se tocó `tokens.css` o `index.css`, este archivo está actualizado.
