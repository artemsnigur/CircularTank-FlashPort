/**
 * Every dev affordance is tagged and recorded.
 *
 * There was no removal record before this. Eleven dev aids sat across seven
 * files marked only by prose, and two of them said "remove with the other dev
 * aids" — referring to a list that did not exist. That is how a temporary
 * affordance ships: not by anyone deciding to keep it, but by nobody being able
 * to enumerate what "the others" were.
 *
 * The mechanism is a greppable `DEV-AID:` tag plus this list. Adding an
 * affordance without recording it fails here; removing one without updating the
 * list fails too. Same partition shape as `MISC_WITHOUT_EFFECT` — the list is
 * load-bearing rather than decorative.
 *
 * **Every one of these must also be behind `import.meta.env.DEV`.** The tag is
 * the inventory; the gate is what actually keeps them out of a build.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';

/** One entry per tagged affordance, as `file → what it does`. */
const DEV_AIDS: Readonly<Record<string, readonly string[]>> = {
  'src/game/scenes/GameplayScene.ts': [
    'margin-style cycle (G)',
    'kill the tank (K)',
    'fund the shop (M)',
    'top-up amount',
    'equipped + owned secondary via ?secondary=',
    'equipped + owned primary via ?primary=',
    'force the tutorial on via ?tutorial=1',
    'tutorial panel render dump',
    'force the tutorial on for a completed profile',
    // Both added with the countdown (T67), for `npm run look -- --countdown`.
    // They are a pair: one reproduces the pre-countdown state, the other is
    // how the difference is measured. Remove them together.
    'hold the countdown flag false via ?countdown=0',
    'spawn placement recorder',
    // T69: the sweep aimed at a hard-coded screen point. This is how it finds
    // the tank instead.
    'live tank screen position',
  ],
  'src/game/levels/devLevels.ts': ['QA levels for enemy behaviour'],
  'src/game/scenes/UpgradesScene.ts': ['money top-up'],
  'src/ui/screens/LevelSelectScreen.tsx': ['jump to any level'],
  'src/ui/screens/UpgradesScreen.tsx': ['catalogue top-up'],
  'src/ui/DiagnosticsPanel.tsx': ['pipeline diagnostics panel'],
  'src/game/events/GameEvents.ts': ['dev money event'],
  'src/game/audio/queueHistory.ts': ['sound queue history'],
  'src/game/audio/SoundManager.ts': [
    'queue history record',
    'queue history enable',
    'queue history publish',
    'queue history music',
    'queue history loops',
  ],
};

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, out);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

describe('dev aids are enumerable', () => {
  const tagged = new Map<string, number>();
  for (const file of sourceFiles('src')) {
    const count = (readFileSync(file, 'utf8').match(/DEV-AID:/g) ?? []).length;
    if (count > 0) tagged.set(file.split(sep).join('/'), count);
  }

  it('every tagged file is in the list, and every listed file is tagged', () => {
    expect(new Set(tagged.keys())).toEqual(new Set(Object.keys(DEV_AIDS)));
  });

  it('the tag count matches the recorded entries per file', () => {
    for (const [file, count] of tagged) {
      expect(count, `${file} has ${count} DEV-AID tags`).toBe(DEV_AIDS[file].length);
    }
  });

  it('the whole set is small enough to remove in one pass', () => {
    // Not a style rule. The reason these are recorded is that they must all go
    // before release, and a set nobody can enumerate never does.
    const total = Object.values(DEV_AIDS).reduce((n, xs) => n + xs.length, 0);
    // 11 until T39, which added the sound queue history and its hooks in
    // `SoundManager`: record, enable, and the publish that hands the harness
    // the manifest name list. 23 since T67 — `?countdown=0` and the spawn
    // recorder, the pair `--countdown` needs to measure a placement change
    // that no screenshot and no unit test can see. 24 since T69 — the live
    // tank position, without which the sweep fires at where the tank was.
    expect(total).toBe(24);
  });
});
