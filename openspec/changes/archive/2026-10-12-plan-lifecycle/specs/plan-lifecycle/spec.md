## Purpose

Covers the plan edit flow, the `cancelado` state, the delete restriction rule, the cancel transition, and UI adaptations for blocked actions within the plan lifecycle.

## ADDED Requirements

### Requirement: Edit a plan
The system SHALL allow the owner of a plan to update its description and due date via `PUT /api/plans/:id` when the plan is in state `borrador` or `confirmado`. A plan in state `cancelado` SHALL NOT be editable. The same validation rules as creation SHALL apply (non-empty description ≤ 500 chars, valid calendar date). When editing a confirmed plan, the UI SHALL display a cautionary note about modifying an already confirmed event. The updated plan SHALL be returned in the response and reflected in the UI without a page reload.

#### Scenario: Successful edit on draft or confirmed plan
- **WHEN** the owner sends a valid `PUT /api/plans/:id` with updated description and dueDate for a plan in `borrador` or `confirmado`
- **THEN** the plan is updated, the response contains the updated plan, and the card reflects the changes without a page reload

#### Scenario: Attempt to edit a cancelled plan
- **WHEN** the owner sends `PUT /api/plans/:id` for a plan in state `cancelado`
- **THEN** the API responds `409` with an error indicating cancelled plans cannot be edited

#### Scenario: Validation error on edit
- **WHEN** the owner sends `PUT /api/plans/:id` with an empty description or invalid date
- **THEN** the API responds `400` with field-level errors and the plan is unchanged

#### Scenario: Edit someone else's plan
- **WHEN** a user sends `PUT /api/plans/:id` for a plan they do not own
- **THEN** the API responds `404` and nothing changes

### Requirement: Cancel a confirmed plan
The system SHALL allow the owner to cancel a confirmed plan via `POST /api/plans/:id/cancel`. This transitions the plan from `confirmado` to `cancelado`. Cancelling a plan in any other state SHALL be rejected.

#### Scenario: Cancel a confirmed plan
- **WHEN** the owner cancels a plan in state `confirmado`
- **THEN** the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Cancel a draft plan
- **WHEN** the owner attempts to cancel a plan in state `borrador`
- **THEN** the API responds with an error indicating the transition is invalid

#### Scenario: Cancel an already cancelled plan
- **WHEN** the owner attempts to cancel a plan in state `cancelado`
- **THEN** the API responds with an error indicating the transition is invalid

### Requirement: Delete restriction on confirmed plans
A plan in state `confirmado` SHALL NOT be deletable. The API SHALL respond with an error explaining that the plan must be cancelled first. Plans in `borrador` or `cancelado` SHALL remain deletable.

#### Scenario: Delete a confirmed plan
- **WHEN** the owner attempts to delete a plan in state `confirmado`
- **THEN** the API responds `409` with a message explaining the plan must be cancelled before deletion

#### Scenario: Delete a cancelled plan
- **WHEN** the owner deletes a plan in state `cancelado`
- **THEN** the plan is deleted and removed from the list

#### Scenario: Delete a draft plan
- **WHEN** the owner deletes a plan in state `borrador`
- **THEN** the plan is deleted and removed from the list

### Requirement: UI explains blocked actions and presents plan status clearly
When an action is blocked by the plan's current state, the interface SHALL explain the reason clearly. The explanation SHALL be visible as text (not only via color or icon) and SHALL guide the user toward the unblocking action. Cancelled plans SHALL display their original event date with a dimmed visual style (`opacity-75`) and a "Cancelado" badge, and SHALL omit the "Editar" option.

#### Scenario: Delete blocked on confirmed plan
- **WHEN** a user views a confirmed plan's actions
- **THEN** the delete option is disabled or absent, and a message explains the plan must be cancelled first

#### Scenario: Edit confirmed plan displays caution notice
- **WHEN** a user opens the edit dialog for a confirmed plan
- **THEN** the edit dialog opens pre-filled and displays a cautionary notice regarding modifications to confirmed plans

#### Scenario: Cancelled plan card presentation
- **WHEN** a cancelled plan is displayed in the plan list
- **THEN** it displays the original event date, has a dimmed visual treatment, a "Cancelado" badge, and does not show an "Editar" action

### Requirement: Plan lifecycle unit tests
The lifecycle rules SHALL be covered by runnable Vitest unit tests: delete rejected for confirmed plan, delete allowed for cancelled plan, cancel transition from confirmed, invalid cancel from draft, edit allowed for draft/confirmed, and edit rejected for cancelled plans.

#### Scenario: Tests pass
- **WHEN** a developer runs the lifecycle unit tests
- **THEN** all 4 tests pass
