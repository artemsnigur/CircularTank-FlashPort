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

import { healthColour } from '../ui/healthColour';

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
 * The money badge borrows two colours from the stylesheet — T218, T221.
 *
 * A canvas cannot read `--hud-plate` or `--green`, so the values are restated
 * as hex in `GameplayScene`, and `healthColour.ts` restates the green a third
 * time. Three homes for one colour is exactly how the three glass tile
 * surfaces drifted apart in `A38`, so they are compared here rather than
 * trusted.
 *
 * **What this proves**: that the numbers agree today. It cannot make them one
 * value — a `.ts` module has no access to a custom property, and resolving one
 * at runtime would mean a `getComputedStyle` call on a canvas colour. The
 * mechanism is this test failing, which is what it did when T221 moved the
 * token and left both restatements behind.
 */
describe('the money badge matches the currency styling', () => {
  const CSS = readFileSync('src/styles/global.css', 'utf8');

  /** The `--green` declaration, without its `#`. */
  const token = (name: string): string => {
    const match = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i').exec(CSS);
    expect(match, `--${name} is not declared as a hex literal`).not.toBeNull();
    return match![1].toLowerCase();
  };

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

  it('writes the figure in the one green the UI uses', () => {
    // `--green` — the same value the HUD counter, the shop balance and the
    // buy price all resolve to, so a coin on the floor and its price in the
    // shop are one currency.
    expect(constant('MONEY_BADGE_TEXT')).toBe(token('green'));
    expect(constant('MONEY_BADGE_RIM')).toBe(token('green'));
  });

  it('spends the token through `var(--green)`, not through a copy of it', () => {
    /*
     * The other half of "one green": the currency rules must *reference* the
     * token rather than restate its value, or the declaration agrees with the
     * badge while the screen shows something else.
     *
     * Pinned as the pair — the rules exist, and none of them carries a hex.
     */
    const rules = ['.shop-detail__balance', '.shop-buy__price', '.hud-stat__value.hud-money__value'];
    for (const rule of rules) {
      /*
       * Every rule with this selector, not the first — `.shop-buy__price`
       * appears twice, and the first is a shared layout rule that sets no
       * colour at all. Taking `exec`'s first match reported that rule as
       * having lost its colour, on a stylesheet that was correct.
       */
      const bodies = [
        ...CSS.matchAll(new RegExp(`\\${rule}[^{]*\\{([^}]*)\\}`, 'g')),
      ].map((m) => m[1]);
      expect(bodies.length, `${rule} was not found in the stylesheet`).toBeGreaterThan(0);

      const coloured = bodies.filter((b) => /(?:^|[;\s])color:/.test(b));
      expect(coloured.length, `${rule} sets a colour somewhere`).toBeGreaterThan(0);
      for (const body of coloured) {
        expect(body, `${rule} restates a hex instead of using var(--green)`).not.toMatch(
          /(?:^|[;\s])color:\s*#/,
        );
        expect(body, `${rule} spends the token`).toMatch(/color:\s*var\(--green\)/);
      }
    }
  });

  it('ends the health ramp on that same green', () => {
    /*
     * The third home. `healthColour.ts` is a `.ts` module and cannot read the
     * property either, so the top stop is a restatement — and it was a
     * different green entirely (`#4ade6a`) until T221 unified them.
     *
     * Asserted against the token rather than against a literal, so retuning
     * the palette moves one value and this follows it.
     */
    const full = healthColour(1);
    const [r, g, b] = [...full.matchAll(/\d+/g)].map((m) => Number(m[0]));
    const asHex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    expect(asHex).toBe(token('green'));

    // The counterpart: the ramp's other end is emphatically *not* the token.
    // Without it, a `healthColour` that returned one constant would pass.
    const empty = healthColour(0);
    expect(empty).not.toBe(full);
  });
});
