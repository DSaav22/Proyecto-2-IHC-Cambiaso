# plans Specification Delta

## ADDED & MODIFIED Requirements

### Requirement: Automatic unique share code on plan creation
When a plan is created, the system SHALL generate a unique, non-empty, uppercase alphanumeric share code (prefixed with `PLZ-`) and persist it on the plan. The API response SHALL include this share code.

#### Scenario: Plan created with share code
- **WHEN** an authenticated user creates a new plan
- **THEN** the returned plan contains a unique `shareCode` in format `PLZ-XXXXXX`
- **AND** the code is persisted in the database

---

### Requirement: Join plan by share code endpoint
The API SHALL provide an endpoint `POST /api/plans/join` accepting `{ code: string }` and requiring authentication.

#### Scenario: Successfully joining a plan
- **GIVEN** an authenticated user and an existing plan created by a different user
- **WHEN** the user sends `POST /api/plans/join` with that plan's share code
- **THEN** the API responds `200` with the serialized plan
- **AND** the plan now appears in the user's plans list with `isOwner: false`

#### Scenario: Plan with code not found
- **GIVEN** an authenticated user
- **WHEN** the user sends `POST /api/plans/join` with an invalid or non-existent code
- **THEN** the API responds `404` with `{ message: "Plan no encontrado con este código" }`

#### Scenario: Creator joins their own plan
- **GIVEN** an authenticated user who is the creator of a plan
- **WHEN** the user sends `POST /api/plans/join` with their own plan's code
- **THEN** the API responds `400` with `{ message: "Ya eres el creador de este plan" }`

#### Scenario: User already joined the plan
- **GIVEN** an authenticated user who has already joined a plan
- **WHEN** the user sends `POST /api/plans/join` again with that code
- **THEN** the API responds `409` with `{ message: "Ya te has unido a este plan" }`

---

### Requirement: Unified plans listing with ownership metadata
`GET /api/plans` SHALL return all plans owned by the authenticated user AS WELL AS plans the user has joined via share code. Each plan item SHALL include `isOwner: boolean` and `ownerName: string`.

#### Scenario: Listing both owned and joined plans
- **GIVEN** a user who has created 1 plan and joined 1 plan created by another user
- **WHEN** the user requests `GET /api/plans`
- **THEN** both plans are returned, ordered by due date
- **AND** the owned plan has `isOwner: true`
- **AND** the joined plan has `isOwner: false` and the creator's name

---

### Requirement: Strict read-only authorization for guests
Only the plan's creator SHALL be authorized to edit (`PUT /api/plans/:id`), confirm (`POST /api/plans/:id/confirm`), cancel (`POST /api/plans/:id/cancel`), or delete (`DELETE /api/plans/:id`) the plan. If a guest member attempts any of these operations, the API SHALL reject the request with `403 Forbidden`.

#### Scenario: Guest attempts to confirm plan
- **GIVEN** an authenticated user who is a guest member of a plan
- **WHEN** the user sends `POST /api/plans/:id/confirm`
- **THEN** the API responds `403` with `{ message: "Solo el creador puede modificar este plan" }`
- **AND** the plan state remains unchanged

#### Scenario: Guest attempts to delete plan
- **GIVEN** an authenticated user who is a guest member of a plan
- **WHEN** the user sends `DELETE /api/plans/:id`
- **THEN** the API responds `403` with `{ message: "Solo el creador puede eliminar este plan" }`
- **AND** the plan is not deleted

---

### Requirement: Join plan UI on `/mis-planes`
The `/mis-planes` screen SHALL provide a button "Unirse con código" alongside "Nuevo plan". Activating it SHALL open a dialog to enter the share code. Submitting a valid code SHALL add the plan card immediately without full page reload.

#### Scenario: Successfully joining from UI
- **WHEN** the user enters a valid code in the join dialog and submits
- **THEN** the dialog closes, and the joined plan appears in the cards list with an "Invitado" badge

---

### Requirement: Read-only presentation on PlanCard for guests
When a plan card has `isOwner: false`, it SHALL display an "Invitado" badge, indicate the creator's name, and SHALL NOT display the "Confirmar plan" button, edit options, or delete menu items. For creator cards (`isOwner: true`), the share code SHALL be visible with a copy button.

#### Scenario: Guest viewing card
- **WHEN** a joined plan card is rendered
- **THEN** it displays "Invitado", "Creado por: {name}", and contains no edit or delete controls
