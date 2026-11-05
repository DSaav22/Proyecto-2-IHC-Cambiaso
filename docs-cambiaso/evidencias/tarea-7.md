# Tarea 7 — Dos cambios, dos commits

## 1. Mejora por feedback

### Problema detectado

En la coordinación de un plan se podían proponer fechas anteriores al día actual.
Además, las fechas y los lugares aparecían dentro del mismo bloque, lo que hacía
menos claro qué se estaba coordinando.

### Cambio realizado

Se agregó una validación para que las fechas propuestas no sean anteriores al día
actual. La fecha del día sí se puede seleccionar.

También se separó la coordinación en dos secciones:

- Fechas.
- Lugares.

El acceso a la coordinación queda disponible después de crear el plan, sin mezclarlo
con el formulario inicial.

### Evidencia

Al proponer una fecha, el selector no permite escoger días anteriores. Las fechas y
los lugares aparecen en secciones independientes, con sus propios controles para
proponer y votar.

### Feedback utilizado

[Feedback recibido en la evaluación](../../clase-19-feedback-a-otro-proyecto/saavedra-alberto/feedback.md)

### Commit

- `f675c5d` — `Fix: Mostrar Confirmacion al solicitar participar`

> El commit también incluye la validación de fechas y la separación del acceso a la
> coordinación, que son los cambios comprobados en esta entrega.

## 2. Funcionalidad del caso

### Necesidad

Después de votar por distintas fechas y lugares, el creador necesitaba una forma
clara de cerrar la coordinación y confirmar el resultado final del plan.

Cerrar la votación por sí solo no indicaba qué opción había ganado ni dejaba
registrado el resultado elegido.

### Cambio realizado

Se agregó un flujo de confirmación desde la votación:

- Se identifica la opción líder de Fechas y de Lugares.
- Si existe un empate, el creador debe seleccionar una de las opciones empatadas.
- Para resolver un empate se solicita un motivo.
- Se guarda la fecha, el lugar, la persona que confirmó y el motivo.
- La votación se cierra al confirmar el plan.
- Las propuestas y los votos quedan bloqueados después de la confirmación.
- El resultado confirmado queda visible para los participantes.

También se contempló el caso de una votación que había sido cerrada anteriormente
sin registrar una decisión. En ese caso, el creador puede completar la confirmación
seleccionando los resultados.

### Evidencia

Con dos opciones de fecha y dos opciones de lugar, cada participante puede votar
por más de una opción. Al seleccionar la opción para confirmar:

1. Se muestran las opciones líderes.
2. Si hay empate, aparece el selector correspondiente.
3. El motivo es obligatorio cuando se resuelve un empate.
4. Después de confirmar aparece el resultado del plan.
5. Los controles para proponer y votar dejan de estar disponibles.

### Commit

- Pendiente de crear después de terminar la verificación final de esta funcionalidad.

## Verificación

Se realizaron las siguientes comprobaciones:

- Backend: suite de pruebas unitarias.
- Frontend: suite de pruebas unitarias.
- Typecheck del backend.
- Build de producción del frontend.
- Lint del proyecto.

La documentación y los commits deben mantenerse separados: un commit para la mejora
por feedback y otro para la funcionalidad del caso.
