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
 * The one green, and the coin that stopped sharing it — T218, T221, T222.
 *
 * `healthColour.ts` cannot read `--green`: it is a pure module, and resolving
 * a custom property would mean a `getComputedStyle` call it has no document
 * for. So the value is restated, and two homes for one colour is exactly how
 * the three glass tile surfaces drifted apart in `A38`. This compares them
 * rather than trusting them, and it earned its place — T221 moved the token
 * and this failed by name before anything was driven.
 *
 * The coin badge used to be a third home. T222 made it gold, so it shares no
 * value with the stylesheet at all and there is nothing left to compare. What
 * replaces the comparison is a set of **properties**: that the disc is a
 * yellow, that the ink on it is legible, and that no rim is drawn. Those are
 * the requirements; the exact hex is a taste call and is deliberately free.
 */
describe('the one green, and the coin', () => {
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

  /** A `#rrggbb` or `0xrrggbb` constant, as three channels. */
  const channels = (name: string): [number, number, number] => {
    const hex = constant(name);
    return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
  };

  /** WCAG relative luminance, for the contrast pair below. */
  const luminance = ([r, g, b]: [number, number, number]): number => {
    const channel = (c: number): number => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const contrast = (a: [number, number, number], b: [number, number, number]): number => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  it('fills the disc with a yellow, not with a plate grey', () => {
    /*
     * The requirement, as a property rather than as a copied literal: red and
     * green both high and close, blue well below them. That is what "yellow"
     * is, and it is what the old `#26282c` — three channels within six of each
     * other — was not.
     */
    const [r, g, b] = channels('MONEY_BADGE_FILL');

    expect(r, 'red is high').toBeGreaterThan(200);
    expect(g, 'green is high').toBeGreaterThan(150);
    expect(b, 'blue is well below both').toBeLessThan(Math.min(r, g) - 100);
    expect(Math.abs(r - g), 'red and green are close, or it is orange or lime').toBeLessThan(80);

    // Opaque. It was 0.92 while it borrowed the HUD's translucent plate; a
    // coin lying on the floor is an object, not a panel.
    expect(SCENE).toMatch(/const MONEY_BADGE_ALPHA = 1;/);
  });

  it('writes the figure in ink dark enough to read on that yellow', () => {
    // The user-visible requirement — "high contrast against the yellow" — is a
    // ratio, so it is asserted as one. 7:1 is AAA for small text, and the
    // figure on a `$1` coin is about as small as text in this game gets.
    const ratio = contrast(channels('MONEY_BADGE_TEXT'), channels('MONEY_BADGE_FILL'));
    expect(ratio).toBeGreaterThan(7);

    /*
     * The counterpart, and the reason this is not a vacuous check: the green
     * the figure used to be would *fail* it on the same disc. Without this
     * line, "the ink contrasts" would pass for any dark-ish colour including
     * one nobody chose.
     */
    const oldInk = [0x3f, 0xae, 0x53] as [number, number, number];
    expect(contrast(oldInk, channels('MONEY_BADGE_FILL'))).toBeLessThan(7);
  });

  it('draws no rim on the coin', () => {
    /*
     * A source-shape check, and it proves only that no `setStrokeStyle` call
     * is written in the coin's build block — not that nothing else strokes the
     * disc. That is the whole claim available to a test that cannot
     * instantiate the scene, and it is narrow on purpose.
     *
     * The constant is the stronger half: `MONEY_BADGE_RIM` is gone, so a stroke
     * would have to invent a colour to draw in.
     */
    expect(SCENE).not.toMatch(/MONEY_BADGE_RIM/);

    const build = /const clip = MONEY_CLIPS\[coin\.value\];[\s\S]{0,1200}/.exec(SCENE);
    expect(build, "the coin's build block was not found").not.toBeNull();
    expect(build![0]).toMatch(/MONEY_BADGE_FILL/);
    expect(build![0], 'the coin strokes its disc').not.toMatch(/setStrokeStyle/);
  });

  it('oversamples the figure locally, and reads no global scale to do it', () => {
    /*
     * The blur fix, and the part of it a test can hold.
     *
     * T222 read `camera.zoom` for the oversample. T224 replaced that with a
     * fixed factor — the appearance of a coin should not depend on a global
     * the rest of the scene owns. **This is the assertion that keeps it that
     * way**, and it is a negative, so it is pinned beside its positive: the
     * build block must contain the oversample and must *not* reach for the
     * camera.
     *
     * Source-shape, and narrow on purpose: it proves what is written in the
     * coin's build block, not that no other line in the scene reads the zoom
     * (`applyRoomFillZoom` legitimately does) and not that the glyphs are
     * sharp. Sharpness is a frame.
     */
    const build = /const figure = this\.add[\s\S]{0,1800}/.exec(SCENE);
    expect(build, "the coin's figure is not built where expected").not.toBeNull();

    expect(build![0], 'the figure is not oversampled').toMatch(/MONEY_FIGURE_OVERSAMPLE/);
    expect(build![0], 'the coin reads the camera zoom').not.toMatch(/cameras\.main\.zoom/);
    expect(build![0], 'the coin sets a text resolution').not.toMatch(/setResolution/);

    // And the fit, measured at the oversampled size and divided back down —
    // feeding the raw width in would make every coin think it overflowed.
    expect(build![0]).toMatch(
      /figureFit\(figure\.displayWidth \/ MONEY_FIGURE_OVERSAMPLE, size\)/,
    );
    expect(build![0]).toMatch(/setScale\(fit \/ MONEY_FIGURE_OVERSAMPLE\)/);
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
