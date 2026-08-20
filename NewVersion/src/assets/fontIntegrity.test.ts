/**
 * The shipped TTFs must have a cmap a browser will accept.
 *
 * ── The bug this pins ─────────────────────────────────────────────────────
 * `49_Main_font2_Arial.ttf` came out of JPEXS with a format-4 cmap whose last
 * two segments **both ended at 0xFFFF**. The spec requires strictly increasing
 * end codes with a single terminal 0xFFFF segment, so Chrome's sanitiser threw
 * the whole font out:
 *
 *     Failed to decode downloaded font: 49_Main_font2_Arial.ttf
 *     OTS parsing error: cmap: Out of order end range (65535 <= 65535)
 *
 * Every page then rendered `--font-body` in a system fallback. Nothing failed;
 * the text simply was not in the face it was supposed to be, on every screen,
 * for as long as nobody read the console.
 *
 * ── Why a test rather than a note ─────────────────────────────────────────
 * The repaired font is an authored asset that **shadows** the extracted one by
 * having the same name (`assets-authored/README.md` — same-name replacement is
 * the sanctioned mechanism, and `assets:sync` reports it). That makes it
 * exactly the kind of fix that a re-sync, a reordered copy step or a tidy-up of
 * `assets-authored/` could silently undo, putting the broken file back with no
 * error anywhere.
 *
 * The runtime self-test in `fontLoader.ts` does notice — it is what surfaced
 * this — but only in a browser, only at runtime, and only as a `console.warn`.
 * This fails the build instead.
 *
 * ── What it does not check ────────────────────────────────────────────────
 * A strictly increasing cmap is one thing OTS requires, not all of them. This
 * says "the defect that broke this font is absent", not "the font is valid".
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Every format-4 subtable's end codes, straight off the file's bytes. */
function format4EndCodes(bytes: Buffer): { platform: number; ends: number[] }[] {
  const u16 = (at: number) => bytes.readUInt16BE(at);
  const u32 = (at: number) => bytes.readUInt32BE(at);

  const tables = u16(4);
  const out: { platform: number; ends: number[] }[] = [];

  for (let i = 0; i < tables; i += 1) {
    const rec = 12 + i * 16;
    if (bytes.toString('latin1', rec, rec + 4) !== 'cmap') continue;

    const cmapAt = u32(rec + 8);
    const subtables = u16(cmapAt + 2);
    for (let t = 0; t < subtables; t += 1) {
      const entry = cmapAt + 4 + t * 8;
      const platform = u16(entry);
      const at = cmapAt + u32(entry + 4);
      if (u16(at) !== 4) continue;

      // format(2) language(2) segCountX2(2) searchRange(2) entrySelector(2)
      // rangeShift(2) — endCode[] starts 14 bytes in.
      const segments = u16(at + 6) / 2;
      const ends: number[] = [];
      for (let s = 0; s < segments; s += 1) ends.push(u16(at + 14 + s * 2));
      out.push({ platform, ends });
    }
  }
  return out;
}

const FONTS = ['49_Main_font2_Arial.ttf', '50_Main_font_JG.ttf'];

describe('the shipped fonts have a cmap a browser will accept', () => {
  for (const file of FONTS) {
    it(`${file} has strictly increasing format-4 end codes`, () => {
      const bytes = readFileSync(`src/assets/fonts/${file}`);
      const subtables = format4EndCodes(bytes);

      // A font with no format-4 subtable would pass the loop below in silence,
      // and that is also not a font this project can use.
      expect(subtables.length, `${file} has no format-4 cmap subtable`).toBeGreaterThan(0);

      for (const { platform, ends } of subtables) {
        for (let i = 1; i < ends.length; i += 1) {
          expect(
            ends[i],
            `${file} platform ${platform}: segment ${i} ends at ` +
              `0x${ends[i].toString(16)}, which is not past segment ${i - 1}'s ` +
              `0x${ends[i - 1].toString(16)} — this is the OTS rejection`,
          ).toBeGreaterThan(ends[i - 1]);
        }

        // The spec's terminator. Its absence is a different defect that would
        // also be rejected, so it is worth naming separately.
        expect(ends[ends.length - 1], `${file} platform ${platform} has no 0xFFFF terminator`).toBe(
          0xffff,
        );
      }
    });
  }

  it('the repaired font is the one that ships, not the extracted original', () => {
    /*
     * The counterpart, and the reason this file exists at all.
     *
     * `src/assets/` is a build product: `assets:sync` copies the extraction
     * first and `assets-authored/` second, so the authored file wins by
     * arriving last. If that order ever changes, the assertions above start
     * failing — but only if the *extracted* file is genuinely still broken,
     * which this pins so the test cannot quietly become a tautology.
     */
    const extracted = readFileSync('../SWFimported/fonts/49_Main_font2_Arial.ttf');
    const broken = format4EndCodes(extracted).some(({ ends }) =>
      ends.some((end, i) => i > 0 && end <= ends[i - 1]),
    );
    expect(broken, 'the extracted font is no longer broken — this repair may be obsolete').toBe(
      true,
    );

    const shipped = readFileSync('src/assets/fonts/49_Main_font2_Arial.ttf');
    expect(shipped.equals(extracted), 'the broken extracted font is what shipped').toBe(false);
  });
});
