/**
 * What ends the IDLE achievement's run — `PartGameArea.as:2826-2828`.
 *
 * The AS3 is one line:
 *
 *     if(Main.mouse || Main.space || Main.up || Main.down || Main.right || Main.left)
 *
 * `Main.mouse` is the mouse **button**, not the pointer's position. So aiming
 * has never voided IDLE, in the original or in this port — the turret follows
 * the cursor and neither the AS3 nor the port looks at where the cursor is.
 *
 * ── Why this is a function rather than the `if` it used to be ─────────────
 * It was written inline in `GameplayScene.update`, where no test can reach it,
 * and "does aiming break IDLE?" is exactly the question a reader then has to
 * answer by re-reading a boolean chain inside a scene that cannot be
 * instantiated. It was answered by driving the game once; a function is what
 * stops it needing to be answered that way again.
 *
 * The important half is the **negative** — pointer movement is not activity —
 * and a negative asserted alone is worth nothing, so `idleActivity.test.ts`
 * drives it beside every input that *is*.
 */

/** Everything the idle rule looks at. Aim direction is deliberately absent. */
export interface IdleInput {
  /** WASD or the arrow keys — `Main.up|down|left|right`. */
  moving: boolean;
  /** The primary fire key — `Main.space`. */
  firing: boolean;
  /** A mouse or touch **button** held — `Main.mouse`. */
  pointerDown: boolean;
}

/**
 * Whether this frame's input ends an idle run.
 *
 * There is no aim parameter, and that is the mechanism: a future edit cannot
 * make aiming count without first changing this signature, which is a visible
 * decision rather than an extra clause slipped into a boolean chain.
 */
export function endsIdleRun(input: IdleInput): boolean {
  return input.moving || input.firing || input.pointerDown;
}
