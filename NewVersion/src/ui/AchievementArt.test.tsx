/**
 * The badge renderer, and the two screens that must both go through it.
 *
 * The gallery already sized its layers correctly; the unlock reveal did not,
 * and the difference was invisible for 35 badges and grotesque for the one
 * whose emblem is 33.3 x 12.5. So the interesting assertions here are about
 * **non-square** layers and about there being one renderer, not two.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';

import { AchievementArt } from './AchievementArt';
import {
  ACHIEVEMENT_BADGE_SIZE,
  ACHIEVEMENT_CLIPS,
  ACHIEVEMENT_SHAPE_BOX,
} from '../game/achievements/achievementArt';

/** `BossOnlySpecial` frame 2 — the badge that was reported stretched. */
const CHUCK = ACHIEVEMENT_CLIPS.BossOnlySpecial.frames[1];

describe('AchievementArt', () => {
  it('sizes a non-square layer by its own box, in both axes', () => {
    const { container } = render(<AchievementArt className="x" layers={CHUCK} />);
    const imgs = [...container.querySelectorAll<HTMLElement>('img')];
    expect(imgs).toHaveLength(CHUCK.length);

    for (const img of imgs) {
      const shape = Number(/(\d+)\.svg/.exec(img.getAttribute('src') ?? '')?.[1]);
      const box = ACHIEVEMENT_SHAPE_BOX[shape];
      expect(box, `shape ${shape} has no recorded size`).toBeDefined();
      expect(Number(img.style.getPropertyValue('--sw'))).toBeCloseTo(
        box[0] / ACHIEVEMENT_BADGE_SIZE,
        6,
      );
      expect(Number(img.style.getPropertyValue('--sh'))).toBeCloseTo(
        box[1] / ACHIEVEMENT_BADGE_SIZE,
        6,
      );
    }
  });

  it('gives the emblem that was stretched two different scales', () => {
    /*
     * The specific report. `1292` is 33.3 x 12.5 on a 52-unit badge, so its
     * two scales are 0.64 and 0.24 — a ratio of 2.66. The old rule set both
     * to 1, which is exactly that much horizontal stretch.
     *
     * Asserted as the computed pair rather than "sw is not sh", because both
     * figures are knowable here.
     */
    const { container } = render(<AchievementArt className="x" layers={[1292]} />);
    const img = container.querySelector<HTMLElement>('img')!;

    expect(Number(img.style.getPropertyValue('--sw'))).toBeCloseTo(33.3 / 52, 6);
    expect(Number(img.style.getPropertyValue('--sh'))).toBeCloseTo(12.5 / 52, 6);

    // The counterpart: a layer that really is square gets equal scales, so
    // "the two differ" is a property of the shape and not of the component.
    const square = render(<AchievementArt className="x" layers={[1213]} />);
    const s = square.container.querySelector<HTMLElement>('img')!;
    expect(Number(s.style.getPropertyValue('--sw'))).toBe(
      Number(s.style.getPropertyValue('--sh')),
    );
  });

  it('keeps the caller`s class beside its own', () => {
    // The shared rule keys on `achievement-art`; the caller's class still
    // carries position, size and filters, so both have to be present.
    const { container } = render(<AchievementArt className="achievement-icon" layers={CHUCK} />);
    const span = container.querySelector('span')!;
    expect(span.className).toContain('achievement-art');
    expect(span.className).toContain('achievement-icon');
  });
});

describe('every badge, everywhere', () => {
  it('has a recorded box for every layer of every frame of every clip', () => {
    /*
     * The audit, mechanised. A shape with no box falls back to the full badge
     * and is drawn square — the old bug as a default — so this is what keeps
     * the fallback unreachable. Derived from the clip table, so a regenerated
     * `achievementArt.ts` that adds a layer fails until its box is recorded.
     */
    let layers = 0;
    for (const [id, clip] of Object.entries(ACHIEVEMENT_CLIPS)) {
      for (const frame of clip.frames) {
        for (const shape of frame) {
          expect(ACHIEVEMENT_SHAPE_BOX[shape], `${id} layer ${shape}`).toBeDefined();
          layers += 1;
        }
      }
    }
    // The counterpart: 36 clips with several frames each, so a loop that
    // silently iterated nothing would not pass.
    expect(Object.keys(ACHIEVEMENT_CLIPS)).toHaveLength(36);
    expect(layers).toBeGreaterThan(100);
  });

  it('renders every frame of every clip at its recorded ratio', () => {
    /*
     * The board audit, as a mechanism rather than a harness run — T228.
     *
     * A browser pass over the Achievements board measured 36 badges and 72
     * layers, none stretched. But a locked board draws **frame 2 only**, so
     * that run saw 38 of the 76 shapes, and an earned badge stacks different
     * layers. Rather than contrive a profile per achievement, every frame of
     * every clip is rendered here and each layer checked against its box.
     *
     * What made the browser run sufficient anyway is worth keeping: all
     * **14** non-square shapes appear on frame 2, and the other 62 are exactly
     * 52x52, where a stretch is arithmetically a no-op. So the board pass did
     * cover every shape whose ratio a render could get wrong — this is what
     * stops that argument having to be made again by hand.
     */
    let checked = 0;
    let nonSquare = 0;

    for (const [id, clip] of Object.entries(ACHIEVEMENT_CLIPS)) {
      for (const [index, frame] of clip.frames.entries()) {
        const { container } = render(<AchievementArt className="x" layers={frame} />);
        const imgs = [...container.querySelectorAll<HTMLElement>('img')];
        expect(imgs, `${id} frame ${index + 1}`).toHaveLength(frame.length);

        for (const img of imgs) {
          const shape = Number(/(\d+)\.svg/.exec(img.getAttribute('src') ?? '')?.[1]);
          const box = ACHIEVEMENT_SHAPE_BOX[shape];
          const sw = Number(img.style.getPropertyValue('--sw'));
          const sh = Number(img.style.getPropertyValue('--sh'));

          // The ratio is the claim: a stretched layer is one whose aspect does
          // not survive. Asserted as the box's own aspect, not as "sw != sh".
          expect(sw / sh, `${id} frame ${index + 1} shape ${shape}`).toBeCloseTo(
            box[0] / box[1],
            6,
          );
          expect(sw).toBeCloseTo(box[0] / ACHIEVEMENT_BADGE_SIZE, 6);
          checked += 1;
          if (box[0] !== box[1]) nonSquare += 1;
        }
      }
    }

    /*
     * The counterpart for the whole sweep. If every layer in the game were
     * square, every assertion above would pass for a renderer that stretches —
     * which is precisely the state the reveal page was in for 35 badges.
     */
    expect(checked).toBeGreaterThan(100);
    expect(nonSquare, 'no non-square layer exists, so this proves nothing').toBeGreaterThan(0);
  });

  it('is drawn through this component on both screens, and by nothing else', () => {
    /*
     * Source-shape, and narrow: it proves the two call sites are written this
     * way, not that they are reached. What it does buy is the thing that
     * actually went wrong — a second renderer with its own sizing rule.
     */
    const hud = readFileSync('src/ui/Hud.tsx', 'utf8');
    const board = readFileSync('src/ui/screens/AchievementsScreen.tsx', 'utf8');

    expect(hud).toMatch(/<AchievementArt/);
    expect(board).toMatch(/<AchievementArt/);

    // Neither screen builds achievement layers into `<img>` itself any more.
    for (const [name, source] of [
      ['Hud.tsx', hud],
      ['AchievementsScreen.tsx', board],
    ] as const) {
      expect(source, `${name} still maps layers to <img>`).not.toMatch(
        /layers\.map\([\s\S]{0,200}<img/,
      );
    }
  });
});
