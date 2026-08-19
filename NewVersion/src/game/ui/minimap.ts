/**
 * The minimap — `PartInterface.drawMinimap` (`:652-694`).
 *
 * An 80x80 panel showing the whole room at once: a grey ground, a translucent
 * rectangle for what the camera can currently see, a red dot per enemy (twice
 * the size for a boss), a black dot for the flag, and a white dot for the tank.
 *
 * ── Everything is one scale factor ────────────────────────────────────────
 * `80 / roomWidth` horizontally and `80 / roomHeight` vertically, applied
 * separately — so a wide room is squashed rather than letterboxed, and the
 * panel is always square whatever the room's aspect. That is the original's
 * choice and it is load-bearing: the viewport rectangle only reads as "this
 * much of the room" because it is scaled the same way the dots are.
 *
 * **Every value is rounded, and rounded at the end.** `Math.round` sits around
 * each finished coordinate in the AS3 (`:669`, `:678`, `:682`), not around the
 * scale factor. Rounding earlier would drift the dots off the rectangle by a
 * pixel or two at large room sizes, which on an 80px panel is a lot.
 *
 * ── The camera size is a live value here, and that changes the rect ───────
 * `PartGameArea.cameraWidth`/`cameraHeight` are the fixed 640x400 Flash stage.
 * This port's camera is whatever the window is, so the viewport rectangle is
 * computed from the **live** camera — see `CLAUDE.md`, "an AS3 constant that
 * became a runtime variable". Transcribing 640x400 would draw a rectangle
 * describing a view nobody has.
 *
 * The consequence is that the rect can exceed the panel: a 640x400 room viewed
 * on a tall phone has a logical camera height of ~1385, so the rect wants to be
 * 277px tall in an 80px box. The AS3 masks the panel (`minimap.mask =
 * minimapMask`, `:286`) and this clamps to the same box, which is the same
 * picture — see `clampToPanel`.
 */

/** `:658` — the panel is 80x80 and the divisor in every term below. */
export const MINIMAP_SIZE = 80;

/**
 * The ground.
 *
 * ── Divergence: `--hud-plate`, not the AS3's grey ─────────────────────────
 * `:657` is `beginFill(6710886)` — an opaque mid-grey, chosen when the HUD was
 * a band below the camera and the panel sat on solid chrome. Here it floats
 * over a live arena, and an opaque grey block reads as a hole in the world.
 *
 * This is the same colour and alpha as `--hud-plate` in `global.css`, which is
 * what every DOM readout paints with, so the panel belongs to the same set of
 * instruments as the money and health plates rather than looking like a
 * separate artefact. The two are kept in step by a test that reads the
 * stylesheet — a value copied by hand into two files drifts.
 */
const MINIMAP_GROUND = 0x26282c;
/** `--hud-plate` is `rgb(38 40 44 / 72%)`; this is the 72%. */
export const MINIMAP_GROUND_ALPHA = 0.72;
/** `:668` `beginFill(16777215, 0.2)` — what the camera can see. */
const MINIMAP_VIEWPORT = 0xffffff;
export const MINIMAP_VIEWPORT_ALPHA = 0.2;
/** `:675` `beginFill(16711680)` — every enemy, boss or not. */
export const MINIMAP_ENEMY = 0xff0000;
/** `:687` `beginFill(0)` — the flag, on Flag levels only. */
const MINIMAP_FLAG = 0x000000;
/** `:692` `beginFill(16777215)` — the tank, drawn last so it is never hidden. */
export const MINIMAP_TANK = 0xffffff;

/** `:678` / `:682` — a dot is 4px, a boss's is 8px, and both are centred. */
export const MINIMAP_DOT = 4;
export const MINIMAP_BOSS_DOT = 8;


interface Room {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A room point in panel coordinates, unrounded.
 *
 * Guards a zero room size rather than returning `Infinity`: a malformed level
 * would otherwise paint the whole panel with one dot, which looks like a
 * rendering bug rather than a data one.
 */
function project(value: number, extent: number): number {
  if (extent <= 0) return 0;
  return value * (MINIMAP_SIZE / extent);
}

/**
 * The translucent rectangle — `:669`.
 *
 * `Math.abs` on the camera position is the AS3's: its `cameraPosX` is the
 * *container* offset, so it is negative as the view moves right. Phaser's
 * `worldView.x` is already a positive world coordinate, so callers pass that
 * and the `abs` is a no-op for them — kept because a negative value arriving
 * here should still land in the same place, not off the left edge.
 */
export function viewportRect(camera: Rect, room: Room): Rect {
  return {
    x: Math.round(project(Math.abs(camera.x), room.width)),
    y: Math.round(project(Math.abs(camera.y), room.height)),
    width: Math.round(project(camera.width, room.width)),
    height: Math.round(project(camera.height, room.height)),
  };
}

/**
 * The rectangle as the 80x80 mask lets it be seen — `:286`.
 *
 * Separate from `viewportRect` so the faithful figure stays inspectable: the
 * AS3 really does compute a rect larger than the panel on a room smaller than
 * the camera, and only the mask hides it.
 */
export function clampToPanel(rect: Rect): Rect {
  const x = Math.max(0, Math.min(rect.x, MINIMAP_SIZE));
  const y = Math.max(0, Math.min(rect.y, MINIMAP_SIZE));
  return {
    x,
    y,
    width: Math.max(0, Math.min(rect.width, MINIMAP_SIZE - x)),
    height: Math.max(0, Math.min(rect.height, MINIMAP_SIZE - y)),
  };
}

/**
 * One marker — `:678` for an ordinary enemy, `:682` for a boss, `:688` for the
 * flag and `:693` for the tank.
 *
 * All four are the same expression with a different size, and the offset is
 * always half of it, so the dot is centred on the thing it marks.
 */
export function marker(x: number, y: number, room: Room, size: number = MINIMAP_DOT): Rect {
  const half = size / 2;
  /*
   * ── Divergence: not rounded, where the AS3 rounds ──────────────────────
   *
   * `:678`/`:682` wrap each finished coordinate in `Math.round`. That was kept
   * faithfully and it is what made the dots crawl: an 80px panel over a
   * 2000-unit room is 25 world units per pixel, so a dot holds still for 25
   * units of real movement and then jumps a whole pixel. At Flash's 30fps
   * against a 60fps canvas the stutter is twice as visible here as it was
   * there.
   *
   * Sub-pixel positions render fine — Phaser antialiases the arc — and the
   * rounding bought the original nothing this port needs. The *rect* fills
   * (ground, viewport) still round, because a half-pixel rectangle edge is a
   * blurred line rather than a smooth one.
   */
  return {
    x: project(x, room.width) - half,
    y: project(y, room.height) - half,
    width: size,
    height: size,
  };
}

/** `:676` — a boss's dot is the 8px one; everything else takes 4px. */
export function dotSize(isBoss: boolean): number {
  return isBoss ? MINIMAP_BOSS_DOT : MINIMAP_DOT;
}

/**
 * Where the panel goes, in **camera** space — `setScrollFactor(0)` coordinates.
 *
 * ── Why it left world space (T199) ────────────────────────────────────────
 * It was anchored to `camera.worldView` and repositioned every frame, and it
 * twitched. Two causes, compounding, and neither is in this file:
 *
 * 1. `drawMinimap` runs in `Scene.update`, but `Camera.preRender` — which runs
 *    the follow lerp, applies `roundPixels` and recomputes `worldView` — is
 *    called from `CameraManager.render`, **after** update. So the panel was
 *    always positioned from the *previous* frame's camera.
 * 2. `startFollow(player, true, ...)` passes `roundPixels`, and
 *    `Camera.js:558` **floors** the scroll. With a 0.12 lerp the per-frame
 *    scroll delta fluctuates between whole integers.
 *
 * Together the panel's on-screen offset each frame was
 * `(scroll[n-1] - scroll[n]) * zoom` — whole-pixel jumps, in a pattern that
 * changes with the tank's speed. Un-rounding the *dots* (T198) could not touch
 * it, because what was moving was the panel underneath them.
 *
 * Screen furniture belongs in screen space, so the panel no longer reads the
 * scroll at all and the frame ordering stops mattering.
 *
 * ── The transform, which is why the first attempt failed ─────────────────
 * T146 tried `setScrollFactor(0)` at a design-unit coordinate and the panel
 * rendered in the middle of the play area at double size. A scroll-factor-zero
 * object is placed in camera-pixel space and the zoom is then applied **about
 * the camera's centre**: a point at `x` renders at
 * `(x - width / 2) * zoom + width / 2`. Measured at the time, not reasoned
 * about — at zoom 2 with `camera.width` 1280, 552 landed at 464.
 *
 * So this inverts that: it computes where the panel should *render* and then
 * solves for the `x` that renders there. `margin` and `inset` stay in world
 * units, as they were, and are scaled to camera pixels here — so the panel
 * keeps the same size and the same gap it had, at every zoom.
 */
export function minimapScreenAnchor(
  camera: { width: number; height: number; zoom: number },
  inset: { right: number; bottom: number },
  margin: number,
): { x: number; y: number } {
  const zoom = camera.zoom > 0 ? camera.zoom : 1;

  // What the panel occupies once the camera has scaled it.
  const drawn = MINIMAP_SIZE * zoom;
  const gapRight = (margin + Math.max(0, inset.right)) * zoom;
  const gapBottom = (margin + Math.max(0, inset.bottom)) * zoom;

  // Where it should land on screen.
  const renderX = camera.width - drawn - gapRight;
  const renderY = camera.height - drawn - gapBottom;

  // And the coordinate that renders there, once zoom-about-centre is undone.
  return {
    x: (renderX - camera.width / 2) / zoom + camera.width / 2,
    y: (renderY - camera.height / 2) / zoom + camera.height / 2,
  };
}

/** One fill. Rectangles are clipped to the panel; circles are culled by it. */
export interface MinimapFill {
  /** What it represents, so a test can assert order without matching colours. */
  kind: 'ground' | 'viewport' | 'enemy' | 'boss' | 'flag' | 'tank';
  /**
   * How to paint it.
   *
   * The AS3 draws every one of these with `drawRect`, so the dots were
   * squares. A round dot is a divergence and is deliberate: at 4px a square
   * reads as a pixel artefact rather than a marker, and the tank, the flag and
   * the enemies are all circular objects in the arena.
   *
   * `rect` stays the bounding box for both, so culling and the panel's extent
   * are one calculation rather than two. A circle is drawn from its centre.
   */
  shape: 'rect' | 'circle';
  colour: number;
  alpha: number;
  rect: Rect;
}

interface MinimapSubject {
  x: number;
  y: number;
}

/** True when any part of `rect` is inside the panel. */
function touchesPanel(rect: Rect): boolean {
  return (
    rect.x + rect.width > 0 &&
    rect.y + rect.height > 0 &&
    rect.x < MINIMAP_SIZE &&
    rect.y < MINIMAP_SIZE
  );
}

export interface MinimapInput {
  camera: Rect;
  room: Room;
  enemies: readonly (MinimapSubject & { boss: boolean })[];
  /** Null on every mode but Flag, and once the last flag is taken. */
  flag: MinimapSubject | null;
  tank: MinimapSubject;
}

/**
 * The whole panel as an ordered list of fills — `:655-694` in its own order.
 *
 * **Order is the rule, not an implementation detail.** Ground, viewport,
 * enemies, flag, tank: the tank is drawn last so an enemy standing on it can
 * never hide it, and the translucent viewport goes under the dots so it tints
 * the ground rather than washing them out. Reordering these is a behaviour
 * change that looks like tidying, which is why the plan is a value a test can
 * inspect rather than a sequence of calls into a `Graphics`.
 *
 * Every rect is already clipped by `clampToPanel`, which is the AS3's mask
 * (`:286`) — including the dots, which are centred and so overhang the panel
 * at the room's edges. Fills that clip away to nothing are dropped.
 */
export function minimapPlan(input: MinimapInput): MinimapFill[] {
  const { camera, room, enemies, flag, tank } = input;
  const fills: MinimapFill[] = [
    {
      kind: 'ground',
      shape: 'rect',
      colour: MINIMAP_GROUND,
      alpha: MINIMAP_GROUND_ALPHA,
      rect: { x: 0, y: 0, width: MINIMAP_SIZE, height: MINIMAP_SIZE },
    },
    {
      kind: 'viewport',
      shape: 'rect',
      colour: MINIMAP_VIEWPORT,
      alpha: MINIMAP_VIEWPORT_ALPHA,
      rect: viewportRect(camera, room),
    },
  ];

  const dots: MinimapFill[] = [];
  for (const enemy of enemies) {
    dots.push({
      kind: enemy.boss ? 'boss' : 'enemy',
      shape: 'circle',
      // `:675` — one red for every enemy, boss or not. A per-family palette
      // was tried in T198 and reverted in T199: the AS3's uniform red is what
      // the game wants, and it is what the original does.
      colour: MINIMAP_ENEMY,
      alpha: 1,
      rect: marker(enemy.x, enemy.y, room, dotSize(enemy.boss)),
    });
  }

  if (flag) {
    dots.push({
      kind: 'flag',
      shape: 'circle',
      colour: MINIMAP_FLAG,
      alpha: 1,
      rect: marker(flag.x, flag.y, room),
    });
  }

  dots.push({
    kind: 'tank',
    shape: 'circle',
    colour: MINIMAP_TANK,
    alpha: 1,
    rect: marker(tank.x, tank.y, room),
  });

  /*
   * Rectangles are clipped; circles are culled and drawn whole.
   *
   * Clipping a circle's bounding box would move its centre — a dot at the
   * room's edge would slide inward instead of being cut off, which is a lie
   * about where the enemy is. The AS3 clipped nothing itself either: it hung a
   * mask on the panel (`minimap.mask = minimapMask`, `:286`) and let the shapes
   * overhang underneath it. The scene does the same with a geometry mask, so
   * the overhang is cut at the panel edge exactly as it was.
   */
  const clipped = fills
    .map((fill) => ({ ...fill, rect: clampToPanel(fill.rect) }))
    .filter((fill) => fill.rect.width > 0 && fill.rect.height > 0);

  return [...clipped, ...dots.filter((fill) => touchesPanel(fill.rect))];
}
