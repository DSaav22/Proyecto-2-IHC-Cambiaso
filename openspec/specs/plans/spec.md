# plans Specification

## Purpose

Lets a signed-in user create plans (ID, description, due date) and see them as a list of cards that updates instantly and survives a page reload.

## Requirements

### Requirement: Create plan form
The `/mis-planes` screen SHALL show a "Nuevo plan" button. Pressing it SHALL reveal a form with three fields: plan ID, description, and due date, plus a submit button and a cancel control. All field labels and messages SHALL be in Spanish.

#### Scenario: Open the form
- **WHEN** a signed-in user presses "Nuevo plan"
- **THEN** a form with the ID, description, and due date fields is shown

#### Scenario: Cancel the form
- **WHEN** the user cancels the open form
- **THEN** the form closes and no plan is created

### Requirement: Plan field validation
A plan SHALL require a non-empty ID of at most 30 characters, a non-empty description of at most 500 characters, and a valid due date. Leading and trailing whitespace SHALL be ignored. Validation errors SHALL be shown as text next to the offending field and SHALL NOT rely on color alone. The same rules SHALL be enforced by the API.

#### Scenario: Empty fields rejected
- **WHEN** the user submits the form with an empty ID, description, or due date
- **THEN** no plan is created and each invalid field shows a Spanish error message

#### Scenario: Server rejects invalid data
- **WHEN** a client sends `POST /api/plans` with a missing or invalid field
- **THEN** the API responds `400` with an `errors` object keyed by field name

### Requirement: Unique plan ID per user
A plan ID SHALL be unique among the plans of the same user. Two different users MAY use the same ID.

#### Scenario: Duplicate ID
- **WHEN** a user submits a plan whose ID already exists among their plans
- **THEN** the API responds `409` and the form shows an error on the ID field, keeping the typed values

#### Scenario: Same ID, different user
- **WHEN** another user creates a plan with an ID that the first user already has
- **THEN** the plan is created

### Requirement: Plan appears without refresh
After a successful submission the new plan SHALL appear as a card in the list without a page reload, the form SHALL close and reset, and the user SHALL be told the plan was created. Each card SHALL show the plan ID, description, and due date (formatted in Spanish).

#### Scenario: Card appears immediately
- **WHEN** the user submits a valid plan
- **THEN** a card with its ID, description, and due date is visible in the list and the page was not reloaded

#### Scenario: Failure keeps the form
- **WHEN** the request fails because of a network or server error
- **THEN** an error message is shown, the typed values are kept, and no card is added

### Requirement: Plans persist across reloads
Plans SHALL be stored per user in the database. Creating a plan, then reloading the page, SHALL still show that plan.

#### Scenario: Create, reload, still visible
- **WHEN** a user creates a plan, sees its card, and reloads `/mis-planes`
- **THEN** the card is still visible

#### Scenario: Plans isolation and membership
- **WHEN** a user lists plans
- **THEN** only plans created by that user or joined via share code are returned

### Requirement: Plans list ordering and empty state
The list SHALL be ordered by due date ascending, with ties broken by creation time ascending. When the user has no plans, the screen SHALL show an empty-state message inviting them to create one.

#### Scenario: Ordering
- **WHEN** a user has plans with different due dates
- **THEN** the earliest due date appears first

#### Scenario: Empty state
- **WHEN** a user with no plans opens `/mis-planes`
- **THEN** an empty-state message is shown instead of cards

### Requirement: Plans API requires a session
`GET /api/plans` and `POST /api/plans` SHALL require a valid session cookie. Without one they SHALL respond `401` and create or return nothing.

#### Scenario: Unauthenticated request
- **WHEN** a client without a session calls `GET /api/plans` or `POST /api/plans`
- **THEN** the API responds `401`

### Requirement: Plan UI follows the design system
The form, cards, and list SHALL consume design tokens only (color roles, type scale, spacing, radius), keep the 4.5:1 text contrast and 3:1 form-control border contrast, and be built in design order: tokens, then atoms, molecules, organisms, and finally the page.

#### Scenario: No raw values
- **WHEN** the plan components are searched for hex, rgb, or default palette color names
- **THEN** none are found

### Requirement: Plan card shows state and confirm action
Each plan card SHALL display its state as a text badge ("Borrador" or "Confirmado"); the state SHALL NOT be editable through a dropdown or select. A card in `borrador` SHALL show an explicit button labelled "Confirmar plan". A card in `confirmado` SHALL show a "Confirmado" badge with a check icon and SHALL NOT show a confirm button. State SHALL NOT be conveyed by color alone.

#### Scenario: Draft card
- **WHEN** a plan in `borrador` is listed
- **THEN** its card shows a "Borrador" badge and a "Confirmar plan" button

#### Scenario: Confirmed card
- **WHEN** a plan in `confirmado` is listed
- **THEN** its card shows a "Confirmado" badge with a check icon and no confirm button

### Requirement: Confirmation dialog before confirming
Pressing "Confirmar plan" SHALL open a dialog that names the plan and states that the plan will not return to draft. The state SHALL change only after the user accepts. While the request is pending the accept control SHALL be disabled.

#### Scenario: Accept
- **WHEN** the user accepts the dialog
- **THEN** the plan becomes `confirmado` on its card without a page reload

#### Scenario: Cancel
- **WHEN** the user cancels the dialog
- **THEN** the plan stays `borrador` and no request is sent

#### Scenario: Failure
- **WHEN** the confirm request fails
- **THEN** an error message is shown and the card keeps its previous state

### Requirement: Card actions menu
Each plan card SHALL expose secondary actions through a three-dot menu button with an accessible name (for example "Más acciones") and an interactive target of at least 44px. The menu SHALL be operable with the keyboard. The menu SHALL contain "Eliminar", styled as destructive. The card SHALL NOT show a standalone large delete button.

#### Scenario: Open the menu
- **WHEN** the user activates the three-dot button
- **THEN** a menu with "Eliminar" is shown

#### Scenario: Keyboard use
- **WHEN** the user opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus returns to the three-dot button

### Requirement: Delete requires confirmation
Choosing "Eliminar" SHALL open a dialog that names the plan and asks for confirmation. The plan SHALL be deleted only after the user accepts, and SHALL disappear from the list without a page reload.

#### Scenario: Confirm delete
- **WHEN** the user accepts the delete dialog
- **THEN** the plan is deleted, removed from the list, and does not return after a reload

#### Scenario: Cancel delete
- **WHEN** the user cancels the delete dialog
- **THEN** the plan remains in the list

### Requirement: Plan creation does not expose state
The plan creation form SHALL NOT offer a state field. The API SHALL ignore any state sent on creation.

#### Scenario: Form fields
- **WHEN** the user opens the "Nuevo plan" form
- **THEN** it contains description and due date fields and no state control

### Requirement: Automatic unique share code on plan creation
When a plan is created, the system SHALL generate a unique, non-empty, uppercase alphanumeric share code (prefixed with `PLZ-`) and persist it on the plan. The API response SHALL include this share code.

#### Scenario: Plan created with share code
- **WHEN** an authenticated user creates a new plan
- **THEN** the returned plan contains a unique `shareCode` in format `PLZ-XXXXXX`
- **AND** the code is persisted in the database

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

### Requirement: Unified plans listing with ownership metadata
`GET /api/plans` SHALL return all plans owned by the authenticated user AS WELL AS plans the user has joined via share code. Each plan item SHALL include `isOwner: boolean` and `ownerName: string`.

#### Scenario: Listing both owned and joined plans
- **GIVEN** a user who has created 1 plan and joined 1 plan created by another user
- **WHEN** the user requests `GET /api/plans`
- **THEN** both plans are returned, ordered by due date
- **AND** the owned plan has `isOwner: true`
- **AND** the joined plan has `isOwner: false` and the creator's name

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

### Requirement: Join plan UI on `/mis-planes`
The `/mis-planes` screen SHALL provide a button "Unirse con código" alongside "Nuevo plan". Activating it SHALL open a dialog to enter the share code. Submitting a valid code SHALL add the plan card immediately without full page reload.

#### Scenario: Successfully joining from UI
- **WHEN** the user enters a valid code in the join dialog and submits
- **THEN** the dialog closes, and the joined plan appears in the cards list with an "Invitado" badge

### Requirement: Read-only presentation on PlanCard for guests
When a plan card has `isOwner: false`, it SHALL display an "Invitado" badge, indicate the creator's name, and SHALL NOT display the "Confirmar plan" button, edit options, or delete menu items. For creator cards (`isOwner: true`), the share code SHALL be visible with a copy button.

#### Scenario: Guest viewing card
- **WHEN** a joined plan card is rendered
- **THEN** it displays "Invitado", "Creado por: {name}", and contains no edit or delete controls
