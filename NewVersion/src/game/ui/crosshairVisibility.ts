/**
 * When the aiming crosshair is drawn — `ScreenOptions.optionCrosshairOn`.
 *
 * ── The AS3 is about the *system* cursor, and that matters here ────────────
 * `Main.as:450-456` registers the extracted `CustomCursor` bitmap (symbol 166,
 * 32x32, hotspot 10,10) as `"MyCursor"`, and the game swaps the OS pointer for
 * it. Three sites, and they are the whole rule:
 *
 * | site | what it does |
 * |---|---|
 * | `ScreenGame.as:352-355` | on entering a level: `MyCursor` **if the option is on** |
 * | `PartInterface.as:799-802` | on **unpause**: `MyCursor` if the option is on |
 * | `PartInterface.as:428` | on **pause**: back to `MouseCursor.AUTO` |
 * | `ScreenGame.as:739` | on leaving the level: back to `AUTO` |
 *
 * So "off" is not a hidden pointer — it is the ordinary arrow, and the pause
 * panel always gets the ordinary arrow so its buttons can be clicked.
 *
 * This port draws an in-world sprite instead of swapping the OS cursor, which
 * is why the rule needed writing down rather than being one assignment: a
 * sprite has to be told to disappear at each of the sites above.
 *
 * ── Why this is a module and not two `if`s in the scene ───────────────────
 * The bug it exists to prevent (T140) was `setVisible(true)` — a literal where
 * the option should have been, in a scene that cannot be stood up in this
 * suite. Extracting it is the project's own remedy: the rule is driven here
 * against both of its reasons, and the scene is left with one call per site.
 */

/** Everything the decision depends on. */
export interface CrosshairInputs {
  /** `ScreenOptions.optionCrosshairOn`, as stored for this profile. */
  enabled: boolean;
  /** The pause panel is up — `PartInterface.as:428` reverts to the arrow. */
  paused: boolean;
}

/**
 * Whether the crosshair sprite should be on screen this frame.
 *
 * **Position is a separate question.** The scene only moves the sprite while
 * `tankDrive` runs; visibility is decided here so that a paused or
 * option-disabled crosshair cannot be left behind at its last position, which
 * is exactly what a "position it while running" gate alone would do.
 */
export function crosshairVisible({ enabled, paused }: CrosshairInputs): boolean {
  return enabled && !paused;
}
