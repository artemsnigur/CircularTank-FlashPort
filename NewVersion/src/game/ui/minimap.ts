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

/** `:657` `beginFill(6710886)` — the ground. */
const MINIMAP_GROUND = 0x666666;
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

/**
 * ── Divergence: the dots are coloured by type, and the AS3's were not ─────
 *
 * `:675` is `beginFill(16711680)` for **every** enemy, boss or not. This
 * palette is authored, not ported — the original has no per-type colour to
 * port, and neither does this game: enemies are drawn from SVG shapes and are
 * never tinted, so there is no "the enemy's colour" to read off anything.
 *
 * That makes the grouping the only defensible part, so it is by **behaviour
 * family** rather than one hue per type. Twenty arbitrary colours on a 4px dot
 * is twenty colours nobody can tell apart; five families is a distinction a
 * player can actually act on at a glance.
 *
 * `MINIMAP_ENEMY` is kept as the baseline red and as the fallback, so a type
 * added to `EnemyTypeName` without being classified here still draws — in the
 * AS3's own colour — rather than disappearing.
 */
export const MINIMAP_ENEMY_FAMILIES = Object.freeze({
  /** Bulk: what a level is mostly made of. The AS3 red. */
  bulk: 0xff0000,
  /** Speed and unpredictability — the family the player must react to first. */
  fast: 0xc45bff,
  /** Evasive: phases, blinks or shrinks out of a shot. */
  evasive: 0x37d5ff,
  /** Ranged or explosive: dangerous at a distance rather than on contact. */
  ranged: 0xffa32e,
  /** Support: makes the rest of the arena harder rather than hurting you. */
  support: 0x4ade6a,
});

/** Which family each type belongs to. Every `EnemyTypeName` appears once. */
export const MINIMAP_ENEMY_FAMILY: Readonly<Record<string, keyof typeof MINIMAP_ENEMY_FAMILIES>> =
  Object.freeze({
    Basic: 'bulk',
    Strong: 'bulk',
    Soldier: 'bulk',
    Tiny: 'bulk',

    Fast: 'fast',
    Accelerating: 'fast',
    Crazy: 'fast',
    Random: 'fast',
    Temperamental: 'fast',

    Ghost: 'evasive',
    ScaredGhost: 'evasive',
    Teleporting: 'evasive',
    Ninja: 'evasive',
    Shrinking: 'evasive',

    Shooting: 'ranged',
    Exploding: 'ranged',
    Trap: 'ranged',
    GrapplingHook: 'ranged',

    Medic: 'support',
    DamageAddict: 'support',
  });

/**
 * The colour for one enemy's dot.
 *
 * A boss keeps the AS3 red whatever its type: it is already distinguished by
 * being twice the size, and a boss is the one marker that must never be
 * mistaken for something else on a glance.
 */
export function enemyDotColour(type: string | undefined, isBoss: boolean): number {
  if (isBoss) return MINIMAP_ENEMY;
  const family = type ? MINIMAP_ENEMY_FAMILY[type] : undefined;
  return family ? MINIMAP_ENEMY_FAMILIES[family] : MINIMAP_ENEMY;
}

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
 * Where the panel's top-left corner goes, in **world** units.
 *
 * ── Why world units and not `setScrollFactor(0)` ──────────────────────────
 * The first attempt (T146) placed the panel with `setScrollFactor(0)` at a
 * design-unit coordinate, and it rendered in the middle of the play area at
 * double size. A scroll-factor-zero object is positioned in *camera-pixel*
 * space, and the camera's zoom is then applied about its centre — so at zoom 2
 * a point at 552 lands at `(552 - 640) * 2 + 640 = 464`. Measured, not
 * reasoned about: the debug projection reported `zoom: 2`, `camera.width:
 * 1280`, and a screenshot put the box exactly there.
 *
 * Anchoring to the camera's live `worldView` needs no inverse transform. The
 * panel is 80 world units, which is 80 design units, which is the same eighth
 * of the view the AS3's 80px is of its 640-wide stage — and it stays glued to
 * the corner because the scene repositions it every frame, which it already
 * does to redraw the dots.
 *
 * `insetRight`/`insetBottom` are the safe-area insets **already converted to
 * world units** by the caller. They are not `safeRect` itself: that is in
 * design units, and on a zoomed camera the two scales differ.
 */
export function minimapAnchor(
  view: Rect,
  inset: { right: number; bottom: number },
  margin: number,
): { x: number; y: number } {
  return {
    x: view.x + view.width - MINIMAP_SIZE - margin - Math.max(0, inset.right),
    y: view.y + view.height - MINIMAP_SIZE - margin - Math.max(0, inset.bottom),
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
  enemies: readonly (MinimapSubject & { boss: boolean; type?: string })[];
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
      alpha: 1,
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
      colour: enemyDotColour(enemy.type, enemy.boss),
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
