## ADDED & MODIFIED Requirements

### Requirement: Plan activity event logging
The system SHALL record an event in `PlanActivity` whenever a plan is created, confirmed, cancelled, or when a member joins or leaves. Each event SHALL capture:
1. `planId`: Identifier of the affected plan.
2. `userId`: Identifier of the user who triggered the action.
3. `action`: The action type (`created`, `confirmed`, `cancelled`, `joined`, `left`).
4. `previousState`: Plan state before the action, or `null` if not applicable.
5. `newState`: Plan state after the action, or `null` if not applicable.
6. `metadata`: Optional JSON metadata with context (e.g. plan title, member name).
7. `createdAt`: Timestamp when the action occurred.

#### Scenario: Plan creation logs activity
- **GIVEN** an authenticated user
- **WHEN** the user creates a plan with title "Cena de fin de año"
- **THEN** an activity record is created with action `created`, `newState: "pendiente"`, and metadata containing the plan title

#### Scenario: Plan confirmation logs activity
- **GIVEN** an authenticated creator of a pending plan
- **WHEN** the user confirms the plan
- **THEN** an activity record is created with action `confirmed`, `previousState: "pendiente"`, and `newState: "confirmado"`

#### Scenario: Plan cancellation logs activity
- **GIVEN** an authenticated creator of a plan
- **WHEN** the user cancels the plan
- **THEN** an activity record is created with action `cancelled` and `newState: "cancelado"`

#### Scenario: Guest joins plan logs activity
- **GIVEN** an authenticated user joining a plan via share code
- **WHEN** the join request succeeds
- **THEN** an activity record is created with action `joined` and the user's ID

#### Scenario: Guest leaves plan logs activity
- **GIVEN** an authenticated guest member of a plan
- **WHEN** the user leaves the plan
- **THEN** an activity record is created with action `left`

---

### Requirement: User-isolated activity query API
The API SHALL provide an endpoint `GET /api/plans/activity` requiring authentication. The endpoint SHALL accept an optional query parameter `tipo` (`todos`, `estados`, `creaciones`, `participacion`), defaulting to `todos`. The query SHALL strictly isolate events so that a user only sees activity for plans they own or are members of. Results SHALL be ordered by `createdAt` descending (most recent first).

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated client sends `GET /api/plans/activity`
- **THEN** the API responds `401`

#### Scenario: User sees activity only for accessible plans
- **GIVEN** user A and user B have distinct plans and activities
- **WHEN** user A requests `GET /api/plans/activity`
- **THEN** no activities related to user B's non-shared plans are returned

#### Scenario: Thematic filter by state changes
- **GIVEN** activities with various actions (`created`, `confirmed`, `cancelled`, `joined`)
- **WHEN** the user requests `GET /api/plans/activity?tipo=estados`
- **THEN** only activities with action `confirmed` or `cancelled` are returned

#### Scenario: Thematic filter by creations
- **WHEN** the user requests `GET /api/plans/activity?tipo=creaciones`
- **THEN** only activities with action `created` are returned

#### Scenario: Thematic filter by participation
- **WHEN** the user requests `GET /api/plans/activity?tipo=participacion`
- **THEN** only activities with action `joined` or `left` are returned

#### Scenario: Invalid tipo parameter defaults or rejects
- **WHEN** the user requests `GET /api/plans/activity?tipo=invalido`
- **THEN** the API responds `400` with an explanatory Spanish message

---

### Requirement: Activity history interface
The application SHALL provide a dedicated view at route `/historial` displaying the chronological list of user activities. Each activity card (`ActivityCard`) SHALL clearly and autonomously communicate the 4 dimensions of the event without requiring cross-screen lookups:
1. **Qué ocurrió**: Action icon and Spanish title (e.g., "Plan creado", "Plan confirmado", "Plan cancelado", "Nuevo participante").
2. **Cuándo ocurrió**: Exact date/time and relative time in Spanish (e.g., "Hace 15 min", "21 oct 2026, 11:30").
3. **Cuál fue el resultado**: Visual status badge (`pendiente`, `confirmado`, `cancelado`).
4. **Qué elemento estuvo involucrado**: Plan title with an accessible direct link to view the plan.

#### Scenario: Activity card displays all 4 dimensions
- **GIVEN** an activity event for a confirmed plan "Cumpleaños"
- **WHEN** the user visits `/historial`
- **THEN** the card shows the confirmation icon, the text "Plan confirmado", the relative time, the "Confirmado" badge, and the clickable title "Cumpleaños"

#### Scenario: Empty activity state
- **GIVEN** a user with no recorded plan activity
- **WHEN** the user navigates to `/historial`
- **THEN** an empty state is displayed stating "Todavía no tenés actividad registrada" alongside a button "Crear un plan" that links to `/mis-planes`

---

### Requirement: Ergonomic interaction decisions (Fitts & Hick)
The interface SHALL satisfy the following HCI ergonomic constraints:
1. **Fitts's Law**: The navigation link or button to access `/historial` in the main Navbar SHALL provide a touch/click target of at least 44px ($\ge 44$px height/width) with proper focus outline.
2. **Hick's Law**: The activity view SHALL offer exactly 4 thematic filter chips: "Todos", "Estados", "Creaciones", "Participación" ($n=4$), reducing decision time $T = b \log_2(n+1)$ compared to open dropdowns or fragmented menus.
3. **Cognitive Load ($7 \pm 2$)**: The event information SHALL be self-contained in a single visual card, avoiding the need for the user to memorize past plan states across tabs or screens.

#### Scenario: Navbar target size conforms to Fitts's Law
- **WHEN** inspecting the "Historial" element in `Navbar`
- **THEN** its bounding box target height is at least 44px

#### Scenario: Filter chips update visible activities
- **WHEN** the user clicks the "Estados" chip
- **THEN** only state transition events are shown and the active chip is visibly highlighted
