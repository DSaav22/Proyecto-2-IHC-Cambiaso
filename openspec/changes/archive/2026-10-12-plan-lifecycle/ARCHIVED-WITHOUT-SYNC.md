# Archived without sync

Archived on 2026-10-12 without syncing its deltas to the main specs. The change is superseded by `plan-cancel-and-search-hardening` (PRs #9, #10, #11); syncing it would regress `openspec/specs/plans/spec.md`.

Contradictions found:

- The delta says cancelling a plan that is not `confirmado` is rejected. The main spec, the code, and the archived `cancel-draft-plans` change allow cancelling a draft (now `pendiente`) plan as well as a confirmed one (PLN-14).
- The delta still uses the state name `borrador`, which was renamed to `pendiente`; `estado=borrador` is now rejected with `400` (PLN-01).

Nothing was deleted; the artifacts are kept for history only.
