## MODIFIED Requirements

### Requirement: Plan lifecycle has two states
A plan SHALL have exactly one state: `borrador`, `confirmado`, or `cancelado`. No other state value SHALL be accepted or stored. Whether a plan is overdue SHALL be derived from its due date and SHALL NOT be a stored state.

#### Scenario: Only valid states exist
- **WHEN** a client sends any state other than `borrador`, `confirmado`, or `cancelado`
- **THEN** the API rejects it with a validation error and the stored plan is unchanged

### Requirement: Invalid transitions are rejected
Confirming a plan that is already `confirmado` SHALL be rejected with an error and SHALL NOT modify the plan. Cancelling a plan that is not `confirmado` SHALL be rejected. There SHALL be no transition from `confirmado` back to `borrador` or from `cancelado` to any other state.

#### Scenario: Confirm twice
- **WHEN** the owner confirms a plan that is already `confirmado`
- **THEN** the API responds `409` with a Spanish error message and the plan remains `confirmado`

#### Scenario: Cancel a draft
- **WHEN** the owner cancels a plan in state `borrador`
- **THEN** the API responds with an error and the plan remains `borrador`

#### Scenario: Transition from cancelado
- **WHEN** the owner attempts any state transition on a `cancelado` plan
- **THEN** the API responds with an error and the plan remains `cancelado`

## ADDED Requirements

### Requirement: Cancel plan transition
The system SHALL provide a cancel action that moves a plan from `confirmado` to `cancelado` and persists the change. The action SHALL be available only to the plan's owner.

#### Scenario: Cancel a confirmed plan
- **WHEN** the owner cancels a plan in state `confirmado`
- **THEN** the plan state becomes `cancelado` and the updated plan is returned

#### Scenario: Persistence after reload
- **WHEN** a plan has been cancelled and the user reloads `/mis-planes`
- **THEN** the plan is still shown as `cancelado`

#### Scenario: Someone else's plan
- **WHEN** a user cancels a plan id that belongs to another user or does not exist
- **THEN** the API responds `404` and nothing changes

### Requirement: Transition preserves plan data on cancel
A successful cancel transition SHALL change only the plan state. The description, due date, owner, identifier, and creation time SHALL remain exactly as before.

#### Scenario: Data intact after cancelling
- **WHEN** a confirmed plan is cancelled
- **THEN** its description, due date, owner, identifier, and creation time are identical to their values before the transition
