# Arquitectura del Proyecto - Planazo

Este documento define la estructura y responsabilidades de carpetas para el backend y el frontend. Está diseñado para ser simple, modular y fácil de entender.

---

## 1. Visión General del Monorepo

El proyecto se divide en dos aplicaciones independientes dentro de `apps/`:

- **`apps/backend`**: API REST en Node.js, Express y Prisma ORM.
- **`apps/frontend`**: SPA en React, TypeScript, Tailwind CSS y Vite.

---

## 2. Backend (`apps/backend/src`)

Sigue una **Arquitectura en Capas (Layered)**. El flujo de una petición es siempre:
`HTTP Request` ➔ `Route (Middleware + Validación)` ➔ `Service / Store` ➔ `Prisma (BD)` ➔ `HTTP Response`.

### Estructura de Carpetas Backend

```text
apps/backend/src/
├── app.ts            # Configuración de Express, CORS, middlewares globales y montaje de rutas
├── server.ts         # Punto de entrada (listen de HTTP)
├── routes/           # Definición de endpoints HTTP y validación con Zod
├── services/         # Lógica de negocio y consultas a base de datos (Prisma)
├── middleware/       # Interceptores (ej. requireAuth, control de errores)
└── lib/              # Configuración (config.ts), cliente Prisma (prisma.ts) y schemas Zod
```

### Responsabilidades en Backend

| Capa | Responsabilidad | Qué contiene | Qué NO debe contener |
| :--- | :--- | :--- | :--- |
| **`routes/`** | Recibir `req`/`res`, parsear parámetros, validar con Zod y devolver códigos HTTP. | Routers de Express, schemas de entrada. | Consultas SQL/Prisma directas, lógica pesada de negocio. |
| **`services/`** | Lógica de negocio y acceso a datos. | Funciones o clases que interactúan con Prisma. | Objetos `req` o `res` de Express. |
| **`middleware/`** | Filtros previos a las rutas. | Autenticación (`requireAuth`), validaciones previas. | Lógica de negocio de la aplicación. |
| **`lib/`** | Herramientas transversales compartidas. | Instancia de Prisma, JWT helpers, env vars. | Rutas o lógica particular de un dominio. |

---

## 3. Frontend (`apps/frontend/src`)

Sigue una **Arquitectura Modular Separada por Responsabilidad** (Hook + Presentational).
El flujo es: `Page` ➔ `Custom Hook` ➔ `API Client` ➔ `Backend`.

### Estructura de Carpetas Frontend

```text
apps/frontend/src/
├── App.tsx           # Configuración de rutas (React Router)
├── main.tsx          # Punto de entrada y montaje en el DOM
├── pages/            # Vistas completas asociadas a una ruta URL (ej. LoginPage, MyPlansPage)
├── components/       # Componentes visuales reutilizables
│   ├── ui/           # Primitivos base de diseño accesibles (Botones, Inputs, Dialogs)
│   └── domain/       # Componentes específicos de negocio (Cards, Forms, Navbars)
├── hooks/            # Custom hooks para estado y orquestación con la API (ej. usePlans)
├── api/              # Cliente HTTP centralizado y contratos de tipos (client.ts)
├── auth/             # Contexto de sesión de usuario y guardias de ruta (AuthContext, routes)
└── lib/              # Utilidades puras, formateadores de fechas, helpers sin UI
```

### Responsabilidades en Frontend

| Directorio | Responsabilidad | Qué contiene |
| :--- | :--- | :--- |
| **`pages/`** | Orquestar la vista. Conecta hooks con componentes visuales. | Vistas montadas en rutas de `App.tsx`. |
| **`components/ui/`** | Piezas atómicas de diseño reutilizables sin lógica de negocio. | Botones, inputs, badges, diálogos base. |
| **`components/domain/`** | Componentes de interfaz con contexto del negocio. | `PlanCard`, `PlanList`, `PlanForm`, `Navbar`. |
| **`hooks/`** | Manejo de estado local, efectos y llamadas a la API. | `usePlans`, `useDebounce`, etc. |
| **`api/`** | Funciones que realizan `fetch` al backend con tipado estricto. | `client.ts` con métodos `api.listPlans()`, etc. |
| **`lib/`** | Funciones utilitarias puras (sin hooks ni JSX). | `comparePlans`, formateo de fechas, cálculo de días. |

---

## 4. Reglas Clave para Evitar Mezclas ("Chiperío")

1. **Sin consultas directas en rutas:** El backend debe delegar la persistencia y reglas a `services/`.
2. **Separar UI de lógica de red en React:** Las páginas y componentes no deben invocar `fetch` directo en un `useEffect`. Toda llamada a la API vive en un custom hook o en `api/client.ts`.
3. **Tipos e Interfaces en un solo lugar:** Los contratos de datos se definen en `lib/schemas.ts` (backend) y se reflejan en `api/client.ts` (frontend).
4. **Facilidad de defensa universitaria:** Ante la pregunta *"¿Dónde se procesa X?"*:
   - Si es visual ➔ `pages/` o `components/`.
   - Si es llamada al servidor ➔ `hooks/` y `api/`.
   - Si es endpoint o regla de negocio ➔ `routes/` o `services/`.

---

## 5. Estrategia y Estructura de Tests (Vitest)

Para mantener la base de código ordenada y evitar duplicar árboles de carpetas, los tests unitarios siguen estas pautas:

- **Ubicación (Co-ubicación / Colocation):** Cada archivo de test reside en la misma carpeta que el módulo evaluado, bajo el formato `[nombre].test.ts` o `[nombre].test.tsx` (ej: `routes/plans.test.ts` o `components/domain/PlanCard.test.tsx`).
- **Alcance selectivo (Sin sobre-testear):** No se crea un test para cada archivo trivial. Se priorizan exclusivamente archivos puntuales con lógica crítica:
  - *Backend:* Lógica de endpoints en `routes/` o reglas en `services/`.
  - *Frontend:* Formularios, transformaciones de datos o flujos de interacción en `components/` o `hooks/`.
- **Mínimo por archivo:** Todo archivo de test debe contener **al menos 4 tests unitarios** (`it` / `test`) evaluando casos exitosos, errores y casos límite.
