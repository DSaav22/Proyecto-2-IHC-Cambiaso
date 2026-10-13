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
- **Acciones destructivas:** nunca como botón primario visible en tarjeta; van en menú de acciones (⋮) y piden confirmación en diálogo que nombra el elemento.
- **Navbar:** logo + nombre de marca es un único enlace; los ítems de navegación se separan visualmente y no duplican destino.
- **Estados vacíos, carga y error:** siempre contemplados; mensajes en `Alert`/`Notices`, no en `alert()` del navegador.
- **Formularios:** etiqueta visible, error por campo, sin placeholder como única etiqueta.

## 6. Checklist antes de abrir una PR de frontend

- [ ] Sin hex ni fuentes literales; solo tokens.
- [ ] Sin degradados nuevos, sin animaciones infinitas.
- [ ] Contraste y foco verificados; botones solo-ícono con `aria-label`.
- [ ] Textos en español; componente ubicado según `ARCHITECTURE.md`.
- [ ] Si se tocó `tokens.css` o `index.css`, este archivo está actualizado.
