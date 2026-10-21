# plans Specification

## Purpose

Lets a signed-in user create plans (ID, description, due date) and see them as a list of cards that updates instantly and survives a page reload.

## Requirements

### Requirement: Create plan form
The `/mis-planes` screen SHALL show a "Nuevo plan" button. Pressing it SHALL reveal a form with fields for `titulo`, description, and due date, plus a submit button and a cancel control. All field labels and messages SHALL be in Spanish.

#### Scenario: Open the form
- **WHEN** a signed-in user presses "Nuevo plan"
- **THEN** a dialog titled "Nuevo plan" opens with the "Título", "Descripción", and "Fecha límite" fields and a "Crear plan" submit button

#### Scenario: Cancel the form
- **WHEN** the user presses "Cancelar" in the open form
- **THEN** the dialog closes and no plan is created

#### Scenario: Form includes title field
- **WHEN** a signed-in user opens the "Nuevo plan" or "Editar plan" dialog
- **THEN** the form contains an input for "Título" alongside description and due date

### Requirement: Plan field validation
A plan SHALL require a non-empty `titulo` of at least 3 and at most 100 characters, a non-empty description of at most 500 characters, and a valid due date. Leading and trailing whitespace SHALL be ignored. Validation errors SHALL be shown as text next to the offending field and SHALL NOT rely on color alone. The same rules SHALL be enforced by the API.

#### Scenario: Empty fields rejected
- **WHEN** the user submits the form with an empty title, description, or due date
- **THEN** no request is sent, no plan is created, and each invalid field shows a Spanish error message next to it

#### Scenario: Server rejects invalid data
- **WHEN** a client sends `POST /api/plans` with a missing or invalid field
- **THEN** the API responds `400` with `{ message: "Datos inválidos", errors }`, where `errors` is keyed by field name (`titulo`, `description`, `dueDate`)

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

### Requirement: Unique plan ID per user
A plan ID SHALL be unique among the plans of the same user. Two different users MAY use the same ID.

#### Scenario: Duplicate ID
- **WHEN** a user submits a plan whose ID already exists among their plans
- **THEN** the API responds `409` and the form shows an error on the ID field, keeping the typed values

#### Scenario: Same ID, different user
- **WHEN** another user creates a plan with an ID that the first user already has
- **THEN** the plan is created

### Requirement: Plan appears without refresh
After a successful submission the new plan SHALL appear as a card in the list without a page reload, the form SHALL close and reset, and the user SHALL be told the plan was created. Each card SHALL show the plan ID, description, and due date (formatted in Spanish).

#### Scenario: Card appears immediately
- **WHEN** the user submits a valid plan
- **THEN** a card with its ID, description, and due date is visible in the list and the page was not reloaded

#### Scenario: Failure keeps the form
- **WHEN** the request fails because of a network or server error
- **THEN** an error message is shown, the typed values are kept, and no card is added

### Requirement: Plans persist across reloads
Plans SHALL be stored per user in the database. Creating a plan, then reloading the page, SHALL still show that plan.

#### Scenario: Create, reload, still visible
- **WHEN** a user creates a plan, sees its card, and reloads `/mis-planes`
- **THEN** the card is still visible

#### Scenario: Plans isolation and membership
- **WHEN** a user lists plans
- **THEN** only plans created by that user or joined via share code are returned

### Requirement: Plans list ordering and empty state
The list SHALL be ordered by due date ascending, with ties broken by creation time ascending, also when filters are active. Empty-state behavior is defined by PLN-10.

#### Scenario: Ordering
- WHEN a user has plans with different due dates
- THEN the earliest due date appears first

#### Scenario: Tie-break
- GIVEN two plans with the same due date
- THEN the one created first appears first

#### Scenario: Empty state
- WHEN a user with no plans opens `/mis-planes`
- THEN an empty-state message is shown instead of cards

### Requirement: Plans API requires a session
`GET /api/plans` and `POST /api/plans` SHALL require a valid session cookie. Without one they SHALL respond `401` and create or return nothing.

#### Scenario: Unauthenticated request
- **WHEN** a client without a session calls `GET /api/plans` or `POST /api/plans`
- **THEN** the API responds `401`

### Requirement: Plan UI follows the design system
The form, cards, and list SHALL consume design tokens only (color roles, type scale, spacing, radius), keep the 4.5:1 text contrast and 3:1 form-control border contrast, and be built in design order: tokens, then atoms, molecules, organisms, and finally the page.

#### Scenario: No raw values
- **WHEN** the plan components are searched for hex, rgb, or default palette color names
- **THEN** none are found

### Requirement: Plan card shows state and confirm action
Each plan card SHALL display its state as a text badge: "Pendiente" (state `pendiente`), "Confirmado", or "Cancelado"; the state SHALL NOT be editable through a dropdown or select. The badge SHALL combine text with an icon or color distinct per state and SHALL NOT rely on color alone. A card in `pendiente` owned by the user SHALL show a button "Confirmar plan". A card in `confirmado` SHALL show a "Confirmado" badge with a check icon and no confirm button. A card in `cancelado` SHALL show a "Cancelado" badge and no confirm button.

#### Scenario: Pending card
- WHEN a plan in `pendiente` is listed
- THEN its card shows a "Pendiente" badge and a "Confirmar plan" button

#### Scenario: Confirmed card
- WHEN a plan in `confirmado` is listed
- THEN its card shows a "Confirmado" badge with a check icon and no confirm button

#### Scenario: Cancelled card
- WHEN a plan in `cancelado` is listed
- THEN its card shows a "Cancelado" badge, readable in text, and no confirm button

### Requirement: Confirmation dialog before confirming
Pressing "Confirmar plan" SHALL open a dialog that names the plan and states that the plan will not return to draft. The state SHALL change only after the user accepts. While the request is pending the accept control SHALL be disabled.

#### Scenario: Accept
- **WHEN** the user accepts the dialog
- **THEN** the plan becomes `confirmado` on its card without a page reload

#### Scenario: Cancel
- **WHEN** the user cancels the dialog
- **THEN** the plan stays `pendiente` and no request is sent

#### Scenario: Failure
- **WHEN** the confirm request fails
- **THEN** an error message is shown and the card keeps its previous state

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

### Requirement: Delete requires confirmation
Choosing "Eliminar" SHALL open a dialog that names the plan and asks for confirmation. The plan SHALL be deleted only after the user accepts, and SHALL disappear from the list without a page reload.

#### Scenario: Confirm delete
- **WHEN** the user accepts the delete dialog
- **THEN** the plan is deleted, removed from the list, and does not return after a reload

#### Scenario: Cancel delete
- **WHEN** the user cancels the delete dialog
- **THEN** the plan remains in the list

### Requirement: Plan creation does not expose state
The plan creation form SHALL NOT offer a state field. The API SHALL ignore any state sent on creation.

#### Scenario: Form fields
- **WHEN** the user opens the "Nuevo plan" form
- **THEN** it contains description and due date fields and no state control

### Requirement: Automatic unique share code on plan creation
When a plan is created, the system SHALL generate a unique, non-empty, uppercase alphanumeric share code (prefixed with `PLZ-`) and persist it on the plan. The API response SHALL include this share code.

#### Scenario: Plan created with share code
- **WHEN** an authenticated user creates a new plan
- **THEN** the returned plan contains a unique `shareCode` in format `PLZ-XXXXXX`
- **AND** the code is persisted in the database

### Requirement: Join plan by share code endpoint
The API SHALL provide an endpoint `POST /api/plans/join` accepting `{ code: string }` and requiring authentication.

#### Scenario: Successfully joining a plan
- **GIVEN** an authenticated user and an existing plan created by a different user
- **WHEN** the user sends `POST /api/plans/join` with that plan's share code
- **THEN** the API responds `200` with the serialized plan
- **AND** the plan now appears in the user's plans list with `isOwner: false`

#### Scenario: Plan with code not found
- **GIVEN** an authenticated user
- **WHEN** the user sends `POST /api/plans/join` with an invalid or non-existent code
- **THEN** the API responds `404` with `{ message: "Plan no encontrado con este código" }`

#### Scenario: Creator joins their own plan
- **GIVEN** an authenticated user who is the creator of a plan
- **WHEN** the user sends `POST /api/plans/join` with their own plan's code
- **THEN** the API responds `400` with `{ message: "Ya eres el creador de este plan" }`

#### Scenario: User already joined the plan
- **GIVEN** an authenticated user who has already joined a plan
- **WHEN** the user sends `POST /api/plans/join` again with that code
- **THEN** the API responds `409` with `{ message: "Ya te has unido a este plan" }`

### Requirement: Unified plans listing with ownership metadata
`GET /api/plans` SHALL return, inside `plans`, all plans owned by the authenticated user as well as plans joined via share code, each with `isOwner: boolean` and `ownerName: string`, together with `summary` (PLN-06).

#### Scenario: Listing both owned and joined plans
- GIVEN a user who created 1 plan and joined 1 plan created by another user
- WHEN the user requests `GET /api/plans`
- THEN both plans are returned, ordered by due date
- AND the owned plan has `isOwner: true`
- AND the joined plan has `isOwner: false` and the creator's name

### Requirement: Strict read-only authorization for guests
Only the plan's creator SHALL be authorized to edit (`PUT /api/plans/:id`), confirm (`POST /api/plans/:id/confirm`), cancel (`POST /api/plans/:id/cancel`), or delete (`DELETE /api/plans/:id`) the plan. If a guest member attempts any of these operations, the API SHALL reject the request with `403 Forbidden`.

#### Scenario: Guest attempts to confirm plan
- **GIVEN** an authenticated user who is a guest member of a plan
- **WHEN** the user sends `POST /api/plans/:id/confirm`
- **THEN** the API responds `403` with `{ message: "Solo el creador puede modificar este plan" }`
- **AND** the plan state remains unchanged

#### Scenario: Guest attempts to delete plan
- **GIVEN** an authenticated user who is a guest member of a plan
- **WHEN** the user sends `DELETE /api/plans/:id`
- **THEN** the API responds `403` with `{ message: "Solo el creador puede eliminar este plan" }`
- **AND** the plan is not deleted

### Requirement: Join plan UI on `/mis-planes`
The `/mis-planes` screen SHALL provide a button "Unirse con código" alongside "Nuevo plan". Activating it SHALL open a dialog to enter the share code. Submitting a valid code SHALL add the plan card immediately without full page reload.

#### Scenario: Successfully joining from UI
- **WHEN** the user enters a valid code in the join dialog and submits
- **THEN** the dialog closes, and the joined plan appears in the cards list with an "Invitado" badge

### Requirement: Read-only presentation on PlanCard for guests
When a plan card has `isOwner: false`, it SHALL display an "Invitado" badge, indicate the creator's name, and SHALL NOT display the "Confirmar plan" button, edit options, or delete menu items. The only action available to a guest SHALL be "Abandonar plan" in the card menu. For creator cards (`isOwner: true`), the share code SHALL be visible with a copy button.

#### Scenario: Guest viewing card
- **WHEN** a joined plan card is rendered
- **THEN** it displays "Invitado", "Creado por: {name}", and contains no edit or delete controls

#### Scenario: Guest card offers only leave
- **WHEN** a joined plan card is rendered
- **THEN** its menu offers only "Abandonar plan"

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

### Requirement: Plan card display
Each plan card in the list SHALL visually present its `titulo` prominently above its description, along with its status badge and due date.

#### Scenario: Card displays title and description
- **WHEN** a plan card is rendered
- **THEN** both the `titulo` and the description are visibly displayed

### Requirement: PLN-01 Server-side plan query API
`GET /api/plans` SHALL accept optional query parameters `q`, `estado`, `fecha`, and `today`, validated by schema. `q` is trimmed, max 100 characters; `estado` is one of `pendiente|confirmado|cancelado` (`borrador` is rejected with `400`); `fecha` is one of `today|next7|next30|overdue`; `today` is a real calendar date `YYYY-MM-DD`. Unknown parameters SHALL be ignored; invalid values of the known parameters SHALL yield `400` with a Spanish message. A missing `today` SHALL default to the server's UTC date. The owner-or-member scope SHALL be applied first, then all filters combined with AND. Results SHALL be ordered by due date ascending, then creation time ascending. The response SHALL be `{ plans, summary: { total, overdue, nextDueDate } }`.

#### Scenario: No params
- GIVEN a user with 3 plans
- WHEN the user calls `GET /api/plans`
- THEN `plans` has 3 items ordered by due date then creation time and `summary.total` is 3

#### Scenario: Invalid estado
- WHEN a client calls `GET /api/plans?estado=archivado`
- THEN the API responds `400`

#### Scenario: Former borrador value rejected
- WHEN a client calls `GET /api/plans?estado=borrador`
- THEN the API responds `400`

#### Scenario: Invalid or impossible date
- WHEN a client calls `GET /api/plans?today=2026-02-30` or `?today=hoy`
- THEN the API responds `400`

#### Scenario: Unknown parameter is ignored
- WHEN a client sends `?foo=1`
- THEN the API responds `200` and the unknown key has no effect on the result

#### Scenario: Overlong q
- WHEN a client sends a `q` of 101 characters
- THEN the API responds `400`

#### Scenario: Whitespace-only q
- WHEN a client sends `?q=%20%20`
- THEN the filter is treated as absent and all scoped plans are returned

#### Scenario: Scope isolation
- GIVEN another user owns a plan whose title matches `q`
- WHEN the user searches that text without being owner or member
- THEN that plan is not returned

### Requirement: PLN-02 Search by plan title only
Text search SHALL match the plan title (`titulo`) only, as a case-insensitive substring. The description SHALL NOT be searched. Search SHALL NOT be accent-insensitive (documented limitation). Wildcard characters in `q` (`%`, `_`) SHALL be treated literally.

#### Scenario: Title match
- GIVEN plans titled "Cena familiar" and "Paseo"
- WHEN the user searches "cena"
- THEN only "Cena familiar" is returned

#### Scenario: Description is not searched
- GIVEN a plan titled "Paseo" with description "cena en casa"
- WHEN the user searches "cena"
- THEN the plan is not returned

#### Scenario: Accents are significant
- GIVEN a plan titled "Reunión"
- WHEN the user searches "reunion"
- THEN the plan is not returned

#### Scenario: Literal wildcard
- WHEN the user searches "%"
- THEN only plans whose title contains a literal "%" are returned

### Requirement: PLN-03 Filter by state
The `estado` filter SHALL return only plans in that state. The interface SHALL offer the options Pendiente (`pendiente`), Confirmado, and Cancelado.

#### Scenario: Confirmed only
- GIVEN plans in all three states
- WHEN the user filters by `confirmado`
- THEN only confirmed plans are returned

#### Scenario: Pendiente sends pendiente
- WHEN the user picks "Pendiente"
- THEN the request carries `estado=pendiente`

### Requirement: PLN-04 Filter by due date
The `fecha` filter SHALL be evaluated against the `today` date: `today` = due date equals today; `next7` = due date from today to today+7 inclusive (days 0..7); `next30` = from today to today+30 inclusive; `overdue` = due date before today. The interface SHALL label them "Hoy", "Próximos 7 días", "Próximos 30 días", "Vencidos". Date filters SHALL exclude `cancelado` plans unless `estado=cancelado` is also set.

#### Scenario: Boundary day 7
- GIVEN today is 2026-10-12 and a plan due 2026-10-19
- WHEN the user filters `next7`
- THEN the plan is returned; a plan due 2026-10-20 is not

#### Scenario: Overdue boundary
- GIVEN a plan due 2026-10-11 and one due 2026-10-12
- WHEN the user filters `overdue` with today 2026-10-12
- THEN only the 2026-10-11 plan is returned

#### Scenario: Cancelled excluded from date filter
- GIVEN a `cancelado` plan due in 3 days
- WHEN the user filters `next7`
- THEN it is not returned

#### Scenario: Cancelled with explicit state
- WHEN the user filters `estado=cancelado` and `fecha=next7`
- THEN the cancelled plan due in 3 days is returned

#### Scenario: Client calendar date
- GIVEN the server UTC date differs from the client's local date
- WHEN the client sends its local `today`
- THEN ranges are computed from the client's date

### Requirement: PLN-05 Combined filters
Search, state, and date filters SHALL be combinable. A `cancelado` plan SHALL appear only when `estado=cancelado` is active or when no state or date filter is active. Plans the user joined as guest SHALL be visible under every filter they match.

#### Scenario: Confirmed in the next 7 days
- GIVEN confirmed plans due in 2 and 20 days and a pending plan due in 2 days
- WHEN the user applies `estado=confirmado` and `fecha=next7`
- THEN only the confirmed plan due in 2 days is returned

#### Scenario: Search plus state
- WHEN the user searches "cena" with `estado=pendiente`
- THEN only pending plans whose title contains "cena" are returned

#### Scenario: Cancelled plan only in Cancelado
- GIVEN a cancelled plan
- WHEN the user applies `estado=pendiente`, `estado=confirmado`, or any date filter without `cancelado`
- THEN the cancelled plan is not listed; under `estado=cancelado` it is

#### Scenario: Guest plan under filters
- GIVEN a guest plan that is `confirmado` due in 3 days
- WHEN the user filters `confirmado` + `next7`
- THEN the guest plan is returned

### Requirement: PLN-06 Unfiltered summary
`summary` SHALL be computed over the user's full scope, ignoring `q`, `estado`, and `fecha`. `summary.total` counts all scoped plans including cancelled; `summary.overdue` and `summary.nextDueDate` SHALL exclude `cancelado` plans. `nextDueDate` is the earliest due date on or after `today` among non-cancelled plans, or `null`.

#### Scenario: Summary ignores filters
- GIVEN 5 scoped plans and a filter matching 1
- WHEN the list is requested
- THEN `plans` has 1 item and `summary.total` is 5

#### Scenario: Cancelled excluded from counters
- GIVEN a cancelled plan due yesterday and a cancelled plan due tomorrow
- WHEN the summary is computed
- THEN neither affects `overdue` or `nextDueDate`, but both count in `total`

#### Scenario: No upcoming plan
- GIVEN only past or cancelled plans
- THEN `nextDueDate` is `null`

### Requirement: PLN-07 Filtering resolved from the database
Filtering SHALL be resolved by a database query, not by client-side filtering of a full list and not from sample data. The behavior SHALL persist across a page reload.

#### Scenario: End to end
- GIVEN stored plans
- WHEN the user types a title in the search box
- THEN a request with `q` is sent, the database returns the match, and the list shows it

#### Scenario: Reload keeps result
- GIVEN the user applied search and filters
- WHEN the page is reloaded
- THEN the same filters are applied and the same plans are shown

### Requirement: PLN-08 Filters live in the URL
Search and filters SHALL be stored in the `/mis-planes` query string (`q`, `estado`, `fecha`). Invalid or unknown URL values SHALL be dropped silently on the frontend (sanitized) and SHALL NOT be sent to the API. Back/forward navigation and reload SHALL restore the state.

#### Scenario: Shareable URL
- GIVEN `/mis-planes?estado=confirmado&fecha=next7`
- WHEN the page opens
- THEN both filters are active and the matching plans are shown

#### Scenario: Corrupted URL
- GIVEN `/mis-planes?estado=zzz&fecha=next7`
- WHEN the page opens
- THEN `estado` is ignored, `fecha` stays active, and no `400` is triggered

### Requirement: PLN-09 Active filters visible and removable
The interface SHALL show each active filter (search text, state, date) as a chip with a text label and a remove control with an accessible name that includes the filter (label-in-name). Chip and remove targets SHALL be at least 44px. Removing a chip SHALL update the list and move focus to a stable control (next chip, or the search input when none remain). A "Limpiar filtros" control SHALL clear all.

#### Scenario: Remove one filter
- GIVEN `estado` and `fecha` active
- WHEN the user removes the `estado` chip
- THEN only `fecha` remains and focus moves to a remaining control

#### Scenario: Remove last chip
- GIVEN one active chip
- WHEN the user removes it
- THEN focus moves to the search input

### Requirement: PLN-10 Empty states
When no plan matches and filters are active, the interface SHALL show a message such as "No hay planes que coincidan con los filtros" with an action to clear filters. When the user has no plans at all (`summary.total` is 0), the existing create-plan empty state SHALL show instead. The decision SHALL use `summary.total` and the active filters, never the filtered list length alone.

#### Scenario: Filters match nothing
- GIVEN the user has plans
- WHEN filters match none
- THEN the "no match" message with a clear-filters action is shown, not an empty list

#### Scenario: No plans at all
- GIVEN `summary.total` is 0
- THEN the invite-to-create message is shown

### Requirement: PLN-11 Result count announced
The interface SHALL show the number of results and expose it in an `aria-live` region updated after each query.

#### Scenario: Count update
- WHEN a filter reduces results to 2
- THEN the live region announces 2 results

### Requirement: PLN-12 Responsive search interaction
Search input changes SHALL be debounced (about 300 ms) before querying. Responses of superseded requests SHALL be ignored. The initial load SHALL show a loading state; later refreshes SHALL keep the list and the search input mounted and focused. Failures SHALL show an error without discarding the typed text. The filter bar SHALL be usable on mobile widths.

#### Scenario: Debounce
- WHEN the user types 5 characters within 300 ms
- THEN one request is sent

#### Scenario: Stale response ignored
- GIVEN request A is slower than later request B
- WHEN A resolves after B
- THEN the list shows B's results

#### Scenario: Focus kept
- GIVEN focus is in the search input
- WHEN a refresh completes
- THEN focus is still in the input

#### Scenario: Query fails
- WHEN the request fails
- THEN an error message is shown and the input keeps its text

### Requirement: PLN-13 List refreshes after mutations
After confirm, cancel, delete, join, leave, or update succeeds, the list and summary SHALL be refetched with the active filters.

#### Scenario: Cancel under a state filter
- GIVEN filter `estado=confirmado` active
- WHEN the owner cancels a confirmed plan
- THEN the plan leaves the list and the stat cards update

#### Scenario: Join under filter
- WHEN the user joins a plan that does not match the active filters
- THEN it is not shown but `summary.total` increases

### Requirement: PLN-14 Cancel requires confirmation and reports failure
Cancelling SHALL be offered only to the creator on `pendiente` or `confirmado` plans, through a confirmation dialog that names the plan. The state SHALL change only after acceptance. Upon successful cancellation, the interface SHALL display an immediate visible confirmation notice anchored to the viewport (as a floating toast notification), ensuring it is perceptible regardless of page scroll position. If the request fails, the dialog SHALL stay open, show the error next to the action, and keep the plan unchanged. Accept SHALL be disabled while pending.

#### Scenario: Accept
- WHEN the owner accepts the dialog
- THEN the plan shows "Cancelado" without a page reload
- AND a success notice appears in the viewport anchored to the screen

#### Scenario: Accept with scrolled viewport
- WHEN the owner accepts the cancellation dialog while scrolled down in the plans list
- THEN the success notice is immediately visible in the active viewport without requiring the user to scroll to the top of the page

#### Scenario: Dismiss
- WHEN the owner dismisses the dialog
- THEN no request is sent and the state is unchanged

#### Scenario: Failure
- WHEN the cancel request fails
- THEN the dialog remains open with the error and the plan is unchanged

### Requirement: PLN-15 Blocked actions are explained
When an action is unavailable, the card SHALL show a visible `role="note"` with a Spanish reason. A cancelled plan SHALL show a note that it is cancelled and cannot be confirmed, edited, or cancelled again. A guest card SHALL show a note that only the creator can modify the plan. The reason SHALL NOT rely on tooltips or color alone.

#### Scenario: Cancelled owner card
- WHEN a cancelled plan owned by the user is rendered
- THEN confirm, edit, and cancel are absent and a note explains why

#### Scenario: Guest card
- WHEN a guest card is rendered
- THEN a note states only the creator can modify it

#### Scenario: Active owner card
- WHEN a pending owned plan is rendered
- THEN no blocked-action note is shown

### Requirement: PLN-16 Cancelled plans are read-only but deletable
A `cancelado` plan SHALL NOT be editable, confirmable, or re-cancellable, but its creator SHALL be able to delete it (with the existing delete confirmation).

#### Scenario: Delete cancelled
- WHEN the owner deletes a cancelled plan and accepts
- THEN it is removed and does not return after reload

#### Scenario: Edit cancelled
- WHEN a client calls `PUT /api/plans/:id` on a cancelled plan
- THEN the API rejects it with `409` and the plan is unchanged

### Requirement: PLN-17 No overdue wording on cancelled cards
Cancelled cards SHALL NOT show overdue wording such as "Venció hace N días" and SHALL NOT be styled as overdue.

#### Scenario: Cancelled past plan
- GIVEN a cancelled plan with a past due date
- THEN its card shows "Cancelado" and no overdue text

#### Scenario: Pending past plan
- GIVEN a pending plan with a past due date
- THEN its card shows the overdue wording

### Requirement: PLN-18 Filter logic unit tests
Filtering SHALL be covered by unit tests on the pure query builder and the frontend filter helpers, each file with at least 4 tests, including at least one case with results and one empty case, date boundaries (day 0, day 7, day 8, yesterday), and cancelled exclusion.

#### Scenario: With and without results
- WHEN the filter tests run
- THEN a case returning plans and a case returning none both pass

### Requirement: PLN-19 Dashboard stat cards
The stat cards on `/mis-planes` SHALL show: "Planes" = all scoped plans (`summary.total`, including cancelled); "Próximo plan" = `summary.nextDueDate` excluding cancelled; "Vencidos" = `summary.overdue` excluding cancelled. They SHALL NOT change when search or filters change.

#### Scenario: Filters do not change stats
- WHEN the user applies a filter
- THEN the three stat values are unchanged

#### Scenario: Cancelled plan does not count as overdue
- GIVEN the only past-due plan is cancelled
- THEN "Vencidos" shows 0 and "Planes" still counts it

#### Scenario: No next plan
- GIVEN no non-cancelled plan on or after today
- THEN "Próximo plan" shows a placeholder, not a date

### Requirement: Plan activity event logging
The system SHALL record an event in `PlanActivity` whenever a plan is created, confirmed, cancelled, or when a member joins or leaves. Each event SHALL capture:
1. `planId`: Identifier of the affected plan.
2. `userId`: Identifier of the user who triggered the action.
3. `action`: The action type (`created`, `confirmed`, `cancelled`, `joined`, `left`).
4. `previousState`: Plan state before the action, or `null` if not applicable.
5. `newState`: Plan state after the action, or `null` if not applicable.
6. `metadata`: Optional JSON metadata with context (e.g. plan title, member name).
7. `createdAt`: Timestamp when the action occurred.

#### Scenario: Plan creation logs activity
- **GIVEN** an authenticated user
- **WHEN** the user creates a plan with title "Cena de fin de año"
- **THEN** an activity record is created with action `created`, `newState: "pendiente"`, and metadata containing the plan title

#### Scenario: Plan confirmation logs activity
- **GIVEN** an authenticated creator of a pending plan
- **WHEN** the user confirms the plan
- **THEN** an activity record is created with action `confirmed`, `previousState: "pendiente"`, and `newState: "confirmado"`

#### Scenario: Plan cancellation logs activity
- **GIVEN** an authenticated creator of a plan
- **WHEN** the user cancels the plan
- **THEN** an activity record is created with action `cancelled` and `newState: "cancelado"`

#### Scenario: Guest joins plan logs activity
- **GIVEN** an authenticated user joining a plan via share code
- **WHEN** the join request succeeds
- **THEN** an activity record is created with action `joined` and the user's ID

#### Scenario: Guest leaves plan logs activity
- **GIVEN** an authenticated guest member of a plan
- **WHEN** the user leaves the plan
- **THEN** an activity record is created with action `left`

### Requirement: User-isolated activity query API
The API SHALL provide an endpoint `GET /api/plans/activity` requiring authentication. The endpoint SHALL accept an optional query parameter `tipo` (`todos`, `estados`, `creaciones`, `participacion`), defaulting to `todos`. The query SHALL strictly isolate events so that a user only sees activity for plans they own or are members of. Results SHALL be ordered by `createdAt` descending (most recent first).

#### Scenario: Unauthenticated request rejected
- **WHEN** an unauthenticated client sends `GET /api/plans/activity`
- **THEN** the API responds `401`

#### Scenario: User sees activity only for accessible plans
- **GIVEN** user A and user B have distinct plans and activities
- **WHEN** user A requests `GET /api/plans/activity`
- **THEN** no activities related to user B's non-shared plans are returned

#### Scenario: Thematic filter by state changes
- **GIVEN** activities with various actions (`created`, `confirmed`, `cancelled`, `joined`)
- **WHEN** the user requests `GET /api/plans/activity?tipo=estados`
- **THEN** only activities with action `confirmed` or `cancelled` are returned

#### Scenario: Thematic filter by creations
- **WHEN** the user requests `GET /api/plans/activity?tipo=creaciones`
- **THEN** only activities with action `created` are returned

#### Scenario: Thematic filter by participation
- **WHEN** the user requests `GET /api/plans/activity?tipo=participacion`
- **THEN** only activities with action `joined` or `left` are returned

#### Scenario: Invalid tipo parameter defaults or rejects
- **WHEN** the user requests `GET /api/plans/activity?tipo=invalido`
- **THEN** the API responds `400` with an explanatory Spanish message

### Requirement: Activity history interface
The application SHALL provide a dedicated view at route `/historial` displaying the chronological list of user activities. Each activity card (`ActivityCard`) SHALL clearly and autonomously communicate the 4 dimensions of the event without requiring cross-screen lookups:
1. **Qué ocurrió**: Action icon and Spanish title (e.g., "Plan creado", "Plan confirmado", "Plan cancelado", "Nuevo participante").
2. **Cuándo ocurrió**: Exact date/time and relative time in Spanish (e.g., "Hace 15 min", "21 oct 2026, 11:30").
3. **Cuál fue el resultado**: Visual status badge (`pendiente`, `confirmado`, `cancelado`).
4. **Qué elemento estuvo involucrado**: Plan title with an accessible direct link to view the plan.

#### Scenario: Activity card displays all 4 dimensions
- **GIVEN** an activity event for a confirmed plan "Cumpleaños"
- **WHEN** the user visits `/historial`
- **THEN** the card shows the confirmation icon, the text "Plan confirmado", the relative time, the "Confirmado" badge, and the clickable title "Cumpleaños"

#### Scenario: Empty activity state
- **GIVEN** a user with no recorded plan activity
- **WHEN** the user navigates to `/historial`
- **THEN** an empty state is displayed stating "Todavía no tenés actividad registrada" alongside a button "Crear un plan" that links to `/mis-planes`

### Requirement: Ergonomic interaction decisions (Fitts & Hick)
The interface SHALL satisfy the following HCI ergonomic constraints:
1. **Fitts's Law**: The navigation link or button to access `/historial` in the main Navbar SHALL provide a touch/click target of at least 44px ($\ge 44$px height/width) with proper focus outline.
2. **Hick's Law**: The activity view SHALL offer exactly 4 thematic filter chips: "Todos", "Estados", "Creaciones", "Participación" ($n=4$), reducing decision time $T = b \log_2(n+1)$ compared to open dropdowns or fragmented menus.
3. **Cognitive Load ($7 \pm 2$)**: The event information SHALL be self-contained in a single visual card, avoiding the need for the user to memorize past plan states across tabs or screens.

#### Scenario: Navbar target size conforms to Fitts's Law
- **WHEN** inspecting the "Historial" element in `Navbar`
- **THEN** its bounding box target height is at least 44px

#### Scenario: Filter chips update visible activities
- **WHEN** the user clicks the "Estados" chip
- **THEN** only state transition events are shown and the active chip is visibly highlighted
