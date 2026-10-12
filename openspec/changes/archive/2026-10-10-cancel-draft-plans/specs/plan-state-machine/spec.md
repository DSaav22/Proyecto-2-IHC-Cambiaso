# plan-state-machine Specification Delta

## MODIFIED Requirements

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
