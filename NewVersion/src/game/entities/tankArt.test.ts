import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  TANK_BODY_FRAMES,
  TANK_SHIELD_FRAMES,
  TANK_SIZES,
  TANK_TOWER_FRAMES,
  TOWER_FRAME_BY_WEAPON,
  towerShape,
} from './tankArt';
import { PRIMARY_WEAPONS } from '../weapons/firing';
import { TANK_RADIUS } from '../player/tankDamage';

/**
 * `ScreenGame.setVisibleTankWeapon` (`ScreenGame.as:521-570`), transcribed from
 * the AS3's own chain in the order it tests names.
 *
 * Kept separate from `TOWER_FRAME_BY_WEAPON` on purpose. Asserting the table
 * against itself proves nothing; this is the second, independent reading, and
 * the two disagreeing is the failure worth catching. Index and meaning are
 * separately meaningful here — the same pairing shape as the `objectList`
 * name/count bug.
 */
const AS3_CHAIN: readonly [string, number][] = [
  ['Cannon', 1],
  ['MiniGun', 2],
  ['Big Cannon', 3],
  ['Flamethrower', 4],
  ['Shotgun', 5],
  ['Timed Bomb Cannon', 6],
  ['Gummy Bear Cannon', 7],
  ['Poison Cannon', 8],
  ['Laser Cannon', 9],
  ['Cake Cannon', 10],
  ['Penetration Cannon', 11],
  ['Magic Cannon', 12],
];

describe('TOWER_FRAME_BY_WEAPON', () => {
  it('matches the AS3 chain name for name', () => {
    for (const [name, frame] of AS3_CHAIN) {
      expect(TOWER_FRAME_BY_WEAPON[name], name).toBe(frame);
    }
  });

  it('covers every primary the port can equip, and nothing else', () => {
    // Both directions. A weapon with no turret frame silently shows the
    // Cannon's; a frame for a weapon that does not exist is a typo that would
    // never be reached and never noticed.
    expect(Object.keys(TOWER_FRAME_BY_WEAPON).sort()).toEqual(Object.keys(PRIMARY_WEAPONS).sort());
  });

  it('uses each of the twelve frames exactly once', () => {
    const frames = Object.values(TOWER_FRAME_BY_WEAPON);
    expect(new Set(frames).size).toBe(12);
    expect(Math.min(...frames)).toBe(1);
    expect(Math.max(...frames)).toBe(12);
  });

  it('is not the order the frames appear in assets.swf', () => {
    // The reason the table is written by name rather than derived. If the
    // weapon order happened to match the shape-id order, deriving it would
    // look correct and this test would be the only thing saying otherwise.
    const byRosterOrder = Object.keys(PRIMARY_WEAPONS).map((n) => TOWER_FRAME_BY_WEAPON[n]);
    expect(byRosterOrder).not.toEqual([...byRosterOrder].sort((a, b) => a - b));
  });
});

describe('towerShape', () => {
  it('maps a weapon to its own shape, and different weapons to different ones', () => {
    expect(towerShape('Cannon')).toBe(TANK_TOWER_FRAMES[0]);
    expect(towerShape('Magic Cannon')).toBe(TANK_TOWER_FRAMES[11]);
    expect(towerShape('Cannon')).not.toBe(towerShape('Magic Cannon'));
  });

  it('falls back to the Cannon`s turret for an unrecognised name', () => {
    // What the AS3 shows before `setVisibleTankWeapon` has ever run.
    expect(towerShape('Not A Weapon')).toBe(towerShape('Cannon'));
  });
});

describe('tank part sizes', () => {
  const svgWidth = (id: number): number => {
    const match = readFileSync(`../SWFimported/shapes/${id}.svg`, 'utf8').match(/width="([\d.]+)/);
    if (!match) throw new Error(`no width in shapes/${id}.svg`);
    return Number(match[1]);
  };

  it('takes every part`s size from its own authored SVG', () => {
    expect(TANK_SIZES.body).toBeCloseTo(svgWidth(TANK_BODY_FRAMES[0]), 6);
    expect(TANK_SIZES.tower).toBeCloseTo(svgWidth(TANK_TOWER_FRAMES[0]), 6);
    expect(TANK_SIZES.shield).toBeCloseTo(svgWidth(TANK_SHIELD_FRAMES[0]), 6);
  });

  it('reconciles the AS3 radius with the authored body, and rules out the doubling', () => {
    // `Tank.as:23` hard-codes 14 against a 29-wide body — half the width, less
    // the 0.5-unit stroke. The port used 29, which is 29 read as a *radius*
    // and doubled into a diameter. Both readings are asserted so the wrong one
    // cannot come back looking plausible.
    expect(TANK_RADIUS).toBe(14);
    expect(TANK_SIZES.body / 2).toBeCloseTo(14.5, 6);
    expect(TANK_SIZES.body).not.toBe(58);
    expect(TANK_RADIUS * 2).toBeLessThan(TANK_SIZES.body + 1);
  });

  it('gives the body two frames and the shield four', () => {
    expect(TANK_BODY_FRAMES).toHaveLength(2);
    expect(TANK_SHIELD_FRAMES).toHaveLength(4);
    expect(TANK_TOWER_FRAMES).toHaveLength(12);
  });
});
