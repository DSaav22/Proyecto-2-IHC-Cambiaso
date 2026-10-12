# Delta for test-user-seeding

## ADDED Requirements

### Requirement: SEED-01 Demo plans for seeded users
The seed script SHALL create demo plans for `usuario1@planazo.com` and `usuario2@planazo.com` so evaluators can exercise search, state filters, and due-date filters without typing data. The demo set SHALL cover: at least one `pendiente`, one `confirmado`, and one `cancelado` plan; due dates relative to the seed run date covering overdue, today, within 7 days, within 30 days, and later; distinct titles that allow a text search to return some but not all plans; and at least one plan joined as guest by the other seeded user.

#### Scenario: Evaluator sees varied plans
- GIVEN the seed has run
- WHEN `usuario1@planazo.com` opens `/mis-planes`
- THEN the list contains plans in all three states and with due dates in several ranges

#### Scenario: Cancelled demo plan appears only under Cancelado
- GIVEN the seed has run
- WHEN `usuario1@planazo.com` filters by estado `cancelado`
- THEN the cancelled demo plan is listed, and it is absent from every other state filter and from every date filter used without estado `cancelado`

#### Scenario: Search finds a demo plan
- GIVEN the seed has run
- WHEN a seeded user searches a word that appears in only some demo titles
- THEN only those plans are returned

### Requirement: SEED-02 Demo plan seeding is idempotent
Running the seed repeatedly SHALL NOT create duplicate demo plans, duplicate memberships, or fail. Demo plans SHALL be identified by a stable per-user plan identifier.

#### Scenario: Re-run
- GIVEN the seed has already run
- WHEN `prisma db seed` runs again
- THEN each seeded user still has exactly one plan per demo identifier and no error occurs

#### Scenario: Re-run after a demo plan was cancelled by hand
- GIVEN an evaluator changed a demo plan state through the UI
- WHEN the seed runs again
- THEN no duplicate is created and the run succeeds

### Requirement: SEED-03 Production refusal is preserved
The seed SHALL refuse to run when `NODE_ENV=production` and SHALL NOT create users or plans in that case.

#### Scenario: Production
- GIVEN `NODE_ENV=production`
- WHEN the seed runs
- THEN it exits with an error and no users or plans are created

#### Scenario: Non-production
- GIVEN `NODE_ENV` is not `production`
- WHEN the seed runs
- THEN users and demo plans are created

## Overlap notes

No unarchived change touches `test-user-seeding`. The existing "Idempotent seeding" and "Automatic and manual execution" requirements remain valid and apply to demo plans too (SEED-02 extends, not replaces).
