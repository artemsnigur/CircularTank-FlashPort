/**
 * The off-screen markers — `PartInterface.handleEnemyMarkers` and
 * `markTheFlag`, over `PartGameArea`'s `outsideWindow` flags.
 *
 * Expected values come from the AS3 expressions, not from the module. The
 * rotations and frame numbers especially: those are `gotoAndStop` arguments and
 * fixed degrees in the source, so a marker aimed by a computed bearing would
 * pass any "it points roughly there" test and be wrong everywhere.
 */
import { describe, expect, it } from 'vitest';

import {
  FLAG_FRAME,
  FLAG_MARKER_INSET,
  FLAG_PULSE_FRAMES,
  FLAG_PULSE_MAX,
  FLAG_PULSE_MIN,
  enemyMarker,
  flagMarker,
  flagPulseScale,
  markersApply,
  outsideWindow,
} from './offScreenMarkers';

/** A camera showing 640x400 of the world, scrolled to (200, 100). */
const view = { x: 200, y: 100, width: 640, height: 400 };
const subject = (x: number, y: number) => ({ x, y, halfWidth: 10, halfHeight: 10 });

describe('outsideWindow', () => {
  it('reports a subject in the middle as inside', () => {
    expect(outsideWindow(subject(500, 300), view).outside).toBe(false);
  });

  it('needs the whole box past the edge, not just the centre', () => {
    // `:4763` compares `x + width/2` — an enemy straddling the left edge is
    // still partly visible and gets no marker. Half-in is the case a centre-
    // only test gets wrong, and it is the common one.
    expect(outsideWindow(subject(195, 300), view).outside).toBe(false); // right edge at 205
    expect(outsideWindow(subject(189, 300), view).outside).toBe(true); // right edge at 199
  });

  it('names the edge it went past', () => {
    expect(outsideWindow(subject(100, 300), view)).toMatchObject({ left: true, right: false });
    expect(outsideWindow(subject(900, 300), view)).toMatchObject({ right: true, left: false });
    expect(outsideWindow(subject(500, 50), view)).toMatchObject({ top: true, bottom: false });
    expect(outsideWindow(subject(500, 600), view)).toMatchObject({ bottom: true, top: false });
  });

  it('can be past two edges at once', () => {
    // The corner case the diagonal rotations exist for.
    expect(outsideWindow(subject(100, 50), view)).toMatchObject({ left: true, top: true });
  });

  /**
   * `:4759` gates the whole block on not teleporting, and `:4796` clears every
   * flag. Its counterpart sits beside it: the same position *without* the flag
   * is outside, so this is the teleport rule and not a broken predicate.
   */
  it('never marks a teleporting enemy', () => {
    expect(outsideWindow(subject(100, 300), view, true).outside).toBe(false);
    expect(outsideWindow(subject(100, 300), view, false).outside).toBe(true);
  });
});

describe('markersApply', () => {
  it('is off when the room fits inside the view', () => {
    // Nothing can be off screen, so the AS3 skips the whole pass (`:1073`).
    expect(markersApply({ width: 640, height: 400 }, view)).toBe(false);
  });

  it('is on as soon as the room is bigger in either direction', () => {
    expect(markersApply({ width: 900, height: 400 }, view)).toBe(true);
    expect(markersApply({ width: 640, height: 720 }, view)).toBe(true);
  });

  /**
   * **The live-camera consequence.** A 640x720 room is taller than the AS3's
   * frozen 400 and would always get markers; on a phone the view is ~1385 tall
   * and sees the whole room, so it must not.
   */
  it('is off on a room a tall viewport can see whole', () => {
    expect(markersApply({ width: 640, height: 720 }, { x: 0, y: 0, width: 640, height: 1385 }))
      .toBe(false);
  });
});

describe('an enemy marker', () => {
  const screenOf = (x: number, y: number) => ({ x: x - view.x, y: y - view.y });

  it('pins to the left edge and points left', () => {
    const where = outsideWindow(subject(100, 300), view);
    const marker = enemyMarker(where, screenOf(100, 300), view);

    expect(marker.x).toBe(0);
    expect(marker.y).toBe(200);
    expect(marker.rotation).toBe(180);
  });

  it('pins to the right edge and points right', () => {
    const where = outsideWindow(subject(1000, 300), view);
    const marker = enemyMarker(where, screenOf(1000, 300), view);

    expect(marker.x).toBe(view.width);
    expect(marker.rotation).toBe(0);
  });

  it('points up on the top edge and down on the bottom', () => {
    const top = enemyMarker(outsideWindow(subject(500, 50), view), screenOf(500, 50), view);
    const bottom = enemyMarker(outsideWindow(subject(500, 600), view), screenOf(500, 600), view);

    expect(top).toMatchObject({ y: 0, rotation: 270 });
    expect(bottom).toMatchObject({ y: view.height, rotation: 90 });
  });

  it('takes a diagonal in each corner', () => {
    // `:614-628`, all four, because a single mis-signed corner is invisible
    // until a player watches that one corner.
    const at = (x: number, y: number) =>
      enemyMarker(outsideWindow(subject(x, y), view), screenOf(x, y), view).rotation;

    expect(at(100, 50)).toBe(225); // top-left
    expect(at(100, 600)).toBe(135); // bottom-left
    expect(at(1000, 50)).toBe(315); // top-right
    expect(at(1000, 600)).toBe(45); // bottom-right
  });

  it('doubles a boss`s marker and leaves an ordinary one alone', () => {
    const where = outsideWindow(subject(100, 300), view);

    expect(enemyMarker(where, screenOf(100, 300), view, { boss: true }).scale).toBe(2);
    expect(enemyMarker(where, screenOf(100, 300), view).scale).toBe(1);
  });
});

describe('the Defense danger frame', () => {
  const below = outsideWindow(subject(500, 600), view);
  const screen = { x: 300, y: 500 };

  it('turns red for an enemy coming from below on a Defense level', () => {
    expect(enemyMarker(below, screen, view, { defense: true }).danger).toBe(true);
  });

  it('does not on any other level', () => {
    // The counterpart on the identical input: without it, "danger" would be
    // satisfied by a build that reddened every downward marker in the game.
    expect(enemyMarker(below, screen, view, { defense: false }).danger).toBe(false);
  });

  it('does not for a DamageAddict, which never reaches the line', () => {
    // `:598` excludes it by name — it dies on its own timer.
    expect(enemyMarker(below, screen, view, { defense: true, damageAddict: true }).danger).toBe(
      false,
    );
  });

  it('does not for an enemy above, even on Defense', () => {
    // The line is at the bottom; a marker pointing up is not a warning about
    // it. This is the branch the `rotation === 90` test sits inside.
    const above = outsideWindow(subject(500, 50), view);

    expect(enemyMarker(above, { x: 300, y: 0 }, view, { defense: true }).danger).toBe(false);
  });
});

describe('the flag marker', () => {
  it('is absent while the flag is on screen', () => {
    expect(flagMarker({ x: 500, y: 300 }, view)).toBeNull();
  });

  it('is absent when there is no flag at all', () => {
    // `:421` — the level has no flag, or the last one was taken.
    expect(flagMarker(null, view)).toBeNull();
  });

  it('slides along the top edge for a flag above', () => {
    const marker = flagMarker({ x: 500, y: 20 }, view);

    expect(marker).toEqual({ x: 300, y: FLAG_MARKER_INSET, frame: FLAG_FRAME.top });
  });

  it('slides along the bottom edge for a flag below', () => {
    const marker = flagMarker({ x: 500, y: 900 }, view);

    expect(marker).toMatchObject({ y: view.height - FLAG_MARKER_INSET, frame: FLAG_FRAME.bottom });
  });

  it('sits on the left and right edges for a flag to the side', () => {
    expect(flagMarker({ x: 20, y: 300 }, view)).toMatchObject({
      x: FLAG_MARKER_INSET,
      frame: FLAG_FRAME.left,
    });
    expect(flagMarker({ x: 1200, y: 300 }, view)).toMatchObject({
      x: view.width - FLAG_MARKER_INSET,
      frame: FLAG_FRAME.right,
    });
  });

  it('takes the nearest corner when the flag is diagonal', () => {
    // All four frames, since they are directional art: a swapped pair points
    // the player at the opposite corner and nothing in the geometry notices.
    expect(flagMarker({ x: 20, y: 20 }, view)?.frame).toBe(FLAG_FRAME.topLeft);
    expect(flagMarker({ x: 20, y: 900 }, view)?.frame).toBe(FLAG_FRAME.bottomLeft);
    expect(flagMarker({ x: 1200, y: 20 }, view)?.frame).toBe(FLAG_FRAME.topRight);
    expect(flagMarker({ x: 1200, y: 900 }, view)?.frame).toBe(FLAG_FRAME.bottomRight);
  });

  it('keeps a sliding marker inside the edge it slides on', () => {
    // `:352` clamps to `[inset, extent - inset]`. Reaching it needs a flag
    // *just* inside the edge horizontally — 200.5 against a view starting at
    // 200 is a screen x of 0.5 — while being far enough above to be outside.
    // A flag at 205 does not reach it, which is what this test asserted first.
    expect(flagMarker({ x: 200.5, y: 20 }, view)?.x).toBe(FLAG_MARKER_INSET);
    expect(flagMarker({ x: 839.5, y: 20 }, view)?.x).toBe(view.width - FLAG_MARKER_INSET);

    // The counterpart: comfortably inside, the marker tracks the flag rather
    // than sticking to the inset.
    expect(flagMarker({ x: 500, y: 20 }, view)?.x).toBe(300);
  });
});

describe('the flag marker`s pulse', () => {
  it('starts large and shrinks', () => {
    // `markerFlagInTween` is 1.2 -> 0.9 and runs first (`:721`). Starting small
    // is the plausible wrong reading, and it inverts the heartbeat.
    expect(flagPulseScale(0)).toBeCloseTo(FLAG_PULSE_MAX, 6);
    expect(flagPulseScale(FLAG_PULSE_FRAMES)).toBeCloseTo(FLAG_PULSE_MIN, 6);
  });

  it('returns to full size at the end of the cycle', () => {
    expect(flagPulseScale(FLAG_PULSE_FRAMES * 2)).toBeCloseTo(FLAG_PULSE_MAX, 6);
  });

  it('stays within its two bounds throughout', () => {
    for (let frame = 0; frame <= 120; frame += 1) {
      const scale = flagPulseScale(frame);
      expect(scale, `frame ${frame}`).toBeGreaterThanOrEqual(FLAG_PULSE_MIN - 1e-9);
      expect(scale, `frame ${frame}`).toBeLessThanOrEqual(FLAG_PULSE_MAX + 1e-9);
    }
  });

  /**
   * The two halves are **different curves** — `easeOut` down, `easeIn` up — so
   * the pulse is asymmetric. A sine would stay in bounds, hit both ends and
   * pass every test above; this is what separates it.
   */
  it('is asymmetric, because the halves ease differently', () => {
    const quarter = FLAG_PULSE_FRAMES / 2;
    // easeOut is fast then slow: a quarter in, it is already past halfway down.
    const down = flagPulseScale(quarter);
    // easeIn is slow then fast: a quarter into the rise, barely off the floor.
    const up = flagPulseScale(FLAG_PULSE_FRAMES + quarter);
    const midpoint = (FLAG_PULSE_MAX + FLAG_PULSE_MIN) / 2;

    expect(down).toBeLessThan(midpoint);
    expect(up).toBeLessThan(midpoint);
  });

  it('repeats forever without a caller resetting the count', () => {
    // The scene passes a monotonically increasing frame count, so the cycle has
    // to wrap here. Without the modulo this drifts off the top of the curve.
    expect(flagPulseScale(1000 * FLAG_PULSE_FRAMES * 2 + 3)).toBeCloseTo(flagPulseScale(3), 6);
  });
});
