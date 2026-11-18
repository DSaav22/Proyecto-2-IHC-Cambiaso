# Sistema de diseño · Planazo

## Enlaces

- Figma: [IHC-Planazo](https://www.figma.com/design/pBxjOBJbn05pgSRLh0fxrw)
- Tokens en código: `apps/frontend/src/tokens.css`
- Modo oscuro: atributo `data-theme="oscuro"` en el documento (mismas variables)

## Tokens (mismos nombres en Figma y código)

| Token | Uso |
| --- | --- |
| `primary` / `primary-foreground` | Acción principal, logo, links activos |
| `destructive` / `destructive-foreground` | Eliminar, abandonar, acciones irreversibles |
| `background` / `foreground` | Fondo y texto de pantallas |
| `secondary` / `muted` | Fondos suaves y texto secundario |
| `border` / `input` / `ring` | Bordes, campos y foco |

## Tabla componente ↔ archivo

| Componente Figma | Archivo en código |
| --- | --- |
| Button | `apps/frontend/src/components/ui/button.tsx` |
| Badge | `apps/frontend/src/components/ui/badge.tsx` |
| Field | `apps/frontend/src/components/domain/Field.tsx` |
| Avatar | `apps/frontend/src/components/domain/Avatar.tsx` |
| StatCard | `apps/frontend/src/components/domain/StatCard.tsx` |
| Logo | `apps/frontend/src/components/domain/Logo.tsx` |
| TextLink | `apps/frontend/src/components/domain/TextLink.tsx` |
| Notice | `apps/frontend/src/components/domain/Notices.tsx` |
| PlanCard | `apps/frontend/src/components/domain/PlanCard.tsx` |
| ConfirmDialog | `apps/frontend/src/components/domain/ConfirmDialog.tsx` |

## Variantes y estados del Button

Tipo: Primario, Secundario, Outline, Ghost, Destructivo.  
Estado en Figma: Default, Disabled, Hover, Focus, Loading (Primario / Secundario / Destructivo).  
Estado en código: Default, Disabled, Focus (`focus-visible:ring-ring`), Hover (CSS), Pending (`pending` / `aria-busy`).
