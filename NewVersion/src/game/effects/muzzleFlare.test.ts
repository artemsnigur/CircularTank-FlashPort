import { describe, expect, it } from 'vitest';

import { AS3_MUZZLE_FLARE_OFFSET, muzzleFlareFor, muzzleFlareOffset } from './muzzleFlare';
import { TANK_SIZES, barrelReach } from '../entities/tankArt';
import { PARTICLE_ANCHORS } from '../../assets/spriteGeometry';
import type { MuzzleFlareInput } from './muzzleFlare';

function input(over: Partial<MuzzleFlareInput> = {}): MuzzleFlareInput {
  return { weaponName: 'Cannon', tankX: 100, tankY: 200, rotation: 0, towerRotation: 0, ...over };
}

const typeFor = (weaponName: string): string | undefined =>
  muzzleFlareFor(input({ weaponName }))?.type;

describe('muzzleFlareFor — the three tiers', () => {
  it('sizes the flare by weapon name, across all three tiers', () => {
    // Asserted as a set rather than one per test: the failure worth catching is
    // two tiers collapsing into one, which only shows when they sit together.
    expect(typeFor('MiniGun')).toBe('MuzzleFlareSmall');
    expect(typeFor('Cannon')).toBe('MuzzleFlareMedium');
    expect(typeFor('Big Cannon')).toBe('MuzzleFlareBig');
  });

  it('puts the two cannons that share a tier on the same flare', () => {
    expect(typeFor('Big Cannon')).toBe(typeFor('Penetration Cannon'));
    expect(typeFor('MiniGun')).toBe(typeFor('Poison Cannon'));
    // And keeps the tiers apart, so "they agree" is not just "everything agrees".
    expect(typeFor('Big Cannon')).not.toBe(typeFor('MiniGun'));
  });

  it('gives no flare to a weapon the AS3 chain omits', () => {
    // The chain has no `else`. These three are absent from it, and each has an
    // effect of its own at the barrel already.
    expect(muzzleFlareFor(input({ weaponName: 'Flame Thrower' }))).toBeUndefined();
    expect(muzzleFlareFor(input({ weaponName: 'Laser Cannon' }))).toBeUndefined();
    expect(muzzleFlareFor(input({ weaponName: 'Rocket Launcher' }))).toBeUndefined();
  });
});

describe('muzzleFlareFor — the Shotgun`s single flare', () => {
  it('flares for the round down the barrel and for no other pellet', () => {
    // The whole rule: one flare per volley. A pellet 12 degrees off the turret
    // is the ordinary case for seven of the eight, and must produce nothing.
    expect(muzzleFlareFor(input({ weaponName: 'Shotgun', rotation: 90, towerRotation: 90 }))).toBeDefined();
    expect(muzzleFlareFor(input({ weaponName: 'Shotgun', rotation: 78, towerRotation: 90 }))).toBeUndefined();
  });

  it('does not apply the rule to any other weapon', () => {
    // Pinned against the Shotgun on identical geometry — a guard written at the
    // wrong level would silence every off-axis round in the game, and the
    // Cannon fires exactly one round so it would look fine until the Cheese.
    const offAxis = { rotation: 78, towerRotation: 90 };
    expect(muzzleFlareFor(input({ ...offAxis, weaponName: 'Cannon' }))).toBeDefined();
    expect(muzzleFlareFor(input({ ...offAxis, weaponName: 'MiniGun' }))).toBeDefined();
    expect(muzzleFlareFor(input({ ...offAxis, weaponName: 'Shotgun' }))).toBeUndefined();
  });
});

describe('muzzleFlareFor — placement', () => {
  it('sits one offset along the round`s bearing, not the turret`s', () => {
    // Computed, not compared: at 0 degrees the offset is entirely in x.
    const flare = muzzleFlareFor(input({ rotation: 0, towerRotation: 90 }));
    expect(flare?.x).toBeCloseTo(100 + muzzleFlareOffset('Cannon'), 6);
    expect(flare?.y).toBeCloseTo(200, 6);

    // And at 90 entirely in y, so a swapped sin/cos fails rather than passing
    // on the symmetric case.
    const up = muzzleFlareFor(input({ rotation: 90, towerRotation: 90 }));
    expect(up?.x).toBeCloseTo(100, 6);
    expect(up?.y).toBeCloseTo(200 + muzzleFlareOffset('Cannon'), 6);
  });

  it('points where the round went and does not scatter', () => {
    const flare = muzzleFlareFor(input({ rotation: 135, towerRotation: 135 }));
    expect(flare?.startAngle).toBe(135);
    // `randAngle: 0` is the difference between a flare and a debris burst.
    expect(flare?.randAngle).toBe(0);
    expect(flare?.distance).toBe(0);
  });
});


/**
 * The flare comes out of the gun — **divergence `A10`**, rewritten.
 *
 * The first version of this pushed the flare to the *hull* edge, 16 units, on
 * the reasoning that a flare at the AS3's 10 looks buried. The measurement it
 * never took: every one of these barrels ends at 10.5, so 16 floated the flare
 * clear of the gun instead of fixing anything. What was actually buried was the
 * flare's back half, because the port drew the clip centred while Flash anchors
 * it at its base.
 */
describe('the flare comes out of the gun — divergence A10', () => {
  it('reads the equipped weapon`s own barrel, not one number for all', () => {
    // The Gummy Bear and the Magic Cannon are the two turrets that are not
    // 10.5, so they are what separates "reads the weapon" from "returns a
    // constant that happens to be right for the Cannon".
    expect(muzzleFlareOffset('Cannon')).toBe(10.5);
    expect(muzzleFlareOffset('Gummy Bear Cannon')).toBe(11.3);
    expect(muzzleFlareOffset('Magic Cannon')).toBe(17.9);
    expect(muzzleFlareOffset('Gummy Bear Cannon')).not.toBe(muzzleFlareOffset('Cannon'));
  });

  it('is the barrel`s reach, not a value of its own', () => {
    // Read through, so a change to the art moves the flare with it. The
    // magnitudes above are stated from the SVG bounds; this pins the coupling.
    for (const weapon of ['Cannon', 'MiniGun', 'Gummy Bear Cannon', 'Magic Cannon']) {
      expect(muzzleFlareOffset(weapon), weapon).toBe(barrelReach(weapon));
    }
  });

  it('sits at the barrel tip, not at the hull edge and not at the AS3`s 10', () => {
    // Both failure modes, pinned against each other on the same weapon:
    // buried (the AS3's flat 10, half a unit short) and floating (the previous
    // divergence's 16, which is 5.5 units past where the barrel ends).
    const tip = muzzleFlareOffset('Cannon');
    expect(tip).toBeGreaterThan(AS3_MUZZLE_FLARE_OFFSET);
    expect(tip).toBeLessThan(TANK_SIZES.body / 2 + 1.5);
    // The hull is wider than every barrel — which is *why* the flare looks
    // like it starts inside the tank, and is faithful. A9-style trap: do not
    // "fix" it by pushing the flare out to the hull again.
    expect(tip).toBeLessThan(TANK_SIZES.body / 2);
  });

  it('records the AS3 value it diverges from', () => {
    // Stated from `:3962`, not read back out of the module.
    expect(AS3_MUZZLE_FLARE_OFFSET).toBe(10);
    expect(muzzleFlareOffset('Cannon')).not.toBe(AS3_MUZZLE_FLARE_OFFSET);
    // And how small the divergence really is for eleven of the twelve.
    expect(muzzleFlareOffset('Cannon') - AS3_MUZZLE_FLARE_OFFSET).toBeCloseTo(0.5, 6);
  });

  it('places at that distance along the round bearing, per weapon', () => {
    // East and south, so a swapped sin/cos fails rather than passing on the
    // symmetric case — and two weapons, so the offset is not a shared constant.
    const at = (weaponName: string, rotation: number) =>
      muzzleFlareFor(input({ weaponName, rotation, towerRotation: rotation }));

    const east = at('Cannon', 0);
    expect(east?.x).toBeCloseTo(100 + 10.5, 6);
    expect(east?.y).toBeCloseTo(200, 6);

    const south = at('Gummy Bear Cannon', 90);
    expect(south?.x).toBeCloseTo(100, 6);
    expect(south?.y).toBeCloseTo(200 + 11.3, 6);
    // Unchanged by A10: the flare still points where the round went.
    expect(south?.startAngle).toBe(90);
  });
});

/**
 * The anchor, which is the half that is actually visible.
 *
 * `PARTICLE_ANCHORS` is generated from the shapes' registration points, so
 * these assert the values from the SVG bounds rather than restating the table.
 */
describe('the flare is anchored at its base, not its centre', () => {
  it('anchors all three tiers at local x = 0', () => {
    for (const tier of ['MuzzleFlareSmall', 'MuzzleFlareMedium', 'MuzzleFlareBig']) {
      expect(PARTICLE_ANCHORS[tier]?.originX, tier).toBe(0);
      // Vertically it is near-centred but not exactly — shapes 1108/1114/1119
      // all sit around 0.59, which is where the flare's spine is.
      expect(PARTICLE_ANCHORS[tier]?.originY, tier).toBeCloseTo(0.59, 2);
    }
  });

  it('leaves every centred clip out of the table', () => {
    // The counterpart. If this table listed everything, the origin logic would
    // be untested — "has an anchor" would be true of all particles and could
    // not distinguish a flare from a spark.
    for (const centred of ['Black', 'Green', 'Poison', 'Magic', 'Lock']) {
      expect(PARTICLE_ANCHORS[centred], centred).toBeUndefined();
    }
  });
});
