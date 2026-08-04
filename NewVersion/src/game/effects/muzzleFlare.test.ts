import { describe, expect, it } from 'vitest';

import { MUZZLE_FLARE_OFFSET, muzzleFlareFor } from './muzzleFlare';
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
    expect(flare?.x).toBeCloseTo(100 + MUZZLE_FLARE_OFFSET, 6);
    expect(flare?.y).toBeCloseTo(200, 6);

    // And at 90 entirely in y, so a swapped sin/cos fails rather than passing
    // on the symmetric case.
    const up = muzzleFlareFor(input({ rotation: 90, towerRotation: 90 }));
    expect(up?.x).toBeCloseTo(100, 6);
    expect(up?.y).toBeCloseTo(200 + MUZZLE_FLARE_OFFSET, 6);
  });

  it('points where the round went and does not scatter', () => {
    const flare = muzzleFlareFor(input({ rotation: 135, towerRotation: 135 }));
    expect(flare?.startAngle).toBe(135);
    // `randAngle: 0` is the difference between a flare and a debris burst.
    expect(flare?.randAngle).toBe(0);
    expect(flare?.distance).toBe(0);
  });
});
