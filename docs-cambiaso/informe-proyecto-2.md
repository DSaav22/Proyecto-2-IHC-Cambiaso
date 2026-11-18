# Informe · Proyecto 2 · Planazo

Integrante: Diego Joaquín Saavedra Alberto  
Modalidad: sin IA  
Fork: https://github.com/DSaav22/Proyecto-2-IHC-Cambiaso

## 1. Problema

Organizar un plan en grupo (fecha, lugar, plata y quiénes van) se fragmenta en chats y hojas sueltas. Se pierde el estado, se duplican mensajes y salir del plan o de la cuenta queda confuso.

## 2. Usuario

Estudiantes y amigos que arman planes cortos: quieren crear, invitar, votar, repartir gastos y poder irse o borrar su cuenta sin trampas.

## 3. Oportunidad

Una sola app web donde el grupo ve el mismo estado (pendiente / confirmado / cancelado), vota con reglas claras, reparte gastos y respeta privacidad y consentimiento.

## 4. Solución (Planazo)

SPA React + API Express + PostgreSQL. Flujos principales:

1. Registro / login
2. Crear plan y unirse por código
3. Invitar con consentimiento (no se suma a nadie sin aceptar)
4. Votar fechas y lugares (varios votos, cerrar votación)
5. Gastos, saldos y pagos
6. Abandonar plan (bloqueado si hay deuda)
7. Mis datos: ver, descargar JSON/CSV y eliminar cuenta con la regla de Planazo
8. Analítica agregada sin datos personales

## 5. Funcionalidades por tarea

| Entrega | Qué quedó en el producto |
| --- | --- |
| Tarea 5–8 | Invitar, votar, varios votos, gastos |
| Tarea 9 | Retirarse + analítica/eventos |
| Tarea 10 | Mis datos y salida honesta |
| Clase 20 | Mis planes por rol (organizo / me invitaron) |
| Clase 22 | Consentimiento al invitar (`fix(etica)`) |
| Clase 23 | Inventario, tokens y conteo de colores fijos |

Evidencias en `docs-cambiaso/evidencias/`.

## 6. Decisiones justificadas

- **Consentimiento al invitar:** privacidad por defecto; el invitado no aparece en gastos ni lista hasta aceptar (Clase 22).
- **Confirmaciones honestas:** mismo peso visual, consecuencias en el texto, sin culpa (abandonar / eliminar cuenta).
- **Tokens por uso:** `primary`, `destructive`, `background`… mismos nombres en Figma y en `tokens.css`.
- **Analítica sin PII:** se registra la acción, no el nombre ni el correo.

## 7. Mapa de conexión (código)

```
UI (pages/components)
  → hooks/
  → api/client
  → Express routes/
  → services/ + Prisma
  → PostgreSQL
```

Diseño: [sistema-diseno.md](sistema-diseno.md) · Figma: https://www.figma.com/design/pBxjOBJbn05pgSRLh0fxrw

## 8. Comparación IA / sin IA

Modalidad declarada: **sin IA** en las evidencias de clase. El código del fork se trabajó y revisó a mano sobre la base del monorepo recibido; las pruebas E2E y unitarias protegen los flujos agregados.

## 9. Calidad y despliegue

- Suite E2E en `tests/` y unitarias Vitest en `apps/*/src/**/*.test.*`
- Coverage + `diff-cover` del código del fork: ver README
- GitHub Actions: `.github/workflows/pruebas.yml`
- Accesibilidad: [accesibilidad.md](accesibilidad.md)
- Usuarios de prueba (seed): `usuario1@planazo.com` / `usuario2@planazo.com` · `Planazo123!`
