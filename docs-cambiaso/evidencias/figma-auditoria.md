# Auditoría Figma · Sistema de diseño Planazo

Fecha: 18/11/2026  
Archivo: https://www.figma.com/design/pBxjOBJbn05pgSRLh0fxrw

## Páginas

| Página | Contenido |
| --- | --- |
| Foundations | Tokens de color nombrados por uso (`primary`, `destructive`, `background`…) |
| Components | Component sets con variantes/estados |
| Screens | Pantallas armadas con instancias de componentes |
| Wireframes / Flujos | Referencia de flujos |

## Los 10 componentes pedidos (+ extras)

| # | Componente | Variantes / estados en Figma | ¿Pantallas lo usan? |
| --- | --- | --- | --- |
| 1 | Button | Default/Secondary/Outline/Ghost/Destructive × Default/Disabled/Hover/Focus/Loading | Sí |
| 2 | Badge | Default, Success, Warning, Danger, Muted, Outline | Sí (Gastos) |
| 3 | Field | Default, Focus, Filled, Error | Sí (Login, Registro, diálogos) |
| 4 | Avatar | Size Sm / Md | Sí (Navbar) |
| 5 | Logo | Símbolo único | Sí (Login/Registro) |
| 6 | TextLink | Símbolo único | Sí (Registro) |
| 7 | StatCard | Símbolo único | Sí (Mis planes) |
| 8 | Notice | Success / Error | Mapeado a Notices |
| 9 | PlanCard | Pendiente / Confirmado / Cancelado | Sí |
| 10 | ConfirmDialog | Default / Destructive | Sí (Mis datos, Abandonar) |

Extras (bienvenidos): Navbar, PlanSectionTabs.

## Pantallas armadas con componentes

- Login · desktop  
- Registro · desktop  
- Mis planes · desktop  
- Mis datos · desktop  
- Crear plan · desktop  
- Unirse con código · desktop  
- Fechas y lugares · desktop  
- Gastos · desktop  
- Abandonar plan · desktop  
- Buscar sin resultados · desktop  

## Tokens = código

En Foundations aparecen los mismos nombres que en `apps/frontend/src/tokens.css` (`primary`, `destructive`, `background`, `foreground`, `border`, `ring`…).  
Hay un frame **Mapeo código ↔ Figma** en Screens con la tabla componente → archivo.

## Evidencia visual

![Set de Button en Figma](figma-button-set.png)

## Veredicto

Cumple el requisito de presentación: **≥ 10 componentes con variantes/estados** y **pantallas armadas con ellos**, con tokens alineados al código.
