# Tarea de Clase 15: Evaluación Heurística (IHC)

**Asignatura:** Interacción Humano-Computador  
**Proyecto:** Planazo  
**Flujo evaluado:** Gestión y cancelación de planes en `/mis-planes`  

---

## 1. Descripción de la Tarea

Ejercicio práctico de evaluación heurística en clase aplicando los principios de usabilidad de Jakob Nielsen sobre la interfaz de **Planazo**. Se seleccionaron **3 heurísticas (H1, H2 y H4)** para analizar la interacción del usuario al gestionar y cancelar planes, identificando al menos un problema de usabilidad con severidad mayor a 0 para formular su propuesta de solución técnica.

---

## 2. Tabla de Hallazgos Heurísticos

| Pantalla y evidencia | Comportamiento observado y consecuencia | Heurística de Nielsen | Severidad (0-4) |
| :--- | :--- | :--- | :---: |
| **H1: Catálogo `/mis-planes` — Cancelación de plan con scroll**<br><br>*Evidencia:* [`PlanCard.tsx`](../apps/frontend/src/components/domain/PlanCard.tsx) y [`MyPlansPage.tsx`](../apps/frontend/src/pages/MyPlansPage.tsx).<br><br>*Paso:* Tras desplazarse hacia abajo en la lista para buscar un plan, el usuario pulsa «Cancelar plan» en la tarjeta y confirma en el diálogo modal. | **Falta de retroalimentación contextual en el punto de atención.**<br><br>*Dónde:* En la lista de planes, tras confirmar la cancelación de un plan ubicado abajo en la grilla.<br>*Qué ocurre:* El modal se cierra y la tarjeta cambia de estado, pero el mensaje de éxito se renderiza fijo en la parte superior de la página, quedando fuera del viewport visible.<br>*Consecuencia:* El usuario no percibe la confirmación de la acción y queda con la incertidumbre de si la cancelación se procesó correctamente en el servidor. | **H1: Visibilidad del estado del sistema** ⚠️ *(Falla · A resolver)*<br><br>El sistema debe mantener al usuario informado mediante retroalimentación visible y oportuna en su foco de visión inmediato. | **3**<br>(Mayor) |
| **H2: Catálogo `/mis-planes` — Fechas relativas en tarjetas**<br><br>*Evidencia:* [`plans.ts:L9-L54`](../apps/frontend/src/lib/plans.ts#L9-L54) y [`PlanCard.tsx:L220-L232`](../apps/frontend/src/components/domain/PlanCard.tsx#L220-L232).<br><br>*Paso:* El usuario revisa la fecha de vencimiento de los planes listados. | **Uso de lenguaje natural y familiar para el usuario.**<br><br>*Dónde:* En la sección inferior de cada tarjeta de plan.<br>*Qué ocurre:* El sistema formatea las marcas de tiempo a expresiones cotidianas (*"En 3 días"*, *"Es hoy"*, *"Mañana"*) y añade insignias de tiempo (*"Por vencer"*, *"A tiempo"*).<br>*Consecuencia:* El usuario comprende de forma intuitiva los plazos de su evento sin tener que interpretar fechas técnicas ISO ni hacer cálculos mentales de calendario. | **H2: Concordancia entre el sistema y el mundo real** ✅ *(Cumple)*<br><br>Utiliza palabras, frases y conceptos cotidianos y familiares en lugar de terminología técnica de base de datos. | **0**<br>(Sin problema) |
| **H4: Navegación y componentes — Jerarquía de botones y acciones**<br><br>*Evidencia:* [`tokens.css`](../apps/frontend/src/tokens.css), [`button.tsx`](../apps/frontend/src/components/ui/button.tsx) y [`PlanCard.tsx:L234-L245`](../apps/frontend/src/components/domain/PlanCard.tsx#L234-L245).<br><br>*Paso:* El usuario interactúa con los controles de acción de las tarjetas. | **Uniformidad visual y respeto a convenciones de diseño.**<br><br>*Dónde:* En los botones de acción de la tarjeta y el menú contextual.<br>*Qué ocurre:* Los botones mantienen variantes consistentes: «Confirmar plan» como primario sólido (`default`) y «Cancelar plan» como secundario con contorno (`variant="outline"`), reservando el color rojo (`destructive`) únicamente para el modal de confirmación final. El menú de opciones (⋮) siempre se sitúa arriba a la derecha.<br>*Consecuencia:* El usuario anticipa con precisión el comportamiento de la interfaz y la jerarquía de cada acción sin tener que reaprender convenciones. | **H4: Consistencia y estándares** ✅ *(Cumple)*<br><br>Mantiene las mismas convenciones visuales, posicionamiento y terminología en toda la interfaz según el sistema de diseño. | **0**<br>(Sin problema) |

---

## 3. Registro Visual de Evidencias

A continuación se presentan las capturas que respaldan el diagnóstico de usabilidad para cada heurística evaluada:

### Evidencias H1: Visibilidad del estado del sistema (Secuencia de falla)

* **Paso 1:** Con desplazamiento activo en la lista, el usuario abre el modal de cancelación en un plan ubicado abajo.  
  ![H1 Paso 1 - Modal de cancelación tras scroll](evidencias/H1-P1.png)

* **Paso 2:** Al confirmar, el modal se cierra pero el viewport no muestra ningún aviso ni mensaje de éxito.  
  ![H1 Paso 2 - Vista sin confirmación visible en viewport](evidencias/H1-P2.png)

* **Paso 3:** El usuario debe desplazarse manualmente hasta el tope de la página para encontrar el aviso verde.  
  ![H1 Paso 3 - Scroll forzado hasta el tope para ver el aviso](evidencias/H1-P3.png)

---

### Evidencia H2: Concordancia entre el sistema y el mundo real

* **Tarjeta de plan con fecha amigable:** Muestra la fecha relativa (*"En 3 días"*, *"Es hoy"*) y la insignia de estado en lenguaje coloquial comprensible.  
  ![H2 Lenguaje natural y fechas amigables](evidencias/H2.jpeg)

---

### Evidencia H4: Consistencia y estándares

* **Consistencia visual y jerarquía de botones:** Muestra en la tarjeta el botón primario «Confirmar plan» (sólido) junto al secundario «Cancelar plan» (`outline`), con el menú de tres puntos (⋮) fijo arriba a la derecha.  
  ![H4 Consistencia visual y funcional en botones](evidencias/H4.jpeg)

---

## 4. Detalle del Hallazgo a Solucionar (H1)

Siguiendo la consigna de la clase de seleccionar al menos un hallazgo para corregir, se documenta la ficha de diagnóstico y la propuesta de mejora técnica para **H1**:

### Ficha del Problema (Formato de Clase)

* **Dónde:** En la pantalla `/mis-planes`, tras desplazarse con scroll hacia abajo y presionar «Cancelar plan» en una tarjeta.
* **Qué ocurre:** El diálogo modal se cierra y el plan cambia su estado a cancelado, pero el cartel de confirmación verde queda renderizado arriba de todo en el layout, fuera de la pantalla visible del usuario.
* **Consecuencia:** No se visualiza si el sistema procesó la solicitud, provocando confusión e incertidumbre sobre si la acción se guardó.
* **Heurística afectada:** **H1 - Visibilidad del estado del sistema** (Severidad 3 - Mayor).

### Propuesta de Solución

1. **Notificación flotante en el viewport (Toast):** Reubicar el componente de aviso para que se renderice como una notificación flotante anclada a la esquina inferior derecha de la ventana (`fixed bottom-5 right-5 z-50`).
2. **Independencia del desplazamiento:** Garantizar que el mensaje de éxito sea visible de inmediato tras confirmar la cancelación, sin importar cuánto scroll haya hecho el usuario en la lista de planes.
3. **Persistencia temporal accesible:** Configurar un cierre automático a los pocos segundos permitiendo también el cierre manual mediante botón de descarte.

* **Resultado propuesto con la notificación contextual en viewport:**  
  ![H1 Solución propuesta con notificación flotante](evidencias/H1-despues.png)
