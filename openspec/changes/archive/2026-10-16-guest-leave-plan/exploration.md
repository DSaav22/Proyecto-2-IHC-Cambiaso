# Exploration: guest-leave-plan (H3 / Sub-issue #18)

## Verified facts

- `PlanMember` is created only in `joinByCode` (`apps/backend/src/services/plans.service.ts`). Schema has `@@unique([planId, userId])` and cascade FKs: no migration needed.
- `PlansStore` has 8 methods (list, summary, create, joinByCode, update, confirm, cancel, delete). Errors (`PlanNotFoundError`, `CreatorCannotJoinError`, `AlreadyJoinedError`, `ForbiddenPlanActionError`) live in `plans.service.ts` and are re-exported from `routes/plans.ts`; routes map `ForbiddenPlanActionError` to 403 and null/false to 404 `{ message: "Plan no encontrado" }`.
- `PlanCard.tsx`: the `DropdownMenu` is rendered only when `isOwner`; guests get a `role="note"` read-only block. `OpenDialog` is `"confirm" | "cancel" | "delete" | null`; a single `run(action)` shares `pending`/`actionError`.
- `ConfirmDialog` props: open, onOpenChange, title, description, confirmLabel, pendingLabel, pending, error, destructive, onConfirm.
- `api/client.ts` already has a `post<T>` helper; `usePlans.deletePlan` is the template for `leavePlan`.
- `DESIGN.md`: destructive actions live in the ⋮ menu; `ConfirmDialog` names the resource in «», shows inline errors, touch targets `min-h-11`.

## Route fork

| Option | Pros | Cons |
| --- | --- | --- |
| `POST /api/plans/:id/leave` (chosen) | Matches `/:id/confirm` and `/:id/cancel`; reuses `post()`; not confusable with creator `DELETE /:id` | Not strictly RESTful |
| `DELETE /api/plans/:id/membership` | RESTful | New router convention; easy to confuse with creator delete |

## Corrections to the earlier draft (verified against code)

1. `PlansStore` has three implementers that must gain `leave`: `createPrismaPlansStore`, `createMemoryStore` in `routes/plans.test.ts`, and the `plansStore` literal in `routes/auth.recover.test.ts:20`.
2. `plans.service.test.ts` mocks prisma as `{ plan: { findMany } }` only; service-level `leave` tests must extend the mock with `plan.findUnique` and `planMember.deleteMany`.
3. Atomic leave: `plan.findUnique({ select: { userId } })` -> creator check (403) -> `planMember.deleteMany({ where: { planId, userId } })`; `count === 0` means 404. No find/delete race, non-members indistinguishable from unknown plans.
4. `PlanCard.test.tsx:350` "does not render actions menu for a guest" asserts the opposite of the new behavior and must be rewritten; check `PlanList.test.tsx` and `MyPlansPage.test.tsx` for similar assertions at apply time.
5. `docs/evidencias/` has no H3 images: `H3-antes.png` must be captured from the pre-fix UI before the UI change lands. The H3 section of `docs/evaluacion-heuristica.md` already references both images.
6. Pre-existing spec drift (out of scope): the main spec cites "Solo el creador puede modificar este plan" while code messages are per-action. "Strict read-only authorization for guests" lists only edit/confirm/cancel/delete, so leave is additive and needs no delta there.

## Frontend notes

- Add `"leave"` to `OpenDialog`; render the menu for both roles. Guest menu has only «Abandonar plan» (destructive); the read-only note stays.
- Dialog: title «¿Abandonar este plan?», description names «{titulo}», says it disappears from the guest's list and can be rejoined with the share code; confirm «Abandonar», pending «Abandonando…», `destructive`.
- A guest may leave in any plan state.

## Risks

- Missing implementers/mocks break typecheck or tests (1, 2).
- Existing guest-menu test conflicts with the feature (4).
- `H3-antes.png` is easy to miss once the UI changes (5).
- Single PR looks within the 400-line budget excluding docs and images.
