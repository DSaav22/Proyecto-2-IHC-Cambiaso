## Purpose

Extends plans presentation on `/mis-planes` with title search and multi-criteria filters (status and due date ranges), allowing combined filtering, visual removal of active filters, and dedicated empty feedback.

## ADDED Requirements

### Requirement: Search plans by title
The `/mis-planes` screen SHALL provide a search field allowing users to search plans by `titulo`.
The matching SHALL be case-insensitive and ignore leading/trailing whitespace.

#### Scenario: Match title
- **WHEN** a user types a search query matching part of a plan's `titulo`
- **THEN** only plans containing that query in their `titulo` are displayed

### Requirement: Filter plans by status
The `/mis-planes` screen SHALL provide a status filter with options: "Todos", "Borrador", "Confirmado", "Cancelado".

#### Scenario: Filter by confirmed status
- **WHEN** a user selects "Confirmado" in the status filter
- **THEN** only confirmed plans are displayed

### Requirement: Filter plans by due date range
The `/mis-planes` screen SHALL provide a date filter with options: "Todas las fechas", "Hoy", "Próximos 7 días", "Próximos 30 días", "Vencidos".

#### Scenario: Filter upcoming 7 days
- **WHEN** a user selects "Próximos 7 días"
- **THEN** only plans whose due date is between today and the next 7 days are displayed

### Requirement: Combined search and filters
Search by title, status filter, and due date filter SHALL be combinable using AND logic.

#### Scenario: Combined criteria match
- **WHEN** a user filters by "Confirmado", selects "Próximos 7 días", and types a search query
- **THEN** only plans that satisfy all three conditions simultaneously are displayed

### Requirement: Display and remove active filters
The interface SHALL visibly show currently active filters as removable tags/chips and offer a control to clear/reset all filters.

#### Scenario: Remove a single filter
- **WHEN** a user removes an active filter chip
- **THEN** that specific filter is cleared while other active filters remain in effect

#### Scenario: Reset all filters
- **WHEN** a user clicks "Quitar filtros"
- **THEN** all filters are cleared and the full list of plans is restored

### Requirement: Empty state for filtered results
When the user has plans but no plans match the active filters, the screen SHALL display the message "No existen planes con estas características" along with a button to reset the filters.

#### Scenario: No matching plans
- **WHEN** active filters match zero plans
- **THEN** the message "No existen planes con estas características" is displayed
