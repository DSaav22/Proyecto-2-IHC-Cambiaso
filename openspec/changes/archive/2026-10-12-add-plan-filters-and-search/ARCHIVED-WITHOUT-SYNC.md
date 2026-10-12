# Archived without sync

Archived on 2026-10-12 without syncing its deltas to the main specs. The change is superseded by `plan-cancel-and-search-hardening` (PRs #9, #10, #11); syncing it would regress `openspec/specs/plans/spec.md`.

Contradictions found:

- The delta specifies client-side filtering of the full list. The main spec requires server-side filtering from the database (PLN-02 to PLN-10).
- The delta uses the old copy "Borrador", "Quitar filtros", and "No existen planes con estas características". The current copy is "Pendiente", "Limpiar filtros", and "No hay planes que coincidan con los filtros" (PLN-09, PLN-10), after the `borrador` to `pendiente` rename.

Nothing was deleted; the artifacts are kept for history only.
