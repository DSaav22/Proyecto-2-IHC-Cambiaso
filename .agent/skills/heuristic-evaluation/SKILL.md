---
name: heuristic-evaluation
description: Directivas y flujo para ejecutar evaluaciones heurísticas (Nielsen H1–H10) en Planazo. Usar cuando se requiera evaluar usabilidad de una funcionalidad, registrar evidencias, crear o resolver sub-issues de hallazgos.
license: MIT
metadata:
  author: Planazo Team
  version: "1.0"
---

# Evaluación Heurística (IHC) — Protocolo Planazo

## 1. Alcance y Escala de Severidad (Nielsen)

- La evaluación se realiza por **funcionalidad específica**, analizando de forma sistemática las 10 Heurísticas de Jakob Nielsen (H1 a H10).
- **Escala de Severidad (0 a 4):**
  - **0 (Sin problema):** Cumple satisfactoriamente en código e interfaz.
  - **1 (Cosmético):** Detalle estético menor; se corrige si hay tiempo disponible.
  - **2 (Menor):** Dificulta levemente la interacción, pero permite al usuario continuar.
  - **3 (Mayor):** Problema importante de usabilidad; genera confusión o incertidumbre grave.
  - **4 (Catastrófico):** Bloquea por completo la concreción de la tarea.

## 2. Gestión de Issues en GitHub

- **Issue Principal (Tracker):**
  - Título: `Evaluación heurística H1–H10 · <funcionalidad>`.
  - Contiene la lista verificable de H1 a H10 (las que cumplen explican por qué; las que fallan referencian sus sub-issues).
  - Permanece **abierto** durante el desarrollo y se cierra al completar la entrega.
- **Sub-issues Atómicos (Solo para hallazgos con severidad > 0):**
  - No crear 10 issues al inicio. Solo se crean sub-issues para los hallazgos que requieren corrección en código.
  - Cada sub-issue debe ser conciso pero auto-contenido:
    1. Heurística, severidad y funcionalidad evaluada (`Refs #<issue-padre>`).
    2. **Antes (Problema observable):** Comportamiento actual en código y pantalla.
    3. **Después (Mejora propuesta):** Solución técnica concreta alineada a `DESIGN.md` (sin librerías superfluas).
    4. **Criterios de Aceptación:** Checklist de verificación (UI, tests unitarios en Vitest, capturas).
    5. **Archivos afectados.**
    6. **Commit de cierre:** `fix: <descripción> (Closes #<sub-issue>, Refs #<issue-padre>)`.

## 3. Entrega Oficial y Evidencias

- **Documento oficial:** `docs/evaluacion-heuristica.md`
  - Resumen ejecutivo con tabla de 5 columnas: `Observación | Heurística | Severidad (0-4) | Mejora | Comprobación`.
  - Registro detallado H1 a H10 con código fuente y capturas embebidas.
  - Toda heurística debe terminar en estado **«Cumple»** o **«Corregida»**.
- **Evidencias gráficas:** Guardadas en `docs/evidencias/` con nomenclatura estándar (`H<num>-antes.png`, `H<num>-despues.png`).
- **Sin atribución de IA:** Prohibido incluir `Co-Authored-By` o menciones de IA en commits, issues o PRs.
