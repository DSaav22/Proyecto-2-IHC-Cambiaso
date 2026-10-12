# plan-state-machine Specification

## Purpose

Defines the two-state plan lifecycle (`borrador` and `confirmado`), the explicit confirm transition, its rejection rules, and the unit tests that guard the rule.

## Requirements

### Requirement: Plan lifecycle has two states
A plan SHALL have exactly one state, either `borrador` or `confirmado`. No other state value SHALL be accepted or stored. Whether a plan is overdue SHALL be derived from its due date and SHALL NOT be a stored state.

#### Scenario: Only two states exist
- **WHEN** a client sends any state other than `borrador` or `confirmado`
- **THEN** the API rejects it with a validation error and the stored plan is unchanged

### Requirement: New plans start as draft
A newly created plan SHALL always have state `borrador`, regardless of any state sent by the client.

#### Scenario: Initial state
- **WHEN** a signed-in user creates a valid plan
- **THEN** the created plan has state `borrador`

#### Scenario: Client cannot choose the initial state
- **WHEN** a client sends `estado: "confirmado"` in the plan creation request
- **THEN** the created plan still has state `borrador`

### Requirement: Confirm plan transition
The system SHALL provide a confirm action that moves a plan from `borrador` to `confirmado` and persists the change. The action SHALL be available only to the plan's owner.

#### Scenario: Confirm a draft
- **WHEN** the owner confirms a plan in state `borrador`
- **THEN** the plan state becomes `confirmado` and the updated plan is returned

#### Scenario: Persistence after reload
- **WHEN** a plan has been confirmed and the user reloads `/mis-planes`
- **THEN** the plan is still shown as `confirmado`

#### Scenario: Someone else's plan
- **WHEN** a user confirms a plan id that belongs to another user or does not exist
- **THEN** the API responds `404` and nothing changes

### Requirement: Invalid transitions are rejected
Confirming a plan that is already `confirmado` SHALL be rejected with an error and SHALL NOT modify the plan. There SHALL be no transition from `confirmado` back to `borrador`.

#### Scenario: Confirm twice
- **WHEN** the owner confirms a plan that is already `confirmado`
- **THEN** the API responds `409` with a Spanish error message and the plan remains `confirmado`

### Requirement: Transition preserves plan data
A successful transition SHALL change only the plan state. The description, due date, owner, identifier, and creation time SHALL remain exactly as before.

#### Scenario: Data intact after confirming
- **WHEN** a draft plan is confirmed
- **THEN** its description, due date, owner, identifier, and creation time are identical to their values before the transition

### Requirement: Cancel plan transition
The system SHALL provide a cancel action that moves a plan from `borrador` or `confirmado` to `cancelado` and persists the change. The action SHALL be available only to the plan's creator.

#### Scenario: Cancel a draft
- **GIVEN** an owned plan in state `borrador`
- **WHEN** the owner cancels the plan
- **THEN** the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Cancel a confirmed plan
- **GIVEN** an owned plan in state `confirmado`
- **WHEN** the owner cancels the plan
- **THEN** the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Cancel twice
- **GIVEN** an owned plan in state `cancelado`
- **WHEN** the owner attempts to cancel the plan again
- **THEN** the request is rejected with 409 Conflict

### Requirement: State rule has four unit tests
The transition rule SHALL be covered by runnable Vitest unit tests: correct initial state, expected transition, invalid transition rejected, and data preserved. The command to run them SHALL be documented in `README.md` and `docs/task-02-state-tests.md`.

#### Scenario: Tests are runnable and documented
- **WHEN** a developer follows the documented command
- **THEN** the tests run and pass

