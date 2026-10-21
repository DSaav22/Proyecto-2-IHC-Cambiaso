---
name: interaction-decisions
description: Protocolo y directivas ergonómicas para auditar, diseñar y evaluar decisiones de interacción en Planazo mediante la Ley de Fitts, Ley de Hick y Teoría de la Carga Cognitiva. Usar para validar interfaces, justificar cambios de usabilidad, prevenir fricción motriz o cognitiva y registrar evidencias antes/después.
license: MIT
metadata:
  author: Planazo Team
  version: "1.0"
---

# Decisiones de Interacción Ergonómica (IHC) — Protocolo Planazo

Este protocolo rige la evaluación, diseño y auditoría de la interacción usuario-sistema en Planazo, asegurando interfaces accesibles, predecibles y de bajo esfuerzo mental y motriz.

---

## 1. Principios Ergonómicos y Fórmulas de Evaluación

### 🎯 1. Ley de Fitts (Ergonomía Motriz y Adquisición de Objetivos)

* **Formulación matemática:**
  $$T = a + b \log_2\left(\frac{2D}{W}\right)$$
  Donde $T$ es el tiempo de adquisición, $D$ es la distancia inicial al objetivo y $W$ es el ancho proyectado del objetivo en la dirección del movimiento.
* **Criterios de auditoría en código e interfaz:**
  1. **Tamaño mínimo táctil:** Todo botón, enlace o control de acción frecuente debe contar con un área de contacto efectiva de al menos **44×44px** (recomendación WCAG 2.5.5 y Material Design; mínimo admisible WCAG 2.5.8 de 24×24px).
  2. **Espaciado preventivo de acciones antagónicas:** Controles destructivos y constructivos contiguos (ej. «Confirmar» vs «Cancelar») deben mantener una separación mínima de **8px a 12px** (`gap-3`) para evitar toques accidentales.
  3. **Accesibilidad en navegación:** Accesos primarios deben situarse en zonas de alcance natural (bordes de pantalla, esquinas o barra de navegación fija).

### ⚡ 2. Ley de Hick (Tiempo de Decisión y Selección)

* **Formulación matemática:**
  $$T = b \log_2(n + 1)$$
  Donde $T$ es el tiempo que toma decidir entre $n$ alternativas equiprobables.
* **Criterios de auditoría en código e interfaz:**
  1. **Agrupación y jerarquía:** Cuando $n > 5$, organizar las opciones en categorías semánticas, chips temáticos o menús en cascada.
  2. **Desambiguación léxica obligatoria:** En modales o menús de decisión, **prohibir** que dos botones compitan con la misma raíz léxica (ej. «Cancelar» vs «Cancelar plan»). Emplear verbos explícitos orientados al resultado (ej. «Mantener plan» vs «Sí, cancelar plan»).
  3. **Divulgación progresiva:** Mostrar inicialmente las opciones más frecuentes y permitir revelar opciones avanzadas a demanda.

### 🧠 3. Teoría de la Carga Cognitiva (Memoria de Trabajo y Reconocimiento)

* **Fundamento psicológico:**
  La memoria de trabajo humana está restringida a $7 \pm 2$ piezas de información concurrentes (Miller / Sweller).
* **Criterios de auditoría en código e interfaz:**
  1. **Reconocimiento antes que recuerdo (Nielsen H6):** El usuario no debe memorizar datos de pantallas anteriores para tomar una decisión en la pantalla actual.
  2. **Diálogos de confirmación auto-contenidos:** Un modal o freno de emergencia debe resumir el contexto crítico del elemento afectado (nombre, fecha o consecuencia) antes de solicitar la acción.
  3. **Tarjetas de evento y estado autónomas:** Todo registro de cambio debe responder de inmediato a sus dimensiones clave (qué ocurrió, cuándo, resultado y elemento involucrado) sin forzar a navegar al detalle.

---

## 2. Flujo de Trabajo y Documentación de Decisiones

Al evaluar o implementar una funcionalidad en Planazo:

1. **Definir la Línea Base (El "Antes"):**
   * Identificar cómo se resolvía la tarea previo a la mejora (ej. ausencia de historial, acceso oculto en menús, botones de 20px, opciones masivas sin agrupar, o esfuerzo de memoria de trabajo).
   * Registrar la captura en `docs/evidencias/.../<Principio>-antes.png`.
2. **Diseñar la Solución Ergonómica (El "Después"):**
   * Aplicar las fórmulas ergonómicas en componentes de frontend (`apps/frontend/src/...`).
   * Validar en código: clases de Tailwind (`min-h-[44px]`, `px-4`, `py-2`, `gap-3`), estructura de chips o tarjetas autónomas.
   * Registrar la captura en `docs/evidencias/.../<Principio>-despues.png`.
3. **Justificación Técnica:**
   * Explicar la reducción concreta de tiempo motriz ($T_{\text{Fitts}}$), tiempo de decisión ($T_{\text{Hick}}$) o carga intrínseca/extrínseca en la memoria de trabajo.
4. **Verificación Automatizada:**
   * Escribir pruebas unitarias en Vitest (`*.test.tsx` o `*.test.ts`) que verifiquen el renderizado, accesibilidad de targets y filtrado. Mínimo 4 tests por suite.

---

## 3. Reglas de Entrega y Versionado

* **Sin atribución de IA:** Prohibido agregar `Co-Authored-By` o menciones de IA en commits, pull requests, issues o documentación.
* **Formato de Commits:** Conventional Commits relacionando los sub-issues (`feat(...)`, `fix(...)`, `docs(...)`, `test(...)`).
