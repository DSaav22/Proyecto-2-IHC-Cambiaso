# Archive report: plan-cancel-and-search-hardening

Archived on 2026-10-12. Teacher issues #7 and #8 remain OPEN on purpose (the teacher closes them in class).

## Outcome

- Verdict at close: PASS WITH WARNINGS (0 CRITICAL, 3 WARNING, 7 SUGGESTION). Validator: `valid: true`, `verdict: pass_with_warnings`, 32 requirements, 88 scenarios.
- Tasks: 66/66. Task 7.6 (the archive step itself) was reconciled mechanically at archive time because it can only be ticked after verify.
- Pull requests, all merged into `master` with merge commits: #9 (cancel flow), #10 (rename to `pendiente` and server-side filtering), #11 (filters in the URL, accessibility, seeds, specs).
- Sub-issues: #12 (parent #7), #13 and #14 (parent #8), closed.
- Final suites on `master`: backend 133 tests, frontend 181 tests, backend typecheck clean, frontend build OK.

## Spec sync

Delta specs were synced into `openspec/specs/` during PR #11 (commit e1fb8c1) and aligned in 4d1e7f7:

| Capability | Requirements in delta | Requirements in main |
|---|---|---|
| plans | 19 | 19 |
| plan-state-machine | 7 | 7 |
| test-user-seeding | 3 | 3 |

Superseded changes archived without syncing (see `ARCHIVED-WITHOUT-SYNC.md` in each): `plan-lifecycle`, `add-plan-filters-and-search`. `add-plan-title` was synced and archived.

## Final-state facts (outrank earlier snapshots)

- The first final verify returned FAIL (1 CRITICAL: spec said unknown query param gives 400, code ignores it). Fixed by aligning the spec in 4d1e7f7; the re-run passed.
- An independent HTTP + PostgreSQL end-to-end run (throwaway database, dropped) passed 77/77 checks for the teacher criteria #7 and #8.
- The manual browser checklist (tasks 6.5 and 7.8 a-k) was ticked by the user's side; browser-only behaviors are not covered by automation.

## Open suggestions carried forward

1. Seed due dates are UTC-relative: the "Hoy" demo plan can show as tomorrow for a local date behind UTC.
2. `POST /api/plans` ignores an `estado` field (201, created as `pendiente`) instead of returning 400.
3. Contrast of the dimmed cancelled card (`opacity-75`) is unverified.
4. Chip remove buttons do not include the filter value in their accessible name.
5. Cancel dialog wording pairs "Cancelar plan" with "Cancelar".
6. The result count can lag during the 300 ms search debounce.
7. No explicit test that the search input keeps its text when a request fails.

## Engram observation IDs (project proyecto-2-ihc)

| Artifact | Topic key | Observation |
|---|---|---|
| Explore | `sdd/plan-cancel-and-search-hardening/explore` | 497 |
| State and decisions | `sdd/plan-cancel-and-search-hardening/state` | 498 |
| Proposal | `sdd/plan-cancel-and-search-hardening/proposal` | 499 |
| Spec | `sdd/plan-cancel-and-search-hardening/spec` | 501 |
| Design | `sdd/plan-cancel-and-search-hardening/design` | 502 |
| Tasks | `sdd/plan-cancel-and-search-hardening/tasks` | 503 |
| Apply progress | `sdd/plan-cancel-and-search-hardening/apply-progress` | 505 |
| Verify report | `sdd/plan-cancel-and-search-hardening/verify-report` | 506 |

## Archive integrity

The change folder was moved with `git mv`. A `diff -r` of a pre-move copy against the archived folder printed nothing (identical, 9 files). This report is the only added file.
