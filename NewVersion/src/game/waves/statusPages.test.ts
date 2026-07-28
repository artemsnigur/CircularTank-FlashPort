import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildStatusPages, initialPageIndex } from './statusPages';
import { ACHIEVEMENTS } from '../achievements/achievementData';
import { BESTIARY } from '../enemies/bestiaryData';
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
describe('the screen opens on the last page', () => {
  it('starts at pagesTotal, so the newest reveal is showing', () => {
    const pages = buildStatusPages({
      newAchievements: ['Kills1'],
      newEnemies: ['Fast', 'Ghost'],
    });

    expect(initialPageIndex(pages)).toBe(pages.length - 1);
    expect(pages[initialPageIndex(pages)]).toMatchObject({ type: 'Enemy', displayName: 'Ghost' });
  });

  it('starts on the results when nothing is new', () => {
    const pages = buildStatusPages({ newAchievements: [], newEnemies: [] });
    expect(initialPageIndex(pages)).toBe(0);
  });

  it('paging back from the start walks enemies, then achievements, then results', () => {
    const pages = buildStatusPages({
      newAchievements: ['Kills1', 'Money1'],
      newEnemies: ['Fast', 'Ghost'],
    });

    const walked: string[] = [];
    for (let i = initialPageIndex(pages); i >= 0; i -= 1) walked.push(pages[i].type);

    expect(walked).toEqual(['Enemy', 'Enemy', 'Achievement', 'Achievement', 'Standard']);
  });

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
    const result = discoverEnemies([], 9, 1);
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
describe('the overlay honours the AS3 paging model', () => {
  it('opens on the last page rather than the first', () => {
    expect(HUD).toContain('setPage(initialPageIndex(pages));');
  });

  it('hides the arrows at each end rather than dimming them', () => {
    // `ButtonSquarePage` sets alpha = 0 at page 1 and at pagesTotal.
    expect(HUD).toContain('disabled={atFirst}');
    expect(HUD).toContain('disabled={atLast}');
    const css = readFileSync('src/styles/global.css', 'utf8');
    expect(css).toContain('.level-outcome__arrow:disabled');
    expect(css).toContain('visibility: hidden;');
  });

  it('shows no pager at all when there is one page', () => {
    expect(HUD).toContain('{pages.length > 1 && (');
  });

  it('puts the exit buttons on the results page only', () => {
    // `:939-960` adds Play Again and Next Level only for the Standard type, so
    // the reveals cannot be skipped — only walked back through.
    const standard = HUD.slice(
      HUD.indexOf("{current.type === 'Standard' && ("),
      HUD.indexOf("{current.type === 'Achievement' && ("),
    );
    expect(standard).toContain('level-outcome__actions');
    expect(standard).toContain('Next level');
    expect(standard).toContain('onClick={toMenu}');

    const rest = HUD.slice(HUD.indexOf("{current.type === 'Achievement' && ("));
    expect(rest).not.toContain('level-outcome__actions');
  });

  it('nothing auto-advances', () => {
    // The AS3 has no timer on this screen; the only movement is the arrows.
    const overlay = HUD.slice(
      HUD.indexOf('function LevelOutcomeOverlay'),
      // Bounded: the toast component below does use a timer, and an unbounded
      // slice would catch it and read as a failure of this component.
      HUD.indexOf('function AchievementToasts'),
    );
    expect(overlay).not.toContain('setTimeout');
    expect(overlay).not.toContain('setInterval');
  });

  it('consumes the level:ended payload with no extra event', () => {
    expect(HUD).toContain('newAchievements: outcome.newAchievements');
    expect(HUD).toContain('newEnemies: outcome.newEnemies');
    expect(HUD).toContain('value={outcome.medals}');
  });
});
