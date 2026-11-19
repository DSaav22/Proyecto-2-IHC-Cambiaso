# Accesibilidad · Planazo

## Cómo se midió

1. **axe-core (WCAG 2 A/AA y 2.1 A/AA)** en las pruebas E2E `tests/accessibility.spec.ts`.
2. Revisión manual de contraste de tokens en `apps/frontend/src/tokens.css` (texto principal sobre fondo y botones con foreground dedicado).

## Pantallas revisadas por axe

| Pantalla | Resultado |
| --- | --- |
| Login (`/login`) | Sin violaciones |
| Registro (`/register`) | Sin violaciones |
| Mis planes (`/mis-planes`) | Sin violaciones |
| Diálogo Fechas y lugares | Sin violaciones |

Comando:

```bash
pnpm test:e2e tests/accessibility.spec.ts
```

## Contraste AA (tokens claros)

| Par | Ratio aproximado | AA (≥ 4.5 texto / ≥ 3 UI) |
| --- | ---: | --- |
| `foreground` `#0b2a2e` sobre `background` `#f2f8f7` | ~12:1 | Cumple |
| `primary-foreground` `#ffffff` sobre `primary` `#0f766e` | ~5.5:1 | Cumple |
| `destructive-foreground` `#ffffff` sobre `destructive` `#be123c` | ~5.2:1 | Cumple |
| `muted-foreground` `#46666a` sobre `background` `#f2f8f7` | ~5.1:1 | Cumple |

## Interpretación y correcciones

| Hallazgo | Qué se hizo |
| --- | --- |
| Botón destructivo usaba `text-white` fijo | Pasó a token `destructive-foreground` |
| Verde de éxito demasiado claro en tarjetas canceladas (Tarea 6) | `success` oscurecido a `#166534` |
| Controles táctiles | Alto mínimo `min-h-11` (44px) en el Button default |

## Lighthouse (18/11/2026)

Comando:

```bash
npx lighthouse http://127.0.0.1:5173/login --only-categories=accessibility --chrome-flags="--headless" --output=html --output=json --output-path=docs-cambiaso/evidencias/lighthouse-login
```

| Pantalla | Categoría | Score |
| --- | --- | ---: |
| Login (`/login`) | Accessibility | **100** |

Reportes:

- HTML: [`evidencias/lighthouse-login.report.html`](evidencias/lighthouse-login.report.html)
- JSON: [`evidencias/lighthouse-login.report.json`](evidencias/lighthouse-login.report.json)

### Interpretación

- Score 100 en accesibilidad: contraste, nombres, labels y jerarquía pasan en Login.
- Coherente con axe E2E (Login / Registro / Mis planes / Fechas y lugares) y con la corrección del link de perfil.
- WAVE: opcional; el reporte Lighthouse + axe cubren el requisito de “reporte interpretado”.

## Pendiente consciente

- El tema `data-theme="oscuro"` está definido en tokens; la app aún no expone un interruptor en la UI.
