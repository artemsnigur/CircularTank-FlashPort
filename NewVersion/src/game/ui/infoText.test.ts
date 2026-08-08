/**
 * The hover panel's geometry, keep-alive and rich text — `PartInfoText.as`.
 */
import { describe, expect, it } from 'vitest';

import { achievementRuns, placeInfoText } from './infoTextPlacement';
import { InfoTextKeepAlive } from './infoTextState';

/** A 100x20 text box at the cursor, so the arithmetic is easy to check by hand. */
const base = { mouseX: 500, mouseY: 300, textWidth: 100, textHeight: 20 };

describe('the fixed corner', () => {
  /**
   * Four combinations, computed by hand from `:362-386` and `:308`.
   *
   * The panel is `round(textWidth) + 32` by `round(textHeight) + 32`, so
   * 132 x 52 here. Asserting the *position* rather than "it is positioned"
   * is the point: an implementation that always opened down-and-right would
   * satisfy a presence check and be wrong for three of these four.
   */
  // The text origin carries `:363-364`'s `- 1` and `- 2` before the 16px gap is
  // added — easy to drop when computing by hand, and this table did on the
  // first pass. The background does not carry them, which is why the two
  // origins differ rather than being one value.
  const cases = [
    // showLeft, showTop, expected x, y, textX, textY
    [true, true, 500, 300, 500 - 1 + 16, 300 - 2 + 16],
    [false, true, 500 - 132, 300, 500 - 1 - 100 - 16, 300 - 2 + 16],
    [true, false, 500, 300 - 52, 500 - 1 + 16, 300 - 2 - 20 - 16],
    [false, false, 500 - 132, 300 - 52, 500 - 1 - 100 - 16, 300 - 2 - 20 - 16],
  ] as const;

  it.each(cases)(
    'left=%s top=%s',
    (showLeft, showTop, x, y, textX, textY) => {
      const box = placeInfoText({ ...base, showLeft, showTop });
      expect(box.width, 'text + 32 padding').toBe(132);
      expect(box.height).toBe(52);
      expect({ x: box.x, y: box.y }).toEqual({ x, y });
      expect({ textX: box.textX, textY: box.textY }).toEqual({ textX, textY });
    },
  );

  /**
   * The counterpart to the table: the four corners are genuinely four
   * positions. A stub returning the cursor for everything would pass any
   * single row above.
   */
  it('puts the four corners in four places', () => {
    const seen = new Set(
      [
        [true, true],
        [true, false],
        [false, true],
        [false, false],
      ].map(([l, t]) => {
        const b = placeInfoText({ ...base, showLeft: l, showTop: t });
        return `${b.x},${b.y}`;
      }),
    );
    expect(seen.size).toBe(4);
  });

  /** `:304-306` — a structured renderer can demand more room. */
  it('widens for a renderer that asks for more', () => {
    const plain = placeInfoText({ ...base, showLeft: true, showTop: true });
    const wide = placeInfoText({
      ...base,
      showLeft: true,
      showTop: true,
      additionalWidth: 40,
      additionalHeight: 44,
    });
    expect(wide.width - plain.width).toBe(40);
    expect(wide.height - plain.height).toBe(44);
    // `:363` — the extra width shifts the text back, not the background.
    expect(wide.textX).toBe(plain.textX - 40);
  });
});

describe('the keep-alive', () => {
  /**
   * **The T80 pattern, and the trap it exists to avoid.**
   *
   * `update()` clears `showText` every frame (`:165`) and each trigger
   * re-asserts it while hovered (`ImageEnemy.as:186`). Wiring that as a
   * start/stop toggle is the mistake `SoundManager`'s loops document: a caller
   * that fires once on the triggering event gets one frame and then silence.
   * Here it would be one frame of panel.
   *
   * Driven as a pair — held across several frames, then released — because
   * "always visible" and "never visible" each satisfy one half alone.
   */
  it('stays up while re-asserted and closes when it stops', () => {
    const keep = new InfoTextKeepAlive();
    const request = { text: 'Increases the speed of the tank.', showLeft: false, showTop: false };

    for (let frame = 0; frame < 5; frame += 1) {
      keep.keepAlive(request);
      expect(keep.tick(), `frame ${frame}`).toBe(request);
    }

    // Nothing re-asserts: the very next frame closes it.
    expect(keep.tick(), 'first frame after release').toBeNull();
    expect(keep.tick(), 'and it stays closed').toBeNull();
  });

  /**
   * A single assertion survives exactly one frame — the behaviour that makes
   * this a keep-alive rather than a toggle.
   */
  it('does not latch on a single assertion', () => {
    const keep = new InfoTextKeepAlive();
    keep.keepAlive({ text: 'once', showLeft: true, showTop: true });

    expect(keep.tick()?.text).toBe('once');
    expect(keep.tick(), 'a toggle would still be showing here').toBeNull();
  });

  /** The last write wins, so moving between two triggers swaps the text. */
  it('takes the most recent request in a frame', () => {
    const keep = new InfoTextKeepAlive();
    keep.keepAlive({ text: 'first', showLeft: true, showTop: true });
    keep.keepAlive({ text: 'second', showLeft: true, showTop: true });
    expect(keep.tick()?.text).toBe('second');
  });
});

describe('an achievement tooltip is three styled runs', () => {
  /**
   * `Achievement.as:81` composes `title + "\n" + description + difficultyText`
   * and `:99` passes both lengths; `PartInfoText.as:199` styles the first
   * range and `:203` the last.
   *
   * Both lengths here are non-trivial — neither 0 nor the whole string — so an
   * implementation that styled everything, or only split in two, fails.
   */
  it('splits title, body and note at the given lengths', () => {
    const title = 'Graveyard';
    const description = 'Kill 100 enemies.';
    const note = '\n\n(Difficulty matters.)';
    const text = `${title}\n${description}${note}`;

    const runs = achievementRuns(text, title.length, note.length);

    expect(runs.map((r) => r.style)).toEqual(['title', 'body', 'note']);
    expect(runs[0].text).toBe(title);
    expect(runs[1].text).toBe(`\n${description}`);
    expect(runs[2].text).toBe(note);
    // Lossless: the runs are a partition of the original string.
    expect(runs.map((r) => r.text).join('')).toBe(text);
  });

  /**
   * `:197` and `:201` both guard on `!= 0`, so a zero length means "no run".
   * An unearned achievement has no difficulty note.
   */
  it('omits a run whose length is zero', () => {
    const runs = achievementRuns('Title\nBody', 5, 0);
    expect(runs.map((r) => r.style)).toEqual(['title', 'body']);
    expect(runs.map((r) => r.text).join('')).toBe('Title\nBody');
  });

  it('is a single body run when neither length is given', () => {
    const runs = achievementRuns('Just text', 0, 0);
    expect(runs).toEqual([{ text: 'Just text', style: 'body' }]);
  });

  /**
   * The AS3 slices with `infoText.length` for the tail, so a note longer than
   * the string would eat the title rather than throwing. Clamped so the runs
   * stay a partition whatever the caller passes.
   */
  it('clamps overlapping ranges instead of losing text', () => {
    const runs = achievementRuns('Short', 4, 99);
    expect(runs.map((r) => r.text).join('')).toBe('Short');
  });
});
