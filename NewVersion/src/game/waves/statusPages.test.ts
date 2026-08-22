import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildStatusPages, initialPageIndex, revealPages, unlockSummary } from './statusPages';
import { ACHIEVEMENTS } from '../achievements/achievementData';
import { BESTIARY } from '../enemies/bestiaryData';
import { LEVELS } from '../levels/levelData';
import { discoverEnemies } from '../enemies/enemyKnowledge';

const HUD = readFileSync('src/ui/Hud.tsx', 'utf8');

describe('the page count', () => {
  it('is 1 + achievements + enemies', () => {
    const pages = buildStatusPages({
      newAchievements: ['Kills1', 'Money1'],
      newEnemies: ['Fast', 'Ghost', 'Medic'],
    });

    expect(pages).toHaveLength(1 + 2 + 3);
  });

  it('collapses to a single page with nothing new', () => {
    const pages = buildStatusPages({ newAchievements: [], newEnemies: [] });

    expect(pages).toHaveLength(1);
    expect(pages[0].type).toBe('Standard');
  });

  it('always leads with the results, whatever else there is', () => {
    for (const input of [
      { newAchievements: [], newEnemies: [] },
      { newAchievements: ['Kills1'], newEnemies: [] },
      { newAchievements: [], newEnemies: ['Fast'] },
      { newAchievements: ['Kills1'], newEnemies: ['Fast'] },
    ]) {
      expect(buildStatusPages(input)[0].type).toBe('Standard');
    }
  });

  it('orders achievements before enemies', () => {
    // `:405-429` appends achievements, then enemies. The array order is what
    // the back arrow walks, so swapping them would reverse the reveal.
    const pages = buildStatusPages({
      newAchievements: ['Kills1'],
      newEnemies: ['Fast'],
    });

    expect(pages.map((p) => p.type)).toEqual(['Standard', 'Achievement', 'Enemy']);
  });
});

/**
 * "Newest-first" is where the cursor starts, not a reversed list.
 */
describe('the screen opens on the RESULTS — a deliberate divergence', () => {
  /**
   * **These assertions were replaced, not repaired.** They used to require
   * `initialPageIndex` to be `pages.length - 1`, which was an accurate port of
   * `ScreenStatus:431` and is no longer what this game does.
   *
   * The divergence is asserted *against* the AS3's rule rather than simply
   * stating the new one, so it stays visible as a choice: if someone restores
   * the original ordering these fail and say why.
   */
  it('opens on the results even when reveals exist', () => {
    const pages = buildStatusPages({
      newAchievements: ['Kills1'],
      newEnemies: ['Fast', 'Ghost'],
    });

    expect(initialPageIndex(pages)).toBe(0);
    expect(pages[initialPageIndex(pages)]).toMatchObject({ type: 'Standard' });
    // The AS3's answer, stated so the difference is the point.
    expect(initialPageIndex(pages)).not.toBe(pages.length - 1);
  });

  it('opens on the results when nothing is new, exactly as the AS3 did', () => {
    // Unchanged behaviour — with no reveals both models agree, which is why
    // the divergence went unnoticed until a first clear.
    const pages = buildStatusPages({ newAchievements: [], newEnemies: [] });
    expect(initialPageIndex(pages)).toBe(0);
  });

  it('keeps the reveal order and content untouched', () => {
    // Only the *presentation* moved. The stack is still results ->
    // achievements -> enemies, in that order, with the same entries.
    const pages = buildStatusPages({
      newAchievements: ['Kills1', 'Money1'],
      newEnemies: ['Fast', 'Ghost'],
    });

    expect(pages.map((p) => p.type)).toEqual([
      'Standard',
      'Achievement',
      'Achievement',
      'Enemy',
      'Enemy',
    ]);
  });
});

describe('the reveals become a pop-up', () => {
  it('excludes the results from what the pop-up shows', () => {
    const pages = buildStatusPages({ newAchievements: ['Kills1'], newEnemies: ['Fast'] });
    expect(revealPages(pages).map((p) => p.type)).toEqual(['Achievement', 'Enemy']);
  });

  it('has nothing to show when nothing was unlocked', () => {
    // Which is what keeps the pop-up closed on an ordinary level.
    expect(revealPages(buildStatusPages({ newAchievements: [], newEnemies: [] }))).toEqual([]);
  });

  it('leaves a summary line naming every unlock', () => {
    // The information must survive the pop-up being dismissed. In the AS3 it
    // could not be missed — it was a page you walked through.
    const pages = buildStatusPages({ newAchievements: ['Kills1'], newEnemies: ['Fast'] });
    const line = unlockSummary(pages);

    expect(line).toContain('Fast');
    expect(line).toMatch(/^Unlocked: /);
  });

  it('returns no summary when there is nothing to summarise', () => {
    // Pinned beside the case above, so "always shows a line" fails.
    expect(unlockSummary(buildStatusPages({ newAchievements: [], newEnemies: [] }))).toBeNull();
  });
});

describe('initialPageIndex edge cases', () => {
  it('never returns a negative index', () => {
    expect(initialPageIndex([])).toBe(0);
  });
});

describe('achievement pages read the real specs', () => {
  it('take the title and description from the 36, not invented copy', () => {
    const spec = ACHIEVEMENTS.find((s) => s.id === 'Kills1')!;
    const [, page] = buildStatusPages({ newAchievements: ['Kills1'], newEnemies: [] });

    expect(page).toMatchObject({
      type: 'Achievement',
      id: 'Kills1',
      title: spec.title,
      difficultyMatters: spec.difficultyMatters,
    });
    expect(spec.title).toBe('GRAVEYARD');
  });

  it('unescape the newlines the generated data carries', () => {
    // `achievementData.ts` stores "\\n" literally, which would render as
    // backslash-n rather than a break.
    const [, page] = buildStatusPages({ newAchievements: ['MaxedPrimary1'], newEnemies: [] });

    expect(page).toMatchObject({ type: 'Achievement' });
    expect((page as { description: string }).description).not.toContain('\\n');
    expect((page as { description: string }).description).toContain('level 10');
  });

  it('drop an id with no spec rather than showing a blank page', () => {
    const pages = buildStatusPages({ newAchievements: ['NotReal'], newEnemies: [] });
    expect(pages).toHaveLength(1);
  });

  it('carry every one of the 36 without throwing', () => {
    const pages = buildStatusPages({
      newAchievements: ACHIEVEMENTS.map((s) => s.id),
      newEnemies: [],
    });
    expect(pages).toHaveLength(1 + ACHIEVEMENTS.length);
  });
});

describe('enemy pages use the display names discovery produced', () => {
  it('match on displayName, not on a re-derived id', () => {
    // `discoverEnemies` maps "ScaredGhost" to "Scared Ghost". Re-deriving here
    // is how the two spellings drift apart.
    //
    // World 9 no longer exists — the campaign is four worlds (T252) — and
    // `discoverEnemies` on a level that is not there finds nothing, which made
    // this pass its `toHaveLength` on two empty lists. The last world's last
    // level is the deepest roster the campaign has.
    const result = discoverEnemies([], LEVELS.length, LEVELS[LEVELS.length - 1].length);
    expect(result.newlyDiscovered.length).toBeGreaterThan(0);

    const pages = buildStatusPages({
      newAchievements: [],
      newEnemies: result.newlyDiscovered,
    });
    expect(pages).toHaveLength(1 + result.newlyDiscovered.length);
  });

  it('resolve the multi-word names specifically', () => {
    for (const name of ['Scared Ghost', 'Damage Addict', 'Grappling Hook']) {
      const [, page] = buildStatusPages({ newAchievements: [], newEnemies: [name] });
      expect(page, name).toMatchObject({ type: 'Enemy', displayName: name });
    }
  });

  it('take the description from the bestiary, the same source the screen uses', () => {
    const entry = BESTIARY.find((e) => e.displayName === 'Fast')!;
    const [, page] = buildStatusPages({ newAchievements: [], newEnemies: ['Fast'] });

    expect(page).toMatchObject({ type: 'Enemy', description: entry.description });
  });

  it('drop an unknown name rather than showing a blank page', () => {
    expect(buildStatusPages({ newAchievements: [], newEnemies: ['Wyvern'] })).toHaveLength(1);
  });

  it('cover every enemy the bestiary knows', () => {
    const pages = buildStatusPages({
      newAchievements: [],
      newEnemies: BESTIARY.map((e) => e.displayName),
    });
    expect(pages).toHaveLength(1 + BESTIARY.length);
  });
});

/**
 * The overlay's own rules, which only exist in the component.
 */
describe('the overlay, after the T44 divergence', () => {
  it('opens through the named function rather than a bare 0', () => {
    // The divergence has to have somewhere to be read and reverted.
    expect(HUD).toContain('setPage(initialPageIndex(pages));');
  });

  it('hides the arrows at each end rather than dimming them', () => {
    // `ButtonSquarePage` sets alpha = 0 at page 1 and at pagesTotal. Unchanged
    // by the divergence — the pager still behaves this way inside the pop-up.
    expect(HUD).toContain('disabled={atFirst}');
    expect(HUD).toContain('disabled={atLast}');
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain('.level-outcome__arrow:disabled');
    expect(css).toContain('visibility: hidden;');
  });

  it('pages the reveals, not the whole stack', () => {
    // Was `pages.length > 1`, which counted the results page. The pop-up shows
    // reveals only, so a single reveal must show no pager.
    expect(HUD).toContain('{reveals.length > 1 && (');
  });

  it('shows the reveals over the results rather than instead of them', () => {
    // Source-shape check, flagged as such — it proves the structure is
    // written, not that it renders. The frames are the driven proof.
    //
    /*
     * The AS3 put the exits on the Standard page only (`:939-960`) so reveals
     * could not be skipped. This port shows the results *underneath* and lets
     * the pop-up be dismissed — which is the trade.
     *
     * **What backs the trade changed in T208.** It used to be a red
     * `unlockSummary` line left on the results panel; that was removed, and
     * what keeps nothing from being lost is the *Show what you unlocked*
     * button, which reopens the pop-up. Asserted here in place of the line,
     * because the guarantee is the same and only its mechanism moved.
     */
    expect(HUD).toContain('{revealsOpen && current && (');
    expect(HUD).toContain('level-outcome__reveal');
    expect(HUD).toContain('Show what you unlocked');
    // And the line it replaced is really gone, not merely unreferenced.
    expect(HUD).not.toContain('level-outcome__unlocked');
  });

  it('offers a level-select route the AS3 does not have', () => {
    // `ScreenStatus` exits only forwards (Next Level) or by replaying; it has
    // no menu button and no level chooser. Added deliberately, reusing the
    // existing route.
    expect(HUD).toContain('toLevelSelect');
    expect(HUD).toContain("GameEvents.emit('ui:goto', { key: 'LevelSelect' })");
  });
});

