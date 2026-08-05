/**
 * Hover and click sounds for every DOM control — `InterfaceButtonOver1` and
 * `InterfaceButtonClick`.
 *
 * ── 115 of the AS3's 187 sound sites are these two rules ──────────────────
 * Every `Button*` class in the original pushes `InterfaceButtonOver1` on
 * rollover and `InterfaceButtonClick` on release. 62 and 53 sites respectively,
 * and they are 115 copies of two rules rather than 115 rules.
 *
 * ── Why a delegated listener and not a shared component ───────────────────
 * The AS3's coverage guarantee is structural: a button *is* a `ButtonX`, so it
 * cannot exist without the sound. **This port has no shared button component** —
 * 39 raw `<button>` elements across 9 files — so the equivalent of that
 * guarantee had to be chosen rather than inherited.
 *
 * A `<UiButton>` wrapper would need all 39 migrated and would silently miss the
 * 40th. Delegating from the overlay root inverts that: a control is covered
 * because it is *in the tree*, and a new button added tomorrow is covered
 * without anyone remembering. That is the same reason `PlacementContext`
 * requires its camera size rather than defaulting it — a mechanism that fails
 * loudly beats a convention that has to be followed.
 *
 * The cost is the opposite failure: things that are buttons but should be
 * silent. Those opt out through `data-silent`, and `buttonSounds.test.ts` pins
 * the opt-out list, so the exemptions are a closed set rather than a habit.
 *
 * ── What is deliberately not covered ──────────────────────────────────────
 * In-canvas controls. Phaser draws its own HUD elements and they are not DOM
 * nodes, so nothing here can see them. There are none that take input today;
 * when there are, they need their own call and this comment is the warning.
 */

import { GameEvents } from '../game/events/GameEvents';

/** `Button*.as` rollover — `InterfaceButtonOver1`. */
export const HOVER_SOUND = 'InterfaceButtonOver1';

/** `Button*.as` release — `InterfaceButtonClick`. */
export const CLICK_SOUND = 'InterfaceButtonClick';

/**
 * Marks a control silent. Read as an attribute so the exemption is visible in
 * the markup rather than in a list somewhere else.
 */
export const SILENT_ATTRIBUTE = 'data-silent';

/**
 * Every control the delegated listener treats as a button.
 *
 * **Widened in T55, and it was a real gap.** It matched `button` and
 * `[role="button"]` only, so the six `role="switch"` checkboxes added to
 * Options in T54 made no hover or click sound at all — a screen shipped
 * silent while `buttonSounds.test.ts` reported full coverage, because the test
 * asked "is every component in the subtree" and not "does the selector match
 * every control".
 *
 * That is the instrument's-own-coverage failure again, in the same shape as
 * `setMusic` bypassing the queue history: the guarantee was real and its scope
 * was narrower than it read. `buttonSounds.test.ts` now asserts the selector
 * against every interactive role actually present in `src/ui`, so a seventh
 * role fails rather than joining the blind spot.
 */
export const INTERACTIVE_SELECTOR =
  'button, [role="button"], [role="switch"], [role="tab"], [role="link"], [role="checkbox"], [role="radio"]';

/** Whether this element should make a sound when hovered or clicked. */
export function isAudible(element: Element | null): element is HTMLElement {
  if (!element) return false;
  const control = element.closest(INTERACTIVE_SELECTOR);
  if (!control) return false;
  if (control.hasAttribute(SILENT_ATTRIBUTE)) return false;
  // A disabled control is not interactive, so it is not a missed sound.
  if (control instanceof HTMLButtonElement && control.disabled) return false;
  return true;
}

/**
 * Installs the two listeners on `root`. Returns a teardown.
 *
 * `pointerover` rather than `mouseenter` because it bubbles — the whole point
 * is one listener rather than one per control. `pointerover` refires when the
 * pointer crosses between children of the same button, so the last-hovered
 * control is tracked and a repeat on the same one is ignored; otherwise moving
 * across a button's label would retrigger the sound.
 */
export function installButtonSounds(root: HTMLElement): () => void {
  let lastHovered: Element | null = null;

  const onOver = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const control = target.closest(INTERACTIVE_SELECTOR);
    if (control === lastHovered) return;
    lastHovered = control;
    if (isAudible(target)) GameEvents.emit('ui:sound', { name: HOVER_SOUND });
  };

  const onOut = (event: Event): void => {
    const target = event.target;
    if (target instanceof Element && target.closest(INTERACTIVE_SELECTOR) === lastHovered) {
      lastHovered = null;
    }
  };

  // `click` rather than `pointerdown`: the AS3 plays on *release*, and click is
  // also what fires for a keyboard activation, so the sound follows the action
  // rather than the mouse.
  const onClick = (event: Event): void => {
    if (event.target instanceof Element && isAudible(event.target)) {
      GameEvents.emit('ui:sound', { name: CLICK_SOUND });
    }
  };

  root.addEventListener('pointerover', onOver);
  root.addEventListener('pointerout', onOut);
  root.addEventListener('click', onClick);

  return () => {
    root.removeEventListener('pointerover', onOver);
    root.removeEventListener('pointerout', onOut);
    root.removeEventListener('click', onClick);
  };
}
