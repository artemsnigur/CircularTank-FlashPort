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
export const MINIMAP_GROUND = 0x666666;
/** `:668` `beginFill(16777215, 0.2)` — what the camera can see. */
export const MINIMAP_VIEWPORT = 0xffffff;
export const MINIMAP_VIEWPORT_ALPHA = 0.2;
/** `:675` `beginFill(16711680)` — every enemy, boss or not. */
export const MINIMAP_ENEMY = 0xff0000;
/** `:687` `beginFill(0)` — the flag, on Flag levels only. */
export const MINIMAP_FLAG = 0x000000;
/** `:692` `beginFill(16777215)` — the tank, drawn last so it is never hidden. */
export const MINIMAP_TANK = 0xffffff;

/** `:678` / `:682` — a dot is 4px, a boss's is 8px, and both are centred. */
export const MINIMAP_DOT = 4;
export const MINIMAP_BOSS_DOT = 8;

export interface Room {
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
  return {
    x: Math.round(project(x, room.width) - half),
    y: Math.round(project(y, room.height) - half),
    width: size,
    height: size,
  };
}

/** `:676` — a boss's dot is the 8px one; everything else takes 4px. */
export function dotSize(isBoss: boolean): number {
  return isBoss ? MINIMAP_BOSS_DOT : MINIMAP_DOT;
}

/** One filled rectangle, already clipped to the panel. */
export interface MinimapFill {
  /** What it represents, so a test can assert order without matching colours. */
  kind: 'ground' | 'viewport' | 'enemy' | 'boss' | 'flag' | 'tank';
  colour: number;
  alpha: number;
  rect: Rect;
}

export interface MinimapSubject {
  x: number;
  y: number;
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
      colour: MINIMAP_GROUND,
      alpha: 1,
      rect: { x: 0, y: 0, width: MINIMAP_SIZE, height: MINIMAP_SIZE },
    },
    {
      kind: 'viewport',
      colour: MINIMAP_VIEWPORT,
      alpha: MINIMAP_VIEWPORT_ALPHA,
      rect: viewportRect(camera, room),
    },
  ];

  for (const enemy of enemies) {
    fills.push({
      kind: enemy.boss ? 'boss' : 'enemy',
      colour: MINIMAP_ENEMY,
      alpha: 1,
      rect: marker(enemy.x, enemy.y, room, dotSize(enemy.boss)),
    });
  }

  if (flag) {
    fills.push({ kind: 'flag', colour: MINIMAP_FLAG, alpha: 1, rect: marker(flag.x, flag.y, room) });
  }

  fills.push({ kind: 'tank', colour: MINIMAP_TANK, alpha: 1, rect: marker(tank.x, tank.y, room) });

  return fills
    .map((fill) => ({ ...fill, rect: clampToPanel(fill.rect) }))
    .filter((fill) => fill.rect.width > 0 && fill.rect.height > 0);
}
