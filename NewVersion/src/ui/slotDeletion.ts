/**
 * Deleting a save slot, and the confirmation in front of it.
 *
 * ── Why this is a module and not two `useState`s ──────────────────────────
 * There are **two** delete controls, on two screens: the ✕ on a main-menu slot
 * box (`MainMenuScreen.tsx`) and the ✕ on a picker row (`SaveSlotScreen.tsx`).
 * The picker grew a confirmation when it was written; the main menu did not, so
 * the most visible of the two wiped a save on a single click. That is the "one
 * rule, two copies" shape `docs/AUDIT-2026-07.md` collects, and adding a second
 * copy of the confirmation would have been the same mistake once more.
 *
 * So the rule lives here, once: **`ui:delete-slot` is emitted in exactly one
 * place in `src/ui/`, and that place is `confirm()`.** A screen can only ask —
 * it has no way to delete without going through the question first.
 *
 * The guarantee is worth what enforces it, so `slotDeletion.test.ts` greps
 * `src/ui/` for the event name and fails if any file other than this one names
 * it. That check proves no *other* file spells the event; the component tests
 * beside it are what prove each screen actually routes through here.
 */
import { useCallback, useEffect, useState } from 'react';

import { GameEvents } from '../game/events/GameEvents';

/**
 * One screen's pending "Delete slot?" question.
 *
 * Declared as function *properties* rather than methods on purpose: a screen
 * hands these straight to `onClick`, and a method type detached from its object
 * is what `@typescript-eslint/unbound-method` exists to catch. As properties
 * they carry no `this` to lose, which is also the truth — they are closures.
 */
export interface SlotDeletion {
  /** The slot awaiting an answer, or null when nothing is being asked. */
  readonly pending: number | null;
  /** True for the one row that should render the question in place of itself. */
  readonly isPending: (slot: number) => boolean;
  /** Raise the question for a slot. Replaces any other row's question. */
  readonly ask: (slot: number) => void;
  /** Withdraw it, deleting nothing. */
  readonly cancel: () => void;
  /** Answer yes: emit the delete for the pending slot, then clear it. */
  readonly confirm: () => void;
}

/**
 * The confirmation state for a screen that can delete slots.
 *
 * Held per *screen* rather than per row so two rows can never be mid-question
 * at once — the AS3 has the same property for free, because `makePage2`
 * (`ButtonGameSave.as:373`) flips one button into its second page and the
 * others are untouched objects.
 */
export function useSlotDeletion(visible: boolean = true): SlotDeletion {
  const [pending, setPending] = useState<number | null>(null);

  /*
   * A question does not survive leaving the screen.
   *
   * Neither screen unmounts when it goes away — both compute their hooks and
   * *then* `return null`, which they must, because hook order cannot depend on
   * a condition. So the state outlives the disappearance: ask on the main
   * menu, open the picker, come back, and "Delete slot 1?" is still sitting
   * there with no memory of having been asked. Worse than untidy — the player
   * is now one click from a delete they set up before doing something else.
   *
   * `visible` is a parameter rather than a store read so the rule can be
   * driven from a test without standing up a scene.
   */
  useEffect(() => {
    if (!visible) setPending(null);
  }, [visible]);

  const confirm = useCallback(() => {
    // Guarded rather than assumed: a click arriving after the row unmounted
    // would otherwise emit a delete for `null`, and `deleteSlot` takes a
    // number — that is a wipe of whatever `null` coerces to, not a no-op.
    if (pending === null) return;
    GameEvents.emit('ui:delete-slot', { slot: pending });
    setPending(null);
  }, [pending]);

  /*
   * The emit sits here and **not** inside a `setPending` updater, which is
   * where it was first written. React calls an updater twice under StrictMode
   * to surface exactly this — a side effect in a place that is contractually
   * pure — and this app runs StrictMode, so that version deleted the slot
   * twice on one click. `deleteSlot` happens to be idempotent, so it would
   * have looked correct and left a doubled event on the bus for anything
   * later to trip over.
   */

  return {
    pending,
    isPending: (slot) => pending === slot,
    ask: setPending,
    cancel: () => setPending(null),
    confirm,
  };
}
