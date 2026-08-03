/**
 * Border bounce for the two food rounds — `PartGameArea.as:1903-2010`.
 *
 * Gummy Bear and Crazy Cheese are the only projectiles that bounce, and they
 * bounce off **the camera's edges, not the room's walls**. That is deliberate in
 * the original and is the whole reason this module exists separately from
 * `bounceGrenade`, which really is a room-wall rule.
 *
 * ── Why camera edges, and why that is not a bug ───────────────────────────
 * `:1906` tests against `0 - cameraPosX + radius` and
 * `roomWidth - cameraPosX - (roomWidth - cameraWidth) - radius`. The `roomWidth`
 * terms cancel exactly, leaving `cameraWidth - cameraPosX - radius`, and
 * `cameraPosX` is a negative container offset (`:707`), so the pair is simply
 * the visible window in world coordinates, inset by the radius.
 *
 * This is the `CLAUDE.md` "constant that became a variable" case with the sign
 * reversed: the AS3's camera was a fixed 640x400, so camera-edge and
 * room-wall bounce were indistinguishable on small rooms and the camera rule
 * only showed itself on scrolling levels. It is a scroll-follow behaviour — the
 * bear stays in play where the player is looking — not an accident of the Flash
 * stage size. So the port takes the **live** camera rect, per the project rule,
 * and the result is that bounce follows the player on large rooms exactly as it
 * did in Flash.
 *
 * ── The source's axis names are inverted ──────────────────────────────────
 * `:1912-1913` declares `hitTopBottom` and `hitLeftRight`, then sets
 * `hitTopBottom` when the **x** bound is crossed and `hitLeftRight` when the
 * **y** bound is crossed. The names are swapped relative to their behaviour.
 * The reflections underneath are correct, so this is a naming slip and not a
 * logic error — but a port that copied the labels would read as reflecting the
 * wrong way round. Named for behaviour here, with the source spelling recorded
 * so nobody "corrects" this back.
 */

/** The visible rect in world coordinates — `-cameraPosX`, `cameraWidth`, etc. */
export interface CameraBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Just enough of a bullet to bounce it. */
export interface BounceCandidate {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  radius: number;
  /** Heading in degrees, as the AS3 keeps `rotation`. */
  rotation: number;
}

/**
 * Which edges a bounce touched.
 *
 * `'side'` is a left/right edge (the AS3's mislabelled `hitTopBottom`),
 * `'endCap'` a top/bottom one (its `hitLeftRight`), `'corner'` both at once.
 * The distinction is not cosmetic: each weapon does something different on a
 * corner than on a single edge.
 */
export type BounceEdge = 'side' | 'endCap' | 'corner';

export interface BounceResult {
  state: BounceCandidate;
  edge: BounceEdge;
}

/**
 * Reflects a bullet off the camera rect, or returns null if it is inside.
 *
 * Position is clamped to the edge as well as the velocity flipped — `:1915`
 * writes `theBullet.x` before touching `xVel`. Without the clamp a fast round
 * can end a frame outside the rect, bounce, and still be outside on the next
 * frame, flipping every frame and crawling along the border.
 */
export function bounceAgainstCamera(
  bullet: BounceCandidate,
  camera: CameraBounds,
): BounceResult | null {
  const minX = camera.left + bullet.radius;
  const maxX = camera.left + camera.width - bullet.radius;
  const minY = camera.top + bullet.radius;
  const maxY = camera.top + camera.height - bullet.radius;

  const outX = bullet.x < minX || bullet.x > maxX;
  const outY = bullet.y < minY || bullet.y > maxY;
  if (!outX && !outY) return null;

  let { x, y, xVel, yVel } = bullet;

  if (bullet.x < minX) {
    x = minX;
    xVel = Math.abs(xVel);
  } else if (bullet.x > maxX) {
    x = maxX;
    xVel = -Math.abs(xVel);
  }

  if (bullet.y < minY) {
    y = minY;
    yVel = Math.abs(yVel);
  } else if (bullet.y > maxY) {
    y = maxY;
    yVel = -Math.abs(yVel);
  }

  const edge: BounceEdge = outX && outY ? 'corner' : outX ? 'side' : 'endCap';

  return {
    state: { ...bullet, x, y, xVel, yVel, rotation: reflect(bullet.rotation, edge) },
    edge,
  };
}

/**
 * The heading after a bounce — `:1940`, `:1968`, `:1989`.
 *
 * Three cases, and the first is spelled as two branches in the source because
 * it preserves the sign:
 *
 *   side    `180 - r` for r >= 0, `-180 - r` for r < 0   (mirror about vertical)
 *   endCap  `-r`                                          (mirror about horizontal)
 *   corner  `r + 180`                                     (straight back)
 *
 * The two `side` branches are one rule — reflect and keep the result in
 * (-360, 360) — but they are kept apart to match the source, because collapsing
 * them to a modulo changes which representative angle comes out and the
 * rotation is drawn.
 */
export function reflect(rotation: number, edge: BounceEdge): number {
  if (edge === 'corner') return rotation + 180;
  if (edge === 'endCap') return -rotation;
  return rotation < 0 ? -180 - rotation : 180 - rotation;
}
