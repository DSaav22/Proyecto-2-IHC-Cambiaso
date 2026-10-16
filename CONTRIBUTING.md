# Guía de Contribución - Planazo

¡Gracias por tu interés en contribuir a **Planazo**! Este proyecto es un monorepo orientado al desarrollo ágil y estructurado, integrando desarrollo asistido y guiado por especificaciones con **Gentle-AI** y **OpenSpec**.

Para mantener la consistencia técnica y la calidad del código, todos los colaboradores y agentes automatizados deben seguir estas pautas.

---

## 1. Regla de Oro: Gestor de Paquetes

> [!CAUTION]
> **ESTÁ ESTRICTAMENTE PROHIBIDO EL USO DE `npm` O `yarn`.**
> Todo el ciclo de vida de dependencias, scripts y ejecución del monorepo debe gestionarse **exclusivamente con `pnpm`**.

* **Instalación de dependencias:** `pnpm install`
* **Agregar dependencia en un workspace:** `pnpm --filter <app> add <paquete>`
* **Ejecución de scripts:** `pnpm <script>` o `pnpm --filter <app> <script>`
* **Binarios puntuales:** `pnpm exec <bin>` o `pnpm dlx <paquete>` (nunca `npx`).
* Esta regla es idéntica en [AGENTS.md](AGENTS.md); ambos documentos deben mantenerse alineados.

---

## 2. Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas en tu entorno local:

* **Node.js**: `>= 20.x` (LTS recomendada)
* **pnpm**: `>= 9.x` (actívalo con `corepack enable pnpm`)
* **Docker & Docker Compose**: Para orquestar PostgreSQL y los contenedores de desarrollo.
* **Git**: Para el control de versiones.

---

## 3. Arquitectura del Monorepo

El repositorio está organizado como un monorepo basado en workspaces de `pnpm`:

```text
├── apps/
│   ├── frontend/         # React + Vite + TailwindCSS
│   └── backend/          # Node.js + Express + Prisma ORM
├── docs/                 # Documentación técnica y especificaciones de producto
├── openspec/             # Especificaciones, propuestas y cambios de OpenSpec
├── docker-compose.yml    # Orquestación de servicios (db, backend, frontend)
├── pnpm-workspace.yaml   # Configuración de workspaces de pnpm
├── AGENTS.md             # Instrucciones y restricciones para agentes de IA
├── CONTRIBUTING.md       # Esta guía
└── README.md             # Documentación e inicio rápido
```

---

## 4. Inicio Rápido para Desarrollo

1. **Clonar el repositorio:**

   ```bash
   git clone <url-del-repositorio>
   cd Proyecto-2-IHC
   ```

2. **Instalar dependencias del monorepo:**

   ```bash
   pnpm install
   ```

3. **Variables de entorno (opcional):**
   * `docker-compose.yml` ya define valores por defecto de desarrollo. Para personalizarlos copia `.env.example` a `.env` en la raíz.

4. **Levantar el entorno completo:**

   ```bash
   pnpm dev
   ```

   Esto inicia los servicios orquestados en Docker:
   * **Frontend:** `http://localhost:5173`
   * **Backend API:** `http://localhost:3000`
   * **PostgreSQL:** `localhost:5432`

---

## 5. Base de Datos y Seeders

El backend utiliza **Prisma ORM** conectado a PostgreSQL.

### Migraciones

Para aplicar cambios de esquema:

```bash
pnpm --filter backend prisma migrate dev
```

### Seeders de Datos (Usuarios de Prueba)

El proyecto incluye scripts de inicialización de datos para que existan usuarios base desde el primer arranque:

```bash
pnpm --filter backend prisma db seed
```

Desde el host, este comando necesita `DATABASE_URL` apuntando a `localhost:5432` (ver `.env.example`; el servicio `db` publica ese puerto). Dentro de Docker el seed corre automáticamente al iniciar el backend.

*(Consulta el [README.md](README.md) para conocer las credenciales de los usuarios sembrados por defecto).*

---

## 6. Flujo de Trabajo Spec-Driven (Gentle-AI & OpenSpec)

El desarrollo en Planazo sigue la metodología **Spec-Driven Development (SDD)**:

1. **No codificar sin especificación:** Ninguna funcionalidad o cambio de arquitectura se escribe directamente sin antes definir su propuesta y tareas.
2. **Ciclo de OpenSpec (con OpenSpec directo o con Gentle-AI):** ambos caminos son válidos y generan los mismos artefactos en `openspec/changes/<cambio>/`.
   * **Explorar:** Clarificar requerimientos y analizar el estado actual (`/opsx-explore` o `/gentle-sdd-explore`).
   * **Proponer:** Crear la propuesta formal con deltas de especificación, diseño y lista de tareas (`/opsx-propose`, o `/gentle-sdd-new` seguido de `/gentle-sdd-ff`).
   * **Implementar:** Ejecutar las tareas paso a paso (`/opsx-apply` o `/gentle-sdd-apply`, y `/gentle-sdd-verify` para validar).
   * **Sincronizar / Archivar:** Actualizar las especificaciones principales y archivar el cambio completado (`/opsx-sync` y `/opsx-archive`, o `/gentle-sdd-archive`).
   * **Almacén de artefactos:** con Gentle-AI elige **OpenSpec** o **Ambos** (hybrid con Engram); solo Engram no deja archivos en el repo y no es válido. Tus preferencias personales (ritmo, estrategia de PR) no se commitean.
   * **Validación común:** un cambio es válido si `openspec validate <cambio>` pasa, sin importar la herramienta usada.
3. **Respeto a documentos existentes:** El archivo [docs/project-card.md](docs/project-card.md) contiene la ficha institucional del proyecto y **no debe modificarse**.

---

## 7. Estándares de Código y Commits

* **Conventional Commits:** Todos los mensajes de commit deben seguir el estándar:
  * `feat: <descripción>` para nuevas funcionalidades.
  * `fix: <descripción>` para corrección de bugs.
  * `docs: <descripción>` para cambios en documentación.
  * `refactor: <descripción>` para reestructuración de código sin cambio funcional.
  * `test: <descripción>` para adición o actualización de pruebas.
  * `chore: <descripción>` para tareas de mantenimiento o configuración.
* **Sin atribución de IA (regla clave):** Ningún commit, pull request, issue, comentario ni documento puede mencionar, referenciar o atribuir contribución a una IA (por ejemplo `Co-Authored-By: Claude ...`, "Generated with ...", "con ayuda de ChatGPT", etc.). La autoría es siempre de la persona que contribuye.
* **TypeScript & Tipado:** Priorizar tipado estricto en frontend y backend.
* **Validación:** Antes de enviar un pull request o finalizar una tarea, verifica que el linter y las pruebas pasen sin errores.

---

## 8. Gestión de Issues y Pull Requests

Para mantener el orden del equipo sin burocracia innecesaria y alinearse con la metodología docente:

### Requisitos Docentes y Descomposición en Sub-issues

Cuando el docente asigne un issue con un requerimiento (por ejemplo, #7 o #8):

1. **El issue padre NO se cierra:** Representa la solicitud oficial del docente y permanece abierto hasta su revisión y aprobación formal en clase.
2. **Descomposición obligatoria (mínimo 3 sub-issues):** Todo requerimiento docente debe dividirse en **al menos 3 sub-issues pequeños y atómicos** para evitar tareas sobredimensionadas. La partición debe reflejar las capas de la arquitectura:
   * **Sub-issue 1 (Regla / Backend / Persistencia):** Lógica de dominio, estados, validación y persistencia en base de datos.
   * **Sub-issue 2 (API / Consulta / Filtros):** Endpoints HTTP, validación de parámetros, construcción de queries y respuesta del servidor.
   * **Sub-issue 3 (Interfaz / UX / Accesibilidad):** Componentes UI, estado en frontend, sincronización con URL, accesibilidad y estados vacíos.
3. **Relación commits ↔ sub-issues:** Cada commit debe estar directamente relacionado con su sub-issue (`Refs #<sub-issue>` o `#<sub-issue>` en el mensaje del commit).
4. **Cierre progresivo:** Los sub-issues se cierran conforme se completan y mergean sus cambios.

### Evaluación Heurística (IHC)

Para las evaluaciones de usabilidad según las 10 Heurísticas de Nielsen (H1–H10):

* Consultar el protocolo operativo completo en la skill `heuristic-evaluation` y el informe oficial en [docs/evaluacion-heuristica.md](docs/evaluacion-heuristica.md).
* **Reglas clave:** Único issue principal tracker (`Evaluación heurística H1–H10 · <funcionalidad>`) con lista verificable, sub-issues atómicos únicamente para hallazgos con severidad 1 a 4, y commits de cierre individuales (`fix: ... (Closes #<sub-issue>, Refs #<padre>)`).

### Issues Generales

* Toda tarea o requerimiento fuera de los requisitos docentes debe registrarse en una issue breve con:
  * **Objetivo:** Qué se busca resolver o implementar.
  * **Criterios de Aceptación:** Qué comportamiento define que la tarea está terminada.
  * **Pruebas esperadas:** Qué casos de prueba unitaria deben cubrirse (mínimo 4 si involucra reglas de negocio o transiciones de estado, según [AGENTS.md](AGENTS.md)).

### Pull Requests (PRs)

* Crear una rama descriptiva (`feat/<nombre>`, `fix/<nombre>`).
* Estructurar los PRs alineados a los sub-issues (o PRs por fases bien delimitadas).
* **Referencias y cierre en PRs:**
  * Usar `Closes #<número-sub-issue>` para que el sub-issue completado se cierre automáticamente al mergear.
  * Usar `Refs #<número-issue-padre>` para referenciar el issue general del docente (**NUNCA usar `Closes` sobre el issue del docente**).
* La descripción de la PR no debe contener referencias ni atribuciones a ninguna IA.
* Respetar las responsabilidades de [ARCHITECTURE.md](ARCHITECTURE.md):
  * Backend: lógica y reglas de estado en `services/`, validación HTTP en `routes/`.
  * Frontend: llamadas en `api/`, estado en `hooks/`, presentación en `components/`.
* Verificar que pasen las pruebas (`pnpm --filter backend test` / `pnpm --filter frontend test`) antes de solicitar revisión.
