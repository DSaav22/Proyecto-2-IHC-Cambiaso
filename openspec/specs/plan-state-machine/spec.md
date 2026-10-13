# plan-state-machine Specification

## Purpose

Defines the three-state plan lifecycle (`pendiente`, `confirmado` and `cancelado`), the confirm and cancel transitions, their rejection rules, and the unit tests that guard them.

## Requirements

### Requirement: SM-01 Plan lifecycle has three states
A plan SHALL have exactly one state: `pendiente`, `confirmado`, or `cancelado`. No other state value (including the former `borrador`, see SM-08) SHALL be accepted or stored. The UI label for `pendiente` is "Pendiente" (defined in the `plans` capability). Whether a plan is overdue SHALL be derived (SM-06) and SHALL NOT be a stored state.

#### Scenario: Only three states exist
- WHEN a client sends any state other than `pendiente`, `confirmado`, or `cancelado`
- THEN the API rejects it with a validation error and the stored plan is unchanged

### Requirement: New plans start as draft
A newly created plan SHALL always have state `pendiente`, regardless of any state sent by the client.

#### Scenario: Initial state
- **WHEN** a signed-in user creates a valid plan
- **THEN** the created plan has state `pendiente`

#### Scenario: Client cannot choose the initial state
- **WHEN** a client sends `estado: "confirmado"` in the plan creation request
- **THEN** the created plan still has state `pendiente`

### Requirement: Confirm plan transition
The system SHALL provide a confirm action that moves a plan from `pendiente` to `confirmado` and persists the change. The action SHALL be available only to the plan's owner.

#### Scenario: Confirm a draft
- **WHEN** the owner confirms a plan in state `pendiente`
- **THEN** the plan state becomes `confirmado` and the updated plan is returned

#### Scenario: Persistence after reload
- **WHEN** a plan has been confirmed and the user reloads `/mis-planes`
- **THEN** the plan is still shown as `confirmado`

#### Scenario: Someone else's plan
- **WHEN** a user confirms a plan id that belongs to another user or does not exist
- **THEN** the API responds `404` and nothing changes

### Requirement: SM-02 Invalid transitions are rejected
Confirming a plan that is already `confirmado` SHALL be rejected with `409` and SHALL NOT modify the plan. Confirming a plan in `cancelado` SHALL be rejected with `409` and the message "Un plan cancelado no puede confirmarse". There SHALL be no transition from `confirmado` back to `pendiente`.

#### Scenario: Confirm twice
- WHEN the owner confirms a plan that is already `confirmado`
- THEN the API responds `409` with a Spanish error message and the plan remains `confirmado`

#### Scenario: Confirm a cancelled plan
- GIVEN an owned plan in `cancelado`
- WHEN the owner sends `POST /api/plans/:id/confirm`
- THEN the API responds `409` with `{ message: "Un plan cancelado no puede confirmarse" }` and the plan remains `cancelado`

#### Scenario: Confirm a pending plan still works
- GIVEN an owned plan in `pendiente`
- WHEN the owner confirms it
- THEN it becomes `confirmado`

### Requirement: Transition preserves plan data
A successful transition SHALL change only the plan state. The description, due date, owner, identifier, and creation time SHALL remain exactly as before.

#### Scenario: Data intact after confirming
- **WHEN** a draft plan is confirmed
- **THEN** its description, due date, owner, identifier, and creation time are identical to their values before the transition

### Requirement: SM-03 Cancel plan transition
The system SHALL provide a cancel action that moves a plan from `pendiente` or `confirmado` to `cancelado` and persists the change. The action SHALL be available only to the plan's creator. Cancelling a plan in `cancelado` SHALL be rejected with `409` and the message "Un plan cancelado no puede volver a cancelarse". A guest member SHALL receive `403`; a plan that belongs to another user without membership or does not exist SHALL yield `404`; an unauthenticated request SHALL yield `401`. A successful cancel SHALL change only the state; description, due date, owner, identifier, share code, and creation time SHALL remain identical.

#### Scenario: Cancel a pending plan
- GIVEN an owned plan in state `pendiente`
- WHEN the owner cancels the plan
- THEN the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Cancel a confirmed plan
- GIVEN an owned plan in state `confirmado`
- WHEN the owner cancels the plan
- THEN the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Cancel twice
- GIVEN an owned plan in state `cancelado`
- WHEN the owner attempts to cancel the plan again
- THEN the API responds `409` with `{ message: "Un plan cancelado no puede volver a cancelarse" }`

#### Scenario: Guest cancels
- GIVEN a user who joined the plan by share code
- WHEN the user sends `POST /api/plans/:id/cancel`
- THEN the API responds `403` and the state is unchanged

#### Scenario: Unknown or foreign plan
- WHEN a user cancels an id that does not exist or belongs to an unrelated user
- THEN the API responds `404` and nothing changes

#### Scenario: Data intact after cancelling
- WHEN a plan is cancelled
- THEN every field other than the state is identical to its value before the transition

### Requirement: State rule has four unit tests
The transition rule SHALL be covered by runnable Vitest unit tests: correct initial state, expected transition, invalid transition rejected, and data preserved. The command to run them SHALL be documented in `README.md` and `docs/task-02-state-tests.md`.

#### Scenario: Tests are runnable and documented
- **WHEN** a developer follows the documented command
- **THEN** the tests run and pass

### Requirement: SM-05 Cancelled state is persisted and terminal
A plan in `cancelado` SHALL be stored in the database with that value and SHALL still be returned as `cancelado` after any reload or new session. No transition SHALL leave `cancelado`.

#### Scenario: Cancelled survives reload
- GIVEN an owner cancelled a plan
- WHEN the owner reloads `/mis-planes` or calls `GET /api/plans`
- THEN the plan is returned with state `cancelado`

#### Scenario: No way back
- GIVEN a plan in `cancelado`
- WHEN the owner attempts to confirm or cancel it
- THEN both requests are rejected with 409 and the state stays `cancelado`

### Requirement: SM-08 Initial state is renamed from `borrador` to `pendiente`
The initial plan state value SHALL be `pendiente` in the database, the Prisma default, the API/JSON payloads, validation enums (`PLAN_STATES`), the `estado` filter query value, seeds, and tests. The value `borrador` SHALL NOT be accepted or stored after the migration. The migration SHALL convert existing rows from `borrador` to `pendiente`, keep `confirmado` and `cancelado` untouched, and set the column default to `pendiente`. No backward-compatible alias SHALL exist.

#### Scenario: Existing rows migrated
- GIVEN stored plans with `estado = 'borrador'`, `'confirmado'`, and `'cancelado'`
- WHEN the new migration is applied
- THEN every former `borrador` row has `estado = 'pendiente'` and the other rows are unchanged

#### Scenario: Default for new plans is pendiente
- WHEN a plan is created without an explicit state
- THEN it is stored and returned with state `pendiente`

#### Scenario: API rejects borrador
- WHEN a client sends `borrador` as a state value (for example `GET /api/plans?estado=borrador`)
- THEN the API responds `400` with a Spanish validation message and nothing changes

### Requirement: SM-06 Overdue is derived and never applies to cancelled plans
A plan SHALL count as overdue only when its state is not `cancelado` and its due date is before the client's current calendar date. Overdue SHALL NOT be stored.

#### Scenario: Cancelled past plan is not overdue
- GIVEN a `cancelado` plan with a due date in the past
- WHEN overdue is evaluated
- THEN the plan is not overdue

#### Scenario: Pending past plan is overdue
- GIVEN a `pendiente` plan with a due date before today
- WHEN overdue is evaluated
- THEN the plan is overdue

#### Scenario: Due today is not overdue
- GIVEN a `confirmado` plan due today
- WHEN overdue is evaluated
- THEN the plan is not overdue

### Requirement: SM-07 Cancel rule unit tests
The cancel and confirm transition rules SHALL be covered by Vitest unit tests with at least one allowed and one rejected case per rule: cancel from `pendiente`, cancel from `confirmado`, cancel on `cancelado` rejected, confirm on `cancelado` rejected, data preserved. Each test file SHALL contain at least 4 tests.

#### Scenario: Tests exist and pass
- WHEN the backend Vitest suite runs
- THEN the allowed cases (cancel from `pendiente`, cancel from `confirmado`) and the rejected cases (cancel on `cancelado`, confirm on `cancelado`) pass
