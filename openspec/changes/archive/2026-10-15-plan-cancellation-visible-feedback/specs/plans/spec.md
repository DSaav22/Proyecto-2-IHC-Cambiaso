## MODIFIED Requirements

### Requirement: PLN-14 Cancel requires confirmation and reports failure
Cancelling SHALL be offered only to the creator on `pendiente` or `confirmado` plans, through a confirmation dialog that names the plan. The state SHALL change only after acceptance. Upon successful cancellation, the interface SHALL display an immediate visible confirmation notice anchored to the viewport (as a floating toast notification), ensuring it is perceptible regardless of page scroll position. If the request fails, the dialog SHALL stay open, show the error next to the action, and keep the plan unchanged. Accept SHALL be disabled while pending.

#### Scenario: Accept
- **WHEN** the owner accepts the dialog
- **THEN** the plan shows "Cancelado" without a page reload
- **AND** a success notice appears in the viewport anchored to the screen

#### Scenario: Accept with scrolled viewport
- **WHEN** the owner accepts the cancellation dialog while scrolled down in the plans list
- **THEN** the success notice is immediately visible in the active viewport without requiring the user to scroll to the top of the page

#### Scenario: Dismiss
- **WHEN** the owner dismisses the dialog
- **THEN** no request is sent and the state is unchanged

#### Scenario: Failure
- **WHEN** the cancel request fails
- **THEN** the dialog remains open with the error and the plan is unchanged
