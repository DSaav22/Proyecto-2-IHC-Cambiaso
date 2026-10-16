# Design: Feedback visible y contextual al cancelar planes (H1 / Sub-issue #17)

## Context

Actualmente en `MyPlansPage.tsx:L175-L177`, `SuccessNotice` se monta en el flujo estático del DOM, debajo de `<header>` y antes de las tarjetas de planes. Cuando el usuario tiene múltiples planes y se desplaza verticalmente para encontrar el plan deseado y cancelarlo, el modal se cierra y el aviso se renderiza en la parte superior del documento, quedando completamente fuera del viewport visible.

## Goals / Non-Goals

**Goals:**
- Anclar la notificación de éxito al viewport visible mediante posicionamiento flotante (`fixed bottom-5 right-5 z-50 max-w-md shadow-lg`), asegurando visibilidad inmediata sin importar el scroll.
- Mantener la accesibilidad (`role="status"`, botón de cierre con `aria-label`, auto-cierre tras 5 segundos).
- Cero librerías externas adicionales, respetando estrictamente `AGENTS.md` y `DESIGN.md`.
- Cobertura completa de pruebas unitarias en `MyPlansPage.test.tsx` verificando la presencia y contenido del feedback tras la cancelación.

**Non-Goals:**
- No implementar un gestor complejo de múltiples toasts ni instalar librerías como `sonner` o `react-hot-toast`.
- No modificar el comportamiento de `ErrorAlert` (los errores mantienen su contexto actual).

## Decisions

### Decisión 1: Contenedor flotante en `MyPlansPage.tsx`
- **Elección:** Envolver `SuccessNotice` en un contenedor fijo:
  ```tsx
  {notice ? (
    <div className="fixed bottom-5 right-5 z-50 max-w-[calc(100vw-2.5rem)] sm:max-w-md shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
      <SuccessNotice onClose={() => setNotice(null)}>{notice}</SuccessNotice>
    </div>
  ) : null}
  ```
- **Alternativa descartada:** Hacer que `SuccessNotice` siempre tenga `position: fixed` internamente. Descartado porque limitaría la reutilización de `SuccessNotice` como banner inline en otros contextos.

### Decisión 2: Tailwind nativo y Tokens de Diseño
- **Elección:** Utilizar clases nativas de Tailwind existentes (`fixed`, `bottom-5`, `right-5`, `z-50`, `shadow-lg`).
- **Alternativa descartada:** Instalar librerías de notificaciones externas. Prohibido por las directivas del proyecto.

## Risks / Trade-offs

- **[Riesgo: Superposición con botones inferiores en pantallas móviles estrechas]**  
  → **Mitigación:** Aplicar `max-w-[calc(100vw-2.5rem)]`, sombra de elevación (`shadow-lg`) para contraste de capas, y conservar el botón de cierre táctil `X` con tamaño objetivo accesible.
