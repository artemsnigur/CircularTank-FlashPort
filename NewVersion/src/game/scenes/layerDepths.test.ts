/**
 * The arena's draw order, as an ordering rather than a list of numbers.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * `HAZARD_DEPTH` was `0` and `PROP_DEPTH` was `0.5`, so ice and lava trails
 * drew **underneath** the background props and a trail crossing scenery
 * vanished under it. Each constant carried a comment saying where it belonged
 * — "below everything", "just above the ground tile" — and the two comments
 * were consistent with each other and with the bug.
 *
 * The numbers only mean anything *relative to each other*, and nothing
 * compared them. A depth is exactly the kind of value that reads fine at its
 * definition and is wrong in the layer cake.
 *
 * ── What this proves, and what it does not ────────────────────────────────
 * `GameplayScene` cannot be instantiated, so these are read out of its source
 * rather than off live game objects. **That proves the constants are ordered,
 * not that each sprite is given the right one** — a `setDepth(PARTICLE_DEPTH)`
 * on a hazard would still pass. It is the half of the claim a unit test can
 * hold; the other half is a frame.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
const ENEMY = readFileSync('src/game/entities/Enemy.ts', 'utf8');
const TANK = readFileSync('src/game/entities/PlayerTank.ts', 'utf8');

/** A `const NAME_DEPTH = n;` from the scene. */
function depth(name: string): number {
  const match = new RegExp(`const ${name} = ([\\d.]+);`).exec(SCENE);
  expect(match, `${name} is not declared in GameplayScene`).not.toBeNull();
  return Number(match![1]);
}

/** The literal an entity hands to `setDepth`. */
function entityDepth(source: string, label: string): number {
  const match = /setDepth\((\d+(?:\.\d+)?)\)/.exec(source);
  expect(match, `${label} does not call setDepth with a literal`).not.toBeNull();
  return Number(match![1]);
}

describe('the arena draws in the right order', () => {
  it('puts ground hazards above the props and below everything that moves', () => {
    /*
     * The regression, stated as the comparison that was never made. Ice and
     * lava sit on the floor, so they must clear the scenery painted on it and
     * still pass under every object standing in them.
     */
    const hazard = depth('HAZARD_DEPTH');
    const prop = depth('PROP_DEPTH');

    expect(hazard, 'trails draw under the background props').toBeGreaterThan(prop);
    expect(hazard, 'trails draw over the grenades').toBeLessThan(depth('GRENADE_DEPTH'));
    expect(hazard, 'trails draw over the money').toBeLessThan(depth('MONEY_DEPTH'));
  });

  it('keeps hazards below the enemies and the tank standing in them', () => {
    // Read from the entities themselves, not from a number restated here —
    // the scene's constants and the entities' own `setDepth` calls are two
    // separate places and only their *relationship* matters.
    const hazard = depth('HAZARD_DEPTH');

    expect(hazard).toBeLessThan(entityDepth(ENEMY, 'Enemy'));
    expect(hazard).toBeLessThan(entityDepth(TANK, 'PlayerTank'));
  });

  it('keeps particles above the tank, which is the other end of the stack', () => {
    /*
     * The counterpart. Every assertion above is "hazard is low", and a file
     * where *everything* collapsed to one depth would satisfy all of them.
     * This is the one pair that has to be far apart.
     */
    expect(depth('PARTICLE_DEPTH')).toBeGreaterThan(entityDepth(TANK, 'PlayerTank'));
    expect(depth('PARTICLE_DEPTH')).toBeGreaterThan(depth('HAZARD_DEPTH'));
  });
});

/**
 * The money badge borrows two colours from the stylesheet — T218.
 *
 * A canvas cannot read `--hud-plate`, so the values are restated as hex in
 * `GameplayScene`. That is two homes for one colour, which is exactly how the
 * three glass tile surfaces drifted apart in `A38`, so the pair is compared
 * here rather than trusted.
 */
describe('the money badge matches the currency styling', () => {
  const CSS = readFileSync('src/styles/global.css', 'utf8');

  const constant = (name: string): string => {
    const match = new RegExp(`const ${name} = (0x[0-9a-f]+|'#[0-9a-f]+')`, 'i').exec(SCENE);
    expect(match, `${name} is not declared in GameplayScene`).not.toBeNull();
    /*
     * Strip the *prefix*, not every non-hex character. Filtering characters
     * turned `0x26282c` into `026282c` — the `x` went and the leading `0`
     * stayed — and the comparison failed on a value that was correct.
     */
    return match![1].replace(/^'?(0x|#)/i, '').replace(/'$/, '').toLowerCase();
  };

  it('fills with the HUD plate colour', () => {
    const plate = /--hud-plate:\s*rgb\((\d+)\s+(\d+)\s+(\d+)/.exec(CSS);
    expect(plate, '--hud-plate is not in the stylesheet in the expected form').not.toBeNull();

    const [, r, g, b] = plate!;
    const asHex = ((Number(r) << 16) | (Number(g) << 8) | Number(b)).toString(16).padStart(6, '0');
    expect(constant('MONEY_BADGE_FILL')).toBe(asHex);
  });

  it('writes the figure in the shop balance green', () => {
    // The same green `.shop-buy__price` and `.shop-detail__balance` use, so a
    // coin on the floor and its price in the shop are one currency.
    const balance = /\.shop-detail__balance\s*\{[^}]*color:\s*#([0-9a-f]{6})/i.exec(CSS);
    expect(balance, 'the shop balance colour was not found').not.toBeNull();

    expect(constant('MONEY_BADGE_TEXT')).toBe(balance![1].toLowerCase());
    expect(constant('MONEY_BADGE_RIM')).toBe(balance![1].toLowerCase());
  });
});
