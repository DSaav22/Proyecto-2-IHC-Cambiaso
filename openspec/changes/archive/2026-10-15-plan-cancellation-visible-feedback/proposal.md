# Proposal: Feedback visible y contextual al cancelar planes (H1 / Sub-issue #17)

## Why

Al encontrar y cancelar un plan en `/mis-planes` tras hacer scroll vertical en la lista, el diálogo de confirmación se cierra correctamente pero el aviso de éxito (`SuccessNotice`) se renderiza al principio de la página (`MyPlansPage.tsx:L175-L177`), fuera del viewport visible. Esta desconexión espacial viola la heurística H1 de Nielsen (Visibilidad del estado del sistema, severidad 3 - Mayor) al dejar al usuario con incertidumbre sobre si la acción se ejecutó con éxito, forzándolo a hacer scroll manual hacia arriba para enterarse.

## What Changes

- Modificar la renderización del aviso de éxito (`notice`) en `MyPlansPage.tsx` para presentarlo dentro de un contenedor toast flotante anclado en el viewport (`fixed bottom-5 right-5 z-50 max-w-md shadow-lg animate-in fade-in slide-in-from-bottom-2`), utilizando clases utilitarias de Tailwind sin dependencias externas.
- Garantizar que el mensaje de confirmación (`role="status"`) sea visible e inmediatamente perceptible en cualquier posición de scroll.
- Añadir pruebas unitarias en `MyPlansPage.test.tsx` que verifiquen la presencia, legibilidad y posicionamiento en viewport del aviso tras la cancelación de un plan.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `plans`: Clarificar en los requerimientos de interacción y cancelación de planes que la notificación de éxito debe ser visible y anclada al viewport tras la mutación, independientemente del desplazamiento (scroll).

## Impact

- `apps/frontend/src/pages/MyPlansPage.tsx`: Actualización del layout del contenedor de `SuccessNotice`.
- `apps/frontend/src/pages/MyPlansPage.test.tsx`: Nuevos casos de prueba para el flujo de cancelación y visibilidad del toast.
- Cierre del sub-issue #17 (`Refs #16`).
