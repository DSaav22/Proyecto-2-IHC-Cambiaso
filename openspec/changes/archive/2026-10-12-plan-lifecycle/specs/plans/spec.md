## ADDED Requirements

### Requirement: Edit plan endpoint
`PUT /api/plans/:id` SHALL accept `description` and `dueDate` fields, validate them with the same rules as creation, and update the plan if owned by the authenticated user. The response SHALL return the updated plan. If the plan does not exist or is not owned, the API SHALL respond `404`.

#### Scenario: Successful update
- **WHEN** the owner sends `PUT /api/plans/:id` with valid `description` and `dueDate`
- **THEN** the plan is updated and the API responds `200` with the updated plan

#### Scenario: Validation failure
- **WHEN** the owner sends `PUT /api/plans/:id` with invalid fields
- **THEN** the API responds `400` with field-level errors

#### Scenario: Not found
- **WHEN** a user sends `PUT /api/plans/:id` for a plan they do not own or that does not exist
- **THEN** the API responds `404`

### Requirement: Cancel plan endpoint
`POST /api/plans/:id/cancel` SHALL move an owned confirmed plan to `cancelado`. If the plan is not confirmed, the API SHALL respond `409`. If it does not exist or is not owned, the API SHALL respond `404`.

#### Scenario: Successful cancel
- **WHEN** the owner sends `POST /api/plans/:id/cancel` for a confirmed plan
- **THEN** the plan state becomes `cancelado` and the API responds `200` with the updated plan

#### Scenario: Invalid state for cancel
- **WHEN** the owner sends `POST /api/plans/:id/cancel` for a draft or cancelled plan
- **THEN** the API responds `409` with a Spanish error message

### Requirement: Edit plan UI flow
The plan card actions menu SHALL include an "Editar" option. Pressing it SHALL open a dialog pre-filled with the plan's current description and due date. After a successful edit the card SHALL update without a page reload.

#### Scenario: Open edit dialog
- **WHEN** the user selects "Editar" from the card menu
- **THEN** a dialog with the plan's current data appears

#### Scenario: Save edit
- **WHEN** the user submits valid changes in the edit dialog
- **THEN** the card updates and the dialog closes

### Requirement: Cancel plan UI action
Each confirmed plan card SHALL show a "Cancelar plan" button. Pressing it SHALL open a confirmation dialog. After acceptance the card SHALL update to show the `cancelado` state.

#### Scenario: Cancel button visibility
- **WHEN** a plan is in state `confirmado`
- **THEN** the card shows a "Cancelar plan" button

#### Scenario: Cancel button hidden for non-confirmed
- **WHEN** a plan is in state `borrador` or `cancelado`
- **THEN** the card does not show a "Cancelar plan" button

### Requirement: Plan card shows cancelado state
A card in `cancelado` SHALL show a "Cancelado" badge and SHALL NOT show confirm or cancel buttons.

#### Scenario: Cancelled card display
- **WHEN** a plan in `cancelado` is listed
- **THEN** its card shows a "Cancelado" badge and no confirm or cancel buttons

## MODIFIED Requirements

### Requirement: Delete requires confirmation
Choosing "Eliminar" SHALL open a dialog that names the plan and asks for confirmation. If the plan is in state `confirmado`, the delete action SHALL be blocked: the menu item SHALL be disabled and SHALL show a tooltip or inline message explaining the plan must be cancelled first. The plan SHALL be deleted only after the user accepts (for non-confirmed plans), and SHALL disappear from the list without a page reload.

#### Scenario: Confirm delete
- **WHEN** the user accepts the delete dialog for a draft or cancelled plan
- **THEN** the plan is deleted, removed from the list, and does not return after a reload

#### Scenario: Cancel delete
- **WHEN** the user cancels the delete dialog
- **THEN** the plan remains in the list

#### Scenario: Delete blocked for confirmed plan
- **WHEN** the user opens the menu on a confirmed plan
- **THEN** the "Eliminar" option is disabled with a message explaining the restriction

### Requirement: Card actions menu
Each plan card SHALL expose secondary actions through a three-dot menu button with an accessible name (for example "Más acciones") and an interactive target of at least 44px. The menu SHALL be operable with the keyboard. The menu SHALL contain "Editar" and "Eliminar" (styled as destructive). The card SHALL NOT show standalone large delete or edit buttons.

#### Scenario: Open the menu
- **WHEN** the user activates the three-dot button
- **THEN** a menu with "Editar" and "Eliminar" is shown

#### Scenario: Keyboard use
- **WHEN** the user opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus returns to the three-dot button
