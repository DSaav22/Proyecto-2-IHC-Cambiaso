## Purpose

Extends plans management to include a mandatory `titulo` attribute (min 3, max 100 characters) across database storage, validation, creation/editing forms, and plan card rendering.

## MODIFIED Requirements

### Requirement: Plan field validation
A plan SHALL require a non-empty `titulo` of at least 3 and at most 100 characters, a non-empty description of at most 500 characters, and a valid due date. Leading and trailing whitespace SHALL be ignored. Validation errors SHALL be shown as text next to the offending field and SHALL NOT rely on color alone. The same rules SHALL be enforced by the API.

#### Scenario: Valid title accepted
- **WHEN** a user submits a plan with a `titulo` between 3 and 100 characters, a valid description, and a valid due date
- **THEN** the plan is accepted and stored

#### Scenario: Title too short rejected
- **WHEN** a user submits a plan with a `titulo` shorter than 3 characters (after trimming)
- **THEN** validation fails with an error indicating that the title must have at least 3 characters

#### Scenario: Title too long rejected
- **WHEN** a user submits a plan with a `titulo` longer than 100 characters
- **THEN** validation fails with an error indicating that the title must have at most 100 characters

#### Scenario: Missing or empty title rejected
- **WHEN** a user submits a plan without a `titulo` or with only whitespace
- **THEN** validation fails with an error indicating that the title is required

### Requirement: Create plan form
The `/mis-planes` screen SHALL show a "Nuevo plan" button. Pressing it SHALL reveal a form with fields for `titulo`, description, and due date, plus a submit button and a cancel control. All field labels and messages SHALL be in Spanish.

#### Scenario: Form includes title field
- **WHEN** a signed-in user opens the "Nuevo plan" or "Editar plan" dialog
- **THEN** the form contains an input for "Título" alongside description and due date

### Requirement: Plan card display
Each plan card in the list SHALL visually present its `titulo` prominently above its description, along with its status badge and due date.

#### Scenario: Card displays title and description
- **WHEN** a plan card is rendered
- **THEN** both the `titulo` and the description are visibly displayed
