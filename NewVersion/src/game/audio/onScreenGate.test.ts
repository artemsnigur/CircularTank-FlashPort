import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SOUND_HEARING_MARGIN, isAudibleAt } from './onScreenGate';
import { PRIMARY_WEAPONS } from '../weapons/firing';

const RECT = { cameraX: 0, cameraY: 0, cameraWidth: 640, cameraHeight: 400 };

describe('isAudibleAt', () => {
  it('accepts a source inside the camera and rejects one well outside', () => {
    expect(isAudibleAt(320, 200, 0, RECT)).toBe(true);
    expect(isAudibleAt(5000, 200, 0, RECT)).toBe(false);
  });

  it('extends exactly `distanceAdd` past each edge', () => {
    // Computed, not compared. `:6900` uses 100, so 740 is the last audible x
    // on a 640-wide camera and 741 is the first silent one.
    expect(isAudibleAt(640 + SOUND_HEARING_MARGIN, 200, 0, RECT)).toBe(true);
    expect(isAudibleAt(640 + SOUND_HEARING_MARGIN + 1, 200, 0, RECT)).toBe(false);
    expect(isAudibleAt(-SOUND_HEARING_MARGIN, 200, 0, RECT)).toBe(true);
    expect(isAudibleAt(-SOUND_HEARING_MARGIN - 1, 200, 0, RECT)).toBe(false);
  });

  it('widens by the source`s own radius, so a boss is heard sooner', () => {
    // `theEnemy.width / 2` in the AS3's terms. Asserted as a pair with radius
    // 0 at the same point, which is the whole content of the rule.
    const justOutside = 640 + SOUND_HEARING_MARGIN + 30;
    expect(isAudibleAt(justOutside, 200, 0, RECT)).toBe(false);
    expect(isAudibleAt(justOutside, 200, 40, RECT)).toBe(true);
  });

  it('is binary — the same answer at one unit inside as at the centre', () => {
    // **There is no attenuation in the original.** This is the assertion that
    // fails if someone converts the gate into a distance falloff, which is a
    // tempting improvement and a divergence. It returns a boolean by design;
    // a volume would need a different signature and this pins that.
    expect(isAudibleAt(320, 200, 0, RECT)).toBe(isAudibleAt(739, 200, 0, RECT));
  });

  it('uses the live camera size, not the AS3`s frozen 640x400', () => {
    // The constants-that-became-variables rule. A tall phone viewport hears
    // further down the map than a wide desktop one, and that is correct.
    const tall = { ...RECT, cameraHeight: 1400 };
    expect(isAudibleAt(320, 1200, 0, RECT)).toBe(false);
    expect(isAudibleAt(320, 1200, 0, tall)).toBe(true);
  });
});

describe('gated and ungated sounds are different rules', () => {
  const SCENE = readFileSync(join(import.meta.dirname, '..', 'scenes', 'GameplayScene.ts'), 'utf8');

  it('leaves the border sound ungated, where enemy fire is gated', () => {
    // **The pairing that stops the two collapsing.** Six AS3 sites gate their
    // push on the on-screen rule; the border sound is not one of them, and
    // neither are the player's own weapon or the UI. A future pass that
    // "consistently" gated everything would silence rounds leaving the room
    // behind the player, which the original plays.
    //
    // Source-shape check, flagged as such: it proves the gate is absent from
    // one site and present at the other, never that either is reached. The
    // driven proof is `npm run look -- --sound-sweep`.
    const borderSite = SCENE.slice(SCENE.indexOf('if (bullet.borderSound)'));
    const borderCall = borderSite.slice(0, borderSite.indexOf('bullet.destroy()'));
    expect(borderCall).toContain('queue(`Border');
    expect(borderCall).not.toContain('isAudibleAt');
  });

  it('gives every primary a border sound, so none is silently missing one', () => {
    // The column is per weapon in the AS3 too, and a weapon added without one
    // would simply make no sound at the wall — the quietest possible failure.
    for (const [name, spec] of Object.entries(PRIMARY_WEAPONS)) {
      expect(['Tiny', 'Medium', 'Big'], `${name}`).toContain(spec.borderSound);
    }
  });

  it('does not derive the border size from the round`s radius', () => {
    // The tempting simplification, and it is wrong: the Shotgun's pellets are
    // 'Tiny' while the Cake Cannon's are 'Medium', and nothing about their
    // radii says so. Pinned as the counterexample rather than as prose.
    expect(PRIMARY_WEAPONS['Shotgun'].borderSound).toBe('Tiny');
    expect(PRIMARY_WEAPONS['Cake Cannon'].borderSound).toBe('Medium');
    expect(PRIMARY_WEAPONS['Big Cannon'].borderSound).toBe('Big');
  });
});
