# Feedback a otro proyecto - Clase 19

- **Nombre completo del evaluador: Diego Joaquin Saavedra Alberto** 
- **Mi grupo y caso de estudio: Planazo - crear un plan, agregar dos opciones y votar por una de ellas** 
- **Grupo y caso de estudio evaluado: Trueque U - Encontrar una publicacion y eviar una oferta desde una cuenta de prueba** 
- **Integrantes del proyecto evaluado: Mamani Sandoval - Justiniano Becerra** 
- **URL de la app y repositorio evaluado:http://localhost:33255/ - https://github.com/gadrilee/TruequeU_2ndP** 
- **Fecha y versión/commit probado (si está disponible):** 

## Primera impresión
Se entiende altiro que es trueque entre estudiantes: login con cuentas de prueba, perfil y feed con cards. Lo que más confunde al llegar a Explorar publicaciones es que cada card ajena muestra dos acciones juntas —«Ofrecer un objeto» y «Reservar»— y no queda claro cuál es el camino del trueque con intercambio de objetos versus solo apartar. El perfil también concentra muchas salidas (crear, mis publicaciones, ofertas, historial), así que al inicio cuesta ubicar el orden del caso: explorar → ofertar → revisar en Ofertas de trueque.

## Funcionalidad asignada y resultado
La tarea era encontrar una publicación ajena y enviar una oferta desde una cuenta de prueba. Entré con Job (`contrerasjob123@gmail.com` / `contreras123`), fui a Explorar publicaciones, elegí un ítem disponible de otro usuario (p. ej. de Eudenia o Carlos), pulsé «Ofrecer un objeto», en el diálogo seleccioné una publicación mía disponible y envié. La oferta quedó pendiente y apareció en Ofertas de trueque (enviadas); del otro lado, en recibidas del dueño.

Marcar solo una opción:
- [x] La completé sin ayuda.
- [ ] La completé con ayuda. ¿Cuál?
- [ ] No pude completarla. ¿Dónde me detuve?

## Qué no funcionó
El envío de la oferta en sí funcionó con Docker y datos semilla. Los rozamientos de uso fueron: (1) competición visual entre Ofertar y Reservar en la misma card; (2) tras enviar, el feed no marca esa publicación como “ya ofertada” —solo un SnackBar pide ir a Ofertas—; (3) si el diálogo está vacío y te manda a Crear publicación, al guardar vuelves al perfil y pierdes el objeto que ibas a pedir; (4) un objeto ya usado en otra oferta pendiente no se puede reutilizar (mensaje 409 claro), pero en el diálogo de oferta no se anticipa cuáles están “comprometidos”.

## Qué mejoraría y por qué
Tras enviar una oferta, refrescar la card o mostrar un chip «Oferta enviada» y un acceso directo a Ofertas de trueque, para cerrar el ciclo sin depender solo del SnackBar. También aclararía en la ayuda del feed (o bajo los botones) la diferencia entre ofertar un objeto propio y solo reservar, porque es el punto donde un evaluador nuevo duda qué botón cumple el caso de estudio.

## Qué quitaría y por qué
No quitaría Ofertar ni el diálogo; quitaría o bajaría de jerarquía el botón «Reservar» en la misma card cuando el flujo principal es el trueque por objetos (dejarlo en menú secundario o en el detalle). Así la card comunica una sola acción principal y baja la carga de decidir entre dos caminos parecidos.