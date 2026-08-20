/**
 * Coins — `spawnMoney` (`PartGameArea.as:352`) and `handleMoney` (`:2130`).
 *
 * Three things join here, and the third is why this matters beyond the pickup
 * itself:
 *
 * 1. Enemies drop coins on death, decomposed into denominations.
 * 2. Coins home on the tank and are collected on contact.
 * 3. **`levelDoneFunction` (`:667`) waits for them.** A level that has resolved
 *    does not hand over to the results screen while loose money is on the
 *    floor — `moneyCount == 0 || hp == 0`. Until this module existed the port
 *    passed a hardcoded `moneyOnFloor: 0`, so that wait was vacuous and the
 *    win-side window was shorter than the original's.
 *
 * Coins keep moving and keep being collected after a level resolves:
 * `handleMoney` is at `:2840`, outside the `if(!levelDone)` gate, alongside
 * `handleParticles`. That is the whole point of the wait — see
 * `waves/levelDoneGate.ts`.
 */

/**
 * The figure's height on a coin, as a fraction of the disc — T222.
 *
 * Down from `0.46`, which was chosen when the disc still had a rim to compete
 * with. Without one, the same ratio simply crowded the edge.
 */
export const MONEY_FIGURE_SCALE = 0.38;

/**
 * The smallest the figure may be, in design units.
 *
 * Deliberately **low**. It stopped being what keeps the figure readable —
 * `Text.setResolution` is — and a high floor is what made the ratio inert: at
 * `7`, every denomination below `$500` clamped to the same size and the ratio
 * governed nothing at all.
 */
export const MONEY_FIGURE_MIN = 6;

/** How much of the disc's width the figure may occupy. */
export const MONEY_FIGURE_FIT = 0.86;

/**
 * How many texture pixels the figure is drawn with per design unit — T224.
 *
 * ── Why this is a constant and not the camera's zoom ──────────────────────
 * T222 read `camera.zoom` for this. It was a *read* and it fed one `Text`
 * object, but it made a coin's appearance depend on a global the rest of the
 * scene owns, and that is a dependency worth not having: anyone reading the
 * coin code has to go and establish what the camera is doing, and anyone
 * changing the camera has to know a coin was listening.
 *
 * A fixed oversample does the same job. The figure is built at `3x` the size
 * it will be drawn at and the sprite is scaled back down by the same factor,
 * so the raster holds three pixels per design unit whatever the window is
 * doing. Above about a 3x zoom the glyphs soften again, which is the trade —
 * and 3 covers every desktop window and the phone viewports this ships to.
 *
 * Nothing here touches `camera.zoom`, `game.scale` or the renderer. The
 * oversample lives on the one `Text` and is undone by that `Text`'s own
 * scale.
 */
export const MONEY_FIGURE_OVERSAMPLE = 3;

/**
 * How far to shrink a figure that overhangs its coin — 1 when it already fits.
 *
 * Measured and applied, not assumed. `$50` at the old floor came out **1.08x
 * the diameter of its own disc**, driven rather than estimated, so the figure
 * hung over both edges of the coin it was supposed to be on. Every
 * denomination is a different string length on a different disc (`$1` on ten
 * units, `$1000` on twenty-two), so no single font ratio fits them all.
 *
 * Shrinking costs nothing in sharpness: the raster already holds `camera.zoom`
 * pixels per design unit, and minifying only adds to that.
 *
 * A non-finite or non-positive width returns 1 rather than a nonsense scale —
 * that is the case where the face has not finished loading and the metrics are
 * not yet real, and leaving the figure alone is the better failure.
 */
export function figureFit(displayWidth: number, size: number): number {
  if (!Number.isFinite(displayWidth) || displayWidth <= 0) return 1;
  if (!Number.isFinite(size) || size <= 0) return 1;

  const room = size * MONEY_FIGURE_FIT;
  return displayWidth > room ? room / displayWidth : 1;
}

/** `:374-446` — the denominations, largest first, as the AS3 tests them. */
export const DENOMINATIONS: readonly number[] = [
  1000, 500, 250, 200, 150, 100, 75, 50, 25, 20, 15, 10, 5, 2, 1,
];

/** `:611` friction, applied to the coin's speed each frame. */
export const COIN_FRICTION = 2.15;

/**
 * ── Divergence: coins fly faster than the original's (T218) ──────────────
 *
 * The AS3's numbers are kept below as `AS3_*` and this multiplies them.
 *
 * **Why it felt slow, in the original's own arithmetic**: attraction adds 2.5
 * to the speed each frame and friction takes 2.15 off it, so a coin nets
 * `+0.35` per frame and needs about **23 frames — most of a second** — to
 * reach its cap of 8. The launch speed makes it worse rather than better:
 * `1.2 + random()` is under friction's 2.15, so the outward scatter is gone
 * inside a single frame and the coin never visibly pops out of the enemy.
 *
 * Scaling attraction and the cap together keeps the shape of the motion — a
 * coin still eases toward the tank rather than snapping to it — while cutting
 * the time to reach full speed to two or three frames. The launch is scaled
 * further so the initial burst survives friction and the drop reads as
 * *thrown* rather than as seeping outward.
 *
 * Friction is deliberately **not** scaled: it is what stops a coin that has
 * bounced off a wall, and raising it with the rest would cancel the change.
 *
 * **T220 eased it from 2.4 to 1.8** — the drops read as thrown at 2.4 but
 * arrived faster than the eye could follow the figure on them, and a coin that
 * cannot be read is the same as no badge at all. The floor this cannot go
 * under is friction: `COIN_SPEED_BASE` below has to stay above `2.15`, or the
 * launch is erased in the frame it happens and the scatter disappears again.
 * `keeps a scattered coin's launch above friction` is that floor as a test.
 */
export const COIN_SPEED_SCALE = 1.8;

/** `:2155` — the pull toward the tank, added to velocity every frame. */
export const AS3_COIN_ATTRACTION = 2.5;
export const COIN_ATTRACTION = AS3_COIN_ATTRACTION * COIN_SPEED_SCALE;

/** `:2160` — coins never travel faster than this. */
export const AS3_COIN_MAX_SPEED = 8;
export const COIN_MAX_SPEED = AS3_COIN_MAX_SPEED * COIN_SPEED_SCALE;

/**
 * `:628` — a scattered coin's launch speed is `1.2 + random()`.
 *
 * Scaled harder than the rest: at the original values friction erases the
 * launch before it is drawn, so this is the number that decides whether a drop
 * is seen leaving the enemy at all.
 */
const AS3_COIN_SPEED_BASE = 1.2;
const AS3_COIN_SPEED_RANDOM = 1;
const COIN_LAUNCH_SCALE = COIN_SPEED_SCALE * 1.5;
const COIN_SPEED_BASE = AS3_COIN_SPEED_BASE * COIN_LAUNCH_SCALE;
const COIN_SPEED_RANDOM = AS3_COIN_SPEED_RANDOM * COIN_LAUNCH_SCALE;

/**
 * Splits an amount into coins, largest first — `:372-446`.
 *
 * Greedy, and the AS3 runs the identical ladder twice: once to count the coins
 * so it can space them evenly, then again to build them. Reproduced once here
 * and used for both.
 *
 * A non-positive amount yields nothing, which is the `hp == 0` case at `:368`
 * more than it is a guard: **a killing blow that also destroys the tank drops
 * no money at all**, because `spawnMoney` zeroes the count outright.
 */
export function decomposeMoney(amount: number): number[] {
  const coins: number[] = [];
  let remaining = Math.floor(amount);
  while (remaining > 0) {
    // `>=` against each denomination in turn, exactly as the chain reads. The
    // ladder divides every value evenly enough that this always terminates:
    // 1 is the last rung.
    const value = DENOMINATIONS.find((d) => remaining >= d) ?? 1;
    coins.push(value);
    remaining -= value;
  }
  return coins;
}

/** How much an enemy's death is worth — `:6842-6849`. */
export interface DropInput {
  /** `theEnemy.money`, already scaled by tier and difficulty. */
  money: number;
  isBoss: boolean;
  mode: string;
  /** `noMoney` — set when the enemy reached the tank (`:5304`, `:5485`). */
  reachedTank: boolean;
  /** `ScreenGame.hp`; zero means the tank died and nothing drops (`:368`). */
  tankHp: number;
}

/**
 * The amount an enemy drops — `:6842`.
 *
 * The AS3's two branches, which are easy to read as one:
 *
 *     if(!noMoney && mode != "Flag" && (mode != "Boss" || level == "B"))  full
 *     else if(!noMoney && mode == "Boss")                                 half
 *
 * so **Flag levels drop nothing on a kill at all** — their money comes from the
 * flags themselves (`:2589`) — and **in Boss levels only the boss pays full**,
 * with every ordinary enemy worth a rounded half. Neither is a special case
 * bolted on; both fall out of those two conditions, which is exactly why they
 * are easy to lose when transcribing.
 */
export function dropAmount(input: DropInput): number {
  if (input.reachedTank) return 0;
  // `:368` — checked here rather than at the spawn site, because the AS3 zeroes
  // the count inside `spawnMoney` and so applies it to the flag reward too.
  if (input.tankHp <= 0) return 0;

  if (input.mode === 'Flag') return 0;
  if (input.mode === 'Boss' && !input.isBoss) return Math.round(input.money / 2);
  return input.money;
}

export interface Coin {
  value: number;
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  radius: number;
}

export interface SpawnMoneyInput {
  amount: number;
  x: number;
  y: number;
  /** `:626` — false gives the coins no launch speed. Flag rewards use false. */
  move?: boolean;
  /** `:622` — how far from the origin coins are scattered. */
  distance?: number;
  /** Flag levels ring the coins evenly instead of scattering them. */
  evenRing?: boolean;
  radiusFor: (value: number) => number;
  random?: () => number;
}

/**
 * Builds the coins for one drop — `:352-637`.
 *
 * The two placements are genuinely different rules, not one with a parameter:
 * a Flag reward is an **even ring** at exactly `distance`
 * (`startAngle + 360 / coins * index`, `:615`), and every other drop is a
 * **random scatter** within `distance` (`:621`). Ringing a kill drop or
 * scattering a flag reward both look plausible and neither is what the original
 * does.
 */
export function spawnMoney(input: SpawnMoneyInput): Coin[] {
  const random = input.random ?? Math.random;
  const { move = true, distance = 0, evenRing = false } = input;

  const values = decomposeMoney(input.amount);
  if (values.length === 0) return [];

  // `:365` — one angle for the whole ring, drawn before any coin is built.
  const startAngle = random() * 360;

  return values.map((value, index) => {
    const angle = evenRing ? startAngle + (360 / values.length) * index : random() * 360;
    const radians = (angle * Math.PI) / 180;
    // `:616` uses the full distance; `:622` uses a random fraction of it.
    const reach = evenRing ? distance : random() * distance;
    const speed = move ? COIN_SPEED_BASE + random() * COIN_SPEED_RANDOM : 0;

    return {
      value,
      x: input.x + Math.cos(radians) * reach,
      y: input.y + Math.sin(radians) * reach,
      xVel: Math.cos(radians) * speed,
      yVel: Math.sin(radians) * speed,
      radius: input.radiusFor(value),
    };
  });
}

export interface CoinBounds {
  roomWidth: number;
  roomHeight: number;
}

export interface CoinTarget {
  x: number;
  y: number;
  radius: number;
}

export interface CoinStep {
  coin: Coin | null;
  /** The value banked this frame; 0 unless the coin was collected. */
  collected: number;
}

/**
 * Advances one coin — `handleMoney` (`:2139-2200`).
 *
 * **Collection is tested before the move**, as the AS3 has it, so a coin that
 * arrives inside the tank is banked on the frame it arrives rather than the
 * next one.
 *
 * The attraction has **no range limit**: `:2155` adds toward the tank every
 * frame from anywhere on the map. That is what guarantees the level-done wait
 * terminates — every coin reaches the tank eventually, so the results screen
 * always arrives. A range-gated magnet would look more sensible and would hang
 * the handover on any coin dropped out of reach.
 */
export function tickCoin(
  coin: Coin,
  tank: CoinTarget,
  bounds: CoinBounds,
  frames: number,
): CoinStep {
  if (Math.hypot(coin.x - tank.x, coin.y - tank.y) <= coin.radius + tank.radius) {
    return { coin: null, collected: coin.value };
  }

  const toTank = Math.atan2(tank.y - coin.y, tank.x - coin.x);
  let xVel = coin.xVel + Math.cos(toTank) * COIN_ATTRACTION * frames;
  let yVel = coin.yVel + Math.sin(toTank) * COIN_ATTRACTION * frames;

  let speed = Math.hypot(xVel, yVel);
  if (speed > COIN_MAX_SPEED) {
    const heading = Math.atan2(yVel, xVel);
    xVel = Math.cos(heading) * COIN_MAX_SPEED;
    yVel = Math.sin(heading) * COIN_MAX_SPEED;
    speed = COIN_MAX_SPEED;
  }

  if (speed <= 0) return { coin: { ...coin, xVel, yVel }, collected: 0 };

  // `:2168` — friction scales both components, preserving heading.
  const slowed = speed - COIN_FRICTION * frames;
  if (slowed > 0) {
    xVel *= slowed / speed;
    yVel *= slowed / speed;
  } else {
    xVel = 0;
    yVel = 0;
  }

  // `:2180` — walls reflect rather than stop, per axis.
  let x = coin.x + xVel * frames;
  let y = coin.y + yVel * frames;
  if (x < coin.radius) {
    x = coin.radius;
    xVel = -xVel;
  } else if (x > bounds.roomWidth - coin.radius) {
    x = bounds.roomWidth - coin.radius;
    xVel = -xVel;
  }
  if (y < coin.radius) {
    y = coin.radius;
    yVel = -yVel;
  } else if (y > bounds.roomHeight - coin.radius) {
    y = bounds.roomHeight - coin.radius;
    yVel = -yVel;
  }

  return { coin: { ...coin, x, y, xVel, yVel }, collected: 0 };
}
