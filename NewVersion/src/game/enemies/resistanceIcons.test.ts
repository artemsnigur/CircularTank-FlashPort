/**
 * The badge mapping — `PartInfoText.as:404-497` and `ScreenEnemies.as:336-451`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  DAMAGE_TYPE_LABELS,
  ICON_ORDER,
  NONE_FRAME,
  iconFrame,
  resistanceBadges,
} from './resistanceIcons';
import { ENEMY_STATS } from './enemyStatsData';
import { buildBestiaryListing } from './enemyKnowledge';
import { RESISTANCE_ICON_CLIPS, RESISTANCE_ICON_SHAPE_IDS } from './resistanceIconArt';
import { shapeUrls } from '../../assets/registry';

const AS3 = readFileSync('../SWFimported/scripts/PartInfoText.as', 'utf8');
const SCREEN = readFileSync('../SWFimported/scripts/ScreenEnemies.as', 'utf8');

describe('the frame for each damage type comes from the AS3, not from us', () => {
  /**
   * **Derived, not restated.** `iconFrame` computes from `ICON_ORDER`, so a
   * test that listed the same eight names in the same order would be a
   * tautology — it would agree with a wrong order just as happily.
   *
   * Instead the cascade is parsed back out of `PartInfoText.as`: each
   * `theStrength == "X"` / `theWeakness == "X"` guard is followed by the
   * `gotoAndStop(N)` it selects, and that pairing is the expected value.
   */
  const cascade = (variable: string): Array<[string, number]> => {
    const pairs: Array<[string, number]> = [];
    const re = new RegExp(`${variable} == "(\\w+)"[\\s\\S]{0,80}?gotoAndStop\\((\\d+)\\)`, 'g');
    for (const m of AS3.matchAll(re)) pairs.push([m[1], Number(m[2])]);
    return pairs;
  };

  it('matches theStrength -> frame', () => {
    const pairs = cascade('theStrength');
    expect(pairs.length, 'the cascade shape changed').toBe(8);
    for (const [type, frame] of pairs) {
      expect(iconFrame(type as never, 'strength'), type).toBe(frame);
    }
  });

  it('matches theWeakness -> frame', () => {
    const pairs = cascade('theWeakness');
    expect(pairs.length).toBe(8);
    for (const [type, frame] of pairs) {
      expect(iconFrame(type as never, 'weakness'), type).toBe(frame);
    }
  });

  /**
   * The counterpart to both: strength and weakness frames must be *different*
   * for the same type. A mapping that ignored `kind` would satisfy one of the
   * two tables above and be wrong on the other — and the symptom (a green
   * "strong" badge where a red "weak" one belongs) is the kind of thing a
   * screenshot shows and a passing test does not.
   */
  it('gives a type two different frames', () => {
    for (const type of ICON_ORDER) {
      expect(iconFrame(type, 'strength'), type).not.toBe(iconFrame(type, 'weakness'));
    }
    const all = ICON_ORDER.flatMap((t) => [
      iconFrame(t, 'strength'),
      iconFrame(t, 'weakness'),
    ]);
    // 16 distinct frames, and none of them is the "none" badge.
    expect(new Set(all).size).toBe(16);
    expect(all).not.toContain(NONE_FRAME);
  });

  it('refuses an unknown type rather than defaulting to the empty badge', () => {
    expect(() => iconFrame('Sonic' as never, 'strength')).toThrow(/Sonic/);
  });

  /** `ScreenEnemies.as:344` — the one label that is not its own key. */
  it('labels FireLava as the AS3 spells it', () => {
    expect(SCREEN).toContain('"Fire & lava"');
    expect(DAMAGE_TYPE_LABELS.FireLava).toBe('Fire & lava');
    expect(DAMAGE_TYPE_LABELS.Explosions).toBe('Explosions');
  });
});

describe('badges for a real enemy', () => {
  /**
   * **Against a named entry, not against "some icons appeared".**
   *
   * `Accelerating` is the useful case: two strengths *and* a weakness, with
   * three different values, so a builder that dropped the second entry, ignored
   * `kind`, or reused one percentage for the row would all fail here.
   */
  it('matches Accelerating entry for entry', () => {
    const stats = ENEMY_STATS.Accelerating;
    // Guards the fixture: if the data changes, this test should be updated
    // deliberately rather than silently asserting about a different enemy.
    expect(stats.strengths).toEqual([
      { damageType: 'Explosions', value: 0.25 },
      { damageType: 'Magic', value: 0.5 },
    ]);
    expect(stats.weaknesses).toEqual([{ damageType: 'Food', value: 0.75 }]);

    expect(resistanceBadges(stats.strengths, 'strength')).toEqual([
      { frame: 2, damageType: 'Explosions', label: 'Explosions', percent: '25%' },
      { frame: 9, damageType: 'Magic', label: 'Magic', percent: '50%' },
    ]);
    expect(resistanceBadges(stats.weaknesses, 'weakness')).toEqual([
      { frame: 16, damageType: 'Food', label: 'Food', percent: '75%' },
    ]);
  });

  /**
   * The counterpart on the identical input: the *same* resistances read as the
   * other kind produce different frames. Without this, a `kind`-blind
   * implementation passes the test above.
   */
  it('reads the same list differently as strengths and as weaknesses', () => {
    const list = ENEMY_STATS.Accelerating.strengths;
    const asStrength = resistanceBadges(list, 'strength').map((b) => b.frame);
    const asWeakness = resistanceBadges(list, 'weakness').map((b) => b.frame);
    expect(asStrength).toEqual([2, 9]);
    expect(asWeakness).toEqual([10, 17]);
  });

  /** `ScreenEnemies.as:384-391` — an empty table still draws one badge. */
  it('gives an enemy with no resistances the "none" badge, not an empty row', () => {
    expect(ENEMY_STATS.Basic.strengths).toEqual([]);
    expect(resistanceBadges([], 'strength')).toEqual([
      { frame: NONE_FRAME, damageType: null, label: 'None', percent: '' },
    ]);
    // And its counterpart: a non-empty table never produces the none badge.
    expect(
      resistanceBadges(ENEMY_STATS.Crazy.strengths, 'strength').map((b) => b.frame),
    ).not.toContain(NONE_FRAME);
  });

  it('rounds the percentage instead of printing a float artefact', () => {
    // 0.05 * 100 is 5.000000000000001 in binary floating point.
    expect(resistanceBadges([{ damageType: 'Ice', value: 0.05 }], 'strength')[0].percent)
      .toBe('5%');
  });
});

describe('the listing withholds resistances exactly as it withholds descriptions', () => {
  /**
   * The gate is the whole reason this data goes through the listing rather than
   * being looked up in the component. Driven as a pair on one call: the met
   * enemy has badges, the unmet one has none — "everything hidden" and
   * "nothing hidden" each satisfy one half alone.
   */
  it('sends badges for a met enemy and none for an unmet one', () => {
    const listing = buildBestiaryListing(['Basic']);
    const basic = listing.entries.find((e) => e.id === 'Basic');
    const ghost = listing.entries.find((e) => e.id === 'Ghost');

    expect(basic?.known).toBe(true);
    // Basic has no resistances at all, so this is the "none" badge — which is
    // still one badge. That distinction is the point.
    expect(basic?.strengths).toHaveLength(1);
    expect(basic?.strengths[0].frame).toBe(NONE_FRAME);

    expect(ghost?.known).toBe(false);
    expect(ghost?.strengths).toEqual([]);
    expect(ghost?.weaknesses).toEqual([]);
    expect(ghost?.description).toBeUndefined();
  });

  it('sends real badges once the enemy is met', () => {
    const met = buildBestiaryListing(['Accelerating']).entries.find(
      (e) => e.id === 'Accelerating',
    );
    expect(met?.strengths.map((b) => b.label)).toEqual(['Explosions', 'Magic']);
    expect(met?.weaknesses.map((b) => b.percent)).toEqual(['75%']);
  });
});

describe('the icon clips', () => {
  /**
   * **The orphan check, the same discipline the projectile art pass used.**
   *
   * Two failure modes, and they look identical in a screenshot of a badge that
   * happens to render: a frame referencing a shape the sync never copied (a
   * missing layer, silently invisible), and a shape copied for no frame (dead
   * weight that hides a mapping mistake).
   */
  it('draws only shapes the extraction has, and every shape it copies', () => {
    // No orphans in the table itself: the id list is exactly what the frames
    // reference, in both directions.
    const drawn = [
      ...new Set(Object.values(RESISTANCE_ICON_CLIPS).flatMap((c) => c.frames.flat())),
    ].sort((a, b) => a - b);
    expect(drawn).toEqual([...RESISTANCE_ICON_SHAPE_IDS]);

    // …and every one of them is a real file in the read-only extraction.
    const missing = RESISTANCE_ICON_SHAPE_IDS.filter(
      (id) => !existsSync(`../SWFimported/shapes/${id}.svg`),
    );
    expect(missing, 'shape ids with no SVG in SWFimported/shapes').toEqual([]);

    // …and `assets:sync` actually copied them, which is the step that ships.
    // Checked against the registry rather than the filesystem, because the
    // registry is what `ResistanceIcon` resolves through — a file present on
    // disk but outside the glob would still 404.
    const unsynced = RESISTANCE_ICON_SHAPE_IDS.filter((id) => !(`${id}.svg` in shapeUrls));
    expect(unsynced, 'shape ids the asset sync did not curate').toEqual([]);
  });

  /**
   * The six shapes that belong to `IconStrongWeak2` alone.
   *
   * **T100 pinned these as "synced and undrawn by intent"; T101 draws them.**
   * The next-level preview calls `addStrengthsAndWeaknessIcons(type, "Small",
   * …)`, which constructs 1018 unconditionally (`PartInfoText.as:404`, `:456`),
   * so the clip T100 copied on the projectile precedent — copy the whole clip,
   * the pass that draws it needs no asset work — is now the one the panel uses.
   * That precedent paid for itself exactly one pass later.
   *
   * Still pinned as an exact set rather than a count: the two clips must not
   * quietly converge, because they differ on precisely these six glyphs and a
   * site drawing the wrong one looks entirely correct.
   */
  it('has exactly six shapes unique to the panel clip', () => {
    const drawnByScreen = new Set(RESISTANCE_ICON_CLIPS.IconStrongWeak.frames.flat());
    const panelOnly = [...new Set(RESISTANCE_ICON_CLIPS.IconStrongWeak2.frames.flat())]
      .filter((id) => !drawnByScreen.has(id))
      .sort((a, b) => a - b);
    expect(panelOnly).toEqual([1001, 1006, 1007, 1011, 1016, 1017]);
  });

  it('has 17 frames in each clip, laid out blank + 8 + 8', () => {
    for (const [name, clip] of Object.entries(RESISTANCE_ICON_CLIPS)) {
      expect(clip.frames.length, name).toBe(17);
      // Frame 1 is the lone "none" shape; every other frame is three layers.
      expect(clip.frames[0].length, `${name} frame 1`).toBe(1);
      for (let f = 1; f < 17; f += 1) {
        expect(clip.frames[f].length, `${name} frame ${f + 1}`).toBe(3);
      }
    }
  });

  /**
   * The badge colour is carried by the outer two layers, and it is what tells a
   * strength from a weakness at a glance. Frames 2-9 must share one pair and
   * 10-17 another, and the two pairs must differ — otherwise both rows render
   * the same colour and the screen silently lies.
   */
  it('uses one backing pair for strengths and a different one for weaknesses', () => {
    for (const [name, clip] of Object.entries(RESISTANCE_ICON_CLIPS)) {
      const strengthPairs = new Set(
        clip.frames.slice(1, 9).map((f) => `${f[0]}/${f[2]}`),
      );
      const weaknessPairs = new Set(
        clip.frames.slice(9, 17).map((f) => `${f[0]}/${f[2]}`),
      );
      expect(strengthPairs.size, `${name} strengths`).toBe(1);
      expect(weaknessPairs.size, `${name} weaknesses`).toBe(1);
      expect([...strengthPairs][0]).not.toBe([...weaknessPairs][0]);
    }
  });
});
