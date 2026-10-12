# Delta for plans

Terminology: "estado" values are `pendiente`, `confirmado`, `cancelado` (the former `borrador` was renamed to `pendiente` everywhere, see plan-state-machine SM-08). UI labels are "Pendiente", "Confirmado", "Cancelado" (a frontend map only provides capitalization). Date enum names: `today`, `next7`, `next30`, `overdue`.

## ADDED Requirements

### Requirement: PLN-01 Server-side plan query API
`GET /api/plans` SHALL accept optional query parameters `q`, `estado`, `fecha`, and `today`, validated by schema. `q` is trimmed, max 100 characters; `estado` is one of `pendiente|confirmado|cancelado` (`borrador` is rejected with `400`); `fecha` is one of `today|next7|next30|overdue`; `today` is a real calendar date `YYYY-MM-DD`. Unknown parameters or invalid values SHALL yield `400` with a Spanish message. A missing `today` SHALL default to the server's UTC date. The owner-or-member scope SHALL be applied first, then all filters combined with AND. Results SHALL be ordered by due date ascending, then creation time ascending. The response SHALL be `{ plans, summary: { total, overdue, nextDueDate } }`.

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

#### Scenario: Unknown parameter and overlong q
- WHEN a client sends `?foo=1` or a `q` of 101 characters
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
After confirm, cancel, delete, join, or update succeeds, the list and summary SHALL be refetched with the active filters.

#### Scenario: Cancel under a state filter
- GIVEN filter `estado=confirmado` active
- WHEN the owner cancels a confirmed plan
- THEN the plan leaves the list and the stat cards update

#### Scenario: Join under filter
- WHEN the user joins a plan that does not match the active filters
- THEN it is not shown but `summary.total` increases

### Requirement: PLN-14 Cancel requires confirmation and reports failure
Cancelling SHALL be offered only to the creator on `pendiente` or `confirmado` plans, through a confirmation dialog that names the plan. The state SHALL change only after acceptance. If the request fails, the dialog SHALL stay open, show the error next to the action, and keep the plan unchanged. Accept SHALL be disabled while pending.

#### Scenario: Accept
- WHEN the owner accepts the dialog
- THEN the plan shows "Cancelado" without a page reload

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

## MODIFIED Requirements

### Requirement: Plan card shows state and confirm action
Each plan card SHALL display its state as a text badge: "Pendiente" (state `pendiente`), "Confirmado", or "Cancelado"; the state SHALL NOT be editable through a dropdown or select. The badge SHALL combine text with an icon or color distinct per state and SHALL NOT rely on color alone. A card in `pendiente` owned by the user SHALL show a button "Confirmar plan". A card in `confirmado` SHALL show a "Confirmado" badge with a check icon and no confirm button. A card in `cancelado` SHALL show a "Cancelado" badge and no confirm button.
(Previously: badge text "Borrador"/"Confirmado" only, state value `borrador`; no cancelled state)

#### Scenario: Pending card
- WHEN a plan in `pendiente` is listed
- THEN its card shows a "Pendiente" badge and a "Confirmar plan" button

#### Scenario: Confirmed card
- WHEN a plan in `confirmado` is listed
- THEN its card shows a "Confirmado" badge with a check icon and no confirm button

#### Scenario: Cancelled card
- WHEN a plan in `cancelado` is listed
- THEN its card shows a "Cancelado" badge, readable in text, and no confirm button

### Requirement: Plans list ordering and empty state
The list SHALL be ordered by due date ascending, with ties broken by creation time ascending, also when filters are active. Empty-state behavior is defined by PLN-10.
(Previously: a single empty state when the user has no plans)

#### Scenario: Ordering
- WHEN a user has plans with different due dates
- THEN the earliest due date appears first

#### Scenario: Tie-break
- GIVEN two plans with the same due date
- THEN the one created first appears first

#### Scenario: Empty state
- WHEN a user with no plans opens `/mis-planes`
- THEN an empty-state message is shown instead of cards

### Requirement: Unified plans listing with ownership metadata
`GET /api/plans` SHALL return, inside `plans`, all plans owned by the authenticated user as well as plans joined via share code, each with `isOwner: boolean` and `ownerName: string`, together with `summary` (PLN-06).
(Previously: response was the plan array without summary)

#### Scenario: Listing both owned and joined plans
- GIVEN a user who created 1 plan and joined 1 plan created by another user
- WHEN the user requests `GET /api/plans`
- THEN both plans are returned, ordered by due date
- AND the owned plan has `isOwner: true`
- AND the joined plan has `isOwner: false` and the creator's name

## Overlap notes

- `add-plan-filters-and-search` (unarchived) ADDS client-side requirements: search by title, filter by status, due-date range, combined, active filters, empty state. PLN-02..PLN-05, PLN-09, PLN-10 cover the same topics and supersede it (server-side, `fecha` enum, cancelled rules). Its "Filter plans by due date range" and "Empty state for filtered results" are the ones that would still be wrong (client-side) if archived first; archive it first, then these deltas MODIFY them, or drop it.
- `plan-lifecycle` (unarchived) already ADDS "Cancel plan endpoint", "Cancel plan UI action", "Plan card shows cancelado state", and MODIFIES "Delete requires confirmation" / "Card actions menu". PLN-14, PLN-15, PLN-16 refine rather than duplicate; PLN-14/15 are additive and the "Plan card shows state and confirm action" MODIFIED block above supersedes its cancelado badge scenario.
- `add-plan-title` (unarchived) MODIFIES "Plan field validation", "Create plan form", and "Plan card display" to add `titulo`. This change depends on `titulo` existing; PLN-02 assumes it is archived or applied first. No requirement text here edits those blocks.
- PLN-19 (stat cards) has no counterpart in main specs, hence ADDED.

## Traceability (teacher criteria)

| Criterion | Requirement(s) |
|-----------|----------------|
| #7.1 Pending or confirmed can be cancelled | SM-03, PLN-14 |
| #7.2 Cancelled cannot be cancelled again | SM-03, SM-05 |
| #7.3 Cancelled cannot be confirmed | SM-02, SM-05 |
| #7.4 Only the organizer can cancel | SM-03 (403/404/401), PLN-15 |
| #7.5 Confirmation before cancel | PLN-14 |
| #7.6 UI explains blocked action | PLN-15, PLN-16, PLN-17 |
| #7.7 Cancelado persisted across reload | SM-05, PLN-07 |
| #7.8 Unit tests allowed + rejected | SM-07 |
| #8.1 Search by name | PLN-01, PLN-02 |
| #8.2 Filter by state | PLN-03, SM-08 |
| #8.3 Filter by due date (7 days, overdue) | PLN-04 |
| #8.4 Combine search and filters | PLN-05 |
| #8.5 State shown by text and color | Plan card shows state and confirm action (MODIFIED) |
| #8.6 Active filters shown and removable | PLN-08, PLN-09 |
| #8.7 Clear message when nothing matches | PLN-10, PLN-11 |
| #8.8 Filtering from the database | PLN-01, PLN-07, SEED-01 |
| #8.9 Filter unit tests (results + empty) | PLN-18 |
| Cancelled only under "Cancelado" | PLN-04, PLN-05, SEED-01 |
| End-to-end, survives reload | PLN-07, PLN-08, PLN-13 |
| Stats exclude cancelled (P2) | PLN-06, PLN-19 |
