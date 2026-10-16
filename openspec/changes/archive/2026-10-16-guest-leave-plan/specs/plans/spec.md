## ADDED Requirements

### Requirement: Guest can leave a joined plan
An authenticated guest member of a plan SHALL be able to leave it through `POST /api/plans/:id/leave`, in any plan state (`pendiente`, `confirmado`, or `cancelado`). Leaving SHALL remove only that user's membership; the plan, its state, and its other members SHALL remain unchanged. The plan creator SHALL NOT be able to leave their own plan, and the API SHALL reject the request with `403 Forbidden`. If the plan does not exist or the user is not a member of it, the API SHALL respond `404 Not Found` with the same message in both cases. A user who left SHALL be able to rejoin later with the plan's share code.

#### Scenario: Guest leaves a plan
- **GIVEN** an authenticated user who is a guest member of a plan
- **WHEN** the user sends `POST /api/plans/:id/leave`
- **THEN** the API responds `200` with `{ message: "Has abandonado el plan." }`
- **AND** the user no longer receives that plan from `GET /api/plans`
- **AND** the plan, its state, and its other members are unchanged

#### Scenario: Guest leaves a cancelled plan
- **GIVEN** an authenticated user who is a guest member of a `cancelado` plan
- **WHEN** the user sends `POST /api/plans/:id/leave`
- **THEN** the API responds `200` with `{ message: "Has abandonado el plan." }`

#### Scenario: Creator attempts to leave
- **GIVEN** an authenticated user who created the plan
- **WHEN** the user sends `POST /api/plans/:id/leave`
- **THEN** the API responds `403` with `{ message: "El creador no puede abandonar su propio plan" }`
- **AND** the plan is unchanged

#### Scenario: Not a member or unknown plan
- **GIVEN** an authenticated user who is neither creator nor member of the plan, or a plan id that does not exist
- **WHEN** the user sends `POST /api/plans/:id/leave`
- **THEN** the API responds `404` with `{ message: "Plan no encontrado" }`

#### Scenario: Unauthenticated request
- **WHEN** a client without a session sends `POST /api/plans/:id/leave`
- **THEN** the API responds `401` and no membership is removed

#### Scenario: Rejoin after leaving
- **GIVEN** a user who left a plan
- **WHEN** the user joins again with the plan's share code
- **THEN** the plan appears again in the user's list with `isOwner: false`

### Requirement: Leave plan action with confirmation on guest cards
A guest card (`isOwner: false`) SHALL offer the action "Abandonar plan" in its three-dot menu, styled as destructive. Selecting it SHALL open a confirmation dialog that names the plan and states that it will disappear from the guest's list. The membership SHALL be removed only after the guest accepts. On success the plan SHALL disappear from the list without a page reload and a visible success notice "Has abandonado el plan." SHALL be shown. If the request fails, the dialog SHALL stay open, show the error next to the action, and keep the plan in the list. Accept SHALL be disabled while the request is pending.

#### Scenario: Open the leave dialog
- **WHEN** a guest opens the three-dot menu of a joined plan and selects "Abandonar plan"
- **THEN** a confirmation dialog naming the plan is shown and no request is sent yet

#### Scenario: Accept
- **WHEN** the guest accepts the leave dialog
- **THEN** the plan disappears from the guest's list without a page reload
- **AND** the notice "Has abandonado el plan." is shown

#### Scenario: Dismiss
- **WHEN** the guest dismisses the leave dialog
- **THEN** no request is sent and the plan stays in the list

#### Scenario: Failure
- **WHEN** the leave request fails
- **THEN** the dialog remains open with the error and the plan stays in the list

#### Scenario: Accept disabled while pending
- **WHEN** the guest accepts the leave dialog and the request has not yet completed
- **THEN** the accept control is disabled until the request finishes

#### Scenario: Creator card has no leave action
- **WHEN** a card with `isOwner: true` is rendered
- **THEN** its menu does not contain "Abandonar plan"

## MODIFIED Requirements

### Requirement: Card actions menu
Each plan card SHALL expose secondary actions through a three-dot menu button with an accessible name (for example "Más acciones") and an interactive target of at least 44px. The menu SHALL be operable with the keyboard. On a creator card the menu SHALL contain "Eliminar", styled as destructive. On a guest card the menu SHALL contain "Abandonar plan", styled as destructive, and SHALL NOT contain "Eliminar". The card SHALL NOT show a standalone large delete button.

#### Scenario: Open the menu
- **WHEN** the user activates the three-dot button
- **THEN** a menu with "Eliminar" is shown

#### Scenario: Open the menu as guest
- **WHEN** a guest activates the three-dot button on a joined plan card
- **THEN** a menu with "Abandonar plan" and without "Eliminar" is shown

#### Scenario: Keyboard use
- **WHEN** the user opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus returns to the three-dot button

### Requirement: Read-only presentation on PlanCard for guests
When a plan card has `isOwner: false`, it SHALL display an "Invitado" badge, indicate the creator's name, and SHALL NOT display the "Confirmar plan" button, edit options, or delete menu items. The only action available to a guest SHALL be "Abandonar plan" in the card menu. For creator cards (`isOwner: true`), the share code SHALL be visible with a copy button.

#### Scenario: Guest viewing card
- **WHEN** a joined plan card is rendered
- **THEN** it displays "Invitado", "Creado por: {name}", and contains no edit or delete controls

#### Scenario: Guest card offers only leave
- **WHEN** a joined plan card is rendered
- **THEN** its menu offers only "Abandonar plan"

### Requirement: PLN-13 List refreshes after mutations
After confirm, cancel, delete, join, leave, or update succeeds, the list and summary SHALL be refetched with the active filters.

#### Scenario: Cancel under a state filter
- GIVEN filter `estado=confirmado` active
- WHEN the owner cancels a confirmed plan
- THEN the plan leaves the list and the stat cards update

#### Scenario: Join under filter
- WHEN the user joins a plan that does not match the active filters
- THEN it is not shown but `summary.total` increases

#### Scenario: Leave under filter
- GIVEN a guest plan and a filter that matches other plans
- WHEN the guest leaves the plan
- THEN the list is refetched with the active filters, the plan is gone, and `summary.total` decreases
